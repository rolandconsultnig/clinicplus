"""
Organization Hierarchy and Operational Process Models
Clinic+ is the root organization hosting all tenant organizations
"""
from datetime import datetime
from src.models.user import db
from enum import Enum

class OrganizationStatus(str, Enum):
    """Organization status enumeration"""
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"
    ACTIVE = "active"
    INACTIVE = "inactive"

class ApprovalLevel(str, Enum):
    """Approval level enumeration"""
    LEVEL_1 = "level_1"  # First approver
    LEVEL_2 = "level_2"  # Second approver
    LEVEL_3 = "level_3"  # Final approver

class Organization(db.Model):
    """Organization model - represents tenant organizations"""
    __tablename__ = 'organizations'
    
    id = db.Column(db.Integer, primary_key=True)
    organization_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Organization Details
    organization_name = db.Column(db.String(200), nullable=False)
    organization_type = db.Column(db.String(50), nullable=False)  # clinic, hospital, pharmacy, lab, etc.
    legal_name = db.Column(db.String(200))
    registration_number = db.Column(db.String(100))
    tax_id = db.Column(db.String(50))
    
    # Contact Information
    email = db.Column(db.String(120))
    phone = db.Column(db.String(20))
    website = db.Column(db.String(200))
    
    # Address
    address_line1 = db.Column(db.String(200))
    address_line2 = db.Column(db.String(200))
    city = db.Column(db.String(100))
    state = db.Column(db.String(50))
    zip_code = db.Column(db.String(10))
    country = db.Column(db.String(50), default='USA')
    
    # Hierarchy
    parent_organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=True)
    root_organization_id = db.Column(db.Integer, nullable=True)  # Reference to Clinic+ root
    organization_level = db.Column(db.Integer, default=1)  # 1 = direct tenant, 2+ = sub-organization
    
    # Approval Workflow
    status = db.Column(db.String(50), default=OrganizationStatus.PENDING_APPROVAL.value)
    approval_level = db.Column(db.String(20), default=ApprovalLevel.LEVEL_1.value)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    approved_at = db.Column(db.DateTime)
    rejected_at = db.Column(db.DateTime)
    rejection_reason = db.Column(db.Text)
    
    # Approvers
    level_1_approver_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    level_1_approved_at = db.Column(db.DateTime)
    level_2_approver_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    level_2_approved_at = db.Column(db.DateTime)
    level_3_approver_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    level_3_approved_at = db.Column(db.DateTime)
    
    # Operational Configuration
    modus_operandi_id = db.Column(db.Integer, db.ForeignKey('operational_processes.id'), nullable=True)
    custom_config = db.Column(db.Text)  # JSON string for custom configuration
    
    # Subscription & Billing
    subscription_tier = db.Column(db.String(50), default='basic')  # basic, professional, enterprise
    subscription_start_date = db.Column(db.Date)
    subscription_end_date = db.Column(db.Date)
    billing_contact_email = db.Column(db.String(120))
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    is_active = db.Column(db.Boolean, default=False)  # Only active after all approvals
    
    # Relationships
    parent_organization = db.relationship('Organization', remote_side=[id], backref='sub_organizations')
    operational_process = db.relationship('OperationalProcess', foreign_keys=[modus_operandi_id], backref='assigned_organizations', lazy=True)
    approval_requests = db.relationship('OrganizationApproval', backref='organization', lazy=True)
    facilities = db.relationship('Facility', backref='organization', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'organization_id': self.organization_id,
            'organization_name': self.organization_name,
            'organization_type': self.organization_type,
            'status': self.status,
            'approval_level': self.approval_level,
            'parent_organization_id': self.parent_organization_id,
            'organization_level': self.organization_level,
            'subscription_tier': self.subscription_tier,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None
        }

class OperationalProcess(db.Model):
    """Operational Process (Modus Operandi) Templates"""
    __tablename__ = 'operational_processes'
    
    id = db.Column(db.Integer, primary_key=True)
    process_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Process Details
    process_name = db.Column(db.String(200), nullable=False)
    process_category = db.Column(db.String(50))  # clinical, administrative, billing, scheduling, etc.
    description = db.Column(db.Text)
    
    # Process Definition (JSON)
    workflow_definition = db.Column(db.Text, nullable=False)  # JSON string defining the workflow
    process_steps = db.Column(db.Text)  # JSON array of process steps
    approval_requirements = db.Column(db.Text)  # JSON defining approval requirements
    notification_rules = db.Column(db.Text)  # JSON defining notification rules
    
    # Default Values
    is_default = db.Column(db.Boolean, default=False)
    is_template = db.Column(db.Boolean, default=True)  # Can be used as template
    
    # Organization Association
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=True)
    is_global = db.Column(db.Boolean, default=False)  # Available to all organizations
    
    # Version Control
    version = db.Column(db.String(20), default='1.0')
    parent_process_id = db.Column(db.Integer, db.ForeignKey('operational_processes.id'), nullable=True)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    parent_process = db.relationship('OperationalProcess', remote_side=[id], backref='versions')
    
    def to_dict(self):
        import json
        return {
            'id': self.id,
            'process_id': self.process_id,
            'process_name': self.process_name,
            'process_category': self.process_category,
            'description': self.description,
            'workflow_definition': json.loads(self.workflow_definition) if self.workflow_definition else None,
            'process_steps': json.loads(self.process_steps) if self.process_steps else None,
            'is_default': self.is_default,
            'is_template': self.is_template,
            'organization_id': self.organization_id,
            'is_global': self.is_global,
            'version': self.version,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class OrganizationApproval(db.Model):
    """Organization Approval Workflow Tracking"""
    __tablename__ = 'organization_approvals'
    
    id = db.Column(db.Integer, primary_key=True)
    approval_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Organization Reference
    organization_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False)
    
    # Approval Level
    approval_level = db.Column(db.String(20), nullable=False)
    approval_status = db.Column(db.String(50), default='pending')  # pending, approved, rejected
    
    # Approver Information
    approver_id = db.Column(db.Integer, db.ForeignKey('user_accounts.id'), nullable=True)
    approver_role = db.Column(db.String(100))
    approver_name = db.Column(db.String(200))
    
    # Approval Details
    approval_comment = db.Column(db.Text)
    rejection_reason = db.Column(db.Text)
    approved_at = db.Column(db.DateTime)
    
    # Next Level
    next_approval_level = db.Column(db.String(20))
    is_final_approval = db.Column(db.Boolean, default=False)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'approval_id': self.approval_id,
            'organization_id': self.organization_id,
            'approval_level': self.approval_level,
            'approval_status': self.approval_status,
            'approver_id': self.approver_id,
            'approver_name': self.approver_name,
            'approval_comment': self.approval_comment,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'is_final_approval': self.is_final_approval,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class OrganizationHierarchy(db.Model):
    """Organization Hierarchy Mapping"""
    __tablename__ = 'organization_hierarchy'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Hierarchy Mapping
    parent_org_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False)
    child_org_id = db.Column(db.Integer, db.ForeignKey('organizations.id'), nullable=False)
    
    # Relationship Type
    relationship_type = db.Column(db.String(50))  # parent, subsidiary, partner, affiliate
    
    # Hierarchy Level
    level = db.Column(db.Integer, nullable=False)
    path = db.Column(db.String(500))  # Path from root (e.g., "1/5/12")
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'parent_org_id': self.parent_org_id,
            'child_org_id': self.child_org_id,
            'relationship_type': self.relationship_type,
            'level': self.level,
            'path': self.path,
            'is_active': self.is_active
        }

