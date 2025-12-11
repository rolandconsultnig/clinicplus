"""
Treatment Plans API Routes for Clinic+
"""

from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.treatment_plans import TreatmentPlan
from src.models.auth import AuditLog
from datetime import datetime, date
import json
import uuid

treatment_plans_bp = Blueprint('treatment_plans', __name__)

@treatment_plans_bp.route('/treatment-plans', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant', 'Nurse'])
def get_treatment_plans():
    """Get treatment plans with filtering"""
    try:
        patient_id = request.args.get('patient_id', type=int)
        provider_id = request.args.get('provider_id', type=int)
        status = request.args.get('status')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = TreatmentPlan.query.filter_by(is_active=True)
        
        if patient_id:
            query = query.filter_by(patient_id=patient_id)
        if provider_id:
            query = query.filter_by(provider_id=provider_id)
        if status:
            query = query.filter_by(status=status)
        
        query = query.order_by(TreatmentPlan.created_at.desc())
        plans = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'treatment_plans': [plan.to_dict() for plan in plans.items],
            'total': plans.total,
            'page': page,
            'per_page': per_page,
            'pages': plans.pages
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@treatment_plans_bp.route('/treatment-plans/<int:plan_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant', 'Nurse'])
def get_treatment_plan(plan_id):
    """Get specific treatment plan"""
    try:
        plan = TreatmentPlan.query.get_or_404(plan_id)
        return jsonify({
            'success': True,
            'treatment_plan': plan.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@treatment_plans_bp.route('/treatment-plans', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant'])
def create_treatment_plan():
    """Create new treatment plan"""
    try:
        data = request.get_json()
        user = request.current_user
        
        if not data.get('patient_id') or not data.get('plan_name') or not data.get('start_date'):
            return jsonify({'error': 'patient_id, plan_name, and start_date are required'}), 400
        
        plan = TreatmentPlan(
            treatment_plan_id=f"TP-{uuid.uuid4().hex[:12].upper()}",
            patient_id=data['patient_id'],
            provider_id=data.get('provider_id', user.provider_id),
            facility_id=data.get('facility_id', user.facility_id),
            encounter_id=data.get('encounter_id'),
            plan_name=data['plan_name'],
            diagnosis=data.get('diagnosis'),
            treatment_goals=data.get('treatment_goals'),
            treatment_approach=data.get('treatment_approach'),
            medications=json.dumps(data.get('medications', [])) if data.get('medications') else None,
            procedures=json.dumps(data.get('procedures', [])) if data.get('procedures') else None,
            therapies=json.dumps(data.get('therapies', [])) if data.get('therapies') else None,
            lifestyle_modifications=data.get('lifestyle_modifications'),
            patient_education=data.get('patient_education'),
            start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date(),
            expected_duration=data.get('expected_duration'),
            end_date=datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data.get('end_date') else None,
            follow_up_required=data.get('follow_up_required', True),
            follow_up_frequency=data.get('follow_up_frequency'),
            next_follow_up_date=datetime.strptime(data['next_follow_up_date'], '%Y-%m-%d').date() if data.get('next_follow_up_date') else None,
            status=data.get('status', 'active'),
            created_by=user.id
        )
        
        db.session.add(plan)
        
        # Audit log
        audit_log = AuditLog(
            log_id=f"TP-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{plan.id}",
            user_id=user.id,
            action_type='create',
            resource_type='treatment_plan',
            resource_id=str(plan.id),
            patient_id=plan.patient_id,
            details=json.dumps({'plan_name': plan.plan_name})
        )
        db.session.add(audit_log)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'treatment_plan': plan.to_dict(),
            'message': 'Treatment plan created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@treatment_plans_bp.route('/treatment-plans/<int:plan_id>', methods=['PUT'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant'])
def update_treatment_plan(plan_id):
    """Update treatment plan"""
    try:
        plan = TreatmentPlan.query.get_or_404(plan_id)
        data = request.get_json()
        user = request.current_user
        
        # Update fields
        if 'plan_name' in data:
            plan.plan_name = data['plan_name']
        if 'diagnosis' in data:
            plan.diagnosis = data['diagnosis']
        if 'treatment_goals' in data:
            plan.treatment_goals = data['treatment_goals']
        if 'treatment_approach' in data:
            plan.treatment_approach = data['treatment_approach']
        if 'medications' in data:
            plan.medications = json.dumps(data['medications']) if data['medications'] else None
        if 'procedures' in data:
            plan.procedures = json.dumps(data['procedures']) if data['procedures'] else None
        if 'therapies' in data:
            plan.therapies = json.dumps(data['therapies']) if data['therapies'] else None
        if 'lifestyle_modifications' in data:
            plan.lifestyle_modifications = data['lifestyle_modifications']
        if 'patient_education' in data:
            plan.patient_education = data['patient_education']
        if 'status' in data:
            plan.status = data['status']
        if 'progress_notes' in data:
            plan.progress_notes = data['progress_notes']
        if 'outcome_assessment' in data:
            plan.outcome_assessment = data['outcome_assessment']
        if 'next_follow_up_date' in data:
            plan.next_follow_up_date = datetime.strptime(data['next_follow_up_date'], '%Y-%m-%d').date() if data['next_follow_up_date'] else None
        
        plan.updated_at = datetime.utcnow()
        
        # Audit log
        audit_log = AuditLog(
            log_id=f"TP-UPDATE-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{plan.id}",
            user_id=user.id,
            action_type='update',
            resource_type='treatment_plan',
            resource_id=str(plan.id),
            patient_id=plan.patient_id
        )
        db.session.add(audit_log)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'treatment_plan': plan.to_dict(),
            'message': 'Treatment plan updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

