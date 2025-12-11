"""
Quick script to create test users for login
"""
from main import app
from src.models.user import db
from src.models.auth import UserAccount, Role, UserRole
from src.models.provider import Facility
from datetime import datetime

with app.app_context():
    try:
        # Add nin column if it doesn't exist
        try:
            db.session.execute('ALTER TABLE patients ADD COLUMN nin VARCHAR(11)')
            db.session.commit()
            print("✅ Added nin column to patients table")
        except Exception as e:
            if 'duplicate column' not in str(e).lower():
                print(f"Note: {e}")
        
        # Get or create facility
        facility = Facility.query.first()
        if not facility:
            facility = Facility(
                facility_name='Main Clinic',
                facility_type='Clinic',
                address='123 Main St',
                city='City',
                state='State',
                country='Country',
                phone='123-456-7890',
                email='clinic@example.com',
                is_active=True
            )
            db.session.add(facility)
            db.session.flush()
            print("✅ Created facility")
        
        # Get or create roles
        admin_role = Role.query.filter_by(role_name='System Administrator').first()
        if not admin_role:
            admin_role = Role(role_name='System Administrator', is_active=True)
            db.session.add(admin_role)
            db.session.flush()
        
        patient_role = Role.query.filter_by(role_name='Patient').first()
        if not patient_role:
            patient_role = Role(role_name='Patient', is_active=True)
            db.session.add(patient_role)
            db.session.flush()
        
        physician_role = Role.query.filter_by(role_name='Physician').first()
        if not physician_role:
            physician_role = Role(role_name='Physician', is_active=True)
            db.session.add(physician_role)
            db.session.flush()
        
        # Create patient_demo user
        patient_user = UserAccount.query.filter_by(username='patient_demo').first()
        if not patient_user:
            patient_user = UserAccount(
                username='patient_demo',
                email='patient@demo.com',
                user_type='patient',
                is_active=True,
                is_verified=True
            )
            patient_user.set_password('demo123')
            db.session.add(patient_user)
            db.session.flush()
            
            # Assign Patient role
            user_role = UserRole(
                user_account_id=patient_user.id,
                role_id=patient_role.id,
                facility_id=facility.id if facility else None,
                is_active=True,
                assigned_at=datetime.utcnow()
            )
            db.session.add(user_role)
            print("✅ Created patient_demo user")
        else:
            patient_user.set_password('demo123')
            patient_user.is_active = True
            patient_user.is_verified = True
            print("✅ Updated patient_demo user")
        
        # Create provider_demo user
        provider_user = UserAccount.query.filter_by(username='provider_demo').first()
        if not provider_user:
            provider_user = UserAccount(
                username='provider_demo',
                email='provider@demo.com',
                user_type='provider',
                is_active=True,
                is_verified=True
            )
            provider_user.set_password('demo123')
            db.session.add(provider_user)
            db.session.flush()
            
            # Assign Physician role
            user_role = UserRole(
                user_account_id=provider_user.id,
                role_id=physician_role.id,
                facility_id=facility.id if facility else None,
                is_active=True,
                assigned_at=datetime.utcnow()
            )
            db.session.add(user_role)
            print("✅ Created provider_demo user")
        else:
            provider_user.set_password('demo123')
            provider_user.is_active = True
            provider_user.is_verified = True
            print("✅ Updated provider_demo user")
        
        # Create admin_demo user
        admin_user = UserAccount.query.filter_by(username='admin_demo').first()
        if not admin_user:
            admin_user = UserAccount(
                username='admin_demo',
                email='admin@demo.com',
                user_type='admin',
                is_active=True,
                is_verified=True
            )
            admin_user.set_password('demo123')
            db.session.add(admin_user)
            db.session.flush()
            
            # Assign System Administrator role
            user_role = UserRole(
                user_account_id=admin_user.id,
                role_id=admin_role.id,
                facility_id=None,  # System admin has no facility restriction
                is_active=True,
                assigned_at=datetime.utcnow()
            )
            db.session.add(user_role)
            print("✅ Created admin_demo user")
        else:
            admin_user.set_password('demo123')
            admin_user.is_active = True
            admin_user.is_verified = True
            print("✅ Updated admin_demo user")
        
        db.session.commit()
        
        print("\n" + "="*60)
        print("Test users created/updated successfully!")
        print("="*60)
        print("\nLogin Credentials:")
        print("  Patient:  patient_demo / demo123")
        print("  Provider: provider_demo / demo123")
        print("  Admin:    admin_demo / demo123")
        print("="*60)
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

