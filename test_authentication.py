"""
Test Authentication System
Tests login with documented credentials and verifies authentication flow
"""
import requests
import json
import sys

API_BASE_URL = "http://localhost:5000/api/auth/jwt"

def test_login(username, password, expected_success=True):
    """Test login with given credentials"""
    print(f"\n{'='*60}")
    print(f"Testing Login: {username}")
    print(f"{'='*60}")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/login",
            json={
                "username": username,
                "password": password
            },
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ LOGIN SUCCESSFUL")
                print(f"Token: {data.get('token', 'N/A')[:50]}...")
                print(f"Expires In: {data.get('expires_in', 'N/A')} seconds")
                
                user = data.get('user', {})
                print(f"\nUser Information:")
                print(f"  ID: {user.get('id', 'N/A')}")
                print(f"  Username: {user.get('username', 'N/A')}")
                print(f"  Email: {user.get('email', 'N/A')}")
                print(f"  User Type: {user.get('user_type', 'N/A')}")
                print(f"  Is Active: {user.get('is_active', 'N/A')}")
                print(f"  Is Verified: {user.get('is_verified', 'N/A')}")
                
                if user.get('roles'):
                    print(f"\nRoles:")
                    for role in user.get('roles', []):
                        print(f"  - {role.get('role_name', 'N/A')}")
                
                # Test token verification
                token = data.get('token')
                if token:
                    test_token_verification(token)
                    test_get_profile(token)
                
                return True
            else:
                print(f"❌ LOGIN FAILED: {data.get('error', 'Unknown error')}")
                return False
        else:
            error_data = response.json() if response.content else {}
            print(f"❌ LOGIN FAILED")
            print(f"Error: {error_data.get('error', 'Unknown error')}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ CONNECTION ERROR: Backend server is not running!")
        print("   Please start the Flask server: python main.py")
        return False
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

def test_token_verification(token):
    """Test token verification endpoint"""
    print(f"\n{'='*60}")
    print("Testing Token Verification")
    print(f"{'='*60}")
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/verify-token",
            json={"token": token},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('valid'):
                print("✅ TOKEN VERIFICATION SUCCESSFUL")
                payload = data.get('payload', {})
                print(f"User ID: {payload.get('user_id', 'N/A')}")
                print(f"Username: {payload.get('username', 'N/A')}")
                return True
            else:
                print(f"❌ TOKEN VERIFICATION FAILED: {data.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ TOKEN VERIFICATION FAILED: Status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

def test_get_profile(token):
    """Test get profile endpoint"""
    print(f"\n{'='*60}")
    print("Testing Get Profile")
    print(f"{'='*60}")
    
    try:
        response = requests.get(
            f"{API_BASE_URL}/profile",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✅ PROFILE RETRIEVAL SUCCESSFUL")
                user = data.get('user', {})
                print(f"Username: {user.get('username', 'N/A')}")
                print(f"User Type: {user.get('user_type', 'N/A')}")
                print(f"Email: {user.get('email', 'N/A')}")
                if user.get('roles'):
                    print(f"Roles: {', '.join([r.get('role_name', '') for r in user.get('roles', [])])}")
                return True
            else:
                print(f"❌ PROFILE RETRIEVAL FAILED: {data.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ PROFILE RETRIEVAL FAILED: Status {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return False

def main():
    """Run all authentication tests"""
    print("\n" + "="*60)
    print("CLINIC+ AUTHENTICATION TEST SUITE")
    print("="*60)
    
    # Test credentials from USER_ACCOUNTS.md
    test_credentials = [
        {
            "username": "test_user",
            "password": "admin123",
            "description": "Admin Account (test_user)"
        },
        {
            "username": "root_admin",
            "password": "admin123",
            "description": "Admin Account (root_admin)"
        },
        {
            "username": "admin_demo",
            "password": "admin123",
            "description": "Admin Account (admin_demo)"
        },
        {
            "username": "receptionist",
            "password": "receptionist123",
            "description": "Receptionist Account"
        }
    ]
    
    results = []
    
    for cred in test_credentials:
        print(f"\n📋 Testing: {cred['description']}")
        success = test_login(cred['username'], cred['password'])
        results.append({
            "username": cred['username'],
            "success": success
        })
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    successful = sum(1 for r in results if r['success'])
    total = len(results)
    
    for result in results:
        status = "✅ PASS" if result['success'] else "❌ FAIL"
        print(f"{status}: {result['username']}")
    
    print(f"\nTotal: {successful}/{total} tests passed")
    
    if successful == total:
        print("\n🎉 All authentication tests passed!")
        return 0
    else:
        print(f"\n⚠️  {total - successful} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())

