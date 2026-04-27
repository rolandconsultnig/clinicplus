# Scaffold and Placeholder Tracker

This tracker lists scaffold/placeholder hotspots and implementation status.

## Completed in this pass

- `Pharmacy POS backend` (`src/routes/pharmacy_pos.py`)
  - Replaced mock OTC and coupons with DB-backed models/tables.
  - Added seeded startup records for OTC items and coupons.
  - Replaced reconciliation mock with transaction-based reconciliation query.
  - Retained and expanded real end-to-end prescription dispensing + POS transaction writes.

- `Pharmacy POS data models` (`src/models/pharmacy.py`)
  - Added `PharmacyPOSTransaction`.
  - Added `PharmacyOTCItem`.
  - Added `PharmacyCoupon`.
  - Added `PharmacyPatientReminder`.
  - Added `PharmacyLoyaltyAccount`.

- `Pharmacy patient management backend wiring` (`src/routes/pharmacy.py`)
  - Added DB-backed endpoints used by UI:
    - `/api/pharmacy/patients/<id>/medication-history`
    - `/api/pharmacy/patients/<id>/allergies`
    - `/api/pharmacy/patients/<id>/reminders` (GET/POST)
    - `/api/pharmacy/reminders/<id>/send` (POST)
    - `/api/pharmacy/patients/<id>/loyalty` (GET)

- `Pharmacy reporting backend wiring` (`src/routes/pharmacy.py`)
  - Added routes:
    - `/api/pharmacy/reports/sales`
    - `/api/pharmacy/reports/inventory`
    - `/api/pharmacy/reports/compliance`
    - `/api/pharmacy/reports/performance`
    - `/api/pharmacy/reports/export/<report_type>`

- `Pharmacy UI scaffold removal`
  - `src/components/PharmacyPOS.jsx`: removed mock OTC fallback.
  - `src/components/PharmacyPatientManagement.jsx`: removed mock patient-detail fallback.
  - `src/components/PharmacyReporting.jsx`: removed mock report fallback.
  - Fixed API service imports in pharmacy UIs to use the live singleton (`{ apiService }`).

- `Pharmacy inventory workflow` (`src/routes/pharmacy_inventory.py`)
  - Replaced all mock/static endpoints with DB-backed logic:
    - pending prescriptions
    - interaction checks
    - process to queue
    - dispensing queue + dispense action
    - inventory, low-stock, expiring
    - purchase orders
    - usage/financial reports
    - audit trail
    - controlled substances

- `Pharmacy billing + compliance routes` (`src/routes/pharmacy.py`)
  - Added DB-backed endpoints for:
    - billing claims/payments + submit/adjudicate/cob/split actions
    - document list/upload/download/signature
    - compliance status + compliance audit logs
  - Added DB models:
    - `PharmacyBillingClaim`
    - `PharmacyBillingPayment`
    - `PharmacyDocumentRecord`
    - `PharmacyPurchaseOrder`
    - `PharmacyInventoryAudit`

- `API upload compatibility` (`src/services/apiService.js`)
  - Added automatic FormData detection and removed forced JSON content-type for multipart uploads.

- `Laboratory module scaffold replacement` (`src/routes/laboratory.py`, `src/components/LaboratoryModule.jsx`)
  - Replaced mock LIS endpoints with DB-backed implementations for:
    - pending orders
    - accession/specimen creation
    - specimen chain-of-custody listing
    - worklist
    - results + validation
    - critical values
    - QC data
    - TAT analytics
    - reagent inventory
  - Added supporting DB models in `src/models/clinical.py`:
    - `LabSpecimen`
    - `LabQCRecord`
    - `LabInventoryItem`
  - Removed static QC/inventory/analytics cards in UI and bound them to API responses.

- `Doctor consultation scaffold replacement` (`src/routes/doctor_consultation.py`)
  - Replaced mocked ICD-10 search with dynamic diagnosis-driven suggestions from recorded encounter/medical-history data.
  - Replaced mocked drug search with live formulary lookup via `Drug`.
  - Replaced mocked SOAP templates with DB-backed `SOAPTemplate` records (auto-created + seeded).
  - Reworked drug interaction checks to use `DrugInteraction` rows instead of hardcoded dictionaries.
  - Fixed prescription + lab-order creation paths to use actual model fields (`drug_id`, `facility_id`, `ordering_provider_id`, `clinical_indication`, etc.) and avoid runtime column mismatches.

