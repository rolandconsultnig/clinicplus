"""
Healthcare Provider Workflow API Routes for Clinic+
Specialized interfaces for doctors, nurses, pharmacists, lab technicians, and radiographers
"""

from flask import Blueprint, request, jsonify, make_response
from src.auth.jwt_manager import token_required, role_required
from src.auth.tenant_middleware import tenant_isolation_required, CrossFacilityAccess
from src.models.user import db
from src.models.patient import Patient, Medication, MedicationAdministration
from src.models.clinical import ClinicalEncounter, VitalSigns, ClinicalNote, LabOrder, LabResult
from src.models.provider import Provider
from src.models.auth import AuditLog, UserAccount
from src.models.provider_workflow import (
    ProviderWorkflowTemplate,
    ProviderWorkflowInstance,
    ProviderWorkflowInstanceStep,
    OTResource,
    OTSchedule,
    NurseShiftHandoff,
)
import datetime
import uuid
import json
import re
import csv
import io

provider_workflows_bp = Blueprint('provider_workflows', __name__)
_workflow_tables_ready = False


def _ensure_provider_workflow_tables():
    global _workflow_tables_ready
    if _workflow_tables_ready:
        return
    ProviderWorkflowTemplate.__table__.create(bind=db.engine, checkfirst=True)
    ProviderWorkflowInstance.__table__.create(bind=db.engine, checkfirst=True)
    ProviderWorkflowInstanceStep.__table__.create(bind=db.engine, checkfirst=True)
    MedicationAdministration.__table__.create(bind=db.engine, checkfirst=True)
    OTResource.__table__.create(bind=db.engine, checkfirst=True)
    OTSchedule.__table__.create(bind=db.engine, checkfirst=True)
    NurseShiftHandoff.__table__.create(bind=db.engine, checkfirst=True)

    def _ensure_columns(table_name, columns):
        existing = set()
        for row in db.session.execute(db.text(f"PRAGMA table_info({table_name})")).fetchall():
            existing.add(row[1])
        for column_name, ddl in columns:
            if column_name not in existing:
                db.session.execute(db.text(f"ALTER TABLE {table_name} ADD COLUMN {ddl}"))
        db.session.commit()

    _ensure_columns('medication_administrations', [
        ('is_high_risk', 'is_high_risk BOOLEAN DEFAULT 0'),
        ('requires_cosign', 'requires_cosign BOOLEAN DEFAULT 0'),
        ('cosigned_by', 'cosigned_by INTEGER'),
        ('cosigned_at', 'cosigned_at DATETIME'),
        ('escalation_status', "escalation_status VARCHAR(30) DEFAULT 'none'"),
        ('escalated_at', 'escalated_at DATETIME'),
        ('escalated_to', 'escalated_to VARCHAR(120)'),
        ('escalation_reason', 'escalation_reason VARCHAR(255)'),
    ])
    _ensure_columns('ot_schedules', [
        ('cancelled_at', 'cancelled_at DATETIME'),
        ('cancellation_reason', 'cancellation_reason VARCHAR(255)'),
    ])

    if ProviderWorkflowTemplate.query.count() == 0:
        seed_templates = [
            {
                'name': 'New Patient Intake',
                'description': 'Complete workflow for new patient registration and initial assessment',
                'category': 'Registration',
                'duration': '30-45 minutes',
                'steps': [
                    {'name': 'Patient Registration', 'description': 'Register patient demographics', 'required': True, 'estimated_time': '5 minutes'},
                    {'name': 'Insurance Verification', 'description': 'Verify insurance coverage', 'required': True, 'estimated_time': '5 minutes'},
                    {'name': 'Medical History', 'description': 'Collect medical history', 'required': True, 'estimated_time': '7 minutes'},
                    {'name': 'Vital Signs', 'description': 'Record vital signs', 'required': True, 'estimated_time': '5 minutes'},
                    {'name': 'Provider Assessment', 'description': 'Perform primary clinical assessment', 'required': True, 'estimated_time': '10 minutes'},
                ],
            },
            {
                'name': 'Annual Physical Exam',
                'description': 'Comprehensive annual physical examination protocol',
                'category': 'Preventive',
                'duration': '45-60 minutes',
                'steps': [
                    {'name': 'Vitals and Measurements', 'description': 'Capture full vital signs and anthropometrics', 'required': True, 'estimated_time': '8 minutes'},
                    {'name': 'History Update', 'description': 'Update patient history and medications', 'required': True, 'estimated_time': '10 minutes'},
                    {'name': 'Physical Examination', 'description': 'Complete full system exam', 'required': True, 'estimated_time': '20 minutes'},
                    {'name': 'Labs and Preventive Orders', 'description': 'Order age-appropriate labs/screens', 'required': True, 'estimated_time': '8 minutes'},
                    {'name': 'Counseling and Follow-up', 'description': 'Discuss prevention plan and schedule follow-up', 'required': True, 'estimated_time': '8 minutes'},
                ],
            },
            {
                'name': 'Diabetes Management',
                'description': 'Chronic disease management for diabetes patients',
                'category': 'Chronic Care',
                'duration': '30 minutes',
                'steps': [
                    {'name': 'Glucose Review', 'description': 'Review home glucose trends', 'required': True, 'estimated_time': '6 minutes'},
                    {'name': 'Medication Reconciliation', 'description': 'Assess adherence and side effects', 'required': True, 'estimated_time': '6 minutes'},
                    {'name': 'Targeted Exam', 'description': 'Foot/neuropathy and risk assessment', 'required': True, 'estimated_time': '8 minutes'},
                    {'name': 'A1C and Labs', 'description': 'Order/review A1C and metabolic labs', 'required': True, 'estimated_time': '5 minutes'},
                    {'name': 'Plan and Education', 'description': 'Update management plan and education', 'required': True, 'estimated_time': '5 minutes'},
                ],
            },
        ]
        for template in seed_templates:
            db.session.add(ProviderWorkflowTemplate(
                name=template['name'],
                description=template['description'],
                category=template['category'],
                duration=template['duration'],
                steps_json=json.dumps(template['steps']),
                is_active=True,
            ))
        db.session.commit()
    _workflow_tables_ready = True


@provider_workflows_bp.before_request
def initialize_provider_workflow_tables():
    _ensure_provider_workflow_tables()


def _parse_steps(raw_steps):
    clean_steps = []
    for index, step in enumerate(raw_steps or [], start=1):
        if not step.get('name'):
            continue
        clean_steps.append({
            'name': step.get('name'),
            'description': step.get('description', ''),
            'required': bool(step.get('required', True)),
            'estimated_time': step.get('estimated_time'),
            'order': int(step.get('order') or index),
        })
    clean_steps = sorted(clean_steps, key=lambda x: x['order'])
    for idx, step in enumerate(clean_steps, start=1):
        step['order'] = idx
    return clean_steps


SHIFT_WINDOWS = {
    'morning': (6, 14),
    'afternoon': (14, 22),
    'night': (22, 30),  # wraps past midnight (22:00 -> 06:00 next day)
}

HIGH_RISK_MEDICATION_KEYWORDS = (
    'insulin',
    'heparin',
    'warfarin',
    'morphine',
    'fentanyl',
    'potassium',
    'chemotherapy',
)


def _extract_times_per_day(frequency_text):
    value = str(frequency_text or '').strip().lower()
    if not value:
        return 1
    if any(token in value for token in ('qid', 'q6h', 'every 6', '4x')):
        return 4
    if any(token in value for token in ('tid', 'q8h', 'every 8', '3x')):
        return 3
    if any(token in value for token in ('bid', 'q12h', 'every 12', '2x', 'twice')):
        return 2
    if any(token in value for token in ('qd', 'od', 'daily', 'once')):
        return 1
    if any(token in value for token in ('q4h', 'every 4')):
        return 6
    match = re.search(r'(\d+)\s*(x|times?)\s*(/|per)?\s*day', value)
    if match:
        parsed = int(match.group(1))
        return max(1, min(parsed, 6))
    return 1


def _is_high_risk_medication(medication):
    name = (medication.medication_name or '').lower()
    return any(keyword in name for keyword in HIGH_RISK_MEDICATION_KEYWORDS)


def _scheduled_hours_for_medication(medication):
    doses = _extract_times_per_day(medication.frequency)
    if doses == 1:
        return [9]
    if doses == 2:
        return [8, 20]
    if doses == 3:
        return [6, 14, 22]
    if doses == 4:
        return [6, 12, 18, 0]
    if doses == 6:
        return [0, 4, 8, 12, 16, 20]
    interval = max(1, int(24 / doses))
    return [((6 + i * interval) % 24) for i in range(doses)]


def _slot_datetime(target_date, hour):
    if hour >= 0:
        return datetime.datetime.combine(target_date, datetime.time(hour=hour, minute=0))
    return datetime.datetime.combine(target_date, datetime.time.min) + datetime.timedelta(hours=hour)


def _slot_in_shift(slot_time, shift):
    if not shift or shift == 'all':
        return True
    window = SHIFT_WINDOWS.get(shift)
    if not window:
        return True
    start_hour, end_hour = window
    effective_hour = slot_time.hour
    # night shift wraps to next day (22:00 to 06:00)
    if end_hour > 24:
        return effective_hour >= start_hour or effective_hour < (end_hour - 24)
    return start_hour <= effective_hour < end_hour


def _resolve_nurse_display_names(user_ids):
    if not user_ids:
        return {}
    users = UserAccount.query.filter(UserAccount.id.in_(list(user_ids))).all()
    providers = Provider.query.filter(Provider.user_account_id.in_(list(user_ids))).all()
    provider_map = {p.user_account_id: p for p in providers}
    display = {}
    for user in users:
        provider = provider_map.get(user.id)
        if provider:
            display[user.id] = f'{provider.first_name} {provider.last_name}'.strip()
        else:
            display[user.id] = user.username
    return display


