# Receptionist Module - Quick Start Guide

## Getting Started

### 1. Access the Receptionist Dashboard

**Login Credentials:**
- Create a receptionist user account with role "Receptionist"
- Or use an admin account to access all features

**Navigation:**
1. Login to Clinic+
2. Look for "Reception Desk" in the sidebar (visible for Receptionist role)
3. Click to access the Receptionist Dashboard

### 2. Dashboard Overview

Upon accessing the dashboard, you'll see:
- **Quick Stats**: Today's registrations, waiting patients, collections, avg wait time
- **Tab Navigation**: 7 main tabs for different functions

## Common Tasks

### Register a New Walk-in Patient

1. Click the **"Register"** tab
2. Fill in the registration form:
   - **Required fields**: First Name, Last Name, DOB, Gender, Primary Phone
   - **Optional**: Address, insurance, emergency contact
3. Click **"Register Patient"**
4. Note the generated MRN (Medical Record Number)
5. Proceed to create a visit for the patient

### Search for Existing Patient

1. Click the **"Search"** tab
2. Select search type:
   - MRN
   - Name
   - Phone
   - Date of Birth
3. Enter search query
4. Click **"Search"**
5. From results, you can:
   - Create a new visit
   - View patient details
   - Update patient information

### Check-in Appointment Patient

1. Click the **"Appointments"** tab
2. Select the date (defaults to today)
3. Find the patient's appointment
4. Click **"Check In"** button
5. Patient is now marked as checked in and added to queue

### Process OPD Fee Payment

1. Click the **"Billing"** tab
2. Enter patient MRN or search
3. Enter consultation fee amount
4. Select payment method:
   - Cash
   - Card
   - Bank Transfer
   - Insurance
5. Click **"Process Payment"**
6. Receipt ID will be generated

### Manage Patient Queue

1. Click the **"Queue"** tab
2. View current waiting patients
3. Filter by provider (optional)
4. Monitor patient status:
   - **Orange border**: Waiting
   - **Blue border**: In Consultation
   - **Green border**: Completed
5. Click **"Call Patient"** to change status

### Generate Reports

1. Click the **"Reports"** tab
2. Select report type:
   - Daily Summary
   - Shift Report
   - Collections Report
   - Wait Times Analysis
3. Set date range
4. Click **"Generate Report"**
5. View metrics and statistics

## Typical Workflow

### Walk-in Patient (New)

```
1. Patient arrives
   ↓
2. Search to verify not existing
   ↓
3. Register new patient (capture all details)
   ↓
4. Collect OPD fee
   ↓
5. Create visit (generates token)
   ↓
6. Assign to doctor/clinic
   ↓
7. Patient waits in queue
   ↓
8. Monitor status through workflow
```

### Walk-in Patient (Existing)

```
1. Patient arrives
   ↓
2. Search patient (by MRN/Name/Phone)
   ↓
3. Verify patient details
   ↓
4. Create new visit
   ↓
5. Collect OPD fee
   ↓
6. Generate token
   ↓
7. Assign to doctor
   ↓
8. Monitor queue status
```

### Appointment Patient

```
1. View today's appointments
   ↓
2. Patient arrives
   ↓
3. Verify identity
   ↓
4. Check-in appointment
   ↓
5. Process any pending payments
   ↓
6. Patient automatically added to queue
   ↓
7. Monitor consultation status
```

## Tips & Best Practices

### Patient Registration
- ✅ Always collect primary phone number
- ✅ Verify date of birth carefully
- ✅ Ask about allergies and note in system
- ✅ Scan ID proof if available
- ✅ Collect insurance information upfront

### Payment Processing
- ✅ Always generate receipt
- ✅ Verify payment method
- ✅ For insurance, verify coverage first
- ✅ Keep cash drawer balanced

### Queue Management
- ✅ Assign patients to appropriate specialists
- ✅ Prioritize emergency cases
- ✅ Keep patients informed of wait times
- ✅ Update status promptly

### Communication
- ✅ Add notes for special instructions
- ✅ Alert nurses of patient allergies
- ✅ Communicate delays to waiting patients
- ✅ Coordinate with providers on availability

## Keyboard Shortcuts (Future)

*Coming soon - keyboard shortcuts for faster navigation*

## Troubleshooting

### Can't find patient
- Try different search parameters
- Check spelling of name
- Verify phone number format
- Search by date of birth

### Payment not processing
- Verify amount is correct
- Check payment method selection
- Ensure patient is selected
- Contact IT support if persists

### Queue not updating
- Click refresh button
- Check internet connection
- Reload page if necessary

### Report not generating
- Verify date range is valid
- Check if data exists for period
- Try different report type

## Support

For technical issues or questions:
- Contact IT Support
- Check documentation: `RECEPTIONIST_MODULE_DOCUMENTATION.md`
- Report bugs to development team

## Training Resources

### Video Tutorials (Coming Soon)
- Patient Registration
- Appointment Check-in
- Payment Processing
- Queue Management

### Practice Mode
- Use test patient data
- Practice all workflows
- Familiarize with interface

## Quick Reference Card

| Task | Tab | Key Actions |
|------|-----|-------------|
| Register new patient | Register | Fill form → Submit |
| Find patient | Search | Select type → Search |
| Check-in appointment | Appointments | Find → Check In |
| Process payment | Billing | Enter amount → Pay |
| View queue | Queue | Monitor → Update status |
| Generate report | Reports | Select type → Generate |

## Daily Checklist

### Start of Shift
- [ ] Login to system
- [ ] Check today's appointments
- [ ] Review any special instructions
- [ ] Verify payment drawer

### During Shift
- [ ] Register walk-in patients
- [ ] Check-in appointment patients
- [ ] Process payments promptly
- [ ] Monitor queue regularly
- [ ] Update patient status

### End of Shift
- [ ] Generate shift report
- [ ] Verify all payments recorded
- [ ] Note any issues for next shift
- [ ] Logout from system

---

**Remember**: The Receptionist is the first point of contact. Your efficiency and friendliness set the tone for the entire patient experience!
