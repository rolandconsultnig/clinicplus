"""
ERA (Electronic Remittance Advice) API Routes for Clinic+
"""

from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.era import ERA, ERAClaim
from src.models.auth import AuditLog
from datetime import datetime, date
import json
import uuid

era_bp = Blueprint('era', __name__)

@era_bp.route('/eras', methods=['GET'])
@token_required
@role_required(['Billing Manager', 'System Administrator'])
def get_eras():
    """Get ERAs with filtering"""
    try:
        payer_id = request.args.get('payer_id', type=int)
        facility_id = request.args.get('facility_id', type=int)
        status = request.args.get('status')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = ERA.query.filter_by(is_active=True)
        
        if payer_id:
            query = query.filter_by(payer_id=payer_id)
        if facility_id:
            query = query.filter_by(facility_id=facility_id)
        if status:
            query = query.filter_by(status=status)
        
        query = query.order_by(ERA.file_received_date.desc())
        eras = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'eras': [era.to_dict() for era in eras.items],
            'total': eras.total,
            'page': page,
            'per_page': per_page,
            'pages': eras.pages
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@era_bp.route('/eras/<int:era_id>', methods=['GET'])
@token_required
@role_required(['Billing Manager', 'System Administrator'])
def get_era(era_id):
    """Get specific ERA with claims"""
    try:
        era = ERA.query.get_or_404(era_id)
        claims = ERAClaim.query.filter_by(era_id=era_id).all()
        
        return jsonify({
            'success': True,
            'era': era.to_dict(),
            'claims': [claim.to_dict() for claim in claims]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@era_bp.route('/eras', methods=['POST'])
@token_required
@role_required(['Billing Manager', 'System Administrator'])
def create_era():
    """Create new ERA record"""
    try:
        data = request.get_json()
        user = request.current_user
        
        if not data.get('payer_id'):
            return jsonify({'error': 'payer_id is required'}), 400
        
        era = ERA(
            era_id=f"ERA-{uuid.uuid4().hex[:12].upper()}",
            payer_id=data['payer_id'],
            facility_id=data.get('facility_id', user.facility_id),
            file_name=data.get('file_name'),
            file_path=data.get('file_path'),
            payer_name=data.get('payer_name'),
            payer_tax_id=data.get('payer_tax_id'),
            payer_address=data.get('payer_address'),
            check_number=data.get('check_number'),
            check_date=datetime.strptime(data['check_date'], '%Y-%m-%d').date() if data.get('check_date') else None,
            check_amount=data.get('check_amount'),
            status=data.get('status', 'received')
        )
        
        db.session.add(era)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'era': era.to_dict(),
            'message': 'ERA created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@era_bp.route('/eras/<int:era_id>/process', methods=['POST'])
@token_required
@role_required(['Billing Manager', 'System Administrator'])
def process_era(era_id):
    """Process ERA and update claims"""
    try:
        era = ERA.query.get_or_404(era_id)
        user = request.current_user
        
        if era.status == 'processed':
            return jsonify({'error': 'ERA already processed'}), 400
        
        # Update ERA status
        era.status = 'processing'
        era.processed_by = user.id
        db.session.commit()
        
        # In a real implementation, this would parse the ERA file
        # and update claim statuses, create payments, etc.
        
        era.status = 'processed'
        era.processed_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'era': era.to_dict(),
            'message': 'ERA processed successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@era_bp.route('/era-claims', methods=['GET'])
@token_required
@role_required(['Billing Manager', 'System Administrator'])
def get_era_claims():
    """Get ERA claims"""
    try:
        era_id = request.args.get('era_id', type=int)
        claim_id = request.args.get('claim_id', type=int)
        patient_id = request.args.get('patient_id', type=int)
        
        query = ERAClaim.query
        
        if era_id:
            query = query.filter_by(era_id=era_id)
        if claim_id:
            query = query.filter_by(claim_id=claim_id)
        if patient_id:
            query = query.filter_by(patient_id=patient_id)
        
        claims = query.all()
        
        return jsonify({
            'success': True,
            'claims': [claim.to_dict() for claim in claims]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

