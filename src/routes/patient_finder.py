"""
Patient Finder Routes - Comprehensive OpenEMR-style patient finder
Includes dynamic finder, multi-patient finder, patient select, document select
"""
from flask import Blueprint, request, jsonify
from src.models.patient import Patient
from src.models.user import db
from src.auth.jwt_manager import token_required, role_required
from sqlalchemy import or_

patient_finder_bp = Blueprint('patient_finder', __name__)

@patient_finder_bp.route('/dynamic', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'Receptionist', 'System Administrator'])
def dynamic_finder():
    """Dynamic patient finder with multiple search criteria"""
    try:
        search_term = request.args.get('search', '')
        search_type = request.args.get('type', 'all')  # name, mrn, phone, dob, all
        facility_id = request.args.get('facility_id', type=int)
        limit = request.args.get('limit', 50, type=int)
        
        query = Patient.query.filter_by(is_active=True)
        
        if facility_id:
            query = query.filter_by(facility_id=facility_id)
        
        if search_term:
            if search_type == 'name' or search_type == 'all':
                query = query.filter(
                    or_(
                        Patient.first_name.ilike(f'%{search_term}%'),
                        Patient.last_name.ilike(f'%{search_term}%'),
                        Patient.middle_name.ilike(f'%{search_term}%')
                    )
                )
            elif search_type == 'mrn':
                query = query.filter(Patient.universal_patient_id.ilike(f'%{search_term}%'))
            elif search_type == 'phone':
                query = query.filter(
                    or_(
                        Patient.phone_primary.ilike(f'%{search_term}%'),
                        Patient.phone_cell.ilike(f'%{search_term}%'),
                        Patient.phone_home.ilike(f'%{search_term}%')
                    )
                )
            elif search_type == 'dob':
                try:
                    dob = datetime.fromisoformat(search_term).date()
                    query = query.filter_by(date_of_birth=dob)
                except:
                    pass
        
        patients = query.limit(limit).all()
        
        return jsonify({
            'success': True,
            'patients': [p.to_dict() for p in patients],
            'count': len(patients)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@patient_finder_bp.route('/multi-patient', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def multi_patient_finder():
    """Multi-patient finder for batch operations"""
    try:
        patient_ids = request.args.get('patient_ids', '').split(',')
        patient_ids = [int(pid) for pid in patient_ids if pid.strip()]
        
        if not patient_ids:
            return jsonify({'error': 'No patient IDs provided'}), 400
        
        patients = Patient.query.filter(Patient.id.in_(patient_ids)).all()
        
        return jsonify({
            'success': True,
            'patients': [p.to_dict() for p in patients],
            'count': len(patients)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@patient_finder_bp.route('/select', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'Receptionist', 'System Administrator'])
def patient_select():
    """Patient select for popups/modals"""
    try:
        search_term = request.args.get('search', '')
        limit = request.args.get('limit', 20, type=int)
        
        query = Patient.query.filter_by(is_active=True)
        
        if search_term:
            query = query.filter(
                or_(
                    Patient.first_name.ilike(f'%{search_term}%'),
                    Patient.last_name.ilike(f'%{search_term}%'),
                    Patient.universal_patient_id.ilike(f'%{search_term}%')
                )
            )
        
        patients = query.limit(limit).all()
        
        return jsonify({
            'success': True,
            'patients': [{
                'id': p.id,
                'name': f"{p.first_name} {p.last_name}",
                'mrn': p.universal_patient_id,
                'dob': p.date_of_birth.isoformat() if p.date_of_birth else None
            } for p in patients]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@patient_finder_bp.route('/document-select', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def document_select():
    """Document select for popups/modals"""
    try:
        patient_id = request.args.get('patient_id', type=int)
        category = request.args.get('category')
        
        from src.models.documents import Document
        
        query = Document.query.filter_by(is_deleted=False)
        
        if patient_id:
            query = query.filter_by(patient_id=patient_id)
        
        if category:
            from src.models.documents import DocumentCategory
            query = query.join(DocumentCategory).filter(DocumentCategory.name == category)
        
        documents = query.order_by(Document.created_at.desc()).limit(50).all()
        
        return jsonify({
            'success': True,
            'documents': [{
                'id': d.id,
                'name': d.document_name if hasattr(d, 'document_name') else d.name,
                'category': d.category.name if hasattr(d, 'category') else None,
                'created_at': d.created_at.isoformat() if d.created_at else None
            } for d in documents]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

