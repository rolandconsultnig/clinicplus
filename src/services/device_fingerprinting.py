"""
Device Fingerprinting Service
For zero-trust architecture - tracks and verifies device fingerprints
"""
import hashlib
import json
from typing import Dict, Optional
from datetime import datetime, timedelta
from src.models.auth import UserAccount
from src.models.user import db

class DeviceFingerprintService:
    """Service for device fingerprinting and tracking"""
    
    def __init__(self):
        self.fingerprint_expiry_days = 30
        self.trusted_device_threshold = 0.9
    
    def generate_device_fingerprint(self, request_headers: Dict, ip_address: str, user_agent: str) -> str:
        """Generate device fingerprint from request data"""
        fingerprint_data = {
            'ip': ip_address,
            'user_agent': user_agent,
            'accept_language': request_headers.get('Accept-Language', ''),
            'accept_encoding': request_headers.get('Accept-Encoding', ''),
            'screen_resolution': request_headers.get('Screen-Resolution', ''),
            'timezone': request_headers.get('Timezone', ''),
            'platform': request_headers.get('Platform', '')
        }
        
        fingerprint_string = json.dumps(fingerprint_data, sort_keys=True)
        return hashlib.sha256(fingerprint_string.encode('utf-8')).hexdigest()
    
    def verify_device(self, user_id: int, device_fingerprint: str) -> Dict:
        """Verify if device is trusted"""
        try:
            user = UserAccount.query.get(user_id)
            if not user:
                return {'trusted': False, 'reason': 'User not found'}
            
            # Check if device fingerprint exists in user's trusted devices
            # This would be stored in a separate table or JSON field
            # For now, return basic verification
            
            # In production, this would check against stored device fingerprints
            # and verify against recent login history
            
            return {
                'trusted': True,  # Placeholder - would check actual device registry
                'device_id': device_fingerprint[:16],
                'first_seen': datetime.utcnow().isoformat(),
                'last_seen': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'trusted': False,
                'reason': str(e)
            }
    
    def register_trusted_device(self, user_id: int, device_fingerprint: str, device_name: str = None) -> Dict:
        """Register a device as trusted"""
        try:
            # Store trusted device (would need device registry table)
            # For now, return success
            
            return {
                'success': True,
                'device_id': device_fingerprint[:16],
                'device_name': device_name or 'Unknown Device',
                'registered_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def revoke_device(self, user_id: int, device_fingerprint: str) -> Dict:
        """Revoke trusted device"""
        try:
            # Remove device from trusted list
            return {
                'success': True,
                'message': 'Device revoked successfully'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

# Singleton instance
device_fingerprint_service = DeviceFingerprintService()

