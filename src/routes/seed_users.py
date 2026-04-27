"""
Seed Users - Create test users for development
"""
from flask import Blueprint, jsonify
from src.models.user import db
from src.models.auth import UserAccount, Role, UserRole
from src.models.provider import Facility
from werkzeug.security import generate_password_hash
import datetime

seed_bp = Blueprint('seed', __name__)

@seed_bp.route('/seed-users', methods=['POST'])
def seed_users():
    """Create test users for development"""
    try:
        # Check if users already exist
        existing_admin = UserAccount.query.filter_by(username='admin').first()
        if existing_admin:
            return jsonify({
                'success': True,
                'message': 'Users already exist',
                'users': get_user_list()
            }), 200
        
        # Create default facility if it doesn't exist
        facility = Facility.query.first()
        if not facility:
            facility = Facility(
                facility_name='Main Clinic',
                facility_type='Clinic',
                address='123 Main St',
                city='City',
                state='State',
                country='Nigeria',
                phone='123-456-7890',
                email='clinic@example.com',
                is_active=True
            )
            db.session.add(facility)
            db.session.flush()
        
        # Create roles if they don't exist
        roles_data = ['admin', 'physician', 'pharmacist', 'nurse', 'receptionist', 'radiographer']
        
        roles = {}
        for role_name in roles_data:
            role = Role.query.filter_by(role_name=role_name).first()
            if not role:
                role = Role(
                    role_name=role_name,
                    is_active=True
                )
                db.session.add(role)
                db.session.flush()
            roles[role_name] = role
        
        # Create test users
        users_data = [
            {
                'username': 'admin',
                'password': 'admin123',
                'email': 'admin@clinic.com',
                'user_type': 'admin',
                'role': 'admin'
            },
            {
                'username': 'doctor',
                'password': 'doctor123',
                'email': 'doctor@clinic.com',
                'user_type': 'physician',
                'role': 'physician'
            },
            {
                'username': 'pharmacist',
                'password': 'pharma123',
                'email': 'pharmacist@clinic.com',
                'user_type': 'pharmacist',
                'role': 'pharmacist'
            },
            {
                'username': 'nurse',
                'password': 'nurse123',
                'email': 'nurse@clinic.com',
                'user_type': 'nurse',
                'role': 'nurse'
            },
            {
                'username': 'receptionist',
                'password': 'receptionist123',
                'email': 'receptionist@clinic.com',
                'user_type': 'Receptionist',
                'role': 'receptionist'
            },
            {
                'username': 'radiographer',
                'password': 'radiographer123',
                'email': 'radiographer@clinic.com',
                'user_type': 'radiographer',
                'role': 'radiographer'
            }
        ]
        
        created_users = []
        for user_data in users_data:
            # Create user account
            user = UserAccount(
                username=user_data['username'],
                email=user_data['email'],
                user_type=user_data['user_type'],
                facility_id=facility.id,
                is_active=True,
                is_verified=True,
                created_at=datetime.datetime.utcnow(),
                failed_login_attempts=0
            )
            user.set_password(user_data['password'])
            db.session.add(user)
            db.session.flush()
            
            # Assign role
            role = roles[user_data['role']]
            user_role = UserRole(
                user_account_id=user.id,
                role_id=role.id,
                facility_id=facility.id,
                is_active=True,
                assigned_at=datetime.datetime.utcnow()
            )
            db.session.add(user_role)
            
            created_users.append({
                'username': user.username,
                'password': user_data['password'],
                'user_type': user.user_type,
                'role': role.role_name
            })
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Test users created successfully',
            'users': created_users,
            'note': 'These are test credentials for development only'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Failed to seed users: {str(e)}'
        }), 500

def get_user_list():
    """Get list of existing users"""
    users = UserAccount.query.filter_by(is_active=True).all()
    return [
        {
            'username': u.username,
            'user_type': u.user_type,
            'email': u.email
        }
        for u in users
    ]

