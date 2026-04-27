# Portal Gap Tracker

This tracker maps each essential HMS portal capability to currently wired frontend/backend modules and implementation status.

## Live Data Generation

- Source generator: `scripts/generate_portal_gap_data.py`
- Output dataset: `src/data/portalGapData.json`
- Regenerate anytime with:
  - `npm run generate:portal-gap`

## Status Legend

- **Implemented**: End-to-end capability is available and wired.
- **In Progress**: Partial implementation exists; depth and workflow completion pending.
- **Planned**: Capability is identified but not yet wired.

## Snapshot Matrix

| Portal | Capability | Frontend Mapping | Backend Mapping | Status |
|---|---|---|---|---|
| Receptionist | Registration, appointments, OPD queue | `ReceptionistDashboard`, `OPDQueueManagement`, `SchedulingCalendar` | `receptionist.py`, `opd.py`, `scheduling.py` | Implemented |
| Receptionist | OPD->IPD conversion, discharge handover | `ReceptionistDashboard`, `OPDQueueManagement` | `opd.py`, `receptionist.py` | In Progress |
| Nursing | Ward/bed state and shift workflow | `ProviderDashboards`, `PatientFlowBoard` | `provider_workflows.py`, `patient_flow_board.py` | In Progress |
| Nursing | Vitals and observation workflow | `ProviderDashboards`, `HealthDataManagement` | `provider_workflows.py`, `iot_vitals.py`, `medical_data.py` | Implemented |
| Nursing | MAR workflow | `ProviderDashboards` | `provider_workflows.py`, `prescribing.py` | Planned |
| Doctors | EMR, encounter, orders, documentation | `DoctorConsultationPage`, `ProviderDashboards`, `SOAPNotes`, `LabOrders` | `doctor_consultation.py`, `provider_workflows.py`, `encounter_management.py` | Implemented |
| Doctors | Schedule + telemedicine depth | `SchedulingCalendar` | `scheduling.py` | In Progress |
| Lab Technician | Worklist, accession, results, QC | `LaboratoryModule`, `LabManagement` | `laboratory.py`, `lab_management.py`, `provider_workflows.py` | Implemented |
| Pharmacist | eRx queue, dispense, stock/recon | `PharmacyPOS`, `PharmacyInventoryModule`, `PharmacyReporting` | `pharmacy_pos.py`, `pharmacy_inventory.py`, `pharmacy.py` | Implemented |
| Radiologist | Imaging queue + DICOM reporting | N/A | N/A | Planned |
| Billing/Cashier | Invoicing, settlement, claims | `BillingManagement`, `PaymentProcessing`, `BillingTracker` | `billing_management.py`, `payments.py`, `billing_tracker.py`, `era.py` | Implemented |
| OT Manager | OT scheduling and peri-op | N/A | N/A | Planned |
| Inventory Manager | Cross-department stock/vendor workflow | `PharmacyInventoryModule`, `LaboratoryModule` | `pharmacy_inventory.py`, `pharmacy.py`, `laboratory.py` | In Progress |
| HR/Admin | Staffing, credentials, RBAC | `HumanResourceDepartment`, `ProfessionalCredentialing`, `UserManagement` | `hr.py`, `credentialing_routes.py`, `auth_jwt.py` | In Progress |
| Insurance Desk | Eligibility, pre-auth, claims follow-up | `InsurancePlans`, `BillingManagement` | `insurance.py`, `billing.py`, `payments.py` | In Progress |
| Patient Self-Service | Appointments, reports, billing, records | `PatientPortal` | `patient_portal.py`, `document_management.py`, `scheduling.py` | Implemented |
| System Admin | User/config/integration/audit governance | `RootAdminDashboard`, `TenantAdminDashboard`, `SystemSettings` | `admin_management.py`, `settings.py`, `fhir.py`, `hl7_v2.py`, `smart_fhir.py` | Implemented |

## Immediate Focus

1. Complete **Nursing MAR** workflow.
2. Complete **Receptionist OPD->IPD/discharge handover** depth.
3. Expand **Insurance Desk** pre-auth and tracking lifecycle.
4. Start **Radiology** and **OT Manager** core scaffolding.
