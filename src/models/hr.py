"""
Human Resource Department models for Clinic+.
"""
from datetime import datetime, date
from decimal import Decimal
from src.models.user import db


class HRDepartment(db.Model):
    __tablename__ = 'hr_departments'

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(30), unique=True, nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'name': self.name,
            'description': self.description,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class HRUnit(db.Model):
    __tablename__ = 'hr_units'

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(30), unique=True, nullable=False, index=True)
    name = db.Column(db.String(120), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('hr_departments.id'), nullable=False)
    description = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    department = db.relationship('HRDepartment')

    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'name': self.name,
            'department_id': self.department_id,
            'department_name': self.department.name if self.department else None,
            'description': self.description,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Position(db.Model):
    __tablename__ = 'hr_positions'

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.String(30), unique=True, nullable=False, index=True)
    title = db.Column(db.String(150), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('hr_departments.id'), nullable=True)
    unit_id = db.Column(db.Integer, db.ForeignKey('hr_units.id'), nullable=True)
    employment_type = db.Column(db.String(30), default='full_time')  # full_time, part_time, contract
    grade = db.Column(db.String(30), nullable=True)
    min_salary = db.Column(db.Numeric(14, 2), default=Decimal('0.00'))
    max_salary = db.Column(db.Numeric(14, 2), default=Decimal('0.00'))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    department = db.relationship('HRDepartment')
    unit = db.relationship('HRUnit')

    def to_dict(self):
        return {
            'id': self.id,
            'code': self.code,
            'title': self.title,
            'department_id': self.department_id,
            'department_name': self.department.name if self.department else None,
            'unit_id': self.unit_id,
            'unit_name': self.unit.name if self.unit else None,
            'employment_type': self.employment_type,
            'grade': self.grade,
            'min_salary': float(self.min_salary or 0),
            'max_salary': float(self.max_salary or 0),
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Employee(db.Model):
    __tablename__ = 'hr_employees'

    id = db.Column(db.Integer, primary_key=True)
    employee_number = db.Column(db.String(40), unique=True, nullable=False, index=True)
    first_name = db.Column(db.String(80), nullable=False)
    last_name = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), nullable=True)
    phone = db.Column(db.String(30), nullable=True)
    date_of_birth = db.Column(db.Date, nullable=True)
    hire_date = db.Column(db.Date, nullable=False, default=date.today)
    status = db.Column(db.String(30), default='active')  # active, on_leave, terminated, probation
    department_id = db.Column(db.Integer, db.ForeignKey('hr_departments.id'), nullable=True)
    unit_id = db.Column(db.Integer, db.ForeignKey('hr_units.id'), nullable=True)
    position_id = db.Column(db.Integer, db.ForeignKey('hr_positions.id'), nullable=True)
    manager_employee_id = db.Column(db.Integer, db.ForeignKey('hr_employees.id'), nullable=True)
    base_salary = db.Column(db.Numeric(14, 2), default=Decimal('0.00'))
    emergency_contact_name = db.Column(db.String(120), nullable=True)
    emergency_contact_phone = db.Column(db.String(30), nullable=True)
    address = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    department = db.relationship('HRDepartment')
    unit = db.relationship('HRUnit')
    position = db.relationship('Position')
    manager = db.relationship('Employee', remote_side=[id], uselist=False)

    def to_dict(self):
        return {
            'id': self.id,
            'employee_number': self.employee_number,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': f'{self.first_name} {self.last_name}',
            'email': self.email,
            'phone': self.phone,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'hire_date': self.hire_date.isoformat() if self.hire_date else None,
            'status': self.status,
            'department_id': self.department_id,
            'department_name': self.department.name if self.department else None,
            'unit_id': self.unit_id,
            'unit_name': self.unit.name if self.unit else None,
            'position_id': self.position_id,
            'position_title': self.position.title if self.position else None,
            'manager_employee_id': self.manager_employee_id,
            'manager_name': self.manager.first_name + ' ' + self.manager.last_name if self.manager else None,
            'base_salary': float(self.base_salary or 0),
            'emergency_contact_name': self.emergency_contact_name,
            'emergency_contact_phone': self.emergency_contact_phone,
            'address': self.address,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class AttendanceRecord(db.Model):
    __tablename__ = 'hr_attendance_records'

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('hr_employees.id'), nullable=False)
    attendance_date = db.Column(db.Date, nullable=False, default=date.today, index=True)
    check_in_time = db.Column(db.DateTime, nullable=True)
    check_out_time = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(30), default='present')  # present, absent, late, half_day, remote
    work_hours = db.Column(db.Numeric(6, 2), default=Decimal('0.00'))
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    employee = db.relationship('Employee')

    def to_dict(self):
        return {
            'id': self.id,
            'employee_id': self.employee_id,
            'employee_name': self.employee.first_name + ' ' + self.employee.last_name if self.employee else None,
            'attendance_date': self.attendance_date.isoformat() if self.attendance_date else None,
            'check_in_time': self.check_in_time.isoformat() if self.check_in_time else None,
            'check_out_time': self.check_out_time.isoformat() if self.check_out_time else None,
            'status': self.status,
            'work_hours': float(self.work_hours or 0),
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class LeaveRequest(db.Model):
    __tablename__ = 'hr_leave_requests'

    id = db.Column(db.Integer, primary_key=True)
    request_number = db.Column(db.String(40), unique=True, nullable=False, index=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('hr_employees.id'), nullable=False)
    leave_type = db.Column(db.String(40), nullable=False)  # annual, sick, maternity, paternity, unpaid
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    days_requested = db.Column(db.Integer, default=1)
    reason = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(30), default='pending')  # pending, approved, rejected, cancelled
    approved_by = db.Column(db.Integer, nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)
    rejection_reason = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    employee = db.relationship('Employee')

    def to_dict(self):
        return {
            'id': self.id,
            'request_number': self.request_number,
            'employee_id': self.employee_id,
            'employee_name': self.employee.first_name + ' ' + self.employee.last_name if self.employee else None,
            'leave_type': self.leave_type,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'days_requested': self.days_requested,
            'reason': self.reason,
            'status': self.status,
            'approved_by': self.approved_by,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'rejection_reason': self.rejection_reason,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class PayrollRecord(db.Model):
    __tablename__ = 'hr_payroll_records'

    id = db.Column(db.Integer, primary_key=True)
    payroll_number = db.Column(db.String(40), unique=True, nullable=False, index=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('hr_employees.id'), nullable=False)
    pay_period_start = db.Column(db.Date, nullable=False)
    pay_period_end = db.Column(db.Date, nullable=False)
    basic_pay = db.Column(db.Numeric(14, 2), default=Decimal('0.00'))
    overtime_pay = db.Column(db.Numeric(14, 2), default=Decimal('0.00'))
    bonus = db.Column(db.Numeric(14, 2), default=Decimal('0.00'))
    deductions = db.Column(db.Numeric(14, 2), default=Decimal('0.00'))
    tax = db.Column(db.Numeric(14, 2), default=Decimal('0.00'))
    net_pay = db.Column(db.Numeric(14, 2), default=Decimal('0.00'))
    payment_status = db.Column(db.String(30), default='pending')  # pending, paid, failed
    payment_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    employee = db.relationship('Employee')

    def to_dict(self):
        return {
            'id': self.id,
            'payroll_number': self.payroll_number,
            'employee_id': self.employee_id,
            'employee_name': self.employee.first_name + ' ' + self.employee.last_name if self.employee else None,
            'pay_period_start': self.pay_period_start.isoformat() if self.pay_period_start else None,
            'pay_period_end': self.pay_period_end.isoformat() if self.pay_period_end else None,
            'basic_pay': float(self.basic_pay or 0),
            'overtime_pay': float(self.overtime_pay or 0),
            'bonus': float(self.bonus or 0),
            'deductions': float(self.deductions or 0),
            'tax': float(self.tax or 0),
            'net_pay': float(self.net_pay or 0),
            'payment_status': self.payment_status,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class JobPosting(db.Model):
    __tablename__ = 'hr_job_postings'

    id = db.Column(db.Integer, primary_key=True)
    posting_number = db.Column(db.String(40), unique=True, nullable=False, index=True)
    title = db.Column(db.String(150), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('hr_departments.id'), nullable=True)
    position_id = db.Column(db.Integer, db.ForeignKey('hr_positions.id'), nullable=True)
    employment_type = db.Column(db.String(30), default='full_time')
    location = db.Column(db.String(120), nullable=True)
    status = db.Column(db.String(30), default='open')  # open, paused, closed, filled
    openings_count = db.Column(db.Integer, default=1)
    description = db.Column(db.Text, nullable=True)
    requirements = db.Column(db.Text, nullable=True)
    posted_date = db.Column(db.Date, default=date.today)
    closing_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    department = db.relationship('HRDepartment')
    position = db.relationship('Position')

    def to_dict(self):
        return {
            'id': self.id,
            'posting_number': self.posting_number,
            'title': self.title,
            'department_id': self.department_id,
            'department_name': self.department.name if self.department else None,
            'position_id': self.position_id,
            'position_title': self.position.title if self.position else None,
            'employment_type': self.employment_type,
            'location': self.location,
            'status': self.status,
            'openings_count': self.openings_count,
            'description': self.description,
            'requirements': self.requirements,
            'posted_date': self.posted_date.isoformat() if self.posted_date else None,
            'closing_date': self.closing_date.isoformat() if self.closing_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Applicant(db.Model):
    __tablename__ = 'hr_applicants'

    id = db.Column(db.Integer, primary_key=True)
    applicant_number = db.Column(db.String(40), unique=True, nullable=False, index=True)
    job_posting_id = db.Column(db.Integer, db.ForeignKey('hr_job_postings.id'), nullable=False)
    first_name = db.Column(db.String(80), nullable=False)
    last_name = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(30), nullable=True)
    stage = db.Column(db.String(40), default='applied')  # applied, screened, interview, offer, hired, rejected
    score = db.Column(db.Numeric(5, 2), default=Decimal('0.00'))
    source = db.Column(db.String(60), nullable=True)
    resume_link = db.Column(db.String(255), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    applied_at = db.Column(db.DateTime, default=datetime.utcnow)

    job_posting = db.relationship('JobPosting')

    def to_dict(self):
        return {
            'id': self.id,
            'applicant_number': self.applicant_number,
            'job_posting_id': self.job_posting_id,
            'job_title': self.job_posting.title if self.job_posting else None,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'full_name': f'{self.first_name} {self.last_name}',
            'email': self.email,
            'phone': self.phone,
            'stage': self.stage,
            'score': float(self.score or 0),
            'source': self.source,
            'resume_link': self.resume_link,
            'notes': self.notes,
            'applied_at': self.applied_at.isoformat() if self.applied_at else None,
        }


class PerformanceReview(db.Model):
    __tablename__ = 'hr_performance_reviews'

    id = db.Column(db.Integer, primary_key=True)
    review_number = db.Column(db.String(40), unique=True, nullable=False, index=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('hr_employees.id'), nullable=False)
    reviewer_employee_id = db.Column(db.Integer, db.ForeignKey('hr_employees.id'), nullable=True)
    review_period_start = db.Column(db.Date, nullable=False)
    review_period_end = db.Column(db.Date, nullable=False)
    overall_rating = db.Column(db.Numeric(4, 2), default=Decimal('0.00'))  # 0-5
    strengths = db.Column(db.Text, nullable=True)
    improvement_areas = db.Column(db.Text, nullable=True)
    goals = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(30), default='draft')  # draft, submitted, acknowledged
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    employee = db.relationship('Employee', foreign_keys=[employee_id])
    reviewer = db.relationship('Employee', foreign_keys=[reviewer_employee_id])

    def to_dict(self):
        return {
            'id': self.id,
            'review_number': self.review_number,
            'employee_id': self.employee_id,
            'employee_name': self.employee.first_name + ' ' + self.employee.last_name if self.employee else None,
            'reviewer_employee_id': self.reviewer_employee_id,
            'reviewer_name': self.reviewer.first_name + ' ' + self.reviewer.last_name if self.reviewer else None,
            'review_period_start': self.review_period_start.isoformat() if self.review_period_start else None,
            'review_period_end': self.review_period_end.isoformat() if self.review_period_end else None,
            'overall_rating': float(self.overall_rating or 0),
            'strengths': self.strengths,
            'improvement_areas': self.improvement_areas,
            'goals': self.goals,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class TrainingRecord(db.Model):
    __tablename__ = 'hr_training_records'

    id = db.Column(db.Integer, primary_key=True)
    training_number = db.Column(db.String(40), unique=True, nullable=False, index=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('hr_employees.id'), nullable=False)
    course_name = db.Column(db.String(180), nullable=False)
    provider_name = db.Column(db.String(120), nullable=True)
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    completion_status = db.Column(db.String(30), default='assigned')  # assigned, in_progress, completed, failed
    score = db.Column(db.Numeric(5, 2), default=Decimal('0.00'))
    certificate_link = db.Column(db.String(255), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    employee = db.relationship('Employee')

    def to_dict(self):
        return {
            'id': self.id,
            'training_number': self.training_number,
            'employee_id': self.employee_id,
            'employee_name': self.employee.first_name + ' ' + self.employee.last_name if self.employee else None,
            'course_name': self.course_name,
            'provider_name': self.provider_name,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'completion_status': self.completion_status,
            'score': float(self.score or 0),
            'certificate_link': self.certificate_link,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

