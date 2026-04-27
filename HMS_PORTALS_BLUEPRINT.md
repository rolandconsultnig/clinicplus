# HMS Portals Blueprint

Role-based portal structure for complete hospital operations beyond OPD/IPD.

## 1) Receptionist Portal

Primary functions: patient registration, appointment handling, admission/discharge support.

- Patient registration, MRN assignment, duplicate merge.
- Real-time appointment booking/reschedule/cancel with reminders.
- OPD walk-in token and queue operations.
- OPD to IPD conversion and bed assignment support.
- Registration/advance payment support and receipt printing.
- Basic insurance eligibility visibility.

## 2) Nursing Portal

Primary functions: bedside monitoring, care documentation, medication administration.

- Ward and bed dashboard with patient-state indicators.
- Vitals entry with trend charting and alert thresholds.
- MAR workflow (administered/refused/held with reasons).
- Nursing care plan authoring and task tracking.
- Doctor order acknowledgement and completion updates.
- Shift handover summaries and discharge-readiness checks.

## 3) Doctors Portal

Primary functions: diagnosis, ordering, prescribing, and clinical documentation.

- My patient lists (OPD, IPD, recent discharges).
- Unified EMR access (history, labs, imaging, notes).
- Order entry (meds, labs, imaging, referrals).
- SOAP/progress/procedure/discharge documentation.
- CDSS safety alerts (drug interactions, allergies, guideline support).
- Schedule view, telemedicine launch, signed prescriptions/certificates.

## 4) Other Essential Portals

| Portal | Key Features |
|---|---|
| Lab Technician | Worklist, barcode samples, result entry, critical value flags |
| Pharmacist | eRx queue, dispense, stock/expiry, returns |
| Radiologist | Imaging queue, DICOM, templated reports, QC logs |
| Billing / Cashier | Invoices, claims, refunds, reconciliations |
| OT Manager | Surgery scheduling, resource allocation, peri-op tracking |
| Inventory Manager | Stock/reorder/vendor/asset lifecycle |
| HR / Admin | Staffing, attendance, payroll, credentialing, RBAC |
| Insurance Desk | Eligibility, pre-auth, claims and TPA follow-up |
| Patient Self-Service | Reports, appointments, payments, telemedicine, feedback |
| System Administrator | Users/roles, master data, backups, HL7/FHIR/audit logs |

## 5) Suggested Implementation Order

1. Receptionist + Doctor + Billing
2. Nursing + Pharmacy + Lab
3. Patient Portal
4. OT Manager + Inventory + HR/Admin
5. Insurance Desk + System Admin depth

## 6) Cross-Portal Integration Rules

- Event-based notification engine across all portals.
- Strict RBAC enforcement per role and action.
- Unified patient journey visibility across registration, consultation, diagnostics, pharmacy, and billing.
