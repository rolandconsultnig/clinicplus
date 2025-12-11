"""
Enhanced Document Management API Routes for Clinic+
Includes file upload, versioning, sharing, annotations, and workflow
"""

from flask import Blueprint, request, jsonify, send_file
from werkzeug.utils import secure_filename
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.documents import (
    Document, DocumentCategory, DocumentTemplate, DocumentVersion,
    DocumentShare, DocumentAnnotation, DocumentAccessLog
)
from src.models.auth import AuditLog, UserAccount, Role
from datetime import datetime
import json
import os
import uuid
import hashlib
from pathlib import Path

documents_bp = Blueprint('documents', __name__)

# Configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'uploads', 'documents')
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt', 'rtf', 'jpg', 'jpeg', 'png', 'gif', 'tiff', 'dcm', 'xls', 'xlsx', 'csv'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def calculate_file_hash(file_path):
    """Calculate SHA-256 hash of file"""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def log_document_access(document_id, user_id, action, request_obj):
    """Log document access for audit trail"""
    try:
        access_log = DocumentAccessLog(
            document_id=document_id,
            user_id=user_id,
            action=action,
            ip_address=request_obj.remote_addr,
            user_agent=request_obj.headers.get('User-Agent', '')
        )
        db.session.add(access_log)
        db.session.commit()
    except:
        pass

