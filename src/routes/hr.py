"""
Human Resource Department API routes for Clinic+.
"""
from datetime import date, datetime
from decimal import Decimal
import uuid

from flask import Blueprint, jsonify, request

from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.hr import (
    HRDepartment,
    HRUnit,
    Position,
    Employee,
    AttendanceRecord,
    LeaveRequest,
    PayrollRecord,
    JobPosting,
    Applicant,
    PerformanceReview,
    TrainingRecord,
)


hr_bp = Blueprint('hr', __name__)
_tables_ready = False
ESS_ADMIN_USER_TYPES = {'admin', 'root_admin', 'system_administrator', 'finance', 'accountant', 'hr', 'human_resource'}


def _to_decimal(value, default='0.00'):
    try:
        return Decimal(str(value))
    except Exception:
        return Decimal(default)


def _days_between(start_date: date, end_date: date):
    return (end_date - start_date).days + 1


def _ensure_hr_tables():
    global _tables_ready
    if _tables_ready:
        return

    tables = [
        HRDepartment.__table__,
        HRUnit.__table__,
        Position.__table__,
        Employee.__table__,
        AttendanceRecord.__table__,
        LeaveRequest.__table__,
        PayrollRecord.__table__,
        JobPosting.__table__,
        Applicant.__table__,
        PerformanceReview.__table__,
        TrainingRecord.__table__,
    ]
    for table in tables:
        table.create(bind=db.engine, checkfirst=True)
    _tables_ready = True


def _normalized_user_type():
    return str(request.token_payload.get('user_type', '')).lower().replace(' ', '_')


def _ess_access_error():
    t = _normalized_user_type()
    if t in ESS_ADMIN_USER_TYPES:
        return jsonify({'success': False, 'error': 'ESS is intended for non-admin staff users'}), 403
    if t in {'patient'}:
        return jsonify({'success': False, 'error': 'Patient users should use the patient portal'}), 403
    return None


def _resolve_or_create_current_employee():
    account = getattr(request, 'current_user', None)
    if not account:
        return None
    email = (getattr(account, 'email', None) or '').strip().lower()
    employee = None
    if email:
        employee = Employee.query.filter(db.func.lower(Employee.email) == email).first()

    if employee:
        return employee

    # Auto-provision lightweight employee profile for staff users without HR linkage yet.
    username = (getattr(account, 'username', None) or 'staff_user').strip()
    name_parts = [p for p in username.replace('.', ' ').replace('_', ' ').split() if p]
    first_name = (name_parts[0] if name_parts else 'Staff').title()
    last_name = (' '.join(name_parts[1:]) if len(name_parts) > 1 else 'User').title()
    employee = Employee(
        employee_number=f"EMP-{uuid.uuid4().hex[:10].upper()}",
        first_name=first_name,
        last_name=last_name,
        email=getattr(account, 'email', None),
        phone=None,
        hire_date=date.today(),
        status='active',
        notes='Auto-provisioned from user account for ESS linkage.',
    )
    db.session.add(employee)
    db.session.commit()
    return employee


@hr_bp.before_request
def initialize_hr_module():
    _ensure_hr_tables()


