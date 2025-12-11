"""
List all user accounts in the system
"""
import sys
import os

# Add the project root to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app, db
from src.models.auth import UserAccount

def list_all_users():
    """List all user accounts"""
    with app.app_context():
        users = UserAccount.query.all()
        
        print("\n" + "="*80)
        print("ALL USER ACCOUNTS")
        print("="*80)
        
        if not users:
            print("No users found in the database.")
        else:
            for user in users:
                print(f"\n{'='*80}")
                print(f"Username: {user.username}")
                print(f"Email: {user.email}")
                print(f"User Type: {user.user_type}")
                print(f"Is Active: {user.is_active}")
                print(f"Is Verified: {user.is_verified}")
                print(f"Last Login: {user.last_login or 'Never'}")
                print(f"Created: {user.created_at}")
                print(f"ID: {user.id}")
        
        print("\n" + "="*80)
        print(f"Total Users: {len(users)}")
        print("="*80)
        
        # Show login credentials for each user
        print("\n" + "="*80)
        print("LOGIN CREDENTIALS")
        print("="*80)
        
        admin_users = [u for u in users if u.user_type == 'admin']
        receptionist_users = [u for u in users if u.user_type == 'Receptionist']
        physician_users = [u for u in users if u.user_type == 'physician']
        
        if admin_users:
            print("\n📋 ADMIN USERS:")
            for user in admin_users:
                print(f"   Username: {user.username}")
                print(f"   Password: admin123 (default)")
                print(f"   Access: Full system access")
                print()
        
        if receptionist_users:
            print("📋 RECEPTIONIST USERS:")
            for user in receptionist_users:
                print(f"   Username: {user.username}")
                print(f"   Password: receptionist123 (default)")
                print(f"   Access: Reception desk, appointments, billing")
                print()
        
        if physician_users:
            print("📋 PHYSICIAN USERS:")
            for user in physician_users:
                print(f"   Username: {user.username}")
                print(f"   Password: physician123 (default)")
                print(f"   Access: Patient care, consultations, prescriptions")
                print()
        
        print("="*80)

if __name__ == '__main__':
    list_all_users()
