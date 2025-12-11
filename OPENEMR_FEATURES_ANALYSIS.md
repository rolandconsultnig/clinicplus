# OpenEMR Features Analysis - Missing in Clinic+

This document lists all modules and features found in OpenEMR 7.0.0 that are not currently available in Clinic+.

## Executive Summary

OpenEMR is a comprehensive EHR system with extensive features. This analysis identifies **50+ major modules and features** that could enhance Clinic+.

---

## 1. Clinical Forms & Documentation

### Missing Clinical Forms:
1. **SOAP Notes** - Structured Subjective, Objective, Assessment, Plan documentation
2. **Physical Exam Forms** - Comprehensive physical examination documentation
3. **Review of Systems (ROS)** - Systematic review of body systems
4. **Clinical Notes** - General clinical note-taking
5. **Clinical Instructions** - Patient instruction forms
6. **Aftercare Plan** - Post-treatment care planning
7. **Treatment Plan** - Treatment planning documentation
8. **Care Plan** - Comprehensive care planning with templates
9. **Functional Cognitive Status** - Assessment of cognitive and functional status
10. **Transfer Summary** - Patient transfer documentation
11. **Clinical Reminders** - Automated clinical reminders system
12. **Patient Reminders** - Patient-specific reminder management
13. **Dictation** - Voice dictation integration
14. **Pain Map** - Visual pain mapping tool
15. **GAD-7 Assessment** - Generalized Anxiety Disorder assessment
16. **Questionnaire Assessments** - LForms-based questionnaire system
17. **Observation Forms** - Clinical observation documentation
18. **Prior Authorization** - Prior authorization request forms
19. **Procedure Orders** - Procedure ordering system
20. **Requisition Forms** - Lab/imaging requisition forms
21. **SDOH (Social Determinants of Health)** - Social determinants documentation
22. **Eye MAG** - Ophthalmology-specific forms
23. **CAMOS** - Comprehensive Assessment and Management of Osteoarthritis
24. **Ankle Injury Forms** - Specialty injury forms
25. **Bronchitis Forms** - Condition-specific forms
26. **Group Attendance** - Group therapy attendance tracking
27. **Track Anything** - Custom tracking system for any clinical data

### Form Management:
- **Forms Admin** - Administrative interface for form management
- **LBF (Layout Based Forms)** - Custom form builder
- **Form Templates** - Reusable form templates

---

## 2. Billing & Financial Management

### Advanced Billing Features:
1. **Billing Tracker** - Track billing status and workflow
2. **Payment Processing** - Multiple payment method handling
3. **ERA (Electronic Remittance Advice)** - Automated payment posting
4. **EOB (Explanation of Benefits)** Processing
5. **Daysheet Reports** - Daily financial summaries (3 variants)
6. **Receipts Report** - Receipt generation and tracking
7. **Payment Search** - Advanced payment search functionality
8. **Edit Payment** - Payment modification capabilities
9. **New Payment** - Payment entry interface
10. **Indigent Patients Report** - Financial assistance tracking
11. **UB-04 Forms** - Hospital billing forms (UB-04)
12. **UB-04 Code Management** - Code system for UB-04
13. **UB-04 Submission** - Electronic UB-04 submission
14. **Fee Sheet Customization** - Customizable fee sheets
15. **Fee Sheet Review** - Fee sheet review workflow
16. **Contraception Products** - Product-specific billing
17. **Misc Billing Options** - Additional billing configurations
18. **Insurance Allocation Report** - Insurance payment allocation
19. **Collections Report** - Accounts receivable management
20. **Payment Processing Report** - Payment processing analytics

### EDI & Claims:
- **EDI 270/271** - Eligibility inquiry and response
- **EDI Main Interface** - EDI transaction management
- **EDI View** - EDI transaction viewer
- **Claim File Generation** - Automated claim file creation

---

## 3. Patient Management

