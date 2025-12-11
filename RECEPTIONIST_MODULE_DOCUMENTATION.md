# Receptionist Module Documentation

## Overview
The Receptionist Module is a comprehensive patient registration and flow management system designed for high-throughput walk-in patient processing. It serves as the primary gatekeeper interface for converting walk-in visitors into registered, scheduled, and paying patients with a clear path to care.

## Features Implemented

### I. Core Patient Registration & Management

#### 1. New Patient Registration (Walk-in)
- **Location**: `ReceptionistDashboard.jsx` - `NewPatientRegistration` component
- **API Endpoint**: `POST /api/receptionist/register-patient`
- **Features**:
  - Fast registration form with essential demographics
  - Contact information capture (phone, email, address)
  - Emergency contact details
  - Insurance information entry
  - ID proof documentation
  - Referring doctor tracking
  - Auto-generated unique MRN (Medical Record Number)

#### 2. Existing Patient Search
- **Location**: `ReceptionistDashboard.jsx` - `PatientSearchPanel` component
- **API Endpoint**: `GET /api/receptionist/search-patient`
- **Search Parameters**:
  - MRN (Medical Record Number)
  - Patient Name (First/Last)
  - Phone Number
  - Date of Birth
- **Features**:
  - Multi-parameter search functionality
  - Quick patient lookup
  - Patient details display
  - Direct visit creation from search results

#### 3. Patient Demographics Update
- **API Endpoint**: `PUT /api/receptionist/update-patient/:id`
- **Updatable Fields**:
  - Contact information (phone, email)
  - Address details
  - Emergency contact information
- **Features**:
  - Real-time validation
  - Audit trail tracking
  - Version control

#### 4. Encounter/Visit Creation
- **API Endpoint**: `POST /api/receptionist/create-visit`
- **Features**:
  - Unique Visit ID generation
  - Token number assignment
  - Registration fee tracking
  - Chief complaint capture
  - Workflow status initialization

### II. Financial & Billing Module

#### 1. OPD/Consultation Fee Payment
- **Location**: `ReceptionistDashboard.jsx` - `BillingPanel` component
- **API Endpoint**: `POST /api/receptionist/generate-bill`
- **Features**:
  - Quick fee entry
  - Multiple payment method support
  - Receipt generation
  - Real-time payment processing

#### 2. Payment Method Recording
- **Supported Methods**:
  - Cash
  - Credit/Debit Card
  - Bank Transfer
  - Insurance/Corporate Scheme
- **Features**:
  - Payment method validation
  - Transaction reference tracking
  - Payment status monitoring

#### 3. Insurance/Scheme Verification
- **Features**:
  - Policy number validation
  - Group number verification
  - Coverage eligibility check
  - Co-pay calculation
  - Insurance provider lookup

#### 4. Receipt Generation
- **Features**:
  - Auto-generated receipt ID
  - Printable receipts
  - Email receipt option
  - Payment history tracking

### III. Patient Flow & Status Tracking

#### 1. Queue Management/Token System
- **Location**: `ReceptionistDashboard.jsx` - `QueueManagementPanel` component
- **API Endpoints**:
  - `GET /api/receptionist/queue`
  - `PUT /api/receptionist/queue/:id/status`
- **Features**:
  - Digital token generation
  - Queue position tracking
  - Priority-based queuing
  - Real-time status updates
  - Visual queue display

#### 2. Patient Status Update
- **Status Types**:
  - Waiting
  - In Consultation
  - In Investigation
  - Billing
  - Discharged
- **Features**:
  - Color-coded status indicators
  - Real-time status transitions
  - Status history tracking

#### 3. Doctor/Clinic Assignment
- **API Endpoint**: `GET /api/receptionist/providers`
- **Features**:
  - Provider directory
  - Specialty-based assignment
  - Availability checking
  - Clinic/department routing

#### 4. Transfer to Triage/Vitals
- **Features**:
  - Digital file transfer
  - Triage priority setting
  - Vital signs preparation
  - Nurse station notification

### IV. Communication & Reporting Tools

#### 1. Internal Messaging/Notes
- **Features**:
  - Quick notes to doctors/nurses
  - Allergy alerts
  - Special instructions
  - Patient preferences

#### 2. Doctor/Department Directory
- **API Endpoint**: `GET /api/receptionist/providers`
- **Features**:
  - Searchable provider list
  - Specialty information
  - Current availability status
  - Contact information

#### 3. Daily/Shift Reports
- **Location**: `ReceptionistDashboard.jsx` - `ReportsPanel` component
- **API Endpoint**: `GET /api/receptionist/reports/:type`
- **Report Types**:
  - Daily Summary
  - Shift Report
  - Collections Report
  - Wait Times Analysis
- **Metrics**:
  - Total patients registered
  - Total collections
  - Average wait time
  - No-show tracking

#### 4. Document/ID Upload
- **Features**:
  - ID document scanning
  - Insurance card upload
  - Referral letter attachment
  - Document management integration

## Dashboard Overview

### Quick Statistics
The dashboard displays real-time metrics:
- Today's Registrations
- Waiting Patients
- Total Collections
- Average Wait Time

### Tab Navigation
1. **Overview**: Today's appointments and recent registrations
2. **Register**: New patient registration form
3. **Search**: Patient search and lookup
4. **Appointments**: Appointment management and check-in
5. **Billing**: Fee payment and receipt generation
6. **Queue**: Queue management and patient flow
7. **Reports**: Analytics and reporting

## API Endpoints Summary

### Patient Management
- `POST /api/receptionist/register-patient` - Register new patient
- `GET /api/receptionist/search-patient` - Search patients
- `PUT /api/receptionist/update-patient/:id` - Update patient info
- `POST /api/receptionist/create-visit` - Create new visit

