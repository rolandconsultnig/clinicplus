"""
Electronic Billing & Claims Models
"""
from datetime import datetime, date
from decimal import Decimal
from src.models.user import db

class BillingCode(db.Model):
    __tablename__ = 'billing_codes'
    
    id = db.Column(db.Integer, primary_key=True)
    code_type = db.Column(db.String(20), nullable=False)  # CPT4, ICD10, HCPCS
    code = db.Column(db.String(50), nullable=False, index=True)
    description = db.Column(db.Text, nullable=False)
    
    # Pricing
    default_fee = db.Column(db.Numeric(10, 2))
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    effective_date = db.Column(db.Date)
    expiration_date = db.Column(db.Date)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'code_type': self.code_type,
            'code': self.code,
            'description': self.description,
            'default_fee': float(self.default_fee) if self.default_fee else None,
            'is_active': self.is_active
        }

class FeeSchedule(db.Model):
    __tablename__ = 'fee_schedules'
    
    id = db.Column(db.Integer, primary_key=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    schedule_name = db.Column(db.String(100), nullable=False)
    
    # Effective Dates
    effective_from = db.Column(db.Date, nullable=False)
    effective_to = db.Column(db.Date)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'facility_id': self.facility_id,
            'schedule_name': self.schedule_name,
            'effective_from': self.effective_from.isoformat() if self.effective_from else None,
            'effective_to': self.effective_to.isoformat() if self.effective_to else None
        }

class FeeScheduleItem(db.Model):
    __tablename__ = 'fee_schedule_items'
    
    id = db.Column(db.Integer, primary_key=True)
    fee_schedule_id = db.Column(db.Integer, db.ForeignKey('fee_schedules.id'), nullable=False)
    billing_code_id = db.Column(db.Integer, db.ForeignKey('billing_codes.id'), nullable=False)
    
    # Pricing
    fee_amount = db.Column(db.Numeric(10, 2), nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'fee_schedule_id': self.fee_schedule_id,
            'billing_code_id': self.billing_code_id,
            'fee_amount': float(self.fee_amount) if self.fee_amount else None
        }

