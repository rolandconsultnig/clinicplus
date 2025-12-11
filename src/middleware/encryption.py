"""
Encryption Middleware for HIPAA Compliance
PHI Encryption at Rest and in Transit
"""
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import base64
import os
import hashlib
from flask import current_app

class PHIEncryption:
    """PHI Encryption Handler for HIPAA Compliance"""
    
    _instance = None
    _cipher = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(PHIEncryption, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        """Initialize encryption with key from environment or generate new"""
        # Get encryption key from environment or config
        encryption_key = os.environ.get('PHI_ENCRYPTION_KEY')
        
        if not encryption_key:
            # Generate a key if not exists (for development)
            # In production, this should be set via environment variable
            key = Fernet.generate_key()
            encryption_key = key.decode()
            print("WARNING: Generated new encryption key. Set PHI_ENCRYPTION_KEY environment variable in production!")
        
        try:
            if isinstance(encryption_key, str):
                encryption_key = encryption_key.encode()
            self._cipher = Fernet(encryption_key)
        except Exception as e:
            print(f"Error initializing encryption: {e}")
            # Fallback: generate new key
            key = Fernet.generate_key()
            self._cipher = Fernet(key)
    
    def encrypt(self, data):
        """Encrypt PHI data"""
        if data is None:
            return None
        
        try:
            if isinstance(data, str):
                data_bytes = data.encode('utf-8')
            else:
                data_bytes = str(data).encode('utf-8')
            
            encrypted = self._cipher.encrypt(data_bytes)
            return base64.b64encode(encrypted).decode('utf-8')
        except Exception as e:
            print(f"Encryption error: {e}")
            return None
    
    def decrypt(self, encrypted_data):
        """Decrypt PHI data"""
        if encrypted_data is None:
            return None
        
        try:
            encrypted_bytes = base64.b64decode(encrypted_data.encode('utf-8'))
            decrypted = self._cipher.decrypt(encrypted_bytes)
            return decrypted.decode('utf-8')
        except Exception as e:
            print(f"Decryption error: {e}")
            return None
    
    def encrypt_dict(self, data_dict, phi_fields=None):
        """Encrypt PHI fields in a dictionary"""
        if not data_dict or not isinstance(data_dict, dict):
            return data_dict
        
        # Default PHI fields
        if phi_fields is None:
            phi_fields = [
                'ssn', 'social_security', 'nin', 'date_of_birth', 'dob',
                'phone', 'phone_primary', 'phone_secondary', 'phone_cell',
                'email', 'address', 'address_line1', 'address_line2',
                'insurance_id', 'policy_number', 'group_number',
                'credit_card', 'card_number', 'cvv', 'password', 'pin',
                'mothersname', 'guardiansname', 'emergency_contact'
            ]
        
        encrypted_dict = {}
        for key, value in data_dict.items():
            key_lower = key.lower()
            if any(phi_field in key_lower for phi_field in phi_fields):
                if value:
                    encrypted_dict[key] = self.encrypt(value)
                    encrypted_dict[f'{key}_encrypted'] = True
                else:
                    encrypted_dict[key] = value
            elif isinstance(value, dict):
                encrypted_dict[key] = self.encrypt_dict(value, phi_fields)
            elif isinstance(value, list):
                encrypted_dict[key] = [
                    self.encrypt_dict(item, phi_fields) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                encrypted_dict[key] = value
        
        return encrypted_dict
    
    def decrypt_dict(self, encrypted_dict, phi_fields=None):
        """Decrypt PHI fields in a dictionary"""
        if not encrypted_dict or not isinstance(encrypted_dict, dict):
            return encrypted_dict
        
        if phi_fields is None:
            phi_fields = [
                'ssn', 'social_security', 'nin', 'date_of_birth', 'dob',
                'phone', 'phone_primary', 'phone_secondary', 'phone_cell',
                'email', 'address', 'address_line1', 'address_line2',
                'insurance_id', 'policy_number', 'group_number',
                'credit_card', 'card_number', 'cvv', 'password', 'pin',
                'mothersname', 'guardiansname', 'emergency_contact'
            ]
        
        decrypted_dict = {}
        for key, value in encrypted_dict.items():
            if key.endswith('_encrypted'):
                continue
            
            key_lower = key.lower()
            if any(phi_field in key_lower for phi_field in phi_fields):
                if encrypted_dict.get(f'{key}_encrypted') and value:
                    decrypted_dict[key] = self.decrypt(value)
                else:
                    decrypted_dict[key] = value
            elif isinstance(value, dict):
                decrypted_dict[key] = self.decrypt_dict(value, phi_fields)
            elif isinstance(value, list):
                decrypted_dict[key] = [
                    self.decrypt_dict(item, phi_fields) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                decrypted_dict[key] = value
        
        return decrypted_dict

# Global instance
phi_encryption = PHIEncryption()

def encrypt_phi(data, phi_fields=None):
    """Convenience function to encrypt PHI"""
    if isinstance(data, dict):
        return phi_encryption.encrypt_dict(data, phi_fields)
    else:
        return phi_encryption.encrypt(data)

def decrypt_phi(data, phi_fields=None):
    """Convenience function to decrypt PHI"""
    if isinstance(data, dict):
        return phi_encryption.decrypt_dict(data, phi_fields)
    else:
        return phi_encryption.decrypt(data)