### Appointments
- `GET /api/receptionist/appointments` - Get appointments by date
- `POST /api/receptionist/check-in/:id` - Check in patient

### Billing
- `POST /api/receptionist/generate-bill` - Generate bill and process payment

### Queue Management
- `GET /api/receptionist/queue` - Get current queue
- `PUT /api/receptionist/queue/:id/status` - Update queue status

### Providers
- `GET /api/receptionist/providers` - Get provider list

### Reports
- `GET /api/receptionist/reports/:type` - Generate reports

### Dashboard
- `GET /api/receptionist/stats` - Get dashboard statistics
- `GET /api/receptionist/overview` - Get overview data

## Database Models Used

### Patient Model
- `patients` table - Core patient demographics

### OPDVisit Model
- `opd_visits` table - Visit tracking and workflow

### OPDQueue Model
- `opd_queue` table - Queue management

### Appointment Model
- `appointments` table - Scheduled appointments

### Payment Model
- `payments` table - Payment transactions

### Provider Model
- `providers` table - Healthcare providers

## User Roles & Permissions

### Receptionist Role
- Patient registration
- Appointment check-in
- Payment processing
- Queue management
- Report generation

### Required Permissions
- `@role_required(['Receptionist', 'System Administrator'])`

## Workflow

### Walk-in Patient Flow
1. **Arrival** → Patient arrives at reception
2. **Search** → Check if existing patient (search by name/phone/DOB)
3. **Register** → If new, complete registration form
4. **Payment** → Collect OPD/consultation fee
5. **Token** → Generate and assign queue token
6. **Assign** → Assign to appropriate doctor/clinic
7. **Queue** → Add to waiting queue
8. **Monitor** → Track patient status through workflow
9. **Discharge** → Complete visit and generate summary

### Appointment Patient Flow
1. **View** → Check today's appointments
2. **Verify** → Verify patient identity
3. **Check-in** → Mark patient as checked in
4. **Payment** → Process any pending payments
5. **Queue** → Add to provider's queue
6. **Monitor** → Track consultation status

## UI Components

### Main Dashboard
- `ReceptionistDashboard` - Main container component

### Sub-components
- `OverviewPanel` - Dashboard overview
- `NewPatientRegistration` - Registration form
- `PatientSearchPanel` - Search interface
- `PatientDetailsCard` - Patient information display
- `AppointmentsPanel` - Appointment management
- `BillingPanel` - Payment processing
- `QueueManagementPanel` - Queue tracking
- `ReportsPanel` - Analytics and reports

## Styling & Icons

### Lucide Icons Used
- `UserPlus` - New registration
- `Search` - Patient search
- `Calendar` - Appointments
- `DollarSign` - Billing
- `Users` - Patient list
- `Clock` - Wait times
- `UserCheck` - Reception desk
- `Activity` - Status tracking
- `BarChart3` - Reports

### Color Coding
- **Blue** - General information
- **Green** - Completed/Success
- **Orange** - Waiting/Pending
- **Purple** - Analytics
- **Red** - Alerts/Errors

## Integration Points

### Existing Modules
- Patient Management System
- Appointment Scheduling
- Billing System
- Queue Management
- Document Management
- Provider Directory

### External Systems
- Insurance verification (placeholder)
- Payment gateway (placeholder)
- SMS/Email notifications (placeholder)
- Printing services (placeholder)

## Security Features

### Authentication
- JWT token-based authentication
- Role-based access control
- Session management

### Data Protection
- Encrypted patient data
- Audit logging
- HIPAA compliance considerations

## Future Enhancements

### Planned Features
1. **Biometric Integration** - Fingerprint/facial recognition
2. **SMS Notifications** - Automated patient notifications
3. **Email Receipts** - Automatic receipt emailing
4. **Insurance API** - Real-time insurance verification
5. **Payment Gateway** - Card payment integration
6. **Kiosk Mode** - Self-service patient check-in
7. **Multi-language** - Support for multiple languages
8. **Voice Commands** - Voice-based patient search
9. **Analytics Dashboard** - Advanced reporting and analytics
10. **Mobile App** - Companion mobile application

## Testing

### Manual Testing Checklist
- [ ] Patient registration with all fields
- [ ] Patient search by different parameters
- [ ] Visit creation and token generation
- [ ] Appointment check-in
- [ ] Payment processing
- [ ] Queue status updates
- [ ] Report generation
- [ ] Provider assignment

### API Testing
Use tools like Postman or curl to test endpoints:
```bash
# Get dashboard stats
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/receptionist/stats

# Register new patient
curl -X POST -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"first_name":"John","last_name":"Doe",...}' \
  http://localhost:5000/api/receptionist/register-patient
```

## Troubleshooting

### Common Issues

1. **Token not generated**
   - Check OPDVisit creation
   - Verify facility_id in token payload

2. **Search returns no results**
   - Verify search parameter format
   - Check database connectivity

3. **Payment processing fails**
   - Validate payment amount
   - Check payment method

4. **Queue not updating**
   - Refresh queue data
   - Check WebSocket connection (if implemented)

## Performance Considerations

### Optimization
- Pagination for large patient lists
- Caching for provider directory
- Debounced search queries
- Lazy loading for reports

### Scalability
- Database indexing on search fields
- Queue management optimization
- Concurrent user handling
- Load balancing for high traffic

## Conclusion

The Receptionist Module provides a comprehensive solution for patient registration and flow management, designed to handle high-throughput walk-in scenarios efficiently. It integrates seamlessly with existing Clinic+ modules while maintaining a user-friendly interface for reception staff.

For support or feature requests, please contact the development team.
