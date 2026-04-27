"""
Receptionist Routes
Handles all receptionist-specific operations including patient registration,
appointment management, billing, and queue management
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.patient import Patient
from src.models.opd import OPDVisit, OPDQueue
from src.models.scheduling import Appointment
from src.models.clinical import ClinicalEncounter, VitalSigns
from src.models.provider import Provider
from src.models.billing import Charge, Payment
from datetime import datetime, date, time, timedelta
import uuid

receptionist_bp = Blueprint('receptionist', __name__)

# Dashboard Statistics
@receptionist_bp.route('/stats', methods=['GET'])
@token_required
@role_required(['Receptionist', 'System Administrator'])
def get_dashboard_stats():
    """Get receptionist dashboard statistics"""
    try:
        facility_id = request.token_payload.get('facility_id')
        today = date.today()
        
        # Today's registrations
        today_registrations = OPDVisit.query.filter(
            OPDVisit.facility_id == facility_id,
            db.func.date(OPDVisit.visit_date) == today
        ).count()
        
        # Waiting patients
        waiting_patients = OPDQueue.query.filter(
            OPDQueue.facility_id == facility_id,
            OPDQueue.status == 'waiting'
        ).count()
        
        # Total collections from completed payments for today
        total_collections = db.session.query(
            db.func.coalesce(db.func.sum(Payment.payment_amount), 0)
        ).filter(
            Payment.facility_id == facility_id,
            Payment.payment_date == today,
            Payment.status == 'completed'
        ).scalar() or 0

        # Average wait time from active queue entries
        waiting_entries = OPDQueue.query.filter(
            OPDQueue.facility_id == facility_id,
            OPDQueue.status == 'waiting'
        ).all()
        avg_wait_time = 0
        if waiting_entries:
            now = datetime.utcnow()
            wait_values = []
            for entry in waiting_entries:
                if entry.created_at:
                    wait_values.append(max(0, int((now - entry.created_at).total_seconds() / 60)))
            avg_wait_time = int(sum(wait_values) / len(wait_values)) if wait_values else 0
        
        return jsonify({
            'success': True,
            'stats': {
                'todayRegistrations': today_registrations,
                'waitingPatients': waiting_patients,
                'totalCollections': float(total_collections),
                'avgWaitTime': avg_wait_time
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Overview Data
@receptionist_bp.route('/overview', methods=['GET'])
@token_required
@role_required(['Receptionist', 'System Administrator'])
def get_overview():
    """Get overview data for receptionist dashboard"""
    try:
        facility_id = request.token_payload.get('facility_id')
        today = date.today()
        
        # Today's appointments
        appointments = Appointment.query.filter(
            Appointment.facility_id == facility_id,
            Appointment.appointment_date == today
        ).order_by(Appointment.appointment_time).all()
        
        appointments_data = []
        for apt in appointments:
            patient = Patient.query.get(apt.patient_id)
            if patient:
                appointments_data.append({
                    'id': apt.id,
                    'patient_name': f"{patient.first_name} {patient.last_name}",
                    'appointment_time': apt.appointment_time.strftime('%H:%M') if apt.appointment_time else '',
                    'status': apt.status,
                    'mrn': patient.universal_patient_id
                })
        
        # Recent registrations
        recent_visits = OPDVisit.query.filter(
            OPDVisit.facility_id == facility_id,
            db.func.date(OPDVisit.visit_date) == today
        ).order_by(OPDVisit.created_at.desc()).limit(10).all()
        
        registrations_data = []
        for visit in recent_visits:
            patient = Patient.query.get(visit.patient_id)
            if patient:
                time_diff = datetime.utcnow() - visit.created_at
                minutes_ago = int(time_diff.total_seconds() / 60)
                time_ago = f"{minutes_ago} min ago" if minutes_ago < 60 else f"{int(minutes_ago/60)} hr ago"
                
                registrations_data.append({
                    'patient_name': f"{patient.first_name} {patient.last_name}",
                    'mrn': patient.universal_patient_id,
                    'time_ago': time_ago
                })
        
        return jsonify({
            'success': True,
            'appointments': appointments_data,
            'registrations': registrations_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Register New Patient
@receptionist_bp.route('/register-patient', methods=['POST'])
@token_required
@role_required(['Receptionist', 'System Administrator'])
def register_patient():
    """Register a new walk-in patient"""
    try:
        data = request.get_json()
        facility_id = request.token_payload.get('facility_id')
        user_id = request.current_user.id
        
        # Generate unique MRN
        mrn = f"MRN-{uuid.uuid4().hex[:8].upper()}"
        
        # Create patient record
        patient = Patient(
            universal_patient_id=mrn,
            first_name=data.get('first_name'),
            last_name=data.get('last_name'),
            middle_name=data.get('middle_name'),
            date_of_birth=datetime.strptime(data.get('date_of_birth'), '%Y-%m-%d').date(),
            gender=data.get('gender'),
            nin=data.get('nin'),
            phone_primary=data.get('phone_primary'),
            phone_secondary=data.get('phone_secondary'),
            email=data.get('email'),
            address_line1=data.get('address_line1'),
            address_line2=data.get('address_line2'),
            city=data.get('city'),
            state=data.get('state'),
            zip_code=data.get('zip_code'),
            emergency_contact_name=data.get('emergency_contact_name'),
            emergency_contact_phone=data.get('emergency_contact_phone'),
            emergency_contact_relationship=data.get('emergency_contact_relationship'),
            insurance_provider=data.get('insurance_provider'),
            insurance_policy_number=data.get('insurance_policy_number'),
            insurance_group_number=data.get('insurance_group_number'),
            facility_id=facility_id,
            created_by=user_id,
            is_active=True
        )
        
        db.session.add(patient)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'patient': patient.to_dict(),
            'message': 'Patient registered successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Search Patient
@receptionist_bp.route('/search-patient', methods=['GET'])
@token_required
@role_required(['Receptionist', 'System Administrator'])
def search_patient():
    """Search for existing patients"""
    try:
        search_type = request.args.get('type', 'mrn')
        query = request.args.get('query', '')
        
        if not query:
            return jsonify({'error': 'Search query required'}), 400
        
        patients = []
        
        if search_type == 'mrn':
            patients = Patient.query.filter(
                Patient.universal_patient_id.ilike(f"%{query}%")
            ).limit(20).all()
        elif search_type == 'name':
            patients = Patient.query.filter(
                db.or_(
                    Patient.first_name.ilike(f"%{query}%"),
                    Patient.last_name.ilike(f"%{query}%")
                )
            ).limit(20).all()
        elif search_type == 'phone':
            patients = Patient.query.filter(
                db.or_(
                    Patient.phone_primary.ilike(f"%{query}%"),
                    Patient.phone_secondary.ilike(f"%{query}%")
                )
            ).limit(20).all()
        elif search_type == 'dob':
            try:
                dob = datetime.strptime(query, '%Y-%m-%d').date()
                patients = Patient.query.filter(
                    Patient.date_of_birth == dob
                ).limit(20).all()
            except ValueError:
                return jsonify({'error': 'Invalid date format'}), 400
        
        return jsonify({
            'success': True,
            'patients': [p.to_dict() for p in patients]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Create Visit/Encounter
@receptionist_bp.route('/create-visit', methods=['POST'])
@token_required
@role_required(['Receptionist', 'System Administrator'])
def create_visit():
    """Create a new OPD visit for a patient"""
    try:
        data = request.get_json()
        facility_id = request.token_payload.get('facility_id')
        user_id = request.current_user.id
        
        patient_id = data.get('patient_id')
        if not patient_id:
            return jsonify({'error': 'Patient ID required'}), 400
        
        # Generate visit ID and token
        visit_id = f"OPD-{uuid.uuid4().hex[:8].upper()}"
        token = f"T{datetime.now().strftime('%Y%m%d%H%M%S')[-8:]}"
        
        # Create OPD visit
        visit = OPDVisit(
            visit_id=visit_id,
            patient_id=patient_id,
            facility_id=facility_id,
            visit_type='walk_in',
            chief_complaint=data.get('chief_complaint', ''),
            workflow_status='registered',
            registration_token=token,
            registration_fee_paid=data.get('fee_paid', False),
            registration_fee_amount=data.get('fee_amount', 0.0),
            created_by=user_id
        )
        
        db.session.add(visit)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'visit': visit.to_dict(),
            'message': 'Visit created successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Get Appointments
@receptionist_bp.route('/appointments', methods=['GET'])
@token_required
@role_required(['Receptionist', 'System Administrator'])
def get_appointments():
    """Get appointments for a specific date"""
    try:
        facility_id = request.token_payload.get('facility_id')
        date_str = request.args.get('date', date.today().isoformat())
        
        try:
            appointment_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format'}), 400
        
        appointments = Appointment.query.filter(
            Appointment.facility_id == facility_id,
            Appointment.appointment_date == appointment_date
        ).order_by(Appointment.appointment_time).all()
        
        appointments_data = []
        for apt in appointments:
            patient = Patient.query.get(apt.patient_id)
            provider = Provider.query.get(apt.provider_id)
            
            if patient and provider:
                appointments_data.append({
                    'id': apt.id,
                    'time': apt.appointment_time.strftime('%H:%M') if apt.appointment_time else '',
                    'duration': apt.duration_minutes,
                    'patient_name': f"{patient.first_name} {patient.last_name}",
                    'mrn': patient.universal_patient_id,
                    'provider_name': f"{provider.first_name} {provider.last_name}",
                    'reason': apt.reason_for_visit or '',
                    'status': apt.status
                })
        
        return jsonify({
            'success': True,
            'appointments': appointments_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Check-in Patient
@receptionist_bp.route('/check-in/<int:appointment_id>', methods=['POST'])
@token_required
@role_required(['Receptionist', 'System Administrator'])
def check_in_patient(appointment_id):
    """Check in a patient for their appointment"""
    try:
        appointment = Appointment.query.get_or_404(appointment_id)
        user_id = request.current_user.id
        
        appointment.status = 'checked_in'
        appointment.checked_in_at = datetime.utcnow()
        appointment.checked_in_by = user_id
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Patient checked in successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Generate Bill
@receptionist_bp.route('/generate-bill', methods=['POST'])
@token_required
@role_required(['Receptionist', 'System Administrator'])
def generate_bill():
    """Generate bill and process payment"""
    try:
        data = request.get_json()
        facility_id = request.token_payload.get('facility_id')
        
        patient_id = data.get('patient_id')
        amount = data.get('amount', 0)
        payment_method = data.get('payment_method', 'cash')
        
        if not patient_id or amount <= 0:
            return jsonify({'error': 'Invalid patient or amount'}), 400
        
        patient = Patient.query.get(patient_id)
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404

        receipt_id = f"RCP-{uuid.uuid4().hex[:8].upper()}"
        payment = Payment(
            payment_id=receipt_id,
            patient_id=patient_id,
            facility_id=facility_id,
            payment_date=date.today(),
            payment_method=payment_method,
            payment_amount=amount,
            status='completed',
            reference_number=data.get('reference_number'),
            created_by=request.current_user.id
        )
        db.session.add(payment)
        db.session.flush()

        # Optionally allocate against an existing charge
        charge_id = data.get('charge_id')
        if charge_id:
            charge = Charge.query.get(charge_id)
            if charge and charge.patient_id == patient_id and charge.facility_id == facility_id:
                charge.status = 'paid'

        # Sync OPD registration fee payment if visit is provided
        visit_id = data.get('visit_id')
        if visit_id:
            visit = OPDVisit.query.get(visit_id)
            if visit and visit.patient_id == patient_id and visit.facility_id == facility_id:
                visit.registration_fee_paid = True
                if not visit.registration_fee_amount:
                    visit.registration_fee_amount = amount

        db.session.commit()
        
        return jsonify({
            'success': True,
            'receipt_id': receipt_id,
            'amount': amount,
            'payment_method': payment_method,
            'payment': payment.to_dict(),
            'message': 'Payment processed successfully'
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Get Queue
@receptionist_bp.route('/queue', methods=['GET'])
@token_required
@role_required(['Receptionist', 'System Administrator'])
def get_queue():
    """Get current queue status"""
    try:
        facility_id = request.token_payload.get('facility_id')
        provider_id = request.args.get('provider_id')
        
        query = OPDQueue.query.filter(
            OPDQueue.facility_id == facility_id,
            OPDQueue.status.in_(['waiting', 'in_consultation'])
        )
        
        if provider_id:
            query = query.filter(OPDQueue.provider_id == provider_id)
        
        queue_entries = query.order_by(OPDQueue.queue_position).all()
        
        queue_data = []
        for entry in queue_entries:
            visit = OPDVisit.query.get(entry.visit_id)
            if visit:
                patient = Patient.query.get(visit.patient_id)
                provider = Provider.query.get(entry.provider_id) if entry.provider_id else None
                
                # Calculate wait time
                wait_time = 0
                if entry.created_at:
                    time_diff = datetime.utcnow() - entry.created_at
                    wait_time = int(time_diff.total_seconds() / 60)
                
                queue_data.append({
                    'id': entry.id,
                    'token': entry.queue_number,
                    'patient_name': f"{patient.first_name} {patient.last_name}" if patient else 'Unknown',
                    'mrn': patient.universal_patient_id if patient else '',
                    'provider_name': f"{provider.first_name} {provider.last_name}" if provider else 'Unassigned',
                    'status': entry.status,
                    'wait_time': wait_time
                })
        
        return jsonify({
            'success': True,
            'queue': queue_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Update Queue Status
@receptionist_bp.route('/queue/<int:queue_id>/status', methods=['PUT'])
@token_required
@role_required(['Receptionist', 'System Administrator'])
def update_queue_status(queue_id):
    """Update queue entry status"""
    try:
        data = request.get_json()
        new_status = data.get('status')
        
        if not new_status:
            return jsonify({'error': 'Status required'}), 400
        
        queue_entry = OPDQueue.query.get_or_404(queue_id)
        queue_entry.status = new_status
        
        if new_status == 'in_consultation':
            queue_entry.consultation_started_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Queue status updated'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Get Providers
@receptionist_bp.route('/providers', methods=['GET'])
@token_required
@role_required(['Receptionist', 'System Administrator'])
def get_providers():
    """Get list of providers"""
    try:
        facility_id = request.token_payload.get('facility_id')
        
        providers = Provider.query.filter(
            Provider.facility_id == facility_id,
            Provider.is_active == True
        ).all()
        
        providers_data = [{
            'id': p.id,
            'name': f"{p.first_name} {p.last_name}",
            'specialty': p.specialty or 'General'
        } for p in providers]
        
        return jsonify({
            'success': True,
            'providers': providers_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Generate Reports
@receptionist_bp.route('/reports/<report_type>', methods=['GET'])
@token_required
@role_required(['Receptionist', 'System Administrator'])
def generate_report(report_type):
    """Generate various reports"""
    try:
        facility_id = request.token_payload.get('facility_id')
        start_date_str = request.args.get('start', date.today().isoformat())
        end_date_str = request.args.get('end', date.today().isoformat())
        
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        
        report_data = {}
        date_filter = db.and_(
            db.func.date(OPDVisit.visit_date) >= start_date,
            db.func.date(OPDVisit.visit_date) <= end_date
        )
        payment_date_filter = db.and_(
            Payment.payment_date >= start_date,
            Payment.payment_date <= end_date
        )
        
        if report_type == 'daily':
            total_patients = OPDVisit.query.filter(
                OPDVisit.facility_id == facility_id,
                date_filter
            ).count()
            
            total_collections = db.session.query(
                db.func.coalesce(db.func.sum(Payment.payment_amount), 0)
            ).filter(
                Payment.facility_id == facility_id,
                payment_date_filter,
                Payment.status == 'completed'
            ).scalar() or 0

            no_shows = Appointment.query.filter(
                Appointment.facility_id == facility_id,
                Appointment.appointment_date >= start_date,
                Appointment.appointment_date <= end_date,
                Appointment.status == 'no_show'
            ).count()

            wait_entries = OPDQueue.query.filter(
                OPDQueue.facility_id == facility_id,
                OPDQueue.created_at >= datetime.combine(start_date, datetime.min.time()),
                OPDQueue.created_at <= datetime.combine(end_date, datetime.max.time())
            ).all()
            wait_values = []
            for entry in wait_entries:
                if entry.created_at:
                    end_time = entry.consultation_started_at or datetime.utcnow()
                    wait_values.append(max(0, int((end_time - entry.created_at).total_seconds() / 60)))
            avg_wait = int(sum(wait_values) / len(wait_values)) if wait_values else 0
            
            report_data = {
                'total_patients': total_patients,
                'total_collections': float(total_collections),
                'avg_wait_time': avg_wait,
                'no_shows': no_shows
            }
        
        elif report_type == 'shift':
            now = datetime.utcnow()
            shift_start = datetime.combine(now.date(), datetime.min.time() if now.hour < 12 else time(12, 0))
            shift_end = now
            shift_patients = OPDVisit.query.filter(
                OPDVisit.facility_id == facility_id,
                OPDVisit.created_at >= shift_start,
                OPDVisit.created_at <= shift_end
            ).count()
            shift_collections = db.session.query(
                db.func.coalesce(db.func.sum(Payment.payment_amount), 0)
            ).filter(
                Payment.facility_id == facility_id,
                Payment.created_at >= shift_start,
                Payment.created_at <= shift_end,
                Payment.status == 'completed'
            ).scalar() or 0
            shift_entries = OPDQueue.query.filter(
                OPDQueue.facility_id == facility_id,
                OPDQueue.created_at >= shift_start,
                OPDQueue.created_at <= shift_end
            ).all()
            shift_waits = []
            for entry in shift_entries:
                if entry.created_at:
                    end_time = entry.consultation_started_at or datetime.utcnow()
                    shift_waits.append(max(0, int((end_time - entry.created_at).total_seconds() / 60)))
            report_data = {
                'total_patients': shift_patients,
                'total_collections': float(shift_collections),
                'avg_wait_time': int(sum(shift_waits) / len(shift_waits)) if shift_waits else 0,
                'no_shows': Appointment.query.filter(
                    Appointment.facility_id == facility_id,
                    Appointment.appointment_date == now.date(),
                    Appointment.status == 'no_show'
                ).count()
            }
        
        elif report_type == 'collections':
            total_collections = db.session.query(
                db.func.coalesce(db.func.sum(Payment.payment_amount), 0)
            ).filter(
                Payment.facility_id == facility_id,
                payment_date_filter,
                Payment.status == 'completed'
            ).scalar() or 0

            def _sum_method(method_name):
                return db.session.query(
                    db.func.coalesce(db.func.sum(Payment.payment_amount), 0)
                ).filter(
                    Payment.facility_id == facility_id,
                    payment_date_filter,
                    Payment.status == 'completed',
                    Payment.payment_method == method_name
                ).scalar() or 0

            report_data = {
                'total_patients': OPDVisit.query.filter(OPDVisit.facility_id == facility_id, date_filter).count(),
                'total_collections': float(total_collections),
                'cash_payments': float(_sum_method('cash')),
                'card_payments': float(_sum_method('card')),
                'insurance_payments': float(_sum_method('insurance'))
            }
        
        elif report_type == 'wait_times':
            queue_entries = OPDQueue.query.filter(
                OPDQueue.facility_id == facility_id,
                OPDQueue.created_at >= datetime.combine(start_date, datetime.min.time()),
                OPDQueue.created_at <= datetime.combine(end_date, datetime.max.time())
            ).all()
            waits = []
            for entry in queue_entries:
                if entry.created_at:
                    end_time = entry.consultation_started_at or datetime.utcnow()
                    waits.append(max(0, int((end_time - entry.created_at).total_seconds() / 60)))
            report_data = {
                'avg_wait_time': int(sum(waits) / len(waits)) if waits else 0,
                'min_wait_time': min(waits) if waits else 0,
                'max_wait_time': max(waits) if waits else 0,
                'total_patients': len(waits)
            }
        
        return jsonify({
            'success': True,
            'report': report_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Update Patient Demographics
@receptionist_bp.route('/update-patient/<int:patient_id>', methods=['PUT'])
@token_required
@role_required(['Receptionist', 'System Administrator'])
def update_patient(patient_id):
    """Update patient demographics"""
    try:
        patient = Patient.query.get_or_404(patient_id)
        data = request.get_json()
        
        # Update allowed fields
        if 'phone_primary' in data:
            patient.phone_primary = data['phone_primary']
        if 'phone_secondary' in data:
            patient.phone_secondary = data['phone_secondary']
        if 'email' in data:
            patient.email = data['email']
        if 'address_line1' in data:
            patient.address_line1 = data['address_line1']
        if 'address_line2' in data:
            patient.address_line2 = data['address_line2']
        if 'city' in data:
            patient.city = data['city']
        if 'state' in data:
            patient.state = data['state']
        if 'zip_code' in data:
            patient.zip_code = data['zip_code']
        
        patient.updated_at = datetime.utcnow()
        patient.updated_by = request.current_user.id
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'patient': patient.to_dict(),
            'message': 'Patient updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
