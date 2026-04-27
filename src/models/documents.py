"""
Document Management Models for Clinic+
Comprehensive document system with versioning, sharing, and workflow
"""

from datetime import datetime, date
from src.models.user import db
from sqlalchemy.orm import synonym

class Document(db.Model):
    __tablename__ = 'documents'
    
    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Document Details
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    document_type = db.Column(db.String(100), nullable=False)  # lab_result, imaging, letter, form, note, etc.
    category = db.Column(db.String(100))  # clinical, administrative, financial, legal
    
    # File Information
    file_name = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer)  # in bytes
    mime_type = db.Column(db.String(100))
    file_hash = db.Column(db.String(64))  # SHA-256 hash for integrity
    
    # Associations
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=True)
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    encounter_id = db.Column(db.Integer, db.ForeignKey('clinical_encounters.id'), nullable=True)
    
    # Document Metadata
    tags = db.Column(db.Text)  # JSON array of tags
    keywords = db.Column(db.Text)  # Searchable keywords
    author = db.Column(db.String(200))
    source = db.Column(db.String(200))  # uploaded, imported, generated
    
    # Status
    status = db.Column(db.String(50), default='active')  # active, archived, deleted
    is_confidential = db.Column(db.Boolean, default=False)
    requires_signature = db.Column(db.Boolean, default=False)
    signed_by = db.Column(db.Integer, db.ForeignKey('providers.id'))
    signed_at = db.Column(db.DateTime)
    
    # Access Control
    access_level = db.Column(db.String(50), default='standard')  # public, standard, restricted, confidential
    
    # Versioning
    version = db.Column(db.Integer, default=1)
    parent_document_id = db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=True)  # For versioning
    is_current_version = db.Column(db.Boolean, default=True)
    
    # Expiration
    expires_at = db.Column(db.DateTime, nullable=True)
    
    # Workflow
    workflow_status = db.Column(db.String(50), default='draft')  # draft, pending_review, approved, rejected
    reviewed_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    review_notes = db.Column(db.Text, nullable=True)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    is_active = db.Column(db.Boolean, default=True)
    # Compatibility aliases still used by older routes.
    document_name = synonym('file_name')
    uploaded_by = synonym('created_by')
    uploaded_at = synonym('created_at')
    
    # Relationships
    patient = db.relationship('Patient', backref='documents')
    provider = db.relationship('Provider', foreign_keys=[provider_id], backref='documents')
    facility = db.relationship('Facility', backref='documents')
    encounter = db.relationship('ClinicalEncounter', backref='documents')
    signer = db.relationship('Provider', foreign_keys=[signed_by])
    reviewer = db.relationship('UserAccount', foreign_keys=[reviewed_by])
    parent_document = db.relationship('Document', remote_side=[id], backref='versions')
    shares = db.relationship('DocumentShare', backref='document', lazy=True, cascade='all, delete-orphan')
    annotations = db.relationship('DocumentAnnotation', backref='document', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'document_id': self.document_id,
            'title': self.title,
            'description': self.description,
            'document_type': self.document_type,
            'category': self.category,
            'file_name': self.file_name,
            'file_path': self.file_path,
            'file_size': self.file_size,
            'mime_type': self.mime_type,
            'file_hash': self.file_hash,
            'patient_id': self.patient_id,
            'provider_id': self.provider_id,
            'facility_id': self.facility_id,
            'encounter_id': self.encounter_id,
            'tags': self.tags,
            'keywords': self.keywords,
            'author': self.author,
            'source': self.source,
            'status': self.status,
            'is_confidential': self.is_confidential,
            'requires_signature': self.requires_signature,
            'signed_by': self.signed_by,
            'signed_at': self.signed_at.isoformat() if self.signed_at else None,
            'access_level': self.access_level,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by,
            'is_active': self.is_active,
            'version': self.version,
            'parent_document_id': self.parent_document_id,
            'is_current_version': self.is_current_version,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'workflow_status': self.workflow_status,
            'reviewed_by': self.reviewed_by,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'review_notes': self.review_notes
        }

