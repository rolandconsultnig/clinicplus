"""
Reset passwords for all test accounts to documented values
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app, db
from src.models.auth import UserAccount

def reset_test_passwords():
    """Reset passwords for test accounts"""
    with app.app_context():
        # Password mappings from USER_ACCOUNTS.md
        password_map = {
            'test_user': 'admin123',
            'root_admin': 'admin123',
            'admin_demo': 'admin123',  # Already working
            'receptionist': 'receptionist123'
        }
        
        updated_users = []
        not_found = []
        
        for username, password in password_map.items():
            user = UserAccount.query.filter_by(username=username).first()
            
            if user:
                # Reset password
                user.set_password(password)
                # Reset failed login attempts and unlock account
                user.failed_login_attempts = 0
                user.account_locked_until = None
                user.is_active = True
                user.is_verified = True
                
                updated_users.append({
                    'username': username,
                    'password': password,
                    'user_type': user.user_type,
                    'is_active': user.is_active,
                    'is_verified': user.is_verified
                })
                
                print(f"✅ Updated {username}: password={password}, type={user.user_type}")
            else:
                not_found.append(username)
                print(f"❌ User not found: {username}")
        
        if updated_users:
            db.session.commit()
            print(f"\n✅ Successfully updated {len(updated_users)} users")
        else:
            print("\n⚠️  No users were updated")
        
        if not_found:
            print(f"\n⚠️  Users not found: {', '.join(not_found)}")
            print("   Consider creating these users first")
        
        print("\n" + "="*60)
        print("Updated Users:")
        print("="*60)
        for user_info in updated_users:
            print(f"Username: {user_info['username']}")
            print(f"  Password: {user_info['password']}")
            print(f"  User Type: {user_info['user_type']}")
            print(f"  Active: {user_info['is_active']}")
            print(f"  Verified: {user_info['is_verified']}")
            print()

if __name__ == "__main__":
    reset_test_passwords()

