"""
Pharmacy Point-of-Sale (POS) API Routes
Handles retail sales, payment processing, loyalty programs, coupons, and age verification
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.patient import Patient
from src.models.prescribing import Prescription
from src.models.pharmacy import (
    PharmacyInventory,
    PrescriptionFulfillment,
    PharmacyPOSTransaction,
    PharmacyOTCItem,
    PharmacyCoupon
)
from datetime import datetime, date
import json
import uuid

pharmacy_pos_bp = Blueprint('pharmacy_pos', __name__)
_tables_ready = False


def _to_number(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def _ensure_pos_tables():
    global _tables_ready
    if _tables_ready:
        return
    tables = [
        PharmacyInventory.__table__,
        PrescriptionFulfillment.__table__,
        PharmacyPOSTransaction.__table__,
        PharmacyOTCItem.__table__,
        PharmacyCoupon.__table__,
    ]
    for table in tables:
        table.create(bind=db.engine, checkfirst=True)

    # Seed OTC defaults only when empty
    if PharmacyOTCItem.query.count() == 0:
        db.session.add_all([
            PharmacyOTCItem(item_code='OTC-TYLENOL-ES', name='Tylenol Extra Strength', category='Pain Relief', unit_price=3500, stock_quantity=150),
            PharmacyOTCItem(item_code='OTC-COUGH-SYRUP', name='Cough Syrup', category='Cold & Flu', unit_price=5200, stock_quantity=80),
            PharmacyOTCItem(item_code='OTC-PSEUDOEPH', name='Pseudoephedrine', category='Decongestant', unit_price=6400, stock_quantity=45, requires_age=True, age_limit=18),
            PharmacyOTCItem(item_code='OTC-BANDAGES', name='Bandages', category='First Aid', unit_price=2000, stock_quantity=200),
            PharmacyOTCItem(item_code='OTC-VITAMINS', name='Vitamins', category='Supplements', unit_price=8000, stock_quantity=120),
        ])

    # Seed coupon defaults only when empty
    if PharmacyCoupon.query.count() == 0:
        db.session.add_all([
            PharmacyCoupon(coupon_code='SAVE10', description='10% off total purchase', discount_percent=10, is_active=True),
            PharmacyCoupon(coupon_code='NEWCUSTOMER', description='15% off for new customers', discount_percent=15, is_active=True),
            PharmacyCoupon(coupon_code='LOYALTY20', description='20% off for loyalty members', discount_percent=20, is_active=True),
        ])
    db.session.commit()
    _tables_ready = True


@pharmacy_pos_bp.before_request
def initialize_pos_module():
    _ensure_pos_tables()


@pharmacy_pos_bp.route('/patient-lookup/<string:clinic_plus_id>', methods=['GET'])
@token_required
@role_required(['pharmacist', 'pharmacy_tech', 'admin'])
def lookup_patient_and_prescriptions(clinic_plus_id):
    """Lookup patient by Clinic+ ID and return active prescriptions."""
    try:
        pharmacy_id = request.args.get('pharmacy_id', type=int)
        patient = Patient.query.filter(
            Patient.universal_patient_id.ilike(clinic_plus_id.strip())
        ).first()

        if not patient:
            return jsonify({'success': False, 'error': 'Patient not found'}), 404

        prescriptions = Prescription.query.filter(
            Prescription.patient_id == patient.id,
            Prescription.status == 'active'
        ).order_by(Prescription.prescribed_date.desc()).all()

        rows = []
        for prescription in prescriptions:
            stock_quantity = None
            unit_price = 0.0
            available = False
            if pharmacy_id:
                inventory = PharmacyInventory.query.filter(
                    PharmacyInventory.pharmacy_id == pharmacy_id,
                    PharmacyInventory.drug_id == prescription.drug_id
                ).first()
                if inventory:
                    stock_quantity = inventory.stock_quantity or 0
                    unit_price = _to_number(inventory.unit_price, 0.0)
                    available = stock_quantity >= (prescription.quantity or 0)
                else:
                    stock_quantity = 0
            rows.append({
                **prescription.to_dict(),
                'stock_quantity': stock_quantity,
                'unit_price': unit_price,
                'line_total': round(unit_price * _to_number(prescription.quantity, 0), 2),
                'available': available if pharmacy_id else None,
            })

        return jsonify({
            'success': True,
            'patient': {
                'id': patient.id,
                'universal_patient_id': patient.universal_patient_id,
                'first_name': patient.first_name,
                'last_name': patient.last_name,
                'full_name': f'{patient.first_name} {patient.last_name}',
                'date_of_birth': patient.date_of_birth.isoformat() if patient.date_of_birth else None,
            },
            'prescriptions': rows
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@pharmacy_pos_bp.route('/otc-items', methods=['GET'])
@token_required
@role_required(['pharmacist', 'pharmacy_tech', 'admin'])
def get_otc_items():
    """Get over-the-counter items for POS"""
    try:
        items = PharmacyOTCItem.query.filter_by(is_active=True).order_by(PharmacyOTCItem.name.asc()).all()
        
        return jsonify({
            'success': True,
            'items': [item.to_dict() for item in items]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@pharmacy_pos_bp.route('/coupons/<coupon_code>', methods=['GET'])
@token_required
def get_coupon(coupon_code):
    """Validate and get coupon details"""
    try:
        coupon = PharmacyCoupon.query.filter_by(coupon_code=coupon_code.upper()).first()
        if coupon and coupon.is_valid_now():
            return jsonify({
                'success': True,
                'discount': float(coupon.discount_percent or 0),
                'description': coupon.description
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Invalid coupon code'
            }), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@pharmacy_pos_bp.route('/process-payment', methods=['POST'])
@token_required
@role_required(['pharmacist', 'pharmacy_tech', 'admin'])
def process_payment():
    """Process payment for POS transaction"""
    try:
        data = request.get_json() or {}
        
        # Validate required fields
        required_fields = ['items', 'payment_method', 'total']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        prescription_ids = data.get('prescription_ids') or []
        pharmacy_id = data.get('pharmacy_id')
        patient_id = data.get('patient_id')
        otc_items = data.get('items') or []

        # Validate and process selected prescriptions for dispensing
        dispensed_prescriptions = []
        if prescription_ids:
            if not pharmacy_id:
                return jsonify({'error': 'pharmacy_id is required when dispensing prescriptions'}), 400
            if not patient_id:
                return jsonify({'error': 'patient_id is required when dispensing prescriptions'}), 400

            selected_prescriptions = Prescription.query.filter(
                Prescription.id.in_(prescription_ids),
                Prescription.patient_id == patient_id
            ).all()
            if len(selected_prescriptions) != len(prescription_ids):
                return jsonify({'error': 'One or more prescriptions are invalid for this patient'}), 400

            for prescription in selected_prescriptions:
                if prescription.status != 'active':
                    return jsonify({
                        'error': f'Prescription {prescription.prescription_id} is not active'
                    }), 400

                inventory = PharmacyInventory.query.filter(
                    PharmacyInventory.pharmacy_id == pharmacy_id,
                    PharmacyInventory.drug_id == prescription.drug_id
                ).first()
                if not inventory or (inventory.stock_quantity or 0) < (prescription.quantity or 0):
                    return jsonify({
                        'error': f'Insufficient stock for {prescription.drug_name}',
                        'prescription_id': prescription.id
                    }), 400

            for prescription in selected_prescriptions:
                inventory = PharmacyInventory.query.filter(
                    PharmacyInventory.pharmacy_id == pharmacy_id,
                    PharmacyInventory.drug_id == prescription.drug_id
                ).first()
                inventory.stock_quantity = (inventory.stock_quantity or 0) - (prescription.quantity or 0)
                inventory.last_updated = datetime.utcnow()

                fulfillment = PrescriptionFulfillment(
                    fulfillment_id=f'FUL-{uuid.uuid4().hex[:12].upper()}',
                    prescription_id=prescription.id,
                    pharmacy_id=pharmacy_id,
                    patient_id=patient_id,
                    fulfillment_date=date.today(),
                    quantity_dispensed=prescription.quantity or 0,
                    verified_by_pharmacist=True,
                    pharmacist_id=getattr(request.current_user, 'provider_id', None),
                    verification_date=datetime.utcnow(),
                    status='dispensed',
                    dispensed_at=datetime.utcnow(),
                    picked_up_by_patient=True,
                    pickup_date=datetime.utcnow(),
                )
                db.session.add(fulfillment)

                prescription.status = 'filled'
                prescription.filled_date = date.today()
                prescription.pharmacy_id = pharmacy_id

                dispensed_prescriptions.append({
                    'prescription_id': prescription.id,
                    'prescription_number': prescription.prescription_id,
                    'drug_name': prescription.drug_name,
                    'quantity': prescription.quantity,
                })

        # Build receipt items from OTC + dispensed prescriptions
        receipt_items = list(otc_items)
        for dispensed in dispensed_prescriptions:
            receipt_items.append({
                'id': f"RX-{dispensed['prescription_id']}",
                'name': dispensed['drug_name'],
                'quantity': dispensed['quantity'],
                'source': 'prescription'
            })
        
        transaction_id = str(uuid.uuid4())
        receipt_number = f'RCP-{datetime.now().strftime("%Y%m%d")}-{str(uuid.uuid4())[:8].upper()}'

        # Generate receipt
        receipt = {
            'receipt_number': receipt_number,
            'date': datetime.now().isoformat(),
            'items': receipt_items,
            'subtotal': data.get('subtotal', 0),
            'tax': data.get('tax', 0),
            'discount': data.get('discount', 0),
            'total': data['total'],
            'payment_method': data['payment_method'],
            'patient_id': patient_id,
            'loyalty_card': data.get('loyalty_card'),
            'coupon_code': data.get('coupon_code'),
            'pharmacy_id': pharmacy_id,
            'dispensed_prescriptions': dispensed_prescriptions,
        }

        transaction = PharmacyPOSTransaction(
            transaction_id=transaction_id,
            receipt_number=receipt_number,
            patient_id=patient_id,
            pharmacy_id=pharmacy_id,
            payment_method=data['payment_method'],
            subtotal=_to_number(data.get('subtotal', 0)),
            tax=_to_number(data.get('tax', 0)),
            discount=_to_number(data.get('discount', 0)),
            total=_to_number(data.get('total', 0)),
            items_json=json.dumps(receipt_items),
            dispensed_prescriptions_json=json.dumps(dispensed_prescriptions),
            loyalty_card=data.get('loyalty_card'),
            coupon_code=data.get('coupon_code'),
            processed_by_user_id=getattr(request.current_user, 'id', None),
        )
        db.session.add(transaction)

        db.session.commit()

        return jsonify({
            'success': True,
            'receipt': receipt,
            'transaction_id': transaction_id
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@pharmacy_pos_bp.route('/transactions', methods=['GET'])
@token_required
@role_required(['pharmacist', 'pharmacy_tech', 'admin'])
def list_transactions():
    """List POS transactions with optional filters for history/search."""
    try:
        limit = request.args.get('limit', type=int, default=50)
        pharmacy_id = request.args.get('pharmacy_id', type=int)
        clinic_plus_id = request.args.get('clinic_plus_id', type=str)

        query = PharmacyPOSTransaction.query
        if pharmacy_id:
            query = query.filter(PharmacyPOSTransaction.pharmacy_id == pharmacy_id)

        if clinic_plus_id:
            patient = Patient.query.filter(
                Patient.universal_patient_id.ilike(clinic_plus_id.strip())
            ).first()
            if not patient:
                return jsonify({'success': True, 'transactions': []}), 200
            query = query.filter(PharmacyPOSTransaction.patient_id == patient.id)

        transactions = query.order_by(PharmacyPOSTransaction.created_at.desc()).limit(max(1, min(limit, 200))).all()
        return jsonify({
            'success': True,
            'transactions': [t.to_dict() for t in transactions]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@pharmacy_pos_bp.route('/reconciliation', methods=['GET'])
@token_required
@role_required(['pharmacist', 'admin'])
def get_reconciliation():
    """Get end-of-day reconciliation data"""
    try:
        date_str = request.args.get('date', datetime.now().date().isoformat())
        target_date = date.fromisoformat(date_str)
        day_start = datetime.combine(target_date, datetime.min.time())
        day_end = datetime.combine(target_date, datetime.max.time())

        transactions = PharmacyPOSTransaction.query.filter(
            PharmacyPOSTransaction.created_at >= day_start,
            PharmacyPOSTransaction.created_at <= day_end
        ).all()

        total_sales = sum(float(t.total or 0) for t in transactions)
        cash_sales = sum(float(t.total or 0) for t in transactions if (t.payment_method or '').lower() == 'cash')
        card_sales = sum(float(t.total or 0) for t in transactions if (t.payment_method or '').lower() == 'card')
        fsa_sales = sum(float(t.total or 0) for t in transactions if (t.payment_method or '').lower() == 'fsa')
        insurance_sales = sum(float(t.total or 0) for t in transactions if (t.payment_method or '').lower() == 'insurance')

        reconciliation = {
            'date': date_str,
            'total_transactions': len(transactions),
            'total_sales': round(total_sales, 2),
            'cash_sales': round(cash_sales, 2),
            'card_sales': round(card_sales, 2),
            'fsa_sales': round(fsa_sales, 2),
            'insurance_sales': round(insurance_sales, 2),
            'refunds': 0.00,
            'outstanding': 0.00
        }
        
        return jsonify({
            'success': True,
            'reconciliation': reconciliation
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

