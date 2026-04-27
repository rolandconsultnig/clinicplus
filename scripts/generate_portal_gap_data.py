"""
Generate live-derived portal gap tracker data from codebase files.
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
COMPONENTS_DIR = ROOT / "src" / "components"
ROUTES_DIR = ROOT / "src" / "routes"
APP_FILE = ROOT / "src" / "App.jsx"
OUTPUT_FILE = ROOT / "src" / "data" / "portalGapData.json"


ROWS = [
    {
        "portal": "Receptionist",
        "feature": "Registration, appointment, OPD queue",
        "frontend": ["ReceptionistDashboard", "OPDQueueManagement", "SchedulingCalendar"],
        "backend": ["receptionist.py", "opd.py", "scheduling.py"],
        "target_status": "implemented",
    },
    {
        "portal": "Receptionist",
        "feature": "Admission conversion and discharge handover",
        "frontend": ["ReceptionistDashboard", "OPDQueueManagement"],
        "backend": ["opd.py", "receptionist.py"],
        "target_status": "in_progress",
    },
    {
        "portal": "Receptionist",
        "feature": "Basic eligibility and billing assist",
        "frontend": ["PaymentProcessing", "BillingManagement"],
        "backend": ["payments.py", "insurance.py", "billing_management.py"],
        "target_status": "implemented",
    },
    {
        "portal": "Nursing",
        "feature": "Ward/bed dashboard and patient status",
        "frontend": ["ProviderDashboards", "PatientFlowBoard"],
        "backend": ["provider_workflows.py", "patient_flow_board.py"],
        "target_status": "in_progress",
    },
    {
        "portal": "Nursing",
        "feature": "Vitals trend and observation alerts",
        "frontend": ["ProviderDashboards", "HealthDataManagement"],
        "backend": ["provider_workflows.py", "iot_vitals.py", "medical_data.py"],
        "target_status": "implemented",
    },
    {
        "portal": "Nursing",
        "feature": "MAR and medication administration workflow",
        "frontend": ["ProviderDashboards"],
        "backend": ["provider_workflows.py", "prescribing.py"],
        "target_status": "planned",
    },
    {
        "portal": "Doctors",
        "feature": "My patients and encounter workflow",
        "frontend": ["DoctorConsultationPage", "ProviderDashboards", "PatientSearch"],
        "backend": ["doctor_consultation.py", "provider_workflows.py", "encounter_management.py"],
        "target_status": "implemented",
    },
    {
        "portal": "Doctors",
        "feature": "Order entry (labs/radiology/referrals)",
        "frontend": ["DoctorConsultationPage", "LabOrders", "LaboratoryModule"],
        "backend": ["doctor_consultation.py", "provider_workflows.py", "laboratory.py"],
        "target_status": "implemented",
    },
    {
        "portal": "Doctors",
        "feature": "Clinical documentation (SOAP/progress/discharge)",
        "frontend": ["SOAPNotes", "DoctorConsultationPage"],
        "backend": ["soap_notes.py", "doctor_consultation.py", "opd.py"],
        "target_status": "implemented",
    },
    {
        "portal": "Doctors",
        "feature": "Schedule and telemedicine",
        "frontend": ["SchedulingCalendar"],
        "backend": ["scheduling.py"],
        "target_status": "in_progress",
    },
    {
        "portal": "Lab Technician",
        "feature": "Order queue, accessioning, results, QC",
        "frontend": ["LaboratoryModule", "LabManagement"],
        "backend": ["laboratory.py", "lab_management.py", "provider_workflows.py"],
        "target_status": "implemented",
    },
    {
        "portal": "Pharmacist",
        "feature": "eRx queue, dispense, inventory, reconciliation",
        "frontend": ["PharmacyPOS", "PharmacyInventoryModule", "PharmacyReporting"],
        "backend": ["pharmacy_pos.py", "pharmacy_inventory.py", "pharmacy.py"],
        "target_status": "implemented",
    },
    {
        "portal": "Radiologist",
        "feature": "Imaging queue, DICOM, reports",
        "frontend": [],
        "backend": [],
        "target_status": "planned",
    },
    {
        "portal": "Billing/Cashier",
        "feature": "Invoicing, settlement, claims and reconciliation",
        "frontend": ["BillingManagement", "PaymentProcessing", "BillingTracker"],
        "backend": ["billing_management.py", "payments.py", "billing_tracker.py", "era.py"],
        "target_status": "implemented",
    },
    {
        "portal": "OT Manager",
        "feature": "Surgery scheduling and OT resource allocation",
        "frontend": [],
        "backend": [],
        "target_status": "planned",
    },
    {
        "portal": "Inventory Manager",
        "feature": "Stock, reorder, vendor operations",
        "frontend": ["PharmacyInventoryModule", "LaboratoryModule"],
        "backend": ["pharmacy_inventory.py", "pharmacy.py", "laboratory.py"],
        "target_status": "in_progress",
    },
    {
        "portal": "HR/Admin",
        "feature": "Staff scheduling, payroll, credentialing, RBAC",
        "frontend": ["HumanResourceDepartment", "ProfessionalCredentialing", "UserManagement"],
        "backend": ["hr.py", "professional.py", "auth_jwt.py"],
        "target_status": "in_progress",
    },
    {
        "portal": "Insurance Desk",
        "feature": "Eligibility, pre-auth, claims tracking",
        "frontend": ["InsurancePlans", "BillingManagement"],
        "backend": ["insurance.py", "billing.py", "payments.py"],
        "target_status": "in_progress",
    },
    {
        "portal": "Patient Self-Service",
        "feature": "Appointments, reports, bills, records",
        "frontend": ["PatientPortal"],
        "backend": ["patient_portal.py", "document_management.py", "scheduling.py"],
        "target_status": "implemented",
    },
    {
        "portal": "System Admin",
        "feature": "Users, master data, integrations, audit",
        "frontend": ["RootAdminDashboard", "TenantAdminDashboard", "SystemSettings"],
        "backend": ["admin_management.py", "settings.py", "fhir.py", "hl7_v2.py", "smart_fhir.py"],
        "target_status": "implemented",
    },
]


def _is_component_wired(component_name: str, app_text: str) -> bool:
    if not component_name:
        return False
    component_file = COMPONENTS_DIR / f"{component_name}.jsx"
    if component_file.exists():
        return True
    return component_name in app_text


def _effective_status(target: str, frontend_ok: bool, backend_ok: bool) -> str:
    if target == "planned":
        return "planned"
    if frontend_ok and backend_ok:
        return "implemented"
    if frontend_ok or backend_ok:
        return "in_progress"
    return "planned"


def main() -> int:
    app_text = APP_FILE.read_text(encoding="utf-8")
    enriched_rows = []
    for row in ROWS:
        frontend_items = row["frontend"]
        backend_items = row["backend"]

        frontend_presence = {
            item: _is_component_wired(item, app_text) for item in frontend_items
        }
        backend_presence = {
            item: (ROUTES_DIR / item).exists() for item in backend_items
        }

        frontend_ok = all(frontend_presence.values()) if frontend_presence else False
        backend_ok = all(backend_presence.values()) if backend_presence else False
        effective_status = _effective_status(row["target_status"], frontend_ok, backend_ok)

        enriched_rows.append(
            {
                **row,
                "status": effective_status,
                "frontend_presence": frontend_presence,
                "backend_presence": backend_presence,
                "frontend_coverage": 0 if not frontend_presence else round(
                    (sum(1 for v in frontend_presence.values() if v) / len(frontend_presence)) * 100
                ),
                "backend_coverage": 0 if not backend_presence else round(
                    (sum(1 for v in backend_presence.values() if v) / len(backend_presence)) * 100
                ),
            }
        )

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        json.dumps(
            {
                "generated_at": datetime.now(timezone.utc).isoformat(),
                "rows": enriched_rows,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Generated: {OUTPUT_FILE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
