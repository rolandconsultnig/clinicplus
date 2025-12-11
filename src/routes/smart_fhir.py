"""
SMART on FHIR Routes
Enhanced SMART on FHIR OAuth 2.0 implementation
"""
from flask import Blueprint, request, jsonify, redirect, session, url_for
from src.auth.jwt_manager import token_required
from src.services.smart_fhir import smart_fhir_service
from src.models.user import db
from src.models.auth import UserAccount
from urllib.parse import urlencode, parse_qs
import base64
import hashlib

smart_bp = Blueprint('smart_fhir', __name__)

@smart_bp.route('/fhir/R4/.well-known/smart-configuration', methods=['GET'])
def smart_configuration():
    """SMART on FHIR configuration endpoint"""
    try:
        base_url = request.host_url.rstrip('/')
        config = smart_fhir_service.get_smart_configuration(base_url)
        
        return jsonify(config), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@smart_bp.route('/fhir/R4/auth/authorize', methods=['GET', 'POST'])
def authorize():
    """SMART on FHIR OAuth 2.0 authorization endpoint"""
    try:
        if request.method == 'GET':
            # Get authorization parameters
            client_id = request.args.get('client_id')
            redirect_uri = request.args.get('redirect_uri')
            scope = request.args.get('scope', '')
            state = request.args.get('state')
            response_type = request.args.get('response_type', 'code')
            code_challenge = request.args.get('code_challenge')
            code_challenge_method = request.args.get('code_challenge_method', 'S256')
            
            if not client_id or not redirect_uri:
                return jsonify({
                    'error': 'invalid_request',
                    'error_description': 'client_id and redirect_uri are required'
                }), 400
            
            # Store authorization request in session
            session['smart_auth'] = {
                'client_id': client_id,
                'redirect_uri': redirect_uri,
                'scope': scope,
                'state': state,
                'response_type': response_type,
                'code_challenge': code_challenge,
                'code_challenge_method': code_challenge_method
            }
            
            # If user is already authenticated, auto-approve
            if hasattr(request, 'current_user') and request.current_user:
                return _process_authorization(request.current_user.id)
            
            # Otherwise, return authorization page (in production, would redirect to login)
            return jsonify({
                'authorization_required': True,
                'client_id': client_id,
                'scope': scope,
                'message': 'User authorization required. Please login and grant permissions.'
            }), 200
        
        elif request.method == 'POST':
            # Handle authorization approval
            data = request.get_json()
            user_id = data.get('user_id')
            approved = data.get('approved', False)
            
            if not approved:
                auth_data = session.get('smart_auth', {})
                redirect_uri = auth_data.get('redirect_uri', '')
                state = auth_data.get('state')
                
                error_params = {
                    'error': 'access_denied',
                    'error_description': 'User denied authorization'
                }
                if state:
                    error_params['state'] = state
                
                return redirect(f"{redirect_uri}?{urlencode(error_params)}")
            
            return _process_authorization(user_id)
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def _process_authorization(user_id):
    """Process authorization and redirect with code"""
    try:
        auth_data = session.get('smart_auth', {})
        
        if not auth_data:
            return jsonify({'error': 'Authorization request not found'}), 400
        
        client_id = auth_data['client_id']
        redirect_uri = auth_data['redirect_uri']
        scope = auth_data['scope']
        state = auth_data.get('state')
        
        # Generate authorization code
        code = smart_fhir_service.generate_authorization_code(
            client_id=client_id,
            redirect_uri=redirect_uri,
            scope=scope,
            user_id=user_id,
            state=state
        )
        
        # Build redirect URL
        params = {'code': code}
        if state:
            params['state'] = state
        
        redirect_url = f"{redirect_uri}?{urlencode(params)}"
        
        return redirect(redirect_url)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@smart_bp.route('/fhir/R4/auth/token', methods=['POST'])