@hr_bp.route('/dashboard', methods=['GET'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin', 'accountant'])
def get_hr_dashboard():
    """HR dashboard summary metrics."""
    try:
        today = date.today()
        employees = Employee.query.all()
        active_employees = [e for e in employees if e.status == 'active']
        open_positions = JobPosting.query.filter_by(status='open').count()
        applicants = Applicant.query.all()
        pending_leave = LeaveRequest.query.filter_by(status='pending').count()
        active_trainings = TrainingRecord.query.filter(TrainingRecord.completion_status.in_(['assigned', 'in_progress'])).count()
        monthly_payroll = PayrollRecord.query.filter(
            PayrollRecord.pay_period_start <= today,
            PayrollRecord.pay_period_end >= today.replace(day=1)
        ).all()
        payroll_total = sum(float(p.net_pay or 0) for p in monthly_payroll)
        avg_rating = db.session.query(db.func.avg(PerformanceReview.overall_rating)).scalar() or 0

        return jsonify({
            'success': True,
            'dashboard': {
                'total_employees': len(employees),
                'active_employees': len(active_employees),
                'open_job_postings': open_positions,
                'total_applicants': len(applicants),
                'pending_leave_requests': pending_leave,
                'active_training_assignments': active_trainings,
                'current_payroll_cost': payroll_total,
                'average_performance_rating': float(avg_rating),
            }
        }), 200
    except Exception as exc:
        return jsonify({'success': False, 'error': str(exc)}), 500


@hr_bp.route('/me/dashboard', methods=['GET'])
@token_required
def get_my_hr_dashboard():
    access_error = _ess_access_error()
    if access_error:
        return access_error
    try:
        employee = _resolve_or_create_current_employee()
        if not employee:
            return jsonify({'success': False, 'error': 'Employee profile not found'}), 404
        leave_rows = LeaveRequest.query.filter_by(employee_id=employee.id).all()
        payroll_rows = PayrollRecord.query.filter_by(employee_id=employee.id).all()
        training_rows = TrainingRecord.query.filter_by(employee_id=employee.id).all()
        review_rows = PerformanceReview.query.filter_by(employee_id=employee.id).all()
        return jsonify({
            'success': True,
            'dashboard': {
                'employee': employee.to_dict(),
                'leave_pending': sum(1 for r in leave_rows if (r.status or '').lower() == 'pending'),
                'leave_approved': sum(1 for r in leave_rows if (r.status or '').lower() == 'approved'),
                'payslips_total': len(payroll_rows),
                'pending_payslips': sum(1 for r in payroll_rows if (r.payment_status or '').lower() == 'pending'),
                'training_in_progress': sum(1 for r in training_rows if (r.completion_status or '').lower() in {'assigned', 'in_progress'}),
                'training_completed': sum(1 for r in training_rows if (r.completion_status or '').lower() == 'completed'),
                'reviews_count': len(review_rows),
            }
        }), 200
    except Exception as exc:
        return jsonify({'success': False, 'error': str(exc)}), 500


@hr_bp.route('/me/profile', methods=['GET'])
@token_required
def get_my_hr_profile():
    access_error = _ess_access_error()
    if access_error:
        return access_error
    try:
        employee = _resolve_or_create_current_employee()
        if not employee:
            return jsonify({'success': False, 'error': 'Employee profile not found'}), 404
        account = getattr(request, 'current_user', None)
        return jsonify({
            'success': True,
            'profile': {
                'user': {
                    'id': getattr(account, 'id', None),
                    'username': getattr(account, 'username', None),
                    'email': getattr(account, 'email', None),
                    'user_type': getattr(account, 'user_type', None),
                },
                'employee': employee.to_dict(),
            }
        }), 200
    except Exception as exc:
        return jsonify({'success': False, 'error': str(exc)}), 500


@hr_bp.route('/me/profile', methods=['PATCH'])
@token_required
def update_my_hr_profile():
    access_error = _ess_access_error()
    if access_error:
        return access_error
    try:
        data = request.get_json() or {}
        employee = _resolve_or_create_current_employee()
        if not employee:
            return jsonify({'success': False, 'error': 'Employee profile not found'}), 404
        for field in ['first_name', 'last_name', 'phone', 'address', 'emergency_contact_name', 'emergency_contact_phone', 'notes']:
            if field in data:
                setattr(employee, field, data.get(field))
        db.session.commit()
        return jsonify({'success': True, 'employee': employee.to_dict()}), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500


@hr_bp.route('/me/leave', methods=['GET'])
@token_required
def list_my_leave_requests():
    access_error = _ess_access_error()
    if access_error:
        return access_error
    try:
        employee = _resolve_or_create_current_employee()
        if not employee:
            return jsonify({'success': False, 'error': 'Employee profile not found'}), 404
        rows = LeaveRequest.query.filter_by(employee_id=employee.id).order_by(LeaveRequest.created_at.desc()).all()
        return jsonify({'success': True, 'leave_requests': [row.to_dict() for row in rows]}), 200
    except Exception as exc:
        return jsonify({'success': False, 'error': str(exc)}), 500


@hr_bp.route('/me/leave-requests', methods=['POST'])
@token_required
def create_my_leave_request():
    access_error = _ess_access_error()
    if access_error:
        return access_error
    try:
        data = request.get_json() or {}
        leave_type = (data.get('leave_type') or '').strip().lower()
        if not leave_type or not data.get('start_date') or not data.get('end_date'):
            return jsonify({'success': False, 'error': 'leave_type, start_date and end_date are required'}), 400
        employee = _resolve_or_create_current_employee()
        if not employee:
            return jsonify({'success': False, 'error': 'Employee profile not found'}), 404
        start_date = date.fromisoformat(data['start_date'])
        end_date = date.fromisoformat(data['end_date'])
        row = LeaveRequest(
            request_number=f"LR-{uuid.uuid4().hex[:10].upper()}",
            employee_id=employee.id,
            leave_type=leave_type,
            start_date=start_date,
            end_date=end_date,
            days_requested=_days_between(start_date, end_date),
            reason=data.get('reason'),
            status='pending',
        )
        db.session.add(row)
        db.session.commit()
        return jsonify({'success': True, 'leave_request': row.to_dict()}), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500


@hr_bp.route('/me/payslips', methods=['GET'])
@token_required
def list_my_payslips():
    access_error = _ess_access_error()
    if access_error:
        return access_error
    try:
        employee = _resolve_or_create_current_employee()
        if not employee:
            return jsonify({'success': False, 'error': 'Employee profile not found'}), 404
        rows = PayrollRecord.query.filter_by(employee_id=employee.id).order_by(PayrollRecord.pay_period_end.desc()).all()
        return jsonify({'success': True, 'payslips': [row.to_dict() for row in rows]}), 200
    except Exception as exc:
        return jsonify({'success': False, 'error': str(exc)}), 500


@hr_bp.route('/me/training', methods=['GET'])
@token_required
def list_my_training():
    access_error = _ess_access_error()
    if access_error:
        return access_error
    try:
        employee = _resolve_or_create_current_employee()
        if not employee:
            return jsonify({'success': False, 'error': 'Employee profile not found'}), 404
        rows = TrainingRecord.query.filter_by(employee_id=employee.id).order_by(TrainingRecord.created_at.desc()).all()
        return jsonify({'success': True, 'training_records': [row.to_dict() for row in rows]}), 200
    except Exception as exc:
        return jsonify({'success': False, 'error': str(exc)}), 500


@hr_bp.route('/me/performance-reviews', methods=['GET'])
@token_required
def list_my_performance_reviews():
    access_error = _ess_access_error()
    if access_error:
        return access_error
    try:
        employee = _resolve_or_create_current_employee()
        if not employee:
            return jsonify({'success': False, 'error': 'Employee profile not found'}), 404
        rows = PerformanceReview.query.filter_by(employee_id=employee.id).order_by(PerformanceReview.created_at.desc()).all()
        return jsonify({'success': True, 'reviews': [row.to_dict() for row in rows]}), 200
    except Exception as exc:
        return jsonify({'success': False, 'error': str(exc)}), 500


@hr_bp.route('/me/notifications', methods=['GET'])
@token_required
def list_my_notifications():
    access_error = _ess_access_error()
    if access_error:
        return access_error
    try:
        employee = _resolve_or_create_current_employee()
        if not employee:
            return jsonify({'success': False, 'error': 'Employee profile not found'}), 404

        limit = min(max(int(request.args.get('limit', 25)), 1), 100)
        notifications = []

        leave_rows = LeaveRequest.query.filter_by(employee_id=employee.id).all()
        for row in leave_rows:
            status = (row.status or '').lower()
            if status not in {'approved', 'rejected'}:
                continue
            verb = 'approved' if status == 'approved' else 'rejected'
            notifications.append({
                'id': f'leave-{row.id}-{status}',
                'type': 'leave',
                'title': f'Leave {verb}',
                'message': f'{(row.leave_type or "leave").title()} request {row.request_number} was {verb}.',
                'status': status,
                'reference_id': row.id,
                'reference_number': row.request_number,
                'occurred_at': (row.approved_at or row.created_at).isoformat() if (row.approved_at or row.created_at) else None,
            })

        payroll_rows = PayrollRecord.query.filter_by(employee_id=employee.id).all()
        for row in payroll_rows:
            status = (row.payment_status or '').lower()
            if status == 'paid':
                title = 'Payslip paid'
                message = f'Payroll {row.payroll_number} has been paid.'
            else:
                title = 'New payslip posted'
                message = f'Payroll {row.payroll_number} is now available in your ESS portal.'
            notifications.append({
                'id': f'payroll-{row.id}-{status or "pending"}',
                'type': 'payslip',
                'title': title,
                'message': message,
                'status': status or 'pending',
                'reference_id': row.id,
                'reference_number': row.payroll_number,
                'occurred_at': (
                    datetime.combine(row.payment_date, datetime.min.time())
                    if row.payment_date else row.created_at
                ).isoformat() if (row.payment_date or row.created_at) else None,
            })

        training_rows = TrainingRecord.query.filter_by(employee_id=employee.id).all()
        for row in training_rows:
            status = (row.completion_status or '').lower()
            if status == 'completed':
                title = 'Training completed'
            elif status == 'in_progress':
                title = 'Training in progress'
            else:
                title = 'Training assigned'
            notifications.append({
                'id': f'training-{row.id}-{status or "assigned"}',
                'type': 'training',
                'title': title,
                'message': f'{row.course_name} ({row.training_number}) status: {status or "assigned"}.',
                'status': status or 'assigned',
                'reference_id': row.id,
                'reference_number': row.training_number,
                'occurred_at': row.created_at.isoformat() if row.created_at else None,
            })

        review_rows = PerformanceReview.query.filter_by(employee_id=employee.id).all()
        for row in review_rows:
            status = (row.status or '').lower()
            if status not in {'submitted', 'acknowledged'}:
                continue
            notifications.append({
                'id': f'review-{row.id}-{status}',
                'type': 'review',
                'title': 'Performance review update',
                'message': f'Review {row.review_number} status changed to {status}.',
                'status': status,
                'reference_id': row.id,
                'reference_number': row.review_number,
                'occurred_at': row.created_at.isoformat() if row.created_at else None,
            })

        notifications.sort(key=lambda item: item.get('occurred_at') or '', reverse=True)
        return jsonify({'success': True, 'notifications': notifications[:limit]}), 200
    except Exception as exc:
        return jsonify({'success': False, 'error': str(exc)}), 500


@hr_bp.route('/analytics', methods=['GET'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin', 'accountant', 'finance'])
def get_hr_analytics():
    """Aggregated HR analytics for infographic dashboards."""
    try:
        departments = HRDepartment.query.order_by(HRDepartment.name.asc()).all()
        employees = Employee.query.all()
        attendance_rows = AttendanceRecord.query.all()
        leave_rows = LeaveRequest.query.all()
        applicant_rows = Applicant.query.all()
        payroll_rows = PayrollRecord.query.all()
        training_rows = TrainingRecord.query.all()

        dept_headcount = []
        for dept in departments:
            dept_headcount.append({
                'name': dept.name,
                'value': sum(1 for e in employees if e.department_id == dept.id and e.status == 'active')
            })

        attendance_status = {}
        for row in attendance_rows:
            key = (row.status or 'unknown').lower()
            attendance_status[key] = attendance_status.get(key, 0) + 1

        leave_status = {}
        for row in leave_rows:
            key = (row.status or 'unknown').lower()
            leave_status[key] = leave_status.get(key, 0) + 1

        applicant_stage = {}
        for row in applicant_rows:
            key = (row.stage or 'applied').lower()
            applicant_stage[key] = applicant_stage.get(key, 0) + 1

        training_status = {}
        for row in training_rows:
            key = (row.completion_status or 'assigned').lower()
            training_status[key] = training_status.get(key, 0) + 1

        payroll_status = {}
        payroll_total = Decimal('0.00')
        for row in payroll_rows:
            key = (row.payment_status or 'pending').lower()
            payroll_status[key] = payroll_status.get(key, 0) + 1
            payroll_total += row.net_pay or Decimal('0.00')

        compliance = {
            'attendance_coverage_pct': round(
                (len([r for r in attendance_rows if (r.status or '').lower() in {'present', 'late', 'remote'}]) / len(attendance_rows) * 100), 2
            ) if attendance_rows else 100.0,
            'mandatory_training_completion_pct': round(
                (len([r for r in training_rows if (r.completion_status or '').lower() == 'completed']) / len(training_rows) * 100), 2
            ) if training_rows else 100.0,
            'pending_leave_approvals': leave_status.get('pending', 0),
            'pending_payroll_disbursements': payroll_status.get('pending', 0),
        }

        return jsonify({
            'success': True,
            'analytics': {
                'department_headcount': dept_headcount,
                'attendance_status': attendance_status,
                'leave_status': leave_status,
                'applicant_stage': applicant_stage,
                'training_status': training_status,
                'payroll_status': payroll_status,
                'payroll_total': float(payroll_total),
                'compliance': compliance,
            }
        }), 200
    except Exception as exc:
        return jsonify({'success': False, 'error': str(exc)}), 500


@hr_bp.route('/leave-balances', methods=['GET'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin', 'accountant', 'finance'])
def get_leave_balances():
    """Simple leave balance tracker based on approved leave usage."""
    try:
        annual_entitlement = Decimal(str(request.args.get('annual_entitlement', 21)))
        sick_entitlement = Decimal(str(request.args.get('sick_entitlement', 10)))
        employees = Employee.query.order_by(Employee.first_name.asc()).all()
        leave_rows = LeaveRequest.query.filter_by(status='approved').all()

        balances = []
        for employee in employees:
            annual_used = Decimal('0.00')
            sick_used = Decimal('0.00')
            for row in leave_rows:
                if row.employee_id != employee.id:
                    continue
                days = Decimal(str(row.days_requested or 0))
                leave_type = (row.leave_type or '').lower()
                if leave_type == 'annual':
                    annual_used += days
                elif leave_type == 'sick':
                    sick_used += days
            balances.append({
                'employee_id': employee.id,
                'employee_name': f'{employee.first_name} {employee.last_name}',
                'annual_entitlement': float(annual_entitlement),
                'annual_used': float(annual_used),
                'annual_remaining': float(max(Decimal('0.00'), annual_entitlement - annual_used)),
                'sick_entitlement': float(sick_entitlement),
                'sick_used': float(sick_used),
                'sick_remaining': float(max(Decimal('0.00'), sick_entitlement - sick_used)),
            })

        return jsonify({'success': True, 'leave_balances': balances}), 200
    except Exception as exc:
        return jsonify({'success': False, 'error': str(exc)}), 500


# Departments
@hr_bp.route('/departments', methods=['GET'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin'])
def list_departments():
    departments = HRDepartment.query.order_by(HRDepartment.name.asc()).all()
    return jsonify({'success': True, 'departments': [d.to_dict() for d in departments]}), 200


@hr_bp.route('/departments', methods=['POST'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin'])
def create_department():
    try:
        data = request.get_json() or {}
        code = (data.get('code') or '').strip().upper()
        name = (data.get('name') or '').strip()
        if not code or not name:
            return jsonify({'success': False, 'error': 'code and name are required'}), 400
        if HRDepartment.query.filter_by(code=code).first():
            return jsonify({'success': False, 'error': 'Department code already exists'}), 400

        dept = HRDepartment(code=code, name=name, description=data.get('description'), is_active=bool(data.get('is_active', True)))
        db.session.add(dept)
        db.session.commit()
        return jsonify({'success': True, 'department': dept.to_dict()}), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500


# Units
@hr_bp.route('/units', methods=['GET'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin'])
def list_units():
    department_id = request.args.get('department_id', type=int)
    query = HRUnit.query
    if department_id:
        query = query.filter(HRUnit.department_id == department_id)
    units = query.order_by(HRUnit.name.asc()).all()
    return jsonify({'success': True, 'units': [u.to_dict() for u in units]}), 200


@hr_bp.route('/units', methods=['POST'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin'])
def create_unit():
    try:
        data = request.get_json() or {}
        code = (data.get('code') or '').strip().upper()
        name = (data.get('name') or '').strip()
        department_id = data.get('department_id')
        if not code or not name or not department_id:
            return jsonify({'success': False, 'error': 'code, name and department_id are required'}), 400
        if HRUnit.query.filter_by(code=code).first():
            return jsonify({'success': False, 'error': 'Unit code already exists'}), 400
        department = HRDepartment.query.get(department_id)
        if not department:
            return jsonify({'success': False, 'error': 'Invalid department_id'}), 400

        unit = HRUnit(
            code=code,
            name=name,
            department_id=department_id,
            description=data.get('description'),
            is_active=bool(data.get('is_active', True))
        )
        db.session.add(unit)
        db.session.commit()
        return jsonify({'success': True, 'unit': unit.to_dict()}), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500


# Positions
@hr_bp.route('/positions', methods=['GET'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin'])
def list_positions():
    positions = Position.query.order_by(Position.title.asc()).all()
    return jsonify({'success': True, 'positions': [p.to_dict() for p in positions]}), 200


@hr_bp.route('/positions', methods=['POST'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin'])
def create_position():
    try:
        data = request.get_json() or {}
        code = (data.get('code') or '').strip().upper()
        title = (data.get('title') or '').strip()
        if not code or not title:
            return jsonify({'success': False, 'error': 'code and title are required'}), 400
        if Position.query.filter_by(code=code).first():
            return jsonify({'success': False, 'error': 'Position code already exists'}), 400

        position = Position(
            code=code,
            title=title,
            department_id=data.get('department_id'),
            unit_id=data.get('unit_id'),
            employment_type=data.get('employment_type', 'full_time'),
            grade=data.get('grade'),
            min_salary=_to_decimal(data.get('min_salary', 0)),
            max_salary=_to_decimal(data.get('max_salary', 0)),
            is_active=bool(data.get('is_active', True)),
        )
        db.session.add(position)
        db.session.commit()
        return jsonify({'success': True, 'position': position.to_dict()}), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500


# Employees
@hr_bp.route('/employees', methods=['GET'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin'])
def list_employees():
    status = request.args.get('status')
    query = Employee.query
    if status:
        query = query.filter(Employee.status == status)
    employees = query.order_by(Employee.created_at.desc()).all()
    return jsonify({'success': True, 'employees': [e.to_dict() for e in employees]}), 200


@hr_bp.route('/employees', methods=['POST'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin'])
def create_employee():
    try:
        data = request.get_json() or {}
        first_name = (data.get('first_name') or '').strip()
        last_name = (data.get('last_name') or '').strip()
        if not first_name or not last_name:
            return jsonify({'success': False, 'error': 'first_name and last_name are required'}), 400

        employee = Employee(
            employee_number=f"EMP-{uuid.uuid4().hex[:10].upper()}",
            first_name=first_name,
            last_name=last_name,
            email=data.get('email'),
            phone=data.get('phone'),
            date_of_birth=date.fromisoformat(data['date_of_birth']) if data.get('date_of_birth') else None,
            hire_date=date.fromisoformat(data.get('hire_date', date.today().isoformat())),
            status=data.get('status', 'active'),
            department_id=data.get('department_id'),
            unit_id=data.get('unit_id'),
            position_id=data.get('position_id'),
            manager_employee_id=data.get('manager_employee_id'),
            base_salary=_to_decimal(data.get('base_salary', 0)),
            emergency_contact_name=data.get('emergency_contact_name'),
            emergency_contact_phone=data.get('emergency_contact_phone'),
            address=data.get('address'),
            notes=data.get('notes'),
        )
        db.session.add(employee)
        db.session.commit()
        return jsonify({'success': True, 'employee': employee.to_dict()}), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500


# Attendance
@hr_bp.route('/attendance', methods=['GET'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin'])
def list_attendance():
    employee_id = request.args.get('employee_id', type=int)
    query = AttendanceRecord.query
    if employee_id:
        query = query.filter(AttendanceRecord.employee_id == employee_id)
    records = query.order_by(AttendanceRecord.attendance_date.desc()).all()
    return jsonify({'success': True, 'records': [r.to_dict() for r in records]}), 200


@hr_bp.route('/attendance/check-in', methods=['POST'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin'])
def check_in_employee():
    try:
        data = request.get_json() or {}
        employee_id = data.get('employee_id')
        if not employee_id:
            return jsonify({'success': False, 'error': 'employee_id is required'}), 400

        attendance_date = date.fromisoformat(data.get('attendance_date', date.today().isoformat()))
        record = AttendanceRecord.query.filter_by(employee_id=employee_id, attendance_date=attendance_date).first()
        if not record:
            record = AttendanceRecord(
                employee_id=employee_id,
                attendance_date=attendance_date,
                status=data.get('status', 'present'),
                check_in_time=datetime.utcnow(),
                notes=data.get('notes')
            )
            db.session.add(record)
        else:
            record.check_in_time = datetime.utcnow()
            if data.get('status'):
                record.status = data.get('status')
            if data.get('notes'):
                record.notes = data.get('notes')

        db.session.commit()
        return jsonify({'success': True, 'record': record.to_dict()}), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500


@hr_bp.route('/attendance/check-out', methods=['POST'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin'])
def check_out_employee():
    try:
        data = request.get_json() or {}
        employee_id = data.get('employee_id')
        if not employee_id:
            return jsonify({'success': False, 'error': 'employee_id is required'}), 400

        attendance_date = date.fromisoformat(data.get('attendance_date', date.today().isoformat()))
        record = AttendanceRecord.query.filter_by(employee_id=employee_id, attendance_date=attendance_date).first()
        if not record:
            return jsonify({'success': False, 'error': 'No check-in record found'}), 404

        record.check_out_time = datetime.utcnow()
        if record.check_in_time:
            delta = record.check_out_time - record.check_in_time
            record.work_hours = _to_decimal(round(delta.total_seconds() / 3600, 2))
        db.session.commit()
        return jsonify({'success': True, 'record': record.to_dict()}), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500


# Leave management
@hr_bp.route('/leave-requests', methods=['GET'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin'])
def list_leave_requests():
    status = request.args.get('status')
    query = LeaveRequest.query
    if status:
        query = query.filter(LeaveRequest.status == status)
    requests_list = query.order_by(LeaveRequest.created_at.desc()).all()
    return jsonify({'success': True, 'leave_requests': [req.to_dict() for req in requests_list]}), 200


@hr_bp.route('/leave-requests', methods=['POST'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin'])
def create_leave_request():
    try:
        data = request.get_json() or {}
        employee_id = data.get('employee_id')
        leave_type = data.get('leave_type')
        if not employee_id or not leave_type or not data.get('start_date') or not data.get('end_date'):
            return jsonify({'success': False, 'error': 'employee_id, leave_type, start_date, end_date are required'}), 400

        start_date = date.fromisoformat(data['start_date'])
        end_date = date.fromisoformat(data['end_date'])
        req = LeaveRequest(
            request_number=f"LR-{uuid.uuid4().hex[:10].upper()}",
            employee_id=employee_id,
            leave_type=leave_type,
            start_date=start_date,
            end_date=end_date,
            days_requested=_days_between(start_date, end_date),
            reason=data.get('reason'),
            status='pending',
        )
        db.session.add(req)
        db.session.commit()
        return jsonify({'success': True, 'leave_request': req.to_dict()}), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500


@hr_bp.route('/leave-requests/<int:request_id>/approve', methods=['POST'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin'])
def approve_leave_request(request_id):
    try:
        req = LeaveRequest.query.get_or_404(request_id)
        req.status = 'approved'
        req.approved_by = getattr(request.current_user, 'id', None)
        req.approved_at = datetime.utcnow()
        req.rejection_reason = None
        db.session.commit()
        return jsonify({'success': True, 'leave_request': req.to_dict()}), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500


@hr_bp.route('/leave-requests/<int:request_id>/reject', methods=['POST'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin'])
def reject_leave_request(request_id):
    try:
        req = LeaveRequest.query.get_or_404(request_id)
        data = request.get_json() or {}
        req.status = 'rejected'
        req.approved_by = getattr(request.current_user, 'id', None)
        req.approved_at = datetime.utcnow()
        req.rejection_reason = data.get('rejection_reason')
        db.session.commit()
        return jsonify({'success': True, 'leave_request': req.to_dict()}), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500


# Payroll
@hr_bp.route('/payroll', methods=['GET'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin', 'finance', 'accountant'])
def list_payroll():
    records = PayrollRecord.query.order_by(PayrollRecord.pay_period_end.desc()).all()
    return jsonify({'success': True, 'payroll': [p.to_dict() for p in records]}), 200


@hr_bp.route('/payroll', methods=['POST'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin', 'finance', 'accountant'])
def create_payroll_record():
    try:
        data = request.get_json() or {}
        employee_id = data.get('employee_id')
        if not employee_id or not data.get('pay_period_start') or not data.get('pay_period_end'):
            return jsonify({'success': False, 'error': 'employee_id, pay_period_start, pay_period_end are required'}), 400

        basic = _to_decimal(data.get('basic_pay', 0))
        overtime = _to_decimal(data.get('overtime_pay', 0))
        bonus = _to_decimal(data.get('bonus', 0))
        deductions = _to_decimal(data.get('deductions', 0))
        tax = _to_decimal(data.get('tax', 0))
        net = basic + overtime + bonus - deductions - tax

        record = PayrollRecord(
            payroll_number=f"PR-{uuid.uuid4().hex[:10].upper()}",
            employee_id=employee_id,
            pay_period_start=date.fromisoformat(data['pay_period_start']),
            pay_period_end=date.fromisoformat(data['pay_period_end']),
            basic_pay=basic,
            overtime_pay=overtime,
            bonus=bonus,
            deductions=deductions,
            tax=tax,
            net_pay=net,
            payment_status=data.get('payment_status', 'pending'),
            payment_date=date.fromisoformat(data['payment_date']) if data.get('payment_date') else None,
        )
        db.session.add(record)
        db.session.commit()
        return jsonify({'success': True, 'payroll_record': record.to_dict()}), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500


@hr_bp.route('/payroll/<int:payroll_id>/mark-paid', methods=['PATCH'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin', 'finance', 'accountant'])
def mark_payroll_paid(payroll_id):
    try:
        row = PayrollRecord.query.get_or_404(payroll_id)
        row.payment_status = 'paid'
        row.payment_date = date.today()
        db.session.commit()
        return jsonify({'success': True, 'payroll_record': row.to_dict()}), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500


# Recruitment
@hr_bp.route('/job-postings', methods=['GET'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin'])
def list_job_postings():
    postings = JobPosting.query.order_by(JobPosting.created_at.desc()).all()
    return jsonify({'success': True, 'job_postings': [p.to_dict() for p in postings]}), 200


@hr_bp.route('/job-postings', methods=['POST'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin'])
def create_job_posting():
    try:
        data = request.get_json() or {}
        title = (data.get('title') or '').strip()
        if not title:
            return jsonify({'success': False, 'error': 'title is required'}), 400

        posting = JobPosting(
            posting_number=f"JOB-{uuid.uuid4().hex[:10].upper()}",
            title=title,
            department_id=data.get('department_id'),
            position_id=data.get('position_id'),
            employment_type=data.get('employment_type', 'full_time'),
            location=data.get('location'),
            status=data.get('status', 'open'),
            openings_count=int(data.get('openings_count', 1)),
            description=data.get('description'),
            requirements=data.get('requirements'),
            posted_date=date.fromisoformat(data.get('posted_date', date.today().isoformat())),
            closing_date=date.fromisoformat(data['closing_date']) if data.get('closing_date') else None,
        )
        db.session.add(posting)
        db.session.commit()
        return jsonify({'success': True, 'job_posting': posting.to_dict()}), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500


@hr_bp.route('/applicants', methods=['GET'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin'])
def list_applicants():
    stage = request.args.get('stage')
    query = Applicant.query
    if stage:
        query = query.filter(Applicant.stage == stage)
    applicants = query.order_by(Applicant.applied_at.desc()).all()
    return jsonify({'success': True, 'applicants': [a.to_dict() for a in applicants]}), 200


@hr_bp.route('/applicants', methods=['POST'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin'])
def create_applicant():
    try:
        data = request.get_json() or {}
        if not data.get('job_posting_id') or not data.get('first_name') or not data.get('last_name') or not data.get('email'):
            return jsonify({'success': False, 'error': 'job_posting_id, first_name, last_name, email are required'}), 400

        applicant = Applicant(
            applicant_number=f"APP-{uuid.uuid4().hex[:10].upper()}",
            job_posting_id=data['job_posting_id'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            email=data['email'],
            phone=data.get('phone'),
            stage=data.get('stage', 'applied'),
            score=_to_decimal(data.get('score', 0)),
            source=data.get('source'),
            resume_link=data.get('resume_link'),
            notes=data.get('notes'),
        )
        db.session.add(applicant)
        db.session.commit()
        return jsonify({'success': True, 'applicant': applicant.to_dict()}), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500


@hr_bp.route('/applicants/<int:applicant_id>/stage', methods=['PATCH'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin'])
def update_applicant_stage(applicant_id):
    try:
        data = request.get_json() or {}
        stage = (data.get('stage') or '').strip().lower()
        if not stage:
            return jsonify({'success': False, 'error': 'stage is required'}), 400
        valid_stages = {'applied', 'screened', 'interview', 'offer', 'hired', 'rejected'}
        if stage not in valid_stages:
            return jsonify({'success': False, 'error': f'invalid stage. allowed: {", ".join(sorted(valid_stages))}'}), 400
        row = Applicant.query.get_or_404(applicant_id)
        row.stage = stage
        if 'score' in data:
            row.score = _to_decimal(data.get('score', 0))
        if 'notes' in data:
            row.notes = data.get('notes')
        db.session.commit()
        return jsonify({'success': True, 'applicant': row.to_dict()}), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500


# Performance
@hr_bp.route('/performance-reviews', methods=['GET'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin'])
def list_performance_reviews():
    reviews = PerformanceReview.query.order_by(PerformanceReview.created_at.desc()).all()
    return jsonify({'success': True, 'reviews': [r.to_dict() for r in reviews]}), 200


@hr_bp.route('/performance-reviews', methods=['POST'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin'])
def create_performance_review():
    try:
        data = request.get_json() or {}
        if not data.get('employee_id') or not data.get('review_period_start') or not data.get('review_period_end'):
            return jsonify({'success': False, 'error': 'employee_id, review_period_start, review_period_end are required'}), 400

        review = PerformanceReview(
            review_number=f"REV-{uuid.uuid4().hex[:10].upper()}",
            employee_id=data['employee_id'],
            reviewer_employee_id=data.get('reviewer_employee_id'),
            review_period_start=date.fromisoformat(data['review_period_start']),
            review_period_end=date.fromisoformat(data['review_period_end']),
            overall_rating=_to_decimal(data.get('overall_rating', 0)),
            strengths=data.get('strengths'),
            improvement_areas=data.get('improvement_areas'),
            goals=data.get('goals'),
            status=data.get('status', 'draft'),
        )
        db.session.add(review)
        db.session.commit()
        return jsonify({'success': True, 'review': review.to_dict()}), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500


@hr_bp.route('/performance-reviews/<int:review_id>/status', methods=['PATCH'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin'])
def update_performance_review_status(review_id):
    try:
        data = request.get_json() or {}
        status = (data.get('status') or '').strip().lower()
        if status not in {'draft', 'submitted', 'acknowledged'}:
            return jsonify({'success': False, 'error': 'status must be draft, submitted, or acknowledged'}), 400
        row = PerformanceReview.query.get_or_404(review_id)
        row.status = status
        if 'overall_rating' in data:
            row.overall_rating = _to_decimal(data.get('overall_rating', row.overall_rating or 0))
        db.session.commit()
        return jsonify({'success': True, 'review': row.to_dict()}), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500


# Training
@hr_bp.route('/training', methods=['GET'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin'])
def list_training_records():
    records = TrainingRecord.query.order_by(TrainingRecord.created_at.desc()).all()
    return jsonify({'success': True, 'training_records': [r.to_dict() for r in records]}), 200


@hr_bp.route('/training', methods=['POST'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin'])
def create_training_record():
    try:
        data = request.get_json() or {}
        if not data.get('employee_id') or not data.get('course_name'):
            return jsonify({'success': False, 'error': 'employee_id and course_name are required'}), 400

        record = TrainingRecord(
            training_number=f"TRN-{uuid.uuid4().hex[:10].upper()}",
            employee_id=data['employee_id'],
            course_name=data['course_name'],
            provider_name=data.get('provider_name'),
            start_date=date.fromisoformat(data['start_date']) if data.get('start_date') else None,
            end_date=date.fromisoformat(data['end_date']) if data.get('end_date') else None,
            completion_status=data.get('completion_status', 'assigned'),
            score=_to_decimal(data.get('score', 0)),
            certificate_link=data.get('certificate_link'),
            notes=data.get('notes'),
        )
        db.session.add(record)
        db.session.commit()
        return jsonify({'success': True, 'training_record': record.to_dict()}), 201
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500


@hr_bp.route('/training/<int:training_id>/status', methods=['PATCH'])
@token_required
@role_required(['admin', 'hr', 'human_resource', 'root_admin'])
def update_training_status(training_id):
    try:
        data = request.get_json() or {}
        status = (data.get('completion_status') or '').strip().lower()
        if status not in {'assigned', 'in_progress', 'completed', 'failed'}:
            return jsonify({'success': False, 'error': 'completion_status must be assigned, in_progress, completed, or failed'}), 400
        row = TrainingRecord.query.get_or_404(training_id)
        row.completion_status = status
        if 'score' in data:
            row.score = _to_decimal(data.get('score', row.score or 0))
        if 'certificate_link' in data:
            row.certificate_link = data.get('certificate_link')
        db.session.commit()
        return jsonify({'success': True, 'training_record': row.to_dict()}), 200
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(exc)}), 500

