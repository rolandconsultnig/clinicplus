# Medical Application API Documentation

## Overview

This document provides comprehensive documentation for the Patient-Centric Multi-Tenant Medical Application API. The API is built using Flask and provides endpoints for managing patients, healthcare providers, facilities, clinical encounters, and authentication.

## Base URL

```
http://localhost:5000/api
```

## Authentication

The API uses session-based authentication. Users must log in to receive authentication tokens for accessing protected endpoints.

## Response Format

All API responses follow a consistent format:

```json
{
  "success": true|false,
  "data": {...},
  "message": "Success or error message",
  "error": "Error details (if applicable)"
}
```

## Patient Management Endpoints

### Get All Patients
- **GET** `/patients`
- **Query Parameters:**
  - `page` (int): Page number (default: 1)
  - `per_page` (int): Items per page (default: 20)
  - `search` (string): Search term for name or patient ID
- **Response:** List of patients with pagination

### Get Patient by ID
- **GET** `/patients/{patient_id}`
- **Parameters:**
  - `patient_id`: Patient ID or Universal Patient ID
- **Response:** Patient details with medical history, allergies, and medications

### Create New Patient
- **POST** `/patients`
- **Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "middle_name": "Michael",
  "date_of_birth": "1985-06-15",
  "gender": "male",
  "phone_primary": "555-123-4567",
  "email": "john.doe@email.com",
  "address_line1": "123 Main St",
  "city": "Anytown",
  "state": "CA",
  "zip_code": "12345",
  "emergency_contact_name": "Jane Doe",
  "emergency_contact_phone": "555-987-6543",
  "insurance_provider": "Blue Cross",
  "allow_cross_facility_sharing": true
}
```

### Update Patient
- **PUT** `/patients/{patient_id}`
- **Body:** Same as create patient (partial updates allowed)

### Add Medical History
- **POST** `/patients/{patient_id}/medical-history`
- **Body:**
```json
{
  "condition_name": "Hypertension",
  "condition_code": "I10",
  "diagnosis_date": "2023-01-15",
  "status": "active",
  "severity": "moderate",
  "notes": "Well controlled with medication",
  "created_by": 1
}
```

### Add Allergy Information
- **POST** `/patients/{patient_id}/allergies`
- **Body:**
```json
{
  "allergen": "Penicillin",
  "allergen_type": "drug",
  "reaction": "Rash and swelling",
  "severity": "moderate",
  "onset_date": "2020-03-10",
  "created_by": 1
}
```

### Add Medication
- **POST** `/patients/{patient_id}/medications`
- **Body:**
```json
{
  "medication_name": "Lisinopril",
  "generic_name": "Lisinopril",
  "dosage": "10mg",
  "frequency": "Once daily",
  "route": "oral",
  "start_date": "2023-01-15",
  "status": "active",
  "prescribing_provider_id": 1,
  "pharmacy_name": "CVS Pharmacy"
}
```

### Search Patients
- **GET** `/patients/search`
- **Query Parameters:**
  - `first_name`: First name
  - `last_name`: Last name
  - `date_of_birth`: Date of birth (YYYY-MM-DD)
  - `phone`: Phone number

## Provider Management Endpoints

### Get All Providers
- **GET** `/providers`
- **Query Parameters:**
  - `page`, `per_page`: Pagination
  - `provider_type`: Filter by provider type
  - `specialty`: Filter by specialty
  - `facility_id`: Filter by facility

### Get Provider by ID
- **GET** `/providers/{provider_id}`
- **Response:** Provider details with facility affiliations

### Create New Provider
- **POST** `/providers`
- **Body:**
```json
{
  "first_name": "Dr. Sarah",
  "last_name": "Johnson",
  "title": "MD",
  "provider_type": "physician",
  "specialty": "Internal Medicine",
  "medical_license_number": "MD123456",
  "medical_license_state": "CA",
  "medical_license_expiry": "2025-12-31",
  "npi_number": "1234567890",
  "phone": "555-111-2222",
  "email": "dr.johnson@hospital.com",
  "employment_status": "active"
}
```

### Update Provider
- **PUT** `/providers/{provider_id}`
- **Body:** Same as create provider (partial updates allowed)

### Get Provider Types
- **GET** `/providers/types`
- **Response:** List of available provider types

## Facility Management Endpoints

### Get All Facilities
- **GET** `/facilities`
- **Query Parameters:**
  - `page`, `per_page`: Pagination
  - `facility_type`: Filter by facility type
  - `state`: Filter by state

### Get Facility by ID
- **GET** `/facilities/{facility_id}`
- **Response:** Facility details with provider affiliations

### Create New Facility
- **POST** `/facilities`
- **Body:**
```json
{
  "facility_name": "General Hospital",
  "facility_type": "hospital",
  "address_line1": "456 Hospital Ave",
  "city": "Medical City",
  "state": "CA",
  "zip_code": "54321",
  "phone": "555-HOSPITAL",
  "email": "info@generalhospital.com",
  "license_number": "HOSP123",
  "accreditation_status": "accredited"
}
```

### Update Facility
- **PUT** `/facilities/{facility_id}`
- **Body:** Same as create facility (partial updates allowed)

### Get Facility Types
- **GET** `/facilities/types`
- **Response:** List of available facility types

### Create Provider-Facility Affiliation
- **POST** `/provider-facility-affiliations`
- **Body:**
```json
{
  "provider_id": 1,
  "facility_id": 1,
  "role": "attending",
  "department": "Internal Medicine",
  "start_date": "2023-01-01",
  "is_primary_facility": true
}
```

## Clinical Encounter Endpoints

### Get All Encounters
- **GET** `/encounters`
- **Query Parameters:**
  - `page`, `per_page`: Pagination
  - `patient_id`: Filter by patient
  - `provider_id`: Filter by provider
  - `facility_id`: Filter by facility
  - `encounter_type`: Filter by encounter type
  - `date_from`, `date_to`: Date range filter

### Get Encounter by ID
- **GET** `/encounters/{encounter_id}`
- **Response:** Encounter details with vital signs, notes, and lab orders

### Create New Encounter
- **POST** `/encounters`
- **Body:**
```json
{
  "patient_id": 1,
  "provider_id": 1,
  "facility_id": 1,
  "encounter_type": "office_visit",
  "encounter_date": "2023-09-20 10:00:00",
  "chief_complaint": "Annual physical exam",
  "visit_reason": "Routine checkup"
}
```

### Update Encounter
- **PUT** `/encounters/{encounter_id}`
- **Body:** Same as create encounter (partial updates allowed)

### Add Vital Signs
- **POST** `/encounters/{encounter_id}/vital-signs`
- **Body:**
```json
{
  "systolic_bp": 120,
  "diastolic_bp": 80,
  "heart_rate": 72,
  "respiratory_rate": 16,
  "temperature": 98.6,
  "oxygen_saturation": 98.0,
  "height_inches": 70,
  "weight_pounds": 180,
  "pain_scale": 0,
  "measured_by": 1
}
```

### Add Clinical Note
- **POST** `/encounters/{encounter_id}/notes`
- **Body:**
```json
{
  "note_type": "progress_note",
  "note_title": "Annual Physical Exam",
  "note_content": "Patient appears well. No acute distress...",
  "author_id": 1,
  "status": "draft"
}
```

### Sign Clinical Note
- **PUT** `/notes/{note_id}/sign`
- **Body:**
```json
{
  "signed_by": 1
}
```

### Get Encounter Types
- **GET** `/encounter-types`
- **Response:** List of available encounter types

## Laboratory Management Endpoints

### Create Lab Order
- **POST** `/lab-orders`
- **Body:**
```json
{
  "encounter_id": 1,
  "patient_id": 1,
  "ordering_provider_id": 1,
  "test_name": "Complete Blood Count",
  "test_code": "CBC",
  "test_category": "hematology",
  "priority": "routine",
  "clinical_indication": "Annual screening",
  "specimen_type": "blood"
}
```

### Get Lab Order
- **GET** `/lab-orders/{order_id}`
- **Response:** Lab order details with results

### Update Lab Order Status
- **PUT** `/lab-orders/{order_id}/status`
- **Body:**
```json
{
  "order_status": "collected",
  "collection_date": "2023-09-20 14:30:00"
}
```

### Create Lab Result
- **POST** `/lab-results`
- **Body:**
```json
{
  "lab_order_id": 1,
  "patient_id": 1,
  "test_name": "Hemoglobin",
  "result_value": "14.2",
  "result_unit": "g/dL",
  "reference_range": "12.0-15.5",
  "abnormal_flag": "normal",
  "performing_lab": "Central Lab",
  "lab_technician_id": 2
}
```

### Get Lab Result
- **GET** `/lab-results/{result_id}`
- **Response:** Lab result details

### Get Patient Lab Results
- **GET** `/patients/{patient_id}/lab-results`
- **Query Parameters:**
  - `page`, `per_page`: Pagination
  - `test_category`: Filter by test category
  - `date_from`, `date_to`: Date range filter

### Get Test Categories
- **GET** `/test-categories`
- **Response:** List of available test categories

## Authentication Endpoints

### Register User
- **POST** `/register`
- **Body:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "secure_password",
  "user_type": "patient",
  "patient_id": 1
}
```

