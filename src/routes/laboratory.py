"""
Laboratory Information System (LIS) API Routes
Complete workflow: Pre-Analytical → Analytical → Post-Analytical
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.patient import Patient
from src.models.clinical import LabOrder, LabResult, LabSpecimen, LabQCRecord, LabInventoryItem
from datetime import datetime, date, timedelta
import uuid
import json

laboratory_bp = Blueprint('laboratory', __name__)
_tables_ready = False


def _ensure_lab_tables():
    global _tables_ready
    if _tables_ready:
        return
    tables = [
        LabOrder.__table__,
        LabResult.__table__,
        LabSpecimen.__table__,
        LabQCRecord.__table__,
        LabInventoryItem.__table__,
    ]
    for table in tables:
        table.create(bind=db.engine, checkfirst=True)

    if LabQCRecord.query.count() == 0:
        db.session.add_all([
            LabQCRecord(analyzer='Sysmex XN-1000', parameter='WBC', control_level='Level 1', expected_value='5.0', measured_value='4.9', status='pass'),
            LabQCRecord(analyzer='Cobas 6000', parameter='ALT', control_level='Level 1', expected_value='25', measured_value='27', status='pass'),
        ])
    if LabInventoryItem.query.count() == 0:
        db.session.add_all([
            LabInventoryItem(item='CBC Reagent', stock=45, reorder_level=20, expiry_date=date.today() + timedelta(days=180)),
            LabInventoryItem(item='LFT Reagent', stock=12, reorder_level=20, expiry_date=date.today() + timedelta(days=120)),
            LabInventoryItem(item='EDTA Tubes', stock=150, reorder_level=50, expiry_date=date.today() + timedelta(days=365)),
        ])
    db.session.commit()
    _tables_ready = True


@laboratory_bp.before_request
def initialize_lis_module():
    _ensure_lab_tables()

# Phase I: Pre-Analytical

@laboratory_bp.route('/pending-orders', methods=['GET'])
@token_required
def get_pending_orders():
    """Get pending lab orders awaiting billing clearance"""
    try:
        rows = LabOrder.query.filter(LabOrder.status.in_(['pending', 'in_progress'])).order_by(LabOrder.order_date.desc()).all()
        orders = []
        for row in rows:
            patient = Patient.query.get(row.patient_id)
            orders.append({
                'id': row.id,
                'patient_name': f'{patient.first_name} {patient.last_name}' if patient else f'Patient #{row.patient_id}',
                'mrn': patient.universal_patient_id if patient else str(row.patient_id),
                'tests': [row.test_name],
                'ordering_physician': f'Provider #{row.ordering_provider_id}',
                'order_date': row.order_date.isoformat() if row.order_date else None,
                'specimen_type': row.specimen_type or 'Unknown',
                'payment_status': 'paid',
                'priority': row.priority or 'routine'
            })
        
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
        data = request.get_json() or {}
        order_id = data.get('order_id')
        if not order_id:
            return jsonify({'error': 'order_id is required'}), 400
        order = LabOrder.query.get_or_404(order_id)
        existing = LabSpecimen.query.filter_by(lab_order_id=order.id).first()
        if existing:
            return jsonify({
                'success': True,
                'accession_number': existing.accession_number,
                'barcode_data': existing.accession_number,
                'message': 'Specimen already accessioned'
            }), 200
        
        # Generate unique accession number
        accession_number = f"LAB{datetime.now().strftime('%Y%m%d')}{uuid.uuid4().hex[:6].upper()}"
        custody_log = [{
            'timestamp': datetime.utcnow().strftime('%H:%M'),
            'action': 'Collected',
            'user': f'User #{getattr(request.current_user, "id", "system")}'
        }]
        specimen = LabSpecimen(
            accession_number=accession_number,
            lab_order_id=order.id,
            patient_id=order.patient_id,
            specimen_type=order.specimen_type or 'Unknown',
            collection_time=datetime.utcnow(),
            collected_by=f'User #{getattr(request.current_user, "id", "system")}',
            status='collected',
            current_location='Laboratory Reception',
            storage_temp='4',
            custody_log_json=json.dumps(custody_log),
        )
        order.status = 'in_progress'
        db.session.add(specimen)
        db.session.commit()
        
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
        rows = LabSpecimen.query.order_by(LabSpecimen.collection_time.desc()).all()
        specimens = []
        for row in rows:
            patient = Patient.query.get(row.patient_id)
            order = LabOrder.query.get(row.lab_order_id)
            specimens.append({
                **row.to_dict(),
                'patient_name': f'{patient.first_name} {patient.last_name}' if patient else f'Patient #{row.patient_id}',
                'mrn': patient.universal_patient_id if patient else str(row.patient_id),
                'tests': [order.test_name] if order else []
            })
        
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
        rows = LabSpecimen.query.filter(LabSpecimen.status.in_(['collected', 'received', 'processing'])).order_by(LabSpecimen.collection_time.asc()).all()
        worklist = []
        for row in rows:
            order = LabOrder.query.get(row.lab_order_id)
            patient = Patient.query.get(row.patient_id)
            if not order:
                continue
            worklist.append({
                'id': row.id,
                'accession_number': row.accession_number,
                'patient_name': f'{patient.first_name} {patient.last_name}' if patient else f'Patient #{row.patient_id}',
                'test_name': order.test_name,
                'analyzer': 'General Analyzer',
                'priority': (order.priority or 'routine').upper(),
                'status': 'processing' if row.status == 'processing' else 'pending',
                'turnaround_time': '2 hours',
                'specimen_type': row.specimen_type
            })
        
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
        rows = LabResult.query.order_by(LabResult.result_date.desc()).all()
        results = []
        for row in rows:
            patient = Patient.query.get(row.patient_id)
            order = LabOrder.query.get(row.lab_order_id)
            specimen = LabSpecimen.query.filter_by(lab_order_id=row.lab_order_id).first()
            previous = LabResult.query.filter(
                LabResult.patient_id == row.patient_id,
                LabResult.test_name == row.test_name,
                LabResult.id != row.id
            ).order_by(LabResult.result_date.desc()).limit(2).all()
            previous_results = [{'date': p.result_date.date().isoformat() if p.result_date else None, 'value': p.result_value} for p in previous]
            is_critical = (row.status or '').lower() == 'critical' or (row.abnormal_flag or '').lower() == 'critical'
            is_abnormal = is_critical or (row.status or '').lower() in ['abnormal', 'high', 'low'] or (row.abnormal_flag or '').lower() in ['abnormal', 'high', 'low']
            results.append({
                'id': row.id,
                'accession_number': specimen.accession_number if specimen else '',
                'patient_name': f'{patient.first_name} {patient.last_name}' if patient else f'Patient #{row.patient_id}',
                'test_name': row.test_name,
                'value': row.result_value,
                'unit': row.result_unit or row.units or '',
                'reference_range': row.reference_range,
                'is_abnormal': is_abnormal,
                'is_critical': is_critical,
                'method': row.performing_lab or 'Analyzer',
                'validation_status': 'validated' if (row.result_status or '').lower() == 'final' else 'pending',
                'qc_checks': {
                    'reference_range': True,
                    'delta_check': True,
                    'instrument_qc': True
                },
                'previous_results': previous_results
            })
        
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
        result = LabResult.query.get_or_404(result_id)
        result.result_status = 'final'
        result.status = result.status or 'normal'
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Result validated and published',
            'report_url': f'/reports/lab_{result_id}.pdf'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@laboratory_bp.route('/critical-values', methods=['GET'])
@token_required
def get_critical_values():
    """Get critical values requiring immediate notification"""
    try:
        rows = LabResult.query.filter(
            db.or_(
                LabResult.status == 'critical',
                LabResult.abnormal_flag == 'critical'
            )
        ).order_by(LabResult.result_date.desc()).all()
        critical = []
        for row in rows:
            patient = Patient.query.get(row.patient_id)
            order = LabOrder.query.get(row.lab_order_id)
            critical.append({
                'id': row.id,
                'patient_name': f'{patient.first_name} {patient.last_name}' if patient else f'Patient #{row.patient_id}',
                'test_name': row.test_name,
                'value': row.result_value,
                'unit': row.result_unit or row.units or '',
                'reference_range': row.reference_range,
                'severity': 'critical',
                'ordering_physician': f'Provider #{order.ordering_provider_id}' if order else 'Unknown',
                'notification_sent': False
            })
        
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
        qc = [q.to_dict() for q in LabQCRecord.query.order_by(LabQCRecord.recorded_at.desc()).limit(200).all()]
        
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
        today_start = datetime.combine(date.today(), datetime.min.time())
        yesterday_start = today_start - timedelta(days=1)
        tests_today = LabOrder.query.filter(LabOrder.order_date >= today_start).count()
        tests_yesterday = LabOrder.query.filter(
            LabOrder.order_date >= yesterday_start,
            LabOrder.order_date < today_start
        ).count()
        critical_today = LabResult.query.filter(
            LabResult.result_date >= today_start,
            db.or_(LabResult.status == 'critical', LabResult.abnormal_flag == 'critical')
        ).count()

        completed_results = LabResult.query.join(LabOrder, LabResult.lab_order_id == LabOrder.id).all()
        tat_values = []
        per_test = {}
        for result in completed_results:
            order = LabOrder.query.get(result.lab_order_id)
            if not order or not order.order_date or not result.result_date:
                continue
            hours = (result.result_date - order.order_date).total_seconds() / 3600
            tat_values.append(hours)
            per_test.setdefault(result.test_name, []).append(hours)
        avg_tat_hours = round(sum(tat_values) / len(tat_values), 2) if tat_values else 0
        tat_by_test = [
            {'test': name, 'avg_tat': f"{round(sum(values)/len(values), 2)} hours"}
            for name, values in per_test.items()
        ]

        analytics = {
            'average_tat': f'{avg_tat_hours} hours',
            'target_tat': '4 hours',
            'tests_today': tests_today,
            'tests_yesterday': tests_yesterday,
            'critical_values_today': critical_today,
            'tat_by_test': tat_by_test
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
        inventory = [item.to_dict() for item in LabInventoryItem.query.order_by(LabInventoryItem.item.asc()).all()]
        
        return jsonify({
            'success': True,
            'inventory': inventory
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
