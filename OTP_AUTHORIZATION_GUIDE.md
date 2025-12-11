# OTP Authorization System Documentation

## Overview

The OTP (One-Time Password) authorization system allows patients to generate authorization codes via SMS that providers must verify before accessing patient data. This adds an extra layer of security and ensures patient consent for data access.

## Features

- **Patient-initiated OTP generation**: Patients can generate OTP codes for provider access
- **SMS delivery**: OTP codes are sent via SMS using Twilio
- **Time-limited access**: OTPs expire after 15 minutes
- **Session-based verification**: Once verified, providers can access patient data for 1 hour
- **Access scope control**: Patients can specify what data types providers can access
- **Audit logging**: All OTP generation and verification events are logged

## API Endpoints

### 1. Generate OTP (Patient)

**Endpoint:** `POST /api/otp/patient/generate`

**Authentication:** Required (Patient role)

**Request Body:**
```json
{
  "patient_id": 123,
  "phone_number": "+1234567890",  // Optional, defaults to patient's primary phone
  "provider_id": 456,              // Optional, for specific provider
  "facility_id": 789,               // Optional, for specific facility
  "access_scope": [                 // Optional, defaults to all data types
    "demographics",
    "medical_history",
    "allergies",
    "medications",
    "lab_results",
    "encounters"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP generated and sent successfully",
  "otp_id": 1,
  "expires_at": "2024-01-01T12:15:00",
  "sms_sent": true,
  "phone_number": "****7890"
}
```

### 2. Verify OTP (Provider)

**Endpoint:** `POST /api/otp/provider/verify`

**Authentication:** Required (Provider role)

**Request Body:**
```json
{
  "otp_code": "123456",
  "patient_id": 123
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "patient_id": 123,
  "access_granted": true,
  "access_scope": "['demographics', 'medical_history', ...]",
  "verified_at": "2024-01-01T12:00:00",
  "expires_at": "2024-01-01T12:15:00"
}
```

### 3. Check Verification Status

**Endpoint:** `GET /api/otp/patient/<patient_id>/verification-status`

**Authentication:** Required (Provider role)

**Response:**
```json
{
  "success": true,
  "verified": true,
  "verified_at": "2024-01-01T12:00:00",
  "access_scope": "['demographics', 'medical_history', ...]"
}
```

### 4. Get Active OTPs (Patient)

**Endpoint:** `GET /api/otp/patient/<patient_id>/active-otps`

**Authentication:** Required (Patient role)

**Response:**
```json
{
  "success": true,
  "otps": [
    {
      "id": 1,
      "patient_id": 123,
      "provider_id": null,
      "facility_id": 789,
      "expires_at": "2024-01-01T12:15:00",
      "is_used": false,
      "is_active": true,
      "is_expired": false,
      "is_valid": true,
      "verification_attempts": 0,
      "created_at": "2024-01-01T12:00:00"
    }
  ]
}
```

### 5. Revoke OTP (Patient)

**Endpoint:** `POST /api/otp/patient/<patient_id>/otp/<otp_id>/revoke`

**Authentication:** Required (Patient role)

**Response:**
```json
{
  "success": true,
  "message": "OTP revoked successfully"
}
```

## Workflow

### For Patients:

1. Patient logs into the system
2. Patient navigates to "Generate Access Code" section
3. Patient requests OTP (optionally for specific provider/facility)
4. System generates 6-digit OTP and sends via SMS
5. Patient shares OTP code with provider

### For Providers:

1. Provider attempts to access patient data
2. System checks if OTP verification is required
3. If not verified, system returns error with `otp_required: true`
4. Provider requests OTP code from patient
5. Provider verifies OTP using `/api/otp/provider/verify`
6. Once verified, provider can access patient data for 1 hour
7. After 1 hour, provider must verify OTP again

## Integration with Patient Data Access

The OTP verification is automatically enforced on the following endpoints:

- `GET /api/doctor/patient/<patient_id>` - Get patient data
- `GET /api/doctor/patient/<patient_id>/overview` - Get patient overview
- `GET /api/doctor/patient/<patient_id>/visits` - Get patient visits
- `GET /api/doctor/patient/<patient_id>/results` - Get patient results
- `GET /api/secure/patients/<patient_id>` - Get secure patient data

**Note:** System Administrators bypass OTP verification.

## Configuration

### Environment Variables

The system uses Twilio for SMS delivery. Configure the following environment variables:

```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

### OTP Settings

Default settings (can be modified in `src/routes/otp.py`):

- **OTP Length:** 6 digits
- **OTP Expiry:** 15 minutes
- **Verification Session Duration:** 1 hour
- **Max Verification Attempts:** 3

## Database Schema

The `PatientOTP` model includes:

- `otp_code`: 6-digit OTP code
- `patient_id`: Reference to patient
- `provider_id`: Optional provider-specific OTP
- `facility_id`: Optional facility-specific OTP
- `phone_number`: Phone number OTP was sent to
- `expires_at`: OTP expiration timestamp
- `verified_at`: When OTP was verified
- `is_used`: Whether OTP has been used
- `is_active`: Whether OTP is active
- `verification_attempts`: Number of failed verification attempts
- `access_scope`: JSON string of allowed data types

## Security Considerations

1. **OTP Expiration**: OTPs expire after 15 minutes to limit exposure window
2. **Single Use**: Once verified, OTPs cannot be reused
3. **Attempt Limiting**: Maximum 3 verification attempts per OTP
4. **Session Duration**: Verified access expires after 1 hour
5. **Audit Logging**: All OTP operations are logged for compliance
6. **Phone Number Masking**: API responses mask phone numbers for privacy

## Error Handling

### Common Errors:

1. **Invalid OTP Code**
   ```json
   {
     "success": false,
     "error": "Invalid OTP code",
     "attempts_remaining": 2
   }
   ```

2. **OTP Expired**
   ```json
   {
     "success": false,
     "error": "OTP is expired",
     "is_expired": true
   }
   ```

3. **OTP Already Used**
   ```json
   {
     "success": false,
     "error": "OTP is already used",
     "is_used": true
   }
   ```

4. **OTP Verification Required**
   ```json
   {
     "error": "OTP verification required to access patient data",
     "otp_required": true,
     "patient_id": 123,
     "message": "Please verify OTP code to access this patient's data"
   }
   ```

## Testing

### Test OTP Generation

```bash
curl -X POST http://localhost:5000/api/otp/patient/generate \
  -H "Authorization: Bearer <patient_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "patient_id": 123,
    "phone_number": "+1234567890"
  }'
```

### Test OTP Verification

```bash
curl -X POST http://localhost:5000/api/otp/provider/verify \
  -H "Authorization: Bearer <provider_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "otp_code": "123456",
    "patient_id": 123
  }'
```

## Migration

To add the OTP table to your database, run:

```python
# Create migration
from src.models.user import db
from src.models.auth import PatientOTP
from src import app

with app.app_context():
    db.create_all()
```

Or use Alembic:

```bash
alembic revision --autogenerate -m "Add PatientOTP table"
alembic upgrade head
```

## Future Enhancements

Potential improvements:

1. Email OTP delivery option
2. QR code generation for OTP sharing
3. OTP templates for different access levels
4. Bulk OTP generation for multiple providers
5. OTP usage analytics and reporting
6. Integration with patient portal for easier OTP management

