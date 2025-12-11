"""
Micro-Insurance Platform Models
"""
from datetime import datetime, date
from decimal import Decimal
from src.models.user import db

class InsurancePlan(db.Model):
    __tablename__ = 'insurance_plans'
    
    id = db.Column(db.Integer, primary_key=True)
    plan_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    plan_name = db.Column(db.String(200), nullable=False)
    plan_type = db.Column(db.String(50), nullable=False)  # family_health, passenger_accident, comprehensive
    
    # Coverage Details
    coverage_description = db.Column(db.Text)
    max_family_size = db.Column(db.Integer, default=4)
    coverage_amount = db.Column(db.Numeric(12, 2))  # Maximum coverage amount
    
    # Premium
    premium_amount = db.Column(db.Numeric(10, 2), nullable=False)
    premium_frequency = db.Column(db.String(20), default='weekly')  # weekly, monthly, annual
    currency = db.Column(db.String(10), default='NGN')
    
    # Benefits (JSON string)
    benefits = db.Column(db.Text)  # JSON: {"consultations": true, "basic_labs": true, "formulary_drugs": true}
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    effective_from = db.Column(db.Date, nullable=False)
    effective_to = db.Column(db.Date)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    subscriptions = db.relationship('InsuranceSubscription', backref='insurance_plan', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'plan_id': self.plan_id,
            'plan_name': self.plan_name,
            'plan_type': self.plan_type,
            'max_family_size': self.max_family_size,
            'coverage_amount': float(self.coverage_amount) if self.coverage_amount else None,
            'premium_amount': float(self.premium_amount) if self.premium_amount else None,
            'premium_frequency': self.premium_frequency,
            'currency': self.currency,
            'is_active': self.is_active,
            'effective_from': self.effective_from.isoformat() if self.effective_from else None
        }

