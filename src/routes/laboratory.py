"""
Laboratory Information System (LIS) API Routes
Complete workflow: Pre-Analytical → Analytical → Post-Analytical
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from datetime import datetime, date, timedelta
import uuid

laboratory_bp = Blueprint('laboratory', __name__)

# Phase I: Pre-Analytical

@laboratory_bp.route('/pending-orders', methods=['GET'])
@token_required
def get_pending_orders():
    """Get pending lab orders awaiting billing clearance"""
    try:
        # Mock data - in production, query from database
        orders = [
            {
                'id': 1,
                'patient_name': 'John Doe',
                'mrn': 'MRN001234',
                'tests': ['CBC', 'LFT', 'RFT'],
                'ordering_physician': 'Dr. Smith',
                'order_date': datetime.now().isoformat(),
                'specimen_type': '5ml EDTA Blood',
                'payment_status': 'paid',
                'priority': 'routine'
            },
            {
                'id': 2,
                'patient_name': 'Jane Smith',
                'mrn': 'MRN005678',
                'tests': ['Lipid Profile', 'HbA1c'],
                'ordering_physician': 'Dr. Johnson',
                'order_date': datetime.now().isoformat(),
                'specimen_type': '3ml Serum',
                'payment_status': 'pending',
                'priority': 'routine'
            }
        ]
        
        return jsonify({
            'success': True,
            'orders': orders
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@laboratory_bp.route('/accession', methods=['POST'])
@token_required
def accession_specimen():
    """Accession a specimen and generate barcode"""
    try:
        data = request.get_json()
        order_id = data.get('order_id')
        
        # Generate unique accession number
        accession_number = f"LAB{datetime.now().strftime('%Y%m%d')}{uuid.uuid4().hex[:6].upper()}"
        
        # In production, create specimen record in database
        
        return jsonify({
            'success': True,
            'accession_number': accession_number,
            'barcode_data': accession_number,
            'message': 'Specimen accessioned successfully'
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@laboratory_bp.route('/specimens', methods=['GET'])
@token_required
def get_specimens():
    """Get all specimens with chain of custody"""
    try:
        specimens = [
            {
                'id': 1,
                'accession_number': 'LAB20251202ABC123',
                'patient_name': 'John Doe',
                'mrn': 'MRN001234',
                'specimen_type': 'EDTA Blood',
                'collection_time': datetime.now().isoformat(),
                'collected_by': 'Phlebotomist Jane',
                'tests': ['CBC', 'LFT'],
                'status': 'collected',
                'current_location': 'Hematology Lab',
                'storage_temp': '4',
                'custody_log': [
                    {
                        'timestamp': datetime.now().strftime('%H:%M'),
                        'action': 'Collected',
                        'user': 'Phlebotomist Jane'
                    },
                    {
                        'timestamp': (datetime.now() + timedelta(minutes=15)).strftime('%H:%M'),
                        'action': 'Received at Lab',
                        'user': 'Lab Tech Mike'
                    }
                ]
            }
        ]
        
        return jsonify({
            'success': True,
            'specimens': specimens
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Phase II: Analytical

@laboratory_bp.route('/worklist', methods=['GET'])
@token_required
def get_worklist():
    """Get daily worklist for testing"""
    try:
        worklist = [
            {
                'id': 1,
                'accession_number': 'LAB20251202ABC123',
                'patient_name': 'John Doe',
                'test_name': 'Complete Blood Count (CBC)',
                'analyzer': 'Sysmex XN-1000',
                'priority': 'ROUTINE',
                'status': 'pending',
                'turnaround_time': '2 hours',
                'specimen_type': 'EDTA Blood'
            },
            {
                'id': 2,
                'accession_number': 'LAB20251202DEF456',
                'patient_name': 'Jane Smith',
                'test_name': 'Liver Function Test (LFT)',
                'analyzer': 'Cobas 6000',
                'priority': 'STAT',
                'status': 'processing',
                'turnaround_time': '1 hour',
                'specimen_type': 'Serum'
            }
        ]
        
        return jsonify({
            'success': True,
            'worklist': worklist
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Phase III: Post-Analytical

@laboratory_bp.route('/results', methods=['GET'])
@token_required
def get_results():
    """Get results pending validation"""
    try:
        results = [
            {
                'id': 1,
                'accession_number': 'LAB20251202ABC123',
                'patient_name': 'John Doe',
                'test_name': 'Hemoglobin',
                'value': '8.5',
                'unit': 'g/dL',
                'reference_range': '13.5-17.5',
                'is_abnormal': True,
                'is_critical': True,
                'method': 'Automated Analyzer',
                'validation_status': 'pending',
                'qc_checks': {
                    'reference_range': True,
                    'delta_check': True,
                    'instrument_qc': True
                },
                'previous_results': [
                    {'date': '2025-11-01', 'value': '12.5'},
                    {'date': '2025-10-01', 'value': '13.2'}
                ]
            },
            {
                'id': 2,
                'accession_number': 'LAB20251202ABC123',
                'patient_name': 'John Doe',
                'test_name': 'ALT (SGPT)',
                'value': '45',
                'unit': 'U/L',
                'reference_range': '7-56',
                'is_abnormal': False,
                'is_critical': False,
                'method': 'Automated Analyzer',
                'validation_status': 'pending',
                'qc_checks': {
                    'reference_range': True,
                    'delta_check': True,
                    'instrument_qc': True
                }
            }
        ]
        
        return jsonify({
            'success': True,
            'results': results
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@laboratory_bp.route('/results/<int:result_id>/validate', methods=['POST'])
@token_required
@role_required(['lab_technologist', 'pathologist', 'admin'])
def validate_result(result_id):
    """Validate and publish lab result"""
    try:
        # In production, update result status in database
        # Generate report
        # Publish to EHR
        # Send critical value alerts if needed
        
        return jsonify({
            'success': True,
            'message': 'Result validated and published',
            'report_url': f'/reports/lab_{result_id}.pdf'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@laboratory_bp.route('/critical-values', methods=['GET'])
@token_required
def get_critical_values():
    """Get critical values requiring immediate notification"""
    try:
        critical = [
            {
                'id': 1,
                'patient_name': 'John Doe',
                'test_name': 'Potassium',
                'value': '2.8',
                'unit': 'mmol/L',
                'reference_range': '3.5-5.0',
                'severity': 'critical_low',
                'ordering_physician': 'Dr. Smith',
                'notification_sent': False
            }
        ]
        
        return jsonify({
            'success': True,
            'critical': critical
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Quality Control

@laboratory_bp.route('/qc-data', methods=['GET'])
@token_required
def get_qc_data():
    """Get quality control data"""
    try:
        qc = [
            {
                'analyzer': 'Sysmex XN-1000',
                'parameter': 'WBC',
                'control_level': 'Level 1',
                'expected_value': '5.0',
                'measured_value': '4.9',
                'status': 'pass',
                'timestamp': datetime.now().isoformat()
            }
        ]
        
        return jsonify({
            'success': True,
            'qc': qc
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Analytics

@laboratory_bp.route('/analytics/tat', methods=['GET'])
@token_required
def get_tat_analytics():
    """Get turnaround time analytics"""
    try:
        analytics = {
            'average_tat': '2.5 hours',
            'target_tat': '4 hours',
            'tests_today': 247,
            'tests_yesterday': 220,
            'critical_values_today': 5,
            'tat_by_test': [
                {'test': 'CBC', 'avg_tat': '1.5 hours'},
                {'test': 'LFT', 'avg_tat': '2.0 hours'},
                {'test': 'RFT', 'avg_tat': '2.5 hours'}
            ]
        }
        
        return jsonify({
            'success': True,
            'analytics': analytics
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@laboratory_bp.route('/inventory', methods=['GET'])
@token_required
def get_inventory():
    """Get reagent and consumable inventory"""
    try:
        inventory = [
            {
                'item': 'CBC Reagent',
                'stock': 45,
                'reorder_level': 20,
                'expiry_date': '2025-06-30',
                'status': 'ok'
            },
            {
                'item': 'LFT Reagent',
                'stock': 12,
                'reorder_level': 20,
                'expiry_date': '2025-05-15',
                'status': 'low'
            }
        ]
        
        return jsonify({
            'success': True,
            'inventory': inventory
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
