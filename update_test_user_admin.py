"""
Update test_user to have admin privileges
"""
import sys
import os

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app, db
from src.models.auth import UserAccount

def update_test_user_to_admin():
    """Update test_user to admin role"""
    with app.app_context():
        # Find test_user
        user = UserAccount.query.filter_by(username='test_user').first()
        
        if not user:
            print("❌ test_user not found!")
            print("\nCreating test_user as admin...")
            
            # Create new admin user
            user = UserAccount(
                username='test_user',
                email='test@clinic.com',
                user_type='admin',
                is_active=True,
                is_verified=True
            )
            user.set_password('admin123')
            
            db.session.add(user)
            db.session.commit()
            
            print("✅ Created test_user as admin")
            print(f"   Username: test_user")
            print(f"   Password: admin123")
            print(f"   User Type: admin")
        else:
            print(f"Found test_user:")
            print(f"   Current User Type: {user.user_type}")
            print(f"   Is Active: {user.is_active}")
            print(f"   Is Verified: {user.is_verified}")
            
            # Update to admin
            user.user_type = 'admin'
            user.is_active = True
            user.is_verified = True
            
            # Reset password to known value
            user.set_password('admin123')
            
            db.session.commit()
            
            print("\n✅ Updated test_user to admin")
            print(f"   Username: test_user")
            print(f"   Password: admin123")
            print(f"   User Type: admin")
        
        print("\n" + "="*60)
        print("Admin user ready!")
        print("="*60)
        print("\nLogin credentials:")
        print("   Username: test_user")
        print("   Password: admin123")
        print("   Role: Administrator")
        print("\nYou can now access:")
        print("   - System Settings")
        print("   - User Management")
        print("   - Organization Management")
        print("   - Security Audit")
        print("   - All admin features")
        print("="*60)

if __name__ == '__main__':
    update_test_user_to_admin()