class InsuranceSubscription(db.Model):
    __tablename__ = 'insurance_subscriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    subscription_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Subscriber
    subscriber_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    plan_id = db.Column(db.Integer, db.ForeignKey('insurance_plans.id'), nullable=False)
    
    # Family Members (JSON string of patient IDs)
    covered_members = db.Column(db.Text)  # JSON: [patient_id1, patient_id2, ...]
    
    # Subscription Details
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date)
    renewal_date = db.Column(db.Date)
    
    # Premium Payment
    premium_amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_status = db.Column(db.String(50), default='active')  # active, lapsed, cancelled, expired
    last_payment_date = db.Column(db.Date)
    next_payment_due_date = db.Column(db.Date)
    
    # Coverage Usage
    total_claims = db.Column(db.Integer, default=0)
    total_claim_amount = db.Column(db.Numeric(12, 2), default=0)
    remaining_coverage = db.Column(db.Numeric(12, 2))
    
    # Status
    status = db.Column(db.String(50), default='active')  # active, suspended, cancelled, expired
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    claims = db.relationship('InsuranceClaim', backref='subscription', lazy=True)
    payments = db.relationship('InsurancePayment', backref='subscription', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'subscription_id': self.subscription_id,
            'subscriber_id': self.subscriber_id,
            'plan_id': self.plan_id,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'premium_amount': float(self.premium_amount) if self.premium_amount else None,
            'payment_status': self.payment_status,
            'status': self.status,
            'total_claims': self.total_claims,
            'remaining_coverage': float(self.remaining_coverage) if self.remaining_coverage else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class InsuranceClaim(db.Model):
    __tablename__ = 'insurance_claims'
    
    id = db.Column(db.Integer, primary_key=True)
    claim_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Subscription and Patient
    subscription_id = db.Column(db.Integer, db.ForeignKey('insurance_subscriptions.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    encounter_id = db.Column(db.Integer, db.ForeignKey('clinical_encounters.id'), nullable=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    
    # Claim Details
    claim_date = db.Column(db.Date, nullable=False)
    service_type = db.Column(db.String(50), nullable=False)  # consultation, lab_test, medication, procedure
    service_description = db.Column(db.Text)
    
    # Amounts
    billed_amount = db.Column(db.Numeric(10, 2), nullable=False)
    approved_amount = db.Column(db.Numeric(10, 2))
    paid_amount = db.Column(db.Numeric(10, 2))
    copay_amount = db.Column(db.Numeric(10, 2), default=0)
    
    # Status
    status = db.Column(db.String(50), default='submitted')  # submitted, under_review, approved, paid, denied, pending
    submission_date = db.Column(db.DateTime, default=datetime.utcnow)
    review_date = db.Column(db.DateTime)
    payment_date = db.Column(db.DateTime)
    
    # Denial Reason
    denial_reason = db.Column(db.Text)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'claim_id': self.claim_id,
            'subscription_id': self.subscription_id,
            'patient_id': self.patient_id,
            'encounter_id': self.encounter_id,
            'claim_date': self.claim_date.isoformat() if self.claim_date else None,
            'service_type': self.service_type,
            'billed_amount': float(self.billed_amount) if self.billed_amount else None,
            'approved_amount': float(self.approved_amount) if self.approved_amount else None,
            'paid_amount': float(self.paid_amount) if self.paid_amount else None,
            'status': self.status,
            'submission_date': self.submission_date.isoformat() if self.submission_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class InsurancePayment(db.Model):
    __tablename__ = 'insurance_payments'
    
    id = db.Column(db.Integer, primary_key=True)
    payment_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Subscription
    subscription_id = db.Column(db.Integer, db.ForeignKey('insurance_subscriptions.id'), nullable=False)
    subscriber_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    # Payment Details
    payment_date = db.Column(db.Date, nullable=False)
    payment_amount = db.Column(db.Numeric(10, 2), nullable=False)
    payment_method = db.Column(db.String(50), nullable=False)  # credit_card, debit_card, bank_transfer, mobile_money
    payment_reference = db.Column(db.String(100))
    
    # Coverage Period
    coverage_start_date = db.Column(db.Date, nullable=False)
    coverage_end_date = db.Column(db.Date, nullable=False)
    
    # Status
    status = db.Column(db.String(50), default='completed')  # pending, completed, failed, refunded
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'payment_id': self.payment_id,
            'subscription_id': self.subscription_id,
            'subscriber_id': self.subscriber_id,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'payment_amount': float(self.payment_amount) if self.payment_amount else None,
            'payment_method': self.payment_method,
            'coverage_start_date': self.coverage_start_date.isoformat() if self.coverage_start_date else None,
            'coverage_end_date': self.coverage_end_date.isoformat() if self.coverage_end_date else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class PassengerAccidentCover(db.Model):
    __tablename__ = 'passenger_accident_covers'
    
    id = db.Column(db.Integer, primary_key=True)
    cover_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Passenger
    passenger_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    # Trip Details
    trip_reference = db.Column(db.String(100), nullable=False, index=True)  # Transport ticket reference
    trip_date = db.Column(db.Date, nullable=False)
    trip_origin = db.Column(db.String(200))
    trip_destination = db.Column(db.String(200))
    
    # Coverage Details
    coverage_amount = db.Column(db.Numeric(12, 2), nullable=False)  # e.g., 2,000,000 NGN
    premium_paid = db.Column(db.Numeric(10, 2), nullable=False)  # e.g., 500 NGN
    coverage_start_time = db.Column(db.DateTime, nullable=False)
    coverage_end_time = db.Column(db.DateTime, nullable=False)
    
    # Status
    status = db.Column(db.String(50), default='active')  # active, claimed, expired, cancelled
    
    # Claim
    claim_id = db.Column(db.Integer, db.ForeignKey('insurance_claims.id'), nullable=True)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'cover_id': self.cover_id,
            'passenger_id': self.passenger_id,
            'trip_reference': self.trip_reference,
            'trip_date': self.trip_date.isoformat() if self.trip_date else None,
            'coverage_amount': float(self.coverage_amount) if self.coverage_amount else None,
            'premium_paid': float(self.premium_paid) if self.premium_paid else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

