"""
Physical Examination API Routes for Clinic+
"""

from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.physical_exam import PhysicalExam
from src.models.auth import AuditLog
from datetime import datetime
import json

physical_exam_bp = Blueprint('physical_exam', __name__)

@physical_exam_bp.route('/physical-exams', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant', 'Nurse'])
def get_physical_exams():
    """Get physical exams with filtering"""
    try:
        patient_id = request.args.get('patient_id', type=int)
        encounter_id = request.args.get('encounter_id', type=int)
        provider_id = request.args.get('provider_id', type=int)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = PhysicalExam.query.filter_by(is_active=True)
        
        if patient_id:
            query = query.filter_by(patient_id=patient_id)
        if encounter_id:
            query = query.filter_by(encounter_id=encounter_id)
        if provider_id:
            query = query.filter_by(provider_id=provider_id)
        
        query = query.order_by(PhysicalExam.created_at.desc())
        exams = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'physical_exams': [exam.to_dict() for exam in exams.items],
            'total': exams.total,
            'page': page,
            'per_page': per_page,
            'pages': exams.pages
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@physical_exam_bp.route('/physical-exams/<int:exam_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant', 'Nurse'])
def get_physical_exam(exam_id):
    """Get specific physical exam"""
    try:
        exam = PhysicalExam.query.get_or_404(exam_id)
        return jsonify({
            'success': True,
            'physical_exam': exam.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@physical_exam_bp.route('/physical-exams', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant'])
def create_physical_exam():
    """Create new physical exam"""
    try:
        data = request.get_json()
        user = request.current_user
        
        if not data.get('encounter_id') or not data.get('patient_id'):
            return jsonify({'error': 'encounter_id and patient_id are required'}), 400
        
        exam = PhysicalExam(
            encounter_id=data['encounter_id'],
            patient_id=data['patient_id'],
            provider_id=data.get('provider_id', user.provider_id),
            facility_id=data.get('facility_id', user.facility_id),
            general_appearance=data.get('general_appearance'),
            alertness=data.get('alertness'),
            distress=data.get('distress'),
            temperature=data.get('temperature'),
            blood_pressure_systolic=data.get('blood_pressure_systolic'),
            blood_pressure_diastolic=data.get('blood_pressure_diastolic'),
            heart_rate=data.get('heart_rate'),
            respiratory_rate=data.get('respiratory_rate'),
            oxygen_saturation=data.get('oxygen_saturation'),
            weight=data.get('weight'),
            height=data.get('height'),
            bmi=data.get('bmi'),
            heent=data.get('heent'),
            cardiovascular=data.get('cardiovascular'),
            respiratory=data.get('respiratory'),
            gastrointestinal=data.get('gastrointestinal'),
            genitourinary=data.get('genitourinary'),
            musculoskeletal=data.get('musculoskeletal'),
            neurological=data.get('neurological'),
            skin=data.get('skin'),
            lymphatic=data.get('lymphatic'),
            additional_findings=data.get('additional_findings'),
            clinical_impression=data.get('clinical_impression'),
            status=data.get('status', 'draft'),
            created_by=user.id
        )
        
        db.session.add(exam)
        
        # Audit log
        audit_log = AuditLog(
            log_id=f"PE-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{exam.id}",
            user_id=user.id,
            action_type='create',
            resource_type='physical_exam',
            resource_id=str(exam.id),
            patient_id=exam.patient_id,
            details=json.dumps({'encounter_id': exam.encounter_id})
        )
        db.session.add(audit_log)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'physical_exam': exam.to_dict(),
            'message': 'Physical exam created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@physical_exam_bp.route('/physical-exams/<int:exam_id>', methods=['PUT'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant'])
def update_physical_exam(exam_id):
    """Update physical exam"""
    try:
        exam = PhysicalExam.query.get_or_404(exam_id)
        data = request.get_json()
        user = request.current_user
        
        # Update all fields that are provided
        for key, value in data.items():
            if hasattr(exam, key) and key not in ['id', 'created_at', 'created_by']:
                setattr(exam, key, value)
        
        exam.updated_at = datetime.utcnow()
        
        if data.get('status') == 'signed' and not exam.signed_by:
            exam.signed_by = user.provider_id
            exam.signed_at = datetime.utcnow()
        
        # Audit log
        audit_log = AuditLog(
            log_id=f"PE-UPDATE-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{exam.id}",
            user_id=user.id,
            action_type='update',
            resource_type='physical_exam',
            resource_id=str(exam.id),
            patient_id=exam.patient_id
        )
        db.session.add(audit_log)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'physical_exam': exam.to_dict(),
            'message': 'Physical exam updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

