"""
Comprehensive Frontend-Backend Integration Tests
Tests all features end-to-end
"""
import requests
import json
import time
from datetime import datetime, date, timedelta

BASE_URL = "http://localhost:5000/api"
TEST_USERNAME = "test_user"
TEST_PASSWORD = "test_password123"
auth_token = None
test_results = []

def log_test(name, status, details=""):
    """Log test result"""
    result = {
        'test': name,
        'status': status,
        'details': details,
        'timestamp': datetime.now().isoformat()
    }
    test_results.append(result)
    status_icon = "[PASS]" if status == "PASS" else "[FAIL]" if status == "FAIL" else "[SKIP]"
    print(f"{status_icon} {name}: {status}")
    if details:
        print(f"   {details}")

def make_request(method, endpoint, data=None, headers=None, expected_status=200):
    """Make API request"""
    url = f"{BASE_URL}{endpoint}"
    request_headers = {"Content-Type": "application/json"}
    if auth_token:
        request_headers["Authorization"] = f"Bearer {auth_token}"
    if headers:
        request_headers.update(headers)
    
    try:
        if method == "GET":
            response = requests.get(url, headers=request_headers, params=data)
        elif method == "POST":
            response = requests.post(url, headers=request_headers, json=data)
        elif method == "PUT":
            response = requests.put(url, headers=request_headers, json=data)
        elif method == "DELETE":
            response = requests.delete(url, headers=request_headers)
        else:
            return None, "Invalid method"
        
        if response.status_code == expected_status:
            return response.json(), None
        else:
            return None, f"Expected {expected_status}, got {response.status_code}: {response.text}"
    except Exception as e:
        return None, str(e)

# ==================== AUTHENTICATION TESTS ====================

def test_authentication():
    """Test authentication flow"""
    print("\n" + "="*60)
    print("TESTING AUTHENTICATION")
    print("="*60)
    
    global auth_token
    
    # Test 1: Health Check
    result, error = make_request("GET", "/health", expected_status=200)
    if error:
        log_test("Health Check", "FAIL", error)
        return False
    else:
        log_test("Health Check", "PASS", f"Status: {result.get('status', 'unknown')}")
    
    # Test 2: User Registration (if endpoint exists)
    # Note: Using existing test user or creating one
    
    # Test 3: Login
    login_data = {
        "username": TEST_USERNAME,
        "password": TEST_PASSWORD
    }
    result, error = make_request("POST", "/auth/jwt/login", data=login_data, expected_status=200)
    if error:
        log_test("Login", "FAIL", f"Login failed: {error}. Trying with demo credentials...")
        # Try with demo credentials
        login_data = {"username": "patient_demo", "password": "demo123"}
        result, error = make_request("POST", "/auth/jwt/login", data=login_data, expected_status=200)
        if error:
            log_test("Login (Demo)", "FAIL", error)
            return False
        else:
            auth_token = result.get('token')
            log_test("Login (Demo)", "PASS", "Logged in with demo credentials")
    else:
        auth_token = result.get('token')
        log_test("Login", "PASS", "Authentication successful")
    
    # Test 4: Token Verification
    if auth_token:
        result, error = make_request("GET", "/auth/jwt/verify", expected_status=200)
        if error:
            log_test("Token Verification", "FAIL", error)
        else:
            log_test("Token Verification", "PASS", "Token is valid")
    
    return auth_token is not None

# ==================== PATIENT MANAGEMENT TESTS ====================

def test_patient_management():
    """Test patient CRUD operations"""
    print("\n" + "="*60)
    print("TESTING PATIENT MANAGEMENT")
    print("="*60)
    
    # Test 1: Get Patients
    result, error = make_request("GET", "/secure/patients", expected_status=200)
    if error:
        log_test("Get Patients", "FAIL", error)
        return None
    else:
        patients = result.get('patients', [])
        log_test("Get Patients", "PASS", f"Found {len(patients)} patients")
    
    # Test 2: Create Patient
    new_patient = {
        "universal_patient_id": f"TEST-{int(time.time())}",
        "first_name": "Test",
        "last_name": "Patient",
        "date_of_birth": "1990-01-01",
        "gender": "M",
        "email": f"test{int(time.time())}@example.com",
        "phone_primary": "+1234567890"
    }
    result, error = make_request("POST", "/secure/patients", data=new_patient, expected_status=201)
    if error:
        log_test("Create Patient", "FAIL", error)
        patient_id = patients[0]['id'] if patients else None
    else:
        patient_id = result.get('patient', {}).get('id')
        log_test("Create Patient", "PASS", f"Created patient ID: {patient_id}")
    
    # Test 3: Get Patient Details
    if patient_id:
        result, error = make_request("GET", f"/secure/patients/{patient_id}", expected_status=200)
        if error:
            log_test("Get Patient Details", "FAIL", error)
        else:
            log_test("Get Patient Details", "PASS", f"Retrieved patient {patient_id}")
    
    return patient_id

