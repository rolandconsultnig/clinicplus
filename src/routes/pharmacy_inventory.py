"""
Pharmacy & Inventory Management API Routes
Complete workflow: Prescription Receipt → Billing → Dispensing → Inventory Control
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.patient import Patient, Allergy
from src.models.prescribing import Prescription, Drug
from src.models.pharmacy import (
    Pharmacy,
    PharmacyInventory,
    PrescriptionFulfillment,
    PharmacyPurchaseOrder,
    PharmacyInventoryAudit,
    PharmacyInventoryLot,
)
from datetime import datetime, date, timedelta
import json
import uuid

pharmacy_inventory_bp = Blueprint('pharmacy_inventory', __name__)
_tables_ready = False


def _to_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def _ensure_inventory_tables():
    global _tables_ready
    if _tables_ready:
        return
    tables = [
        Pharmacy.__table__,
        PharmacyInventory.__table__,
        PrescriptionFulfillment.__table__,
        PharmacyPurchaseOrder.__table__,
        PharmacyInventoryAudit.__table__,
        PharmacyInventoryLot.__table__,
    ]
    for table in tables:
        table.create(bind=db.engine, checkfirst=True)
    _tables_ready = True


@pharmacy_inventory_bp.before_request
def initialize_inventory_module():
    _ensure_inventory_tables()

# 1. Prescription Receipt and Verification

@pharmacy_inventory_bp.route('/pending-prescriptions', methods=['GET'])
@token_required
@role_required(['pharmacist', 'pharmacy_tech', 'admin'])
def get_pending_prescriptions():
    """Get pending e-prescriptions from CPOE"""
    try:
        active = Prescription.query.filter(
            Prescription.status == 'active'
        ).order_by(Prescription.prescribed_date.desc()).all()
        rows = []
        for p in active:
            patient = Patient.query.get(p.patient_id)
            allergies = Allergy.query.filter_by(patient_id=p.patient_id).all()
            interactions = []
            if p.interaction_warnings:
                try:
                    warnings = json.loads(p.interaction_warnings)
                    interactions = [{'description': w.get('description')} for w in warnings if w.get('description')]
                except Exception:
                    interactions = []
            rows.append({
                'id': p.id,
                'patient_name': f'{patient.first_name} {patient.last_name}' if patient else f'Patient #{p.patient_id}',
                'mrn': patient.universal_patient_id if patient else str(p.patient_id),
                'prescriber': f'Provider #{p.provider_id}' if p.provider_id else 'Unknown',
                'date': p.prescribed_date.isoformat() if p.prescribed_date else None,
                'status': 'pending',
                'allergies': [a.allergen for a in allergies],
                'medications': [{
                    'name': p.drug_name,
                    'strength': '',
                    'dosage': p.dosage,
                    'frequency': p.frequency,
                    'duration': f"{p.days_supply} days" if p.days_supply else '',
                    'quantity': p.quantity,
                }],
                'interactions': interactions,
            })
        
        return jsonify({
            'success': True,
            'prescriptions': rows
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@pharmacy_inventory_bp.route('/check-interactions/<int:prescription_id>', methods=['GET'])
@token_required
def check_drug_interactions(prescription_id):
    """Check for drug-drug and drug-allergy interactions"""
    try:
        prescription = Prescription.query.get_or_404(prescription_id)
        interactions = []
        if prescription.interaction_warnings:
            try:
                warnings = json.loads(prescription.interaction_warnings)
                for w in warnings:
                    interactions.append({
                        'type': w.get('type', 'warning'),
                        'severity': w.get('severity', 'moderate'),
                        'drug1': prescription.drug_name,
                        'drug2': w.get('drug2_name') or '',
                        'description': w.get('description', ''),
                        'recommendation': 'Review before dispensing'
                    })
            except Exception:
                interactions = []
        
        return jsonify({
            'success': True,
            'interactions': interactions
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@pharmacy_inventory_bp.route('/process/<int:prescription_id>', methods=['POST'])
@token_required
@role_required(['pharmacist'])
def process_prescription(prescription_id):
    """Verify prescription and add to dispensing queue"""
    try:
        prescription = Prescription.query.get_or_404(prescription_id)
        data = request.get_json() or {}
        pharmacy_id = data.get('pharmacy_id')
        if not pharmacy_id:
            return jsonify({'error': 'pharmacy_id is required'}), 400
        if prescription.status != 'active':
            return jsonify({'error': 'Prescription is not active'}), 400

        existing = PrescriptionFulfillment.query.filter(
            PrescriptionFulfillment.prescription_id == prescription.id,
            PrescriptionFulfillment.status.in_(['verified', 'pending'])
        ).first()
        if existing:
            return jsonify({
                'success': True,
                'message': 'Prescription already in dispensing queue',
                'queue_number': existing.fulfillment_id
            }), 200

        fulfillment = PrescriptionFulfillment(
            fulfillment_id=f"Q-{uuid.uuid4().hex[:10].upper()}",
            prescription_id=prescription.id,
            pharmacy_id=pharmacy_id,
            patient_id=prescription.patient_id,
            fulfillment_date=date.today(),
            quantity_dispensed=prescription.quantity or 0,
            verified_by_pharmacist=True,
            pharmacist_id=getattr(request.current_user, 'provider_id', None),
            verification_date=datetime.utcnow(),
            status='verified',
        )
        db.session.add(fulfillment)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Prescription processed',
            'queue_number': fulfillment.fulfillment_id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# 2. Dispensing Queue

@pharmacy_inventory_bp.route('/dispensing-queue', methods=['GET'])
@token_required
def get_dispensing_queue():
    """Get verified prescriptions ready for dispensing"""
    try:
        queue_rows = PrescriptionFulfillment.query.filter(
            PrescriptionFulfillment.status == 'verified'
        ).order_by(PrescriptionFulfillment.created_at.asc()).all()

        queue = []
        for row in queue_rows:
            prescription = Prescription.query.get(row.prescription_id)
            patient = Patient.query.get(row.patient_id)
            unit_price = 0.0
            if prescription:
                inv = PharmacyInventory.query.filter_by(
                    pharmacy_id=row.pharmacy_id,
                    drug_id=prescription.drug_id
                ).first()
                unit_price = _to_float(inv.unit_price, 0.0) if inv else 0.0
            total_cost = unit_price * _to_float(row.quantity_dispensed, 0)
            queue.append({
                'id': row.id,
                'queue_number': row.fulfillment_id,
                'patient_name': f'{patient.first_name} {patient.last_name}' if patient else f'Patient #{row.patient_id}',
                'status': 'ready',
                'medications': [{
                    'name': prescription.drug_name if prescription else 'Unknown drug',
                    'dosage': f"{prescription.dosage} - {prescription.frequency}" if prescription else '',
                    'quantity': row.quantity_dispensed,
                    'barcode': f"RX-{row.prescription_id}",
                }],
                'payment_status': 'paid',
                'total_cost': round(total_cost, 2),
            })
        
        return jsonify({
            'success': True,
            'queue': queue
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@pharmacy_inventory_bp.route('/dispense/<int:queue_id>', methods=['POST'])
@token_required
@role_required(['pharmacist', 'pharmacy_tech'])
def dispense_medication(queue_id):
    """Dispense medication and update records"""
    try:
        fulfillment = PrescriptionFulfillment.query.get_or_404(queue_id)
        if fulfillment.status != 'verified':
            return jsonify({'error': 'Queue item is not ready for dispensing'}), 400
        prescription = Prescription.query.get(fulfillment.prescription_id)
        if not prescription:
            return jsonify({'error': 'Prescription not found for queue item'}), 404

        inventory = PharmacyInventory.query.filter_by(
            pharmacy_id=fulfillment.pharmacy_id,
            drug_id=prescription.drug_id
        ).first()
        if not inventory or (inventory.stock_quantity or 0) < (fulfillment.quantity_dispensed or 0):
            return jsonify({'error': 'Insufficient stock to dispense'}), 400

        inventory.stock_quantity = (inventory.stock_quantity or 0) - (fulfillment.quantity_dispensed or 0)
        inventory.last_updated = datetime.utcnow()

        fulfillment.status = 'dispensed'
        fulfillment.dispensed_at = datetime.utcnow()
        fulfillment.picked_up_by_patient = True
        fulfillment.pickup_date = datetime.utcnow()

        prescription.status = 'filled'
        prescription.filled_date = date.today()
        prescription.pharmacy_id = fulfillment.pharmacy_id

        audit = PharmacyInventoryAudit(
            pharmacy_id=fulfillment.pharmacy_id,
            drug_id=prescription.drug_id,
            action='dispensed',
            quantity=-(fulfillment.quantity_dispensed or 0),
            reference=fulfillment.fulfillment_id,
            user_id=getattr(request.current_user, 'id', None),
            details_json=json.dumps({'prescription_id': prescription.id}),
        )
        db.session.add(audit)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Medication dispensed successfully',
            'receipt_number': fulfillment.fulfillment_id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# 3. Inventory Management

@pharmacy_inventory_bp.route('/inventory', methods=['GET'])
@token_required
def get_inventory():
    """Get complete inventory with stock levels"""
    try:
        rows = PharmacyInventory.query.order_by(PharmacyInventory.last_updated.desc()).all()
        inventory = []
        for item in rows:
            drug = Drug.query.get(item.drug_id)
            inventory.append({
                'id': item.id,
                'drug_name': drug.drug_name if drug else f'Drug #{item.drug_id}',
                'generic_name': drug.generic_name if drug else '',
                'strength': drug.strength if drug else '',
                'current_stock': item.stock_quantity or 0,
                'min_stock': item.reorder_level or 0,
                'max_stock': (item.reorder_level or 0) * 3,
                'batch_number': '',
                'expiry_date': None,
                'unit_price': _to_float(item.unit_price, 0.0),
                'location': '',
            })
        
        return jsonify({
            'success': True,
            'inventory': inventory
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@pharmacy_inventory_bp.route('/low-stock', methods=['GET'])
@token_required
def get_low_stock():
    """Get items below minimum stock level"""
    try:
        low_stock = []
        rows = PharmacyInventory.query.all()
        for item in rows:
            current = item.stock_quantity or 0
            minimum = item.reorder_level or 0
            if current <= minimum:
                drug = Drug.query.get(item.drug_id)
                low_stock.append({
                    'id': item.id,
                    'drug_name': f"{drug.drug_name} {drug.strength}".strip() if drug else f'Drug #{item.drug_id}',
                    'current_stock': current,
                    'min_stock': minimum,
                    'reorder_quantity': max((minimum * 3) - current, minimum or 0),
                })
        
        return jsonify({
            'success': True,
            'lowStock': low_stock
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@pharmacy_inventory_bp.route('/expiring', methods=['GET'])
@token_required
def get_expiring_items():
    """Get items expiring within 90 days"""
    try:
        today = date.today()
        expiry_threshold = today + timedelta(days=90)
        expiring = []

        # Use fulfillment lot/expiry data when available
        rows = PrescriptionFulfillment.query.filter(
            PrescriptionFulfillment.expiration_date.isnot(None),
            PrescriptionFulfillment.expiration_date >= today,
            PrescriptionFulfillment.expiration_date <= expiry_threshold
        ).all()
        for row in rows:
            prescription = Prescription.query.get(row.prescription_id)
            if not prescription:
                continue
            inventory = PharmacyInventory.query.filter_by(
                pharmacy_id=row.pharmacy_id,
                drug_id=prescription.drug_id
            ).first()
            expiry_date = row.expiration_date
            expiring.append({
                'id': row.id,
                'drug_name': prescription.drug_name,
                'batch_number': row.lot_number or '',
                'expiry_date': expiry_date.isoformat(),
                'current_stock': inventory.stock_quantity if inventory else 0,
                'days_until_expiry': (expiry_date - today).days,
            })
        
        return jsonify({
            'success': True,
            'expiring': expiring
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 4. Purchase Orders

@pharmacy_inventory_bp.route('/purchase-orders', methods=['GET'])
@token_required
def get_purchase_orders():
    """Get all purchase orders"""
    try:
        orders = [po.to_dict() for po in PharmacyPurchaseOrder.query.order_by(PharmacyPurchaseOrder.created_at.desc()).all()]
        
        return jsonify({
            'success': True,
            'orders': orders
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@pharmacy_inventory_bp.route('/purchase-orders/<int:po_id>/receive', methods=['POST'])
@token_required
@role_required(['pharmacist', 'pharmacy_manager', 'admin'])
def receive_purchase_order(po_id):
    """Receive a purchase order: create lot, increment inventory, write audit."""
    try:
        po = PharmacyPurchaseOrder.query.get_or_404(po_id)
        if po.status in ['received', 'cancelled']:
            return jsonify({'error': 'Purchase order cannot be received in current status'}), 409

        data = request.get_json() or {}
        lot_number = (data.get('lot_number') or '').strip()
        expiry_date_str = data.get('expiry_date')
        received_qty = int(data.get('quantity') or po.quantity or 0)
        unit_cost = float(data.get('unit_cost') or float(po.unit_price or 0))
        if received_qty <= 0:
            return jsonify({'error': 'quantity must be > 0'}), 400
        if not lot_number:
            lot_number = f"LOT-{uuid.uuid4().hex[:8].upper()}"

        expiry_date = date.fromisoformat(expiry_date_str) if expiry_date_str else None

        inventory = PharmacyInventory.query.filter_by(
            pharmacy_id=po.pharmacy_id,
            drug_id=po.drug_id
        ).first()
        if not inventory:
            inventory = PharmacyInventory(
                pharmacy_id=po.pharmacy_id,
                drug_id=po.drug_id,
                stock_quantity=0,
                reorder_level=10,
                unit_price=unit_cost,
            )
            db.session.add(inventory)
            db.session.flush()

        inventory.stock_quantity = (inventory.stock_quantity or 0) + received_qty
        inventory.unit_price = unit_cost
        inventory.last_updated = datetime.utcnow()

        lot = PharmacyInventoryLot(
            pharmacy_id=po.pharmacy_id,
            drug_id=po.drug_id,
            lot_number=lot_number,
            expiry_date=expiry_date,
            quantity_on_hand=received_qty,
            unit_cost=unit_cost,
            source_reference=po.po_number,
        )
        db.session.add(lot)

        po.status = 'received'
        po.updated_at = datetime.utcnow()

        db.session.add(PharmacyInventoryAudit(
            pharmacy_id=po.pharmacy_id,
            drug_id=po.drug_id,
            action='received',
            quantity=received_qty,
            reference=po.po_number,
            user_id=getattr(request.current_user, 'id', None),
            details_json=json.dumps({
                'po_id': po.id,
                'lot_number': lot_number,
                'expiry_date': expiry_date.isoformat() if expiry_date else None,
                'unit_cost': unit_cost,
            }),
        ))

        db.session.commit()
        return jsonify({
            'success': True,
            'po': po.to_dict(),
            'inventory': inventory.to_dict(),
            'lot': lot.to_dict(),
            'message': 'Purchase order received'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@pharmacy_inventory_bp.route('/inventory/lots', methods=['GET'])
@token_required
@role_required(['pharmacist', 'pharmacy_tech', 'pharmacy_manager', 'admin'])
def list_inventory_lots():
    """List lots with batch/expiry tracking."""
    try:
        pharmacy_id = request.args.get('pharmacy_id', type=int)
        drug_id = request.args.get('drug_id', type=int)

        query = PharmacyInventoryLot.query
        if pharmacy_id:
            query = query.filter(PharmacyInventoryLot.pharmacy_id == pharmacy_id)
        if drug_id:
            query = query.filter(PharmacyInventoryLot.drug_id == drug_id)
        lots = query.order_by(PharmacyInventoryLot.expiry_date.asc().nullslast(), PharmacyInventoryLot.received_at.desc()).limit(500).all()
        return jsonify({'success': True, 'lots': [lot.to_dict() for lot in lots]}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@pharmacy_inventory_bp.route('/inventory/adjust', methods=['POST'])
@token_required
@role_required(['pharmacist', 'pharmacy_manager', 'admin'])
def adjust_inventory():
    """Adjust inventory stock with audit trail and optional lot update."""
    try:
        data = request.get_json() or {}
        pharmacy_id = data.get('pharmacy_id')
        drug_id = data.get('drug_id')
        delta = int(data.get('delta') or 0)
        reason = (data.get('reason') or '').strip()
        lot_id = data.get('lot_id')
        if not pharmacy_id or not drug_id:
            return jsonify({'error': 'pharmacy_id and drug_id are required'}), 400
        if delta == 0:
            return jsonify({'error': 'delta must be non-zero'}), 400
        if not reason:
            return jsonify({'error': 'reason is required'}), 400

        inventory = PharmacyInventory.query.filter_by(pharmacy_id=pharmacy_id, drug_id=drug_id).first()
        if not inventory:
            inventory = PharmacyInventory(pharmacy_id=pharmacy_id, drug_id=drug_id, stock_quantity=0, reorder_level=10)
            db.session.add(inventory)
            db.session.flush()

        new_qty = (inventory.stock_quantity or 0) + delta
        if new_qty < 0:
            return jsonify({'error': 'Adjustment would make stock negative'}), 409
        inventory.stock_quantity = new_qty
        inventory.last_updated = datetime.utcnow()

        lot = None
        if lot_id:
            lot = PharmacyInventoryLot.query.filter_by(id=lot_id, pharmacy_id=pharmacy_id, drug_id=drug_id).first()
            if not lot:
                return jsonify({'error': 'Lot not found for this pharmacy/drug'}), 404
            lot_new = (lot.quantity_on_hand or 0) + delta
            if lot_new < 0:
                return jsonify({'error': 'Adjustment would make lot quantity negative'}), 409
            lot.quantity_on_hand = lot_new

        ref = f"ADJ-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"
        db.session.add(PharmacyInventoryAudit(
            pharmacy_id=pharmacy_id,
            drug_id=drug_id,
            action='adjusted',
            quantity=delta,
            reference=ref,
            user_id=getattr(request.current_user, 'id', None),
            details_json=json.dumps({
                'reason': reason,
                'lot_id': lot.id if lot else None,
            }),
        ))
        db.session.commit()
        return jsonify({
            'success': True,
            'inventory': inventory.to_dict(),
            'lot': lot.to_dict() if lot else None,
            'reference': ref,
            'message': 'Inventory adjusted'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@pharmacy_inventory_bp.route('/generate-po', methods=['POST'])
@token_required
@role_required(['pharmacist', 'pharmacy_manager', 'admin'])
def generate_purchase_order():
    """Auto-generate purchase order for low stock items"""
    try:
        data = request.get_json() or {}
        item_id = data.get('item_id')
        if not item_id:
            return jsonify({'error': 'item_id is required'}), 400
        item = PharmacyInventory.query.get_or_404(item_id)

        current = item.stock_quantity or 0
        minimum = item.reorder_level or 0
        reorder_quantity = max((minimum * 3) - current, minimum or 0)
        unit_price = _to_float(item.unit_price, 0.0)

        po_number = f"PO-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        po = PharmacyPurchaseOrder(
            po_number=po_number,
            pharmacy_id=item.pharmacy_id,
            drug_id=item.drug_id,
            vendor_name=data.get('vendor_name', 'Default Vendor'),
            status='pending',
            item_count=1,
            quantity=reorder_quantity,
            unit_price=unit_price,
            total_amount=unit_price * reorder_quantity,
        )
        db.session.add(po)

        audit = PharmacyInventoryAudit(
            pharmacy_id=item.pharmacy_id,
            drug_id=item.drug_id,
            action='po_generated',
            quantity=reorder_quantity,
            reference=po_number,
            user_id=getattr(request.current_user, 'id', None),
            details_json=json.dumps({'item_id': item.id}),
        )
        db.session.add(audit)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Purchase order generated',
            'po_number': po_number
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# 5. Reports and Analytics

@pharmacy_inventory_bp.route('/reports/usage', methods=['GET'])
@token_required
def get_usage_report():
    """Get drug usage and consumption report"""
    try:
        period_start = datetime.utcnow() - timedelta(days=30)
        fills = PrescriptionFulfillment.query.filter(
            PrescriptionFulfillment.created_at >= period_start
        ).all()

        aggregates = {}
        total_revenue = 0.0
        for fill in fills:
            prescription = Prescription.query.get(fill.prescription_id)
            if not prescription:
                continue
            inv = PharmacyInventory.query.filter_by(
                pharmacy_id=fill.pharmacy_id,
                drug_id=prescription.drug_id
            ).first()
            unit_price = _to_float(inv.unit_price, 0.0) if inv else 0.0
            revenue = unit_price * _to_float(fill.quantity_dispensed, 0)
            total_revenue += revenue
            drug_key = prescription.drug_name
            if drug_key not in aggregates:
                aggregates[drug_key] = {'drug': drug_key, 'quantity': 0, 'revenue': 0.0}
            aggregates[drug_key]['quantity'] += int(fill.quantity_dispensed or 0)
            aggregates[drug_key]['revenue'] += revenue

        top_dispensed = sorted(aggregates.values(), key=lambda x: x['quantity'], reverse=True)[:10]
        report = {
            'period': 'Last 30 days',
            'top_dispensed': top_dispensed,
            'total_prescriptions': len(fills),
            'total_revenue': round(total_revenue, 2)
        }
        
        return jsonify({
            'success': True,
            'report': report
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@pharmacy_inventory_bp.route('/reports/financial', methods=['GET'])
@token_required
def get_financial_report():
    """Get financial reconciliation report"""
    try:
        month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        fills = PrescriptionFulfillment.query.filter(
            PrescriptionFulfillment.created_at >= month_start
        ).all()
        total_sales = 0.0
        for fill in fills:
            prescription = Prescription.query.get(fill.prescription_id)
            if not prescription:
                continue
            inv = PharmacyInventory.query.filter_by(
                pharmacy_id=fill.pharmacy_id,
                drug_id=prescription.drug_id
            ).first()
            unit_price = _to_float(inv.unit_price, 0.0) if inv else 0.0
            total_sales += unit_price * _to_float(fill.quantity_dispensed, 0)
        cost_of_goods_sold = total_sales * 0.62
        gross_profit = total_sales - cost_of_goods_sold
        inventory_value = sum(_to_float(i.unit_price, 0) * _to_float(i.stock_quantity, 0) for i in PharmacyInventory.query.all())
        report = {
            'period': 'Current Month',
            'total_sales': round(total_sales, 2),
            'cost_of_goods_sold': round(cost_of_goods_sold, 2),
            'gross_profit': round(gross_profit, 2),
            'profit_margin': round((gross_profit / total_sales * 100), 1) if total_sales else 0.0,
            'inventory_value': round(inventory_value, 2)
        }
        
        return jsonify({
            'success': True,
            'report': report
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@pharmacy_inventory_bp.route('/audit-trail', methods=['GET'])
@token_required
@role_required(['admin', 'pharmacy_manager'])
def get_audit_trail():
    """Get complete audit trail of inventory adjustments"""
    try:
        rows = PharmacyInventoryAudit.query.order_by(PharmacyInventoryAudit.created_at.desc()).limit(500).all()
        trail = []
        for row in rows:
            drug = Drug.query.get(row.drug_id) if row.drug_id else None
            payload = row.to_dict()
            payload['drug_name'] = f"{drug.drug_name} {drug.strength}".strip() if drug else 'N/A'
            trail.append(payload)
        
        return jsonify({
            'success': True,
            'audit_trail': trail
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 6. Controlled Substances Tracking

@pharmacy_inventory_bp.route('/controlled-substances', methods=['GET'])
@token_required
@role_required(['pharmacist', 'admin'])
def get_controlled_substances():
    """Get controlled substances inventory and logs"""
    try:
        controlled = []
        inventory_rows = PharmacyInventory.query.all()
        for item in inventory_rows:
            drug = Drug.query.get(item.drug_id)
            if not drug or not getattr(drug, 'is_controlled', False):
                continue
            last_audit = PharmacyInventoryAudit.query.filter_by(drug_id=item.drug_id).order_by(PharmacyInventoryAudit.created_at.desc()).first()
            controlled.append({
                'id': item.id,
                'drug_name': f"{drug.drug_name} {drug.strength}".strip(),
                'dea_schedule': drug.schedule,
                'current_stock': item.stock_quantity or 0,
                'location': '',
                'last_audit': last_audit.created_at.isoformat() if last_audit else None
            })
        
        return jsonify({
            'success': True,
            'controlled_substances': controlled
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
