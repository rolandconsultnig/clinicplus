"""
Clinical Reminders API Routes for Clinic+
"""

from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.clinical_reminders import ClinicalReminder, ReminderRule
from src.models.auth import AuditLog
from datetime import datetime, date
import json

reminders_bp = Blueprint('reminders', __name__)

@reminders_bp.route('/clinical-reminders', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant', 'Nurse', 'System Administrator', 'Receptionist'])
def get_clinical_reminders():
    """Get clinical reminders with filtering"""
    try:
        patient_id = request.args.get('patient_id', type=int)
        provider_id = request.args.get('provider_id', type=int)
        status = request.args.get('status')
        reminder_type = request.args.get('reminder_type')
        priority = request.args.get('priority')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        query = ClinicalReminder.query.filter_by(is_active=True)
        
        if patient_id:
            query = query.filter_by(patient_id=patient_id)
        if provider_id:
            query = query.filter_by(provider_id=provider_id)
        if status:
            query = query.filter_by(status=status)
        if reminder_type:
            query = query.filter_by(reminder_type=reminder_type)
        if priority:
            query = query.filter_by(priority=priority)
        
        query = query.order_by(ClinicalReminder.due_date.asc(), ClinicalReminder.priority.desc())
        reminders = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'reminders': [reminder.to_dict() for reminder in reminders.items],
            'total': reminders.total,
            'page': page,
            'per_page': per_page,
            'pages': reminders.pages
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reminders_bp.route('/clinical-reminders/<int:reminder_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant', 'Nurse'])
def get_clinical_reminder(reminder_id):
    """Get specific clinical reminder"""
    try:
        reminder = ClinicalReminder.query.get_or_404(reminder_id)
        return jsonify({
            'success': True,
            'reminder': reminder.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reminders_bp.route('/clinical-reminders', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant', 'System Administrator'])
def create_clinical_reminder():
    """Create new clinical reminder"""
    try:
        data = request.get_json()
        user = request.current_user
        
        if not data.get('patient_id') or not data.get('title'):
            return jsonify({'error': 'patient_id and title are required'}), 400
        
        reminder = ClinicalReminder(
            patient_id=data['patient_id'],
            provider_id=data.get('provider_id', user.provider_id),
            facility_id=data.get('facility_id', user.facility_id),
            reminder_type=data.get('reminder_type', 'general'),
            reminder_category=data.get('reminder_category'),
            title=data['title'],
            description=data.get('description'),
            criteria_type=data.get('criteria_type'),
            criteria_details=json.dumps(data.get('criteria_details', {})) if data.get('criteria_details') else None,
            due_date=datetime.strptime(data['due_date'], '%Y-%m-%d').date() if data.get('due_date') else None,
            status=data.get('status', 'active'),
            priority=data.get('priority', 'normal'),
            related_encounter_id=data.get('related_encounter_id'),
            related_lab_order_id=data.get('related_lab_order_id'),
            related_prescription_id=data.get('related_prescription_id'),
            created_by=user.id
        )
        
        db.session.add(reminder)
        
        # Audit log
        audit_log = AuditLog(
            log_id=f"REM-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{reminder.id}",
            user_id=user.id,
            action_type='create',
            resource_type='clinical_reminder',
            resource_id=str(reminder.id),
            patient_id=reminder.patient_id,
            details=json.dumps({'title': reminder.title, 'type': reminder.reminder_type})
        )
        db.session.add(audit_log)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'reminder': reminder.to_dict(),
            'message': 'Clinical reminder created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@reminders_bp.route('/clinical-reminders/<int:reminder_id>', methods=['PUT'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant'])
def update_clinical_reminder(reminder_id):
    """Update clinical reminder"""
    try:
        reminder = ClinicalReminder.query.get_or_404(reminder_id)
        data = request.get_json()
        user = request.current_user
        
        # Update fields
        if 'title' in data:
            reminder.title = data['title']
        if 'description' in data:
            reminder.description = data['description']
        if 'status' in data:
            reminder.status = data['status']
            if data['status'] == 'completed' and not reminder.completed_date:
                reminder.completed_date = date.today()
                reminder.action_taken_by = user.provider_id
                reminder.action_taken_at = datetime.utcnow()
        if 'action_taken' in data:
            reminder.action_taken = data['action_taken']
        if 'priority' in data:
            reminder.priority = data['priority']
        if 'due_date' in data:
            reminder.due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date()
        
        reminder.updated_at = datetime.utcnow()
        
        # Audit log
        audit_log = AuditLog(
            log_id=f"REM-UPDATE-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{reminder.id}",
            user_id=user.id,
            action_type='update',
            resource_type='clinical_reminder',
            resource_id=str(reminder.id),
            patient_id=reminder.patient_id
        )
        db.session.add(audit_log)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'reminder': reminder.to_dict(),
            'message': 'Clinical reminder updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@reminders_bp.route('/reminder-rules', methods=['GET'])
@token_required
@role_required(['System Administrator', 'Physician'])
def get_reminder_rules():
    """Get reminder rules"""
    try:
        rule_type = request.args.get('rule_type')
        is_active = request.args.get('is_active', type=bool)
        
        query = ReminderRule.query
        
        if rule_type:
            query = query.filter_by(rule_type=rule_type)
        if is_active is not None:
            query = query.filter_by(is_active=is_active)
        
        rules = query.all()
        
        return jsonify({
            'success': True,
            'rules': [rule.to_dict() for rule in rules]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@reminders_bp.route('/reminder-rules', methods=['POST'])
@token_required
@role_required(['System Administrator'])
def create_reminder_rule():
    """Create new reminder rule"""
    try:
        data = request.get_json()
        user = request.current_user
        
        if not data.get('rule_name') or not data.get('rule_type'):
            return jsonify({'error': 'rule_name and rule_type are required'}), 400
        
        rule = ReminderRule(
            rule_name=data['rule_name'],
            rule_description=data.get('rule_description'),
            rule_type=data['rule_type'],
            criteria=json.dumps(data.get('criteria', {})) if data.get('criteria') else None,
            reminder_title=data.get('reminder_title'),
            reminder_description=data.get('reminder_description'),
            priority=data.get('priority', 'normal'),
            due_date_calculation=json.dumps(data.get('due_date_calculation', {})) if data.get('due_date_calculation') else None,
            recurrence=data.get('recurrence', 'once'),
            is_active=data.get('is_active', True),
            applies_to_all_patients=data.get('applies_to_all_patients', False),
            created_by=user.id
        )
        
        db.session.add(rule)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'rule': rule.to_dict(),
            'message': 'Reminder rule created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

