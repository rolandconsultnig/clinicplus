"""
Clinical Quality Measures (CQM) Models
Supports CMS eCQMs, HEDIS, MIPS, and other quality measures
"""
from datetime import datetime, date
from src.models.user import db
from decimal import Decimal
import json

class CQMMeasure(db.Model):
    """Clinical Quality Measure Definition"""
    __tablename__ = 'cqm_measures'
    
    id = db.Column(db.Integer, primary_key=True)
    measure_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Measure Identification
    measure_name = db.Column(db.String(200), nullable=False)
    measure_description = db.Column(db.Text)
    measure_type = db.Column(db.String(50))  # eCQM, HEDIS, MIPS, PQRS, Custom
    measure_category = db.Column(db.String(100))  # preventive_care, chronic_disease, patient_safety, etc.
    
    # Measure Standards
    cms_measure_number = db.Column(db.String(50))  # CMS measure number (e.g., CMS125)
    nqf_number = db.Column(db.String(50))  # NQF measure number
    hedis_id = db.Column(db.String(50))  # HEDIS measure ID
    mips_category = db.Column(db.String(50))  # quality, promoting_interoperability, improvement_activities, cost
    
    # Measure Details
    numerator_description = db.Column(db.Text)
    denominator_description = db.Column(db.Text)
    exclusion_description = db.Column(db.Text)
    
    # Calculation Logic (stored as JSON)
    calculation_logic = db.Column(db.Text)  # JSON string with calculation rules
    
    # Reporting Period
    reporting_period_type = db.Column(db.String(50), default='calendar_year')  # calendar_year, measurement_period
    reporting_period_start = db.Column(db.Date)
    reporting_period_end = db.Column(db.Date)
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    is_required = db.Column(db.Boolean, default=False)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    results = db.relationship('CQMResult', backref='measure', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'measure_id': self.measure_id,
            'measure_name': self.measure_name,
            'measure_description': self.measure_description,
            'measure_type': self.measure_type,
            'measure_category': self.measure_category,
            'cms_measure_number': self.cms_measure_number,
            'nqf_number': self.nqf_number,
            'is_active': self.is_active,
            'is_required': self.is_required
        }

class CQMResult(db.Model):
    """CQM Calculation Result for a specific period"""
    __tablename__ = 'cqm_results'
    
    id = db.Column(db.Integer, primary_key=True)
    result_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Measure and Period
    measure_id = db.Column(db.Integer, db.ForeignKey('cqm_measures.id'), nullable=False)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=True)
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=True)
    
    # Reporting Period
    reporting_period_start = db.Column(db.Date, nullable=False)
    reporting_period_end = db.Column(db.Date, nullable=False)
    
    # Calculation Results
    denominator = db.Column(db.Integer, default=0)  # Eligible population
    numerator = db.Column(db.Integer, default=0)  # Patients meeting criteria
    exclusions = db.Column(db.Integer, default=0)  # Excluded patients
    performance_rate = db.Column(db.Numeric(5, 2))  # Percentage (numerator/denominator * 100)
    
    # Benchmarking
    benchmark_rate = db.Column(db.Numeric(5, 2))  # National/regional benchmark
    performance_vs_benchmark = db.Column(db.String(20))  # above, at, below
    
    # Status
    calculation_status = db.Column(db.String(50), default='pending')  # pending, calculated, verified, submitted
    calculated_at = db.Column(db.DateTime)
    verified_at = db.Column(db.DateTime)
    verified_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def calculate_performance_rate(self):
        """Calculate performance rate"""
        if self.denominator > 0:
            self.performance_rate = Decimal(self.numerator) / Decimal(self.denominator) * 100
        else:
            self.performance_rate = Decimal(0)
        return self.performance_rate
    
    def to_dict(self):
        return {
            'id': self.id,
            'result_id': self.result_id,
            'measure_id': self.measure_id,
            'facility_id': self.facility_id,
            'provider_id': self.provider_id,
            'reporting_period_start': self.reporting_period_start.isoformat() if self.reporting_period_start else None,
            'reporting_period_end': self.reporting_period_end.isoformat() if self.reporting_period_end else None,
            'denominator': self.denominator,
            'numerator': self.numerator,
            'exclusions': self.exclusions,
            'performance_rate': float(self.performance_rate) if self.performance_rate else None,
            'benchmark_rate': float(self.benchmark_rate) if self.benchmark_rate else None,
            'performance_vs_benchmark': self.performance_vs_benchmark,
            'calculation_status': self.calculation_status,
            'calculated_at': self.calculated_at.isoformat() if self.calculated_at else None
        }

class CQMPatientEligibility(db.Model):
    """Patient eligibility for CQM measures"""
    __tablename__ = 'cqm_patient_eligibility'
    
    id = db.Column(db.Integer, primary_key=True)
    measure_id = db.Column(db.Integer, db.ForeignKey('cqm_measures.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    # Eligibility Status
    is_in_denominator = db.Column(db.Boolean, default=False)
    is_in_numerator = db.Column(db.Boolean, default=False)
    is_excluded = db.Column(db.Boolean, default=False)
    exclusion_reason = db.Column(db.String(200))
    
    # Period
    measurement_period_start = db.Column(db.Date, nullable=False)
    measurement_period_end = db.Column(db.Date, nullable=False)
    
    # Details (JSON)
    eligibility_details = db.Column(db.Text)  # JSON string with detailed eligibility data
    
    # System Fields
    calculated_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'measure_id': self.measure_id,
            'patient_id': self.patient_id,
            'is_in_denominator': self.is_in_denominator,
            'is_in_numerator': self.is_in_numerator,
            'is_excluded': self.is_excluded,
            'exclusion_reason': self.exclusion_reason,
            'measurement_period_start': self.measurement_period_start.isoformat() if self.measurement_period_start else None,
            'measurement_period_end': self.measurement_period_end.isoformat() if self.measurement_period_end else None
        }

class CQMGapAnalysis(db.Model):
    """Gap analysis for CQM measures"""
    __tablename__ = 'cqm_gap_analysis'
    
    id = db.Column(db.Integer, primary_key=True)
    gap_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Measure and Patient
    measure_id = db.Column(db.Integer, db.ForeignKey('cqm_measures.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    
    # Gap Details
    gap_type = db.Column(db.String(50))  # care_gap, documentation_gap, follow_up_gap
    gap_description = db.Column(db.Text)
    gap_severity = db.Column(db.String(20))  # low, medium, high, critical
    
    # Action Required
    action_required = db.Column(db.Text)
    action_priority = db.Column(db.String(20))  # low, medium, high
    
    # Status
    status = db.Column(db.String(50), default='open')  # open, in_progress, resolved, closed
    resolved_at = db.Column(db.DateTime)
    resolved_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'gap_id': self.gap_id,
            'measure_id': self.measure_id,
            'patient_id': self.patient_id,
            'gap_type': self.gap_type,
            'gap_description': self.gap_description,
            'gap_severity': self.gap_severity,
            'action_required': self.action_required,
            'action_priority': self.action_priority,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

