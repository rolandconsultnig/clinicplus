"""
Document Management Routes - Comprehensive OpenEMR-style document management
Includes document display, categories, templates, DICOM viewer, patient documents
"""
from flask import Blueprint, request, jsonify, send_file
from src.models.documents import Document, DocumentCategory, DocumentTemplate, DocumentAccessLog
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
                'name': c.category_name,
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
        
        # Document uses is_active/status for lifecycle state.
        query = Document.query.filter(
            Document.patient_id == patient_id,
            Document.is_active == True,
            Document.status != 'deleted'
        )
        
        if category:
            query = query.filter(Document.category == category)
        
        documents = query.order_by(Document.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'documents': [d.to_dict() if hasattr(d, 'to_dict') else {
                'id': d.id,
                'document_name': d.file_name if hasattr(d, 'file_name') else d.title,
                'category': d.category,
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
        facility_id = request.token_payload.get('facility_id')
        
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save file and persist metadata.
        filename = f"{uuid.uuid4()}_{file.filename}"
        upload_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            'uploads',
            'documents'
        )
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, filename)
        file.save(file_path)

        category = DocumentCategory.query.get(category_id) if category_id else None
        category_name = category.category_name if category else request.form.get('category', 'clinical')
        
        document = Document(
            document_id=f"DOC-{uuid.uuid4().hex[:12].upper()}",
            patient_id=patient_id,
            title=request.form.get('title') or file.filename,
            description=request.form.get('description'),
            document_type=request.form.get('document_type', 'uploaded_document'),
            category=category_name,
            file_name=file.filename,
            file_path=file_path,
            file_size=os.path.getsize(file_path),
            mime_type=file.content_type,
            facility_id=facility_id,
            source='uploaded',
            created_by=request.current_user.id if hasattr(request, 'current_user') else None,
            created_at=datetime.utcnow()
        )
        
        db.session.add(document)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'document': document.to_dict() if hasattr(document, 'to_dict') else {
                'id': document.id,
                'document_name': document.file_name
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
        facility_id = request.token_payload.get('facility_id')
        templates = DocumentTemplate.query.filter(
            DocumentTemplate.is_active == True,
            db.or_(
                DocumentTemplate.is_global == True,
                DocumentTemplate.facility_id == facility_id
            )
        ).order_by(DocumentTemplate.template_name.asc()).all()
        
        return jsonify({
            'success': True,
            'templates': [t.to_dict() for t in templates]
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
        
        return jsonify({
            'success': True,
            'document': document.to_dict() if hasattr(document, 'to_dict') else {},
            'viewer_url': f'/dicom-viewer/{document_id}'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@document_mgmt_bp.route('/<int:document_id>/file', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def stream_document_file(document_id):
    """Stream/download raw document file."""
    try:
        document = Document.query.get_or_404(document_id)
        if not document.file_path or not os.path.exists(document.file_path):
            return jsonify({'error': 'Document file not found'}), 404

        access_log = DocumentAccessLog(
            document_id=document.id,
            user_id=getattr(request.current_user, 'id', None),
            action='download',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent')
        )
        db.session.add(access_log)
        db.session.commit()
        return send_file(document.file_path, as_attachment=True, download_name=document.file_name)
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