def token():
    """SMART on FHIR OAuth 2.0 token endpoint"""
    try:
        # Get grant type
        grant_type = request.form.get('grant_type') or request.json.get('grant_type') if request.is_json else None
        
        if grant_type == 'authorization_code':
            # Authorization code flow
            code = request.form.get('code') or (request.json.get('code') if request.is_json else None)
            client_id = request.form.get('client_id') or (request.json.get('client_id') if request.is_json else None)
            redirect_uri = request.form.get('redirect_uri') or (request.json.get('redirect_uri') if request.is_json else None)
            code_verifier = request.form.get('code_verifier') or (request.json.get('code_verifier') if request.is_json else None)
            
            if not code or not client_id or not redirect_uri:
                return jsonify({
                    'error': 'invalid_request',
                    'error_description': 'code, client_id, and redirect_uri are required'
                }), 400
            
            # Verify PKCE if code_challenge was provided
            # (Simplified - in production, would check against stored code_challenge)
            
            success, result = smart_fhir_service.exchange_authorization_code(
                code=code,
                client_id=client_id,
                redirect_uri=redirect_uri
            )
            
            if success:
                return jsonify(result), 200
            else:
                return jsonify(result), 400
        
        elif grant_type == 'refresh_token':
            # Refresh token flow
            refresh_token = request.form.get('refresh_token') or (request.json.get('refresh_token') if request.is_json else None)
            client_id = request.form.get('client_id') or (request.json.get('client_id') if request.is_json else None)
            
            if not refresh_token or not client_id:
                return jsonify({
                    'error': 'invalid_request',
                    'error_description': 'refresh_token and client_id are required'
                }), 400
            
            success, result = smart_fhir_service.refresh_access_token(
                refresh_token=refresh_token,
                client_id=client_id
            )
            
            if success:
                return jsonify(result), 200
            else:
                return jsonify(result), 400
        
        else:
            return jsonify({
                'error': 'unsupported_grant_type',
                'error_description': f'Grant type {grant_type} not supported'
            }), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@smart_bp.route('/fhir/R4/auth/introspect', methods=['POST'])
@token_required
def introspect():
    """SMART on FHIR token introspection endpoint"""
    try:
        token = request.form.get('token') or (request.json.get('token') if request.is_json else None)
        
        if not token:
            return jsonify({
                'active': False,
                'error': 'invalid_request'
            }), 400
        
        is_valid, token_data = smart_fhir_service.validate_access_token(token)
        
        if is_valid:
            return jsonify({
                'active': True,
                'scope': token_data.get('scope', ''),
                'client_id': token_data.get('client_id', ''),
                'username': token_data.get('user_id', ''),
                'exp': int(token_data.get('expires_at', datetime.utcnow()).timestamp()) if isinstance(token_data.get('expires_at'), datetime) else token_data.get('exp', 0)
            }), 200
        else:
            return jsonify({
                'active': False
            }), 200
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@smart_bp.route('/fhir/R4/auth/userinfo', methods=['GET'])
def userinfo():
    """SMART on FHIR userinfo endpoint (OpenID Connect)"""
    try:
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({
                'error': 'invalid_request',
                'error_description': 'Bearer token required'
            }), 401
        
        token = auth_header[7:]  # Remove 'Bearer ' prefix
        
        is_valid, token_data = smart_fhir_service.validate_access_token(token)
        
        if not is_valid:
            return jsonify({
                'error': 'invalid_token',
                'error_description': 'Token is invalid or expired'
            }), 401
        
        user_id = token_data.get('user_id')
        user = UserAccount.query.get(user_id)
        
        if not user:
            return jsonify({
                'error': 'invalid_token',
                'error_description': 'User not found'
            }), 401
        
        # Return userinfo
        userinfo_data = {
            'sub': f"Patient/{user_id}",
            'name': user.username,
            'email': user.email,
            'preferred_username': user.username
        }
        
        return jsonify(userinfo_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@smart_bp.route('/fhir/R4/register', methods=['POST'])
def register():
    """SMART on FHIR dynamic client registration"""
    try:
        data = request.get_json()
        
        # Extract registration parameters
        client_name = data.get('client_name')
        redirect_uris = data.get('redirect_uris', [])
        scope = data.get('scope', '')
        grant_types = data.get('grant_types', ['authorization_code'])
        response_types = data.get('response_types', ['code'])
        
        if not client_name or not redirect_uris:
            return jsonify({
                'error': 'invalid_client_metadata',
                'error_description': 'client_name and redirect_uris are required'
            }), 400
        
        # Generate client credentials
        import secrets
        client_id = f"client_{secrets.token_urlsafe(16)}"
        client_secret = secrets.token_urlsafe(32)
        
        # In production, would store in database
        # For now, return registration response
        
        return jsonify({
            'client_id': client_id,
            'client_secret': client_secret,
            'client_id_issued_at': int(datetime.utcnow().timestamp()),
            'redirect_uris': redirect_uris,
            'grant_types': grant_types,
            'response_types': response_types,
            'scope': scope,
            'token_endpoint_auth_method': 'client_secret_basic'
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