### Patient File Features:
1. **Demographics Management** - Comprehensive patient demographics
2. **Patient History** - Full patient history tracking
3. **Encounter Management** - Encounter creation and management
4. **Encounter Forms** - Multiple encounter form types
5. **Encounter Coding** - Diagnosis and procedure coding
6. **Superbill** - Quick billing code entry
7. **Superbill Custom** - Customizable superbill
8. **Problem List** - Problem-based encounter documentation
9. **Patient Summary** - Comprehensive patient summary view
10. **Patient Dashboard** - Patient overview dashboard
11. **Clinical Reminders Fragment** - Reminder display component
12. **Patient Reminders Fragment** - Patient-specific reminders
13. **Lab Data** - Laboratory results integration
14. **Vitals Fragment** - Vital signs display
15. **PNotes (Patient Notes)** - Clinical notes system
16. **Amendments** - Record amendment management
17. **Disclosure Tracking** - Record disclosure logging
18. **Advanced Directives** - Advanced directive documentation
19. **Immunizations** - Immunization tracking
20. **Shot Record** - Vaccination record
21. **Stats** - Patient statistics
22. **Track Anything Fragment** - Custom tracking display
23. **LBF Fragment** - Layout-based form display
24. **Disc Fragment** - Discontinuation tracking
25. **Birthday Alerts** - Patient birthday notifications
26. **Patient Labels** - Address and appointment labels
27. **Barcode Labels** - Barcode generation for patients
28. **Patient Letters** - Letter generation system
29. **Download Template** - Template download functionality
30. **Merge Patients** - Patient record merging
31. **Manage Duplicate Patients** - Duplicate detection and management
32. **Patient Reports** - Custom patient reports
33. **Patient Rules** - Rule-based patient management
34. **Patient Transactions** - Transaction history
35. **Referral Management** - Referral tracking
36. **Record Request** - Medical record request system
37. **Print Referral** - Referral printing
38. **Void Dialog** - Record voiding interface
39. **POS Checkout** - Point of sale integration
40. **Front Payment** - Front desk payment processing
41. **Front Payment CC** - Credit card payment processing
42. **Front Payment Terminal** - Payment terminal integration
43. **Cash Receipt** - Cash receipt generation
44. **Copay Management** - Copay collection and tracking
45. **Printed Fee Sheet** - Fee sheet printing

---

## 4. Scheduling & Calendar

### Calendar Features:
1. **PostCalendar Integration** - Advanced calendar system
2. **Calendar Modules** - Modular calendar functionality
3. **Date Selection** - Advanced date selection tools
4. **Event Filtering** - Calendar event filtering
5. **Event Sorting** - Event organization
6. **Calendar Views** - Multiple view types (month, week, day)
7. **Calendar Popups** - Event detail popups
8. **Holiday Management** - Holiday calendar
9. **Patient Tracker** - Real-time patient flow tracking
10. **Patient Flow Board** - Visual patient flow management

---

## 5. Messaging & Communication

### Communication Features:
1. **Internal Messaging** - Provider-to-provider messaging
2. **Message Templates** - Pre-defined message templates
3. **Message List** - Message management interface
4. **Direct Message Log** - Message logging
5. **ONotes** - Office notes system
6. **Batch Communication** - Bulk messaging system
7. **Batch Email** - Bulk email notifications
8. **Batch SMS** - Bulk SMS notifications
9. **Batch Phone** - Bulk phone notifications
10. **Email Notification Settings** - Email configuration
11. **SMS Notification Settings** - SMS configuration
12. **Phone Notification Settings** - Phone configuration
13. **Fax Queue** - Fax management system
14. **Fax Dispatch** - Fax sending functionality
15. **Fax View** - Fax viewing interface
16. **Fax Dispatch New PID** - New patient fax dispatch

---

## 6. Reports & Analytics

### Clinical Reports:
1. **Clinical Reports** - Comprehensive clinical reporting
2. **Encounters Report** - Encounter analytics
3. **Appointments Report** - Appointment analytics
4. **Prescriptions Report** - Prescription analytics
5. **Immunization Report** - Immunization tracking
6. **Patient List** - Patient listing reports
7. **Patient List Creation** - Custom patient lists
8. **Unique Seen Patients** - Patient visit analytics
9. **Appt Encounter Report** - Appointment-encounter correlation
10. **Chart Location Activity** - Chart access tracking
11. **Charts Checked Out** - Chart checkout management
12. **Non-Reported** - Missing report tracking
13. **Patient Edu Web Lookup** - Patient education resources
14. **AMC Tracking** - Meaningful Use tracking
15. **AMC Full Report** - Complete Meaningful Use reporting
16. **CQM (Clinical Quality Measures)** - Quality measure reporting
17. **RWT 2023 Report** - Regulatory reporting
18. **IPPF Statistics** - IPPF-specific statistics
19. **IPPF Daily** - Daily IPPF reports
20. **IPPF CYP Report** - IPPF CYP reporting

