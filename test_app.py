#!/usr/bin/env python3
"""
Simple Flask test application for MedConnect
Tests basic functionality without complex database models
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import os

# Create Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for frontend-backend communication

# Basic configuration
app.config['SECRET_KEY'] = 'test-secret-key-for-development'

# Test routes
@app.route('/', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'MedConnect API is running',
        'version': '1.0.0'
    }), 200

@app.route('/api/test', methods=['GET'])
def api_test():
    """API test endpoint"""
    return jsonify({
        'success': True,
        'message': 'API is working correctly',
        'endpoints': [
            '/api/test',
            '/api/auth/login',
            '/api/patients',
            '/api/providers'
        ]
    }), 200

@app.route('/api/auth/login', methods=['POST'])
def mock_login():
    """Mock login endpoint for testing"""
    data = request.get_json() or {}
    username = data.get('username', '')
    password = data.get('password', '')
    
    # Mock authentication
    if username and password:
        # Mock user data
        mock_users = {
            'patient_demo': {
                'id': 1,
                'username': 'patient_demo',
                'user_type': 'patient',
                'first_name': 'John',
                'last_name': 'Doe',
                'email': 'john.doe@email.com',
                'roles': [{'role_name': 'Patient', 'facility_id': 1}]
            },
            'provider_demo': {
                'id': 2,
                'username': 'provider_demo',
                'user_type': 'provider',
                'first_name': 'Dr. Jane',
                'last_name': 'Smith',
                'email': 'jane.smith@hospital.com',
                'roles': [{'role_name': 'Physician', 'facility_id': 1}]
            },
            'nurse_demo': {
                'id': 3,
                'username': 'nurse_demo',
                'user_type': 'provider',
                'first_name': 'Mary',
                'last_name': 'Johnson',
                'email': 'mary.johnson@hospital.com',
                'roles': [{'role_name': 'Nurse', 'facility_id': 1}]
            },
            'pharmacist_demo': {
                'id': 4,
                'username': 'pharmacist_demo',
                'user_type': 'provider',
                'first_name': 'Robert',
                'last_name': 'Wilson',
                'email': 'robert.wilson@pharmacy.com',
                'roles': [{'role_name': 'Pharmacist', 'facility_id': 1}]
            }
        }
        
        user = mock_users.get(username)
        if user:
            return jsonify({
                'success': True,
                'user': user,
                'token': f'mock-jwt-token-{user["id"]}',
                'message': 'Login successful'
            }), 200
    
    return jsonify({
        'success': False,
        'error': 'Invalid credentials'
    }), 401

@app.route('/api/patients', methods=['GET'])
def get_patients():
    """Mock patients endpoint"""
    mock_patients = [
        {
            'id': 1,
            'universal_patient_id': 'PAT-A1B2C3D4',
            'first_name': 'John',
            'last_name': 'Doe',
            'date_of_birth': '1985-06-15',
            'gender': 'male',
            'phone_primary': '+1-555-0123',
            'email': 'john.doe@email.com',
            'medical_summary': {
                'active_medications': 2,
                'known_allergies': 1,
                'recent_encounters': 3
            }
        },
        {
            'id': 2,
            'universal_patient_id': 'PAT-E5F6G7H8',
            'first_name': 'Jane',
            'last_name': 'Smith',
            'date_of_birth': '1990-03-22',
            'gender': 'female',
            'phone_primary': '+1-555-0456',
            'email': 'jane.smith@email.com',
            'medical_summary': {
                'active_medications': 1,
                'known_allergies': 0,
                'recent_encounters': 1
            }
        }
    ]
    
    return jsonify({
        'success': True,
        'patients': mock_patients,
        'total': len(mock_patients)
    }), 200

@app.route('/api/providers', methods=['GET'])
def get_providers():
    """Mock providers endpoint"""
    mock_providers = [
        {
            'id': 1,
            'first_name': 'Dr. Jane',
            'last_name': 'Smith',
            'specialty': 'Internal Medicine',
            'license_number': 'MD123456',
            'facility_id': 1
        },
        {
            'id': 2,
            'first_name': 'Mary',
            'last_name': 'Johnson',
            'specialty': 'Nursing',
            'license_number': 'RN789012',
            'facility_id': 1
        }
    ]
    
    return jsonify({
        'success': True,
        'providers': mock_providers,
        'total': len(mock_providers)
    }), 200

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({
        'success': False,
        'error': 'Endpoint not found',
        'message': 'The requested API endpoint does not exist'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({
        'success': False,
        'error': 'Internal server error',
        'message': 'An unexpected error occurred'
    }), 500

if __name__ == '__main__':
    print("Starting MedConnect Test API Server...")
    print("Available endpoints:")
    print("  GET  /                 - Health check")
    print("  GET  /api/test         - API test")
    print("  POST /api/auth/login   - Mock authentication")
    print("  GET  /api/patients     - Mock patients data")
    print("  GET  /api/providers    - Mock providers data")
    print()
    print("Test credentials:")
    print("  patient_demo / demo123")
    print("  provider_demo / demo123")
    print("  nurse_demo / demo123")
    print("  pharmacist_demo / demo123")
    print()
    
    # Run the app
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    )

