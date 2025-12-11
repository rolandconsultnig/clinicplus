"""
Script to create a receptionist user account
"""
import sys
import os

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app
from src.models.user import db
from src.models.auth import UserAccount

def create_receptionist():
    """Create a receptionist user account"""
    with app.app_context():
        # Check if receptionist already exists
        existing_user = UserAccount.query.filter_by(username='receptionist').first()
        
        if existing_user:
            print("❌ Receptionist account already exists!")
            print(f"   Username: {existing_user.username}")
            print(f"   User Type: {existing_user.user_type}")
            print(f"   Email: {existing_user.email}")
            return
        
        # Create new receptionist user
        receptionist = UserAccount(
            username='receptionist',
            email='receptionist@clinic.com',
            user_type='Receptionist',
            is_active=True,
            is_verified=True,
            facility_id=1  # Default facility
        )
        
        # Set password using the model's method
        receptionist.set_password('receptionist123')
        
        try:
            db.session.add(receptionist)
            db.session.commit()
            
            print("✅ Receptionist account created successfully!")
            print("\n📋 Login Credentials:")
            print("   Username: receptionist")
            print("   Password: receptionist123")
            print("   User Type: Receptionist")
            print("   Name: Sarah Johnson")
            print("   Email: receptionist@clinic.com")
            print("\n🔐 Please change the password after first login!")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error creating receptionist account: {str(e)}")

if __name__ == '__main__':
    print("Creating Receptionist Account...")
    print("=" * 50)
    create_receptionist()
    print("=" * 50)
