"""
Script to check receptionist account details
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app
from src.models.user import db
from src.models.auth import UserAccount

def check_receptionist():
    """Check receptionist account"""
    with app.app_context():
        print("Checking for receptionist accounts...")
        print("=" * 60)
        
        # Check all accounts with receptionist in username or user_type
        accounts = UserAccount.query.filter(
            (UserAccount.username.ilike('%receptionist%')) |
            (UserAccount.user_type.ilike('%receptionist%'))
        ).all()
        
        if not accounts:
            print("❌ No receptionist accounts found!")
            print("\nAll user accounts:")
            all_users = UserAccount.query.all()
            for user in all_users:
                print(f"  - {user.username} ({user.user_type}) - Active: {user.is_active}")
        else:
            print(f"✅ Found {len(accounts)} receptionist account(s):\n")
            for account in accounts:
                print(f"Username: {account.username}")
                print(f"Email: {account.email}")
                print(f"User Type: {account.user_type}")
                print(f"Is Active: {account.is_active}")
                print(f"Is Verified: {account.is_verified}")
                print(f"Password Hash: {account.password_hash[:20]}...")
                print(f"Failed Login Attempts: {account.failed_login_attempts}")
                print(f"Account Locked: {account.account_locked_until}")
                print(f"Last Login: {account.last_login}")
                print("-" * 60)
                
                # Test password
                test_password = 'receptionist123'
                password_valid = account.check_password(test_password)
                print(f"Password '{test_password}' valid: {password_valid}")
                print("=" * 60)

if __name__ == '__main__':
    check_receptionist()