### Financial Reports:
1. **Billing Report** - Billing analytics
2. **Daily Summary Report** - Daily financial summary
3. **Services by Category** - Service categorization
4. **Svc Code Financial Report** - Service code analytics
5. **Sales by Item** - Itemized sales reports
6. **Receipts by Method** - Payment method analytics
7. **Front Receipts Report** - Front desk receipts
8. **Collections Report** - Collections analytics
9. **Payment Processing Report** - Payment analytics
10. **Insurance Allocation Report** - Insurance analytics
11. **Pat Ledger** - Patient ledger reports
12. **Custom Report Range** - Date range reporting
13. **Report Results** - Report output management
14. **Report Script** - Custom report scripting
15. **External Data** - External data integration
16. **CDR Log** - Clinical Data Repository logging

### Administrative Reports:
1. **Referrals Report** - Referral analytics
2. **Inventory Activity** - Inventory tracking
3. **Inventory List** - Inventory management
4. **Inventory Transactions** - Inventory transaction log
5. **Destroyed Drugs Report** - Drug disposal tracking
6. **Audit Log Tamper Report** - Security audit
7. **Background Services** - Service status monitoring

---

## 7. Laboratory & Orders

### Lab Features:
1. **Lab Order Management** - Lab order creation and tracking
2. **Lab Result Integration** - Automated lab result import
3. **HL7 Lab Integration** - HL7 lab message processing
4. **LabCorp Integration** - LabCorp-specific integration
5. **Universal HL7 Order Generation** - Generic HL7 order creation
6. **Lab Requisition** - Lab requisition forms
7. **Procedure Tools** - Procedure management tools
8. **Procedure Order** - Procedure ordering system
9. **Lab Data Fragment** - Lab results display
10. **Lab Data Full** - Complete lab data view

---

## 8. Pharmacy & Medications

### Pharmacy Features:
1. **Drug Inventory** - Medication inventory management
2. **Drug Dispensing** - Medication dispensing system
3. **Drug Lot Management** - Lot number tracking
4. **Add/Edit Drug** - Drug formulary management
5. **Add/Edit Lot** - Lot management
6. **Destroy Lot** - Drug disposal tracking
7. **WENO Integration** - WENO e-prescribing network
8. **WENO Connected** - WENO connection status
9. **WENO RX Log Manager** - Prescription log management
10. **WENO RX Index** - Prescription index
11. **WENO Facilities** - Facility management
12. **ERX (Electronic Prescribing)** - E-prescribing system
13. **ERX XML** - XML-based e-prescribing
14. **ERX SOAP** - SOAP-based e-prescribing
15. **ERX Store** - Prescription storage
16. **ERX Page** - E-prescribing interface
17. **ERX Globals** - Global e-prescribing settings
18. **ERX Log View** - Prescription log viewer
19. **Prescription Templates** - Reusable prescription templates

---

## 9. Documents & File Management

### Document Features:
1. **Document Management** - Comprehensive document system
2. **Document Categories** - Document categorization
3. **Document Upload** - File upload interface
4. **Document View** - Document viewing
5. **Document Search** - Document search functionality
6. **Document Download** - Document download
7. **Document Printing** - Document printing
8. **Document Templates** - Document templates
9. **Drag and Drop Uploader** - Easy file upload

---

## 10. Rules & Clinical Decision Support

### CDS Features:
1. **Rules Engine** - Rule-based clinical decision support
2. **Rule Management** - Create, edit, delete rules
3. **Rule Criteria** - Complex rule criteria definition
4. **Rule Actions** - Automated rule actions
5. **Rule Alerts** - Alert generation from rules
6. **Rule Plans** - Care plan integration
7. **Rule Configuration** - Rule system configuration
8. **Age-based Rules** - Age criteria rules
9. **Sex-based Rules** - Gender criteria rules
10. **Diagnosis-based Rules** - Diagnosis criteria rules
11. **Lifestyle Rules** - Lifestyle-based rules
12. **Custom Rules** - Custom rule definition
13. **Interval Rules** - Time-based rules
14. **Bucket Rules** - Categorization rules
15. **Simple Text Criteria** - Text-based criteria

---

## 11. Care Coordination

### Care Coordination Features:
1. **CCDA (Continuity of Care Document)** - CCDA generation
2. **CCR (Continuity of Care Record)** - CCR support
3. **Care Coordination Module** - Comprehensive care coordination
4. **Encounter CCDA Dispatch** - Automated CCDA generation
5. **CCDA Upload** - Import CCDA documents
6. **CCDA Review and Approve** - CCDA review workflow
7. **CCDA View** - CCDA document viewer
8. **Encounter Manager** - Encounter-based coordination
9. **Care Coordination Setup** - System configuration

---

## 12. Immunization Management