@seed_bp.route('/list-users', methods=['GET'])
def list_users():
    """List all active users"""
    try:
        return jsonify({
            'success': True,
            'users': get_user_list()
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@seed_bp.route('/create-elvis-admin', methods=['POST'])
def create_elvis_admin():
    """Create elvis_admin user for elvis facility"""
    try:
        # Find or create elvis facility
        elvis_facility = Facility.query.filter_by(facility_id='elvis').first()
        if not elvis_facility:
            # Create elvis facility
            elvis_facility = Facility(
                facility_id='elvis',
                facility_name='Elvis Clinic',
                facility_type='Clinic',
                city='City',
                state='State',
                country='Nigeria',
                phone='123-456-7890',
                email='elvis@clinicplus.org',
                is_active=True
            )
            db.session.add(elvis_facility)
            db.session.flush()
        
        # Check if user already exists
        existing_user = UserAccount.query.filter_by(username='elvis_admin').first()
        if existing_user:
            # Update existing user
            existing_user.set_password('demo123')
            existing_user.facility_id = elvis_facility.id
            existing_user.is_active = True
            existing_user.is_verified = True
            existing_user.failed_login_attempts = 0
            existing_user.account_locked_until = None
            user = existing_user
            action = 'updated'
        else:
            # Create new user
            user = UserAccount(
                username='elvis_admin',
                email='elvis_admin@clinicplus.org',
                user_type='admin',
                facility_id=elvis_facility.id,
                is_active=True,
                is_verified=True,
                created_at=datetime.datetime.utcnow(),
                failed_login_attempts=0
            )
            user.set_password('demo123')
            db.session.add(user)
            db.session.flush()
            action = 'created'
        
        # Get or create Facility Administrator role
        admin_role = Role.query.filter_by(role_name='Facility Administrator').first()
        if not admin_role:
            admin_role = Role.query.filter_by(role_name='System Administrator').first()
        if not admin_role:
            admin_role = Role.query.filter_by(role_name='admin').first()
        if not admin_role:
            # Create Facility Administrator role if it doesn't exist
            admin_role = Role(
                role_name='Facility Administrator',
                role_description='Facility-level administrator',
                is_active=True
            )
            db.session.add(admin_role)
            db.session.flush()
        
        # Assign role to user for elvis facility
        existing_user_role = UserRole.query.filter_by(
            user_account_id=user.id,
            facility_id=elvis_facility.id
        ).first()
        
        if not existing_user_role:
            user_role = UserRole(
                user_account_id=user.id,
                role_id=admin_role.id,
                facility_id=elvis_facility.id,
                is_active=True,
                assigned_at=datetime.datetime.utcnow()
            )
            db.session.add(user_role)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'elvis_admin user {action} successfully',
            'user': {
                'username': 'elvis_admin',
                'password': 'demo123',
                'email': user.email,
                'user_type': user.user_type,
                'facility_id': elvis_facility.id,
                'facility_name': elvis_facility.facility_name,
                'role': admin_role.role_name
            },
            'note': 'Use these credentials to login at elvis.localhost:4305'
        }), 201 if action == 'created' else 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Failed to create elvis_admin: {str(e)}'
        }), 500

@seed_bp.route('/reset-passwords', methods=['POST'])
def reset_passwords():
    """Reset passwords for existing users to known test passwords"""
    try:
        # Define password mappings
        password_map = {
            'admin_demo': 'admin123',
            'root_admin': 'root123',
            'test_user': 'test123',
            'patient_demo': 'patient123',
            'provider_demo': 'provider123',
            'receptionist': 'receptionist123',
            'radiographer': 'radiographer123',
            'elvis_admin': 'demo123'
        }
        
        updated_users = []
        for username, password in password_map.items():
            user = UserAccount.query.filter_by(username=username).first()
            if user:
                user.set_password(password)
                user.failed_login_attempts = 0
                user.account_locked_until = None
                updated_users.append({
                    'username': username,
                    'password': password,
                    'user_type': user.user_type
                })
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Passwords reset successfully',
            'users': updated_users,
            'note': 'Use these credentials to login'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