def _mar_timeline(facility_id, target_date, shift='all'):
    day_start = datetime.datetime.combine(target_date, datetime.time.min)
    day_end = datetime.datetime.combine(target_date, datetime.time.max)
    medications = db.session.query(Medication, Patient).join(
        Patient, Patient.id == Medication.patient_id
    ).filter(
        Medication.is_active == True,
        Medication.status == 'active',
        Patient.facility_id == facility_id,
        db.or_(Medication.start_date.is_(None), Medication.start_date <= target_date),
        db.or_(Medication.end_date.is_(None), Medication.end_date >= target_date),
    ).all()

    timeline = []
    used_nurse_ids = set()
    now_utc = datetime.datetime.utcnow()

    for medication, patient in medications:
        day_records = MedicationAdministration.query.filter(
            MedicationAdministration.patient_id == patient.id,
            MedicationAdministration.medication_id == medication.id,
            MedicationAdministration.created_at >= day_start,
            MedicationAdministration.created_at <= day_end,
        ).order_by(MedicationAdministration.created_at.desc()).all()

        for hour in _scheduled_hours_for_medication(medication):
            slot_time = _slot_datetime(target_date, hour)
            if not _slot_in_shift(slot_time, shift):
                continue

            window_start = slot_time - datetime.timedelta(hours=2)
            window_end = slot_time + datetime.timedelta(hours=2)
            matched = None
            for row in day_records:
                event_time = row.scheduled_time or row.administered_at or row.created_at
                if event_time and window_start <= event_time <= window_end:
                    matched = row
                    break

            if matched and matched.administered_by:
                used_nurse_ids.add(matched.administered_by)

            status_value = matched.status if matched else 'pending'
            is_late = status_value == 'pending' and slot_time < now_utc
            minutes_late = int((now_utc - slot_time).total_seconds() // 60) if is_late else 0

            timeline.append({
                'slot_time': slot_time.isoformat(),
                'slot_label': slot_time.strftime('%H:%M'),
                'shift': shift if shift in SHIFT_WINDOWS else ('night' if slot_time.hour >= 22 or slot_time.hour < 6 else 'morning' if slot_time.hour < 14 else 'afternoon'),
                'patient': {
                    'id': patient.id,
                    'name': f'{patient.first_name} {patient.last_name}',
                    'mrn': patient.universal_patient_id,
                },
                'medication': {
                    'id': medication.id,
                    'name': medication.medication_name,
                    'dosage': medication.dosage,
                    'route': medication.route,
                    'frequency': medication.frequency,
                },
                'status': status_value,
                'is_late': is_late,
                'minutes_late': minutes_late,
                'record': matched.to_dict() if matched else None,
            })

    name_map = _resolve_nurse_display_names(used_nurse_ids)
    for row in timeline:
        administered_by = (row.get('record') or {}).get('administered_by')
        row['nurse_name'] = name_map.get(administered_by) if administered_by else None

    timeline.sort(key=lambda item: (item['slot_time'], item['patient']['name'], item['medication']['name']))
    return timeline


def _nurse_filter_options(facility_id):
    providers = db.session.query(Provider, UserAccount).join(
        UserAccount, UserAccount.id == Provider.user_account_id
    ).filter(
        UserAccount.facility_id == facility_id,
        Provider.is_active == True,
        Provider.provider_type.in_(['nurse', 'nurse_practitioner'])
    ).order_by(Provider.first_name.asc(), Provider.last_name.asc()).all()
    return [
        {
            'id': user.id,
            'name': f'{provider.first_name} {provider.last_name}'.strip(),
            'username': user.username,
        }
        for provider, user in providers
    ]


def _mar_history(facility_id, start_date, end_date, nurse_id=None, action=None, limit=200):
    start_dt = datetime.datetime.combine(start_date, datetime.time.min)
    end_dt = datetime.datetime.combine(end_date, datetime.time.max)

    query = MedicationAdministration.query.filter(
        MedicationAdministration.facility_id == facility_id,
        MedicationAdministration.created_at >= start_dt,
        MedicationAdministration.created_at <= end_dt,
    )
    if nurse_id:
        query = query.filter(MedicationAdministration.administered_by == nurse_id)
    if action:
        query = query.filter(MedicationAdministration.status == action)

    rows = query.order_by(MedicationAdministration.created_at.desc()).limit(max(1, min(limit, 500))).all()
    user_ids = {row.administered_by for row in rows if row.administered_by}
    nurse_names = _resolve_nurse_display_names(user_ids)

    history = []
    counts = {'administered': 0, 'refused': 0, 'held': 0, 'missed': 0, 'pending': 0}
    for row in rows:
        patient = Patient.query.filter_by(id=row.patient_id).first()
        medication = Medication.query.filter_by(id=row.medication_id).first()
        counts[row.status] = counts.get(row.status, 0) + 1
        history.append({
            'id': row.id,
            'administration_id': row.administration_id,
            'status': row.status,
            'scheduled_time': row.scheduled_time.isoformat() if row.scheduled_time else None,
            'administered_at': row.administered_at.isoformat() if row.administered_at else None,
            'recorded_at': row.created_at.isoformat() if row.created_at else None,
            'dose_given': row.dose_given,
            'route': row.route,
            'reason': row.reason,
            'notes': row.notes,
            'is_high_risk': bool(row.is_high_risk),
            'requires_cosign': bool(row.requires_cosign),
            'cosigned_by': row.cosigned_by,
            'cosigned_at': row.cosigned_at.isoformat() if row.cosigned_at else None,
            'escalation_status': row.escalation_status,
            'escalated_to': row.escalated_to,
            'escalation_reason': row.escalation_reason,
            'patient': {
                'id': patient.id if patient else None,
                'name': f'{patient.first_name} {patient.last_name}'.strip() if patient else f'Patient #{row.patient_id}',
                'mrn': patient.universal_patient_id if patient else None,
            },
            'medication': {
                'id': medication.id if medication else None,
                'name': medication.medication_name if medication else f'Medication #{row.medication_id}',
                'dosage': medication.dosage if medication else None,
            },
            'nurse': {
                'id': row.administered_by,
                'name': nurse_names.get(row.administered_by, f'User {row.administered_by}' if row.administered_by else 'Unknown'),
            }
        })
    return history, counts


def _ensure_ot_resources(facility_id):
    existing = OTResource.query.filter_by(facility_id=facility_id).count()
    if existing > 0:
        return
    seeds = [
        {'code': 'OT-RM-1', 'name': 'Operating Room 1', 'type': 'room', 'qty': 1},
        {'code': 'OT-RM-2', 'name': 'Operating Room 2', 'type': 'room', 'qty': 1},
        {'code': 'OT-EQ-ANES', 'name': 'Anesthesia Machine', 'type': 'equipment', 'qty': 2},
        {'code': 'OT-EQ-LAP', 'name': 'Laparoscopy Tower', 'type': 'equipment', 'qty': 1},
        {'code': 'OT-STF-SCRUB', 'name': 'Scrub Nurse Team', 'type': 'staff', 'qty': 2},
    ]
    for seed in seeds:
        db.session.add(OTResource(
            resource_code=f"{seed['code']}-{facility_id}",
            facility_id=facility_id,
            name=seed['name'],
            resource_type=seed['type'],
            quantity_total=seed['qty'],
            quantity_available=seed['qty'],
            status='available',
        ))
    db.session.commit()


def _parse_iso_datetime(value, field_name):
    if not value:
        raise ValueError(f'{field_name} is required')
    try:
        return datetime.datetime.fromisoformat(value)
    except Exception:
        raise ValueError(f'{field_name} must be ISO datetime')


def _mar_snapshot(facility_id, target_date):
    day_start = datetime.datetime.combine(target_date, datetime.time.min)
    day_end = datetime.datetime.combine(target_date, datetime.time.max)

    meds = db.session.query(Medication, Patient).join(
        Patient, Patient.id == Medication.patient_id
    ).filter(
        Medication.is_active == True,
        Medication.status == 'active',
        Patient.facility_id == facility_id,
        db.or_(Medication.start_date.is_(None), Medication.start_date <= target_date),
        db.or_(Medication.end_date.is_(None), Medication.end_date >= target_date),
    ).order_by(Medication.created_at.desc()).all()

    mar_rows = []
    administered = 0
    refused = 0
    held = 0
    pending = 0

    for medication, patient in meds:
        latest = MedicationAdministration.query.filter(
            MedicationAdministration.medication_id == medication.id,
            MedicationAdministration.patient_id == patient.id,
            MedicationAdministration.created_at >= day_start,
            MedicationAdministration.created_at <= day_end,
        ).order_by(MedicationAdministration.created_at.desc()).first()

        status = latest.status if latest else 'pending'
        if status == 'administered':
            administered += 1
        elif status == 'refused':
            refused += 1
        elif status == 'held':
            held += 1
        else:
            pending += 1

        mar_rows.append({
            'patient': {
                'id': patient.id,
                'name': f'{patient.first_name} {patient.last_name}',
                'mrn': patient.universal_patient_id,
            },
            'medication': medication.to_dict(),
            'latest_administration': latest.to_dict() if latest else None,
            'status': status,
            'scheduled_time': latest.scheduled_time.isoformat() if latest and latest.scheduled_time else None,
        })

    return {
        'rows': mar_rows,
        'stats': {
            'mar_total': len(mar_rows),
            'mar_pending': pending,
            'mar_administered': administered,
            'mar_refused': refused,
            'mar_held': held,
        }
    }

# Physician Workflows

@provider_workflows_bp.route('/physician/dashboard', methods=['GET'])
@token_required
@role_required(['Physician', 'System Administrator'])
@tenant_isolation_required
def physician_dashboard():
    """Get physician dashboard with patient overview and tasks"""
    try:
        # Get current provider
        provider = Provider.query.filter_by(user_account_id=request.current_user.id).first()
        if not provider:
            return jsonify({'error': 'Provider profile not found'}), 404
        
        # Get facility context
        facility_id = request.token_payload.get('facility_id')
        
        # Get today's appointments/encounters
        today = datetime.date.today()
        todays_encounters = ClinicalEncounter.query.filter(
            ClinicalEncounter.provider_id == provider.id,
            db.cast(ClinicalEncounter.encounter_date, db.Date) == today,
            ClinicalEncounter.facility_id == facility_id
        ).all()
        
        # Get pending lab orders
        pending_labs = LabOrder.query.filter(
            LabOrder.ordering_provider_id == provider.id,
            LabOrder.status.in_(['pending', 'in_progress']),
            LabOrder.facility_id == facility_id
        ).count()
        
        # Get patients requiring follow-up
        follow_up_encounters = ClinicalEncounter.query.filter(
            ClinicalEncounter.provider_id == provider.id,
            ClinicalEncounter.follow_up_required == True,
            ClinicalEncounter.follow_up_date <= datetime.date.today() + datetime.timedelta(days=7),
            ClinicalEncounter.facility_id == facility_id
        ).all()
        
        # Get recent patients
        recent_patients = db.session.query(Patient).join(ClinicalEncounter).filter(
            ClinicalEncounter.provider_id == provider.id,
            ClinicalEncounter.facility_id == facility_id
        ).order_by(ClinicalEncounter.encounter_date.desc()).limit(10).all()
        
        dashboard_data = {
            'provider': provider.to_dict(),
            'today_stats': {
                'scheduled_encounters': len(todays_encounters),
                'pending_lab_orders': pending_labs,
                'follow_up_patients': len(follow_up_encounters)
            },
            'todays_encounters': [encounter.to_dict() for encounter in todays_encounters],
            'follow_up_patients': [
                {
                    'encounter': encounter.to_dict(),
                    'patient': encounter.patient.to_dict() if encounter.patient else None
                }
                for encounter in follow_up_encounters
            ],
            'recent_patients': [patient.to_dict() for patient in recent_patients]
        }
        
        return jsonify({
            'success': True,
            'dashboard': dashboard_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to load physician dashboard: {str(e)}'}), 500

@provider_workflows_bp.route('/physician/encounter', methods=['POST'])
@token_required
@role_required(['Physician', 'System Administrator'])
@tenant_isolation_required
def create_clinical_encounter():
    """Create new clinical encounter"""
    try:
        data = request.get_json()
        
        # Get current provider
        provider = Provider.query.filter_by(user_account_id=request.current_user.id).first()
        if not provider:
            return jsonify({'error': 'Provider profile not found'}), 404
        
        # Validate required fields
        required_fields = ['patient_id', 'encounter_type']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Find patient
        patient = Patient.query.filter(
            db.or_(
                Patient.id == data['patient_id'],
                Patient.universal_patient_id == data['patient_id']
            )
        ).first()
        
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404

        encounter_id = data.get('encounter_id')
        if not encounter_id:
            encounter = ClinicalEncounter.query.filter(
                ClinicalEncounter.patient_id == patient.id,
                ClinicalEncounter.provider_id == provider.id
            ).order_by(ClinicalEncounter.encounter_date.desc()).first()
            encounter_id = encounter.id if encounter else None
        if not encounter_id:
            return jsonify({'error': 'encounter_id is required for lab orders'}), 400
        
        # Parse encounter date
        encounter_date_str = data.get('encounter_date', datetime.date.today().isoformat())
        if isinstance(encounter_date_str, str):
            encounter_date = datetime.datetime.strptime(encounter_date_str, '%Y-%m-%d')
        else:
            encounter_date = datetime.datetime.combine(encounter_date_str, datetime.time.min)
        
        # Create clinical encounter
        encounter = ClinicalEncounter(
            encounter_id=f"ENC-{uuid.uuid4().hex[:8].upper()}",
            patient_id=patient.id,
            provider_id=provider.id,
            facility_id=request.token_payload.get('facility_id'),
            encounter_type=data['encounter_type'],
            encounter_date=encounter_date,
            encounter_status=data.get('encounter_status', 'completed'),
            chief_complaint=data.get('chief_complaint'),
            assessment=data.get('diagnosis') or data.get('assessment'),
            diagnosis=data.get('diagnosis'),
            plan=data.get('treatment_plan') or data.get('plan'),
            treatment_plan=data.get('treatment_plan'),
            follow_up_required=data.get('follow_up_required', False),
            follow_up_date=datetime.datetime.strptime(data['follow_up_date'], '%Y-%m-%d').date() if data.get('follow_up_date') else None,
            notes=data.get('notes'),
            created_at=datetime.datetime.utcnow()
        )
        
        db.session.add(encounter)
        db.session.flush()  # Get the ID
        
        # Add vital signs if provided
        if data.get('vital_signs'):
            vitals_data = data['vital_signs']
            vitals = VitalSigns(
                patient_id=patient.id,
                encounter_id=encounter.id,
                systolic_bp=vitals_data.get('systolic_bp'),
                diastolic_bp=vitals_data.get('diastolic_bp'),
                heart_rate=vitals_data.get('heart_rate'),
                temperature=vitals_data.get('temperature'),
                respiratory_rate=vitals_data.get('respiratory_rate'),
                oxygen_saturation=vitals_data.get('oxygen_saturation'),
                weight=vitals_data.get('weight'),
                weight_pounds=vitals_data.get('weight'),
                height=vitals_data.get('height'),
                height_inches=vitals_data.get('height'),
                recorded_by=request.current_user.id,
                recorded_at=datetime.datetime.utcnow()
            )
            db.session.add(vitals)
        
        # Add clinical notes if provided
        if data.get('clinical_notes'):
            for note_data in data['clinical_notes']:
                note = ClinicalNote(
                    patient_id=patient.id,
                    encounter_id=encounter.id,
                    note_type=note_data.get('note_type', 'progress'),
                    note_content=note_data.get('content') or note_data.get('note_content'),
                    content=note_data.get('content') or note_data.get('note_content'),
                    created_by=request.current_user.id,
                    created_at=datetime.datetime.utcnow()
                )
                db.session.add(note)
        
        db.session.commit()
        
        # Log encounter creation
        audit_log = AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='clinical_encounter_created',
            resource_type='clinical_encounter',
            resource_id=encounter.id,
            patient_id=patient.id,
            facility_id=encounter.facility_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True,
            details=json.dumps({'encounter_id': encounter.encounter_id, 'encounter_type': encounter.encounter_type})
        )
        db.session.add(audit_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'encounter': encounter.to_dict(),
            'message': 'Clinical encounter created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to create encounter: {str(e)}'}), 500

@provider_workflows_bp.route('/physician/prescribe', methods=['POST'])
@token_required
@role_required(['Physician', 'System Administrator'])
@tenant_isolation_required
def prescribe_medication():
    """Prescribe medication for patient"""
    try:
        data = request.get_json()
        
        # Get current provider
        provider = Provider.query.filter_by(user_account_id=request.current_user.id).first()
        if not provider:
            return jsonify({'error': 'Provider profile not found'}), 404
        
        # Validate required fields
        required_fields = ['patient_id', 'medication_name', 'dosage', 'frequency']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Find patient
        patient = Patient.query.filter(
            db.or_(
                Patient.id == data['patient_id'],
                Patient.universal_patient_id == data['patient_id']
            )
        ).first()
        
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404

        # Create medication prescription
        medication = Medication(
            patient_id=patient.id,
            medication_name=data['medication_name'],
            dosage=data['dosage'],
            frequency=data['frequency'],
            route=data.get('route', 'oral'),
            start_date=datetime.datetime.strptime(data.get('start_date', datetime.date.today().isoformat()), '%Y-%m-%d').date(),
            end_date=datetime.datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data.get('end_date') else None,
            prescribing_provider=f"{provider.first_name} {provider.last_name}",
            prescribing_provider_id=provider.id,
            notes=data.get('notes'),
            prescribed_by=request.current_user.id,
            created_at=datetime.datetime.utcnow()
        )
        
        db.session.add(medication)
        db.session.commit()
        
        # Log prescription
        audit_log = AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='medication_prescribed',
            resource_type='medication',
            resource_id=medication.id,
            patient_id=patient.id,
            facility_id=request.token_payload.get('facility_id'),
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True,
            details={
                'medication_name': medication.medication_name,
                'dosage': medication.dosage,
                'prescribing_provider': medication.prescribing_provider
            }
        )
        db.session.add(audit_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'medication': medication.to_dict(),
            'message': 'Medication prescribed successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to prescribe medication: {str(e)}'}), 500