### Login
- **POST** `/login`
- **Body:**
```json
{
  "username": "john_doe",
  "password": "secure_password"
}
```

### Logout
- **POST** `/logout`
- **Body:**
```json
{
  "user_id": 1
}
```

### Change Password
- **PUT** `/users/{user_id}/change-password`
- **Body:**
```json
{
  "current_password": "old_password",
  "new_password": "new_password"
}
```

### Toggle User Status
- **PUT** `/users/{user_id}/toggle-status`
- **Response:** Activates or deactivates user account

## Role and Permission Management

### Get All Roles
- **GET** `/roles`
- **Response:** List of all roles

### Create Role
- **POST** `/roles`
- **Body:**
```json
{
  "role_name": "Nurse",
  "role_description": "Registered nurse with patient care responsibilities",
  "role_category": "clinical",
  "facility_specific": true
}
```

### Get All Permissions
- **GET** `/permissions`
- **Response:** List of all permissions

### Create Permission
- **POST** `/permissions`
- **Body:**
```json
{
  "permission_name": "view_patient_data",
  "permission_description": "View patient medical records",
  "resource_type": "patient_data",
  "action": "read"
}
```

### Assign Role to User
- **POST** `/user-roles`
- **Body:**
```json
{
  "user_id": 1,
  "role_id": 2,
  "facility_id": 1,
  "assigned_by": 3
}
```