class DocumentVersion(db.Model):
    """Track document versions"""
    __tablename__ = 'document_versions'
    
    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=False)
    version_number = db.Column(db.Integer, nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_name = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.Integer)
    file_hash = db.Column(db.String(64))
    change_summary = db.Column(db.Text)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    document = db.relationship('Document', backref='version_history')
    
    def to_dict(self):
        return {
            'id': self.id,
            'document_id': self.document_id,
            'version_number': self.version_number,
            'file_path': self.file_path,
            'file_name': self.file_name,
            'file_size': self.file_size,
            'file_hash': self.file_hash,
            'change_summary': self.change_summary,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class DocumentShare(db.Model):
    """Document sharing and permissions"""
    __tablename__ = 'document_shares'
    
    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=False)
    shared_with_user_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    shared_with_role_id = db.Column(db.Integer, db.ForeignKey('roles.id'), nullable=True)
    permission_level = db.Column(db.String(50), default='read')  # read, write, delete
    shared_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    shared_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    shared_with_user = db.relationship('UserAccount', foreign_keys=[shared_with_user_id])
    shared_with_role = db.relationship('Role', foreign_keys=[shared_with_role_id])
    shared_by_user = db.relationship('UserAccount', foreign_keys=[shared_by])
    
    def to_dict(self):
        return {
            'id': self.id,
            'document_id': self.document_id,
            'shared_with_user_id': self.shared_with_user_id,
            'shared_with_role_id': self.shared_with_role_id,
            'permission_level': self.permission_level,
            'shared_by': self.shared_by,
            'shared_at': self.shared_at.isoformat() if self.shared_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_active': self.is_active
        }

class DocumentAnnotation(db.Model):
    """Document annotations and comments"""
    __tablename__ = 'document_annotations'
    
    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=False)
    annotation_type = db.Column(db.String(50), default='comment')  # comment, highlight, note
    content = db.Column(db.Text, nullable=False)
    page_number = db.Column(db.Integer, nullable=True)  # For PDFs
    coordinates = db.Column(db.Text)  # JSON: {x, y, width, height}
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_resolved = db.Column(db.Boolean, default=False)
    resolved_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    resolved_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    creator = db.relationship('UserAccount', foreign_keys=[created_by])
    resolver = db.relationship('UserAccount', foreign_keys=[resolved_by])
    
    def to_dict(self):
        return {
            'id': self.id,
            'document_id': self.document_id,
            'annotation_type': self.annotation_type,
            'content': self.content,
            'page_number': self.page_number,
            'coordinates': self.coordinates,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_resolved': self.is_resolved,
            'resolved_by': self.resolved_by,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None
        }

class DocumentAccessLog(db.Model):
    """Track document access for audit trail"""
    __tablename__ = 'document_access_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=False)
    action = db.Column(db.String(50), nullable=False)  # view, download, edit, delete, share
    ip_address = db.Column(db.String(50))
    user_agent = db.Column(db.String(255))
    accessed_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    document = db.relationship('Document', backref='access_logs')
    user = db.relationship('UserAccount', backref='document_access_logs')
    
    def to_dict(self):
        return {
            'id': self.id,
            'document_id': self.document_id,
            'user_id': self.user_id,
            'action': self.action,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'accessed_at': self.accessed_at.isoformat() if self.accessed_at else None
        }

class DocumentCategory(db.Model):
    __tablename__ = 'document_categories'
    
    id = db.Column(db.Integer, primary_key=True)
    category_name = db.Column(db.String(100), unique=True, nullable=False)
    description = db.Column(db.Text)
    parent_category_id = db.Column(db.Integer, db.ForeignKey('document_categories.id'), nullable=True)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    parent_category = db.relationship('DocumentCategory', remote_side=[id], backref='subcategories')
    
    def to_dict(self):
        return {
            'id': self.id,
            'category_name': self.category_name,
            'description': self.description,
            'parent_category_id': self.parent_category_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_active': self.is_active
        }

class DocumentTemplate(db.Model):
    __tablename__ = 'document_templates'
    
    id = db.Column(db.Integer, primary_key=True)
    template_name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    template_type = db.Column(db.String(100), nullable=False)  # letter, form, report, etc.
    
    # Template Content
    template_content = db.Column(db.Text)  # HTML or text template
    template_variables = db.Column(db.Text)  # JSON array of variable names
    
    # Usage
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=True)
    is_global = db.Column(db.Boolean, default=False)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    facility = db.relationship('Facility', backref='document_templates')
    
    def to_dict(self):
        return {
            'id': self.id,
            'template_name': self.template_name,
            'description': self.description,
            'template_type': self.template_type,
            'template_content': self.template_content,
            'template_variables': self.template_variables,
            'facility_id': self.facility_id,
            'is_global': self.is_global,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'created_by': self.created_by,
            'is_active': self.is_active
        }
