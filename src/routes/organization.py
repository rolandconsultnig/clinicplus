"""
Organization Management API Routes
Handles organization creation, approval workflow, and operational processes
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.organization import (
    Organization, OperationalProcess, OrganizationApproval, 
    OrganizationHierarchy, OrganizationStatus, ApprovalLevel
)
from src.models.auth import UserAccount
from datetime import datetime, date
import uuid
import json

organization_bp = Blueprint('organization', __name__)

# ==================== ORGANIZATION MANAGEMENT ====================

@organization_bp.route('/organizations', methods=['POST'])
@token_required
def create_organization():
    """Create a new organization (requires 3-level approval)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['organization_name', 'organization_type', 'email']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Create organization
        organization = Organization(
            organization_id=f"ORG-{uuid.uuid4().hex[:12].upper()}",
            organization_name=data['organization_name'],
            organization_type=data['organization_type'],
            legal_name=data.get('legal_name'),
            registration_number=data.get('registration_number'),
            tax_id=data.get('tax_id'),
            email=data['email'],
            phone=data.get('phone'),
            website=data.get('website'),
            address_line1=data.get('address_line1'),
            city=data.get('city'),
            state=data.get('state'),
            zip_code=data.get('zip_code'),
            country=data.get('country', 'USA'),
            parent_organization_id=data.get('parent_organization_id'),
            root_organization_id=data.get('root_organization_id', 1),  # Clinic+ is root
            organization_level=data.get('organization_level', 1),
            status=OrganizationStatus.PENDING_APPROVAL.value,
            approval_level=ApprovalLevel.LEVEL_1.value,
            subscription_tier=data.get('subscription_tier', 'basic'),
            created_by=request.current_user.id
        )
        
        db.session.add(organization)
        db.session.flush()
        
        # Create first approval request
        approval = OrganizationApproval(
            approval_id=f"APPR-{uuid.uuid4().hex[:12].upper()}",
            organization_id=organization.id,
            approval_level=ApprovalLevel.LEVEL_1.value,
            approval_status='pending',
            next_approval_level=ApprovalLevel.LEVEL_2.value,
            is_final_approval=False
        )
        
        db.session.add(approval)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'organization': organization.to_dict(),
            'message': 'Organization created. Awaiting 3-level approval.'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@organization_bp.route('/organizations', methods=['GET'])
