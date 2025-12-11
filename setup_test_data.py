"""
Setup test data for integration tests
Creates test users, patients, providers, etc.
"""
from src.models.user import db
from src.models.auth import UserAccount, Role, UserRole
from src.models.patient import Patient
from src.models.provider import Provider, Facility
from src.models.insurance_company import InsuranceCompany
from datetime import datetime, date
import sys

def setup_test_data():
    """Create test data"""
    print("Setting up test data...")
    
    try:
        # Create test facility
        facility = Facility.query.filter_by(facility_name="Test Facility").first()
        if not facility:
            import uuid
            facility = Facility(
                facility_id=f"FAC-{uuid.uuid4().hex[:12].upper()}",
                facility_name="Test Facility",
                facility_type="clinic",
                address_line1="123 Test St",
                city="Test City",
                state="TS",
                zip_code="12345",
                phone="+1234567890",
                email="test@facility.com",
                is_active=True
            )
            db.session.add(facility)
            db.session.flush()
            print(f"✅ Created facility: {facility.id}")
        else:
            print(f"✅ Using existing facility: {facility.id}")
        
        # Create test role
        role = Role.query.filter_by(role_name="test_role").first()
        if not role:
            role = Role(
                role_name="test_role",
                role_description="Test role for integration tests",
                role_category="test",
                facility_specific=False,
                is_active=True
            )
            db.session.add(role)
            db.session.flush()
            print(f"✅ Created role: {role.id}")
        else:
            print(f"✅ Using existing role: {role.id}")
        
        # Create test admin user
        admin_user = UserAccount.query.filter_by(username="test_user").first()
        if not admin_user:
            admin_user = UserAccount(
                username="test_user",
                email="test@example.com",
                user_type="admin",
                facility_id=facility.id,
                is_active=True,
                is_verified=True
            )
            admin_user.set_password("test_password123")
            db.session.add(admin_user)
            db.session.flush()
            print(f"✅ Created admin user: {admin_user.id}")
        else:
            print(f"✅ Using existing admin user: {admin_user.id}")
            admin_user.set_password("test_password123")  # Reset password
        
        # Create test patient (needed before patient user)
        patient = Patient.query.filter_by(universal_patient_id="TEST-PATIENT-001").first()
        if not patient:
            patient = Patient(
                universal_patient_id="TEST-PATIENT-001",
                first_name="Test",
                last_name="Patient",
                date_of_birth=date(1990, 1, 1),
                gender="M",
                email="testpatient@example.com",
                phone_primary="+1234567890",
                facility_id=facility.id,
                is_active=True
            )
            db.session.add(patient)
            db.session.flush()
            print(f"✅ Created patient: {patient.id}")
        else:
            print(f"✅ Using existing patient: {patient.id}")
        
        # Create test provider (needed before provider user)
        provider = Provider.query.filter_by(npi_number="TEST123456").first()
        if not provider:
            import uuid
            provider = Provider(
                universal_provider_id=f"PROV-{uuid.uuid4().hex[:12].upper()}",
                first_name="Test",
                last_name="Provider",
                provider_type="physician",
                npi_number="TEST123456",
                specialty="general",
                license_number="TEST-LIC-001",
                is_active=True
            )
            db.session.add(provider)
            db.session.flush()
            print(f"✅ Created provider: {provider.id}")
        else:
            print(f"✅ Using existing provider: {provider.id}")
        
        # Create demo patient user
        patient_user = UserAccount.query.filter_by(username="patient_demo").first()
        if not patient_user:
            patient_user = UserAccount(
                username="patient_demo",
                email="patient@demo.com",
                user_type="patient",
                facility_id=facility.id,
                patient_id=patient.id,
                is_active=True,
                is_verified=True
            )
            patient_user.set_password("demo123")
            db.session.add(patient_user)
            db.session.flush()
            print(f"✅ Created patient user: {patient_user.id}")
        else:
            print(f"✅ Using existing patient user: {patient_user.id}")
            patient_user.set_password("demo123")
            if not patient_user.patient_id:
                patient_user.patient_id = patient.id
        
        # Create demo provider user
        provider_user = UserAccount.query.filter_by(username="provider_demo").first()
        if not provider_user:
            provider_user = UserAccount(
                username="provider_demo",
                email="provider@demo.com",
                user_type="provider",
                facility_id=facility.id,
                provider_id=provider.id,
                is_active=True,
                is_verified=True
            )
            provider_user.set_password("demo123")
            db.session.add(provider_user)
            db.session.flush()
            print(f"✅ Created provider user: {provider_user.id}")
        else:
            print(f"✅ Using existing provider user: {provider_user.id}")
            provider_user.set_password("demo123")
            if not provider_user.provider_id:
                provider_user.provider_id = provider.id
        
        # Create demo admin user
        admin_demo_user = UserAccount.query.filter_by(username="admin_demo").first()
        if not admin_demo_user:
            admin_demo_user = UserAccount(
                username="admin_demo",
                email="admin@demo.com",
                user_type="admin",
                facility_id=facility.id,
                is_active=True,
                is_verified=True
            )
            admin_demo_user.set_password("demo123")
            db.session.add(admin_demo_user)
            db.session.flush()
            print(f"✅ Created admin demo user: {admin_demo_user.id}")
        else:
            print(f"✅ Using existing admin demo user: {admin_demo_user.id}")
            admin_demo_user.set_password("demo123")
        
        # Use admin_user for role assignment
        user = admin_user
        
        # Assign role to user
        user_role = UserRole.query.filter_by(
            user_account_id=user.id,
            role_id=role.id
        ).first()
        if not user_role:
            user_role = UserRole(
                user_account_id=user.id,
                role_id=role.id,
                facility_id=facility.id,
                is_active=True
            )
            db.session.add(user_role)
            print(f"✅ Assigned role to user")
        
        
        db.session.commit()
        print("\n✅ Test data setup complete!")
        print(f"   Username: test_user")
        print(f"   Password: test_password123")
        print(f"   Facility ID: {facility.id}")
        print(f"   Patient ID: {patient.id}")
        print(f"   Provider ID: {provider.id}")
        
        return True
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error setting up test data: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    from main import app
    with app.app_context():
        success = setup_test_data()
        sys.exit(0 if success else 1)

