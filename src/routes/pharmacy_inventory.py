"""
Pharmacy & Inventory Management API Routes
Complete workflow: Prescription Receipt → Billing → Dispensing → Inventory Control
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from datetime import datetime, date, timedelta
import uuid

pharmacy_inventory_bp = Blueprint('pharmacy_inventory', __name__)

# 1. Prescription Receipt and Verification

@pharmacy_inventory_bp.route('/pending-prescriptions', methods=['GET'])
@token_required
@role_required(['pharmacist', 'pharmacy_tech', 'admin'])
def get_pending_prescriptions():
    """Get pending e-prescriptions from CPOE"""
    try:
        prescriptions = [
            {
                'id': 1,
                'patient_name': 'John Doe',
                'mrn': 'MRN001234',
                'prescriber': 'Dr. Smith',
                'date': datetime.now().isoformat(),
                'status': 'pending',
                'allergies': ['Penicillin', 'Sulfa'],
                'medications': [
                    {
                        'name': 'Amoxicillin',
                        'strength': '500mg',
                        'dosage': '1 tablet',
                        'frequency': 'Three times daily',
                        'duration': '7 days',
                        'quantity': 21
                    },
                    {
                        'name': 'Ibuprofen',
                        'strength': '400mg',
                        'dosage': '1 tablet',
                        'frequency': 'As needed',
                        'duration': '5 days',
                        'quantity': 15
                    }
                ],
                'interactions': [
                    {
                        'description': 'Amoxicillin may interact with current medication Warfarin'
                    }
                ]
            }
        ]
        
        return jsonify({
            'success': True,
            'prescriptions': prescriptions
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@pharmacy_inventory_bp.route('/check-interactions/<int:prescription_id>', methods=['GET'])
@token_required
def check_drug_interactions(prescription_id):
    """Check for drug-drug and drug-allergy interactions"""
    try:
        # In production, query patient's active medications and allergies
        # Run interaction checking algorithm
        
        interactions = [
            {
                'type': 'drug-drug',
                'severity': 'moderate',
                'drug1': 'Amoxicillin',
                'drug2': 'Warfarin',
                'description': 'May increase bleeding risk',
                'recommendation': 'Monitor INR closely'
            }
        ]
        
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
        # In production:
        # 1. Verify patient identity
        # 2. Check interactions
        # 3. Calculate cost
        # 4. Process payment
        # 5. Deduct from inventory
        # 6. Add to dispensing queue
        
        return jsonify({
            'success': True,
            'message': 'Prescription processed',
            'queue_number': 'Q-001'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 2. Dispensing Queue

@pharmacy_inventory_bp.route('/dispensing-queue', methods=['GET'])
@token_required
def get_dispensing_queue():
    """Get verified prescriptions ready for dispensing"""
    try:
        queue = [
            {
                'id': 1,
                'queue_number': 'Q-001',
                'patient_name': 'Jane Smith',
                'status': 'ready',
                'medications': [
                    {
                        'name': 'Metformin 500mg',
                        'dosage': '1 tablet twice daily',
                        'quantity': 60,
                        'barcode': '123456789'
                    }
                ],
                'payment_status': 'paid',
                'total_cost': 25.50
            }
        ]
        
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
        data = request.get_json()
        dispensed_by = data.get('dispensed_by')
        
        # In production:
        # 1. Scan barcode verification
        # 2. Print labels
        # 3. Update EHR
        # 4. Mark as dispensed
        # 5. Generate receipt
        
        return jsonify({
            'success': True,
            'message': 'Medication dispensed successfully',
            'receipt_number': 'RX-001'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 3. Inventory Management

@pharmacy_inventory_bp.route('/inventory', methods=['GET'])
@token_required
def get_inventory():
    """Get complete inventory with stock levels"""
    try:
        inventory = [
            {
                'id': 1,
                'drug_name': 'Metformin',
                'generic_name': 'Metformin HCl',
                'strength': '500mg',
                'current_stock': 250,
                'min_stock': 100,
                'max_stock': 500,
                'batch_number': 'BATCH-2024-001',
                'expiry_date': '2025-12-31',
                'unit_price': 0.50,
                'location': 'Shelf A-12'
            },
            {
                'id': 2,
                'drug_name': 'Lisinopril',
                'generic_name': 'Lisinopril',
                'strength': '10mg',
                'current_stock': 45,
                'min_stock': 50,
                'max_stock': 200,
                'batch_number': 'BATCH-2024-002',
                'expiry_date': '2025-06-30',
                'unit_price': 0.75,
                'location': 'Shelf B-05'
            }
        ]
        
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
        low_stock = [
            {
                'id': 2,
                'drug_name': 'Lisinopril 10mg',
                'current_stock': 45,
                'min_stock': 50,
                'reorder_quantity': 150
            },
            {
                'id': 5,
                'drug_name': 'Atorvastatin 20mg',
                'current_stock': 20,
                'min_stock': 75,
                'reorder_quantity': 200
            }
        ]
        
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
        
        expiring = [
            {
                'id': 3,
                'drug_name': 'Aspirin 81mg',
                'batch_number': 'BATCH-2024-003',
                'expiry_date': (today + timedelta(days=45)).isoformat(),
                'current_stock': 120,
                'days_until_expiry': 45
            }
        ]
        
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
        orders = [
            {
                'id': 1,
                'po_number': 'PO-2024-001',
                'vendor_name': 'PharmaCorp Inc.',
                'status': 'pending',
                'date': datetime.now().isoformat(),
                'item_count': 5,
                'total_amount': 2500.00
            }
        ]
        
        return jsonify({
            'success': True,
            'orders': orders
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@pharmacy_inventory_bp.route('/generate-po', methods=['POST'])
@token_required
@role_required(['pharmacist', 'pharmacy_manager', 'admin'])
def generate_purchase_order():
    """Auto-generate purchase order for low stock items"""
    try:
        data = request.get_json()
        item_id = data.get('item_id')
        
        # In production:
        # 1. Get item details
        # 2. Calculate reorder quantity
        # 3. Select vendor
        # 4. Generate PO number
        # 5. Create PO record
        
        po_number = f"PO-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        
        return jsonify({
            'success': True,
            'message': 'Purchase order generated',
            'po_number': po_number
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 5. Reports and Analytics

@pharmacy_inventory_bp.route('/reports/usage', methods=['GET'])
@token_required
def get_usage_report():
    """Get drug usage and consumption report"""
    try:
        report = {
            'period': 'Last 30 days',
            'top_dispensed': [
                {'drug': 'Metformin 500mg', 'quantity': 1250, 'revenue': 625.00},
                {'drug': 'Lisinopril 10mg', 'quantity': 980, 'revenue': 735.00},
                {'drug': 'Atorvastatin 20mg', 'quantity': 850, 'revenue': 1275.00}
            ],
            'total_prescriptions': 342,
            'total_revenue': 45230.00
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
        report = {
            'period': 'Current Month',
            'total_sales': 45230.00,
            'cost_of_goods_sold': 28150.00,
            'gross_profit': 17080.00,
            'profit_margin': 37.7,
            'inventory_value': 125000.00
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
        trail = [
            {
                'id': 1,
                'timestamp': datetime.now().isoformat(),
                'action': 'dispensed',
                'drug_name': 'Metformin 500mg',
                'quantity': -30,
                'user': 'Pharmacist Jane',
                'reference': 'RX-001'
            },
            {
                'id': 2,
                'timestamp': datetime.now().isoformat(),
                'action': 'received',
                'drug_name': 'Lisinopril 10mg',
                'quantity': 200,
                'user': 'Pharmacy Manager',
                'reference': 'PO-2024-001'
            }
        ]
        
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
        controlled = [
            {
                'id': 1,
                'drug_name': 'Oxycodone 5mg',
                'dea_schedule': 'Schedule II',
                'current_stock': 50,
                'location': 'Secure Vault A',
                'last_audit': datetime.now().isoformat()
            }
        ]
        
        return jsonify({
            'success': True,
            'controlled_substances': controlled
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