### Assign Permission to Role
- **POST** `/role-permissions`
- **Body:**
```json
{
  "role_id": 2,
  "permission_id": 1,
  "data_scope": "own_patients"
}
```

## Cross-Facility Data Access

### Grant Patient Data Access
- **POST** `/patient-data-access`
- **Body:**
```json
{
  "patient_id": 1,
  "requesting_facility_id": 2,
  "source_facility_id": 1,
  "data_types_allowed": "[\"demographics\", \"medical_history\", \"lab_results\"]",
  "expires_at": "2023-10-20 23:59:59",
  "granted_by_patient": true
}
```

### Verify Data Access Token
- **GET** `/patient-data-access/{access_token}`
- **Response:** Access token details and permissions

### Revoke Data Access
- **PUT** `/patient-data-access/{access_token}/revoke`
- **Body:**
```json
{
  "revoked_by": 1
}
```

## Audit and Compliance

### Get Audit Logs
- **GET** `/audit-logs`
- **Query Parameters:**
  - `page`, `per_page`: Pagination
  - `user_id`: Filter by user
  - `action_type`: Filter by action type
  - `patient_id`: Filter by patient
  - `facility_id`: Filter by facility
  - `date_from`, `date_to`: Date range filter

## Error Codes

- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **423**: Locked (account locked)
- **500**: Internal Server Error

## Data Types and Enums

### Provider Types
- physician
- nurse
- pharmacist
- lab_technician
- radiographer
- physical_therapist
- respiratory_therapist
- social_worker
- nutritionist
- administrator

### Facility Types
- hospital
- clinic
- urgent_care
- pharmacy
- diagnostic_lab
- imaging_center
- surgery_center
- rehabilitation_center
- nursing_home
- home_health

### Encounter Types
- office_visit
- emergency
- inpatient
- outpatient
- telemedicine
- consultation
- follow_up
- annual_physical
- urgent_care
- surgery

### Test Categories
- chemistry
- hematology
- microbiology
- immunology
- pathology
- radiology
- cardiology
- endocrinology
- toxicology
- genetics

## Security Considerations

1. **Authentication**: All endpoints require proper authentication except for registration and login
2. **Authorization**: Role-based access control ensures users can only access appropriate data
3. **Audit Logging**: All data access is logged for HIPAA compliance
4. **Data Encryption**: Sensitive data is encrypted at rest and in transit
5. **Cross-Facility Access**: Patient consent required for data sharing between facilities
6. **Account Security**: Failed login attempts result in temporary account lockout

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- Authentication endpoints: 5 requests per minute
- Data retrieval endpoints: 100 requests per minute
- Data modification endpoints: 50 requests per minute

## Pagination

List endpoints support pagination with the following parameters:
- `page`: Page number (default: 1)
- `per_page`: Items per page (default: 20, max: 100)

Response includes pagination metadata:
```json
{
  "total": 150,
  "pages": 8,
  "current_page": 1
}
```