- `Interoperability hardening` (`src/routes/fhir.py`, `src/routes/smart_fhir.py`, `src/routes/hl7_v2.py`)
  - Added persistent interoperability models in `src/models/interoperability.py`:
    - `SMARTClientRegistration`
    - `HL7MessageLog`
  - SMART registration now persists client metadata and validates redirect URIs against registered clients.
  - HL7 send/receive now writes full audit logs, and inbound message processing performs real actions:
    - ADT discharge attempts to close latest encounter for matched patient
    - ORU creates `LabOrder` + `LabResult` when patient/encounter context is resolvable
  - FHIR de-scaffold updates:
    - `Immunization` endpoint now derives resources from existing clinical history records instead of returning empty placeholders.
    - `Bundle` transaction endpoint now processes Patient create/update entries.
    - `$validate` endpoint now applies resource-specific required field checks for common resources.
    - Fixed multiple runtime schema mismatches (e.g., medication request and observation field mapping).

- `Provider workflow runtime de-scaffold` (`src/routes/provider_workflows.py`)
  - Removed all remaining mock/placeholder blocks from workflow CRUD and execution endpoints:
    - `/workflows`
    - `/templates`
    - `/active`
    - `/start`
    - `/<instance_id>/step/<step_id>/complete`
    - `/create`
    - `/<workflow_id>` (`PUT`, `DELETE`)
  - Added persistent provider workflow models in `src/models/provider_workflow.py`:
    - `ProviderWorkflowTemplate`
    - `ProviderWorkflowInstance`
    - `ProviderWorkflowInstanceStep`
  - Added automatic table creation and seeded starter templates for first-run use.
  - Workflow start now creates per-instance step records; completion now advances current step and auto-closes instance when all steps are complete.

- `Receptionist operations de-scaffold` (`src/routes/receptionist.py`)
  - Replaced mock dashboard metrics with live calculations:
    - collections from `Payment`
    - wait-time averages from queue timestamps
  - Replaced placeholder billing response by persisting real `Payment` records in `generate-bill` and synchronizing optional visit/charge status updates.
  - Reworked report endpoints (`daily`, `shift`, `collections`, `wait_times`) to use actual OPD/appointment/payment/queue data instead of static values.

- `Pharmacy reporting hardening` (`src/routes/pharmacy.py`, `src/components/PharmacyReporting.jsx`)
  - Reworked pharmacy report endpoints to return richer live analytics from POS/fulfillment/inventory/audit data:
    - daily sales trend
    - OTC vs prescription split
    - top-selling item aggregation
    - inventory turnover + low-stock item detail
    - compliance audit summaries
    - performance KPIs (fill-time/adherence/dispensed queue)
  - Removed remaining static/placeholder reporting UI blocks and bound tabs to live fields:
    - dynamic sales trend scaling
    - low-stock detail list
    - recent compliance audit feed
    - additional performance counters

- `Dashboard + payments de-scaffold` (`src/routes/dashboard.py`, `src/routes/payments.py`)
  - Removed remaining placeholder metrics in receptionist dashboard stats:
    - real payment-based collections from `Payment`
    - queue-derived average wait time from `OPDQueue`
  - Fixed broken receptionist stats dependency on missing `Invoice` model and aligned facility-scoped queries.
  - Expanded admin dashboard stats to include:
    - total appointments
    - active encounters
  - Corrected provider pending appointment action logic to map user account to provider profile before filtering.
  - Replaced payment processing default facility fallback with deterministic context resolution:
    - JWT facility -> appointment facility -> patient facility -> explicit payload
    - hard error when facility context is missing (instead of silent defaulting).

- `Patient portal reliability hardening` (`src/routes/patient_portal.py`)
  - Removed non-existent model dependency in refill requests (`PrescriptionRefillRequest`) and replaced with persisted `PortalMessage`-based refill request workflow.
  - Fixed health metrics endpoint to gracefully use optional `HealthMetric` model only when available (without import failure).
  - Removed remaining placeholder wording in record download endpoint and retained authenticated download URL response contract.

