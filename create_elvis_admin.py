"""
Script to create elvis_admin user for elvis facility
Run this script to create the user: python create_elvis_admin.py
"""
from main import app
from src.models.user import db
from src.models.auth import UserAccount, Role, UserRole
from src.models.provider import Facility
from datetime import datetime

with app.app_context():
    try:
        # Find or create elvis facility
        elvis_facility = Facility.query.filter_by(facility_id='elvis').first()
        if not elvis_facility:
            print("Creating elvis facility...")
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
            print(f"[OK] Created facility: {elvis_facility.facility_name} (ID: {elvis_facility.id})")
        else:
            print(f"[OK] Found existing facility: {elvis_facility.facility_name} (ID: {elvis_facility.id})")
        
        # Check if user already exists
        existing_user = UserAccount.query.filter_by(username='elvis_admin').first()
        if existing_user:
            print("Updating existing elvis_admin user...")
            existing_user.set_password('demo123')
            existing_user.facility_id = elvis_facility.id
            existing_user.is_active = True
            existing_user.is_verified = True
            existing_user.failed_login_attempts = 0
            existing_user.account_locked_until = None
            user = existing_user
            action = 'updated'
        else:
            print("Creating elvis_admin user...")
            user = UserAccount(
                username='elvis_admin',
                email='elvis_admin@clinicplus.org',
                user_type='admin',
                facility_id=elvis_facility.id,
                is_active=True,
                is_verified=True,
                created_at=datetime.utcnow(),
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
            print("Creating Facility Administrator role...")
            admin_role = Role(
                role_name='Facility Administrator',
                role_description='Facility-level administrator',
                is_active=True
            )
            db.session.add(admin_role)
            db.session.flush()
        
        print(f"[OK] Using role: {admin_role.role_name}")
        
        # Assign role to user for elvis facility
        existing_user_role = UserRole.query.filter_by(
            user_account_id=user.id,
            facility_id=elvis_facility.id
        ).first()
        
        if not existing_user_role:
            print("Assigning role to user...")
            user_role = UserRole(
                user_account_id=user.id,
                role_id=admin_role.id,
                facility_id=elvis_facility.id,
                is_active=True,
                assigned_at=datetime.utcnow()
            )
            db.session.add(user_role)
        
        db.session.commit()
        
        print("\n" + "="*60)
        print("[SUCCESS]")
        print("="*60)
        print(f"User {action}: elvis_admin")
        print(f"Password: demo123")
        print(f"Facility: {elvis_facility.facility_name} (facility_id: {elvis_facility.facility_id})")
        print(f"Role: {admin_role.role_name}")
        print(f"\nAccess at: http://elvis.localhost:5173")
        print("="*60)
        
    except Exception as e:
        db.session.rollback()
        print(f"\n[ERROR] {str(e)}")
        import traceback
        traceback.print_exc()