@provider_workflows_bp.route('/physician/lab-order', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'System Administrator'])
@tenant_isolation_required
def create_lab_order():
    """Create new lab order"""
    try:
        data = request.get_json()
        
        # Get current provider
        provider = Provider.query.filter_by(user_account_id=request.current_user.id).first()
        if not provider:
            return jsonify({'error': 'Provider profile not found'}), 404
        
        # Validate required fields
        required_fields = ['patient_id', 'test_name']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Find patient
        patient = Patient.query.filter(
            db.or_(
                Patient.id == data['patient_id'],
                Patient.universal_patient_id == data['patient_id']
            )
        ).first()
        
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404

        encounter_id = data.get('encounter_id')
        if not encounter_id:
            encounter = ClinicalEncounter.query.filter(
                ClinicalEncounter.patient_id == patient.id,
                ClinicalEncounter.provider_id == provider.id
            ).order_by(ClinicalEncounter.encounter_date.desc()).first()
            encounter_id = encounter.id if encounter else None
        if not encounter_id:
            return jsonify({'error': 'encounter_id is required for lab orders'}), 400
        
        # Parse order date
        order_date_str = data.get('order_date', datetime.date.today().isoformat())
        if isinstance(order_date_str, str):
            order_date = datetime.datetime.strptime(order_date_str, '%Y-%m-%d')
        else:
            order_date = datetime.datetime.combine(order_date_str, datetime.time.min) if isinstance(order_date_str, datetime.date) else order_date_str
        
        # Create lab order
        lab_order = LabOrder(
            order_id=f"LAB-{uuid.uuid4().hex[:8].upper()}",
            patient_id=patient.id,
            ordering_provider_id=provider.id,
            facility_id=request.token_payload.get('facility_id'),
            encounter_id=encounter_id,
            test_name=data['test_name'],
            test_code=data.get('test_code'),
            test_category=data.get('test_type', 'laboratory'),
            priority=data.get('priority', 'routine'),
            order_date=order_date,
            clinical_indication=data.get('clinical_indication'),
            specimen_type=data.get('specimen_type', 'blood'),
            status=data.get('status', 'pending'),
            order_status=data.get('order_status', 'ordered')
        )
        
        db.session.add(lab_order)
        db.session.flush()
        
        db.session.commit()
        
        # Log lab order creation
        audit_log = AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='lab_order_created',
            resource_type='lab_order',
            resource_id=lab_order.id,
            patient_id=patient.id,
            facility_id=lab_order.facility_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True,
            details=json.dumps({'order_id': lab_order.order_id, 'test_name': lab_order.test_name})
        )
        db.session.add(audit_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'lab_order': lab_order.to_dict(),
            'message': 'Lab order created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to create lab order: {str(e)}'}), 500

# Nurse Workflows