# ==================== SCHEDULING TESTS ====================

def test_scheduling(patient_id, provider_id=None, facility_id=None):
    """Test scheduling features"""
    print("\n" + "="*60)
    print("TESTING SCHEDULING & REMINDERS")
    print("="*60)
    
    if not patient_id:
        log_test("Scheduling Tests", "SKIP", "No patient ID available")
        return None
    
    # Test 1: Get Appointments
    result, error = make_request("GET", "/scheduling/appointments", expected_status=200)
    if error:
        log_test("Get Appointments", "FAIL", error)
    else:
        appointments = result.get('appointments', [])
        log_test("Get Appointments", "PASS", f"Found {len(appointments)} appointments")
    
    # Test 2: Create Appointment
    appointment_data = {
        "patient_id": patient_id,
        "provider_id": provider_id or 1,
        "facility_id": facility_id or 1,
        "appointment_date": (date.today() + timedelta(days=1)).isoformat(),
        "appointment_time": "10:00:00",
        "appointment_type": "consultation",
        "reason_for_visit": "Test appointment"
    }
    result, error = make_request("POST", "/scheduling/appointments", data=appointment_data, expected_status=201)
    if error:
        log_test("Create Appointment", "FAIL", error)
        appointment_id = None
    else:
        appointment_id = result.get('appointment', {}).get('id')
        log_test("Create Appointment", "PASS", f"Created appointment ID: {appointment_id}")
    
    # Test 3: Send Reminders
    if appointment_id:
        reminder_data = {"hours_ahead": 24}
        result, error = make_request("POST", "/scheduling/appointments/send-reminders", data=reminder_data, expected_status=200)
        if error:
            log_test("Send Reminders", "FAIL", error)
        else:
            sent = result.get('reminders_sent', 0)
            log_test("Send Reminders", "PASS", f"Sent {sent} reminders")
    
    # Test 4: Get Queue
    result, error = make_request("GET", "/scheduling/queue", expected_status=200)
    if error:
        log_test("Get Queue", "FAIL", error)
    else:
        queue = result.get('queue', [])
        log_test("Get Queue", "PASS", f"Found {len(queue)} queue entries")
    
    return appointment_id

# ==================== PRESCRIBING TESTS ====================

def test_prescribing(patient_id):
    """Test prescribing features"""
    print("\n" + "="*60)
    print("TESTING PRESCRIBING & DRUG INTERACTIONS")
    print("="*60)
    
    if not patient_id:
        log_test("Prescribing Tests", "SKIP", "No patient ID available")
        return None
    
    # Test 1: Search Drugs
    result, error = make_request("GET", "/prescribing/drugs", data={"search": "aspirin"}, expected_status=200)
    if error:
        log_test("Search Drugs", "FAIL", error)
        drug_id = None
    else:
        drugs = result.get('drugs', [])
        drug_id = drugs[0]['id'] if drugs else None
        log_test("Search Drugs", "PASS", f"Found {len(drugs)} drugs")
    
    # Test 2: Check Drug Interactions
    if drug_id:
        interaction_data = {
            "drug_ids": [drug_id],
            "patient_id": patient_id
        }
        result, error = make_request("POST", "/prescribing/prescriptions/check-interactions", data=interaction_data, expected_status=200)
        if error:
            log_test("Check Drug Interactions", "FAIL", error)
        else:
            has_interactions = result.get('has_interactions', False)
            warnings = result.get('warnings', [])
            log_test("Check Drug Interactions", "PASS", f"Interactions: {has_interactions}, Warnings: {len(warnings)}")
    
    # Test 3: Get Prescriptions
    result, error = make_request("GET", "/prescribing/prescriptions", data={"patient_id": patient_id}, expected_status=200)
    if error:
        log_test("Get Prescriptions", "FAIL", error)
    else:
        prescriptions = result.get('prescriptions', [])
        log_test("Get Prescriptions", "PASS", f"Found {len(prescriptions)} prescriptions")
    
    return drug_id

# ==================== BILLING TESTS ====================

