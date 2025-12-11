"""
UB-04 Forms API Routes for Clinic+
"""

from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.ub04 import UB04Form
from src.models.auth import AuditLog
from datetime import datetime, date
import json
import uuid

ub04_bp = Blueprint('ub04', __name__)

@ub04_bp.route('/ub04-forms', methods=['GET'])
@token_required
@role_required(['Billing Manager', 'System Administrator', 'Physician'])
def get_ub04_forms():
    """Get UB-04 forms with filtering"""
    try:
        patient_id = request.args.get('patient_id', type=int)
        facility_id = request.args.get('facility_id', type=int)
        status = request.args.get('status')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = UB04Form.query.filter_by(is_active=True)
        
        if patient_id:
            query = query.filter_by(patient_id=patient_id)
        if facility_id:
            query = query.filter_by(facility_id=facility_id)
        if status:
            query = query.filter_by(status=status)
        
        query = query.order_by(UB04Form.created_at.desc())
        forms = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'forms': [form.to_dict() for form in forms.items],
            'total': forms.total,
            'page': page,
            'per_page': per_page,
            'pages': forms.pages
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ub04_bp.route('/ub04-forms/<int:form_id>', methods=['GET'])
@token_required
@role_required(['Billing Manager', 'System Administrator', 'Physician'])
def get_ub04_form(form_id):
    """Get specific UB-04 form"""
    try:
        form = UB04Form.query.get_or_404(form_id)
        return jsonify({
            'success': True,
            'form': form.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ub04_bp.route('/ub04-forms', methods=['POST'])
@token_required
@role_required(['Billing Manager', 'System Administrator'])
def create_ub04_form():
    """Create new UB-04 form"""
    try:
        data = request.get_json()
        user = request.current_user
        
        if not data.get('patient_id'):
            return jsonify({'error': 'patient_id is required'}), 400
        
        form = UB04Form(
            form_id=f"UB04-{uuid.uuid4().hex[:12].upper()}",
            patient_id=data['patient_id'],
            facility_id=data.get('facility_id', user.facility_id),
            encounter_id=data.get('encounter_id'),
            statement_covers_period_from=datetime.strptime(data['statement_covers_period_from'], '%Y-%m-%d').date() if data.get('statement_covers_period_from') else None,
            statement_covers_period_to=datetime.strptime(data['statement_covers_period_to'], '%Y-%m-%d').date() if data.get('statement_covers_period_to') else None,
            patient_name=data.get('patient_name'),
            patient_address=data.get('patient_address'),
            admission_date=datetime.strptime(data['admission_date'], '%Y-%m-%d').date() if data.get('admission_date') else None,
            discharge_date=datetime.strptime(data['discharge_date'], '%Y-%m-%d').date() if data.get('discharge_date') else None,
            principal_diagnosis_code=data.get('principal_diagnosis_code'),
            procedure_codes=json.dumps(data.get('procedure_codes', [])) if data.get('procedure_codes') else None,
            revenue_codes=json.dumps(data.get('revenue_codes', [])) if data.get('revenue_codes') else None,
            total_charges=data.get('total_charges'),
            status=data.get('status', 'draft'),
            created_by=user.id
        )
        
        db.session.add(form)
        
        # Audit log
        audit_log = AuditLog(
            log_id=f"UB04-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{form.id}",
            user_id=user.id,
            action_type='create',
            resource_type='ub04_form',
            resource_id=str(form.id),
            patient_id=form.patient_id
        )
        db.session.add(audit_log)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'form': form.to_dict(),
            'message': 'UB-04 form created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@ub04_bp.route('/ub04-forms/<int:form_id>', methods=['PUT'])
@token_required
@role_required(['Billing Manager', 'System Administrator'])
def update_ub04_form(form_id):
    """Update UB-04 form"""
    try:
        form = UB04Form.query.get_or_404(form_id)
        data = request.get_json()
        user = request.current_user
        
        # Update fields
        for key, value in data.items():
            if hasattr(form, key) and key not in ['id', 'form_id', 'created_at', 'created_by']:
                if key in ['statement_covers_period_from', 'statement_covers_period_to', 'admission_date', 'discharge_date']:
                    if value:
                        setattr(form, key, datetime.strptime(value, '%Y-%m-%d').date())
                elif key in ['procedure_codes', 'revenue_codes']:
                    setattr(form, key, json.dumps(value) if value else None)
                else:
                    setattr(form, key, value)
        
        if 'status' in data and data['status'] == 'submitted' and not form.submitted_at:
            form.submitted_at = datetime.utcnow()
            form.submitted_by = user.id
        
        form.updated_at = datetime.utcnow()
        
        # Audit log
        audit_log = AuditLog(
            log_id=f"UB04-UPDATE-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{form.id}",
            user_id=user.id,
            action_type='update',
            resource_type='ub04_form',
            resource_id=str(form.id),
            patient_id=form.patient_id
        )
        db.session.add(audit_log)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'form': form.to_dict(),
            'message': 'UB-04 form updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@ub04_bp.route('/ub04-forms/<int:form_id>/submit', methods=['POST'])
@token_required
@role_required(['Billing Manager', 'System Administrator'])
def submit_ub04_form(form_id):
    """Submit UB-04 form"""
    try:
        form = UB04Form.query.get_or_404(form_id)
        user = request.current_user
        
        if form.status == 'submitted':
            return jsonify({'error': 'Form already submitted'}), 400
        
        form.status = 'submitted'
        form.submitted_at = datetime.utcnow()
        form.submitted_by = user.id
        form.updated_at = datetime.utcnow()
        
        # Audit log
        audit_log = AuditLog(
            log_id=f"UB04-SUBMIT-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{form.id}",
            user_id=user.id,
            action_type='submit',
            resource_type='ub04_form',
            resource_id=str(form.id),
            patient_id=form.patient_id
        )
        db.session.add(audit_log)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'form': form.to_dict(),
            'message': 'UB-04 form submitted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