@provider_workflows_bp.route('/nurse/dashboard', methods=['GET'])
@token_required
@role_required(['Nurse', 'System Administrator'])
@tenant_isolation_required
def nurse_dashboard():
    """Get nurse dashboard with patient assignments and tasks"""
    try:
        # Get current provider
        provider = Provider.query.filter_by(user_account_id=request.current_user.id).first()
        if not provider:
            return jsonify({'error': 'Provider profile not found'}), 404
        
        facility_id = request.token_payload.get('facility_id')
        today = datetime.date.today()
        
        # Get today's patient assignments (encounters where nurse is involved)
        todays_encounters = ClinicalEncounter.query.filter(
            db.cast(ClinicalEncounter.encounter_date, db.Date) == today,
            ClinicalEncounter.facility_id == facility_id
        ).all()
        
        # Get patients needing vital signs
        patients_needing_vitals = []
        for encounter in todays_encounters:
            # Check if vitals were recorded today
            vitals_today = VitalSigns.query.filter(
                VitalSigns.patient_id == encounter.patient_id,
                VitalSigns.recorded_at >= datetime.datetime.combine(today, datetime.time.min)
            ).first()
            
            if not vitals_today:
                patients_needing_vitals.append({
                    'encounter': encounter.to_dict(),
                    'patient': encounter.patient.to_dict() if encounter.patient else None
                })
        
        # Get recent vital signs recorded by this nurse
        recent_vitals = VitalSigns.query.filter(
            VitalSigns.recorded_by == request.current_user.id,
            VitalSigns.recorded_at >= datetime.datetime.now() - datetime.timedelta(days=7)
        ).order_by(VitalSigns.recorded_at.desc()).limit(10).all()

        mar_snapshot = _mar_snapshot(facility_id, today)
        mar_timeline = _mar_timeline(facility_id, today, shift='all')
        
        dashboard_data = {
            'provider': provider.to_dict(),
            'today_stats': {
                'total_encounters': len(todays_encounters),
                'patients_needing_vitals': len(patients_needing_vitals),
                'vitals_recorded_today': VitalSigns.query.filter(
                    VitalSigns.recorded_by == request.current_user.id,
                    VitalSigns.recorded_at >= datetime.datetime.combine(today, datetime.time.min)
                ).count(),
                **mar_snapshot['stats']
            },
            'patients_needing_vitals': patients_needing_vitals,
            'recent_vitals': [vitals.to_dict() for vitals in recent_vitals],
            'todays_encounters': [encounter.to_dict() for encounter in todays_encounters],
            'mar_due': mar_snapshot['rows'],
            'mar_timeline': mar_timeline[:60]
        }
        
        return jsonify({
            'success': True,
            'dashboard': dashboard_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to load nurse dashboard: {str(e)}'}), 500

@provider_workflows_bp.route('/nurse/vitals', methods=['POST'])
@token_required
@role_required(['Nurse', 'Physician', 'System Administrator'])
@tenant_isolation_required
def record_vital_signs():
    """Record patient vital signs"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['patient_id']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Find patient
        patient = Patient.query.filter(
            db.or_(
                Patient.id == data['patient_id'],
                Patient.universal_patient_id == data['patient_id']
            )
        ).first()
        
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        # Create vital signs record
        vitals = VitalSigns(
            patient_id=patient.id,
            encounter_id=data.get('encounter_id'),
            systolic_bp=data.get('systolic_bp'),
            diastolic_bp=data.get('diastolic_bp'),
            heart_rate=data.get('heart_rate'),
            temperature=data.get('temperature'),
            respiratory_rate=data.get('respiratory_rate'),
            oxygen_saturation=data.get('oxygen_saturation'),
            weight=data.get('weight'),
            weight_pounds=data.get('weight'),
            height=data.get('height'),
            height_inches=data.get('height'),
            pain_scale=data.get('pain_scale'),
            notes=data.get('notes'),
            recorded_by=request.current_user.id,
            recorded_at=datetime.datetime.utcnow()
        )
        
        db.session.add(vitals)
        db.session.commit()
        
        # Log vital signs recording
        audit_log = AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='vital_signs_recorded',
            resource_type='vital_signs',
            resource_id=vitals.id,
            patient_id=patient.id,
            facility_id=request.token_payload.get('facility_id'),
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True
        )
        db.session.add(audit_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'vital_signs': vitals.to_dict(),
            'message': 'Vital signs recorded successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to record vital signs: {str(e)}'}), 500


@provider_workflows_bp.route('/nurse/mar', methods=['GET'])
@token_required
@role_required(['Nurse', 'Physician', 'System Administrator'])
@tenant_isolation_required
def get_mar():
    """Get Medication Administration Record (MAR) worklist for nursing actions."""
    try:
        facility_id = request.token_payload.get('facility_id')
        date_str = request.args.get('date')
        shift = (request.args.get('shift') or 'all').strip().lower()
        target_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else datetime.date.today()
        snapshot = _mar_snapshot(facility_id, target_date)
        timeline = _mar_timeline(facility_id, target_date, shift=shift)
        return jsonify({
            'success': True,
            'date': target_date.isoformat(),
            'shift': shift,
            'mar': snapshot['rows'],
            'stats': snapshot['stats'],
            'timeline': timeline
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to load MAR: {str(e)}'}), 500


@provider_workflows_bp.route('/nurse/mar/history', methods=['GET'])
@token_required
@role_required(['Nurse', 'Physician', 'System Administrator'])
@tenant_isolation_required
def get_mar_history():
    """Get MAR action history with date/nurse/action filters for supervisor review."""
    try:
        facility_id = request.token_payload.get('facility_id')
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        action = (request.args.get('action') or '').strip().lower() or None
        nurse_id_raw = request.args.get('nurse_id')
        limit_raw = request.args.get('limit')

        start_date = datetime.datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else datetime.date.today()
        end_date = datetime.datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else start_date
        if end_date < start_date:
            return jsonify({'error': 'end_date must be on or after start_date'}), 400

        nurse_id = int(nurse_id_raw) if nurse_id_raw else None
        limit = int(limit_raw) if limit_raw else 200
        if action and action not in {'administered', 'refused', 'held', 'missed', 'pending'}:
            return jsonify({'error': 'Invalid action filter'}), 400

        history, counts = _mar_history(
            facility_id=facility_id,
            start_date=start_date,
            end_date=end_date,
            nurse_id=nurse_id,
            action=action,
            limit=limit,
        )
        return jsonify({
            'success': True,
            'filters': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'nurse_id': nurse_id,
                'action': action or 'all',
                'limit': limit,
            },
            'summary': counts,
            'nurses': _nurse_filter_options(facility_id),
            'history': history,
        }), 200
    except ValueError as e:
        return jsonify({'error': f'Invalid query parameter: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to load MAR history: {str(e)}'}), 500


@provider_workflows_bp.route('/nurse/mar/history/export', methods=['GET'])
@token_required
@role_required(['Nurse', 'Physician', 'System Administrator'])
@tenant_isolation_required
def export_mar_history_csv():
    """Export MAR history to CSV for supervisor reporting."""
    try:
        facility_id = request.token_payload.get('facility_id')
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        action = (request.args.get('action') or '').strip().lower() or None
        nurse_id_raw = request.args.get('nurse_id')

        start_date = datetime.datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else datetime.date.today()
        end_date = datetime.datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else start_date
        if end_date < start_date:
            return jsonify({'error': 'end_date must be on or after start_date'}), 400

        nurse_id = int(nurse_id_raw) if nurse_id_raw else None
        if action and action not in {'administered', 'refused', 'held', 'missed', 'pending'}:
            return jsonify({'error': 'Invalid action filter'}), 400

        history, _counts = _mar_history(
            facility_id=facility_id,
            start_date=start_date,
            end_date=end_date,
            nurse_id=nurse_id,
            action=action,
            limit=10000,
        )

        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow([
            'administration_id',
            'status',
            'scheduled_time',
            'administered_at',
            'recorded_at',
            'patient_name',
            'patient_mrn',
            'medication_name',
            'dosage',
            'route',
            'dose_given',
            'nurse_name',
            'reason',
            'notes',
        ])
        for row in history:
            writer.writerow([
                row.get('administration_id'),
                row.get('status'),
                row.get('scheduled_time'),
                row.get('administered_at'),
                row.get('recorded_at'),
                (row.get('patient') or {}).get('name'),
                (row.get('patient') or {}).get('mrn'),
                (row.get('medication') or {}).get('name'),
                (row.get('medication') or {}).get('dosage'),
                row.get('route'),
                row.get('dose_given'),
                (row.get('nurse') or {}).get('name'),
                row.get('reason'),
                row.get('notes'),
            ])

        csv_data = buffer.getvalue()
        filename = f"mar_history_{start_date.isoformat()}_{end_date.isoformat()}.csv"
        db.session.add(AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='medication_administration_history_exported',
            resource_type='medication_administration',
            resource_id=None,
            patient_id=None,
            facility_id=facility_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True,
            details=json.dumps({
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'action_filter': action or 'all',
                'nurse_id': nurse_id,
                'rows_exported': len(history),
            }),
        ))
        db.session.commit()
        response = make_response(csv_data)
        response.headers['Content-Type'] = 'text/csv; charset=utf-8'
        response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
    except ValueError as e:
        return jsonify({'error': f'Invalid query parameter: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to export MAR history: {str(e)}'}), 500


@provider_workflows_bp.route('/nurse/mar', methods=['POST'])
@token_required
@role_required(['Nurse', 'Physician', 'System Administrator'])
@tenant_isolation_required
def record_mar_action():
    """Record medication administration action (administered/refused/held)."""
    try:
        data = request.get_json() or {}
        required_fields = ['patient_id', 'medication_id', 'action']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400

        action = str(data.get('action', '')).strip().lower()
        allowed_actions = {'administered', 'refused', 'held', 'missed'}
        if action not in allowed_actions:
            return jsonify({'error': f'Invalid action. Allowed: {", ".join(sorted(allowed_actions))}'}), 400

        if action in {'refused', 'held', 'missed'} and not data.get('reason'):
            return jsonify({'error': 'reason is required when action is refused, held, or missed'}), 400

        patient = Patient.query.filter(
            db.or_(
                Patient.id == data['patient_id'],
                Patient.universal_patient_id == data['patient_id']
            )
        ).first()
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404

        medication = Medication.query.filter(
            Medication.id == data['medication_id'],
            Medication.patient_id == patient.id
        ).first()
        if not medication:
            return jsonify({'error': 'Medication not found for this patient'}), 404
        if not medication.is_active or medication.status != 'active':
            return jsonify({'error': 'Medication is not active'}), 409

        scheduled_time = None
        if data.get('scheduled_time'):
            try:
                scheduled_time = datetime.datetime.fromisoformat(data['scheduled_time'])
            except Exception:
                return jsonify({'error': 'scheduled_time must be an ISO datetime'}), 400

        is_high_risk = bool(data.get('is_high_risk')) or _is_high_risk_medication(medication)
        requires_cosign = bool(data.get('requires_cosign')) or (is_high_risk and action == 'administered')
        cosigned_by = data.get('cosigned_by')
        cosign_completed = bool(cosigned_by) and int(cosigned_by) != request.current_user.id

        record_status = action
        if requires_cosign and action == 'administered' and not cosign_completed:
            record_status = 'pending_cosign'
        if action == 'missed':
            record_status = 'escalated'

        record = MedicationAdministration(
            administration_id=f"MAR-{uuid.uuid4().hex[:12].upper()}",
            patient_id=patient.id,
            medication_id=medication.id,
            encounter_id=data.get('encounter_id'),
            facility_id=request.token_payload.get('facility_id') or patient.facility_id,
            scheduled_time=scheduled_time,
            administered_at=datetime.datetime.utcnow(),
            administered_by=request.current_user.id,
            status=record_status,
            dose_given=data.get('dose_given'),
            route=data.get('route') or medication.route,
            reason=data.get('reason'),
            notes=data.get('notes'),
            is_high_risk=is_high_risk,
            requires_cosign=requires_cosign,
            cosigned_by=int(cosigned_by) if cosign_completed else None,
            cosigned_at=datetime.datetime.utcnow() if cosign_completed else None,
            escalation_status='escalated' if action == 'missed' else 'none',
            escalated_at=datetime.datetime.utcnow() if action == 'missed' else None,
            escalated_to=data.get('escalated_to') if action == 'missed' else None,
            escalation_reason=data.get('reason') if action == 'missed' else None,
        )
        db.session.add(record)
        db.session.flush()

        audit_log = AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='medication_administration_recorded',
            resource_type='medication_administration',
            resource_id=record.id,
            patient_id=patient.id,
            facility_id=record.facility_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True,
            details=json.dumps({
                'medication_id': medication.id,
                'medication_name': medication.medication_name,
                'action': action,
                'is_high_risk': is_high_risk,
                'requires_cosign': requires_cosign,
                'record_status': record_status,
            }),
        )
        db.session.add(audit_log)
        db.session.commit()

        return jsonify({
            'success': True,
            'record': record.to_dict(),
            'message': 'MAR action recorded successfully',
            'requires_cosign': requires_cosign,
            'is_high_risk': is_high_risk,
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to record MAR action: {str(e)}'}), 500


@provider_workflows_bp.route('/nurse/mar/<int:record_id>/cosign', methods=['POST'])
@token_required
@role_required(['Nurse', 'Physician', 'System Administrator'])
@tenant_isolation_required
def cosign_mar_record(record_id):
    """Apply second-signature for high-risk medication administrations."""
    try:
        facility_id = request.token_payload.get('facility_id')
        record = MedicationAdministration.query.filter_by(id=record_id, facility_id=facility_id).first()
        if not record:
            return jsonify({'error': 'MAR record not found'}), 404
        if not record.requires_cosign:
            return jsonify({'error': 'This MAR record does not require co-sign'}), 409
        if record.cosigned_by:
            return jsonify({'error': 'MAR record already co-signed'}), 409
        if record.administered_by == request.current_user.id:
            return jsonify({'error': 'Co-sign must be completed by another clinician'}), 409

        record.cosigned_by = request.current_user.id
        record.cosigned_at = datetime.datetime.utcnow()
        if record.status == 'pending_cosign':
            record.status = 'administered'
        db.session.add(AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='medication_administration_cosigned',
            resource_type='medication_administration',
            resource_id=record.id,
            patient_id=record.patient_id,
            facility_id=record.facility_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True,
            details=json.dumps({
                'record_status': record.status,
                'cosigned_by': request.current_user.id,
            }),
        ))
        db.session.commit()
        return jsonify({'success': True, 'record': record.to_dict(), 'message': 'MAR record co-signed'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to co-sign MAR record: {str(e)}'}), 500


@provider_workflows_bp.route('/nurse/mar/<int:record_id>/escalate', methods=['POST'])
@token_required
@role_required(['Nurse', 'Physician', 'System Administrator'])
@tenant_isolation_required
def escalate_mar_record(record_id):
    """Escalate a missed/held/refused dose to supervisor chain."""
    try:
        data = request.get_json() or {}
        reason = (data.get('reason') or '').strip()
        if not reason:
            return jsonify({'error': 'reason is required'}), 400

        facility_id = request.token_payload.get('facility_id')
        record = MedicationAdministration.query.filter_by(id=record_id, facility_id=facility_id).first()
        if not record:
            return jsonify({'error': 'MAR record not found'}), 404
        if record.status not in {'missed', 'held', 'refused', 'escalated'}:
            return jsonify({'error': 'Only missed/held/refused MAR records can be escalated'}), 409

        record.escalation_status = 'escalated'
        record.escalated_at = datetime.datetime.utcnow()
        record.escalation_reason = reason
        record.escalated_to = data.get('escalated_to') or 'Nursing Supervisor'
        record.status = 'escalated'

        db.session.add(AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='medication_administration_escalated',
            resource_type='medication_administration',
            resource_id=record.id,
            patient_id=record.patient_id,
            facility_id=record.facility_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True,
            details=json.dumps({
                'escalation_reason': reason,
                'escalated_to': record.escalated_to,
            }),
        ))
        db.session.commit()
        return jsonify({'success': True, 'record': record.to_dict(), 'message': 'MAR record escalated'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to escalate MAR record: {str(e)}'}), 500


@provider_workflows_bp.route('/nurse/mar/handoff-summary', methods=['GET'])
@token_required
@role_required(['Nurse', 'Physician', 'System Administrator'])
@tenant_isolation_required
def get_shift_handoff_summaries():
    """List shift handoff summaries for supervisor and nursing continuity."""
    try:
        facility_id = request.token_payload.get('facility_id')
        date_str = request.args.get('date')
        target_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else datetime.date.today()
        rows = NurseShiftHandoff.query.filter_by(
            facility_id=facility_id,
            shift_date=target_date
        ).order_by(NurseShiftHandoff.created_at.desc()).all()
        return jsonify({
            'success': True,
            'date': target_date.isoformat(),
            'handoffs': [row.to_dict() for row in rows]
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to load shift handoff summaries: {str(e)}'}), 500


@provider_workflows_bp.route('/nurse/mar/handoff-summary', methods=['POST'])
@token_required
@role_required(['Nurse', 'Physician', 'System Administrator'])
@tenant_isolation_required
def create_shift_handoff_summary():
    """Create nursing shift handoff summary with MAR key metrics."""
    try:
        data = request.get_json() or {}
        shift_name = (data.get('shift_name') or '').strip().lower()
        if shift_name not in {'morning', 'afternoon', 'night'}:
            return jsonify({'error': 'shift_name must be morning, afternoon, or night'}), 400
        date_str = data.get('shift_date')
        shift_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else datetime.date.today()

        facility_id = request.token_payload.get('facility_id')
        day_start = datetime.datetime.combine(shift_date, datetime.time.min)
        day_end = datetime.datetime.combine(shift_date, datetime.time.max)
        mar_rows = MedicationAdministration.query.filter(
            MedicationAdministration.facility_id == facility_id,
            MedicationAdministration.created_at >= day_start,
            MedicationAdministration.created_at <= day_end,
        ).all()
        summary = {
            'total': len(mar_rows),
            'administered': len([r for r in mar_rows if r.status == 'administered']),
            'pending_cosign': len([r for r in mar_rows if r.status == 'pending_cosign']),
            'missed': len([r for r in mar_rows if r.status == 'missed']),
            'escalated': len([r for r in mar_rows if r.escalation_status == 'escalated']),
        }

        handoff = NurseShiftHandoff(
            handoff_id=f"HNDOFF-{uuid.uuid4().hex[:8].upper()}",
            facility_id=facility_id,
            shift_date=shift_date,
            shift_name=shift_name,
            outgoing_nurse_id=data.get('outgoing_nurse_id'),
            incoming_nurse_id=data.get('incoming_nurse_id'),
            summary_json=json.dumps(summary),
            notes=data.get('notes'),
            created_by=request.current_user.id,
        )
        db.session.add(handoff)
        db.session.flush()
        db.session.add(AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='nurse_handoff_summary_created',
            resource_type='nurse_shift_handoff',
            resource_id=handoff.id,
            patient_id=None,
            facility_id=facility_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True,
            details=json.dumps({
                'shift_name': shift_name,
                'shift_date': shift_date.isoformat(),
                'summary': summary,
            }),
        ))
        db.session.commit()
        return jsonify({'success': True, 'handoff': handoff.to_dict(), 'message': 'Shift handoff summary created'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to create shift handoff summary: {str(e)}'}), 500

# Pharmacist Workflows

@provider_workflows_bp.route('/pharmacist/dashboard', methods=['GET'])
@token_required
@role_required(['Pharmacist', 'System Administrator'])
@tenant_isolation_required
def pharmacist_dashboard():
    """Get pharmacist dashboard with prescription management"""
    try:
        facility_id = request.token_payload.get('facility_id')
        
        # Get pending prescriptions (new medications)
        pending_prescriptions = Medication.query.filter(
            Medication.is_active == True,
            Medication.created_at >= datetime.datetime.now() - datetime.timedelta(days=7)
        ).order_by(Medication.created_at.desc()).all()
        
        # Get medications needing review
        medications_for_review = Medication.query.filter(
            Medication.is_active == True,
            Medication.end_date.is_(None)  # Long-term medications
        ).all()
        
        # Get recent medication changes
        recent_changes = Medication.query.filter(
            Medication.updated_at >= datetime.datetime.now() - datetime.timedelta(days=7)
        ).order_by(Medication.updated_at.desc()).limit(20).all()
        
        dashboard_data = {
            'stats': {
                'pending_prescriptions': len(pending_prescriptions),
                'medications_for_review': len(medications_for_review),
                'recent_changes': len(recent_changes)
            },
            'pending_prescriptions': [
                {
                    'medication': med.to_dict(),
                    'patient': med.patient.to_dict() if med.patient else None
                }
                for med in pending_prescriptions[:10]
            ],
            'medications_for_review': [
                {
                    'medication': med.to_dict(),
                    'patient': med.patient.to_dict() if med.patient else None
                }
                for med in medications_for_review[:10]
            ],
            'recent_changes': [med.to_dict() for med in recent_changes]
        }
        
        return jsonify({
            'success': True,
            'dashboard': dashboard_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to load pharmacist dashboard: {str(e)}'}), 500

@provider_workflows_bp.route('/pharmacist/medication-review', methods=['POST'])
@token_required
@role_required(['Pharmacist', 'System Administrator'])
@tenant_isolation_required
def medication_review():
    """Review and update medication status"""
    try:
        data = request.get_json()
        
        # Find medication
        medication = Medication.query.get(data.get('medication_id'))
        if not medication:
            return jsonify({'error': 'Medication not found'}), 404
        
        # Update medication based on review
        review_action = data.get('action')  # 'approve', 'modify', 'discontinue'
        review_notes = data.get('notes', '')
        
        if review_action == 'approve':
            # Medication approved as-is - mark as reviewed
            medication.notes = f"{medication.notes or ''}\n[Pharmacist Review {datetime.date.today()}]: Approved".strip()
            medication.is_active = True
        elif review_action == 'modify':
            # Update medication details
            if data.get('new_dosage'):
                medication.dosage = data['new_dosage']
            if data.get('new_frequency'):
                medication.frequency = data['new_frequency']
            if data.get('new_end_date'):
                medication.end_date = datetime.datetime.strptime(data['new_end_date'], '%Y-%m-%d').date()
        elif review_action == 'discontinue':
            # Discontinue medication
            medication.is_active = False
            medication.end_date = datetime.date.today()
        
        # Add review notes
        if review_notes:
            current_notes = medication.notes or ''
            medication.notes = f"{current_notes}\n[Pharmacist Review {datetime.date.today()}]: {review_notes}".strip()
        
        medication.updated_at = datetime.datetime.utcnow()
        medication.updated_by = request.current_user.id
        
        db.session.commit()
        
        # Log medication review
        audit_log = AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='medication_reviewed',
            resource_type='medication',
            resource_id=medication.id,
            patient_id=medication.patient_id,
            facility_id=request.token_payload.get('facility_id'),
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True,
            details={
                'action': review_action,
                'medication_name': medication.medication_name
            }
        )
        db.session.add(audit_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'medication': medication.to_dict(),
            'message': f'Medication {review_action}d successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to review medication: {str(e)}'}), 500

# Lab Technician Workflows

@provider_workflows_bp.route('/lab/dashboard', methods=['GET'])
@token_required
@role_required(['Lab Technician', 'System Administrator'])
@tenant_isolation_required
def lab_dashboard():
    """Get lab technician dashboard with pending orders and results"""
    try:
        facility_id = request.token_payload.get('facility_id')
        
        # Get pending lab orders
        pending_orders = LabOrder.query.filter(
            LabOrder.status == 'pending',
            LabOrder.facility_id == facility_id
        ).order_by(LabOrder.order_date.desc()).all()
        
        # Get in-progress orders
        in_progress_orders = LabOrder.query.filter(
            LabOrder.status == 'in_progress',
            LabOrder.facility_id == facility_id
        ).order_by(LabOrder.order_date.desc()).all()
        
        # Get recent results
        recent_results = LabResult.query.filter(
            db.cast(LabResult.result_date, db.Date) >= datetime.date.today() - datetime.timedelta(days=7)
        ).order_by(LabResult.result_date.desc()).limit(20).all()
        
        dashboard_data = {
            'stats': {
                'pending_orders': len(pending_orders),
                'in_progress_orders': len(in_progress_orders),
                'results_today': LabResult.query.filter(
                    db.cast(LabResult.result_date, db.Date) == datetime.date.today()
                ).count()
            },
            'pending_orders': [
                {
                    'order': order.to_dict(),
                    'patient': order.patient.to_dict() if order.patient else None
                }
                for order in pending_orders
            ],
            'in_progress_orders': [
                {
                    'order': order.to_dict(),
                    'patient': order.patient.to_dict() if order.patient else None
                }
                for order in in_progress_orders
            ],
            'recent_results': [result.to_dict() for result in recent_results]
        }
        
        return jsonify({
            'success': True,
            'dashboard': dashboard_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to load lab dashboard: {str(e)}'}), 500

@provider_workflows_bp.route('/lab/result', methods=['POST'])
@token_required
@role_required(['Lab Technician', 'System Administrator'])
@tenant_isolation_required
def submit_lab_result():
    """Submit lab test result"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['order_id', 'test_name', 'result_value']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Find lab order - can be by order_id string or lab_order_id integer
        lab_order = None
        if isinstance(data['order_id'], int):
            lab_order = LabOrder.query.get(data['order_id'])
        else:
            lab_order = LabOrder.query.filter_by(order_id=data['order_id']).first()
        
        if not lab_order:
            return jsonify({'error': 'Lab order not found'}), 404
        
        # Create lab result
        lab_result = LabResult(
            result_id=f"LAB-{uuid.uuid4().hex[:8].upper()}",
            patient_id=lab_order.patient_id,
            lab_order_id=lab_order.id,
            order_id=lab_order.order_id,
            test_name=data['test_name'],
            result_value=data['result_value'],
            reference_range=data.get('reference_range'),
            units=data.get('units'),
            result_unit=data.get('units'),
            status=data.get('status', 'normal'),
            abnormal_flag=data.get('status', 'normal'),
            notes=data.get('notes'),
            result_date=datetime.datetime.now(),
            performed_by=request.current_user.id,
            created_at=datetime.datetime.utcnow()
        )
        
        db.session.add(lab_result)
        
        # Update lab order status
        lab_order.status = 'completed'
        lab_order.order_status = 'completed'
        lab_order.completed_date = datetime.date.today()
        
        db.session.commit()
        
        # Log lab result submission
        audit_log = AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='lab_result_submitted',
            resource_type='lab_result',
            resource_id=lab_result.id,
            patient_id=lab_order.patient_id,
            facility_id=request.token_payload.get('facility_id'),
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True,
            details=json.dumps({
                'test_name': lab_result.test_name,
                'result_id': lab_result.result_id
            })
        )
        db.session.add(audit_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'lab_result': lab_result.to_dict(),
            'message': 'Lab result submitted successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to submit lab result: {str(e)}'}), 500

