"""
Review of Systems API Routes for Clinic+
"""

from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.review_of_systems import ReviewOfSystems
from src.models.auth import AuditLog
from datetime import datetime
import json

ros_bp = Blueprint('ros', __name__)

@ros_bp.route('/review-of-systems', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant', 'Nurse'])
def get_review_of_systems():
    """Get Review of Systems records"""
    try:
        patient_id = request.args.get('patient_id', type=int)
        encounter_id = request.args.get('encounter_id', type=int)
        provider_id = request.args.get('provider_id', type=int)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = ReviewOfSystems.query.filter_by(is_active=True)
        
        if patient_id:
            query = query.filter_by(patient_id=patient_id)
        if encounter_id:
            query = query.filter_by(encounter_id=encounter_id)
        if provider_id:
            query = query.filter_by(provider_id=provider_id)
        
        query = query.order_by(ReviewOfSystems.created_at.desc())
        ros_records = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'review_of_systems': [ros.to_dict() for ros in ros_records.items],
            'total': ros_records.total,
            'page': page,
            'per_page': per_page,
            'pages': ros_records.pages
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ros_bp.route('/review-of-systems/<int:ros_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant', 'Nurse'])
def get_review_of_system(ros_id):
    """Get specific Review of Systems record"""
    try:
        ros = ReviewOfSystems.query.get_or_404(ros_id)
        return jsonify({
            'success': True,
            'review_of_system': ros.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@ros_bp.route('/review-of-systems', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant'])
def create_review_of_system():
    """Create new Review of Systems record"""
    try:
        data = request.get_json()
        user = request.current_user
        
        if not data.get('encounter_id') or not data.get('patient_id'):
            return jsonify({'error': 'encounter_id and patient_id are required'}), 400
        
        ros = ReviewOfSystems(
            encounter_id=data['encounter_id'],
            patient_id=data['patient_id'],
            provider_id=data.get('provider_id', user.provider_id),
            facility_id=data.get('facility_id', user.facility_id),
            constitutional=data.get('constitutional'),
            eyes=data.get('eyes'),
            ent=data.get('ent'),
            cardiovascular=data.get('cardiovascular'),
            respiratory=data.get('respiratory'),
            gastrointestinal=data.get('gastrointestinal'),
            genitourinary=data.get('genitourinary'),
            musculoskeletal=data.get('musculoskeletal'),
            neurological=data.get('neurological'),
            psychiatric=data.get('psychiatric'),
            endocrine=data.get('endocrine'),
            hematologic=data.get('hematologic'),
            allergic=data.get('allergic'),
            skin=data.get('skin'),
            additional_notes=data.get('additional_notes'),
            status=data.get('status', 'draft'),
            created_by=user.id
        )
        
        # Set boolean fields
        if 'fever' in data:
            ros.fever = data['fever']
        if 'chills' in data:
            ros.chills = data['chills']
        if 'weight_loss' in data:
            ros.weight_loss = data['weight_loss']
        if 'weight_gain' in data:
            ros.weight_gain = data['weight_gain']
        if 'fatigue' in data:
            ros.fatigue = data['fatigue']
        if 'weakness' in data:
            ros.weakness = data['weakness']
        # Add more boolean fields as needed
        
        db.session.add(ros)
        
        # Audit log
        audit_log = AuditLog(
            log_id=f"ROS-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{ros.id}",
            user_id=user.id,
            action_type='create',
            resource_type='review_of_systems',
            resource_id=str(ros.id),
            patient_id=ros.patient_id,
            details=json.dumps({'encounter_id': ros.encounter_id})
        )
        db.session.add(audit_log)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'review_of_system': ros.to_dict(),
            'message': 'Review of Systems created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@ros_bp.route('/review-of-systems/<int:ros_id>', methods=['PUT'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant'])
def update_review_of_system(ros_id):
    """Update Review of Systems record"""
    try:
        ros = ReviewOfSystems.query.get_or_404(ros_id)
        data = request.get_json()
        user = request.current_user
        
        # Update all fields
        for key, value in data.items():
            if hasattr(ros, key) and key not in ['id', 'created_at', 'created_by']:
                setattr(ros, key, value)
        
        ros.updated_at = datetime.utcnow()
        
        if data.get('status') == 'signed' and not ros.signed_by:
            ros.signed_by = user.provider_id
            ros.signed_at = datetime.utcnow()
        
        # Audit log
        audit_log = AuditLog(
            log_id=f"ROS-UPDATE-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{ros.id}",
            user_id=user.id,
            action_type='update',
            resource_type='review_of_systems',
            resource_id=str(ros.id),
            patient_id=ros.patient_id
        )
        db.session.add(audit_log)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'review_of_system': ros.to_dict(),
            'message': 'Review of Systems updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

