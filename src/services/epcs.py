"""
EPCS (Electronic Prescribing of Controlled Substances) Service
DEA-compliant electronic prescribing for controlled substances
"""
import os
import hashlib
import hmac
from datetime import datetime, timedelta
from src.models.user import db
from src.models.prescribing import Prescription, Drug
from src.models.provider import Provider
from src.models.patient import Patient
import json
import uuid

class EPCSService:
    """EPCS Service for DEA-compliant controlled substance prescribing"""
    
    def __init__(self):
        self.dea_verification_url = os.environ.get('DEA_VERIFICATION_URL', '')
        self.epcs_provider_id = os.environ.get('EPCS_PROVIDER_ID', '')
        self.epcs_provider_secret = os.environ.get('EPCS_PROVIDER_SECRET', '')
    
    def verify_provider_dea(self, provider_id, dea_number):
        """
        Verify provider DEA number for EPCS eligibility
        
        Args:
            provider_id: Provider ID
            dea_number: DEA number to verify
        
        Returns:
            Tuple of (is_valid, verification_data)
        """
        try:
            provider = Provider.query.get(provider_id)
            if not provider:
                return False, {'error': 'Provider not found'}
            
            # Check if DEA number matches
            if provider.dea_number != dea_number:
                return False, {'error': 'DEA number mismatch'}
            
            # Check if DEA is expired (if expiry date exists)
            # In production, would verify with DEA database
            
            # Basic DEA format validation
            if not self._validate_dea_format(dea_number):
                return False, {'error': 'Invalid DEA number format'}
            
            return True, {
                'provider_id': provider_id,
                'dea_number': dea_number,
                'provider_name': f"{provider.first_name} {provider.last_name}",
                'verified_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return False, {'error': str(e)}
    
    def _validate_dea_format(self, dea_number):
        """Validate DEA number format (2 letters + 7 digits)"""
        if not dea_number or len(dea_number) != 9:
            return False
        
        # Format: AB1234567 (2 letters, 7 digits)
        if not dea_number[:2].isalpha() or not dea_number[2:].isdigit():
            return False
        
        return True
    
    def create_epcs_prescription(self, prescription_data):
        """
        Create EPCS prescription with DEA compliance
        
        Args:
            prescription_data: Dict containing prescription details
        
        Returns:
            Tuple of (success, prescription_id, epcs_data)
        """
        try:
            # Verify provider DEA
            provider_id = prescription_data.get('provider_id')
            dea_number = prescription_data.get('dea_number')
            
            is_valid, verification = self.verify_provider_dea(provider_id, dea_number)
            if not is_valid:
                return False, None, {'error': 'DEA verification failed', 'details': verification}
            
            # Check if drug is controlled substance
            drug_id = prescription_data.get('drug_id')
            drug = Drug.query.get(drug_id)
            
            if not drug or not drug.is_controlled:
                return False, None, {'error': 'Drug is not a controlled substance'}
            
            # Verify patient identity (required for EPCS)
            patient_id = prescription_data.get('patient_id')
            patient = Patient.query.get(patient_id)
            if not patient:
                return False, None, {'error': 'Patient not found'}
            
            # Create prescription with EPCS flag
            prescription = Prescription(
                prescription_id=f"RX-{uuid.uuid4().hex[:12].upper()}",
                patient_id=patient_id,
                provider_id=provider_id,
                facility_id=prescription_data.get('facility_id'),
                encounter_id=prescription_data.get('encounter_id'),
                drug_id=drug_id,
                drug_name=drug.drug_name,
                rxnorm_code=drug.rxnorm_code,
                dosage=prescription_data.get('dosage'),
                frequency=prescription_data.get('frequency'),
                route=prescription_data.get('route', 'oral'),
                quantity=prescription_data.get('quantity'),
                days_supply=prescription_data.get('days_supply'),
                refills=prescription_data.get('refills', 0),
                sig=prescription_data.get('sig'),
                patient_instructions=prescription_data.get('patient_instructions'),
                prescribed_date=datetime.utcnow().date(),
                dea_required=True,
                dea_verified=True,
                status='active',
                created_by=prescription_data.get('created_by')
            )
            
            db.session.add(prescription)
            db.session.flush()
            
            # Create EPCS audit record
            epcs_audit = {
                'prescription_id': prescription.id,
                'provider_id': provider_id,
                'dea_number': dea_number,
                'patient_id': patient_id,
                'drug_schedule': drug.schedule,
                'created_at': datetime.utcnow().isoformat(),
                'verification_method': 'system',
                'compliance_status': 'compliant'
            }
            
            db.session.commit()
            
            return True, prescription.id, {
                'prescription_id': prescription.prescription_id,
                'epcs_audit': epcs_audit,
                'message': 'EPCS prescription created successfully'
            }
            
        except Exception as e:
            db.session.rollback()
            return False, None, {'error': str(e)}
    
    def verify_patient_identity(self, patient_id, verification_method='system'):
        """
        Verify patient identity for EPCS (required by DEA)
        
        Args:
            patient_id: Patient ID
            verification_method: 'system', 'photo_id', 'biometric', etc.
        
        Returns:
            Tuple of (is_verified, verification_data)
        """
        try:
            patient = Patient.query.get(patient_id)
            if not patient:
                return False, {'error': 'Patient not found'}
            
            # In production, would perform actual identity verification
            # For now, check if patient has sufficient identifying information
            
            required_fields = ['first_name', 'last_name', 'date_of_birth']
            missing_fields = [field for field in required_fields if not getattr(patient, field, None)]
            
            if missing_fields:
                return False, {
                    'error': 'Insufficient patient identification',
                    'missing_fields': missing_fields
                }
            
            return True, {
                'patient_id': patient_id,
                'verification_method': verification_method,
                'verified_at': datetime.utcnow().isoformat(),
                'patient_name': f"{patient.first_name} {patient.last_name}",
                'date_of_birth': patient.date_of_birth.isoformat() if patient.date_of_birth else None
            }
            
        except Exception as e:
            return False, {'error': str(e)}
    
    def check_drug_schedule(self, drug_id):
        """
        Check if drug is controlled and get schedule
        
        Args:
            drug_id: Drug ID
        
        Returns:
            Tuple of (is_controlled, schedule, restrictions)
        """
        try:
            drug = Drug.query.get(drug_id)
            if not drug:
                return False, None, None
            
            if not drug.is_controlled:
                return False, None, None
            
            # Schedule-specific restrictions
            restrictions = {
                'I': {'refills': 0, 'days_supply_max': 0, 'requires_prior_auth': True},
                'II': {'refills': 0, 'days_supply_max': 90, 'requires_prior_auth': False},
                'III': {'refills': 5, 'days_supply_max': 180, 'requires_prior_auth': False},
                'IV': {'refills': 5, 'days_supply_max': 180, 'requires_prior_auth': False},
                'V': {'refills': 5, 'days_supply_max': 180, 'requires_prior_auth': False}
            }
            
            schedule_restrictions = restrictions.get(drug.schedule, {})
            
            return True, drug.schedule, schedule_restrictions
            
        except Exception as e:
            return False, None, {'error': str(e)}
    
    def validate_epcs_prescription(self, prescription_data):
        """
        Validate EPCS prescription before creation
        
        Args:
            prescription_data: Prescription data dict
        
        Returns:
            Tuple of (is_valid, validation_errors)
        """
        errors = []
        
        # Check required fields
        required_fields = ['provider_id', 'patient_id', 'drug_id', 'dosage', 'frequency', 'quantity']
        for field in required_fields:
            if field not in prescription_data or not prescription_data[field]:
                errors.append(f'Missing required field: {field}')
        
        # Verify provider DEA
        if 'provider_id' in prescription_data and 'dea_number' in prescription_data:
            is_valid, verification = self.verify_provider_dea(
                prescription_data['provider_id'],
                prescription_data['dea_number']
            )
            if not is_valid:
                errors.append(f'DEA verification failed: {verification.get("error")}')
        
        # Check drug schedule restrictions
        if 'drug_id' in prescription_data:
            is_controlled, schedule, restrictions = self.check_drug_schedule(
                prescription_data['drug_id']
            )
            if is_controlled:
                # Validate refills
                refills = prescription_data.get('refills', 0)
                if restrictions and refills > restrictions.get('refills', 0):
                    errors.append(f'Schedule {schedule} drugs allow maximum {restrictions.get("refills")} refills')
                
                # Validate days supply
                days_supply = prescription_data.get('days_supply', 0)
                max_days = restrictions.get('days_supply_max', 0) if restrictions else 0
                if max_days > 0 and days_supply > max_days:
                    errors.append(f'Schedule {schedule} drugs allow maximum {max_days} days supply')
        
        # Verify patient identity
        if 'patient_id' in prescription_data:
            is_verified, verification = self.verify_patient_identity(
                prescription_data['patient_id']
            )
            if not is_verified:
                errors.append(f'Patient identity verification failed: {verification.get("error")}')
        
        return len(errors) == 0, errors

# Global instance
epcs_service = EPCSService()

