"""
Billing Tracker API Routes for Clinic+
"""

from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.billing_tracker import BillingTracker
from src.models.auth import AuditLog
from datetime import datetime, date
import json
import uuid

billing_tracker_bp = Blueprint('billing_tracker', __name__)

@billing_tracker_bp.route('/billing-trackers', methods=['GET'])
@token_required
@role_required(['Billing Manager', 'System Administrator', 'Facility Administrator'])
def get_billing_trackers():
    """Get billing trackers with filtering"""
    try:
        claim_id = request.args.get('claim_id', type=int)
        patient_id = request.args.get('patient_id', type=int)
        status = request.args.get('status')
        payer_id = request.args.get('payer_id', type=int)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = BillingTracker.query.filter_by(is_active=True)
        
        if claim_id:
            query = query.filter_by(claim_id=claim_id)
        if patient_id:
            query = query.filter_by(patient_id=patient_id)
        if status:
            query = query.filter_by(current_status=status)
        if payer_id:
            query = query.filter_by(payer_id=payer_id)
        
        query = query.order_by(BillingTracker.created_at.desc())
        trackers = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'trackers': [tracker.to_dict() for tracker in trackers.items],
            'total': trackers.total,
            'page': page,
            'per_page': per_page,
            'pages': trackers.pages
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@billing_tracker_bp.route('/billing-trackers/<int:tracker_id>', methods=['GET'])
@token_required
@role_required(['Billing Manager', 'System Administrator'])
def get_billing_tracker(tracker_id):
    """Get specific billing tracker"""
    try:
        tracker = BillingTracker.query.get_or_404(tracker_id)
        return jsonify({
            'success': True,
            'tracker': tracker.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@billing_tracker_bp.route('/billing-trackers', methods=['POST'])
@token_required
@role_required(['Billing Manager', 'System Administrator'])
def create_billing_tracker():
    """Create new billing tracker"""
    try:
        data = request.get_json()
        user = request.current_user
        
        if not data.get('claim_id') or not data.get('patient_id'):
            return jsonify({'error': 'claim_id and patient_id are required'}), 400
        
        # Get status history
        status_history = [{
            'status': data.get('current_status', 'submitted'),
            'timestamp': datetime.utcnow().isoformat(),
            'user_id': user.id
        }]
        
        tracker = BillingTracker(
            tracker_id=f"BT-{uuid.uuid4().hex[:12].upper()}",
            claim_id=data['claim_id'],
            patient_id=data['patient_id'],
            facility_id=data.get('facility_id', user.facility_id),
            current_status=data.get('current_status', 'submitted'),
            status_history=json.dumps(status_history),
            submitted_at=datetime.utcnow() if data.get('submitted_at') else None,
            submitted_by=user.id,
            submission_method=data.get('submission_method', 'electronic'),
            submission_reference=data.get('submission_reference'),
            payer_id=data.get('payer_id'),
            expected_payment=data.get('expected_payment')
        )
        
        db.session.add(tracker)
        
        # Audit log
        audit_log = AuditLog(
            log_id=f"BT-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{tracker.id}",
            user_id=user.id,
            action_type='create',
            resource_type='billing_tracker',
            resource_id=str(tracker.id),
            patient_id=tracker.patient_id,
            details=json.dumps({'claim_id': tracker.claim_id, 'status': tracker.current_status})
        )
        db.session.add(audit_log)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'tracker': tracker.to_dict(),
            'message': 'Billing tracker created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@billing_tracker_bp.route('/billing-trackers/<int:tracker_id>', methods=['PUT'])
@token_required
@role_required(['Billing Manager', 'System Administrator'])
def update_billing_tracker(tracker_id):
    """Update billing tracker"""
    try:
        tracker = BillingTracker.query.get_or_404(tracker_id)
        data = request.get_json()
        user = request.current_user
        
        # Update status and history
        if 'current_status' in data and data['current_status'] != tracker.current_status:
            history = json.loads(tracker.status_history) if tracker.status_history else []
            history.append({
                'status': data['current_status'],
                'timestamp': datetime.utcnow().isoformat(),
                'user_id': user.id
            })
            tracker.status_history = json.dumps(history)
            tracker.current_status = data['current_status']
        
        # Update other fields
        if 'payer_response_date' in data:
            tracker.payer_response_date = datetime.strptime(data['payer_response_date'], '%Y-%m-%dT%H:%M:%S') if isinstance(data['payer_response_date'], str) else data['payer_response_date']
        if 'payer_response_code' in data:
            tracker.payer_response_code = data['payer_response_code']
        if 'payer_response_message' in data:
            tracker.payer_response_message = data['payer_response_message']
        if 'actual_payment' in data:
            tracker.actual_payment = data['actual_payment']
        if 'payment_date' in data:
            tracker.payment_date = datetime.strptime(data['payment_date'], '%Y-%m-%d').date() if isinstance(data['payment_date'], str) else data['payment_date']
        if 'denial_reason' in data:
            tracker.denial_reason = data['denial_reason']
        if 'denial_code' in data:
            tracker.denial_code = data['denial_code']
        if 'appeal_required' in data:
            tracker.appeal_required = data['appeal_required']
        if 'next_followup_date' in data:
            tracker.next_followup_date = datetime.strptime(data['next_followup_date'], '%Y-%m-%d').date() if isinstance(data['next_followup_date'], str) else data['next_followup_date']
        if 'followup_notes' in data:
            tracker.followup_notes = data['followup_notes']
        
        tracker.updated_at = datetime.utcnow()
        
        # Audit log
        audit_log = AuditLog(
            log_id=f"BT-UPDATE-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{tracker.id}",
            user_id=user.id,
            action_type='update',
            resource_type='billing_tracker',
            resource_id=str(tracker.id),
            patient_id=tracker.patient_id
        )
        db.session.add(audit_log)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'tracker': tracker.to_dict(),
            'message': 'Billing tracker updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
