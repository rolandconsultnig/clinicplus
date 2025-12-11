"""
Setup Clinic+ Root Organization
Creates the root organization and initial admin user
"""
from src.models.user import db
from src.models.organization import Organization, OrganizationStatus
from src.models.auth import UserAccount, Role, UserRole
from src.models.provider import Facility
from datetime import datetime
import uuid

def setup_root_organization():
    """Create Clinic+ root organization"""
    print("Setting up Clinic+ root organization...")
    
    try:
        # Create root organization
        root_org = Organization.query.filter_by(organization_id="CLINICPLUS-ROOT").first()
        if not root_org:
            root_org = Organization(
                organization_id="CLINICPLUS-ROOT",
                organization_name="Clinic+",
                organization_type="platform",
                legal_name="Clinic+ Platform",
                email="admin@clinicplus.com",
                phone="+1234567890",
                status=OrganizationStatus.ACTIVE.value,
                approval_level="level_3",  # Already approved
                approved_at=datetime.utcnow(),
                is_active=True,
                root_organization_id=1,  # Self-reference
                organization_level=0,  # Root level
                subscription_tier="enterprise"
            )
            db.session.add(root_org)
            db.session.flush()
            print(f"✅ Created Clinic+ root organization: {root_org.id}")
        else:
            print(f"✅ Clinic+ root organization already exists: {root_org.id}")
            root_org.is_active = True
            root_org.status = OrganizationStatus.ACTIVE.value
        
        # Create root admin role if it doesn't exist
        admin_role = Role.query.filter_by(role_name="system_administrator").first()
        if not admin_role:
            admin_role = Role(
                role_name="system_administrator",
                role_description="System Administrator for Clinic+ Platform",
                role_category="administrative",
                facility_specific=False,
                is_active=True
            )
            db.session.add(admin_role)
            db.session.flush()
            print(f"✅ Created system_administrator role: {admin_role.id}")
        else:
            print(f"✅ System administrator role already exists: {admin_role.id}")
        
        # Create root admin user if it doesn't exist
        admin_user = UserAccount.query.filter_by(username="root_admin").first()
        if not admin_user:
            admin_user = UserAccount(
                username="root_admin",
                email="root@clinicplus.com",
                user_type="admin",
                is_active=True,
                is_verified=True
            )
            admin_user.set_password("ClinicPlus2024!")
            db.session.add(admin_user)
            db.session.flush()
            print(f"✅ Created root admin user: {admin_user.id}")
        else:
            print(f"✅ Root admin user already exists: {admin_user.id}")
            admin_user.set_password("ClinicPlus2024!")  # Reset password
        
        # Assign role to user
        user_role = UserRole.query.filter_by(
            user_account_id=admin_user.id,
            role_id=admin_role.id
        ).first()
        if not user_role:
            user_role = UserRole(
                user_account_id=admin_user.id,
                role_id=admin_role.id,
                facility_id=None,  # Root admin doesn't need facility
                is_active=True
            )
            db.session.add(user_role)
            print(f"✅ Assigned system_administrator role to root_admin")
        else:
            print(f"✅ Role already assigned")
        
        # Create default facility for root organization
        root_facility = Facility.query.filter_by(facility_id="CLINICPLUS-FACILITY-001").first()
        if not root_facility:
            root_facility = Facility(
                facility_id="CLINICPLUS-FACILITY-001",
                facility_name="Clinic+ Headquarters",
                facility_type="clinic",
                address_line1="123 Clinic+ Plaza",
                city="San Francisco",
                state="CA",
                zip_code="94105",
                country="USA",
                phone="+1234567890",
                email="info@clinicplus.com",
                organization_id=root_org.id,
                is_active=True
            )
            db.session.add(root_facility)
            print(f"✅ Created root facility: {root_facility.id}")
        else:
            print(f"✅ Root facility already exists: {root_facility.id}")
            root_facility.organization_id = root_org.id
        
        db.session.commit()
        print("\n✅ Clinic+ root organization setup complete!")
        print(f"   Organization ID: {root_org.id}")
        print(f"   Organization Name: {root_org.organization_name}")
        print(f"   Root Admin Username: root_admin")
        print(f"   Root Admin Password: ClinicPlus2024!")
        print(f"   Root Facility ID: {root_facility.id}")
        
        return True
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error setting up root organization: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    from main import app
    with app.app_context():
        success = setup_root_organization()
        exit(0 if success else 1)

