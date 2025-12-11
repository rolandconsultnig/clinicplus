# Clinic+ API Routes Summary

## Overview
All API routes for Clinic+ comprehensive modules have been implemented and registered in `main.py`.

## Registered Blueprints

### 1. Scheduling (`/api/scheduling`)
- `GET /appointments` - Get appointments with filtering
- `POST /appointments` - Create appointment
- `GET /appointments/<id>` - Get specific appointment
- `PUT /appointments/<id>` - Update appointment
- `POST /appointments/<id>/check-in` - Check in patient
- `GET /queue` - Get queue entries
- `POST /queue` - Add to queue
- `POST /queue/<id>/call` - Call next patient
- `GET /providers/<id>/schedule` - Get provider schedule
- `POST /providers/<id>/schedule` - Create provider schedule

### 2. Billing (`/api/billing`)
- `GET /billing-codes` - Search billing codes (CPT4, ICD-10, HCPCS)
- `POST /charges` - Create charge
- `GET /charges` - Get charges
- `POST /claims` - Create claim
- `POST /claims/<id>/submit` - Submit claim electronically
- `POST /payments` - Record payment
- `GET /statements` - Get statements
- `POST /statements` - Generate statement

### 3. Prescribing (`/api/prescribing`)
- `GET /drugs` - Search drugs
- `GET /drugs/<id>/interactions` - Get drug interactions
- `POST /prescriptions/check-interactions` - Check interactions before prescribing
- `POST /prescriptions` - Create prescription
- `GET /prescriptions` - Get prescriptions
- `POST /prescriptions/<id>/refill` - Refill prescription

### 4. Pharmacy (`/api/pharmacy`)
- `GET /pharmacies` - Search pharmacies (with location and stock filtering)
- `GET /pharmacies/<id>/inventory/<drug_id>` - Get inventory
- `POST /prescriptions/<id>/fulfill` - Fulfill prescription
- `POST /fulfillments/<id>/pickup` - Mark as picked up
- `POST /pharmacies/<id>/inventory` - Update inventory

### 5. Insurance (`/api/insurance`)
- `GET /plans` - Get insurance plans
- `POST /subscriptions` - Subscribe to plan
- `GET /subscriptions` - Get subscriptions
- `POST /subscriptions/<id>/pay` - Pay premium
- `POST /claims` - Create insurance claim
- `POST /claims/<id>/approve` - Approve claim
- `POST /passenger-accident-cover` - Create passenger accident cover
- `POST /passenger-accident-cover/<id>/claim` - File claim

### 6. Professional (`/api/professional`)
- `POST /credentials` - Upload credential
- `POST /credentials/<id>/verify` - Verify credential
- `POST /credentials/check-expiry` - Check expired credentials (automated)
- `POST /tokens` - Purchase professional token
- `POST /tokens/<id>/pay` - Pay token fee
- `POST /tokens/<id>/renew` - Renew token

### 7. RPM (`/api/rpm`)
- `POST /devices` - Register PulseGuard device
- `POST /devices/<id>/pair` - Pair device
- `POST /readings` - Submit vital reading
- `GET /readings` - Get vital readings
- `GET /alerts` - Get alerts
- `POST /alerts/<id>/acknowledge` - Acknowledge alert
- `POST /alert-rules` - Create alert rule
- `POST /telehealth/sessions` - Create telehealth session

### 8. Emergency (`/api/emergency`)
- `POST /access` - Emergency access to patient data
- `POST /handoff` - Create hospital handoff
- `POST /handoff/<id>/acknowledge` - Acknowledge handoff
- `POST /handoff/<id>/arrived` - Mark as arrived
- `GET /devices` - Get EMS devices
- `POST /devices/<id>/location` - Update device location

## Authentication & Authorization

All routes use:
- `@token_required` - JWT authentication
- `@role_required(['role1', 'role2'])` - Role-based access control
- `@tenant_isolation_required` - Multi-tenant data isolation

## Error Handling

All routes return consistent JSON responses:
```json
{
  "success": true/false,
  "data": {...},
  "error": "error message"
}
```

## Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

