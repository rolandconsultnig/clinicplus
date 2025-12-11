"""
Test receptionist login via API
"""
import requests
import json

def test_login():
    """Test receptionist login"""
    url = 'http://localhost:5000/api/auth/jwt/login'
    
    payload = {
        'username': 'receptionist',
        'password': 'receptionist123'
    }
    
    headers = {
        'Content-Type': 'application/json'
    }
    
    print("Testing Receptionist Login...")
    print("=" * 60)
    print(f"URL: {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    print("=" * 60)
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        
        print(f"\nStatus Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"\nResponse Body:")
        print(json.dumps(response.json(), indent=2))
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("\n✅ LOGIN SUCCESSFUL!")
                print(f"Token: {data.get('token')[:50]}...")
                print(f"User: {data.get('user')}")
            else:
                print(f"\n❌ LOGIN FAILED: {data.get('error')}")
        else:
            print(f"\n❌ LOGIN FAILED WITH STATUS {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("\n❌ ERROR: Cannot connect to backend server")
        print("Make sure the Flask server is running on http://localhost:5000")
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")

if __name__ == '__main__':
    test_login()
