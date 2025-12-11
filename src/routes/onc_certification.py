"""
ONC Health IT Certification Routes
2015 Edition Criteria compliance and certification management
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.onc_certification import ONCCertification, ONCCriteriaRecord, ONCComplianceLog
from src.services.onc_certification import onc_service
from datetime import datetime, date
import uuid
import json

onc_bp = Blueprint('onc', __name__)

@onc_bp.route('/certification/status', methods=['GET'])
@token_required
@role_required(['System Administrator', 'Facility Administrator'])
def get_certification_status():
    """Get ONC certification status"""
    try:
        status = onc_service.get_certification_status()
        
        return jsonify({
            'success': True,
            'status': status
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@onc_bp.route('/criteria', methods=['GET'])
@token_required
@role_required(['System Administrator', 'Facility Administrator', 'Physician'])
def get_all_criteria():
    """Get all ONC 2015 Edition Criteria"""
    try:
        criteria_list = []
        
        for criteria_id, criteria_info in onc_service.ONC_CRITERIA.items():
            criteria_list.append({
                'criteria_id': criteria_id,
                'name': criteria_info['name'],
                'category': criteria_info['category'],
                'description': criteria_info['description']
            })
        
        return jsonify({
            'success': True,
            'criteria': criteria_list,
            'total': len(criteria_list)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@onc_bp.route('/criteria/<criteria_id>/verify', methods=['POST'])
@token_required
@role_required(['System Administrator', 'Facility Administrator'])
def verify_criteria(criteria_id):
    """Verify if a specific ONC criteria is met"""
    try:
        is_met, evidence, details = onc_service.verify_criteria(criteria_id)
        
        # Create compliance log
        onc_service.create_compliance_log(
            activity_type='criteria_verification',
            criteria_id=criteria_id,
            result='pass' if is_met else 'fail',
            details={'evidence': evidence, 'is_met': is_met}
        )
        
        return jsonify({
            'success': True,
            'criteria_id': criteria_id,
            'is_met': is_met,
            'evidence': evidence,
            'details': details
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@onc_bp.route('/certification/create', methods=['POST'])
@token_required
@role_required(['System Administrator'])
def create_certification():
    """Create ONC certification record"""
    try:
        data = request.get_json()
        
        certification = ONCCertification(
            certification_id=f"ONC-CERT-{uuid.uuid4().hex[:12].upper()}",
            certification_edition=data.get('edition', '2015'),
            certification_date=datetime.fromisoformat(data['certification_date']).date() if isinstance(data.get('certification_date'), str) else data.get('certification_date', date.today()),
            certification_body=data.get('certification_body', 'ONC-ACB'),
            certification_number=data.get('certification_number'),
            criteria_met=json.dumps(data.get('criteria_met', [])),
            status='certified',
            expiration_date=datetime.fromisoformat(data['expiration_date']).date() if isinstance(data.get('expiration_date'), str) else data.get('expiration_date')
        )
        
        db.session.add(certification)
        db.session.flush()
        
        # Create criteria records
        criteria_met = data.get('criteria_met', [])
        for criteria_id in criteria_met:
            criteria_info = onc_service.ONC_CRITERIA.get(criteria_id)
            if criteria_info:
                criteria_record = ONCCriteriaRecord(
                    record_id=f"CRIT-{uuid.uuid4().hex[:12].upper()}",
                    certification_id=certification.id,
                    criteria_id=criteria_id,
                    criteria_name=criteria_info['name'],
                    criteria_category=criteria_info['category'],
                    is_met=True,
                    last_verified_at=datetime.utcnow()
                )
                db.session.add(criteria_record)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'certification': certification.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@onc_bp.route('/compliance/logs', methods=['GET'])
@token_required
@role_required(['System Administrator', 'Facility Administrator'])
def get_compliance_logs():
    """Get ONC compliance logs"""
    try:
        criteria_id = request.args.get('criteria_id')
        activity_type = request.args.get('activity_type')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        query = ONCComplianceLog.query
        
        if criteria_id:
            query = query.filter(ONCComplianceLog.criteria_id == criteria_id)
        if activity_type:
            query = query.filter(ONCComplianceLog.activity_type == activity_type)
        if date_from:
            query = query.filter(ONCComplianceLog.timestamp >= datetime.fromisoformat(date_from))
        if date_to:
            query = query.filter(ONCComplianceLog.timestamp <= datetime.fromisoformat(date_to))
        
        logs = query.order_by(ONCComplianceLog.timestamp.desc()).limit(100).all()
        
        return jsonify({
            'success': True,
            'logs': [log.to_dict() for log in logs],
            'total': len(logs)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@onc_bp.route('/compliance/report', methods=['GET'])
@token_required
@role_required(['System Administrator', 'Facility Administrator'])
def get_compliance_report():
    """Get comprehensive ONC compliance report"""
    try:
        # Get certification status
        cert_status = onc_service.get_certification_status()
        
        # Get all criteria with verification status
        criteria_status = []
        for criteria_id, criteria_info in onc_service.ONC_CRITERIA.items():
            is_met, evidence, details = onc_service.verify_criteria(criteria_id)
            criteria_status.append({
                'criteria_id': criteria_id,
                'name': criteria_info['name'],
                'category': criteria_info['category'],
                'is_met': is_met,
                'evidence': evidence
            })
        
        # Calculate compliance by category
        category_compliance = {}
        for criteria in criteria_status:
            category = criteria['category']
            if category not in category_compliance:
                category_compliance[category] = {'total': 0, 'met': 0}
            category_compliance[category]['total'] += 1
            if criteria['is_met']:
                category_compliance[category]['met'] += 1
        
        # Calculate percentages
        for category in category_compliance:
            total = category_compliance[category]['total']
            met = category_compliance[category]['met']
            category_compliance[category]['percentage'] = round((met / total * 100) if total > 0 else 0, 2)
        
        return jsonify({
            'success': True,
            'certification_status': cert_status,
            'criteria_status': criteria_status,
            'category_compliance': category_compliance,
            'total_criteria': len(criteria_status),
            'met_criteria': sum(1 for c in criteria_status if c['is_met']),
            'overall_compliance_rate': round((sum(1 for c in criteria_status if c['is_met']) / len(criteria_status) * 100) if criteria_status else 0, 2)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@onc_bp.route('/criteria/<criteria_id>', methods=['GET'])
@token_required
@role_required(['System Administrator', 'Facility Administrator', 'Physician'])
def get_criteria_details(criteria_id):
    """Get details for a specific ONC criteria"""
    try:
        criteria_info = onc_service.ONC_CRITERIA.get(criteria_id)
        
        if not criteria_info:
            return jsonify({
                'success': False,
                'error': f'Criteria {criteria_id} not found'
            }), 404
        
        # Verify criteria
        is_met, evidence, details = onc_service.verify_criteria(criteria_id)
        
        return jsonify({
            'success': True,
            'criteria': {
                'criteria_id': criteria_id,
                **criteria_info,
                'is_met': is_met,
                'evidence': evidence
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

