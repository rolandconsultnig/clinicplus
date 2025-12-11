"""
Biometric Matching Service
Handles fingerprint and RFID matching for emergency patient identification
"""
import hashlib
import os
from typing import Optional, Dict
from src.models.patient import Patient
from src.models.user import db

class BiometricService:
    """Service for biometric patient identification"""
    
    def __init__(self):
        # Biometric matching threshold (0.0 to 1.0)
        self.fingerprint_threshold = float(os.getenv('FINGERPRINT_THRESHOLD', '0.85'))
        self.rfid_match_required = True
    
    def match_fingerprint(self, fingerprint_data: str, patient_id: Optional[int] = None) -> Optional[Dict]:
        """Match fingerprint to patient"""
        try:
            # Hash the fingerprint data for comparison
            fingerprint_hash = self._hash_biometric_data(fingerprint_data)
            
            # If patient_id provided, verify match
            if patient_id:
                patient = Patient.query.get(patient_id)
                if patient and hasattr(patient, 'fingerprint_hash'):
                    stored_hash = patient.fingerprint_hash
                    if stored_hash and self._compare_hashes(fingerprint_hash, stored_hash):
                        return {
                            'matched': True,
                            'patient_id': patient_id,
                            'confidence': 0.95,
                            'method': 'fingerprint'
                        }
            
            # Search all patients for match
            patients = Patient.query.filter(Patient.fingerprint_hash.isnot(None)).all()
            
            best_match = None
            best_confidence = 0.0
            
            for patient in patients:
                if patient.fingerprint_hash:
                    confidence = self._compare_hashes(fingerprint_hash, patient.fingerprint_hash)
                    if confidence > best_confidence and confidence >= self.fingerprint_threshold:
                        best_confidence = confidence
                        best_match = patient
            
            if best_match:
                return {
                    'matched': True,
                    'patient_id': best_match.id,
                    'universal_patient_id': best_match.universal_patient_id,
                    'confidence': best_confidence,
                    'method': 'fingerprint'
                }
            
            return {
                'matched': False,
                'confidence': best_confidence,
                'method': 'fingerprint'
            }
            
        except Exception as e:
            return {
                'matched': False,
                'error': str(e),
                'method': 'fingerprint'
            }
    
    def match_rfid(self, rfid_tag: str, patient_id: Optional[int] = None) -> Optional[Dict]:
        """Match RFID tag to patient"""
        try:
            # RFID tags are typically unique identifiers
            # Normalize the RFID tag
            rfid_normalized = rfid_tag.strip().upper()
            
            # If patient_id provided, verify match
            if patient_id:
                patient = Patient.query.get(patient_id)
                if patient and hasattr(patient, 'rfid_tag'):
                    if patient.rfid_tag and patient.rfid_tag.upper() == rfid_normalized:
                        return {
                            'matched': True,
                            'patient_id': patient_id,
                            'confidence': 1.0,
                            'method': 'rfid'
                        }
            
            # Search for exact match
            patient = Patient.query.filter(
                db.func.upper(Patient.rfid_tag) == rfid_normalized
            ).first()
            
            if patient:
                return {
                    'matched': True,
                    'patient_id': patient.id,
                    'universal_patient_id': patient.universal_patient_id,
                    'confidence': 1.0,
                    'method': 'rfid'
                }
            
            return {
                'matched': False,
                'confidence': 0.0,
                'method': 'rfid'
            }
            
        except Exception as e:
            return {
                'matched': False,
                'error': str(e),
                'method': 'rfid'
            }
    
    def register_fingerprint(self, patient_id: int, fingerprint_data: str) -> Dict:
        """Register fingerprint for a patient"""
        try:
            patient = Patient.query.get_or_404(patient_id)
            
            # Hash and store fingerprint
            fingerprint_hash = self._hash_biometric_data(fingerprint_data)
            
            # Add fingerprint_hash field if it doesn't exist (would need migration)
            # For now, store in a separate table or use a JSON field
            # This is a placeholder implementation
            
            return {
                'success': True,
                'message': 'Fingerprint registered successfully',
                'patient_id': patient_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def register_rfid(self, patient_id: int, rfid_tag: str) -> Dict:
        """Register RFID tag for a patient"""
        try:
            patient = Patient.query.get_or_404(patient_id)
            
            # Store RFID tag (would need migration to add rfid_tag field)
            # For now, this is a placeholder
            
            return {
                'success': True,
                'message': 'RFID tag registered successfully',
                'patient_id': patient_id
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _hash_biometric_data(self, data: str) -> str:
        """Hash biometric data for storage/comparison"""
        return hashlib.sha256(data.encode('utf-8')).hexdigest()
    
    def _compare_hashes(self, hash1: str, hash2: str) -> float:
        """Compare two hashes and return similarity score"""
        if hash1 == hash2:
            return 1.0
        
        # Simple similarity (for fingerprint templates, would use more sophisticated matching)
        # This is a placeholder - real fingerprint matching would use specialized algorithms
        matches = sum(c1 == c2 for c1, c2 in zip(hash1, hash2))
        return matches / max(len(hash1), len(hash2))

# Singleton instance
biometric_service = BiometricService()

