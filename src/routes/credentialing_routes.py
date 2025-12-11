"""
Additional Comprehensive Credentialing Routes
To be integrated into professional.py
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.credentialing import (
    CredentialingApplication, PrimarySourceVerification, CredentialDocument,
    ClinicalPrivilege, ProviderPrivilege, CMETracking, SanctionExclusion,
    RecredentialingCycle, CredentialingAuditLog, CredentialingTemplate
)
from src.models.professional import ProfessionalCredential
from src.models.provider import Provider
from src.models.auth import UserAccount
from datetime import datetime, date, timedelta
from decimal import Decimal
import uuid
import json
import os
import hashlib

# Helper function to create audit log
def create_audit_log(entity_type, entity_id, provider_id, action_type, action_description, old_values=None, new_values=None):
    """Create audit log entry"""
    try:
        user = request.current_user if hasattr(request, 'current_user') else None
        log = CredentialingAuditLog(
            log_id=f"AUDIT-{uuid.uuid4().hex[:12].upper()}",
            entity_type=entity_type,
            entity_id=entity_id,
            provider_id=provider_id,
            action_type=action_type,
            action_description=action_description,
            old_values=json.dumps(old_values) if old_values else None,
            new_values=json.dumps(new_values) if new_values else None,
            performed_by=user.id if user else None,
            performed_by_name=f"{user.first_name} {user.last_name}" if user else 'System',
            ip_address=request.remote_addr if request else None,
            user_agent=request.headers.get('User-Agent') if request else None
        )
        db.session.add(log)
        return log
    except Exception as e:
        print(f"Error creating audit log: {e}")
        return None

# ==================== CREDENTIALING APPLICATIONS ====================

@professional_bp.route('/applications', methods=['GET', 'POST'])
@token_required
def credentialing_applications():
    """Get or create credentialing applications"""
    if request.method == 'GET':
        try:
            provider_id = request.args.get('provider_id', type=int)
            facility_id = request.args.get('facility_id', type=int)
            status = request.args.get('status')
            
            query = CredentialingApplication.query
            if provider_id:
                query = query.filter_by(provider_id=provider_id)
            if facility_id:
                query = query.filter_by(facility_id=facility_id)
            if status:
                query = query.filter_by(application_status=status)
            
            applications = query.all()
            return jsonify({
                'success': True,
                'applications': [app.to_dict() for app in applications]
            }), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    else:  # POST
        try:
            data = request.get_json()
            application = CredentialingApplication(
                application_id=f"APP-{uuid.uuid4().hex[:12].upper()}",
                provider_id=data['provider_id'],
                facility_id=data['facility_id'],
                application_type=data.get('application_type', 'initial'),
                form_data=json.dumps(data.get('form_data', {})),
                current_step=data.get('current_step', 'personal_info'),
                due_date=date.fromisoformat(data['due_date']) if data.get('due_date') else None
            )
            db.session.add(application)
            db.session.commit()
            
            create_audit_log('application', application.id, application.provider_id, 'created', 
                           f'Created {application.application_type} application')
            
            return jsonify({
                'success': True,
                'application': application.to_dict()
            }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

@professional_bp.route('/applications/<int:application_id>', methods=['GET', 'PUT'])
@token_required
def credentialing_application_detail(application_id):
    """Get or update credentialing application"""
    application = CredentialingApplication.query.get_or_404(application_id)
    
    if request.method == 'GET':
        return jsonify({
            'success': True,
            'application': application.to_dict()
        }), 200
    
    else:  # PUT
        try:
            data = request.get_json()
            old_status = application.application_status
            
            application.application_status = data.get('application_status', application.application_status)
            application.current_step = data.get('current_step', application.current_step)
            application.form_data = json.dumps(data.get('form_data', json.loads(application.form_data or '{}')))
            
            if data.get('submitted_at'):
                application.submitted_at = datetime.fromisoformat(data['submitted_at'])
            if data.get('reviewed_by'):
                application.reviewed_by = data['reviewed_by']
                application.review_started_at = datetime.utcnow()
            
            db.session.commit()
            
            create_audit_log('application', application.id, application.provider_id, 'updated',
                           f'Updated application status from {old_status} to {application.application_status}')
            
            return jsonify({
                'success': True,
                'application': application.to_dict()
            }), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

# ==================== PRIMARY SOURCE VERIFICATION ====================

@professional_bp.route('/psv/verify', methods=['POST'])
@token_required
@role_required(['admin', 'credential_verifier'])
def primary_source_verification():
    """Perform Primary Source Verification"""
    try:
        data = request.get_json()
        credential_id = data['credential_id']
        source = data['verification_source']  # state_board, npdb, dea, oig
        
        credential = ProfessionalCredential.query.get_or_404(credential_id)
        
        # Simulate PSV (in production, this would call actual APIs)
        psv = PrimarySourceVerification(
            psv_id=f"PSV-{uuid.uuid4().hex[:12].upper()}",
            credential_id=credential_id,
            provider_id=credential.provider_id,
            verification_source=source,
            verification_status='verified',  # Would be determined by API response
            verification_date=datetime.utcnow(),
            verification_result=json.dumps({'status': 'verified', 'match': True}),
            match_score=Decimal('95.0'),
            verified_by=request.current_user.id
        )
        
        db.session.add(psv)
        db.session.commit()
        
        create_audit_log('credential', credential_id, credential.provider_id, 'psv_verified',
                        f'PSV verification via {source}')
        
        return jsonify({
            'success': True,
            'psv': psv.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@professional_bp.route('/psv/<int:credential_id>', methods=['GET'])
@token_required
def get_psv_history(credential_id):
    """Get PSV history for a credential"""
    try:
        psvs = PrimarySourceVerification.query.filter_by(credential_id=credential_id).all()
        return jsonify({
            'success': True,
            'psv_history': [psv.to_dict() for psv in psvs]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== DOCUMENT MANAGEMENT ====================

@professional_bp.route('/documents', methods=['POST'])
@token_required
def upload_document():
    """Upload credential document with version control"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        credential_id = request.form.get('credential_id', type=int)
        document_type = request.form.get('document_type', 'license')
        
        # Save file
        upload_folder = 'uploads/credentials'
        os.makedirs(upload_folder, exist_ok=True)
        
        filename = f"{uuid.uuid4().hex}_{file.filename}"
        file_path = os.path.join(upload_folder, filename)
        file.save(file_path)
        
        # Calculate hash
        with open(file_path, 'rb') as f:
            file_hash = hashlib.sha256(f.read()).hexdigest()
        
        # Get credential
        credential = ProfessionalCredential.query.get_or_404(credential_id)
        
        # Mark old documents as not current
        CredentialDocument.query.filter_by(
            credential_id=credential_id,
            is_current=True
        ).update({'is_current': False})
        
        # Create new document
        doc = CredentialDocument(
            document_id=f"DOC-{uuid.uuid4().hex[:12].upper()}",
            credential_id=credential_id,
            provider_id=credential.provider_id,
            document_type=document_type,
            document_name=file.filename,
            file_path=file_path,
            file_size=os.path.getsize(file_path),
            mime_type=file.content_type,
            document_hash=file_hash,
            uploaded_by=request.current_user.id
        )
        
        db.session.add(doc)
        db.session.commit()
        
        create_audit_log('document', doc.id, credential.provider_id, 'uploaded',
                        f'Uploaded {document_type} document: {file.filename}')
        
        return jsonify({
            'success': True,
            'document': doc.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@professional_bp.route('/documents/<int:credential_id>', methods=['GET'])
@token_required
def get_documents(credential_id):
    """Get all documents for a credential"""
    try:
        documents = CredentialDocument.query.filter_by(credential_id=credential_id).all()
        return jsonify({
            'success': True,
            'documents': [doc.to_dict() for doc in documents]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== CLINICAL PRIVILEGES ====================

@professional_bp.route('/privileges/dictionary', methods=['GET', 'POST'])
@token_required
@role_required(['admin'])
def privilege_dictionary():
    """Get or create clinical privilege dictionary"""
    if request.method == 'GET':
        try:
            category = request.args.get('category')
            specialty = request.args.get('specialty')
            
            query = ClinicalPrivilege.query.filter_by(is_active=True)
            if category:
                query = query.filter_by(category=category)
            if specialty:
                query = query.filter_by(specialty=specialty)
            
            privileges = query.all()
            return jsonify({
                'success': True,
                'privileges': [p.to_dict() for p in privileges]
            }), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    else:  # POST
        try:
            data = request.get_json()
            privilege = ClinicalPrivilege(
                privilege_code=f"PRIV-{uuid.uuid4().hex[:12].upper()}",
                privilege_name=data['privilege_name'],
                description=data.get('description'),
                category=data.get('category', 'medical'),
                specialty=data.get('specialty'),
                required_board_certification=json.dumps(data.get('required_board_certification', [])),
                requires_proctoring=data.get('requires_proctoring', False),
                risk_level=data.get('risk_level', 'medium')
            )
            db.session.add(privilege)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'privilege': privilege.to_dict()
            }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

@professional_bp.route('/privileges/request', methods=['POST'])
@token_required
def request_privileges():
    """Request clinical privileges"""
    try:
        data = request.get_json()
        provider_id = data['provider_id']
        facility_id = data['facility_id']
        privilege_ids = data['privilege_ids']  # Array of privilege IDs
        
        requested_privileges = []
        for priv_id in privilege_ids:
            privilege = ProviderPrivilege(
                provider_id=provider_id,
                facility_id=facility_id,
                privilege_id=priv_id,
                status='requested',
                request_date=date.today()
            )
            db.session.add(privilege)
            requested_privileges.append(privilege)
        
        db.session.commit()
        
        create_audit_log('privilege', provider_id, provider_id, 'requested',
                        f'Requested {len(privilege_ids)} privileges')
        
        return jsonify({
            'success': True,
            'privileges': [p.to_dict() for p in requested_privileges]
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@professional_bp.route('/privileges/provider/<int:provider_id>', methods=['GET'])
@token_required
def get_provider_privileges(provider_id):
    """Get all privileges for a provider"""
    try:
        facility_id = request.args.get('facility_id', type=int)
        query = ProviderPrivilege.query.filter_by(provider_id=provider_id)
        if facility_id:
            query = query.filter_by(facility_id=facility_id)
        
        privileges = query.all()
        return jsonify({
            'success': True,
            'privileges': [p.to_dict() for p in privileges]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@professional_bp.route('/privileges/<int:privilege_id>/approve', methods=['POST'])
@token_required
@role_required(['admin', 'credential_verifier'])
def approve_privilege(privilege_id):
    """Approve a privilege request"""
    try:
        data = request.get_json()
        privilege = ProviderPrivilege.query.get_or_404(privilege_id)
        
        privilege.status = 'granted'
        privilege.granted_date = date.today()
        privilege.reviewed_by = request.current_user.id
        privilege.review_notes = data.get('notes')
        
        if privilege.requires_proctoring:
            privilege.proctoring_status = 'not_started'
        
        db.session.commit()
        
        create_audit_log('privilege', privilege_id, privilege.provider_id, 'approved',
                        'Privilege request approved')
        
        return jsonify({
            'success': True,
            'privilege': privilege.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ==================== CME TRACKING ====================

@professional_bp.route('/cme', methods=['GET', 'POST'])
@token_required
def cme_tracking():
    """Get or add CME activities"""
    if request.method == 'GET':
        try:
            provider_id = request.args.get('provider_id', type=int)
            year = request.args.get('year', type=int)
            
            query = CMETracking.query
            if provider_id:
                query = query.filter_by(provider_id=provider_id)
            if year:
                query = query.filter(CMETracking.activity_date >= date(year, 1, 1),
                                   CMETracking.activity_date <= date(year, 12, 31))
            
            cme_activities = query.all()
            
            # Calculate totals
            total_credits = sum(float(c.credits_earned) for c in cme_activities if c.credits_earned)
            
            return jsonify({
                'success': True,
                'activities': [c.to_dict() for c in cme_activities],
                'total_credits': total_credits
            }), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    else:  # POST
        try:
            data = request.get_json()
            cme = CMETracking(
                provider_id=data['provider_id'],
                activity_name=data['activity_name'],
                activity_type=data.get('activity_type'),
                provider_name=data.get('provider_name'),
                credits_earned=Decimal(str(data['credits_earned'])),
                credit_type=data.get('credit_type', 'AMA_PRA_Category1'),
                activity_date=date.fromisoformat(data['activity_date']),
                completion_date=date.fromisoformat(data['completion_date']) if data.get('completion_date') else None,
                certificate_url=data.get('certificate_url')
            )
            db.session.add(cme)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'cme': cme.to_dict()
            }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

# ==================== SANCTION/EXCLUSION MONITORING ====================

@professional_bp.route('/sanctions', methods=['GET', 'POST'])
@token_required
@role_required(['admin'])
def sanctions():
    """Get or add sanctions/exclusions"""
    if request.method == 'GET':
        try:
            provider_id = request.args.get('provider_id', type=int)
            is_active = request.args.get('is_active', type=bool)
            
            query = SanctionExclusion.query
            if provider_id:
                query = query.filter_by(provider_id=provider_id)
            if is_active is not None:
                query = query.filter_by(is_active=is_active)
            
            sanctions = query.all()
            return jsonify({
                'success': True,
                'sanctions': [s.to_dict() for s in sanctions]
            }), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    else:  # POST
        try:
            data = request.get_json()
            sanction = SanctionExclusion(
                sanction_id=f"SANCT-{uuid.uuid4().hex[:12].upper()}",
                provider_id=data['provider_id'],
                source=data['source'],
                sanction_type=data['sanction_type'],
                sanction_date=date.fromisoformat(data['sanction_date']),
                effective_date=date.fromisoformat(data['effective_date']) if data.get('effective_date') else None,
                reason=data.get('reason'),
                source_url=data.get('source_url')
            )
            db.session.add(sanction)
            db.session.commit()
            
            # Auto-suspend provider if active sanction
            if sanction.is_active:
                provider = Provider.query.get(sanction.provider_id)
                if provider:
                    provider.employment_status = 'suspended'
                    db.session.commit()
            
            create_audit_log('sanction', sanction.id, sanction.provider_id, 'detected',
                           f'Sanction detected: {sanction.sanction_type} from {sanction.source}')
            
            return jsonify({
                'success': True,
                'sanction': sanction.to_dict()
            }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

# ==================== RECREDENTIALING CYCLES ====================

@professional_bp.route('/recredentialing', methods=['GET', 'POST'])
@token_required
def recredentialing_cycles():
    """Get or create recredentialing cycles"""
    if request.method == 'GET':
        try:
            provider_id = request.args.get('provider_id', type=int)
            status = request.args.get('status')
            
            query = RecredentialingCycle.query
            if provider_id:
                query = query.filter_by(provider_id=provider_id)
            if status:
                query = query.filter_by(status=status)
            
            cycles = query.all()
            return jsonify({
                'success': True,
                'cycles': [c.to_dict() for c in cycles]
            }), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    else:  # POST
        try:
            data = request.get_json()
            cycle_type = data.get('cycle_type', 'reappointment_2yr')
            years = 2 if '2yr' in cycle_type else 3
            
            cycle = RecredentialingCycle(
                cycle_id=f"CYCLE-{uuid.uuid4().hex[:12].upper()}",
                provider_id=data['provider_id'],
                facility_id=data['facility_id'],
                cycle_type=cycle_type,
                cycle_start_date=date.today(),
                cycle_end_date=date.today() + timedelta(days=years * 365),
                next_recredentialing_date=date.today() + timedelta(days=years * 365)
            )
            db.session.add(cycle)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'cycle': cycle.to_dict()
            }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

# ==================== EXPIRATION TRACKING DASHBOARD ====================

@professional_bp.route('/dashboard/expirations', methods=['GET'])
@token_required
@role_required(['admin', 'credential_verifier'])
def expiration_dashboard():
    """Get expiration tracking dashboard data"""
    try:
        today = date.today()
        days_30 = today + timedelta(days=30)
        days_60 = today + timedelta(days=60)
        days_90 = today + timedelta(days=90)
        
        # Get expiring credentials
        expiring_30 = ProfessionalCredential.query.filter(
            ProfessionalCredential.expiry_date <= days_30,
            ProfessionalCredential.expiry_date >= today,
            ProfessionalCredential.status == 'verified'
        ).all()
        
        expiring_60 = ProfessionalCredential.query.filter(
            ProfessionalCredential.expiry_date <= days_60,
            ProfessionalCredential.expiry_date > days_30,
            ProfessionalCredential.status == 'verified'
        ).all()
        
        expiring_90 = ProfessionalCredential.query.filter(
            ProfessionalCredential.expiry_date <= days_90,
            ProfessionalCredential.expiry_date > days_60,
            ProfessionalCredential.status == 'verified'
        ).all()
        
        # Get expired
        expired = ProfessionalCredential.query.filter(
            ProfessionalCredential.expiry_date < today,
            ProfessionalCredential.status == 'verified'
        ).all()
        
        return jsonify({
            'success': True,
            'dashboard': {
                'expired': [c.to_dict() for c in expired],
                'expiring_30_days': [c.to_dict() for c in expiring_30],
                'expiring_60_days': [c.to_dict() for c in expiring_60],
                'expiring_90_days': [c.to_dict() for c in expiring_90],
                'counts': {
                    'expired': len(expired),
                    'expiring_30': len(expiring_30),
                    'expiring_60': len(expiring_60),
                    'expiring_90': len(expiring_90)
                }
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== AUDIT LOGS ====================

@professional_bp.route('/audit-logs', methods=['GET'])
@token_required
@role_required(['admin'])
def audit_logs():
    """Get audit trail logs"""
    try:
        entity_type = request.args.get('entity_type')
        provider_id = request.args.get('provider_id', type=int)
        limit = request.args.get('limit', type=int, default=100)
        
        query = CredentialingAuditLog.query
        if entity_type:
            query = query.filter_by(entity_type=entity_type)
        if provider_id:
            query = query.filter_by(provider_id=provider_id)
        
        logs = query.order_by(CredentialingAuditLog.timestamp.desc()).limit(limit).all()
        
        return jsonify({
            'success': True,
            'logs': [log.to_dict() for log in logs]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== TEMPLATES ====================

@professional_bp.route('/templates', methods=['GET', 'POST'])
@token_required
@role_required(['admin'])
def credentialing_templates():
    """Get or create credentialing templates"""
    if request.method == 'GET':
        try:
            template_type = request.args.get('template_type')
            facility_id = request.args.get('facility_id', type=int)
            
            query = CredentialingTemplate.query.filter_by(is_active=True)
            if template_type:
                query = query.filter_by(template_type=template_type)
            if facility_id:
                query = query.filter_by(facility_id=facility_id)
            
            templates = query.all()
            return jsonify({
                'success': True,
                'templates': [t.to_dict() for t in templates]
            }), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    else:  # POST
        try:
            data = request.get_json()
            template = CredentialingTemplate(
                template_id=f"TMPL-{uuid.uuid4().hex[:12].upper()}",
                template_name=data['template_name'],
                template_type=data['template_type'],
                facility_id=data.get('facility_id'),
                state=data.get('state'),
                form_structure=json.dumps(data.get('form_structure', {})),
                workflow_steps=json.dumps(data.get('workflow_steps', [])),
                based_on_standard=data.get('based_on_standard'),
                created_by=request.current_user.id
            )
            db.session.add(template)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'template': template.to_dict()
            }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

# ==================== REPORTS ====================

@professional_bp.route('/reports/turnaround-time', methods=['GET'])
@token_required
@role_required(['admin'])
def turnaround_time_report():
    """Generate turnaround time metrics report"""
    try:
        # Calculate average TAT for initial credentialing
        initial_apps = CredentialingApplication.query.filter_by(
            application_type='initial',
            application_status='approved'
        ).all()
        
        tat_data = []
        for app in initial_apps:
            if app.submitted_at and app.completed_at:
                tat_days = (app.completed_at - app.submitted_at).days
                tat_data.append(tat_days)
        
        avg_tat = sum(tat_data) / len(tat_data) if tat_data else 0
        
        return jsonify({
            'success': True,
            'report': {
                'average_tat_days': avg_tat,
                'total_completed': len(tat_data),
                'breakdown': {
                    '0-30_days': len([t for t in tat_data if t <= 30]),
                    '31-60_days': len([t for t in tat_data if 31 <= t <= 60]),
                    '61-90_days': len([t for t in tat_data if 61 <= t <= 90]),
                    'over_90_days': len([t for t in tat_data if t > 90])
                }
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@professional_bp.route('/reports/accreditation-readiness', methods=['GET'])
@token_required
@role_required(['admin'])
def accreditation_readiness():
    """Generate accreditation readiness checklist"""
    try:
        # Check various compliance metrics
        total_providers = Provider.query.count()
        credentialed_providers = Provider.query.join(ProfessionalCredential).distinct().count()
        expired_credentials = ProfessionalCredential.query.filter(
            ProfessionalCredential.expiry_date < date.today(),
            ProfessionalCredential.status == 'verified'
        ).count()
        active_sanctions = SanctionExclusion.query.filter_by(is_active=True).count()
        
        checklist = {
            'provider_credentialing_rate': (credentialed_providers / total_providers * 100) if total_providers > 0 else 0,
            'expired_credentials_count': expired_credentials,
            'active_sanctions_count': active_sanctions,
            'compliance_status': 'compliant' if expired_credentials == 0 and active_sanctions == 0 else 'non_compliant',
            'items': [
                {'item': 'All providers credentialed', 'status': 'pass' if credentialed_providers == total_providers else 'fail'},
                {'item': 'No expired credentials', 'status': 'pass' if expired_credentials == 0 else 'fail'},
                {'item': 'No active sanctions', 'status': 'pass' if active_sanctions == 0 else 'fail'},
                {'item': 'PSV completed for all credentials', 'status': 'pending'},  # Would need actual PSV check
            ]
        }
        
        return jsonify({
            'success': True,
            'checklist': checklist
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

