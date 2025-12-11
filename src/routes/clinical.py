"""
Clinical Routes
Basic clinical routes (workflows are in provider_workflows.py)
"""

from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.clinical import ClinicalEncounter, VitalSigns, ClinicalNote, LabOrder, LabResult

clinical_bp = Blueprint('clinical', __name__)

@clinical_bp.route('/encounters', methods=['GET'])
@token_required
def get_encounters():
    """Get clinical encounters with filtering"""
    try:
        patient_id = request.args.get('patient_id', type=int)
        provider_id = request.args.get('provider_id', type=int)
        facility_id = request.args.get('facility_id', type=int)
        encounter_type = request.args.get('encounter_type')
        status = request.args.get('status')
        
        query = ClinicalEncounter.query
        
        if patient_id:
            query = query.filter(ClinicalEncounter.patient_id == patient_id)
        if provider_id:
            query = query.filter(ClinicalEncounter.provider_id == provider_id)
        if facility_id:
            query = query.filter(ClinicalEncounter.facility_id == facility_id)
        if encounter_type:
            query = query.filter(ClinicalEncounter.encounter_type == encounter_type)
        if status:
            query = query.filter(ClinicalEncounter.encounter_status == status)
        
        encounters = query.order_by(ClinicalEncounter.encounter_date.desc()).limit(100).all()
        
        return jsonify({
            'success': True,
            'encounters': [e.to_dict() for e in encounters],
            'total': len(encounters)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@clinical_bp.route('/encounters/<int:encounter_id>', methods=['GET'])
@token_required
def get_encounter(encounter_id):
    """Get encounter details"""
    try:
        encounter = ClinicalEncounter.query.get_or_404(encounter_id)
        return jsonify({
            'success': True,
            'encounter': encounter.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@clinical_bp.route('/lab-orders', methods=['GET'])
@token_required
def get_lab_orders():
    """Get lab orders"""
    try:
        patient_id = request.args.get('patient_id', type=int)
        status = request.args.get('status')
        
        query = LabOrder.query
        
        if patient_id:
            query = query.filter(LabOrder.patient_id == patient_id)
        if status:
            query = query.filter(LabOrder.order_status == status)
        
        orders = query.order_by(LabOrder.order_date.desc()).limit(100).all()
        
        return jsonify({
            'success': True,
            'lab_orders': [o.to_dict() for o in orders],
            'total': len(orders)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@clinical_bp.route('/lab-orders', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'System Administrator'])
def create_lab_order():
    """Create new lab order"""
    try:
        data = request.get_json()
        user = request.current_user
        
        # Validate required fields
        if not data.get('patient_id') or not data.get('test_name'):
            return jsonify({'error': 'patient_id and test_name are required'}), 400
        
        # Get provider from user
        from src.models.provider import Provider
        provider = Provider.query.filter_by(user_account_id=user.id).first()
        if not provider:
            return jsonify({'error': 'Provider profile not found'}), 404
        
        # Parse order date
        from datetime import datetime
        order_date_str = data.get('order_date', datetime.utcnow().date().isoformat())
        if isinstance(order_date_str, str):
            order_date = datetime.strptime(order_date_str, '%Y-%m-%d')
        else:
            order_date = datetime.combine(order_date_str, datetime.min.time())
        
        # Get or create a default encounter if encounter_id not provided
        encounter_id = data.get('encounter_id')
        if not encounter_id:
            # Create a default encounter for the lab order
            from src.models.clinical import ClinicalEncounter
            from src.models.patient import Patient
            patient = Patient.query.get_or_404(data['patient_id'])
            default_encounter = ClinicalEncounter(
                encounter_id=f"ENC-LAB-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                patient_id=patient.id,
                provider_id=provider.id,
                facility_id=data.get('facility_id', user.facility_id),
                encounter_type='lab_order',
                encounter_date=order_date,
                encounter_status='completed'
            )
            db.session.add(default_encounter)
            db.session.flush()
            encounter_id = default_encounter.id
        
        # Create lab order
        lab_order = LabOrder(
            order_id=f"LAB-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{user.id}",
            patient_id=data['patient_id'],
            ordering_provider_id=provider.id,
            facility_id=data.get('facility_id', user.facility_id),
            encounter_id=encounter_id,
            test_name=data['test_name'],
            test_code=data.get('test_code'),
            test_category=data.get('test_type', 'laboratory'),
            priority=data.get('priority', 'routine'),
            order_date=order_date,
            clinical_indication=data.get('clinical_indication'),
            specimen_type=data.get('specimen_type', 'blood'),
            status=data.get('status', 'pending'),
            order_status=data.get('order_status', 'pending')
        )
        
        db.session.add(lab_order)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'lab_order': lab_order.to_dict(),
            'message': 'Lab order created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@clinical_bp.route('/lab-results', methods=['GET'])
@token_required
def get_lab_results():
    """Get lab results"""
    try:
        patient_id = request.args.get('patient_id', type=int)
        test_name = request.args.get('test_name')
        
        query = LabResult.query
        
        if patient_id:
            query = query.filter(LabResult.patient_id == patient_id)
        if test_name:
            query = query.filter(LabResult.test_name.ilike(f'%{test_name}%'))
        
        results = query.order_by(LabResult.result_date.desc()).limit(100).all()
        
        return jsonify({
            'success': True,
            'lab_results': [r.to_dict() for r in results],
            'total': len(results)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

