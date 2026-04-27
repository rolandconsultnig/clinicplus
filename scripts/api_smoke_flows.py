"""
Endpoint-level smoke tests for pharmacy/provider/lab flows.
Validates payload checks and key status transitions.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta
import json
import os
import sys
import uuid

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from src.models.user import db
from src.models.auth import UserAccount, Role, UserRole
from src.models.provider import Facility, Provider
from src.models.patient import Patient, Medication, MedicationAdministration
from src.models.prescribing import Drug, Prescription
from src.models.pharmacy import (
    Pharmacy,
    PharmacyInventory,
    PrescriptionFulfillment,
    PharmacyPOSTransaction,
)
from src.models.clinical import ClinicalEncounter, LabOrder, LabResult
from src.models.provider_workflow import OTResource, OTSchedule, NurseShiftHandoff

# Run smoke tests against an isolated local SQLite database.
SMOKE_DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "instance", "smoke_test.db"))
os.makedirs(os.path.dirname(SMOKE_DB_PATH), exist_ok=True)
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{SMOKE_DB_PATH}"
app.config["TESTING"] = True


def _request(client, method, path, token=None, body=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    payload = json.dumps(body) if body is not None else None
    return client.open(path, method=method, headers=headers, data=payload, content_type="application/json")


def _expect(name, condition, detail="", failures=None):
    if condition:
        print(f"PASS: {name}")
        return True
    print(f"FAIL: {name} :: {detail}")
    if failures is not None:
        failures.append((name, detail))
    return False


def _login(client, username, password, facility_id):
    response = _request(
        client,
        "POST",
        "/api/auth/jwt/login",
        body={"username": username, "password": password, "facility_id": facility_id},
    )
    data = response.get_json(silent=True) or {}
    if response.status_code != 200:
        raise RuntimeError(f"Login failed for {username}: {response.status_code} {data}")
    return data["token"]


def _ensure_seed_and_entities(client):
    # Attempt seed route, but continue with explicit setup if it is incomplete.
    _request(client, "POST", "/api/dev/seed-users")

    with app.app_context():
        facility = Facility.query.first()
        if not facility:
            facility = Facility(
                facility_id="smoke-main",
                facility_name="Smoke Main Clinic",
                facility_type="clinic",
                city="Test City",
                state="TS",
                country="Nigeria",
                is_active=True,
            )
            db.session.add(facility)
            db.session.flush()

        role_map = {}
        for role_name in ("admin", "physician", "pharmacist", "nurse", "radiographer", "ot_manager"):
            role = Role.query.filter_by(role_name=role_name).first()
            if not role:
                role = Role(role_name=role_name, is_active=True)
                db.session.add(role)
                db.session.flush()
            role_map[role_name] = role

        def ensure_user(username, password, email, user_type, role_name):
            user = UserAccount.query.filter_by(username=username).first()
            if not user:
                user = UserAccount(
                    username=username,
                    email=email,
                    user_type=user_type,
                    facility_id=facility.id,
                    is_active=True,
                    is_verified=True,
                    failed_login_attempts=0,
                    created_at=datetime.utcnow(),
                )
                user.set_password(password)
                db.session.add(user)
                db.session.flush()
            else:
                user.email = user.email or email
                user.user_type = user.user_type or user_type
                user.facility_id = user.facility_id or facility.id
                user.is_active = True
                user.is_verified = True
                user.failed_login_attempts = 0
                user.account_locked_until = None
                # Keep credentials deterministic for smoke tests.
                user.set_password(password)

            existing_role = UserRole.query.filter_by(
                user_account_id=user.id,
                role_id=role_map[role_name].id,
                facility_id=facility.id,
                is_active=True,
            ).first()
            if not existing_role:
                db.session.add(UserRole(
                    user_account_id=user.id,
                    role_id=role_map[role_name].id,
                    facility_id=facility.id,
                    is_active=True,
                    assigned_at=datetime.utcnow(),
                ))
            return user

        admin_user = ensure_user("admin", "admin123", "admin@clinic.com", "admin", "admin")
        doctor_user = ensure_user("doctor", "doctor123", "doctor@clinic.com", "physician", "physician")
        pharmacist_user = ensure_user("pharmacist", "pharma123", "pharmacist@clinic.com", "pharmacist", "pharmacist")
        nurse_user = ensure_user("nurse", "nurse123", "nurse@clinic.com", "nurse", "nurse")
        radiographer_user = ensure_user("radiographer", "radio123", "radiographer@clinic.com", "radiographer", "radiographer")
        ot_manager_user = ensure_user("otmanager", "ot123", "otmanager@clinic.com", "ot_manager", "ot_manager")

        doctor_provider = Provider.query.filter_by(user_account_id=doctor_user.id).first()
        if not doctor_provider:
            doctor_provider = Provider(
                universal_provider_id=f"PROV-DR-{uuid.uuid4().hex[:8].upper()}",
                user_account_id=doctor_user.id,
                first_name="Dr",
                last_name="Smoke",
                provider_type="physician",
                specialty="General Medicine",
                is_active=True,
            )
            db.session.add(doctor_provider)

        pharmacist_provider = Provider.query.filter_by(user_account_id=pharmacist_user.id).first()
        if not pharmacist_provider:
            pharmacist_provider = Provider(
                universal_provider_id=f"PROV-PH-{uuid.uuid4().hex[:8].upper()}",
                user_account_id=pharmacist_user.id,
                first_name="Pharma",
                last_name="Smoke",
                provider_type="pharmacist",
                specialty="Pharmacy",
                is_active=True,
            )
            db.session.add(pharmacist_provider)

        nurse_provider = Provider.query.filter_by(user_account_id=nurse_user.id).first()
        if not nurse_provider:
            nurse_provider = Provider(
                universal_provider_id=f"PROV-NR-{uuid.uuid4().hex[:8].upper()}",
                user_account_id=nurse_user.id,
                first_name="Nurse",
                last_name="Smoke",
                provider_type="nurse",
                specialty="General Nursing",
                is_active=True,
            )
            db.session.add(nurse_provider)

        radiographer_provider = Provider.query.filter_by(user_account_id=radiographer_user.id).first()
        if not radiographer_provider:
            radiographer_provider = Provider(
                universal_provider_id=f"PROV-RD-{uuid.uuid4().hex[:8].upper()}",
                user_account_id=radiographer_user.id,
                first_name="Radio",
                last_name="Smoke",
                provider_type="radiographer",
                specialty="Radiology",
                is_active=True,
            )
            db.session.add(radiographer_provider)

        patient = Patient.query.filter_by(universal_patient_id="SMOKE-PATIENT-001").first()
        if not patient:
            patient = Patient(
                universal_patient_id="SMOKE-PATIENT-001",
                first_name="Smoke",
                last_name="Patient",
                date_of_birth=date(1992, 5, 4),
                gender="Female",
                phone_cell="08000000001",
                facility_id=facility.id,
                is_active=True,
            )
            db.session.add(patient)

        pharmacy = Pharmacy.query.filter_by(pharmacy_id="SMOKE-PHARM-001").first()
        if not pharmacy:
            pharmacy = Pharmacy(
                pharmacy_id="SMOKE-PHARM-001",
                pharmacy_name="Smoke Pharmacy",
                is_active=True,
            )
            db.session.add(pharmacy)

        drug = Drug.query.filter_by(rxnorm_code="SMOKE-RXNORM-001").first()
        if not drug:
            drug = Drug(
                rxnorm_code="SMOKE-RXNORM-001",
                drug_name="Smoke Drug 250mg",
                generic_name="SmokeDrug",
                dosage_form="tablet",
                strength="250mg",
                is_active=True,
            )
            db.session.add(drug)

        db.session.flush()

        inventory = PharmacyInventory.query.filter_by(pharmacy_id=pharmacy.id, drug_id=drug.id).first()
        if not inventory:
            inventory = PharmacyInventory(
                pharmacy_id=pharmacy.id,
                drug_id=drug.id,
                stock_quantity=100,
                reorder_level=10,
                unit_price=1500.00,
            )
            db.session.add(inventory)
        else:
            inventory.stock_quantity = max(inventory.stock_quantity or 0, 100)
            inventory.unit_price = inventory.unit_price or 1500.00

        rx = Prescription.query.filter_by(
            patient_id=patient.id,
            provider_id=doctor_provider.id,
            drug_id=drug.id,
            status="active",
        ).first()
        if not rx:
            rx = Prescription(
                prescription_id=f"RX-SMOKE-{uuid.uuid4().hex[:8].upper()}",
                patient_id=patient.id,
                provider_id=doctor_provider.id,
                facility_id=facility.id,
                drug_id=drug.id,
                drug_name=drug.drug_name,
                rxnorm_code=drug.rxnorm_code,
                dosage="250mg",
                frequency="BID",
                route="oral",
                quantity=10,
                days_supply=5,
                refills=0,
                refills_remaining=0,
                sig="Take one tablet twice daily",
                prescribed_date=date.today(),
                status="active",
            )
            db.session.add(rx)

        med = Medication.query.filter_by(
            patient_id=patient.id,
            medication_name="Smoke Drug 250mg",
            status="active",
            is_active=True,
        ).first()
        if not med:
            med = Medication(
                patient_id=patient.id,
                medication_name="Smoke Drug 250mg",
                dosage="250mg",
                frequency="BID",
                route="oral",
                start_date=date.today(),
                status="active",
                is_active=True,
                prescribing_provider="Dr Smoke",
                prescribing_provider_id=doctor_provider.id,
                prescribed_by=doctor_user.id,
                created_at=datetime.utcnow(),
            )
            db.session.add(med)

        db.session.commit()
        return {
            "facility_id": facility.id,
            "doctor_provider_id": doctor_provider.id,
            "patient_id": patient.id,
            "patient_upi": patient.universal_patient_id,
            "pharmacy_id": pharmacy.id,
            "drug_id": drug.id,
            "rx_id": rx.id,
            "rx_qty": rx.quantity,
            "medication_id": med.id,
            "nurse_user_id": nurse_user.id,
            "radiographer_user_id": radiographer_user.id,
            "ot_manager_user_id": ot_manager_user.id,
        }


def run():
    failures = []
    if os.path.exists(SMOKE_DB_PATH):
        os.remove(SMOKE_DB_PATH)
    with app.app_context():
        db.session.remove()
        db.create_all()

    with app.test_client() as client:
        state = _ensure_seed_and_entities(client)
        admin_token = _login(client, "admin", "admin123", state["facility_id"])
        doctor_token = _login(client, "doctor", "doctor123", state["facility_id"])
        pharmacist_token = _login(client, "pharmacist", "pharma123", state["facility_id"])
        nurse_token = _login(client, "nurse", "nurse123", state["facility_id"])
        radiographer_token = _login(client, "radiographer", "radio123", state["facility_id"])
        ot_manager_token = _login(client, "otmanager", "ot123", state["facility_id"])

        # -----------------------------
        # Pharmacy flow smoke tests
        # -----------------------------
        lookup_res = _request(
            client,
            "GET",
            f"/api/pharmacy/pos/patient-lookup/{state['patient_upi']}?pharmacy_id={state['pharmacy_id']}",
            token=pharmacist_token,
        )
        lookup_data = lookup_res.get_json(silent=True) or {}
        _expect("Pharmacy lookup success", lookup_res.status_code == 200 and lookup_data.get("success") is True, lookup_data, failures)

        invalid_payment_res = _request(
            client,
            "POST",
            "/api/pharmacy/pos/process-payment",
            token=pharmacist_token,
            body={"payment_method": "cash", "total": 1500.0},
        )
        _expect(
            "Pharmacy payment validation (missing items)",
            invalid_payment_res.status_code == 400,
            invalid_payment_res.get_json(silent=True),
            failures,
        )

        payment_res = _request(
            client,
            "POST",
            "/api/pharmacy/pos/process-payment",
            token=pharmacist_token,
            body={
                "patient_id": state["patient_id"],
                "pharmacy_id": state["pharmacy_id"],
                "prescription_ids": [state["rx_id"]],
                "items": [],
                "subtotal": float(1500.0 * state["rx_qty"]),
                "tax": 0.0,
                "discount": 0.0,
                "total": float(1500.0 * state["rx_qty"]),
                "payment_method": "cash",
            },
        )
        payment_data = payment_res.get_json(silent=True) or {}
        _expect("Pharmacy payment and dispensing success", payment_res.status_code == 200 and payment_data.get("success") is True, payment_data, failures)

        with app.app_context():
            refreshed_rx = Prescription.query.get(state["rx_id"])
            inv = PharmacyInventory.query.filter_by(pharmacy_id=state["pharmacy_id"], drug_id=state["drug_id"]).first()
            fulfillment = PrescriptionFulfillment.query.filter_by(prescription_id=state["rx_id"]).order_by(PrescriptionFulfillment.id.desc()).first()
            transaction = PharmacyPOSTransaction.query.filter_by(patient_id=state["patient_id"]).order_by(PharmacyPOSTransaction.id.desc()).first()
            _expect("Prescription status transitioned to filled", refreshed_rx and refreshed_rx.status == "filled", refreshed_rx.to_dict() if refreshed_rx else None, failures)
            _expect("Inventory decremented after dispense", inv and (inv.stock_quantity or 0) <= 90, inv.to_dict() if inv else None, failures)
            _expect("Fulfillment record created", fulfillment is not None and fulfillment.status == "dispensed", fulfillment.to_dict() if fulfillment else None, failures)
            _expect("POS transaction created", transaction is not None, transaction.to_dict() if transaction else None, failures)

        # -----------------------------
        # Nurse MAR flow smoke tests
        # -----------------------------
        mar_list = _request(client, "GET", "/api/provider-workflows/nurse/mar", token=nurse_token)
        mar_list_data = mar_list.get_json(silent=True) or {}
        _expect("Nurse MAR worklist loads", mar_list.status_code == 200 and mar_list_data.get("success") is True, mar_list_data, failures)

        mar_timeline_shift = _request(
            client,
            "GET",
            "/api/provider-workflows/nurse/mar?date={}&shift=morning".format(date.today().isoformat()),
            token=nurse_token,
        )
        mar_timeline_shift_data = mar_timeline_shift.get_json(silent=True) or {}
        _expect(
            "Nurse MAR shift timeline loads",
            mar_timeline_shift.status_code == 200 and mar_timeline_shift_data.get("success") is True and isinstance(mar_timeline_shift_data.get("timeline"), list),
            mar_timeline_shift_data,
            failures,
        )
        _expect(
            "Nurse MAR timeline includes late flag",
            (
                isinstance(mar_timeline_shift_data.get("timeline"), list)
                and (
                    len(mar_timeline_shift_data.get("timeline")) == 0
                    or isinstance((mar_timeline_shift_data.get("timeline")[0] or {}).get("is_late"), bool)
                )
            ),
            mar_timeline_shift_data,
            failures,
        )

        mar_bad = _request(
            client,
            "POST",
            "/api/provider-workflows/nurse/mar",
            token=nurse_token,
            body={"patient_id": state["patient_id"], "medication_id": state["medication_id"]},
        )
        _expect(
            "Nurse MAR validation (missing action)",
            mar_bad.status_code == 400,
            mar_bad.get_json(silent=True),
            failures,
        )

        mar_ok = _request(
            client,
            "POST",
            "/api/provider-workflows/nurse/mar",
            token=nurse_token,
            body={
                "patient_id": state["patient_id"],
                "medication_id": state["medication_id"],
                "action": "administered",
                "dose_given": "250mg",
                "notes": "Automated MAR administration test",
            },
        )
        mar_ok_data = mar_ok.get_json(silent=True) or {}
        _expect(
            "Nurse MAR administration success",
            mar_ok.status_code == 201 and mar_ok_data.get("success") is True,
            mar_ok_data,
            failures,
        )

        # High-risk co-sign flow (simulate insulin administration)
        with app.app_context():
            med_row = Medication.query.get(state["medication_id"])
            if med_row:
                med_row.medication_name = "Insulin Regular"
                db.session.commit()

        mar_hr = _request(
            client,
            "POST",
            "/api/provider-workflows/nurse/mar",
            token=nurse_token,
            body={
                "patient_id": state["patient_id"],
                "medication_id": state["medication_id"],
                "action": "administered",
                "dose_given": "10 units",
            },
        )
        mar_hr_data = mar_hr.get_json(silent=True) or {}
        _expect(
            "Nurse high-risk MAR becomes pending_cosign",
            mar_hr.status_code == 201 and (mar_hr_data.get("record") or {}).get("status") == "pending_cosign",
            mar_hr_data,
            failures,
        )
        pending_cosign_id = (mar_hr_data.get("record") or {}).get("id")

        cosign = _request(
            client,
            "POST",
            f"/api/provider-workflows/nurse/mar/{pending_cosign_id}/cosign",
            token=doctor_token,
            body={},
        )
        cosign_data = cosign.get_json(silent=True) or {}
        _expect(
            "High-risk MAR co-sign completes administration",
            cosign.status_code == 200 and (cosign_data.get("record") or {}).get("status") == "administered",
            cosign_data,
            failures,
        )

        mar_missed = _request(
            client,
            "POST",
            "/api/provider-workflows/nurse/mar",
            token=nurse_token,
            body={
                "patient_id": state["patient_id"],
                "medication_id": state["medication_id"],
                "action": "missed",
                "reason": "Patient off ward",
            },
        )
        mar_missed_data = mar_missed.get_json(silent=True) or {}
        _expect(
            "Missed dose auto-escalates",
            mar_missed.status_code == 201 and (mar_missed_data.get("record") or {}).get("status") == "escalated",
            mar_missed_data,
            failures,
        )

        escal_id = (mar_missed_data.get("record") or {}).get("id")
        escal_call = _request(
            client,
            "POST",
            f"/api/provider-workflows/nurse/mar/{escal_id}/escalate",
            token=nurse_token,
            body={"reason": "No replacement dose available"},
        )
        escal_call_data = escal_call.get_json(silent=True) or {}
        _expect(
            "Manual MAR escalation endpoint works",
            escal_call.status_code == 200 and (escal_call_data.get("record") or {}).get("escalation_status") == "escalated",
            escal_call_data,
            failures,
        )

        handoff_create = _request(
            client,
            "POST",
            "/api/provider-workflows/nurse/mar/handoff-summary",
            token=nurse_token,
            body={"shift_date": date.today().isoformat(), "shift_name": "morning", "notes": "Smoke handoff"},
        )
        handoff_create_data = handoff_create.get_json(silent=True) or {}
        _expect(
            "Shift handoff summary created",
            handoff_create.status_code == 201 and handoff_create_data.get("success") is True,
            handoff_create_data,
            failures,
        )

        handoff_list = _request(
            client,
            "GET",
            f"/api/provider-workflows/nurse/mar/handoff-summary?date={date.today().isoformat()}",
            token=nurse_token,
        )
        handoff_list_data = handoff_list.get_json(silent=True) or {}
        _expect(
            "Shift handoff summaries list loads",
            handoff_list.status_code == 200 and isinstance(handoff_list_data.get("handoffs"), list) and len(handoff_list_data.get("handoffs")) >= 1,
            handoff_list_data,
            failures,
        )

        mar_history = _request(
            client,
            "GET",
            "/api/provider-workflows/nurse/mar/history?start_date={d}&end_date={d}&nurse_id={nurse_id}&action=administered".format(
                d=date.today().isoformat(),
                nurse_id=state["nurse_user_id"],
            ),
            token=nurse_token,
        )
        mar_history_data = mar_history.get_json(silent=True) or {}
        _expect(
            "Nurse MAR history filter loads",
            mar_history.status_code == 200 and mar_history_data.get("success") is True and isinstance(mar_history_data.get("history"), list),
            mar_history_data,
            failures,
        )

        mar_history_export = _request(
            client,
            "GET",
            "/api/provider-workflows/nurse/mar/history/export?start_date={d}&end_date={d}".format(
                d=date.today().isoformat(),
            ),
            token=nurse_token,
        )
        csv_text = mar_history_export.get_data(as_text=True)
        _expect(
            "Nurse MAR history CSV export success",
            mar_history_export.status_code == 200 and "administration_id,status" in csv_text,
            csv_text[:300],
            failures,
        )

        with app.app_context():
            mar_row = MedicationAdministration.query.filter_by(
                patient_id=state["patient_id"],
                medication_id=state["medication_id"],
                status="administered",
            ).order_by(MedicationAdministration.id.desc()).first()
            _expect(
                "Nurse MAR transitioned to administered",
                mar_row is not None,
                mar_row.to_dict() if mar_row else None,
                failures,
            )

        # -----------------------------
        # Provider + lab flow smoke tests
        # -----------------------------
        encounter_bad = _request(
            client,
            "POST",
            "/api/provider-workflows/physician/encounter",
            token=doctor_token,
            body={"encounter_type": "office_visit"},
        )
        _expect(
            "Provider encounter validation (missing patient_id)",
            encounter_bad.status_code == 400,
            encounter_bad.get_json(silent=True),
            failures,
        )

        encounter_ok = _request(
            client,
            "POST",
            "/api/provider-workflows/physician/encounter",
            token=doctor_token,
            body={
                "patient_id": state["patient_id"],
                "encounter_type": "office_visit",
                "chief_complaint": "Smoke test follow-up",
                "encounter_status": "in_progress",
                "notes": "Automated smoke encounter",
            },
        )
        encounter_data = encounter_ok.get_json(silent=True) or {}
        _expect("Provider encounter created", encounter_ok.status_code == 201 and encounter_data.get("success") is True, encounter_data, failures)
        encounter_id = ((encounter_data.get("encounter") or {}).get("id"))

        ot_schedule_bad = _request(
            client,
            "POST",
            "/api/provider-workflows/ot-manager/schedules",
            token=doctor_token,
            body={"patient_id": state["patient_id"]},
        )
        _expect(
            "OT schedule validation (missing procedure_name)",
            ot_schedule_bad.status_code == 400,
            ot_schedule_bad.get_json(silent=True),
            failures,
        )

        start_time = datetime.utcnow() + timedelta(hours=2)
        end_time = start_time + timedelta(hours=2)
        ot_schedule_ok = _request(
            client,
            "POST",
            "/api/provider-workflows/ot-manager/schedules",
            token=doctor_token,
            body={
                "patient_id": state["patient_id"],
                "encounter_id": encounter_id,
                "procedure_name": "Laparoscopic Appendectomy",
                "ot_room": "Operating Room 1",
                "surgeon_name": "Dr Smoke",
                "scheduled_start": start_time.isoformat(),
                "scheduled_end": end_time.isoformat(),
                "required_resources": ["Anesthesia Machine", "Scrub Nurse Team"],
            },
        )
        ot_schedule_data = ot_schedule_ok.get_json(silent=True) or {}
        _expect(
            "OT schedule created",
            ot_schedule_ok.status_code == 201 and ot_schedule_data.get("success") is True,
            ot_schedule_data,
            failures,
        )
        ot_schedule_id = ((ot_schedule_data.get("schedule") or {}).get("id"))

        ot_dashboard = _request(
            client,
            "GET",
            "/api/provider-workflows/ot-manager/dashboard?date={}".format(date.today().isoformat()),
            token=ot_manager_token,
        )
        ot_dashboard_data = ot_dashboard.get_json(silent=True) or {}
        _expect(
            "OT manager dashboard loads",
            ot_dashboard.status_code == 200 and ot_dashboard_data.get("success") is True,
            ot_dashboard_data,
            failures,
        )
        resource_ids = [row.get("id") for row in (ot_dashboard_data.get("resources") or [])[:2] if row.get("id")]
        ot_allocate = _request(
            client,
            "POST",
            f"/api/provider-workflows/ot-manager/schedules/{ot_schedule_id}/allocate",
            token=ot_manager_token,
            body={"resource_ids": resource_ids},
        )
        ot_allocate_data = ot_allocate.get_json(silent=True) or {}
        _expect(
            "OT resources allocated",
            ot_allocate.status_code == 200 and ot_allocate_data.get("success") is True,
            ot_allocate_data,
            failures,
        )

        ot_start = _request(
            client,
            "POST",
            f"/api/provider-workflows/ot-manager/schedules/{ot_schedule_id}/start",
            token=ot_manager_token,
            body={},
        )
        ot_start_data = ot_start.get_json(silent=True) or {}
        _expect(
            "OT schedule started",
            ot_start.status_code == 200 and ot_start_data.get("success") is True,
            ot_start_data,
            failures,
        )

        ot_complete = _request(
            client,
            "POST",
            f"/api/provider-workflows/ot-manager/schedules/{ot_schedule_id}/complete",
            token=ot_manager_token,
            body={},
        )
        ot_complete_data = ot_complete.get_json(silent=True) or {}
        _expect(
            "OT schedule completed",
            ot_complete.status_code == 200 and ot_complete_data.get("success") is True,
            ot_complete_data,
            failures,
        )

        ot_cancel = _request(
            client,
            "POST",
            "/api/provider-workflows/ot-manager/schedules/{}/cancel".format(ot_schedule_id),
            token=ot_manager_token,
            body={"reason": "Case deferred"},
        )
        _expect(
            "OT schedule cancellation blocks completed case",
            ot_cancel.status_code == 409,
            ot_cancel.get_json(silent=True),
            failures,
        )

        analytics = _request(
            client,
            "GET",
            "/api/provider-workflows/ot-manager/analytics?start_date={d}&end_date={d}".format(d=date.today().isoformat()),
            token=ot_manager_token,
        )
        analytics_data = analytics.get_json(silent=True) or {}
        _expect(
            "OT analytics endpoint returns summary",
            analytics.status_code == 200 and analytics_data.get("success") is True and "summary" in analytics_data,
            analytics_data,
            failures,
        )

        with app.app_context():
            ot_schedule = OTSchedule.query.get(ot_schedule_id)
            _expect(
                "OT schedule transitioned to completed",
                ot_schedule is not None and ot_schedule.status == "completed",
                ot_schedule.to_dict() if ot_schedule else None,
                failures,
            )
            if resource_ids:
                resource = OTResource.query.get(resource_ids[0])
                _expect(
                    "OT resource released after completion",
                    resource is not None and (resource.quantity_available or 0) >= 1,
                    resource.to_dict() if resource else None,
                    failures,
                )

        radiology_bad = _request(
            client,
            "POST",
            "/api/provider-workflows/radiology/order",
            token=doctor_token,
            body={"patient_id": state["patient_id"]},
        )
        _expect(
            "Radiology order validation (missing test_name)",
            radiology_bad.status_code == 400,
            radiology_bad.get_json(silent=True),
            failures,
        )

        radiology_ok = _request(
            client,
            "POST",
            "/api/provider-workflows/radiology/order",
            token=doctor_token,
            body={
                "patient_id": state["patient_id"],
                "encounter_id": encounter_id,
                "test_name": "Chest X-Ray",
                "priority": "routine",
                "clinical_indication": "Cough and chest discomfort",
            },
        )
        radiology_ok_data = radiology_ok.get_json(silent=True) or {}
        _expect(
            "Radiology order created",
            radiology_ok.status_code == 201 and radiology_ok_data.get("success") is True,
            radiology_ok_data,
            failures,
        )
        radiology_order_id = ((radiology_ok_data.get("order") or {}).get("id"))

        radiology_dashboard = _request(
            client,
            "GET",
            "/api/provider-workflows/radiology/dashboard",
            token=radiographer_token,
        )
        radiology_dashboard_data = radiology_dashboard.get_json(silent=True) or {}
        _expect(
            "Radiology dashboard loads",
            radiology_dashboard.status_code == 200 and radiology_dashboard_data.get("success") is True,
            radiology_dashboard_data,
            failures,
        )

        radiology_start = _request(
            client,
            "POST",
            f"/api/provider-workflows/radiology/orders/{radiology_order_id}/start",
            token=radiographer_token,
            body={},
        )
        radiology_start_data = radiology_start.get_json(silent=True) or {}
        _expect(
            "Radiology order started",
            radiology_start.status_code == 200 and radiology_start_data.get("success") is True,
            radiology_start_data,
            failures,
        )

        radiology_complete = _request(
            client,
            "POST",
            f"/api/provider-workflows/radiology/orders/{radiology_order_id}/complete",
            token=radiographer_token,
            body={
                "report_text": "No acute cardiopulmonary abnormality.",
                "impression": "Normal chest radiograph",
            },
        )
        radiology_complete_data = radiology_complete.get_json(silent=True) or {}
        _expect(
            "Radiology order completed with report",
            radiology_complete.status_code == 200 and radiology_complete_data.get("success") is True,
            radiology_complete_data,
            failures,
        )
        with app.app_context():
            rad_order = LabOrder.query.get(radiology_order_id)
            rad_result = LabResult.query.filter_by(lab_order_id=radiology_order_id).order_by(LabResult.id.desc()).first()
            _expect(
                "Radiology order transitioned to completed",
                rad_order is not None and rad_order.status == "completed",
                rad_order.to_dict() if rad_order else None,
                failures,
            )
            _expect(
                "Radiology report result created",
                rad_result is not None and rad_result.result_status == "final",
                rad_result.to_dict() if rad_result else None,
                failures,
            )

        lab_bad = _request(
            client,
            "POST",
            "/api/provider-workflows/physician/lab-order",
            token=doctor_token,
            body={"patient_id": state["patient_id"]},
        )
        _expect(
            "Provider lab-order validation (missing test_name)",
            lab_bad.status_code == 400,
            lab_bad.get_json(silent=True),
            failures,
        )

        lab_ok = _request(
            client,
            "POST",
            "/api/provider-workflows/physician/lab-order",
            token=doctor_token,
            body={
                "patient_id": state["patient_id"],
                "encounter_id": encounter_id,
                "test_name": "CBC",
                "test_type": "hematology",
                "priority": "routine",
                "specimen_type": "blood",
                "clinical_indication": "Smoke lab flow",
            },
        )
        lab_data = lab_ok.get_json(silent=True) or {}
        _expect("Provider lab order created", lab_ok.status_code == 201 and lab_data.get("success") is True, lab_data, failures)
        lab_order_id = ((lab_data.get("lab_order") or {}).get("id"))
        lab_order_code = ((lab_data.get("lab_order") or {}).get("order_id"))

        pending_res = _request(client, "GET", "/api/labs/pending-orders", token=doctor_token)
        pending_data = pending_res.get_json(silent=True) or {}
        _expect("Lab pending orders endpoint", pending_res.status_code == 200 and pending_data.get("success") is True, pending_data, failures)

        accession_bad = _request(client, "POST", "/api/labs/accession", token=doctor_token, body={})
        _expect(
            "Lab accession validation (missing order_id)",
            accession_bad.status_code == 400,
            accession_bad.get_json(silent=True),
            failures,
        )

        accession_ok = _request(
            client,
            "POST",
            "/api/labs/accession",
            token=doctor_token,
            body={"order_id": lab_order_id},
        )
        accession_data = accession_ok.get_json(silent=True) or {}
        _expect(
            "Lab accession success",
            accession_ok.status_code in (200, 201) and accession_data.get("success") is True,
            accession_data,
            failures,
        )

        submit_result = _request(
            client,
            "POST",
            "/api/provider-workflows/lab/result",
            token=admin_token,
            body={
                "order_id": lab_order_code,
                "test_name": "CBC",
                "result_value": "5.6",
                "units": "x10^9/L",
                "status": "normal",
            },
        )
        submit_result_data = submit_result.get_json(silent=True) or {}
        _expect(
            "Provider lab result submission success",
            submit_result.status_code == 201 and submit_result_data.get("success") is True,
            submit_result_data,
            failures,
        )
        result_id = ((submit_result_data.get("lab_result") or {}).get("id"))

        validate_res = _request(
            client,
            "POST",
            f"/api/labs/results/{result_id}/validate",
            token=admin_token,
            body={},
        )
        validate_data = validate_res.get_json(silent=True) or {}
        _expect(
            "Lab result validation success",
            validate_res.status_code == 200 and validate_data.get("success") is True,
            validate_data,
            failures,
        )

        with app.app_context():
            order = LabOrder.query.get(lab_order_id)
            result = LabResult.query.get(result_id)
            _expect("Lab order transitioned to completed", order and order.status == "completed", order.to_dict() if order else None, failures)
            _expect("Lab result transitioned to final", result and result.result_status == "final", result.to_dict() if result else None, failures)

    print("\n--- Smoke Test Summary ---")
    if failures:
        print(f"TOTAL FAILURES: {len(failures)}")
        for i, (name, detail) in enumerate(failures, start=1):
            print(f"{i}. {name} :: {detail}")
        return 1

    print("ALL CHECKS PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(run())
