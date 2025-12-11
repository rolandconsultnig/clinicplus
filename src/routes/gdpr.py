"""
GDPR Compliance Routes
EU General Data Protection Regulation compliance endpoints
"""
from flask import Blueprint, request, jsonify, send_file
from src.auth.jwt_manager import token_required, role_required
from src.middleware.hipaa_audit import hipaa_audit_required
from src.models.user import db
from src.models.gdpr import (
    GDPRConsent, GDPRDataRequest, GDPRDataProcessingActivity,
    GDPRBreach, GDPRDataRetentionPolicy
)
from src.services.gdpr_compliance import gdpr_service
from datetime import datetime
import uuid
import os

gdpr_bp = Blueprint('gdpr', __name__)

@gdpr_bp.route('/consent', methods=['POST'])
@token_required
@role_required(['Patient', 'Physician', 'System Administrator'])
@hipaa_audit_required(action_type='create', resource_type='gdpr_consent')
def create_consent():
    """Create GDPR consent record"""
    try:
        data = request.get_json()
        patient_id = data.get('patient_id')
        consent_type = data.get('consent_type')
        consent_purpose = data.get('consent_purpose')
        legal_basis = data.get('legal_basis', 'consent')
        
        if not patient_id or not consent_type:
            return jsonify({'error': 'Patient ID and consent type are required'}), 400
        
        # Verify patient access
        user_type = request.token_payload.get('user_type', '').lower()
        if user_type == 'patient':
            if request.current_user.patient_id != patient_id:
                return jsonify({'error': 'You can only create consent for yourself'}), 403
        
        success, consent_id, result = gdpr_service.create_consent(
            patient_id=patient_id,
            consent_type=consent_type,
            consent_purpose=consent_purpose,
            legal_basis=legal_basis
        )
        
        if success:
            return jsonify({
                'success': True,
                'consent': result
            }), 201
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Failed to create consent')
            }), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@gdpr_bp.route('/consent/<consent_id>/withdraw', methods=['POST'])
@token_required
@role_required(['Patient', 'System Administrator'])
@hipaa_audit_required(action_type='update', resource_type='gdpr_consent')
def withdraw_consent(consent_id):
    """Withdraw GDPR consent"""
    try:
        data = request.get_json()
        patient_id = data.get('patient_id')
        
        if not patient_id:
            return jsonify({'error': 'Patient ID is required'}), 400
        
        # Verify patient access
        user_type = request.token_payload.get('user_type', '').lower()
        if user_type == 'patient':
            if request.current_user.patient_id != patient_id:
                return jsonify({'error': 'You can only withdraw your own consent'}), 403
        
        success, result = gdpr_service.withdraw_consent(consent_id, patient_id)
        
        if success:
            return jsonify({
                'success': True,
                'consent': result
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Failed to withdraw consent')
            }), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@gdpr_bp.route('/consent/patient/<int:patient_id>', methods=['GET'])
@token_required
@role_required(['Patient', 'Physician', 'System Administrator'])
@hipaa_audit_required(action_type='view', resource_type='gdpr_consent')
def get_patient_consents(patient_id):
    """Get all consents for a patient"""
    try:
        # Verify patient access
        user_type = request.token_payload.get('user_type', '').lower()
        if user_type == 'patient':
            if request.current_user.patient_id != patient_id:
                return jsonify({'error': 'Access denied'}), 403
        
        consents = GDPRConsent.query.filter_by(patient_id=patient_id).all()
        
        return jsonify({
            'success': True,
            'consents': [c.to_dict() for c in consents],
            'total': len(consents)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@gdpr_bp.route('/data-request', methods=['POST'])
@token_required
@role_required(['Patient', 'System Administrator'])
@hipaa_audit_required(action_type='create', resource_type='gdpr_data_request')
def create_data_request():
    """Create GDPR data subject access request"""
    try:
        data = request.get_json()
        patient_id = data.get('patient_id')
        request_type = data.get('request_type')  # access, rectification, erasure, portability, restriction, objection
        request_description = data.get('request_description')
        
        if not patient_id or not request_type:
            return jsonify({'error': 'Patient ID and request type are required'}), 400
        
        # Verify patient access
        user_type = request.token_payload.get('user_type', '').lower()
        if user_type == 'patient':
            if request.current_user.patient_id != patient_id:
                return jsonify({'error': 'You can only create requests for yourself'}), 403
        
        success, request_id, result = gdpr_service.create_data_request(
            patient_id=patient_id,
            request_type=request_type,
            request_description=request_description
        )
        
        if success:
            return jsonify({
                'success': True,
                'request': result
            }), 201
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Failed to create data request')
            }), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@gdpr_bp.route('/data-request/<request_id>/process', methods=['POST'])