def test_billing(patient_id, facility_id=None):
    """Test billing and EDI generation"""
    print("\n" + "="*60)
    print("TESTING BILLING & EDI GENERATION")
    print("="*60)
    
    if not patient_id:
        log_test("Billing Tests", "SKIP", "No patient ID available")
        return None
    
    # Test 1: Get Billing Codes
    result, error = make_request("GET", "/billing/billing-codes", expected_status=200)
    if error:
        log_test("Get Billing Codes", "FAIL", error)
        billing_code_id = None
    else:
        codes = result.get('billing_codes', [])
        billing_code_id = codes[0]['id'] if codes else None
        log_test("Get Billing Codes", "PASS", f"Found {len(codes)} billing codes")
    
    # Test 2: Create Charge
    if billing_code_id:
        charge_data = {
            "patient_id": patient_id,
            "facility_id": facility_id or 1,
            "charge_date": date.today().isoformat(),
            "billing_code_id": billing_code_id,
            "quantity": 1,
            "unit_price": 100.00
        }
        result, error = make_request("POST", "/billing/charges", data=charge_data, expected_status=201)
        if error:
            log_test("Create Charge", "FAIL", error)
            charge_id = None
        else:
            charge_id = result.get('charge', {}).get('id')
            log_test("Create Charge", "PASS", f"Created charge ID: {charge_id}")
    else:
        charge_id = None
    
    # Test 3: Create Claim
    if charge_id:
        claim_data = {
            "patient_id": patient_id,
            "facility_id": facility_id or 1,
            "claim_type": "primary",
            "charge_ids": [charge_id]
        }
        result, error = make_request("POST", "/billing/claims", data=claim_data, expected_status=201)
        if error:
            log_test("Create Claim", "FAIL", error)
            claim_id = None
        else:
            claim_id = result.get('claim', {}).get('id')
            log_test("Create Claim", "PASS", f"Created claim ID: {claim_id}")
            
            # Test 4: Submit Claim (EDI Generation)
            if claim_id:
                result, error = make_request("POST", f"/billing/claims/{claim_id}/submit", expected_status=200)
                if error:
                    log_test("Submit Claim (EDI)", "FAIL", error)
                else:
                    edi_path = result.get('claim', {}).get('edi_file_path')
                    log_test("Submit Claim (EDI)", "PASS", f"EDI file: {edi_path or 'Generated'}")
    else:
        claim_id = None
    
    # Test 5: Get Statements
    result, error = make_request("GET", "/billing/statements", data={"patient_id": patient_id}, expected_status=200)
    if error:
        log_test("Get Statements", "FAIL", error)
    else:
        statements = result.get('statements', [])
        log_test("Get Statements", "PASS", f"Found {len(statements)} statements")
    
    return claim_id

# ==================== PHARMACY TESTS ====================

def test_pharmacy():
    """Test pharmacy features"""
    print("\n" + "="*60)
    print("TESTING PHARMACY FULFILLMENT")
    print("="*60)
    
    # Test 1: Search Pharmacies
    result, error = make_request("GET", "/pharmacy/pharmacies", data={"latitude": 6.5244, "longitude": 3.3792}, expected_status=200)
    if error:
        log_test("Search Pharmacies", "FAIL", error)
    else:
        pharmacies = result.get('pharmacies', [])
        log_test("Search Pharmacies", "PASS", f"Found {len(pharmacies)} pharmacies")
    
    return pharmacies[0]['id'] if pharmacies else None

# ==================== INSURANCE TESTS ====================

def test_insurance():
    """Test insurance features"""
    print("\n" + "="*60)
    print("TESTING INSURANCE PLATFORM")
    print("="*60)
    
    # Test 1: Get Insurance Plans
    result, error = make_request("GET", "/insurance/plans", data={"is_active": True}, expected_status=200)
    if error:
        log_test("Get Insurance Plans", "FAIL", error)
    else:
        plans = result.get('plans', [])
        log_test("Get Insurance Plans", "PASS", f"Found {len(plans)} plans")
    
    return plans[0]['id'] if plans else None

# ==================== RPM TESTS ====================