@documents_bp.route('/documents', methods=['GET'])
@token_required
def get_documents():
    """Get documents with advanced filtering and search"""
    try:
        user = request.current_user
        patient_id = request.args.get('patient_id', type=int)
        document_type = request.args.get('document_type')
        category = request.args.get('category')
        status = request.args.get('status', 'active')
        workflow_status = request.args.get('workflow_status')
        search = request.args.get('search')  # Full-text search
        tags = request.args.get('tags')  # Comma-separated tags
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')
        
        query = Document.query.filter_by(is_active=True)
        
        if status != 'all':
            query = query.filter_by(status=status)
        
        if patient_id:
            query = query.filter_by(patient_id=patient_id)
        if document_type:
            query = query.filter_by(document_type=document_type)
        if category:
            query = query.filter_by(category=category)
        if workflow_status:
            query = query.filter_by(workflow_status=workflow_status)
        
        # Full-text search
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                db.or_(
                    Document.title.ilike(search_term),
                    Document.description.ilike(search_term),
                    Document.keywords.ilike(search_term),
                    Document.file_name.ilike(search_term)
                )
            )
        
        # Tag filtering
        if tags:
            tag_list = [tag.strip() for tag in tags.split(',')]
            for tag in tag_list:
                query = query.filter(Document.tags.ilike(f'%"{tag}"%'))
        
        # Apply tenant isolation
        if user.facility_id:
            query = query.filter_by(facility_id=user.facility_id)
        
        # Sorting
        if sort_by == 'created_at':
            order_by = Document.created_at.desc() if sort_order == 'desc' else Document.created_at.asc()
        elif sort_by == 'title':
            order_by = Document.title.asc() if sort_order == 'asc' else Document.title.desc()
        elif sort_by == 'file_size':
            order_by = Document.file_size.desc() if sort_order == 'desc' else Document.file_size.asc()
        else:
            order_by = Document.created_at.desc()
        
        query = query.order_by(order_by)
        documents = query.paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'documents': [doc.to_dict() for doc in documents.items],
            'total': documents.total,
            'page': page,
            'per_page': per_page,
            'pages': documents.pages
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@documents_bp.route('/documents/<int:doc_id>', methods=['GET'])
@token_required
def get_document(doc_id):
    """Get specific document with details"""
    try:
        document = Document.query.get_or_404(doc_id)
        user = request.current_user
        
        # Log access
        log_document_access(doc_id, user.id, 'view', request)
        
        doc_dict = document.to_dict()
        
        # Add version history
        versions = DocumentVersion.query.filter_by(document_id=doc_id).order_by(DocumentVersion.version_number.desc()).all()
        doc_dict['versions'] = [v.to_dict() for v in versions]
        
        # Add shares
        shares = DocumentShare.query.filter_by(document_id=doc_id, is_active=True).all()
        doc_dict['shares'] = [s.to_dict() for s in shares]
        
        # Add annotations
        annotations = DocumentAnnotation.query.filter_by(document_id=doc_id).order_by(DocumentAnnotation.created_at.desc()).all()
        doc_dict['annotations'] = [a.to_dict() for a in annotations]
        
        return jsonify({
            'success': True,
            'document': doc_dict
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@documents_bp.route('/documents/upload', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant', 'Nurse', 'System Administrator'])
def upload_document():
    """Upload document file with metadata"""
    try:
        user = request.current_user
        
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
        
        # Get metadata from form data
        title = request.form.get('title', file.filename)
        description = request.form.get('description', '')
        document_type = request.form.get('document_type', 'general')
        category = request.form.get('category')
        patient_id = request.form.get('patient_id', type=int)
        encounter_id = request.form.get('encounter_id', type=int)
        tags = request.form.get('tags', '[]')
        is_confidential = request.form.get('is_confidential', 'false').lower() == 'true'
        requires_signature = request.form.get('requires_signature', 'false').lower() == 'true'
        expires_at = request.form.get('expires_at')
        
        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({'error': f'File size exceeds maximum of {MAX_FILE_SIZE / 1024 / 1024}MB'}), 400
        
        # Generate secure filename
        file_ext = file.filename.rsplit('.', 1)[1].lower()
        secure_name = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{secure_name}"
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        
        # Save file
        file.save(file_path)
        
        # Calculate file hash
        file_hash = calculate_file_hash(file_path)
        
        # Get MIME type
        mime_type = file.content_type or 'application/octet-stream'
        
        # Create document record
        document = Document(
            document_id=f"DOC-{uuid.uuid4().hex[:12].upper()}",
            title=title,
            description=description,
            document_type=document_type,
            category=category,
            file_name=file.filename,
            file_path=file_path,
            file_size=file_size,
            mime_type=mime_type,
            file_hash=file_hash,
            patient_id=patient_id,
            provider_id=user.provider_id,
            facility_id=user.facility_id,
            encounter_id=encounter_id,
            tags=tags,
            keywords=f"{title} {description}",
            author=user.username,
            source='uploaded',
            status='active',
            is_confidential=is_confidential,
            requires_signature=requires_signature,
            expires_at=datetime.fromisoformat(expires_at) if expires_at else None,
            workflow_status='draft',
            created_by=user.id
        )
        
        db.session.add(document)
        
        # Create version record
        version = DocumentVersion(
            document_id=document.id,
            version_number=1,
            file_path=file_path,
            file_name=file.filename,
            file_size=file_size,
            file_hash=file_hash,
            change_summary='Initial upload',
            created_by=user.id
        )
        db.session.add(version)
        
        # Audit log
        audit_log = AuditLog(
            log_id=f"DOC-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{document.id}",
            user_id=user.id,
            action_type='create',
            resource_type='document',
            resource_id=str(document.id),
            patient_id=patient_id,
            details=json.dumps({'title': title, 'type': document_type, 'file_name': file.filename})
        )
        db.session.add(audit_log)
        
        db.session.commit()
        
        log_document_access(document.id, user.id, 'upload', request)
        
        return jsonify({
            'success': True,
            'document': document.to_dict(),
            'message': 'Document uploaded successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@documents_bp.route('/documents/<int:doc_id>/download', methods=['GET'])
@token_required
def download_document(doc_id):
    """Download document file"""
    try:
        document = Document.query.get_or_404(doc_id)
        user = request.current_user
        
        # Check access permissions
        if document.is_confidential and document.created_by != user.id:
            # Check if user has share access
            share = DocumentShare.query.filter_by(
                document_id=doc_id,
                shared_with_user_id=user.id,
                is_active=True
            ).first()
            if not share:
                return jsonify({'error': 'Access denied'}), 403
        
        if not os.path.exists(document.file_path):
            return jsonify({'error': 'File not found'}), 404
        
        log_document_access(doc_id, user.id, 'download', request)
        
        return send_file(
            document.file_path,
            as_attachment=True,
            download_name=document.file_name,
            mimetype=document.mime_type
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@documents_bp.route('/documents/<int:doc_id>/preview', methods=['GET'])
@token_required
def preview_document(doc_id):
    """Preview document (for images and PDFs)"""
    try:
        document = Document.query.get_or_404(doc_id)
        user = request.current_user
        
        if not os.path.exists(document.file_path):
            return jsonify({'error': 'File not found'}), 404
        
        # Only allow preview for images and PDFs
        if document.mime_type and not (document.mime_type.startswith('image/') or document.mime_type == 'application/pdf'):
            return jsonify({'error': 'Preview not available for this file type'}), 400
        
        log_document_access(doc_id, user.id, 'preview', request)
        
        return send_file(
            document.file_path,
            mimetype=document.mime_type,
            as_attachment=False
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@documents_bp.route('/documents/<int:doc_id>/versions', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant', 'Nurse'])
def create_version(doc_id):
    """Create new version of document"""
    try:
        original_doc = Document.query.get_or_404(doc_id)
        user = request.current_user
        
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        change_summary = request.form.get('change_summary', '')
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed'}), 400
        
        # Check file size
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            return jsonify({'error': f'File size exceeds maximum of {MAX_FILE_SIZE / 1024 / 1024}MB'}), 400
        
        # Generate secure filename
        secure_name = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4().hex}_{secure_name}"
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        
        # Save file
        file.save(file_path)
        
        # Calculate file hash
        file_hash = calculate_file_hash(file_path)
        
        # Mark old version as not current
        original_doc.is_current_version = False
        
        # Create new version document
        new_version = Document(
            document_id=f"DOC-{uuid.uuid4().hex[:12].upper()}",
            title=original_doc.title,
            description=original_doc.description,
            document_type=original_doc.document_type,
            category=original_doc.category,
            file_name=file.filename,
            file_path=file_path,
            file_size=file_size,
            mime_type=file.content_type or 'application/octet-stream',
            file_hash=file_hash,
            patient_id=original_doc.patient_id,
            provider_id=original_doc.provider_id,
            facility_id=original_doc.facility_id,
            encounter_id=original_doc.encounter_id,
            tags=original_doc.tags,
            keywords=original_doc.keywords,
            author=user.username,
            source='uploaded',
            status=original_doc.status,
            is_confidential=original_doc.is_confidential,
            requires_signature=original_doc.requires_signature,
            access_level=original_doc.access_level,
            version=original_doc.version + 1,
            parent_document_id=original_doc.parent_document_id or original_doc.id,
            is_current_version=True,
            created_by=user.id
        )
        
        db.session.add(new_version)
        
        # Create version record
        version = DocumentVersion(
            document_id=new_version.id,
            version_number=new_version.version,
            file_path=file_path,
            file_name=file.filename,
            file_size=file_size,
            file_hash=file_hash,
            change_summary=change_summary,
            created_by=user.id
        )
        db.session.add(version)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'document': new_version.to_dict(),
            'message': 'New version created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@documents_bp.route('/documents/<int:doc_id>', methods=['PUT'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant', 'Nurse'])
def update_document(doc_id):
    """Update document metadata"""
    try:
        document = Document.query.get_or_404(doc_id)
        data = request.get_json()
        user = request.current_user
        
        # Update fields
        if 'title' in data:
            document.title = data['title']
        if 'description' in data:
            document.description = data['description']
        if 'category' in data:
            document.category = data['category']
        if 'tags' in data:
            document.tags = json.dumps(data['tags']) if isinstance(data['tags'], list) else data['tags']
        if 'status' in data:
            document.status = data['status']
        if 'workflow_status' in data:
            document.workflow_status = data['workflow_status']
        if 'is_confidential' in data:
            document.is_confidential = data['is_confidential']
        if 'expires_at' in data:
            document.expires_at = datetime.fromisoformat(data['expires_at']) if data['expires_at'] else None
        
        document.updated_at = datetime.utcnow()
        
        # Audit log
        audit_log = AuditLog(
            log_id=f"DOC-UPDATE-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{document.id}",
            user_id=user.id,
            action_type='update',
            resource_type='document',
            resource_id=str(document.id),
            patient_id=document.patient_id
        )
        db.session.add(audit_log)
        
        db.session.commit()
        
        log_document_access(doc_id, user.id, 'edit', request)
        
        return jsonify({
            'success': True,
            'document': document.to_dict(),
            'message': 'Document updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@documents_bp.route('/documents/<int:doc_id>', methods=['DELETE'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant', 'Nurse', 'System Administrator'])
def delete_document(doc_id):
    """Soft delete document"""
    try:
        document = Document.query.get_or_404(doc_id)
        user = request.current_user
        
        # Soft delete
        document.is_active = False
        document.status = 'deleted'
        document.updated_at = datetime.utcnow()
        
        # Audit log
        audit_log = AuditLog(
            log_id=f"DOC-DELETE-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{document.id}",
            user_id=user.id,
            action_type='delete',
            resource_type='document',
            resource_id=str(document.id),
            patient_id=document.patient_id
        )
        db.session.add(audit_log)
        
        db.session.commit()
        
        log_document_access(doc_id, user.id, 'delete', request)
        
        return jsonify({
            'success': True,
            'message': 'Document deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@documents_bp.route('/documents/<int:doc_id>/share', methods=['POST'])
@token_required
def share_document(doc_id):
    """Share document with user or role"""
    try:
        document = Document.query.get_or_404(doc_id)
        user = request.current_user
        data = request.get_json()
        
        shared_with_user_id = data.get('shared_with_user_id')
        shared_with_role_id = data.get('shared_with_role_id')
        permission_level = data.get('permission_level', 'read')
        expires_at = data.get('expires_at')
        
        if not shared_with_user_id and not shared_with_role_id:
            return jsonify({'error': 'Must specify user or role to share with'}), 400
        
        share = DocumentShare(
            document_id=doc_id,
            shared_with_user_id=shared_with_user_id,
            shared_with_role_id=shared_with_role_id,
            permission_level=permission_level,
            shared_by=user.id,
            expires_at=datetime.fromisoformat(expires_at) if expires_at else None
        )
        
        db.session.add(share)
        db.session.commit()
        
        log_document_access(doc_id, user.id, 'share', request)
        
        return jsonify({
            'success': True,
            'share': share.to_dict(),
            'message': 'Document shared successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@documents_bp.route('/documents/<int:doc_id>/annotations', methods=['POST'])
@token_required
def add_annotation(doc_id):
    """Add annotation to document"""
    try:
        document = Document.query.get_or_404(doc_id)
        user = request.current_user
        data = request.get_json()
        
        annotation = DocumentAnnotation(
            document_id=doc_id,
            annotation_type=data.get('annotation_type', 'comment'),
            content=data.get('content', ''),
            page_number=data.get('page_number'),
            coordinates=json.dumps(data.get('coordinates', {})) if data.get('coordinates') else None,
            created_by=user.id
        )
        
        db.session.add(annotation)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'annotation': annotation.to_dict(),
            'message': 'Annotation added successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@documents_bp.route('/documents/<int:doc_id>/review', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant', 'System Administrator'])
def review_document(doc_id):
    """Review and approve/reject document"""
    try:
        document = Document.query.get_or_404(doc_id)
        user = request.current_user
        data = request.get_json()
        
        workflow_status = data.get('workflow_status')  # approved, rejected
        review_notes = data.get('review_notes', '')
        
        if workflow_status not in ['approved', 'rejected']:
            return jsonify({'error': 'Invalid workflow status'}), 400
        
        document.workflow_status = workflow_status
        document.reviewed_by = user.id
        document.reviewed_at = datetime.utcnow()
        document.review_notes = review_notes
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'document': document.to_dict(),
            'message': f'Document {workflow_status} successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@documents_bp.route('/documents/<int:doc_id>/access-logs', methods=['GET'])
@token_required
@role_required(['System Administrator', 'Facility Administrator'])
def get_access_logs(doc_id):
    """Get document access logs"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        
        logs = DocumentAccessLog.query.filter_by(document_id=doc_id)\
            .order_by(DocumentAccessLog.accessed_at.desc())\
            .paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'success': True,
            'logs': [log.to_dict() for log in logs.items],
            'total': logs.total,
            'page': page,
            'pages': logs.pages
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@documents_bp.route('/document-categories', methods=['GET'])
@token_required
def get_document_categories():
    """Get document categories"""
    try:
        categories = DocumentCategory.query.filter_by(is_active=True).all()
        return jsonify({
            'success': True,
            'categories': [cat.to_dict() for cat in categories]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@documents_bp.route('/document-categories', methods=['POST'])
@token_required
@role_required(['System Administrator', 'Facility Administrator'])
def create_document_category():
    """Create document category"""
    try:
        data = request.get_json()
        
        category = DocumentCategory(
            category_name=data.get('category_name'),
            description=data.get('description'),
            parent_category_id=data.get('parent_category_id')
        )
        
        db.session.add(category)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'category': category.to_dict(),
            'message': 'Category created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@documents_bp.route('/document-templates', methods=['GET'])
@token_required
def get_document_templates():
    """Get document templates"""
    try:
        facility_id = request.args.get('facility_id', type=int)
        template_type = request.args.get('template_type')
        
        query = DocumentTemplate.query.filter_by(is_active=True)
        
        if facility_id:
            query = query.filter((DocumentTemplate.facility_id == facility_id) | (DocumentTemplate.is_global == True))
        if template_type:
            query = query.filter_by(template_type=template_type)
        
        templates = query.all()
        
        return jsonify({
            'success': True,
            'templates': [tpl.to_dict() for tpl in templates]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@documents_bp.route('/documents/bulk', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'Physician Assistant', 'Nurse'])
def bulk_operations():
    """Bulk operations on documents (delete, archive, share)"""
    try:
        user = request.current_user
        data = request.get_json()
        
        document_ids = data.get('document_ids', [])
        operation = data.get('operation')  # delete, archive, share
        
        if not document_ids:
            return jsonify({'error': 'No documents specified'}), 400
        
        documents = Document.query.filter(Document.id.in_(document_ids)).all()
        
        if operation == 'delete':
            for doc in documents:
                doc.is_active = False
                doc.status = 'deleted'
        elif operation == 'archive':
            for doc in documents:
                doc.status = 'archived'
        elif operation == 'share':
            shared_with_user_id = data.get('shared_with_user_id')
            shared_with_role_id = data.get('shared_with_role_id')
            permission_level = data.get('permission_level', 'read')
            
            for doc in documents:
                share = DocumentShare(
                    document_id=doc.id,
                    shared_with_user_id=shared_with_user_id,
                    shared_with_role_id=shared_with_role_id,
                    permission_level=permission_level,
                    shared_by=user.id
                )
                db.session.add(share)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Bulk {operation} completed successfully',
            'affected_count': len(documents)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
