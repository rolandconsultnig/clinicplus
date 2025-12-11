"""
SMART on FHIR Service
Enhanced SMART on FHIR implementation with OAuth 2.0 and OpenID Connect
"""
import os
import jwt
import secrets
from datetime import datetime, timedelta
from flask import request, url_for
from src.models.user import db
from src.models.auth import UserAccount
import hashlib
import base64

class SMARTonFHIRService:
    """SMART on FHIR OAuth 2.0 Service"""
    
    def __init__(self):
        self.client_secret = os.environ.get('SMART_FHIR_CLIENT_SECRET', secrets.token_urlsafe(32))
        self.authorization_code_expiry = timedelta(minutes=10)
        self.access_token_expiry = timedelta(hours=1)
        self.refresh_token_expiry = timedelta(days=30)
        
        # In-memory storage (in production, use Redis or database)
        self.authorization_codes = {}
        self.access_tokens = {}
        self.refresh_tokens = {}
    
    def generate_authorization_code(self, client_id, redirect_uri, scope, user_id, state=None):
        """
        Generate authorization code for OAuth 2.0 authorization code flow
        
        Args:
            client_id: Client application ID
            redirect_uri: Redirect URI
            scope: Requested scopes
            user_id: User ID
            state: Optional state parameter
        
        Returns:
            Authorization code
        """
        code = secrets.token_urlsafe(32)
        
        self.authorization_codes[code] = {
            'client_id': client_id,
            'redirect_uri': redirect_uri,
            'scope': scope,
            'user_id': user_id,
            'state': state,
            'created_at': datetime.utcnow(),
            'expires_at': datetime.utcnow() + self.authorization_code_expiry
        }
        
        return code
    
    def exchange_authorization_code(self, code, client_id, redirect_uri):
        """
        Exchange authorization code for access token
        
        Args:
            code: Authorization code
            client_id: Client ID
            redirect_uri: Redirect URI
        
        Returns:
            Tuple of (success, access_token_data)
        """
        auth_code_data = self.authorization_codes.get(code)
        
        if not auth_code_data:
            return False, {'error': 'invalid_grant', 'error_description': 'Authorization code not found'}
        
        if datetime.utcnow() > auth_code_data['expires_at']:
            del self.authorization_codes[code]
            return False, {'error': 'invalid_grant', 'error_description': 'Authorization code expired'}
        
        if auth_code_data['client_id'] != client_id:
            return False, {'error': 'invalid_client', 'error_description': 'Client ID mismatch'}
        
        if auth_code_data['redirect_uri'] != redirect_uri:
            return False, {'error': 'invalid_grant', 'error_description': 'Redirect URI mismatch'}
        
        # Generate access token
        access_token = self._generate_access_token(
            user_id=auth_code_data['user_id'],
            client_id=client_id,
            scope=auth_code_data['scope']
        )
        
        # Generate refresh token
        refresh_token = self._generate_refresh_token(
            user_id=auth_code_data['user_id'],
            client_id=client_id
        )
        
        # Remove used authorization code
        del self.authorization_codes[code]
        
        return True, {
            'access_token': access_token['token'],
            'token_type': 'Bearer',
            'expires_in': int(self.access_token_expiry.total_seconds()),
            'scope': auth_code_data['scope'],
            'refresh_token': refresh_token['token'],
            'patient': f"Patient/{auth_code_data['user_id']}" if auth_code_data.get('scope', '').find('patient') != -1 else None
        }
    
    def _generate_access_token(self, user_id, client_id, scope):
        """Generate JWT access token"""
        user = UserAccount.query.get(user_id)
        if not user:
            return None
        
        now = datetime.utcnow()
        payload = {
            'iss': request.host_url.rstrip('/') + '/fhir/R4',
            'sub': f"Patient/{user_id}",
            'aud': client_id,
            'exp': int((now + self.access_token_expiry).timestamp()),
            'iat': int(now.timestamp()),
            'scope': scope,
            'client_id': client_id,
            'user_id': user_id,
            'user_type': user.user_type
        }
        
        token = jwt.encode(payload, self.client_secret, algorithm='HS256')
        
        token_data = {
            'token': token,
            'user_id': user_id,
            'client_id': client_id,
            'scope': scope,
            'expires_at': now + self.access_token_expiry
        }
        
        self.access_tokens[token] = token_data
        
        return token_data
    
    def _generate_refresh_token(self, user_id, client_id):
        """Generate refresh token"""
        token = secrets.token_urlsafe(32)
        
        token_data = {
            'token': token,
            'user_id': user_id,
            'client_id': client_id,
            'expires_at': datetime.utcnow() + self.refresh_token_expiry
        }
        
        self.refresh_tokens[token] = token_data
        
        return token_data
    
    def refresh_access_token(self, refresh_token, client_id):
        """
        Refresh access token using refresh token
        
        Args:
            refresh_token: Refresh token
            client_id: Client ID
        
        Returns:
            Tuple of (success, access_token_data)
        """
        token_data = self.refresh_tokens.get(refresh_token)
        
        if not token_data:
            return False, {'error': 'invalid_grant', 'error_description': 'Refresh token not found'}
        
        if datetime.utcnow() > token_data['expires_at']:
            del self.refresh_tokens[refresh_token]
            return False, {'error': 'invalid_grant', 'error_description': 'Refresh token expired'}
        
        if token_data['client_id'] != client_id:
            return False, {'error': 'invalid_client', 'error_description': 'Client ID mismatch'}
        
        # Generate new access token
        access_token = self._generate_access_token(
            user_id=token_data['user_id'],
            client_id=client_id,
            scope='patient/*.read user/*.read'  # Default scope
        )
        
        return True, {
            'access_token': access_token['token'],
            'token_type': 'Bearer',
            'expires_in': int(self.access_token_expiry.total_seconds()),
            'scope': access_token['scope']
        }
    
    def validate_access_token(self, access_token):
        """
        Validate access token
        
        Args:
            access_token: Access token
        
        Returns:
            Tuple of (is_valid, token_payload)
        """
        # Check in-memory storage
        token_data = self.access_tokens.get(access_token)
        if token_data:
            if datetime.utcnow() > token_data['expires_at']:
                del self.access_tokens[access_token]
                return False, None
            return True, token_data
        
        # Try to decode JWT
        try:
            payload = jwt.decode(access_token, self.client_secret, algorithms=['HS256'])
            return True, payload
        except jwt.ExpiredSignatureError:
            return False, None
        except jwt.InvalidTokenError:
            return False, None
    
    def get_smart_configuration(self, base_url):
        """Get SMART on FHIR configuration"""
        return {
            'issuer': base_url + '/fhir/R4',
            'authorization_endpoint': base_url + '/fhir/R4/auth/authorize',
            'token_endpoint': base_url + '/fhir/R4/auth/token',
            'registration_endpoint': base_url + '/fhir/R4/register',
            'scopes_supported': [
                'openid',
                'profile',
                'fhirUser',
                'launch',
                'launch/patient',
                'patient/*.read',
                'patient/*.write',
                'user/*.read',
                'user/*.write',
                'system/*.read',
                'system/*.write',
                'offline_access'
            ],
            'response_types_supported': ['code', 'token'],
            'response_modes_supported': ['query', 'fragment'],
            'grant_types_supported': ['authorization_code', 'refresh_token'],
            'code_challenge_methods_supported': ['S256'],
            'capabilities': [
                'launch-standalone',
                'launch-ehr',
                'client-confidential-symmetric',
                'client-public',
                'client-confidential-asymmetric',
                'sso-openid-connect',
                'context-standalone-patient',
                'context-standalone-encounter',
                'context-ehr-patient',
                'context-ehr-encounter',
                'permission-offline',
                'permission-patient',
                'permission-user'
            ],
            'token_endpoint_auth_methods_supported': [
                'client_secret_basic',
                'client_secret_post',
                'private_key_jwt'
            ]
        }

# Global instance
smart_fhir_service = SMARTonFHIRService()