def test_rpm(patient_id):
    """Test Remote Patient Monitoring"""
    print("\n" + "="*60)
    print("TESTING REMOTE PATIENT MONITORING")
    print("="*60)
    
    if not patient_id:
        log_test("RPM Tests", "SKIP", "No patient ID available")
        return None
    
    # Test 1: Register Device
    device_data = {
        "patient_id": patient_id,
        "device_type": "blood_pressure_monitor",
        "device_serial_number": f"RPM-{int(time.time())}",
        "device_model": "Test BP Monitor"
    }
    result, error = make_request("POST", "/rpm/devices", data=device_data, expected_status=201)
    if error:
        log_test("Register RPM Device", "FAIL", error)
        device_id = None
    else:
        device_id = result.get('device', {}).get('id')
        log_test("Register RPM Device", "PASS", f"Registered device ID: {device_id}")
    
    # Test 2: Submit Vital Reading
    if device_id:
        reading_data = {
            "device_id": device_id,
            "patient_id": patient_id,
            "systolic_bp": 120,
            "diastolic_bp": 80,
            "heart_rate": 72,
            "reading_timestamp": datetime.now().isoformat()
        }
        result, error = make_request("POST", "/rpm/readings", data=reading_data, expected_status=201)
        if error:
            log_test("Submit Vital Reading", "FAIL", error)
        else:
            log_test("Submit Vital Reading", "PASS", "Vital reading submitted")
    
    # Test 3: Get Alerts
    result, error = make_request("GET", "/rpm/alerts", data={"patient_id": patient_id}, expected_status=200)
    if error:
        log_test("Get RPM Alerts", "FAIL", error)
    else:
        alerts = result.get('alerts', [])
        log_test("Get RPM Alerts", "PASS", f"Found {len(alerts)} alerts")
    
    return device_id

# ==================== EMERGENCY TESTS ====================

def test_emergency(patient_id):
    """Test emergency response features"""
    print("\n" + "="*60)
    print("TESTING EMERGENCY RESPONSE & BIOMETRICS")
    print("="*60)
    
    if not patient_id:
        log_test("Emergency Tests", "SKIP", "No patient ID available")
        return None
    
    # Test 1: Emergency Access (Clinic+ ID)
    access_data = {
        "identification_method": "clinic_plus_id",
        "clinic_plus_id": f"TEST-{int(time.time())}",
        "emergency_type": "medical_emergency",
        "responder_type": "ems"
    }
    result, error = make_request("POST", "/emergency/access", data=access_data, expected_status=200)
    if error:
        log_test("Emergency Access (ID)", "FAIL", error)
    else:
        access_id = result.get('access_id')
        log_test("Emergency Access (ID)", "PASS", f"Access ID: {access_id}")
    
    # Test 2: Emergency Access (Fingerprint)
    fingerprint_data = {
        "identification_method": "fingerprint",
        "fingerprint_data": "test_fingerprint_hash_12345",
        "patient_id": patient_id,
        "emergency_type": "medical_emergency"
    }
    result, error = make_request("POST", "/emergency/access", data=fingerprint_data, expected_status=200)
    if error:
        log_test("Emergency Access (Fingerprint)", "FAIL", error)
    else:
        log_test("Emergency Access (Fingerprint)", "PASS", "Fingerprint matching attempted")
    
    # Test 3: Emergency Access (RFID)
    rfid_data = {
        "identification_method": "rfid",
        "rfid_tag": "RFID-TEST-12345",
        "patient_id": patient_id,
        "emergency_type": "medical_emergency"
    }
    result, error = make_request("POST", "/emergency/access", data=rfid_data, expected_status=200)
    if error:
        log_test("Emergency Access (RFID)", "FAIL", error)
    else:
        log_test("Emergency Access (RFID)", "PASS", "RFID matching attempted")
    
    return access_id if 'access_id' in locals() else None

# ==================== CDS TESTS ====================

def test_cds(patient_id):
    """Test Clinical Decision Support"""
    print("\n" + "="*60)
    print("TESTING CLINICAL DECISION SUPPORT")
    print("="*60)
    
    if not patient_id:
        log_test("CDS Tests", "SKIP", "No patient ID available")
        return None
    
    # Test 1: Get CDS Rules
    result, error = make_request("GET", "/cds/rules", expected_status=200)
    if error:
        log_test("Get CDS Rules", "FAIL", error)
    else:
        rules = result.get('rules', [])
        log_test("Get CDS Rules", "PASS", f"Found {len(rules)} rules")
    
    # Test 2: Check Patient CDS
    cds_data = {"encounter_id": None}
    result, error = make_request("POST", f"/cds/check-patient/{patient_id}", data=cds_data, expected_status=200)
    if error:
        log_test("Check Patient CDS", "FAIL", error)
    else:
        alerts_created = result.get('alerts_created', 0)
        log_test("Check Patient CDS", "PASS", f"Created {alerts_created} alerts")
    
    # Test 3: Get Care Gaps
    result, error = make_request("GET", "/cds/care-gaps", data={"patient_id": patient_id}, expected_status=200)
    if error:
        log_test("Get Care Gaps", "FAIL", error)
    else:
        gaps = result.get('care_gaps', [])
        log_test("Get Care Gaps", "PASS", f"Found {len(gaps)} care gaps")
    
    return True