# Radiology Workflows

@provider_workflows_bp.route('/radiology/dashboard', methods=['GET'])
@token_required
@role_required(['Radiographer', 'System Administrator'])
@tenant_isolation_required
def radiology_dashboard():
    """Get radiology dashboard with imaging queue and completion metrics."""
    try:
        facility_id = request.token_payload.get('facility_id')
        radiology_orders = LabOrder.query.filter(
            LabOrder.facility_id == facility_id,
            LabOrder.test_category.in_(['radiology', 'imaging'])
        )
        pending = radiology_orders.filter(LabOrder.status == 'pending').order_by(LabOrder.order_date.asc()).all()
        in_progress = radiology_orders.filter(LabOrder.status == 'in_progress').order_by(LabOrder.order_date.asc()).all()
        completed = radiology_orders.filter(LabOrder.status == 'completed').order_by(LabOrder.order_date.desc()).limit(20).all()

        def _order_payload(row):
            patient = Patient.query.get(row.patient_id)
            return {'order': row.to_dict(), 'patient': patient.to_dict() if patient else None}

        return jsonify({
            'success': True,
            'stats': {
                'pending': len(pending),
                'in_progress': len(in_progress),
                'completed_recent': len(completed),
            },
            'pending_orders': [_order_payload(row) for row in pending],
            'in_progress_orders': [_order_payload(row) for row in in_progress],
            'completed_orders': [_order_payload(row) for row in completed],
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to load radiology dashboard: {str(e)}'}), 500


@provider_workflows_bp.route('/radiology/order', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'System Administrator'])
@tenant_isolation_required
def create_radiology_order():
    """Create an imaging/radiology order."""
    try:
        data = request.get_json() or {}
        required_fields = ['patient_id', 'test_name']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400

        provider = Provider.query.filter_by(user_account_id=request.current_user.id).first()
        if not provider:
            return jsonify({'error': 'Provider profile not found'}), 404

        patient = Patient.query.filter(
            db.or_(Patient.id == data['patient_id'], Patient.universal_patient_id == data['patient_id'])
        ).first()
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404

        encounter_id = data.get('encounter_id')
        if not encounter_id:
            encounter = ClinicalEncounter.query.filter(
                ClinicalEncounter.patient_id == patient.id,
                ClinicalEncounter.provider_id == provider.id
            ).order_by(ClinicalEncounter.encounter_date.desc()).first()
            encounter_id = encounter.id if encounter else None
        if not encounter_id:
            return jsonify({'error': 'encounter_id is required for radiology orders'}), 400

        order = LabOrder(
            order_id=f"RAD-{uuid.uuid4().hex[:8].upper()}",
            encounter_id=encounter_id,
            patient_id=patient.id,
            ordering_provider_id=provider.id,
            facility_id=request.token_payload.get('facility_id'),
            test_name=data['test_name'],
            test_code=data.get('test_code'),
            test_category='radiology',
            priority=data.get('priority', 'routine'),
            clinical_indication=data.get('clinical_indication'),
            specimen_type='imaging',
            status='pending',
            order_status='ordered',
            order_date=datetime.datetime.utcnow(),
        )
        db.session.add(order)
        db.session.flush()

        db.session.add(AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='radiology_order_created',
            resource_type='radiology_order',
            resource_id=order.id,
            patient_id=patient.id,
            facility_id=order.facility_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True,
            details=json.dumps({'order_id': order.order_id, 'test_name': order.test_name}),
        ))
        db.session.commit()

        return jsonify({'success': True, 'order': order.to_dict(), 'message': 'Radiology order created'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to create radiology order: {str(e)}'}), 500


@provider_workflows_bp.route('/radiology/orders/<int:order_id>/start', methods=['POST'])
@token_required
@role_required(['Radiographer', 'System Administrator'])
@tenant_isolation_required
def start_radiology_order(order_id):
    """Move radiology order to in_progress."""
    try:
        facility_id = request.token_payload.get('facility_id')
        order = LabOrder.query.filter(
            LabOrder.id == order_id,
            LabOrder.facility_id == facility_id,
            LabOrder.test_category.in_(['radiology', 'imaging'])
        ).first()
        if not order:
            return jsonify({'error': 'Radiology order not found'}), 404
        if order.status == 'completed':
            return jsonify({'error': 'Order already completed'}), 409
        order.status = 'in_progress'
        order.order_status = 'in_progress'
        db.session.commit()
        return jsonify({'success': True, 'order': order.to_dict(), 'message': 'Radiology order started'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to start radiology order: {str(e)}'}), 500


@provider_workflows_bp.route('/radiology/orders/<int:order_id>/complete', methods=['POST'])
@token_required
@role_required(['Radiographer', 'System Administrator'])
@tenant_isolation_required
def complete_radiology_order(order_id):
    """Complete radiology order and submit imaging report as result."""
    try:
        data = request.get_json() or {}
        if not data.get('report_text'):
            return jsonify({'error': 'report_text is required'}), 400

        facility_id = request.token_payload.get('facility_id')
        order = LabOrder.query.filter(
            LabOrder.id == order_id,
            LabOrder.facility_id == facility_id,
            LabOrder.test_category.in_(['radiology', 'imaging'])
        ).first()
        if not order:
            return jsonify({'error': 'Radiology order not found'}), 404

        result = LabResult(
            result_id=f"RAD-RES-{uuid.uuid4().hex[:8].upper()}",
            order_id=order.order_id,
            lab_order_id=order.id,
            patient_id=order.patient_id,
            test_name=order.test_name,
            result_value='Report available',
            result_unit='text',
            units='text',
            status='normal',
            abnormal_flag='normal',
            result_date=datetime.datetime.utcnow(),
            result_status='final',
            performed_by=request.current_user.id,
            interpretation=data.get('impression'),
            notes=data.get('report_text'),
        )
        db.session.add(result)

        order.status = 'completed'
        order.order_status = 'completed'
        order.completed_date = datetime.date.today()

        db.session.add(AuditLog(
            log_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            user_id=request.current_user.id,
            action_type='radiology_order_completed',
            resource_type='radiology_order',
            resource_id=order.id,
            patient_id=order.patient_id,
            facility_id=order.facility_id,
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent'),
            success=True,
            details=json.dumps({'order_id': order.order_id, 'result_id': result.result_id}),
        ))

        db.session.commit()
        return jsonify({'success': True, 'order': order.to_dict(), 'result': result.to_dict(), 'message': 'Radiology order completed'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to complete radiology order: {str(e)}'}), 500

# OT Manager Workflows

@provider_workflows_bp.route('/ot-manager/dashboard', methods=['GET'])
@token_required
@role_required(['OT Manager', 'ot_manager', 'System Administrator'])
@tenant_isolation_required
def ot_manager_dashboard():
    """Get OT schedules and resource availability."""
    try:
        facility_id = request.token_payload.get('facility_id')
        _ensure_ot_resources(facility_id)
        date_str = request.args.get('date')
        target_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date() if date_str else datetime.date.today()
        day_start = datetime.datetime.combine(target_date, datetime.time.min)
        day_end = datetime.datetime.combine(target_date, datetime.time.max)

        schedules = OTSchedule.query.filter(
            OTSchedule.facility_id == facility_id,
            OTSchedule.scheduled_start >= day_start,
            OTSchedule.scheduled_start <= day_end,
        ).order_by(OTSchedule.scheduled_start.asc()).all()

        resources = OTResource.query.filter_by(facility_id=facility_id).order_by(
            OTResource.resource_type.asc(), OTResource.name.asc()
        ).all()

        return jsonify({
            'success': True,
            'date': target_date.isoformat(),
            'stats': {
                'scheduled': len([s for s in schedules if s.status == 'scheduled']),
                'in_progress': len([s for s in schedules if s.status == 'in_progress']),
                'completed': len([s for s in schedules if s.status == 'completed']),
                'resources_available': len([r for r in resources if (r.quantity_available or 0) > 0]),
            },
            'schedules': [row.to_dict() for row in schedules],
            'resources': [row.to_dict() for row in resources],
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to load OT manager dashboard: {str(e)}'}), 500


@provider_workflows_bp.route('/ot-manager/resources', methods=['POST'])
@token_required
@role_required(['OT Manager', 'ot_manager', 'System Administrator'])
@tenant_isolation_required
def create_ot_resource():
    """Create OT resource for scheduling and allocation."""
    try:
        data = request.get_json() or {}
        for field in ['name', 'resource_type']:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400

        facility_id = request.token_payload.get('facility_id')
        quantity = int(data.get('quantity_total') or 1)
        if quantity < 1:
            return jsonify({'error': 'quantity_total must be at least 1'}), 400

        resource = OTResource(
            resource_code=f"OT-RES-{uuid.uuid4().hex[:8].upper()}",
            facility_id=facility_id,
            name=data['name'],
            resource_type=data['resource_type'],
            quantity_total=quantity,
            quantity_available=quantity,
            status='available',
        )
        db.session.add(resource)
        db.session.commit()
        return jsonify({'success': True, 'resource': resource.to_dict(), 'message': 'OT resource created'}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to create OT resource: {str(e)}'}), 500


@provider_workflows_bp.route('/ot-manager/schedules', methods=['POST'])
@token_required
@role_required(['OT Manager', 'ot_manager', 'Physician', 'System Administrator'])
@tenant_isolation_required
def create_ot_schedule():
    """Schedule OT procedure with required resources."""
    try:
        data = request.get_json() or {}
        required_fields = ['patient_id', 'procedure_name', 'ot_room', 'scheduled_start', 'scheduled_end']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400

        facility_id = request.token_payload.get('facility_id')
        _ensure_ot_resources(facility_id)

        patient = Patient.query.filter(
            db.or_(Patient.id == data['patient_id'], Patient.universal_patient_id == data['patient_id'])
        ).first()
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404

        scheduled_start = _parse_iso_datetime(data.get('scheduled_start'), 'scheduled_start')
        scheduled_end = _parse_iso_datetime(data.get('scheduled_end'), 'scheduled_end')
        if scheduled_end <= scheduled_start:
            return jsonify({'error': 'scheduled_end must be after scheduled_start'}), 400

        schedule = OTSchedule(
            schedule_id=f"OTS-{uuid.uuid4().hex[:8].upper()}",
            facility_id=facility_id,
            patient_id=patient.id,
            encounter_id=data.get('encounter_id'),
            procedure_name=data['procedure_name'],
            ot_room=data['ot_room'],
            surgeon_name=data.get('surgeon_name'),
            anesthetist_name=data.get('anesthetist_name'),
            scheduled_start=scheduled_start,
            scheduled_end=scheduled_end,
            status='scheduled',
            required_resources_json=json.dumps(data.get('required_resources') or []),
            allocated_resources_json=json.dumps([]),
            notes=data.get('notes'),
            created_by=request.current_user.id,
        )
        db.session.add(schedule)
        db.session.commit()
        return jsonify({'success': True, 'schedule': schedule.to_dict(), 'message': 'OT schedule created'}), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to create OT schedule: {str(e)}'}), 500


@provider_workflows_bp.route('/ot-manager/schedules/<int:schedule_id>/allocate', methods=['POST'])
@token_required
@role_required(['OT Manager', 'ot_manager', 'System Administrator'])
@tenant_isolation_required
def allocate_ot_resources(schedule_id):
    """Allocate resources to OT schedule."""
    try:
        data = request.get_json() or {}
        resource_ids = data.get('resource_ids') or []
        if not isinstance(resource_ids, list) or len(resource_ids) == 0:
            return jsonify({'error': 'resource_ids list is required'}), 400

        facility_id = request.token_payload.get('facility_id')
        schedule = OTSchedule.query.filter_by(id=schedule_id, facility_id=facility_id).first()
        if not schedule:
            return jsonify({'error': 'OT schedule not found'}), 404
        if schedule.status != 'scheduled':
            return jsonify({'error': 'Resources can only be allocated while schedule is in scheduled state'}), 409

        allocated = []
        for rid in resource_ids:
            resource = OTResource.query.filter_by(id=rid, facility_id=facility_id).first()
            if not resource:
                return jsonify({'error': f'Resource {rid} not found'}), 404
            if (resource.quantity_available or 0) < 1:
                return jsonify({'error': f'Resource {resource.name} is unavailable'}), 409
            resource.quantity_available = max(0, (resource.quantity_available or 0) - 1)
            resource.status = 'available' if resource.quantity_available > 0 else 'unavailable'
            allocated.append({
                'resource_id': resource.id,
                'resource_code': resource.resource_code,
                'name': resource.name,
                'type': resource.resource_type,
            })

        schedule.allocated_resources_json = json.dumps(allocated)
        db.session.commit()
        return jsonify({'success': True, 'schedule': schedule.to_dict(), 'message': 'OT resources allocated'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to allocate OT resources: {str(e)}'}), 500


@provider_workflows_bp.route('/ot-manager/schedules/<int:schedule_id>/start', methods=['POST'])
@token_required
@role_required(['OT Manager', 'ot_manager', 'System Administrator'])
@tenant_isolation_required
def start_ot_schedule(schedule_id):
    """Mark OT schedule as in progress."""
    try:
        facility_id = request.token_payload.get('facility_id')
        schedule = OTSchedule.query.filter_by(id=schedule_id, facility_id=facility_id).first()
        if not schedule:
            return jsonify({'error': 'OT schedule not found'}), 404
        if schedule.status != 'scheduled':
            return jsonify({'error': 'Only scheduled OT can be started'}), 409
        allocated = json.loads(schedule.allocated_resources_json or '[]')
        if len(allocated) == 0:
            return jsonify({'error': 'Allocate resources before starting OT'}), 409
        schedule.status = 'in_progress'
        schedule.started_at = datetime.datetime.utcnow()
        db.session.commit()
        return jsonify({'success': True, 'schedule': schedule.to_dict(), 'message': 'OT schedule started'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to start OT schedule: {str(e)}'}), 500


@provider_workflows_bp.route('/ot-manager/schedules/<int:schedule_id>/complete', methods=['POST'])
@token_required
@role_required(['OT Manager', 'ot_manager', 'System Administrator'])
@tenant_isolation_required
def complete_ot_schedule(schedule_id):
    """Complete OT schedule and release allocated resources."""
    try:
        facility_id = request.token_payload.get('facility_id')
        schedule = OTSchedule.query.filter_by(id=schedule_id, facility_id=facility_id).first()
        if not schedule:
            return jsonify({'error': 'OT schedule not found'}), 404
        if schedule.status != 'in_progress':
            return jsonify({'error': 'Only in-progress OT can be completed'}), 409

        allocated = json.loads(schedule.allocated_resources_json or '[]')
        for row in allocated:
            resource = OTResource.query.filter_by(id=row.get('resource_id'), facility_id=facility_id).first()
            if resource:
                resource.quantity_available = min(
                    resource.quantity_total or 1,
                    (resource.quantity_available or 0) + 1
                )
                resource.status = 'available' if resource.quantity_available > 0 else 'unavailable'

        schedule.status = 'completed'
        schedule.completed_at = datetime.datetime.utcnow()
        db.session.commit()
        return jsonify({'success': True, 'schedule': schedule.to_dict(), 'message': 'OT schedule completed'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to complete OT schedule: {str(e)}'}), 500


@provider_workflows_bp.route('/ot-manager/schedules/<int:schedule_id>/cancel', methods=['POST'])
@token_required
@role_required(['OT Manager', 'ot_manager', 'System Administrator'])
@tenant_isolation_required
def cancel_ot_schedule(schedule_id):
    """Cancel OT schedule with mandatory reason."""
    try:
        data = request.get_json() or {}
        reason = (data.get('reason') or '').strip()
        if not reason:
            return jsonify({'error': 'reason is required'}), 400
        facility_id = request.token_payload.get('facility_id')
        schedule = OTSchedule.query.filter_by(id=schedule_id, facility_id=facility_id).first()
        if not schedule:
            return jsonify({'error': 'OT schedule not found'}), 404
        if schedule.status == 'completed':
            return jsonify({'error': 'Completed OT schedule cannot be cancelled'}), 409

        if schedule.status == 'in_progress':
            allocated = json.loads(schedule.allocated_resources_json or '[]')
            for row in allocated:
                resource = OTResource.query.filter_by(id=row.get('resource_id'), facility_id=facility_id).first()
                if resource:
                    resource.quantity_available = min(
                        resource.quantity_total or 1,
                        (resource.quantity_available or 0) + 1
                    )
                    resource.status = 'available' if resource.quantity_available > 0 else 'unavailable'

        schedule.status = 'cancelled'
        schedule.cancelled_at = datetime.datetime.utcnow()
        schedule.cancellation_reason = reason
        db.session.commit()
        return jsonify({'success': True, 'schedule': schedule.to_dict(), 'message': 'OT schedule cancelled'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to cancel OT schedule: {str(e)}'}), 500


@provider_workflows_bp.route('/ot-manager/analytics', methods=['GET'])
@token_required
@role_required(['OT Manager', 'ot_manager', 'System Administrator'])
@tenant_isolation_required
def ot_utilization_analytics():
    """OT utilization analytics: room utilization, turnaround, cancellation reasons."""
    try:
        facility_id = request.token_payload.get('facility_id')
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        start_date = datetime.datetime.strptime(start_date_str, '%Y-%m-%d').date() if start_date_str else datetime.date.today()
        end_date = datetime.datetime.strptime(end_date_str, '%Y-%m-%d').date() if end_date_str else start_date
        if end_date < start_date:
            return jsonify({'error': 'end_date must be on or after start_date'}), 400

        start_dt = datetime.datetime.combine(start_date, datetime.time.min)
        end_dt = datetime.datetime.combine(end_date, datetime.time.max)
        rows = OTSchedule.query.filter(
            OTSchedule.facility_id == facility_id,
            OTSchedule.scheduled_start >= start_dt,
            OTSchedule.scheduled_start <= end_dt
        ).order_by(OTSchedule.ot_room.asc(), OTSchedule.scheduled_start.asc()).all()

        day_span = max(1, (end_date - start_date).days + 1)
        room_groups = {}
        for row in rows:
            room_groups.setdefault(row.ot_room or 'Unassigned Room', []).append(row)

        room_utilization = []
        total_utilization = 0.0
        for room_name, room_rows in room_groups.items():
            active_rows = [r for r in room_rows if r.status != 'cancelled']
            used_minutes = 0
            for r in active_rows:
                if r.scheduled_start and r.scheduled_end:
                    used_minutes += max(0, int((r.scheduled_end - r.scheduled_start).total_seconds() // 60))
            available_minutes = day_span * 12 * 60  # 12-hour OT day baseline
            utilization_pct = round((used_minutes / available_minutes) * 100, 2) if available_minutes else 0.0
            total_utilization += utilization_pct
            room_utilization.append({
                'room': room_name,
                'used_minutes': used_minutes,
                'available_minutes': available_minutes,
                'utilization_pct': utilization_pct,
                'cases': len(active_rows),
            })

        room_utilization.sort(key=lambda row: row['utilization_pct'], reverse=True)
        avg_room_utilization = round(total_utilization / len(room_utilization), 2) if room_utilization else 0.0

        turnaround_values = []
        for room_name, room_rows in room_groups.items():
            completed_rows = [r for r in room_rows if r.status == 'completed']
            completed_rows.sort(key=lambda r: r.scheduled_start or datetime.datetime.min)
            for idx in range(1, len(completed_rows)):
                prev = completed_rows[idx - 1]
                current = completed_rows[idx]
                prev_end = prev.completed_at or prev.scheduled_end
                current_start = current.scheduled_start
                if prev_end and current_start and current_start > prev_end:
                    turnaround_values.append(int((current_start - prev_end).total_seconds() // 60))

        avg_turnaround_minutes = round(sum(turnaround_values) / len(turnaround_values), 2) if turnaround_values else 0.0

        cancellation_reasons = {}
        for row in rows:
            if row.status == 'cancelled':
                reason = row.cancellation_reason or 'Unspecified'
                cancellation_reasons[reason] = cancellation_reasons.get(reason, 0) + 1
        cancellation_reason_rows = [
            {'reason': reason, 'count': count}
            for reason, count in sorted(cancellation_reasons.items(), key=lambda item: item[1], reverse=True)
        ]

        return jsonify({
            'success': True,
            'filters': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
            },
            'summary': {
                'avg_room_utilization_pct': avg_room_utilization,
                'avg_turnaround_minutes': avg_turnaround_minutes,
                'cancelled_cases': sum([row['count'] for row in cancellation_reason_rows]),
                'total_cases': len(rows),
            },
            'room_utilization': room_utilization,
            'turnaround_samples': turnaround_values,
            'cancellation_reasons': cancellation_reason_rows,
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to compute OT analytics: {str(e)}'}), 500

# General Provider Utilities

@provider_workflows_bp.route('/provider/patients', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'Pharmacist', 'Lab Technician', 'System Administrator'])
@tenant_isolation_required
def get_provider_patients():
    """Get patients relevant to current provider"""
    try:
        # Get current provider
        provider = Provider.query.filter_by(user_account_id=request.current_user.id).first()
        facility_id = request.token_payload.get('facility_id')
        
        # Get patients based on provider type and recent interactions
        user_roles = [role['role_name'] for role in request.token_payload.get('roles', [])]
        
        if 'Physician' in user_roles and provider:
            # Get patients with recent encounters with this physician
            patients = db.session.query(Patient).join(ClinicalEncounter).filter(
                ClinicalEncounter.provider_id == provider.id,
                db.cast(ClinicalEncounter.encounter_date, db.Date) >= datetime.date.today() - datetime.timedelta(days=30)
            ).distinct().all()
        else:
            # Get all patients in facility for other roles
            patients = Patient.query.filter_by(facility_id=facility_id).limit(50).all()
        
        return jsonify({
            'success': True,
            'patients': [patient.to_dict() for patient in patients],
            'provider_type': user_roles[0] if user_roles else 'Unknown'
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to get provider patients: {str(e)}'}), 500

@provider_workflows_bp.route('/workflows', methods=['GET'])
@token_required
def get_workflows():
    """Get all available workflows"""
    try:
        rows = ProviderWorkflowTemplate.query.filter_by(is_active=True).order_by(ProviderWorkflowTemplate.created_at.desc()).all()
        workflows = []
        for row in rows:
            steps = json.loads(row.steps_json) if row.steps_json else []
            workflows.append({
                'id': row.id,
                'name': row.name,
                'description': row.description,
                'category': row.category,
                'step_count': len(steps),
                'duration': row.duration
            })
        
        return jsonify({
            'success': True,
            'workflows': workflows
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@provider_workflows_bp.route('/templates', methods=['GET'])
@token_required
def get_workflow_templates():
    """Get workflow templates"""
    try:
        rows = ProviderWorkflowTemplate.query.filter_by(is_active=True).order_by(ProviderWorkflowTemplate.name.asc()).all()
        templates = []
        for row in rows:
            steps = json.loads(row.steps_json) if row.steps_json else []
            templates.append({
                'id': row.id,
                'name': row.name,
                'description': row.description,
                'category': row.category,
                'step_count': len(steps),
                'duration': row.duration
            })
        
        return jsonify({
            'success': True,
            'templates': templates
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@provider_workflows_bp.route('/active', methods=['GET'])
@token_required
def get_active_workflows():
    """Get active workflow instances"""
    try:
        active_rows = ProviderWorkflowInstance.query.filter(
            ProviderWorkflowInstance.status.in_(['active', 'paused'])
        ).order_by(ProviderWorkflowInstance.started_at.desc()).all()
        active_workflows = []
        for instance in active_rows:
            patient = Patient.query.get(instance.patient_id)
            step_rows = ProviderWorkflowInstanceStep.query.filter_by(instance_id=instance.id).order_by(ProviderWorkflowInstanceStep.step_order.asc()).all()
            completed_steps = len([s for s in step_rows if s.status == 'completed'])
            active_workflows.append({
                'id': instance.id,
                'workflow_name': instance.template.name if instance.template else f'Workflow #{instance.template_id}',
                'patient_name': f'{patient.first_name} {patient.last_name}' if patient else f'Patient #{instance.patient_id}',
                'started_at': instance.started_at.isoformat() if instance.started_at else None,
                'status': instance.status,
                'completed_steps': completed_steps,
                'total_steps': len(step_rows),
                'steps': [step.to_dict() for step in step_rows]
            })
        
        return jsonify({
            'success': True,
            'active': active_workflows
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@provider_workflows_bp.route('/start', methods=['POST'])
@token_required
def start_workflow():
    """Start a new workflow instance"""
    try:
        data = request.get_json()
        workflow_id = data.get('workflow_id')
        patient_id = data.get('patient_id')
        if not workflow_id or not patient_id:
            return jsonify({'error': 'workflow_id and patient_id are required'}), 400

        template = ProviderWorkflowTemplate.query.filter_by(id=workflow_id, is_active=True).first()
        if not template:
            return jsonify({'error': 'Workflow template not found'}), 404

        patient = Patient.query.filter(
            db.or_(Patient.id == patient_id, Patient.universal_patient_id == str(patient_id))
        ).first()
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404

        instance = ProviderWorkflowInstance(
            template_id=template.id,
            patient_id=patient.id,
            started_by=getattr(request.current_user, 'id', None),
            status='active',
            started_at=datetime.datetime.utcnow()
        )
        db.session.add(instance)
        db.session.flush()

        template_steps = _parse_steps(json.loads(template.steps_json) if template.steps_json else [])
        for idx, step in enumerate(template_steps, start=1):
            db.session.add(ProviderWorkflowInstanceStep(
                instance_id=instance.id,
                step_order=idx,
                name=step['name'],
                description=step.get('description'),
                required=step.get('required', True),
                estimated_time=step.get('estimated_time'),
                status='current' if idx == 1 else 'pending'
            ))
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Workflow started successfully',
            'workflow_instance_id': instance.id,
            'token_number': f'WF-{template.id}-{patient.universal_patient_id or patient.id}'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@provider_workflows_bp.route('/<int:workflow_id>/step/<int:step_id>/complete', methods=['POST'])
@token_required
def complete_workflow_step(workflow_id, step_id):
    """Mark a workflow step as complete"""
    try:
        instance = ProviderWorkflowInstance.query.get(workflow_id)
        if not instance:
            return jsonify({'error': 'Workflow instance not found'}), 404
        step = ProviderWorkflowInstanceStep.query.filter_by(id=step_id, instance_id=instance.id).first()
        if not step:
            return jsonify({'error': 'Workflow step not found'}), 404
        if step.status == 'completed':
            return jsonify({'success': True, 'message': 'Step already completed'}), 200

        step.status = 'completed'
        step.completed_at = datetime.datetime.utcnow()
        step.completed_by = getattr(request.current_user, 'id', None)

        next_step = ProviderWorkflowInstanceStep.query.filter(
            ProviderWorkflowInstanceStep.instance_id == instance.id,
            ProviderWorkflowInstanceStep.status == 'pending'
        ).order_by(ProviderWorkflowInstanceStep.step_order.asc()).first()

        if next_step:
            next_step.status = 'current'
        else:
            instance.status = 'completed'
            instance.completed_at = datetime.datetime.utcnow()

        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Step completed successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@provider_workflows_bp.route('/create', methods=['POST'])
@token_required
@role_required(['admin', 'system_administrator'])
def create_workflow():
    """Create a new workflow template"""
    try:
        data = request.get_json()
        
        workflow_name = data.get('name')
        description = data.get('description')
        category = data.get('category', 'General')
        duration = data.get('duration')
        steps = data.get('steps', [])
        
        if not workflow_name or not steps:
            return jsonify({'error': 'Workflow name and steps are required'}), 400
        parsed_steps = _parse_steps(steps)
        if not parsed_steps:
            return jsonify({'error': 'At least one valid step is required'}), 400

        template = ProviderWorkflowTemplate(
            name=workflow_name,
            description=description,
            category=category,
            duration=duration,
            steps_json=json.dumps(parsed_steps),
            is_active=True,
            created_by=getattr(request.current_user, 'id', None)
        )
        db.session.add(template)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Workflow created successfully',
            'workflow_id': template.id,
            'workflow': {
                'id': template.id,
                'name': workflow_name,
                'description': description,
                'category': category,
                'duration': duration,
                'step_count': len(parsed_steps),
                'steps': parsed_steps
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@provider_workflows_bp.route('/<int:workflow_id>', methods=['DELETE'])
@token_required
@role_required(['admin', 'system_administrator'])
def delete_workflow(workflow_id):
    """Delete a workflow template"""
    try:
        template = ProviderWorkflowTemplate.query.get(workflow_id)
        if not template:
            return jsonify({'error': 'Workflow template not found'}), 404
        active_instances = ProviderWorkflowInstance.query.filter(
            ProviderWorkflowInstance.template_id == template.id,
            ProviderWorkflowInstance.status.in_(['active', 'paused'])
        ).count()
        if active_instances > 0:
            return jsonify({'error': 'Cannot delete template with active workflow instances'}), 409

        template.is_active = False
        template.updated_at = datetime.datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Workflow deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@provider_workflows_bp.route('/<int:workflow_id>', methods=['PUT'])
@token_required
@role_required(['admin', 'system_administrator'])
def update_workflow(workflow_id):
    """Update a workflow template"""
    try:
        data = request.get_json()
        template = ProviderWorkflowTemplate.query.get(workflow_id)
        if not template:
            return jsonify({'error': 'Workflow template not found'}), 404

        if data.get('name'):
            template.name = data['name']
        if 'description' in data:
            template.description = data.get('description')
        if data.get('category'):
            template.category = data['category']
        if 'duration' in data:
            template.duration = data.get('duration')
        if 'steps' in data:
            parsed_steps = _parse_steps(data.get('steps') or [])
            if not parsed_steps:
                return jsonify({'error': 'Updated workflow must include at least one valid step'}), 400
            template.steps_json = json.dumps(parsed_steps)

        template.updated_at = datetime.datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Workflow updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

