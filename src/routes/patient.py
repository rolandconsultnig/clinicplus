"""
Patient Routes
Basic patient routes (secure routes are in patient_secure.py)
"""

from flask import Blueprint, jsonify, request
from src.auth.jwt_manager import token_required
from src.models.patient import Patient
from src.models.user import db

patient_bp = Blueprint('patient', __name__)

@patient_bp.route('/patients', methods=['GET'])
@token_required
def get_patients():
    """Get basic patient list (for quick reference)"""
    try:
        # Get query parameters
        limit = request.args.get('limit', type=int, default=20)
        search = request.args.get('search', '')
        
        query = Patient.query
        
        # Apply search filter
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                db.or_(
                    Patient.first_name.ilike(search_term),
                    Patient.last_name.ilike(search_term),
                    Patient.universal_patient_id.ilike(search_term)
                )
            )
        
        # Limit results
        patients = query.limit(limit).all()
        
        return jsonify({
            'success': True,
            'patients': [{
                'id': p.id,
                'universal_patient_id': p.universal_patient_id,
                'first_name': p.first_name,
                'last_name': p.last_name,
                'date_of_birth': p.date_of_birth.isoformat() if p.date_of_birth else None,
                'gender': p.gender
            } for p in patients],
            'total': len(patients),
            'limit': limit,
            'note': 'For full patient management, use /api/secure/patients endpoints'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Use /api/secure/patients for secure patient management'
        }), 500