### Immunization Features:
1. **Immunization Tracking** - Complete immunization records
2. **Immunization Module** - Dedicated immunization module
3. **Immunization Forms** - Immunization documentation
4. **CVX Codes** - Vaccine code system
5. **Immunization Reports** - Immunization analytics
6. **Shot Record** - Vaccination record printing

---

## 13. Therapy Groups

### Group Therapy Features:
1. **Therapy Groups** - Group therapy management
2. **Group Attendance** - Attendance tracking
3. **Group Encounter** - Group encounter documentation
4. **Group Therapy Controllers** - Group management logic
5. **Group Therapy Models** - Data models
6. **Group Therapy Views** - User interfaces
7. **Group Templates** - Group therapy templates

---

## 14. Patient Portal

### Portal Features:
1. **Patient Portal** - Comprehensive patient portal
2. **Portal Login** - Patient authentication
3. **Portal Dashboard** - Patient dashboard
4. **Portal Messaging** - Patient-provider messaging
5. **Portal Appointments** - Appointment scheduling
6. **Portal Prescriptions** - Prescription refills
7. **Portal Lab Results** - Lab result access
8. **Portal Documents** - Document access
9. **Portal Payments** - Online payment
10. **Portal Registration** - Patient self-registration
11. **Telehealth Portal** - Telehealth integration

---

## 15. Telehealth

### Telehealth Features:
1. **ComLink Telehealth Module** - Comprehensive telehealth
2. **Video Registration** - Provider video registration
3. **Patient Video Registration** - Patient registration
4. **Teleconference Rooms** - Virtual room management
5. **Telehealth Calendar** - Telehealth scheduling
6. **Telehealth Settings** - Configuration
7. **Telehealth User Admin** - User management
8. **Telehealth Patient Admin** - Patient management
9. **Telehealth Session Repository** - Session tracking
10. **Telehealth Registration Codes** - Access code system

---

## 16. Code Systems & Standards

### Code Management:
1. **Code Systems Management** - Multiple code system support
2. **ICD-9 Codes** - ICD-9 code system
3. **ICD-10 Codes** - ICD-10 code system
4. **SNOMED CT** - SNOMED integration
5. **RxNorm** - Medication terminology
6. **DSM-IV** - Mental health codes
7. **CQM Value Sets** - Quality measure codes
8. **Code System Installation** - Code system management
9. **Code System Staging** - Code system updates
10. **Standard Tables Management** - Code table management
11. **Code Lookup** - Code search functionality
12. **Code Popup** - Quick code selection

---

## 17. Security & Compliance

### Security Features:
1. **Multi-Factor Authentication (MFA)** - MFA support
2. **TOTP (Time-based OTP)** - TOTP authentication
3. **U2F (Universal 2nd Factor)** - Hardware key support
4. **MFA Registrations** - MFA device management
5. **SSL Certificates Admin** - Certificate management
6. **Access Control Lists (ACL)** - Fine-grained permissions
7. **ACL Admin** - Permission management
8. **Audit Log** - Comprehensive audit logging
9. **Audit Log Tamper Report** - Security monitoring
10. **Login Security** - Enhanced login security
11. **Session Management** - Session tracking
12. **Password Policies** - Password requirements

---

## 18. Administration & Configuration

### Admin Features:
1. **User Group Admin** - User group management
2. **Facility Admin** - Facility management
3. **Facility User Admin** - Facility-user relationships
4. **User Admin** - User account management
5. **User Info** - User information management
6. **Address Book** - Contact management
7. **Practice Settings** - Practice configuration
8. **Practice Management** - Practice administration
9. **Product Registration** - Product licensing
10. **Language Management** - Multi-language support
11. **Language CSV** - Language file management
12. **Translation Utilities** - Translation tools
13. **Theme Management** - UI customization
14. **Theme Colors** - Color scheme management
15. **Navigation Themes** - Navigation customization

---

## 19. Data Management

### Data Features:
1. **De-identification Forms** - Data de-identification
2. **Re-identification** - Data re-identification
3. **Database De-identification** - Database-level de-identification
4. **Data Export** - Data export functionality
5. **Data Import** - Data import functionality
6. **Backup Management** - Backup system
7. **Restore Management** - Restore functionality
8. **Database Upgrade** - Version upgrade system
9. **SQL Patch** - Database patching
10. **Multiple Database Support** - Multi-database architecture

---

## 20. Integration & Interoperability

