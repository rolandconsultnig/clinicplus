"""
Out-Patient Department (OPD) Workflow Routes
Handles walk-in patient workflow from registration to discharge
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.opd import OPDVisit, OPDQueue
from src.models.patient import Patient
from src.models.clinical import ClinicalEncounter, VitalSigns
from src.models.provider import Provider
from datetime import datetime, date
import uuid

opd_bp = Blueprint('opd', __name__)
_tables_ready = False

WORKFLOW_STEP_ORDER = [
    'booked',
    'arrived',
    'registered',
    'triaged',
    'in_queue',
    'in_consultation',
    'investigations_ordered',
    'investigations_completed',
    'review_completed',
    'pharmacy_completed',
    'billing_completed',
    'discharged',
]


def _ensure_opd_tables():
    global _tables_ready
    if _tables_ready:
        return

    OPDVisit.__table__.create(bind=db.engine, checkfirst=True)
    OPDQueue.__table__.create(bind=db.engine, checkfirst=True)

    # Lightweight schema migration for newly introduced OPD workflow fields.
    required_columns = {
        'appointment_date': 'DATETIME',
        'booking_source': 'VARCHAR(30)',
        'department': 'VARCHAR(100)',
        'insurance_plan': 'VARCHAR(120)',
        'registration_qr': 'VARCHAR(120)',
        'registration_verified': 'BOOLEAN DEFAULT 0',
        'verification_notes': 'TEXT',
        'verified_by': 'INTEGER',
        'verified_at': 'DATETIME',
        'arrived_at': 'DATETIME',
        'review_completed': 'BOOLEAN DEFAULT 0',
        'pharmacy_completed': 'BOOLEAN DEFAULT 0',
        'pharmacy_completed_at': 'DATETIME',
        'billing_completed': 'BOOLEAN DEFAULT 0',
        'billing_completed_at': 'DATETIME',
        'total_billing_amount': 'FLOAT DEFAULT 0',
        'visit_summary': 'TEXT',
    }
    existing_columns = {
        row[1] for row in db.session.execute(db.text("PRAGMA table_info(opd_visits)")).fetchall()
    }
    for column_name, definition in required_columns.items():
        if column_name not in existing_columns:
            db.session.execute(db.text(f"ALTER TABLE opd_visits ADD COLUMN {column_name} {definition}"))
    db.session.commit()
    _tables_ready = True


@opd_bp.before_request
def initialize_opd_tables():
    _ensure_opd_tables()


def _build_step_progress(visit):
    current_status = visit.workflow_status or 'booked'
    try:
        current_index = WORKFLOW_STEP_ORDER.index(current_status)
    except ValueError:
        current_index = -1

    steps = []
    for index, step in enumerate(WORKFLOW_STEP_ORDER):
        steps.append({
            'step': step,
            'completed': index < current_index or (current_status == 'discharged' and step == 'discharged'),
            'current': index == current_index and current_status != 'discharged',
        })
    if current_status == 'discharged':
        for step in steps:
            step['completed'] = True
            step['current'] = False
    return steps


@opd_bp.route('/visits/book', methods=['POST'])
@token_required
@role_required(['Receptionist', 'Nurse', 'System Administrator'])
def book_opd_visit():
    """Book a scheduled OPD visit."""
    try:
        data = request.get_json() or {}
        patient_id = data.get('patient_id')
        if not patient_id:
            return jsonify({'error': 'patient_id is required'}), 400

        patient = Patient.query.get(patient_id)
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404

        facility_id = request.token_payload.get('facility_id') or patient.facility_id
        appointment_date = None
        if data.get('appointment_date'):
            appointment_date = datetime.strptime(data['appointment_date'], '%Y-%m-%d')

        visit = OPDVisit(
            visit_id=f"OPD-{uuid.uuid4().hex[:8].upper()}",
            patient_id=patient.id,
            facility_id=facility_id,
            visit_type='scheduled',
            workflow_status='booked',
            appointment_date=appointment_date,
            booking_source=data.get('booking_source', 'online'),
            department=data.get('department'),
            insurance_plan=data.get('insurance_plan'),
            chief_complaint=data.get('chief_complaint', ''),
            registration_token=f"T{datetime.now().strftime('%Y%m%d%H%M%S')[-8:]}",
            registration_qr=f"QR-{uuid.uuid4().hex[:12].upper()}",
            created_by=request.current_user.id
        )
        db.session.add(visit)
        db.session.commit()

        return jsonify({
            'success': True,
            'visit': visit.to_dict(),
            'message': 'OPD appointment booked'
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Step 1: Patient Arrival and Registration
@opd_bp.route('/visits/register', methods=['POST'])
@token_required
@role_required(['Receptionist', 'Nurse', 'System Administrator'])
def register_opd_visit():
    """Register a new walk-in patient visit"""
    try:
        data = request.get_json()
        facility_id = request.token_payload.get('facility_id')
        
        # Check if patient exists or create new
        patient_id = data.get('patient_id')
        if not patient_id:
            # Create new patient if MRN provided
            mrn = data.get('mrn')
            if mrn:
                patient = Patient.query.filter_by(universal_patient_id=mrn).first()
                if patient:
                    patient_id = patient.id
                else:
                    return jsonify({'error': 'Patient not found with provided MRN'}), 404
            else:
                return jsonify({'error': 'Patient ID or MRN required'}), 400
        
        # Create OPD visit
        visit = OPDVisit(
            visit_id=f"OPD-{uuid.uuid4().hex[:8].upper()}",
            patient_id=patient_id,
            facility_id=facility_id,
            visit_type='walk_in',
            chief_complaint=data.get('chief_complaint', ''),
            workflow_status='registered',
            registration_token=f"T{datetime.now().strftime('%Y%m%d%H%M%S')[-8:]}",
            registration_qr=f"QR-{uuid.uuid4().hex[:12].upper()}",
            arrived_at=datetime.utcnow(),
            booking_source=data.get('booking_source', 'walk_in'),
            department=data.get('department'),
            insurance_plan=data.get('insurance_plan'),
            registration_fee_paid=data.get('registration_fee_paid', False),
            registration_fee_amount=data.get('registration_fee_amount', 0.0),
            created_by=request.current_user.id
        )
        
        db.session.add(visit)
        db.session.flush()
        
        return jsonify({
            'success': True,
            'visit': visit.to_dict(),
            'message': 'Patient registered successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@opd_bp.route('/visits/<int:visit_id>/arrival', methods=['POST'])
@token_required
@role_required(['Receptionist', 'Nurse', 'System Administrator'])
def mark_arrival(visit_id):
    """Mark patient arrival for booked visits."""
    try:
        visit = OPDVisit.query.get_or_404(visit_id)
        visit.arrived_at = datetime.utcnow()
        if visit.workflow_status == 'booked':
            visit.workflow_status = 'arrived'
        db.session.commit()
        return jsonify({'success': True, 'visit': visit.to_dict(), 'message': 'Patient marked as arrived'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@opd_bp.route('/visits/<int:visit_id>/verify', methods=['POST'])
@token_required
@role_required(['Receptionist', 'Nurse', 'System Administrator'])
def verify_registration(visit_id):
    """Verify patient identity/insurance and collect registration payment."""
    try:
        visit = OPDVisit.query.get_or_404(visit_id)
        data = request.get_json() or {}
        visit.registration_verified = True
        visit.verification_notes = data.get('verification_notes')
        visit.verified_by = request.current_user.id
        visit.verified_at = datetime.utcnow()
        visit.registration_fee_paid = bool(data.get('registration_fee_paid', visit.registration_fee_paid))
        visit.registration_fee_amount = float(data.get('registration_fee_amount', visit.registration_fee_amount or 0))
        visit.workflow_status = 'registered'
        db.session.commit()
        return jsonify({'success': True, 'visit': visit.to_dict(), 'message': 'Registration verified'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Step 2: Triage and Vitals
@opd_bp.route('/visits/<int:visit_id>/triage', methods=['POST'])
@token_required
@role_required(['Nurse', 'Physician', 'System Administrator'])
def triage_patient(visit_id):
    """Perform triage assessment and record vitals"""
    try:
        visit = OPDVisit.query.get_or_404(visit_id)
        data = request.get_json()
        
        # Update triage information
        visit.triage_priority = data.get('priority', 'normal')
        visit.triage_notes = data.get('notes', '')
        visit.triaged_by = request.current_user.id
        visit.triaged_at = datetime.utcnow()
        visit.workflow_status = 'triaged'
        
        # Record vital signs
        vitals_data = data.get('vitals', {})
        if vitals_data:
            vital_signs = VitalSigns(
                patient_id=visit.patient_id,
                systolic_bp=vitals_data.get('systolic_bp'),
                diastolic_bp=vitals_data.get('diastolic_bp'),
                heart_rate=vitals_data.get('heart_rate'),
                respiratory_rate=vitals_data.get('respiratory_rate'),
                temperature=vitals_data.get('temperature'),
                oxygen_saturation=vitals_data.get('oxygen_saturation'),
                height=vitals_data.get('height'),
                weight=vitals_data.get('weight'),
                recorded_at=datetime.utcnow()
            )
            db.session.add(vital_signs)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'visit': visit.to_dict(),
            'message': 'Triage completed successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Step 3: Assign to Provider and Add to Queue
@opd_bp.route('/visits/<int:visit_id>/assign', methods=['POST'])
@token_required
@role_required(['Receptionist', 'Nurse', 'System Administrator'])
def assign_to_provider(visit_id):
    """Assign patient to a provider and add to queue"""
    try:
        visit = OPDVisit.query.get_or_404(visit_id)
        data = request.get_json()
        
        provider_id = data.get('provider_id')
        clinic_name = data.get('clinic_name', '')
        
        if not provider_id:
            return jsonify({'error': 'Provider ID required'}), 400
        
        # Update visit
        visit.assigned_provider_id = provider_id
        visit.assigned_clinic = clinic_name
        visit.workflow_status = 'in_queue'
        
        # Get current queue position for this provider/clinic
        max_position = db.session.query(db.func.max(OPDQueue.queue_position)).filter(
            OPDQueue.provider_id == provider_id,
            OPDQueue.status == 'waiting'
        ).scalar() or 0
        
        queue_number = f"Q{visit.registration_token[-4:]}"
        
        # Create queue entry
        queue_entry = OPDQueue(
            visit_id=visit.id,
            facility_id=visit.facility_id,
            provider_id=provider_id,
            clinic_name=clinic_name,
            queue_number=queue_number,
            queue_position=max_position + 1,
            priority=visit.triage_priority or 'normal',
            status='waiting'
        )
        
        visit.queue_position = max_position + 1
        visit.queue_number = queue_number
        
        db.session.add(queue_entry)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'visit': visit.to_dict(),
            'queue': queue_entry.to_dict(),
            'message': 'Patient assigned to provider and added to queue'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Step 4: Get Queue
@opd_bp.route('/queue', methods=['GET'])
@token_required
def get_queue():
    """Get OPD queue for a provider or clinic"""
    try:
        provider_id = request.args.get('provider_id', type=int)
        clinic_name = request.args.get('clinic_name')
        facility_id = request.token_payload.get('facility_id')
        status = request.args.get('status', 'waiting')
        
        query = OPDQueue.query.filter(OPDQueue.facility_id == facility_id)
        
        if provider_id:
            query = query.filter(OPDQueue.provider_id == provider_id)
        if clinic_name:
            query = query.filter(OPDQueue.clinic_name == clinic_name)
        if status:
            query = query.filter(OPDQueue.status == status)
        
        queue_items = query.order_by(
            OPDQueue.priority.desc(),
            OPDQueue.queue_position.asc()
        ).all()
        
        # Include patient information
        queue_data = []
        for item in queue_items:
            queue_dict = item.to_dict()
            visit = OPDVisit.query.get(item.visit_id)
            if visit:
                patient = Patient.query.get(visit.patient_id)
                queue_dict['patient'] = {
                    'id': patient.id,
                    'name': f"{patient.first_name} {patient.last_name}",
                    'mrn': patient.universal_patient_id,
                    'chief_complaint': visit.chief_complaint
                } if patient else None
                queue_dict['visit'] = visit.to_dict()
            queue_data.append(queue_dict)
        
        return jsonify({
            'success': True,
            'queue': queue_data,
            'total': len(queue_data)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@opd_bp.route('/departments', methods=['GET'])
@token_required
def get_departments():
    """Get OPD departments represented in current visits."""
    try:
        facility_id = request.token_payload.get('facility_id')
        rows = db.session.query(OPDVisit.department).filter(
            OPDVisit.facility_id == facility_id,
            OPDVisit.department.isnot(None)
        ).distinct().all()
        departments = [row[0] for row in rows if row[0]]
        if not departments:
            departments = ['General Medicine', 'Pediatrics', 'Orthopedics', 'Cardiology']
        return jsonify({'success': True, 'departments': departments}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@opd_bp.route('/stats', methods=['GET'])
@token_required
def get_opd_stats():
    """Get OPD summary stats for the current facility."""
    try:
        facility_id = request.token_payload.get('facility_id')
        today_start = datetime.combine(date.today(), datetime.min.time())
        visits_today = OPDVisit.query.filter(
            OPDVisit.facility_id == facility_id,
            OPDVisit.visit_date >= today_start
        ).all()
        waiting = len([v for v in visits_today if v.workflow_status in ['registered', 'triaged', 'in_queue']])
        in_progress = len([v for v in visits_today if v.workflow_status in ['in_consultation', 'investigations_ordered']])
        completed = len([v for v in visits_today if v.workflow_status in ['billing_completed', 'discharged']])
        avg_wait_time = 0
        wait_samples = []
        for visit in visits_today:
            if visit.called_at and visit.visit_date:
                wait_samples.append((visit.called_at - visit.visit_date).total_seconds() / 60)
        if wait_samples:
            avg_wait_time = round(sum(wait_samples) / len(wait_samples), 1)

        return jsonify({
            'success': True,
            'stats': {
                'waiting': waiting,
                'inProgress': in_progress,
                'completed': completed,
                'avgWaitTime': avg_wait_time
            }
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Step 5: Call Patient for Consultation
@opd_bp.route('/queue/<int:queue_id>/call', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'System Administrator'])
def call_patient(queue_id):
    """Call patient from queue for consultation"""
    try:
        queue_entry = OPDQueue.query.get_or_404(queue_id)
        visit = OPDVisit.query.get(queue_entry.visit_id)
        
        if not visit:
            return jsonify({'error': 'Visit not found'}), 404
        
        # Update queue status
        queue_entry.status = 'called'
        queue_entry.called_at = datetime.utcnow()
        
        # Update visit status
        visit.workflow_status = 'in_consultation'
        visit.called_at = datetime.utcnow()
        visit.consultation_started_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'queue': queue_entry.to_dict(),
            'visit': visit.to_dict(),
            'message': 'Patient called for consultation'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Step 6: Start Consultation (Create Encounter)
@opd_bp.route('/visits/<int:visit_id>/consultation/start', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'System Administrator'])
def start_consultation(visit_id):
    """Start consultation and create clinical encounter"""
    try:
        visit = OPDVisit.query.get_or_404(visit_id)
        data = request.get_json()
        
        # Create clinical encounter
        encounter = ClinicalEncounter(
            encounter_id=f"ENC-{uuid.uuid4().hex[:8].upper()}",
            patient_id=visit.patient_id,
            provider_id=visit.assigned_provider_id,
            facility_id=visit.facility_id,
            encounter_type='office_visit',
            encounter_date=datetime.utcnow(),
            encounter_status='in_progress',
            chief_complaint=visit.chief_complaint or data.get('chief_complaint', ''),
            visit_reason=data.get('visit_reason', 'OPD Walk-in')
        )
        
        db.session.add(encounter)
        db.session.flush()
        
        # Link encounter to visit
        visit.encounter_id = encounter.id
        visit.workflow_status = 'in_consultation'
        visit.consultation_started_at = datetime.utcnow()
        
        # Update queue
        queue_entry = OPDQueue.query.filter_by(visit_id=visit.id).first()
        if queue_entry:
            queue_entry.status = 'in_consultation'
            queue_entry.consultation_started_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'encounter': encounter.to_dict(),
            'visit': visit.to_dict(),
            'message': 'Consultation started'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Step 7: Complete Consultation
@opd_bp.route('/visits/<int:visit_id>/consultation/complete', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'System Administrator'])
def complete_consultation(visit_id):
    """Complete consultation and update encounter"""
    try:
        visit = OPDVisit.query.get_or_404(visit_id)
        data = request.get_json()
        
        if not visit.encounter_id:
            return jsonify({'error': 'No encounter found for this visit'}), 400
        
        encounter = ClinicalEncounter.query.get(visit.encounter_id)
        if not encounter:
            return jsonify({'error': 'Encounter not found'}), 404
        
        # Update encounter
        encounter.encounter_status = 'completed'
        encounter.assessment = data.get('diagnosis') or data.get('assessment')
        encounter.diagnosis = data.get('diagnosis')
        encounter.plan = data.get('treatment_plan') or data.get('plan')
        encounter.treatment_plan = data.get('treatment_plan')
        encounter.notes = data.get('notes')
        encounter.follow_up_required = data.get('follow_up_required', False)
        if data.get('follow_up_date'):
            encounter.follow_up_date = datetime.strptime(data['follow_up_date'], '%Y-%m-%d').date()
        
        # Check if investigations are ordered
        investigations_ordered = data.get('investigations_ordered', False)
        visit.investigations_ordered = investigations_ordered
        
        if investigations_ordered:
            visit.workflow_status = 'investigations_ordered'
            visit.investigation_payment_pending = data.get('investigation_payment_pending', True)
        else:
            visit.workflow_status = 'review_completed'
        
        visit.consultation_completed_at = datetime.utcnow()
        
        # Update queue
        queue_entry = OPDQueue.query.filter_by(visit_id=visit.id).first()
        if queue_entry:
            queue_entry.status = 'completed'
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'encounter': encounter.to_dict(),
            'visit': visit.to_dict(),
            'message': 'Consultation completed'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Step 8: Mark Investigations Complete
@opd_bp.route('/visits/<int:visit_id>/investigations/complete', methods=['POST'])
@token_required
@role_required(['Nurse', 'Physician', 'System Administrator'])
def complete_investigations(visit_id):
    """Mark investigations as completed"""
    try:
        visit = OPDVisit.query.get_or_404(visit_id)
        
        visit.investigations_completed = True
        visit.workflow_status = 'investigations_completed'
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'visit': visit.to_dict(),
            'message': 'Investigations marked as completed'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@opd_bp.route('/visits/<int:visit_id>/review', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'System Administrator'])
def complete_review(visit_id):
    """Complete post-investigation review/follow-up consultation."""
    try:
        visit = OPDVisit.query.get_or_404(visit_id)
        data = request.get_json() or {}
        visit.review_completed = True
        visit.workflow_status = 'review_completed'
        visit.follow_up_required = data.get('follow_up_required', visit.follow_up_required)
        if data.get('follow_up_date'):
            visit.follow_up_date = datetime.strptime(data['follow_up_date'], '%Y-%m-%d').date()
        db.session.commit()
        return jsonify({'success': True, 'visit': visit.to_dict(), 'message': 'Review completed'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@opd_bp.route('/visits/<int:visit_id>/pharmacy/complete', methods=['POST'])
@token_required
@role_required(['Pharmacist', 'System Administrator'])
def complete_pharmacy(visit_id):
    """Mark OPD medication dispensing step as completed."""
    try:
        visit = OPDVisit.query.get_or_404(visit_id)
        visit.pharmacy_completed = True
        visit.pharmacy_completed_at = datetime.utcnow()
        visit.workflow_status = 'pharmacy_completed'
        db.session.commit()
        return jsonify({'success': True, 'visit': visit.to_dict(), 'message': 'Pharmacy step completed'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@opd_bp.route('/visits/<int:visit_id>/billing/settle', methods=['POST'])
@token_required
@role_required(['Receptionist', 'Billing', 'System Administrator'])
def settle_billing(visit_id):
    """Mark OPD billing settlement as completed."""
    try:
        visit = OPDVisit.query.get_or_404(visit_id)
        data = request.get_json() or {}
        visit.billing_completed = True
        visit.billing_completed_at = datetime.utcnow()
        visit.total_billing_amount = float(data.get('total_amount', visit.total_billing_amount or 0))
        visit.workflow_status = 'billing_completed'
        db.session.commit()
        return jsonify({'success': True, 'visit': visit.to_dict(), 'message': 'Billing completed'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Step 9: Discharge Patient
@opd_bp.route('/visits/<int:visit_id>/discharge', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse Practitioner', 'System Administrator'])
def discharge_patient(visit_id):
    """Discharge patient from OPD"""
    try:
        visit = OPDVisit.query.get_or_404(visit_id)
        data = request.get_json() or {}

        missing_steps = []
        if not visit.review_completed:
            missing_steps.append('review_completed')
        if not visit.pharmacy_completed:
            missing_steps.append('pharmacy_completed')
        if not visit.billing_completed:
            missing_steps.append('billing_completed')
        if missing_steps:
            return jsonify({
                'success': False,
                'error': 'Visit cannot be discharged until all mandatory outpatient steps are completed',
                'missing_steps': missing_steps,
                'workflow_status': visit.workflow_status,
                'step_progress': _build_step_progress(visit)
            }), 409
        
        visit.workflow_status = 'discharged'
        visit.discharged_at = datetime.utcnow()
        visit.discharge_notes = data.get('discharge_notes', '')
        visit.follow_up_required = data.get('follow_up_required', False)
        visit.visit_summary = data.get('visit_summary', visit.visit_summary)
        if data.get('follow_up_date'):
            visit.follow_up_date = datetime.strptime(data['follow_up_date'], '%Y-%m-%d').date()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'visit': visit.to_dict(),
            'step_progress': _build_step_progress(visit),
            'message': 'Patient discharged successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Get Visit Details
@opd_bp.route('/visits/<int:visit_id>', methods=['GET'])
@token_required
def get_visit(visit_id):
    """Get OPD visit details"""
    try:
        visit = OPDVisit.query.get_or_404(visit_id)
        patient = Patient.query.get(visit.patient_id)
        
        visit_dict = visit.to_dict()
        visit_dict['patient'] = patient.to_dict() if patient else None
        
        if visit.encounter_id:
            encounter = ClinicalEncounter.query.get(visit.encounter_id)
            visit_dict['encounter'] = encounter.to_dict() if encounter else None
        
        return jsonify({
            'success': True,
            'visit': visit_dict,
            'step_progress': _build_step_progress(visit)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get Active Visits
@opd_bp.route('/visits', methods=['GET'])
@token_required
def get_visits():
    """Get OPD visits with filtering"""
    try:
        facility_id = request.token_payload.get('facility_id')
        status = request.args.get('status')
        patient_id = request.args.get('patient_id', type=int)
        
        query = OPDVisit.query.filter(OPDVisit.facility_id == facility_id)
        
        if status:
            query = query.filter(OPDVisit.workflow_status == status)
        if patient_id:
            query = query.filter(OPDVisit.patient_id == patient_id)
        
        visits = query.order_by(OPDVisit.visit_date.desc()).limit(100).all()
        
        return jsonify({
            'success': True,
            'visits': [
                {
                    **v.to_dict(),
                    'step_progress': _build_step_progress(v)
                }
                for v in visits
            ],
            'total': len(visits)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

















