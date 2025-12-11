"""
Clinical Decision Support (CDS) Models
"""
from datetime import datetime, date
from src.models.user import db

class CDSRule(db.Model):
    __tablename__ = 'cds_rules'
    
    id = db.Column(db.Integer, primary_key=True)
    rule_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    rule_name = db.Column(db.String(200), nullable=False)
    rule_description = db.Column(db.Text)
    
    # Rule Type
    rule_type = db.Column(db.String(50), nullable=False)  # care_gap, drug_interaction, clinical_alert, compliance_check
    rule_category = db.Column(db.String(50))  # preventive_care, chronic_disease, medication, lab
    
    # Rule Logic (JSON string)
    rule_conditions = db.Column(db.Text, nullable=False)  # JSON: conditions to check
    rule_actions = db.Column(db.Text, nullable=False)  # JSON: actions to take
    
    # Evidence
    evidence_level = db.Column(db.String(20))  # A, B, C, D
    evidence_source = db.Column(db.String(200))
    guideline_reference = db.Column(db.String(200))
    
    # Applicability
    applicable_patient_types = db.Column(db.Text)  # JSON: age ranges, conditions, etc.
    applicable_facilities = db.Column(db.Text)  # JSON: facility types
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    priority = db.Column(db.Integer, default=0)  # Higher = more important
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    alerts = db.relationship('CDSAlert', backref='rule', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'rule_id': self.rule_id,
            'rule_name': self.rule_name,
            'rule_type': self.rule_type,
            'rule_category': self.rule_category,
            'evidence_level': self.evidence_level,
            'is_active': self.is_active,
            'priority': self.priority
        }

class CDSAlert(db.Model):
    __tablename__ = 'cds_alerts'
    
    id = db.Column(db.Integer, primary_key=True)
    alert_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Patient and Context
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    encounter_id = db.Column(db.Integer, db.ForeignKey('clinical_encounters.id'), nullable=True)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    
    # Rule
    rule_id = db.Column(db.Integer, db.ForeignKey('cds_rules.id'), nullable=False)
    
    # Alert Details
    alert_type = db.Column(db.String(50), nullable=False)  # care_gap, drug_interaction, clinical_alert
    alert_message = db.Column(db.Text, nullable=False)
    alert_severity = db.Column(db.String(20), nullable=False)  # critical, high, medium, low, info
    
    # Alert Data (JSON string)
    alert_data = db.Column(db.Text)  # JSON: specific data that triggered alert
    
    # Status
    status = db.Column(db.String(50), default='active')  # active, acknowledged, resolved, dismissed
    acknowledged_at = db.Column(db.DateTime)
    acknowledged_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    resolved_at = db.Column(db.DateTime)
    resolved_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    
    # Action Taken
    action_taken = db.Column(db.Text)  # What was done in response
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'alert_id': self.alert_id,
            'patient_id': self.patient_id,
            'encounter_id': self.encounter_id,
            'alert_type': self.alert_type,
            'alert_message': self.alert_message,
            'alert_severity': self.alert_severity,
            'status': self.status,
            'acknowledged_at': self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class CareGap(db.Model):
    __tablename__ = 'care_gaps'
    
    id = db.Column(db.Integer, primary_key=True)
    gap_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Patient
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    
    # Gap Details
    gap_type = db.Column(db.String(50), nullable=False)  # preventive_screening, immunization, chronic_care, medication_adherence
    gap_description = db.Column(db.Text, nullable=False)
    
    # Compliance
    compliance_standard = db.Column(db.String(100))  # CMS, HEDIS, etc.
    measure_name = db.Column(db.String(200))
    measure_id = db.Column(db.String(50))
    
    # Dates
    due_date = db.Column(db.Date)
    last_performed_date = db.Column(db.Date)
    next_due_date = db.Column(db.Date)
    
    # Status
    status = db.Column(db.String(50), default='open')  # open, in_progress, closed, waived
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'gap_id': self.gap_id,
            'patient_id': self.patient_id,
            'gap_type': self.gap_type,
            'gap_description': self.gap_description,
            'compliance_standard': self.compliance_standard,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