- `Admin/document/messaging de-scaffold` (`src/routes/admin_management.py`, `src/routes/document_management.py`, `src/routes/messaging_management.py`)
  - Replaced administrative placeholders with real executable workflows:
    - backup requests now produce auditable `AuditLog` records
    - patient merge now executes real FK reassignment across core tables and deactivates duplicate record
    - duplicate finder now performs deterministic matching by demographics + identifiers
  - Fixed document management to match live document schema and storage:
    - upload now persists actual files to disk and stores valid `Document` fields
    - categories/templates endpoints now read real model fields (`category_name`, `DocumentTemplate`)
    - added raw file streaming endpoint and access log capture for downloads
  - Replaced messaging placeholders with persisted in-app workflow operations:
    - batch email/SMS/reminder operations now create real `Message` records
    - office notes and recalls endpoints now return live queried data
    - corrected message unread filtering to use status model (`read`/`unread`) instead of non-existent field.

- `Patient file + OTP + IoT cleanup` (`src/routes/patient_file.py`, `src/routes/otp.py`, `src/routes/iot_vitals.py`)
  - Patient photo upload now performs real filesystem persistence with secure filenames and stable uploaded URLs.
  - OTP verification status logic fixed to use valid provider/facility scope query construction (removed invalid boolean SQL filters).
  - IoT manual sync endpoint now computes real synchronization result metrics from unsynced readings and records accurate sync status/readings count.

- `Final AI/FHIR/HL7 hardening sweep` (`src/routes/ai_consultation.py`, `src/routes/fhir.py`, `src/routes/hl7_v2.py`)
  - Removed residual placeholder/scaffold logic and comments from consultation, interoperability, and transport routes.
  - AI consultation transcription flow now validates payloads and requires real transcript input (no synthetic fallback text generation).
  - Fixed patient summary/runtime issues in AI consultation:
    - removed hard dependency on external `dateutil`
    - corrected allergy field mapping to existing schema (`allergen`)
  - HL7 outbound transport logging now records explicit queued/internal-log status instead of synthetic "simulated transport" semantics.
  - FHIR EOB mapping comments/behavior aligned to actual insurance-claim-derived adjudication flow.

- `Route placeholder scan status`
  - No remaining `TODO`, `In production`, `For now`, `mock`, `placeholder`, or `simulate` scaffold markers found in `src/routes`.

## Runtime consistency hardening (latest pass)

- `src/models/patient.py`
  - Added backward-compatible `phone_primary` and `phone_secondary` hybrid properties mapped to existing phone fields.
  - Supports both instance access and SQL query usage (`Patient.phone_primary.ilike(...)`) without schema migration.

- `src/models/documents.py`
  - Added compatibility synonyms for legacy fields:
    - `document_name` -> `file_name`
    - `uploaded_by` -> `created_by`
    - `uploaded_at` -> `created_at`
  - Prevents constructor/runtime failures in older upload flows while preserving current schema.

- `src/routes/provider_workflows.py`
  - Fixed `LabOrder` creation kwargs to match live model:
    - `test_type` -> `test_category`
    - removed unsupported `special_instructions` and `fasting_required`
    - corrected default `order_status` to `ordered`
    - normalized `order_date` to `datetime`.

- `src/routes/dashboard.py`
  - Fixed unread message count query from non-existent `is_read` field to `Message.status == 'unread'`.

- `src/routes/patient_portal.py`
  - Fixed patient document upload to use valid `Document` fields (`title`, `file_name`, `category`, `facility_id`, `created_by`, etc.).
  - Added facility-context validation before write.
  - Download response now references `document.file_name`.

- `src/routes/labs_hl7.py`
  - Reworked HL7 lab order/result persistence to match `LabOrder` and `LabResult` schema.
  - Added encounter/provider context requirements for ORM order creation.
  - Linked ORU result ingestion to a resolvable lab order and updated order completion status.

- `src/routes/credentialing_routes.py`
  - Fixed module import/runtime failure by defining the credentialing blueprint and preserving existing decorator alias usage.

## Current state

1. Placeholder/scaffold marker sweep remains clean in `src/routes`.
2. Additional cross-route field consistency mismatches found in this pass are resolved.
3. Modified files compile cleanly and have no new lint errors.
