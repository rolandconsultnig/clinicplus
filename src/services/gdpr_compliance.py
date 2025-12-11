"""
GDPR Compliance Service
EU General Data Protection Regulation compliance management
"""
from datetime import datetime, date, timedelta
from src.models.user import db
from src.models.gdpr import (
    GDPRConsent, GDPRDataRequest, GDPRDataProcessingActivity,
    GDPRBreach, GDPRDataRetentionPolicy
)
from src.models.patient import Patient
from src.models.clinical import ClinicalEncounter, LabResult
from src.models.prescribing import Prescription
from src.models.documents import Document
from src.models.auth import AuditLog
import json
import uuid
import os
import zipfile
import io

class GDPRComplianceService:
    """GDPR Compliance Management Service"""
    
    def create_consent(self, patient_id, consent_type, consent_purpose, legal_basis='consent'):
        """
        Create GDPR consent record
        
        Args:
            patient_id: Patient ID
            consent_type: Type of consent
            consent_purpose: Purpose of consent
            legal_basis: Legal basis for processing
        
        Returns:
            Tuple of (success, consent_id, consent_data)
        """
        try:
            consent = GDPRConsent(
                consent_id=f"CONSENT-{uuid.uuid4().hex[:12].upper()}",
                patient_id=patient_id,
                consent_type=consent_type,
                consent_purpose=consent_purpose,
                consent_method='explicit',
                is_granted=True,
                granted_at=datetime.utcnow(),
                legal_basis=legal_basis
            )
            
            db.session.add(consent)
            db.session.commit()
            
            return True, consent.consent_id, consent.to_dict()
            
        except Exception as e:
            db.session.rollback()
            return False, None, {'error': str(e)}
    
    def withdraw_consent(self, consent_id, patient_id):
        """Withdraw GDPR consent"""
        try:
            consent = GDPRConsent.query.filter_by(
                consent_id=consent_id,
                patient_id=patient_id,
                is_granted=True
            ).first()
            
            if not consent:
                return False, {'error': 'Consent not found or already withdrawn'}
            
            consent.is_granted = False
            consent.withdrawn_at = datetime.utcnow()
            
            db.session.commit()
            
            return True, consent.to_dict()
            
        except Exception as e:
            db.session.rollback()
            return False, {'error': str(e)}
    
    def create_data_request(self, patient_id, request_type, request_description=None):
        """
        Create GDPR data subject access request
        
        Args:
            patient_id: Patient ID
            request_type: access, rectification, erasure, portability, restriction, objection
            request_description: Optional description
        
        Returns:
            Tuple of (success, request_id, request_data)
        """
        try:
            request = GDPRDataRequest(
                request_id=f"DSR-{uuid.uuid4().hex[:12].upper()}",
                patient_id=patient_id,
                request_type=request_type,
                request_description=request_description,
                status='pending',
                submitted_at=datetime.utcnow()
            )
            
            db.session.add(request)
            db.session.commit()
            
            return True, request.request_id, request.to_dict()
            
        except Exception as e:
            db.session.rollback()
            return False, None, {'error': str(e)}
    
    def process_data_access_request(self, request_id):
        """Process data access request - export all patient data"""
        try:
            request = GDPRDataRequest.query.filter_by(request_id=request_id).first()
            if not request:
                return False, {'error': 'Request not found'}
            
            patient = Patient.query.get(request.patient_id)
            if not patient:
                return False, {'error': 'Patient not found'}
            
            # Collect all patient data
            data_export = {
                'patient_id': patient.id,
                'export_date': datetime.utcnow().isoformat(),
                'demographics': patient.to_dict(),
                'medical_history': [],
                'allergies': [],
                'medications': [],
                'encounters': [],
                'lab_results': [],
                'prescriptions': [],
                'documents': [],
                'consents': [],
                'audit_logs': []
            }
            
            # Medical history
            from src.models.patient import MedicalHistory
            medical_history = MedicalHistory.query.filter_by(patient_id=patient.id).all()
            data_export['medical_history'] = [mh.to_dict() if hasattr(mh, 'to_dict') else {} for mh in medical_history]
            
            # Allergies
            from src.models.patient import Allergy
            allergies = Allergy.query.filter_by(patient_id=patient.id).all()
            data_export['allergies'] = [a.to_dict() if hasattr(a, 'to_dict') else {} for a in allergies]
            
            # Medications
            from src.models.patient import Medication
            medications = Medication.query.filter_by(patient_id=patient.id).all()
            data_export['medications'] = [m.to_dict() if hasattr(m, 'to_dict') else {} for m in medications]
            
            # Encounters
            encounters = ClinicalEncounter.query.filter_by(patient_id=patient.id).all()
            data_export['encounters'] = [e.to_dict() if hasattr(e, 'to_dict') else {} for e in encounters]
            
            # Lab results
            lab_results = LabResult.query.filter_by(patient_id=patient.id).all()
            data_export['lab_results'] = [lr.to_dict() if hasattr(lr, 'to_dict') else {} for lr in lab_results]
            
            # Prescriptions
            prescriptions = Prescription.query.filter_by(patient_id=patient.id).all()
            data_export['prescriptions'] = [p.to_dict() if hasattr(p, 'to_dict') else {} for p in prescriptions]
            
            # Documents
            documents = Document.query.filter_by(patient_id=patient.id).all()
            data_export['documents'] = [d.to_dict() if hasattr(d, 'to_dict') else {} for d in documents]
            
            # Consents
            consents = GDPRConsent.query.filter_by(patient_id=patient.id).all()
            data_export['consents'] = [c.to_dict() for c in consents]
            
            # Audit logs
            audit_logs = AuditLog.query.filter_by(patient_id=patient.id).limit(1000).all()
            data_export['audit_logs'] = [al.to_dict() if hasattr(al, 'to_dict') else {} for al in audit_logs]
            
            # Update request
            request.response_data = json.dumps(data_export)
            request.status = 'completed'
            request.completed_at = datetime.utcnow()
            
            # Save export file
            export_dir = os.path.join(os.getcwd(), 'exports', 'gdpr')
            os.makedirs(export_dir, exist_ok=True)
            export_file = os.path.join(export_dir, f"{request.request_id}.json")
            
            with open(export_file, 'w', encoding='utf-8') as f:
                json.dump(data_export, f, indent=2, default=str)
            
            request.response_file_path = export_file
            db.session.commit()
            
            return True, {
                'request_id': request.request_id,
                'export_data': data_export,
                'file_path': export_file
            }
            
        except Exception as e:
            db.session.rollback()
            return False, {'error': str(e)}
    
    def process_data_erasure_request(self, request_id):
        """Process right to erasure (right to be forgotten)"""
        try:
            request = GDPRDataRequest.query.filter_by(request_id=request_id).first()
            if not request:
                return False, {'error': 'Request not found'}
            
            patient_id = request.patient_id
            
            # Check if erasure is legally allowed
            # Cannot erase if data is needed for legal obligations, medical care, etc.
            can_erase, reason = self._can_erase_patient_data(patient_id)
            
            if not can_erase:
                request.status = 'rejected'
                request.response_data = json.dumps({'reason': reason})
                db.session.commit()
                return False, {'error': reason}
            
            # Anonymize patient data instead of deleting (safer approach)
            patient = Patient.query.get(patient_id)
            if patient:
                # Anonymize identifying information
                patient.first_name = '[ANONYMIZED]'
                patient.last_name = '[ANONYMIZED]'
                patient.email = None
                patient.phone_primary = None
                patient.ssn = None
                patient.nin = None
                patient.address_line1 = None
                patient.city = None
                patient.state = None
                patient.zip_code = None
                patient.is_active = False
            
            request.status = 'completed'
            request.completed_at = datetime.utcnow()
            request.response_data = json.dumps({
                'status': 'anonymized',
                'message': 'Patient data has been anonymized in accordance with GDPR'
            })
            
            db.session.commit()
            
            return True, {'status': 'anonymized', 'patient_id': patient_id}
            
        except Exception as e:
            db.session.rollback()
            return False, {'error': str(e)}
    
    def _can_erase_patient_data(self, patient_id):
        """Check if patient data can be erased"""
        # Check for active encounters
        active_encounters = ClinicalEncounter.query.filter_by(
            patient_id=patient_id,
            encounter_status='in_progress'
        ).count()
        
        if active_encounters > 0:
            return False, 'Patient has active encounters'
        
        # Check for legal retention requirements
        # Medical records typically must be retained for 7+ years
        # This is a simplified check - in production, would check retention policies
        
        return True, 'Erasure allowed'
    
    def record_breach(self, breach_type, breach_description, breach_date, affected_data_categories, affected_data_subjects):
        """Record GDPR personal data breach"""
        try:
            breach = GDPRBreach(
                breach_id=f"BREACH-{uuid.uuid4().hex[:12].upper()}",
                breach_type=breach_type,
                breach_description=breach_description,
                breach_date=breach_date,
                discovered_at=datetime.utcnow(),
                affected_data_categories=json.dumps(affected_data_categories),
                affected_data_subjects=affected_data_subjects,
                status='reported'
            )
            
            db.session.add(breach)
            db.session.commit()
            
            # Determine if notification is required (within 72 hours for high risk)
            if breach.risk_level == 'high':
                breach.supervisory_authority_notified = True
                breach.supervisory_authority_notified_at = datetime.utcnow()
                db.session.commit()
            
            return True, breach.to_dict()
            
        except Exception as e:
            db.session.rollback()
            return False, {'error': str(e)}
    
    def get_data_retention_status(self, patient_id):
        """Get data retention status for a patient"""
        try:
            patient = Patient.query.get(patient_id)
            if not patient:
                return False, {'error': 'Patient not found'}
            
            # Get applicable retention policies
            policies = GDPRDataRetentionPolicy.query.filter_by(is_active=True).all()
            
            retention_status = {
                'patient_id': patient_id,
                'policies': [p.to_dict() for p in policies],
                'data_categories': {}
            }
            
            # Check retention for each data category
            for policy in policies:
                category = policy.data_category
                retention_years = policy.retention_period_years
                
                # Calculate retention end date
                if category == 'medical_records':
                    # Use patient's last encounter date or creation date
                    last_encounter = ClinicalEncounter.query.filter_by(
                        patient_id=patient_id
                    ).order_by(ClinicalEncounter.encounter_date.desc()).first()
                    
                    if last_encounter:
                        retention_end = last_encounter.encounter_date + timedelta(days=retention_years * 365)
                    else:
                        retention_end = patient.created_at.date() + timedelta(days=retention_years * 365) if patient.created_at else None
                    
                    retention_status['data_categories'][category] = {
                        'retention_years': retention_years,
                        'retention_end_date': retention_end.isoformat() if retention_end else None,
                        'can_be_deleted': retention_end < date.today() if retention_end else False
                    }
            
            return True, retention_status
            
        except Exception as e:
            return False, {'error': str(e)}

# Global instance
gdpr_service = GDPRComplianceService()

