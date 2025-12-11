"""
Admin Dashboard API Routes
Root admin dashboard (Clinic+) and tenant organization admin dashboards
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.organization import Organization, OrganizationStatus, ApprovalLevel
from src.models.auth import UserAccount, Role, UserRole
from src.models.patient import Patient
from src.models.provider import Provider, Facility
from src.models.scheduling import Appointment
from src.models.billing import Claim, Payment
from src.models.prescribing import Prescription
from src.models.insurance import InsuranceSubscription
from src.models.rpm import RPMDevice
from datetime import datetime, date, timedelta
from sqlalchemy import func

admin_dashboard_bp = Blueprint('admin_dashboard', __name__)

# ==================== ROOT ADMIN DASHBOARD (Clinic+) ====================

@admin_dashboard_bp.route('/root/overview', methods=['GET'])
@token_required
@role_required(['system_administrator', 'admin'])
def root_admin_overview():
    """Root admin dashboard overview (Clinic+ platform)"""
    try:
        # Total Organizations
        total_organizations = Organization.query.count()
        active_organizations = Organization.query.filter_by(is_active=True).count()
        pending_approvals = Organization.query.filter_by(
            status=OrganizationStatus.PENDING_APPROVAL.value
        ).count()
        
        # Approval breakdown
        level_1_pending = Organization.query.filter_by(
            approval_level=ApprovalLevel.LEVEL_1.value,
            status=OrganizationStatus.PENDING_APPROVAL.value
        ).count()
        level_2_pending = Organization.query.filter_by(
            approval_level=ApprovalLevel.LEVEL_2.value,
            status=OrganizationStatus.PENDING_APPROVAL.value
        ).count()
        level_3_pending = Organization.query.filter_by(
            approval_level=ApprovalLevel.LEVEL_3.value,
            status=OrganizationStatus.PENDING_APPROVAL.value
        ).count()
        
        # Organization types
        org_types = db.session.query(
            Organization.organization_type,
            func.count(Organization.id).label('count')
        ).group_by(Organization.organization_type).all()
        
        # Subscription tiers
        subscription_tiers = db.session.query(
            Organization.subscription_tier,
            func.count(Organization.id).label('count')
        ).filter(Organization.is_active == True).group_by(Organization.subscription_tier).all()
        
        # Recent organizations
        recent_orgs = Organization.query.order_by(
            Organization.created_at.desc()
        ).limit(10).all()
        
        # Recent approvals
        recent_approvals = Organization.query.filter(
            Organization.approved_at.isnot(None)
        ).order_by(Organization.approved_at.desc()).limit(10).all()
        
        return jsonify({
            'success': True,
            'dashboard': {
                'summary': {
                    'total_organizations': total_organizations,
                    'active_organizations': active_organizations,
                    'pending_approvals': pending_approvals,
                    'rejected_organizations': Organization.query.filter_by(
                        status=OrganizationStatus.REJECTED.value
                    ).count()
                },
                'approval_breakdown': {
                    'level_1_pending': level_1_pending,
                    'level_2_pending': level_2_pending,
                    'level_3_pending': level_3_pending
                },
                'organization_types': {ot[0]: ot[1] for ot in org_types},
                'subscription_tiers': {st[0]: st[1] for st in subscription_tiers},
                'recent_organizations': [org.to_dict() for org in recent_orgs],
                'recent_approvals': [org.to_dict() for org in recent_approvals]
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_dashboard_bp.route('/root/organizations', methods=['GET'])
@token_required
@role_required(['system_administrator', 'admin'])
def root_admin_organizations():
    """Get all organizations for root admin"""
    try:
        status = request.args.get('status')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        query = Organization.query
        
        if status:
            query = query.filter(Organization.status == status)
        
        organizations = query.order_by(Organization.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'organizations': [org.to_dict() for org in organizations.items],
            'total': organizations.total,
            'pages': organizations.pages,
            'current_page': page
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_dashboard_bp.route('/root/statistics', methods=['GET'])
@token_required
@role_required(['system_administrator', 'admin'])
def root_admin_statistics():
    """Root admin statistics"""
    try:
        # Time ranges
        today = date.today()
        this_month_start = today.replace(day=1)
        last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)
        
        # Organizations created this month
        orgs_this_month = Organization.query.filter(
            func.date(Organization.created_at) >= this_month_start
        ).count()
        
        # Organizations approved this month
        orgs_approved_this_month = Organization.query.filter(
            func.date(Organization.approved_at) >= this_month_start,
            Organization.status == OrganizationStatus.APPROVED.value
        ).count()
        
        # Total users across all organizations
        total_users = UserAccount.query.count()
        
        # Total facilities
        total_facilities = Facility.query.count()
        
        return jsonify({
            'success': True,
            'statistics': {
                'organizations_created_this_month': orgs_this_month,
                'organizations_approved_this_month': orgs_approved_this_month,
                'total_users': total_users,
                'total_facilities': total_facilities,
                'active_organizations': Organization.query.filter_by(is_active=True).count(),
                'pending_approvals': Organization.query.filter_by(
                    status=OrganizationStatus.PENDING_APPROVAL.value
                ).count()
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== TENANT ORGANIZATION ADMIN DASHBOARD ====================

@admin_dashboard_bp.route('/tenant/<int:org_id>/overview', methods=['GET'])
@token_required
@role_required(['admin', 'facility_admin'])
def tenant_admin_overview(org_id):
    """Tenant organization admin dashboard overview"""
    try:
        organization = Organization.query.get_or_404(org_id)
        
        # Verify user has access to this organization
        user_facilities = request.token_payload.get('facilities', [])
        if org_id not in user_facilities and 'system_administrator' not in [r['role_name'] for r in request.token_payload.get('roles', [])]:
            return jsonify({'error': 'Access denied'}), 403
        
        # Get organization facilities
        facilities = Facility.query.filter_by(organization_id=org_id).all()
        facility_ids = [f.id for f in facilities]
        
        # Patients
        total_patients = Patient.query.filter(Patient.facility_id.in_(facility_ids)).count()
        patients_this_month = Patient.query.filter(
            Patient.facility_id.in_(facility_ids),
            func.date(Patient.created_at) >= date.today().replace(day=1)
        ).count()
        
        # Providers
        total_providers = Provider.query.join(Facility).filter(
            Facility.organization_id == org_id
        ).count()
        
        # Appointments
        total_appointments = Appointment.query.filter(
            Appointment.facility_id.in_(facility_ids)
        ).count()
        appointments_today = Appointment.query.filter(
            Appointment.facility_id.in_(facility_ids),
            Appointment.appointment_date == date.today()
        ).count()
        
        # Claims
        total_claims = Claim.query.filter(Claim.facility_id.in_(facility_ids)).count()
        claims_this_month = Claim.query.filter(
            Claim.facility_id.in_(facility_ids),
            func.date(Claim.created_at) >= date.today().replace(day=1)
        ).count()
        
        # Payments
        total_payments = Payment.query.filter(Payment.facility_id.in_(facility_ids)).count()
        payments_this_month = Payment.query.filter(
            Payment.facility_id.in_(facility_ids),
            func.date(Payment.payment_date) >= date.today().replace(day=1)
        ).all()
        revenue_this_month = sum(float(p.payment_amount) for p in payments_this_month)
        
        # Prescriptions
        total_prescriptions = Prescription.query.filter(
            Prescription.facility_id.in_(facility_ids)
        ).count()
        
        # Insurance subscriptions
        total_subscriptions = InsuranceSubscription.query.filter(
            InsuranceSubscription.facility_id.in_(facility_ids)
        ).count()
        
        # RPM devices
        total_rpm_devices = RPMDevice.query.filter(
            RPMDevice.facility_id.in_(facility_ids)
        ).count()
        
        return jsonify({
            'success': True,
            'dashboard': {
                'organization': organization.to_dict(),
                'summary': {
                    'facilities': len(facilities),
                    'total_patients': total_patients,
                    'patients_this_month': patients_this_month,
                    'total_providers': total_providers,
                    'total_appointments': total_appointments,
                    'appointments_today': appointments_today,
                    'total_claims': total_claims,
                    'claims_this_month': claims_this_month,
                    'total_payments': total_payments,
                    'revenue_this_month': revenue_this_month,
                    'total_prescriptions': total_prescriptions,
                    'total_subscriptions': total_subscriptions,
                    'total_rpm_devices': total_rpm_devices
                },
                'facilities': [f.to_dict() for f in facilities[:10]]  # Top 10
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_dashboard_bp.route('/tenant/<int:org_id>/statistics', methods=['GET'])
@token_required
@role_required(['admin', 'facility_admin'])
def tenant_admin_statistics(org_id):
    """Tenant organization statistics"""
    try:
        organization = Organization.query.get_or_404(org_id)
        
        facilities = Facility.query.filter_by(organization_id=org_id).all()
        facility_ids = [f.id for f in facilities]
        
        # Time ranges
        today = date.today()
        this_month_start = today.replace(day=1)
        last_month_start = (this_month_start - timedelta(days=1)).replace(day=1)
        
        # Monthly trends (using strftime for SQLite compatibility)
        monthly_patients = db.session.query(
            func.strftime('%Y-%m', Patient.created_at).label('month'),
            func.count(Patient.id).label('count')
        ).filter(
            Patient.facility_id.in_(facility_ids),
            Patient.created_at >= last_month_start
        ).group_by('month').all()
        
        monthly_revenue = db.session.query(
            func.strftime('%Y-%m', Payment.payment_date).label('month'),
            func.sum(Payment.payment_amount).label('total')
        ).filter(
            Payment.facility_id.in_(facility_ids),
            Payment.payment_date >= last_month_start
        ).group_by('month').all()
        
        return jsonify({
            'success': True,
            'statistics': {
                'monthly_patients': [
                    {'month': str(m[0]), 'count': m[1]} for m in monthly_patients
                ],
                'monthly_revenue': [
                    {'month': str(m[0]), 'total': float(m[1])} for m in monthly_revenue
                ],
                'facility_count': len(facilities),
                'active_facilities': len([f for f in facilities if f.is_active])
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@admin_dashboard_bp.route('/tenant/<int:org_id>/users', methods=['GET'])
@token_required
@role_required(['admin', 'facility_admin'])
def tenant_admin_users(org_id):
    """Get users for tenant organization"""
    try:
        organization = Organization.query.get_or_404(org_id)
        
        facilities = Facility.query.filter_by(organization_id=org_id).all()
        facility_ids = [f.id for f in facilities]
        
        # Get users associated with organization facilities
        user_roles = UserRole.query.join(Role).filter(
            UserRole.facility_id.in_(facility_ids)
        ).all()
        
        user_ids = list(set([ur.user_account_id for ur in user_roles]))
        users = UserAccount.query.filter(UserAccount.id.in_(user_ids)).all()
        
        return jsonify({
            'success': True,
            'users': [u.to_dict() for u in users],
            'total': len(users)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