# ==================== FHIR TESTS ====================

def test_fhir(patient_id):
    """Test FHIR integration"""
    print("\n" + "="*60)
    print("TESTING HL7/FHIR INTEGRATION")
    print("="*60)
    
    if not patient_id:
        log_test("FHIR Tests", "SKIP", "No patient ID available")
        return None
    
    # Test 1: Get FHIR Patient
    result, error = make_request("GET", f"/fhir/R4/Patient/{patient_id}", expected_status=200)
    if error:
        log_test("Get FHIR Patient", "FAIL", error)
    else:
        resource_type = result.get('resourceType')
        log_test("Get FHIR Patient", "PASS", f"Resource type: {resource_type}")
    
    # Test 2: Search FHIR Patients
    result, error = make_request("GET", "/fhir/R4/Patient", data={"name": "Test"}, expected_status=200)
    if error:
        log_test("Search FHIR Patients", "FAIL", error)
    else:
        bundle = result.get('total', 0)
        log_test("Search FHIR Patients", "PASS", f"Found {bundle} patients")
    
    # Test 3: Get FHIR MedicationRequest
    result, error = make_request("GET", "/fhir/R4/MedicationRequest", data={"patient": f"Patient/{patient_id}"}, expected_status=200)
    if error:
        log_test("Get FHIR MedicationRequest", "FAIL", error)
    else:
        total = result.get('total', 0)
        log_test("Get FHIR MedicationRequest", "PASS", f"Found {total} medication requests")
    
    # Test 4: Get FHIR Condition
    result, error = make_request("GET", "/fhir/R4/Condition", data={"patient": f"Patient/{patient_id}"}, expected_status=200)
    if error:
        log_test("Get FHIR Condition", "FAIL", error)
    else:
        total = result.get('total', 0)
        log_test("Get FHIR Condition", "PASS", f"Found {total} conditions")
    
    return True

# ==================== AI CONSULTATION TESTS ====================

def test_ai_consultation(patient_id):
    """Test AI consultation features"""
    print("\n" + "="*60)
    print("TESTING AI CONSULTATION ROOM")
    print("="*60)
    
    if not patient_id:
        log_test("AI Consultation Tests", "SKIP", "No patient ID available")
        return None
    
    # Test 1: Transcribe Audio
    transcribe_data = {
        "audio_data": "base64_encoded_audio_placeholder",
        "encounter_id": None
    }
    result, error = make_request("POST", "/ai/transcribe", data=transcribe_data, expected_status=200)
    if error:
        log_test("Transcribe Audio", "FAIL", error)
    else:
        transcription = result.get('transcription', {})
        log_test("Transcribe Audio", "PASS", f"Transcription confidence: {transcription.get('confidence', 0)}")
    
    # Test 2: Generate Documentation
    doc_data = {
        "transcription": "Patient presents with headache for 3 days",
        "encounter_id": None,
        "specialty": "general"
    }
    result, error = make_request("POST", "/ai/generate-documentation", data=doc_data, expected_status=200)
    if error:
        log_test("Generate Documentation", "FAIL", error)
    else:
        documentation = result.get('documentation', {})
        log_test("Generate Documentation", "PASS", f"Generated: {len(documentation)} sections")
    
    # Test 3: Generate Patient Summary
    summary_data = {
        "patient_id": patient_id,
        "specialty": "general"
    }
    result, error = make_request("POST", "/ai/patient-summary", data=summary_data, expected_status=200)
    if error:
        log_test("Generate Patient Summary", "FAIL", error)
    else:
        summary = result.get('summary', {})
        log_test("Generate Patient Summary", "PASS", f"Key points: {len(summary.get('key_points', []))}")
    
    return True

# ==================== PAYMENT TESTS ====================

def test_payments():
    """Test payment processing"""
    print("\n" + "="*60)
    print("TESTING PAYMENT PROCESSING")
    print("="*60)
    
    # Test 1: Initialize Payment
    payment_data = {
        "gateway": "paystack",
        "amount": 1000.00,
        "currency": "NGN",
        "description": "Test payment",
        "metadata": {"test": True}
    }
    result, error = make_request("POST", "/payments/initialize", data=payment_data, expected_status=200)
    if error:
        log_test("Initialize Payment", "FAIL", error)
    else:
        reference = result.get('payment_reference')
        log_test("Initialize Payment", "PASS", f"Payment reference: {reference}")
    
    return True

