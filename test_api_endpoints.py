"""
Test script for Clinic+ API endpoints
"""
import requests
import json

BASE_URL = "http://localhost:5000/api"

def test_endpoint(method, endpoint, data=None, token=None):
    """Test an API endpoint"""
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data)
        elif method == "PUT":
            response = requests.put(url, headers=headers, json=data)
        
        print(f"\n{method} {endpoint}")
        print(f"Status: {response.status_code}")
        
        try:
            result = response.json()
            print(f"Response: {json.dumps(result, indent=2)}")
        except:
            print(f"Response: {response.text}")
        
        return response.status_code < 400, response.json() if response.status_code < 400 else None
        
    except requests.exceptions.ConnectionError:
        print(f"\n{method} {endpoint}")
        print("ERROR: Could not connect to server. Is the Flask app running?")
        return False, None
    except Exception as e:
        print(f"\n{method} {endpoint}")
        print(f"ERROR: {str(e)}")
        return False, None

def main():
    print("=" * 60)
    print("Clinic+ API Endpoint Testing")
    print("=" * 60)
    
    # Test authentication endpoint
    print("\n1. Testing Authentication...")
    success, result = test_endpoint("POST", "/auth/jwt/login", {
        "username": "admin_demo",
        "password": "demo123"
    })
    
    token = None
    if success and result:
        token = result.get("token")
        print(f"✓ Authentication successful. Token: {token[:20]}...")
    else:
        print("✗ Authentication failed. Some tests may fail.")
    
    # Test Scheduling endpoints
    print("\n2. Testing Scheduling Endpoints...")
    test_endpoint("GET", "/scheduling/appointments", token=token)
    test_endpoint("GET", "/scheduling/queue", token=token)
    
    # Test Billing endpoints
    print("\n3. Testing Billing Endpoints...")
    test_endpoint("GET", "/billing/billing-codes", token=token)
    test_endpoint("GET", "/billing/charges", token=token)
    
    # Test Prescribing endpoints
    print("\n4. Testing Prescribing Endpoints...")
    test_endpoint("GET", "/prescribing/drugs?search=aspirin", token=token)
    
    # Test Pharmacy endpoints
    print("\n5. Testing Pharmacy Endpoints...")
    test_endpoint("GET", "/pharmacy/pharmacies", token=token)
    
    # Test Insurance endpoints
    print("\n6. Testing Insurance Endpoints...")
    test_endpoint("GET", "/insurance/plans", token=token)
    
    # Test Professional endpoints
    print("\n7. Testing Professional Endpoints...")
    test_endpoint("GET", "/professional/credentials/check-expiry", token=token)
    
    # Test RPM endpoints
    print("\n8. Testing RPM Endpoints...")
    test_endpoint("GET", "/rpm/alerts", token=token)
    
    # Test Emergency endpoints
    print("\n9. Testing Emergency Endpoints...")
    test_endpoint("GET", "/emergency/devices", token=token)
    
    # Test CDS endpoints
    print("\n10. Testing CDS Endpoints...")
    test_endpoint("GET", "/cds/rules", token=token)
    test_endpoint("GET", "/cds/alerts", token=token)
    
    # Test FHIR endpoints
    print("\n11. Testing FHIR Endpoints...")
    test_endpoint("GET", "/fhir/R4/.well-known/smart-configuration")
    
    # Test AI endpoints
    print("\n12. Testing AI Endpoints...")
    test_endpoint("POST", "/ai/transcribe", {
        "audio_data": "base64_encoded_audio",
        "encounter_id": 1
    }, token=token)
    
    print("\n" + "=" * 60)
    print("Testing Complete!")
    print("=" * 60)

if __name__ == "__main__":
    main()

