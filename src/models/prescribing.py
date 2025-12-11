"""
ePrescribing Models with Drug Interaction Checks
"""
from datetime import datetime, date
from src.models.user import db
import json
import json

class Drug(db.Model):
    __tablename__ = 'drugs'
    
    id = db.Column(db.Integer, primary_key=True)
    rxnorm_code = db.Column(db.String(50), unique=True, nullable=False, index=True)
    drug_name = db.Column(db.String(200), nullable=False)
    generic_name = db.Column(db.String(200))
    
    # Drug Classification
    drug_class = db.Column(db.String(100))
    drug_subclass = db.Column(db.String(100))
    
    # Form and Strength
    dosage_form = db.Column(db.String(50))  # tablet, capsule, liquid, injection, etc.
    strength = db.Column(db.String(100))
    
    # Controlled Substance
    is_controlled = db.Column(db.Boolean, default=False)
    schedule = db.Column(db.String(10))  # I, II, III, IV, V
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    interactions = db.relationship('DrugInteraction', foreign_keys='DrugInteraction.drug1_id', backref='drug1', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'rxnorm_code': self.rxnorm_code,
            'drug_name': self.drug_name,
            'generic_name': self.generic_name,
            'drug_class': self.drug_class,
            'dosage_form': self.dosage_form,
            'strength': self.strength,
            'is_controlled': self.is_controlled,
            'schedule': self.schedule,
            'is_active': self.is_active
        }

class DrugInteraction(db.Model):
    __tablename__ = 'drug_interactions'
    
    id = db.Column(db.Integer, primary_key=True)
    drug1_id = db.Column(db.Integer, db.ForeignKey('drugs.id'), nullable=False)
    drug2_id = db.Column(db.Integer, db.ForeignKey('drugs.id'), nullable=False)
    
    # Interaction Details
    interaction_type = db.Column(db.String(50), nullable=False)  # contraindicated, major, moderate, minor
    severity = db.Column(db.String(20), nullable=False)  # severe, moderate, mild
    description = db.Column(db.Text, nullable=False)
    clinical_significance = db.Column(db.Text)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'drug1_id': self.drug1_id,
            'drug2_id': self.drug2_id,
            'interaction_type': self.interaction_type,
            'severity': self.severity,
            'description': self.description,
            'clinical_significance': self.clinical_significance
        }

class DrugAllergyInteraction(db.Model):
    __tablename__ = 'drug_allergy_interactions'
    
    id = db.Column(db.Integer, primary_key=True)
    drug_id = db.Column(db.Integer, db.ForeignKey('drugs.id'), nullable=False)
    allergen = db.Column(db.String(200), nullable=False)
    
    # Interaction Details
    severity = db.Column(db.String(20), nullable=False)  # severe, moderate, mild
    description = db.Column(db.Text, nullable=False)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'drug_id': self.drug_id,
            'allergen': self.allergen,
            'severity': self.severity,
            'description': self.description
        }

class Prescription(db.Model):
    __tablename__ = 'prescriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    prescription_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Patient and Provider
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
    facility_id = db.Column(db.Integer, db.ForeignKey('facilities.id'), nullable=False)
    encounter_id = db.Column(db.Integer, db.ForeignKey('clinical_encounters.id'), nullable=True)
    
    # Drug Information
    drug_id = db.Column(db.Integer, db.ForeignKey('drugs.id'), nullable=False)
    drug_name = db.Column(db.String(200), nullable=False)  # Denormalized for display
    rxnorm_code = db.Column(db.String(50))
    
    # Prescription Details
    dosage = db.Column(db.String(100), nullable=False)  # e.g., "10mg"
    frequency = db.Column(db.String(100), nullable=False)  # e.g., "twice daily", "QID"
    route = db.Column(db.String(50))  # oral, topical, injection, etc.
    quantity = db.Column(db.Integer, nullable=False)
    days_supply = db.Column(db.Integer)
    refills = db.Column(db.Integer, default=0)
    refills_remaining = db.Column(db.Integer, default=0)
    
    # Instructions
    sig = db.Column(db.Text)  # Full prescription instructions
    patient_instructions = db.Column(db.Text)
    
    # Dates
    prescribed_date = db.Column(db.Date, nullable=False)
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    
    # Status
    status = db.Column(db.String(50), default='active')  # active, filled, cancelled, expired, completed
    filled_date = db.Column(db.Date)
    pharmacy_id = db.Column(db.Integer, db.ForeignKey('pharmacies.id'), nullable=True)
    
    # Safety Checks
    drug_interaction_checked = db.Column(db.Boolean, default=False)
    allergy_checked = db.Column(db.Boolean, default=False)
    interaction_warnings = db.Column(db.Text)  # JSON string for warnings
    
    # Controlled Substance
    dea_required = db.Column(db.Boolean, default=False)
    dea_verified = db.Column(db.Boolean, default=False)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    
    # Relationships
    refill_history = db.relationship('PrescriptionRefill', backref='prescription', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'prescription_id': self.prescription_id,
            'patient_id': self.patient_id,
            'provider_id': self.provider_id,
            'facility_id': self.facility_id,
            'drug_name': self.drug_name,
            'dosage': self.dosage,
            'frequency': self.frequency,
            'quantity': self.quantity,
            'refills': self.refills,
            'refills_remaining': self.refills_remaining,
            'sig': self.sig,
            'prescribed_date': self.prescribed_date.isoformat() if self.prescribed_date else None,
            'status': self.status,
            'filled_date': self.filled_date.isoformat() if self.filled_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class PrescriptionRefill(db.Model):
    __tablename__ = 'prescription_refills'
    
    id = db.Column(db.Integer, primary_key=True)
    prescription_id = db.Column(db.Integer, db.ForeignKey('prescriptions.id'), nullable=False)
    pharmacy_id = db.Column(db.Integer, db.ForeignKey('pharmacies.id'), nullable=True)
    
    # Refill Details
    refill_date = db.Column(db.Date, nullable=False)
    refill_number = db.Column(db.Integer, nullable=False)
    quantity_dispensed = db.Column(db.Integer, nullable=False)
    
    # System Fields
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    dispensed_by = db.Column(db.Integer, db.ForeignKey('user_accounts.id'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'prescription_id': self.prescription_id,
            'refill_date': self.refill_date.isoformat() if self.refill_date else None,
            'refill_number': self.refill_number,
            'quantity_dispensed': self.quantity_dispensed,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class EPCSAuditLog(db.Model):
    """EPCS Audit Log for DEA compliance"""
    __tablename__ = 'epcs_audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    log_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    
    # Provider and Patient
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=True)
    
    # Action Details
    action = db.Column(db.String(100), nullable=False)  # DEA Verification, Patient Identity Verification, EPCS Prescription Created
    details = db.Column(db.Text)  # JSON string for additional details
    
    # Status
    success = db.Column(db.Boolean, default=True)
    error_message = db.Column(db.Text)
    
    # Timestamp
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    provider = db.relationship('Provider', backref='epcs_audit_logs', lazy=True)
    patient = db.relationship('Patient', backref='epcs_audit_logs', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'log_id': self.log_id,
            'provider_id': self.provider_id,
            'patient_id': self.patient_id,
            'action': self.action,
            'details': json.loads(self.details) if self.details else None,
            'success': self.success,
            'error_message': self.error_message,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }

