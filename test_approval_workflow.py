"""
Test Organization Approval Workflow
Tests the 3-level approval process
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:5000/api"
auth_token = None

def login(username, password):
    """Login and get token"""
    global auth_token
    response = requests.post(
        f"{BASE_URL}/auth/jwt/login",
        json={"username": username, "password": password}
    )
    if response.status_code == 200:
        auth_token = response.json().get('token')
        print(f"[PASS] Logged in as {username}")
        return True
    else:
        print(f"[FAIL] Login failed: {response.text}")
        return False

def make_request(method, endpoint, data=None):
    """Make authenticated API request"""
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"
    
    if method == "GET":
        response = requests.get(url, headers=headers, params=data)
    elif method == "POST":
        response = requests.post(url, headers=headers, json=data)
    else:
        return None
    
    return response

def test_approval_workflow():
    """Test the 3-level approval workflow"""
    print("\n" + "="*80)
    print("TESTING ORGANIZATION APPROVAL WORKFLOW")
    print("="*80)
    
    # Login as root admin
    if not login("root_admin", "ClinicPlus2024!"):
        print("⚠️  Cannot proceed without authentication")
        return
    
    # Step 1: Create a test organization
    print("\n[STEP 1] Creating test organization...")
    org_data = {
        "organization_name": "Test Clinic Organization",
        "organization_type": "clinic",
        "email": "test@clinic.com",
        "phone": "+1234567890",
        "address_line1": "123 Test St",
        "city": "Test City",
        "state": "TS",
        "zip_code": "12345",
        "subscription_tier": "basic"
    }
    
    response = make_request("POST", "/organization/organizations", org_data)
    if response.status_code == 201:
        org = response.json().get('organization')
        org_id = org['id']
        print(f"[PASS] Organization created: {org['organization_id']}")
        print(f"   Status: {org['status']}")
        print(f"   Approval Level: {org['approval_level']}")
    else:
        print(f"[FAIL] Failed to create organization: {response.text}")
        return
    
    # Step 2: Check pending approvals
    print("\n[STEP 2] Checking pending approvals...")
    response = make_request("GET", "/organization/organizations/pending-approvals")
    if response.status_code == 200:
        pending = response.json().get('organizations', [])
        print(f"[PASS] Found {len(pending)} pending approvals")
        for p in pending:
            print(f"   - {p['organization_name']} (Level: {p['approval_level']})")
    
    # Step 3: Approve at Level 1
    print("\n[STEP 3] Approving at Level 1...")
    response = make_request("POST", f"/organization/organizations/{org_id}/approve", {
        "comment": "Level 1 approval granted"
    })
    if response.status_code == 200:
        org = response.json().get('organization')
        print(f"[PASS] Level 1 approved")
        print(f"   New Approval Level: {org['approval_level']}")
        print(f"   Status: {org['status']}")
    else:
        print(f"[FAIL] Level 1 approval failed: {response.text}")
        return
    
    # Step 4: Approve at Level 2
    print("\n[STEP 4] Approving at Level 2...")
    response = make_request("POST", f"/organization/organizations/{org_id}/approve", {
        "comment": "Level 2 approval granted"
    })
    if response.status_code == 200:
        org = response.json().get('organization')
        print(f"[PASS] Level 2 approved")
        print(f"   New Approval Level: {org['approval_level']}")
        print(f"   Status: {org['status']}")
    else:
        print(f"[FAIL] Level 2 approval failed: {response.text}")
        return
    
    # Step 5: Approve at Level 3 (Final)
    print("\n[STEP 5] Approving at Level 3 (Final)...")
    response = make_request("POST", f"/organization/organizations/{org_id}/approve", {
        "comment": "Level 3 approval granted - Organization activated"
    })
    if response.status_code == 200:
        org = response.json().get('organization')
        print(f"[PASS] Level 3 approved - FINAL APPROVAL")
        print(f"   Status: {org['status']}")
        print(f"   Is Active: {org['is_active']}")
        print(f"   Approved At: {org.get('approved_at', 'N/A')}")
    else:
        print(f"[FAIL] Level 3 approval failed: {response.text}")
        return
    
    # Step 6: Verify organization is active
    print("\n[STEP 6] Verifying organization status...")
    response = make_request("GET", f"/organization/organizations/{org_id}")
    if response.status_code == 200:
        org = response.json().get('organization')
        print(f"[PASS] Organization Status: {org['status']}")
        print(f"   Is Active: {org['is_active']}")
        if org['is_active']:
            print("   [SUCCESS] Organization is now ACTIVE and operational!")
        else:
            print("   [WARN] Organization is not active")
    
    print("\n" + "="*80)
    print("APPROVAL WORKFLOW TEST COMPLETE")
    print("="*80)

if __name__ == "__main__":
    try:
        test_approval_workflow()
    except Exception as e:
        print(f"\n[ERROR] Test error: {e}")
        import traceback
        traceback.print_exc()