class Charge(db.Model):
    __tablename__ = 'charges'
    
    id = db.Column(db.Integer, primary_key=True)
    charge_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Patient and Encounter
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    encounter_id = db.Column(db.Integer, db.ForeignKey('clinical_encounters.id'), nullable=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    
    # Charge Details
    charge_date = db.Column(db.Date, nullable=False)
    billing_code_id = db.Column(db.Integer, db.ForeignKey('billing_codes.id'), nullable=False)
    quantity = db.Column(db.Integer, default=1)
    unit_price = db.Column(db.Numeric(10, 2), nullable=False)
    total_amount = db.Column(db.Numeric(10, 2), nullable=False)
    
    # Status
    status = db.Column(db.String(50), default='pending')  # pending, billed, paid, cancelled, written_off
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'charge_id': self.charge_id,
            'patient_id': self.patient_id,
            'encounter_id': self.encounter_id,
            'facility_id': self.facility_id,
            'charge_date': self.charge_date.isoformat() if self.charge_date else None,
            'quantity': self.quantity,
            'unit_price': float(self.unit_price) if self.unit_price else None,
            'total_amount': float(self.total_amount) if self.total_amount else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Claim(db.Model):
    __tablename__ = 'claims'
    
    id = db.Column(db.Integer, primary_key=True)
    claim_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Patient and Facility
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    
    # Claim Details
    claim_type = db.Column(db.String(50), nullable=False)  # primary, secondary, tertiary
    claim_format = db.Column(db.String(20), default='837P')  # 837P, HCFA1500
    total_charge_amount = db.Column(db.Numeric(10, 2), nullable=False)
    
    # Insurance
    insurance_provider = db.Column(db.String(100))
    insurance_policy_number = db.Column(db.String(50))
    subscriber_id = db.Column(db.String(50))
    
    # Status
    status = db.Column(db.String(50), default='draft')  # draft, submitted, accepted, rejected, paid, denied
    submission_date = db.Column(db.DateTime)
    response_date = db.Column(db.DateTime)
    
    # EDI
    edi_file_path = db.Column(db.String(500))
    hcfa_file_path = db.Column(db.String(500))
    edi_transaction_id = db.Column(db.String(100))
    
    # Response
    response_code = db.Column(db.String(50))
    response_message = db.Column(db.Text)
    paid_amount = db.Column(db.Numeric(10, 2))
    adjustment_amount = db.Column(db.Numeric(10, 2))
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    
    # Relationships
    claim_items = db.relationship('ClaimItem', backref='claim', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'claim_id': self.claim_id,
            'patient_id': self.patient_id,
            'facility_id': self.facility_id,
            'claim_type': self.claim_type,
            'total_charge_amount': float(self.total_charge_amount) if self.total_charge_amount else None,
            'status': self.status,
            'submission_date': self.submission_date.isoformat() if self.submission_date else None,
            'paid_amount': float(self.paid_amount) if self.paid_amount else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class ClaimItem(db.Model):
    __tablename__ = 'claim_items'
    
    id = db.Column(db.Integer, primary_key=True)
    claim_id = db.Column(db.Integer, db.ForeignKey('claims.id'), nullable=False)
    charge_id = db.Column(db.Integer, db.ForeignKey('charges.id'), nullable=False)
    
    # Line Item Details
    line_number = db.Column(db.Integer, nullable=False)
    procedure_code = db.Column(db.String(50))
    diagnosis_code = db.Column(db.String(50))
    charge_amount = db.Column(db.Numeric(10, 2), nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'claim_id': self.claim_id,
            'charge_id': self.charge_id,
            'line_number': self.line_number,
            'procedure_code': self.procedure_code,
            'diagnosis_code': self.diagnosis_code,
            'charge_amount': float(self.charge_amount) if self.charge_amount else None
        }

class Payment(db.Model):
    __tablename__ = 'payments'
    
    id = db.Column(db.Integer, primary_key=True)
    payment_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Patient and Facility
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    
    # Payment Details
    payment_date = db.Column(db.Date, nullable=False)
    payment_method = db.Column(db.String(50), nullable=False)  # cash, credit_card, debit_card, check, insurance, other
    payment_amount = db.Column(db.Numeric(10, 2), nullable=False)
    
    # Reference
    reference_number = db.Column(db.String(100))
    check_number = db.Column(db.String(50))
    
    # Status
    status = db.Column(db.String(50), default='completed')  # pending, completed, failed, refunded
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    
    # Relationships
    payment_allocations = db.relationship('PaymentAllocation', backref='payment', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'payment_id': self.payment_id,
            'patient_id': self.patient_id,
            'facility_id': self.facility_id,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'payment_method': self.payment_method,
            'payment_amount': float(self.payment_amount) if self.payment_amount else None,
            'reference_number': self.reference_number,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class PaymentAllocation(db.Model):
    __tablename__ = 'payment_allocations'
    
    id = db.Column(db.Integer, primary_key=True)
    payment_id = db.Column(db.Integer, db.ForeignKey('payments.id'), nullable=False)
    charge_id = db.Column(db.Integer, db.ForeignKey('charges.id'), nullable=False)
    
    # Allocation
    allocated_amount = db.Column(db.Numeric(10, 2), nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'payment_id': self.payment_id,
            'charge_id': self.charge_id,
            'allocated_amount': float(self.allocated_amount) if self.allocated_amount else None
        }

class Statement(db.Model):
    __tablename__ = 'statements'
    
    id = db.Column(db.Integer, primary_key=True)
    statement_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Patient and Facility
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    
    # Statement Details
    statement_date = db.Column(db.Date, nullable=False)
    due_date = db.Column(db.Date, nullable=False)
    total_charges = db.Column(db.Numeric(10, 2), nullable=False)
    total_payments = db.Column(db.Numeric(10, 2), default=0)
    total_adjustments = db.Column(db.Numeric(10, 2), default=0)
    balance_due = db.Column(db.Numeric(10, 2), nullable=False)
    
    # Status
    status = db.Column(db.String(50), default='open')  # open, paid, overdue, closed
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'statement_id': self.statement_id,
            'patient_id': self.patient_id,
            'facility_id': self.facility_id,
            'statement_date': self.statement_date.isoformat() if self.statement_date else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'total_charges': float(self.total_charges) if self.total_charges else None,
            'total_payments': float(self.total_payments) if self.total_payments else None,
            'balance_due': float(self.balance_due) if self.balance_due else None,
            'status': self.status
        }