# ==================== DATA IMPORT/EXPORT TESTS ====================

def test_data_import_export(patient_id):
    """Test data import/export"""
    print("\n" + "="*60)
    print("TESTING DATA IMPORT/EXPORT")
    print("="*60)
    
    if not patient_id:
        log_test("Data Import/Export Tests", "SKIP", "No patient ID available")
        return None
    
    # Test 1: Export Patients (JSON)
    result, error = make_request("GET", "/data/export/patients", data={"format": "json"}, expected_status=200)
    if error:
        log_test("Export Patients (JSON)", "FAIL", error)
    else:
        total = result.get('total_patients', 0)
        log_test("Export Patients (JSON)", "PASS", f"Exported {total} patients")
    
    # Test 2: Export FHIR Bundle
    result, error = make_request("GET", "/data/export/fhir-bundle", data={"patient_id": patient_id}, expected_status=200)
    if error:
        log_test("Export FHIR Bundle", "FAIL", error)
    else:
        bundle_type = result.get('resourceType')
        entries = len(result.get('entry', []))
        log_test("Export FHIR Bundle", "PASS", f"Bundle type: {bundle_type}, Entries: {entries}")
    
    return True

# ==================== MAIN TEST RUNNER ====================

def run_all_tests():
    """Run all integration tests"""
    print("\n" + "="*80)
    print("CLINIC+ FRONTEND-BACKEND INTEGRATION TEST SUITE")
    print("="*80)
    print(f"Testing against: {BASE_URL}")
    print(f"Test started: {datetime.now().isoformat()}")
    print("="*80)
    
    # Test Authentication
    if not test_authentication():
        print("\n[WARN] Authentication failed. Some tests may be skipped.")
        return
    
    # Test Patient Management
    patient_id = test_patient_management()
    
    # Test Scheduling
    appointment_id = test_scheduling(patient_id)
    
    # Test Prescribing
    test_prescribing(patient_id)
    
    # Test Billing
    test_billing(patient_id)
    
    # Test Pharmacy
    test_pharmacy()
    
    # Test Insurance
    test_insurance()
    
    # Test RPM
    test_rpm(patient_id)
    
    # Test Emergency
    test_emergency(patient_id)
    
    # Test CDS
    test_cds(patient_id)
    
    # Test FHIR
    test_fhir(patient_id)
    
    # Test AI Consultation
    test_ai_consultation(patient_id)
    
    # Test Payments
    test_payments()
    
    # Test Data Import/Export
    test_data_import_export(patient_id)
    
    # Print Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    
    total_tests = len(test_results)
    passed = len([t for t in test_results if t['status'] == 'PASS'])
    failed = len([t for t in test_results if t['status'] == 'FAIL'])
    skipped = len([t for t in test_results if t['status'] == 'SKIP'])
    
    print(f"Total Tests: {total_tests}")
    print(f"[PASS] Passed: {passed}")
    print(f"[FAIL] Failed: {failed}")
    print(f"[SKIP] Skipped: {skipped}")
    print(f"Success Rate: {(passed/total_tests*100):.1f}%")
    
    print("\n" + "="*80)
    print("DETAILED RESULTS")
    print("="*80)
    
    for result in test_results:
        status_icon = "[PASS]" if result['status'] == "PASS" else "[FAIL]" if result['status'] == "FAIL" else "[SKIP]"
        print(f"{status_icon} {result['test']}: {result['status']}")
        if result['details']:
            print(f"   {result['details']}")
    
    # Save results to file
    with open('test_results.json', 'w') as f:
        json.dump({
            'summary': {
                'total': total_tests,
                'passed': passed,
                'failed': failed,
                'skipped': skipped,
                'success_rate': f"{(passed/total_tests*100):.1f}%"
            },
            'results': test_results,
            'timestamp': datetime.now().isoformat()
        }, f, indent=2)
    
    print(f"\n[INFO] Detailed results saved to: test_results.json")
    print("="*80)

if __name__ == "__main__":
    try:
        run_all_tests()
    except KeyboardInterrupt:
        print("\n\n[WARN] Tests interrupted by user")
    except Exception as e:
        print(f"\n\n[ERROR] Test suite error: {e}")
        import traceback
        traceback.print_exc()

