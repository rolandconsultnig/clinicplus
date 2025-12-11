"""
SOAP Notes API Routes for Clinic+
"""

from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.soap_notes import SOAPNote
from src.models.auth import AuditLog
from datetime import datetime
import json

soap_bp = Blueprint('soap', __name__)

@soap_bp.route('/soap-notes', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant', 'Nurse'])
def get_soap_notes():
    """Get SOAP notes with filtering"""
    try:
        patient_id = request.args.get('patient_id', type=int)
        encounter_id = request.args.get('encounter_id', type=int)
        provider_id = request.args.get('provider_id', type=int)
        status = request.args.get('status')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = SOAPNote.query.filter_by(is_active=True)
        
        if patient_id:
            query = query.filter_by(patient_id=patient_id)
        if encounter_id:
            query = query.filter_by(encounter_id=encounter_id)
        if provider_id:
            query = query.filter_by(provider_id=provider_id)
        if status:
            query = query.filter_by(status=status)
        
        query = query.order_by(SOAPNote.created_at.desc())
        notes = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'soap_notes': [note.to_dict() for note in notes.items],
            'total': notes.total,
            'page': page,
            'per_page': per_page,
            'pages': notes.pages
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@soap_bp.route('/soap-notes/<int:note_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant', 'Nurse'])
def get_soap_note(note_id):
    """Get specific SOAP note"""
    try:
        note = SOAPNote.query.get_or_404(note_id)
        return jsonify({
            'success': True,
            'soap_note': note.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@soap_bp.route('/soap-notes', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant'])
def create_soap_note():
    """Create new SOAP note"""
    try:
        data = request.get_json()
        user = request.current_user
        
        # Validate required fields
        if not data.get('encounter_id') or not data.get('patient_id'):
            return jsonify({'error': 'encounter_id and patient_id are required'}), 400
        
        note = SOAPNote(
            encounter_id=data['encounter_id'],
            patient_id=data['patient_id'],
            provider_id=data.get('provider_id', user.provider_id),
            facility_id=data.get('facility_id', user.facility_id),
            subjective=data.get('subjective'),
            objective=data.get('objective'),
            assessment=data.get('assessment'),
            plan=data.get('plan'),
            chief_complaint=data.get('chief_complaint'),
            history_of_present_illness=data.get('history_of_present_illness'),
            review_of_systems=data.get('review_of_systems'),
            physical_examination=data.get('physical_examination'),
            assessment_notes=data.get('assessment_notes'),
            plan_details=data.get('plan_details'),
            status=data.get('status', 'draft'),
            created_by=user.id
        )
        
        db.session.add(note)
        
        # Audit log
        audit_log = AuditLog(
            log_id=f"SOAP-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{note.id}",
            user_id=user.id,
            action_type='create',
            resource_type='soap_note',
            resource_id=str(note.id),
            patient_id=note.patient_id,
            details=json.dumps({'encounter_id': note.encounter_id, 'status': note.status})
        )
        db.session.add(audit_log)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'soap_note': note.to_dict(),
            'message': 'SOAP note created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@soap_bp.route('/soap-notes/<int:note_id>', methods=['PUT'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant'])
def update_soap_note(note_id):
    """Update SOAP note"""
    try:
        note = SOAPNote.query.get_or_404(note_id)
        data = request.get_json()
        user = request.current_user
        
        # Update fields
        if 'subjective' in data:
            note.subjective = data['subjective']
        if 'objective' in data:
            note.objective = data['objective']
        if 'assessment' in data:
            note.assessment = data['assessment']
        if 'plan' in data:
            note.plan = data['plan']
        if 'chief_complaint' in data:
            note.chief_complaint = data['chief_complaint']
        if 'history_of_present_illness' in data:
            note.history_of_present_illness = data['history_of_present_illness']
        if 'review_of_systems' in data:
            note.review_of_systems = data['review_of_systems']
        if 'physical_examination' in data:
            note.physical_examination = data['physical_examination']
        if 'assessment_notes' in data:
            note.assessment_notes = data['assessment_notes']
        if 'plan_details' in data:
            note.plan_details = data['plan_details']
        if 'status' in data:
            note.status = data['status']
            if data['status'] == 'signed' and not note.signed_by:
                note.signed_by = user.provider_id
                note.signed_at = datetime.utcnow()
        
        note.updated_at = datetime.utcnow()
        
        # Audit log
        audit_log = AuditLog(
            log_id=f"SOAP-UPDATE-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{note.id}",
            user_id=user.id,
            action_type='update',
            resource_type='soap_note',
            resource_id=str(note.id),
            patient_id=note.patient_id,
            details=json.dumps({'status': note.status})
        )
        db.session.add(audit_log)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'soap_note': note.to_dict(),
            'message': 'SOAP note updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@soap_bp.route('/soap-notes/<int:note_id>', methods=['DELETE'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant'])
def delete_soap_note(note_id):
    """Soft delete SOAP note"""
    try:
        note = SOAPNote.query.get_or_404(note_id)
        user = request.current_user
        
        note.is_active = False
        note.updated_at = datetime.utcnow()
        
        # Audit log
        audit_log = AuditLog(
            log_id=f"SOAP-DELETE-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{note.id}",
            user_id=user.id,
            action_type='delete',
            resource_type='soap_note',
            resource_id=str(note.id),
            patient_id=note.patient_id
        )
        db.session.add(audit_log)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'SOAP note deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@soap_bp.route('/soap-notes/<int:note_id>/sign', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant'])
def sign_soap_note(note_id):
    """Sign SOAP note"""
    try:
        note = SOAPNote.query.get_or_404(note_id)
        user = request.current_user
        
        if note.status == 'signed':
            return jsonify({'error': 'Note is already signed'}), 400
        
        note.status = 'signed'
        note.signed_by = user.provider_id
        note.signed_at = datetime.utcnow()
        note.updated_at = datetime.utcnow()
        
        # Audit log
        audit_log = AuditLog(
            log_id=f"SOAP-SIGN-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{note.id}",
            user_id=user.id,
            action_type='sign',
            resource_type='soap_note',
            resource_id=str(note.id),
            patient_id=note.patient_id
        )
        db.session.add(audit_log)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'soap_note': note.to_dict(),
            'message': 'SOAP note signed successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