### Integration Features:
1. **FHIR Module** - FHIR R4 support
2. **SMART on FHIR** - SMART app support
3. **SMART Register App** - App registration
4. **SMART Admin Client** - Client management
5. **HL7 Integration** - HL7 message processing
6. **HL7 Controllers** - HL7 management
7. **X12 Partner Management** - EDI partner management
8. **CouchDB Integration** - CouchDB support
9. **CouchDB Log** - CouchDB logging
10. **OAuth2** - OAuth2 authentication
11. **REST API** - RESTful API
12. **SOAP API** - SOAP web services
13. **API Routes** - API endpoint management
14. **API Configuration** - API settings

---

## 21. Reporting & Business Intelligence

### Advanced Reporting:
1. **Report Builder** - Custom report creation
2. **Report Templates** - Reusable report templates
3. **Report Scheduling** - Automated report generation
4. **Report Distribution** - Report delivery
5. **Report Export** - Multiple export formats
6. **Dashboard Analytics** - Business intelligence
7. **Custom Dashboards** - User-defined dashboards
8. **Data Visualization** - Charts and graphs
9. **Trend Analysis** - Trend reporting
10. **Comparative Analysis** - Comparative reports

---

## 22. Specialty Modules

### Specialty Features:
1. **Ophthalmology (Eye MAG)** - Eye care forms
2. **Orthopedics (Ankle Injury)** - Orthopedic forms
3. **Respiratory (Bronchitis)** - Respiratory forms
4. **Mental Health (GAD-7)** - Mental health assessments
5. **Pain Management (Pain Map)** - Pain assessment
6. **Osteoarthritis (CAMOS)** - Specialty assessment
7. **Syndromic Surveillance** - Public health surveillance

---

## 23. Workflow & Process Management

### Workflow Features:
1. **Workflow Engine** - Process automation
2. **Workflow Designer** - Visual workflow builder
3. **Task Management** - Task tracking
4. **Approval Workflows** - Multi-level approvals
5. **Status Tracking** - Status management
6. **Notification System** - Automated notifications
7. **Reminder System** - Automated reminders
8. **Alert System** - Alert management

---

## 24. Inventory Management

### Inventory Features:
1. **Inventory Tracking** - Item tracking
2. **Inventory Transactions** - Transaction logging
3. **Inventory Reports** - Inventory analytics
4. **Stock Management** - Stock levels
5. **Reorder Points** - Automated reordering
6. **Supplier Management** - Vendor management
7. **Purchase Orders** - PO management
8. **Receiving** - Goods receipt

---

## 25. Additional Features

### Miscellaneous:
1. **Clickmap** - User interaction tracking
2. **EASIPRO** - EASI integration
3. **E-Signature** - Electronic signatures
4. **Birthday Alerts** - Patient birthday notifications
5. **Holiday Management** - Holiday calendar
6. **Finder** - Advanced search
7. **Authorizations** - Authorization management
8. **Messages** - Internal messaging
9. **Tabs System** - Tabbed interface
10. **Menu System** - Dynamic menu generation
11. **Themes** - UI theming
12. **Language Support** - Internationalization
13. **Patient Validation** - Data validation
14. **Prescription Templates** - Prescription templates
15. **Multi-Database** - Database abstraction

---

## Summary Statistics

- **Total Modules Identified**: 50+
- **Clinical Forms**: 27+
- **Billing Features**: 20+
- **Patient Management**: 40+
- **Reports**: 30+
- **Integration Points**: 15+
- **Administrative Features**: 20+

---

## Priority Recommendations

### High Priority (Core EHR Features):
1. SOAP Notes
2. Physical Exam Forms
3. Review of Systems (ROS)
4. Clinical Reminders
5. Patient Portal
6. Advanced Billing (ERA, EOB)
7. Document Management
8. Lab Integration (HL7)
9. E-Prescribing (WENO/ERX)
10. Care Coordination (CCDA)

### Medium Priority (Enhanced Features):
1. Therapy Groups
2. Telehealth Module
3. Advanced Reporting
4. Inventory Management
5. Workflow Engine
6. Multi-Factor Authentication
7. Code Systems Management
8. Rules Engine Enhancement
9. Patient Flow Board
10. Batch Communications

### Low Priority (Nice to Have):
1. Specialty Forms (Eye, Ortho, etc.)
2. Clickmap
3. Theme Management
4. De-identification Tools
5. Syndromic Surveillance

---

## Implementation Notes

- Many features can be adapted from OpenEMR's PHP implementation to Clinic+'s Python/React stack
- Focus on core clinical documentation first
- Billing features are critical for revenue cycle management
- Patient portal is essential for patient engagement
- Integration features (FHIR, HL7) are already partially implemented in Clinic+

---

*This analysis was conducted by examining OpenEMR 7.0.0 source code structure and comparing with Clinic+ current implementation.*