@token_required
@role_required(['System Administrator', 'Facility Administrator'])
@hipaa_audit_required(action_type='process', resource_type='gdpr_data_request')
def process_data_request(request_id):
    """Process GDPR data subject access request"""
    try:
        data_request = GDPRDataRequest.query.filter_by(request_id=request_id).first()
        if not data_request:
            return jsonify({'error': 'Request not found'}), 404
        
        if data_request.status != 'pending':
            return jsonify({'error': f'Request already {data_request.status}'}), 400
        
        # Verify identity
        data_request.identity_verified = True
        data_request.identity_verification_method = 'system_verification'
        data_request.verified_at = datetime.utcnow()
        data_request.processed_by = request.current_user.id
        
        # Process based on request type
        if data_request.request_type == 'access':
            success, result = gdpr_service.process_data_access_request(request_id)
        elif data_request.request_type == 'erasure':
            success, result = gdpr_service.process_data_erasure_request(request_id)
        else:
            return jsonify({
                'error': f'Request type {data_request.request_type} not yet implemented'
            }), 400
        
        if success:
            return jsonify({
                'success': True,
                'result': result
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Failed to process request')
            }), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@gdpr_bp.route('/data-request/<request_id>/download', methods=['GET'])
@token_required
@role_required(['Patient', 'System Administrator'])
@hipaa_audit_required(action_type='download', resource_type='gdpr_data_export')
def download_data_export(request_id):
    """Download GDPR data export file"""
    try:
        data_request = GDPRDataRequest.query.filter_by(request_id=request_id).first()
        if not data_request:
            return jsonify({'error': 'Request not found'}), 404
        
        # Verify patient access
        user_type = request.token_payload.get('user_type', '').lower()
        if user_type == 'patient':
            if request.current_user.patient_id != data_request.patient_id:
                return jsonify({'error': 'Access denied'}), 403
        
        if not data_request.response_file_path or not os.path.exists(data_request.response_file_path):
            return jsonify({'error': 'Export file not found'}), 404
        
        return send_file(
            data_request.response_file_path,
            as_attachment=True,
            download_name=f"gdpr_export_{request_id}.json",
            mimetype='application/json'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@gdpr_bp.route('/data-request/patient/<int:patient_id>', methods=['GET'])
@token_required
@role_required(['Patient', 'System Administrator'])
@hipaa_audit_required(action_type='view', resource_type='gdpr_data_request')
def get_patient_data_requests(patient_id):
    """Get all data requests for a patient"""
    try:
        # Verify patient access
        user_type = request.token_payload.get('user_type', '').lower()
        if user_type == 'patient':
            if request.current_user.patient_id != patient_id:
                return jsonify({'error': 'Access denied'}), 403
        
        requests = GDPRDataRequest.query.filter_by(patient_id=patient_id).all()
        
        return jsonify({
            'success': True,
            'requests': [r.to_dict() for r in requests],
            'total': len(requests)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@gdpr_bp.route('/breach', methods=['POST'])
@token_required
@role_required(['System Administrator', 'Facility Administrator'])
@hipaa_audit_required(action_type='create', resource_type='gdpr_breach')
def record_breach():
    """Record GDPR personal data breach"""
    try:
        data = request.get_json()
        
        success, result = gdpr_service.record_breach(
            breach_type=data.get('breach_type'),
            breach_description=data.get('breach_description'),
            breach_date=datetime.fromisoformat(data['breach_date']) if isinstance(data.get('breach_date'), str) else data.get('breach_date', datetime.utcnow()),
            affected_data_categories=data.get('affected_data_categories', []),
            affected_data_subjects=data.get('affected_data_subjects', 0)
        )
        
        if success:
            return jsonify({
                'success': True,
                'breach': result
            }), 201
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Failed to record breach')
            }), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@gdpr_bp.route('/breaches', methods=['GET'])
@token_required
@role_required(['System Administrator', 'Facility Administrator'])
def get_breaches():
    """Get all GDPR breaches"""
    try:
        status = request.args.get('status')
        
        query = GDPRBreach.query
        if status:
            query = query.filter(GDPRBreach.status == status)
        
        breaches = query.order_by(GDPRBreach.discovered_at.desc()).limit(100).all()
        
        return jsonify({
            'success': True,
            'breaches': [b.to_dict() for b in breaches],
            'total': len(breaches)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@gdpr_bp.route('/retention/patient/<int:patient_id>', methods=['GET'])
@token_required
@role_required(['Patient', 'System Administrator'])
@hipaa_audit_required(action_type='view', resource_type='gdpr_retention')
def get_data_retention_status(patient_id):
    """Get data retention status for a patient"""
    try:
        # Verify patient access
        user_type = request.token_payload.get('user_type', '').lower()
        if user_type == 'patient':
            if request.current_user.patient_id != patient_id:
                return jsonify({'error': 'Access denied'}), 403
        
        success, result = gdpr_service.get_data_retention_status(patient_id)
        
        if success:
            return jsonify({
                'success': True,
                'retention_status': result
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Failed to get retention status')
            }), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@gdpr_bp.route('/processing-activities', methods=['GET'])
@token_required
@role_required(['System Administrator'])
def get_processing_activities():
    """Get GDPR Article 30 - Record of Processing Activities"""
    try:
        activities = GDPRDataProcessingActivity.query.all()
        
        return jsonify({
            'success': True,
            'activities': [a.to_dict() for a in activities],
            'total': len(activities)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@gdpr_bp.route('/processing-activities', methods=['POST'])
@token_required
@role_required(['System Administrator'])
def create_processing_activity():
    """Create GDPR Article 30 - Record of Processing Activity"""
    try:
        data = request.get_json()
        
        activity = GDPRDataProcessingActivity(
            activity_id=f"ACT-{uuid.uuid4().hex[:12].upper()}",
            activity_name=data.get('activity_name'),
            activity_description=data.get('activity_description'),
            processing_purpose=data.get('processing_purpose'),
            data_categories=json.dumps(data.get('data_categories', [])),
            data_subject_categories=json.dumps(data.get('data_subject_categories', [])),
            recipients=json.dumps(data.get('recipients', [])),
            third_country_transfers=data.get('third_country_transfers', False),
            transfer_countries=json.dumps(data.get('transfer_countries', [])),
            retention_period=data.get('retention_period'),
            retention_justification=data.get('retention_justification'),
            security_measures=json.dumps(data.get('security_measures', []))
        )
        
        db.session.add(activity)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'activity': activity.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@gdpr_bp.route('/compliance/dashboard', methods=['GET'])
@token_required
@role_required(['System Administrator', 'Facility Administrator'])
def get_gdpr_dashboard():
    """Get GDPR compliance dashboard"""
    try:
        # Get statistics
        total_consents = GDPRConsent.query.count()
        active_consents = GDPRConsent.query.filter_by(is_granted=True).count()
        pending_requests = GDPRDataRequest.query.filter_by(status='pending').count()
        total_breaches = GDPRBreach.query.count()
        unresolved_breaches = GDPRBreach.query.filter(GDPRBreach.status.in_(['reported', 'investigating'])).count()
        
        # Recent activity
        recent_requests = GDPRDataRequest.query.order_by(
            GDPRDataRequest.submitted_at.desc()
        ).limit(10).all()
        
        recent_breaches = GDPRBreach.query.order_by(
            GDPRBreach.discovered_at.desc()
        ).limit(5).all()
        
        return jsonify({
            'success': True,
            'dashboard': {
                'statistics': {
                    'total_consents': total_consents,
                    'active_consents': active_consents,
                    'pending_requests': pending_requests,
                    'total_breaches': total_breaches,
                    'unresolved_breaches': unresolved_breaches
                },
                'recent_requests': [r.to_dict() for r in recent_requests],
                'recent_breaches': [b.to_dict() for b in recent_breaches]
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

