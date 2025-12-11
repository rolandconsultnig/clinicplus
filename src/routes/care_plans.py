"""
Care Plans API Routes for Clinic+
"""

from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.care_plans import CarePlan, CarePlanTemplate
from src.models.auth import AuditLog
from datetime import datetime, date
import json
import uuid

care_plans_bp = Blueprint('care_plans', __name__)

@care_plans_bp.route('/care-plans', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant', 'Nurse'])
def get_care_plans():
    """Get care plans with filtering"""
    try:
        patient_id = request.args.get('patient_id', type=int)
        provider_id = request.args.get('provider_id', type=int)
        status = request.args.get('status')
        plan_type = request.args.get('plan_type')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = CarePlan.query.filter_by(is_active=True)
        
        if patient_id:
            query = query.filter_by(patient_id=patient_id)
        if provider_id:
            query = query.filter_by(provider_id=provider_id)
        if status:
            query = query.filter_by(status=status)
        if plan_type:
            query = query.filter_by(plan_type=plan_type)
        
        query = query.order_by(CarePlan.created_at.desc())
        plans = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'care_plans': [plan.to_dict() for plan in plans.items],
            'total': plans.total,
            'page': page,
            'per_page': per_page,
            'pages': plans.pages
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@care_plans_bp.route('/care-plans/<int:plan_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant', 'Nurse'])
def get_care_plan(plan_id):
    """Get specific care plan"""
    try:
        plan = CarePlan.query.get_or_404(plan_id)
        return jsonify({
            'success': True,
            'care_plan': plan.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@care_plans_bp.route('/care-plans', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant'])
def create_care_plan():
    """Create new care plan"""
    try:
        data = request.get_json()
        user = request.current_user
        
        if not data.get('patient_id') or not data.get('plan_name') or not data.get('start_date'):
            return jsonify({'error': 'patient_id, plan_name, and start_date are required'}), 400
        
        plan = CarePlan(
            care_plan_id=f"CP-{uuid.uuid4().hex[:12].upper()}",
            patient_id=data['patient_id'],
            provider_id=data.get('provider_id', user.provider_id),
            facility_id=data.get('facility_id', user.facility_id),
            encounter_id=data.get('encounter_id'),
            plan_name=data['plan_name'],
            description=data.get('description'),
            plan_type=data.get('plan_type'),
            goals=json.dumps(data.get('goals', [])) if data.get('goals') else None,
            target_date=datetime.strptime(data['target_date'], '%Y-%m-%d').date() if data.get('target_date') else None,
            interventions=json.dumps(data.get('interventions', [])) if data.get('interventions') else None,
            status=data.get('status', 'active'),
            start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date(),
            end_date=datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data.get('end_date') else None,
            next_review_date=datetime.strptime(data['next_review_date'], '%Y-%m-%d').date() if data.get('next_review_date') else None,
            review_frequency=data.get('review_frequency', 'monthly'),
            created_by=user.id
        )
        
        db.session.add(plan)
        
        # Audit log
        audit_log = AuditLog(
            log_id=f"CP-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{plan.id}",
            user_id=user.id,
            action_type='create',
            resource_type='care_plan',
            resource_id=str(plan.id),
            patient_id=plan.patient_id,
            details=json.dumps({'plan_name': plan.plan_name, 'plan_type': plan.plan_type})
        )
        db.session.add(audit_log)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'care_plan': plan.to_dict(),
            'message': 'Care plan created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@care_plans_bp.route('/care-plans/<int:plan_id>', methods=['PUT'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant'])
def update_care_plan(plan_id):
    """Update care plan"""
    try:
        plan = CarePlan.query.get_or_404(plan_id)
        data = request.get_json()
        user = request.current_user
        
        # Update fields
        if 'plan_name' in data:
            plan.plan_name = data['plan_name']
        if 'description' in data:
            plan.description = data['description']
        if 'goals' in data:
            plan.goals = json.dumps(data['goals']) if data['goals'] else None
        if 'interventions' in data:
            plan.interventions = json.dumps(data['interventions']) if data['interventions'] else None
        if 'status' in data:
            plan.status = data['status']
        if 'target_date' in data:
            plan.target_date = datetime.strptime(data['target_date'], '%Y-%m-%d').date() if data['target_date'] else None
        if 'next_review_date' in data:
            plan.next_review_date = datetime.strptime(data['next_review_date'], '%Y-%m-%d').date() if data['next_review_date'] else None
        if 'outcomes' in data:
            plan.outcomes = json.dumps(data['outcomes']) if data['outcomes'] else None
        if 'effectiveness_rating' in data:
            plan.effectiveness_rating = data['effectiveness_rating']
        
        plan.updated_at = datetime.utcnow()
        
        # Audit log
        audit_log = AuditLog(
            log_id=f"CP-UPDATE-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{plan.id}",
            user_id=user.id,
            action_type='update',
            resource_type='care_plan',
            resource_id=str(plan.id),
            patient_id=plan.patient_id
        )
        db.session.add(audit_log)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'care_plan': plan.to_dict(),
            'message': 'Care plan updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@care_plans_bp.route('/care-plan-templates', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'System Administrator'])
def get_care_plan_templates():
    """Get care plan templates"""
    try:
        facility_id = request.args.get('facility_id', type=int)
        plan_type = request.args.get('plan_type')
        
        query = CarePlanTemplate.query.filter_by(is_active=True)
        
        if facility_id:
            query = query.filter((CarePlanTemplate.facility_id == facility_id) | (CarePlanTemplate.is_global == True))
        if plan_type:
            query = query.filter_by(plan_type=plan_type)
        
        templates = query.all()
        
        return jsonify({
            'success': True,
            'templates': [tpl.to_dict() for tpl in templates]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

