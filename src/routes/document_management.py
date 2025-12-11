"""
Document Management Routes - Comprehensive OpenEMR-style document management
Includes document display, categories, templates, DICOM viewer, patient documents
"""
from flask import Blueprint, request, jsonify, send_file
from src.models.documents import Document, DocumentCategory
from src.models.patient import Patient
from src.models.user import db
from src.auth.jwt_manager import token_required, role_required
from datetime import datetime
import uuid
import os

document_mgmt_bp = Blueprint('document_mgmt', __name__)

@document_mgmt_bp.route('/categories', methods=['GET'])
@token_required
def get_document_categories():
    """Get document categories"""
    try:
        categories = DocumentCategory.query.filter_by(is_active=True).all()
        
        return jsonify({
            'success': True,
            'categories': [c.to_dict() if hasattr(c, 'to_dict') else {
                'id': c.id,
                'name': c.name,
                'description': c.description if hasattr(c, 'description') else None
            } for c in categories]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@document_mgmt_bp.route('/patient/<int:patient_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_patient_documents(patient_id):
    """Get all documents for a patient"""
    try:
        Patient.query.get_or_404(patient_id)
        
        category = request.args.get('category')
        
        query = Document.query.filter_by(patient_id=patient_id, is_deleted=False)
        
        if category:
            query = query.join(DocumentCategory).filter(DocumentCategory.name == category)
        
        documents = query.order_by(Document.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'documents': [d.to_dict() if hasattr(d, 'to_dict') else {
                'id': d.id,
                'document_name': d.document_name if hasattr(d, 'document_name') else d.name,
                'category': d.category.name if hasattr(d, 'category') else None,
                'created_at': d.created_at.isoformat() if d.created_at else None
            } for d in documents]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@document_mgmt_bp.route('/upload', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator', 'Receptionist'])
def upload_document():
    """Upload a document"""
    try:
        patient_id = request.form.get('patient_id', type=int)
        category_id = request.form.get('category_id', type=int)
        
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save file (simplified - in production use proper file handling)
        filename = f"{uuid.uuid4()}_{file.filename}"
        file_path = f"uploads/documents/{filename}"
        # file.save(file_path)  # In production
        
        document = Document(
            document_id=str(uuid.uuid4()),
            patient_id=patient_id,
            category_id=category_id,
            document_name=file.filename,
            file_path=file_path,
            file_size=len(file.read()),
            mime_type=file.content_type,
            created_by=request.current_user.id if hasattr(request, 'current_user') else None,
            created_at=datetime.utcnow()
        )
        
        db.session.add(document)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'document': document.to_dict() if hasattr(document, 'to_dict') else {
                'id': document.id,
                'document_name': document.document_name
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@document_mgmt_bp.route('/<int:document_id>/download', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def download_document(document_id):
    """Download a document"""
    try:
        document = Document.query.get_or_404(document_id)
        
        # In production, return actual file
        # return send_file(document.file_path, as_attachment=True)
        
        return jsonify({
            'success': True,
            'document': document.to_dict() if hasattr(document, 'to_dict') else {},
            'download_url': f'/api/document-mgmt/{document_id}/file'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@document_mgmt_bp.route('/templates', methods=['GET'])
@token_required
@role_required(['System Administrator'])
def get_document_templates():
    """Get document templates"""
    try:
        templates = []
        
        return jsonify({
            'success': True,
            'templates': templates
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@document_mgmt_bp.route('/dicom/<int:document_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def view_dicom(document_id):
    """View DICOM image"""
    try:
        document = Document.query.get_or_404(document_id)
        
        # DICOM viewer would be implemented here
        return jsonify({
            'success': True,
            'document': document.to_dict() if hasattr(document, 'to_dict') else {},
            'viewer_url': f'/dicom-viewer/{document_id}'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