@token_required
@role_required(['admin', 'system_administrator'])
def get_organizations():
    """Get all organizations (root admin only)"""
    try:
        status = request.args.get('status')
        organization_type = request.args.get('organization_type')
        approval_level = request.args.get('approval_level')
        
        query = Organization.query
        
        if status:
            query = query.filter(Organization.status == status)
        if organization_type:
            query = query.filter(Organization.organization_type == organization_type)
        if approval_level:
            query = query.filter(Organization.approval_level == approval_level)
        
        organizations = query.order_by(Organization.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'organizations': [org.to_dict() for org in organizations],
            'total': len(organizations)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@organization_bp.route('/organizations/<int:org_id>', methods=['GET'])
@token_required
def get_organization(org_id):
    """Get organization details"""
    try:
        organization = Organization.query.get_or_404(org_id)
        return jsonify({
            'success': True,
            'organization': organization.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== APPROVAL WORKFLOW ====================

@organization_bp.route('/organizations/<int:org_id>/approve', methods=['POST'])
@token_required
@role_required(['admin', 'system_administrator', 'approver'])
def approve_organization(org_id):
    """Approve organization at current level"""
    try:
        organization = Organization.query.get_or_404(org_id)
        data = request.get_json()
        approval_comment = data.get('comment', '')
        
        current_level = organization.approval_level
        
        # Update approval based on level
        if current_level == ApprovalLevel.LEVEL_1.value:
            organization.level_1_approver_id = request.current_user.id
            organization.level_1_approved_at = datetime.utcnow()
            organization.approval_level = ApprovalLevel.LEVEL_2.value
            
            # Create level 2 approval request
            approval = OrganizationApproval(
                approval_id=f"APPR-{uuid.uuid4().hex[:12].upper()}",
                organization_id=organization.id,
                approval_level=ApprovalLevel.LEVEL_2.value,
                approval_status='pending',
                next_approval_level=ApprovalLevel.LEVEL_3.value,
                is_final_approval=False
            )
            db.session.add(approval)
            
        elif current_level == ApprovalLevel.LEVEL_2.value:
            organization.level_2_approver_id = request.current_user.id
            organization.level_2_approved_at = datetime.utcnow()
            organization.approval_level = ApprovalLevel.LEVEL_3.value
            
            # Create level 3 approval request
            approval = OrganizationApproval(
                approval_id=f"APPR-{uuid.uuid4().hex[:12].upper()}",
                organization_id=organization.id,
                approval_level=ApprovalLevel.LEVEL_3.value,
                approval_status='pending',
                is_final_approval=True
            )
            db.session.add(approval)
            
        elif current_level == ApprovalLevel.LEVEL_3.value:
            # Final approval
            organization.level_3_approver_id = request.current_user.id
            organization.level_3_approved_at = datetime.utcnow()
            organization.status = OrganizationStatus.APPROVED.value
            organization.approved_at = datetime.utcnow()
            organization.is_active = True
            
            # Update approval record
            approval = OrganizationApproval.query.filter_by(
                organization_id=organization.id,
                approval_level=ApprovalLevel.LEVEL_3.value,
                approval_status='pending'
            ).first()
            if approval:
                approval.approval_status = 'approved'
                approval.approver_id = request.current_user.id
                approval.approval_comment = approval_comment
                approval.approved_at = datetime.utcnow()
        
        # Update current approval record
        current_approval = OrganizationApproval.query.filter_by(
            organization_id=organization.id,
            approval_level=current_level,
            approval_status='pending'
        ).first()
        
        if current_approval:
            current_approval.approval_status = 'approved'
            current_approval.approver_id = request.current_user.id
            current_approval.approval_comment = approval_comment
            current_approval.approved_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'organization': organization.to_dict(),
            'message': f'Organization approved at {current_level}. ' + 
                      ('Final approval granted. Organization is now active.' if current_level == ApprovalLevel.LEVEL_3.value 
                       else f'Awaiting {organization.approval_level} approval.')
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@organization_bp.route('/organizations/<int:org_id>/reject', methods=['POST'])
@token_required
@role_required(['admin', 'system_administrator', 'approver'])
def reject_organization(org_id):
    """Reject organization"""
    try:
        organization = Organization.query.get_or_404(org_id)
        data = request.get_json()
        rejection_reason = data.get('reason', 'No reason provided')
        
        organization.status = OrganizationStatus.REJECTED.value
        organization.rejected_at = datetime.utcnow()
        organization.rejection_reason = rejection_reason
        
        # Update approval record
        current_approval = OrganizationApproval.query.filter_by(
            organization_id=organization.id,
            approval_level=organization.approval_level,
            approval_status='pending'
        ).first()
        
        if current_approval:
            current_approval.approval_status = 'rejected'
            current_approval.approver_id = request.current_user.id
            current_approval.rejection_reason = rejection_reason
            current_approval.approved_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'organization': organization.to_dict(),
            'message': 'Organization rejected'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@organization_bp.route('/organizations/pending-approvals', methods=['GET'])
@token_required
@role_required(['admin', 'system_administrator', 'approver'])
def get_pending_approvals():
    """Get organizations pending approval"""
    try:
        approval_level = request.args.get('approval_level')
        
        query = Organization.query.filter(
            Organization.status == OrganizationStatus.PENDING_APPROVAL.value
        )
        
        if approval_level:
            query = query.filter(Organization.approval_level == approval_level)
        
        organizations = query.order_by(Organization.submitted_at).all()
        
        return jsonify({
            'success': True,
            'organizations': [org.to_dict() for org in organizations],
            'total': len(organizations)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== OPERATIONAL PROCESSES ====================

@organization_bp.route('/operational-processes', methods=['POST'])
@token_required
@role_required(['admin', 'system_administrator'])
def create_operational_process():
    """Create operational process (modus operandi)"""
    try:
        data = request.get_json()
        
        process = OperationalProcess(
            process_id=f"PROC-{uuid.uuid4().hex[:12].upper()}",
            process_name=data['process_name'],
            process_category=data.get('process_category'),
            description=data.get('description'),
            workflow_definition=json.dumps(data.get('workflow_definition', {})),
            process_steps=json.dumps(data.get('process_steps', [])),
            approval_requirements=json.dumps(data.get('approval_requirements', {})),
            notification_rules=json.dumps(data.get('notification_rules', {})),
            is_default=data.get('is_default', False),
            is_template=data.get('is_template', True),
            organization_id=data.get('organization_id'),
            is_global=data.get('is_global', False),
            version=data.get('version', '1.0'),
            created_by=request.current_user.id
        )
        
        db.session.add(process)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'process': process.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@organization_bp.route('/operational-processes', methods=['GET'])
@token_required
def get_operational_processes():
    """Get operational processes"""
    try:
        organization_id = request.args.get('organization_id', type=int)
        category = request.args.get('category')
        is_template = request.args.get('is_template', type=bool)
        
        query = OperationalProcess.query.filter(OperationalProcess.is_active == True)
        
        if organization_id:
            query = query.filter(
                db.or_(
                    OperationalProcess.organization_id == organization_id,
                    OperationalProcess.is_global == True
                )
            )
        else:
            query = query.filter(OperationalProcess.is_global == True)
        
        if category:
            query = query.filter(OperationalProcess.process_category == category)
        if is_template is not None:
            query = query.filter(OperationalProcess.is_template == is_template)
        
        processes = query.all()
        
        return jsonify({
            'success': True,
            'processes': [p.to_dict() for p in processes],
            'total': len(processes)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@organization_bp.route('/organizations/<int:org_id>/assign-process', methods=['POST'])
@token_required
@role_required(['admin', 'system_administrator'])
def assign_operational_process(org_id):
    """Assign operational process to organization"""
    try:
        organization = Organization.query.get_or_404(org_id)
        data = request.get_json()
        process_id = data.get('process_id')
        
        process = OperationalProcess.query.get_or_404(process_id)
        
        organization.modus_operandi_id = process.id
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'organization': organization.to_dict(),
            'message': f'Operational process "{process.process_name}" assigned'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ==================== ORGANIZATION HIERARCHY ====================

@organization_bp.route('/organizations/<int:org_id>/hierarchy', methods=['GET'])
@token_required
def get_organization_hierarchy(org_id):
    """Get organization hierarchy"""
    try:
        organization = Organization.query.get_or_404(org_id)
        
        # Get parent chain
        parents = []
        current = organization
        while current.parent_organization_id:
            parent = Organization.query.get(current.parent_organization_id)
            if parent:
                parents.append(parent.to_dict())
                current = parent
            else:
                break
        
        # Get children
        children = Organization.query.filter_by(
            parent_organization_id=org_id,
            is_active=True
        ).all()
        
        return jsonify({
            'success': True,
            'organization': organization.to_dict(),
            'parents': parents,
            'children': [child.to_dict() for child in children]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

