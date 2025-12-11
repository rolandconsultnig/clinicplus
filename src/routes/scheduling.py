"""
Scheduling & Queue System API Routes
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.auth.tenant_middleware import tenant_isolation_required, facility_data_filter
from src.models.user import db
from src.models.scheduling import Appointment, QueueEntry, ProviderSchedule
from src.models.patient import Patient
from src.models.provider import Provider
from src.models.auth import AuditLog
from datetime import datetime, date, time, timedelta
import uuid
from src.services.notification_service import notification_service

scheduling_bp = Blueprint('scheduling', __name__)

@scheduling_bp.route('/appointments', methods=['GET'])
@token_required
@tenant_isolation_required
def get_appointments():
    """Get appointments with filtering"""
    try:
        # Query parameters
        patient_id = request.args.get('patient_id', type=int)
        provider_id = request.args.get('provider_id', type=int)
        facility_id = request.args.get('facility_id', type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        status = request.args.get('status')
        
        query = Appointment.query
        
        # Apply filters
        if patient_id:
            query = query.filter(Appointment.patient_id == patient_id)
        if provider_id:
            query = query.filter(Appointment.provider_id == provider_id)
        if facility_id:
            query = query.filter(Appointment.facility_id == facility_id)
        if start_date:
            query = query.filter(Appointment.appointment_date >= date.fromisoformat(start_date))
        if end_date:
            query = query.filter(Appointment.appointment_date <= date.fromisoformat(end_date))
        if status:
            query = query.filter(Appointment.status == status)
        
        appointments = query.order_by(Appointment.appointment_date, Appointment.appointment_time).all()
        
        return jsonify({
            'success': True,
            'appointments': [apt.to_dict() for apt in appointments],
            'total': len(appointments)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@scheduling_bp.route('/appointments', methods=['POST'])
@token_required
@role_required(['physician', 'nurse', 'admin', 'scheduler', 'patient'])
def create_appointment():
    """Create a new appointment"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['patient_id', 'provider_id', 'facility_id', 'appointment_date', 'appointment_time']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Create appointment
        appointment = Appointment(
            appointment_id=f"APT-{uuid.uuid4().hex[:12].upper()}",
            patient_id=data['patient_id'],
            provider_id=data['provider_id'],
            facility_id=data['facility_id'],
            appointment_type=data.get('appointment_type', 'consultation'),
            appointment_date=date.fromisoformat(data['appointment_date']),
            appointment_time=time.fromisoformat(data['appointment_time']),
            duration_minutes=data.get('duration_minutes', 30),
            priority=data.get('priority', 'routine'),
            reason_for_visit=data.get('reason_for_visit'),
            is_recurring=data.get('is_recurring', False),
            recurrence_pattern=data.get('recurrence_pattern'),
            created_by=request.current_user.id
        )
        
        if data.get('recurrence_end_date'):
            appointment.recurrence_end_date = date.fromisoformat(data['recurrence_end_date'])
        
        db.session.add(appointment)
        db.session.flush()
        
        # Send appointment confirmation reminders
        try:
            patient = Patient.query.get(appointment.patient_id)
            if patient:
                reminder_results = notification_service.send_appointment_reminder(appointment, patient)
                appointment.reminder_sent_sms = reminder_results.get('sms', {}).get('success', False)
                appointment.reminder_sent_email = reminder_results.get('email', {}).get('success', False)
                if appointment.reminder_sent_sms or appointment.reminder_sent_email:
                    appointment.reminder_sent_at = datetime.utcnow()
        except Exception as e:
            # Log error but don't fail appointment creation
            print(f"Reminder sending failed: {e}")
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'appointment': appointment.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@scheduling_bp.route('/appointments/<int:appointment_id>', methods=['GET'])
@token_required
@tenant_isolation_required
def get_appointment(appointment_id):
    """Get a specific appointment"""
    try:
        appointment = Appointment.query.get_or_404(appointment_id)
        return jsonify({
            'success': True,
            'appointment': appointment.to_dict()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@scheduling_bp.route('/appointments/<int:appointment_id>', methods=['PUT'])
@token_required
@role_required(['physician', 'nurse', 'admin', 'scheduler'])
def update_appointment(appointment_id):
    """Update an appointment"""
    try:
        appointment = Appointment.query.get_or_404(appointment_id)
        data = request.get_json()
        
        # Update fields
        if 'appointment_date' in data:
            appointment.appointment_date = date.fromisoformat(data['appointment_date'])
        if 'appointment_time' in data:
            appointment.appointment_time = time.fromisoformat(data['appointment_time'])
        if 'status' in data:
            appointment.status = data['status']
            if data['status'] == 'checked_in':
                appointment.checked_in_at = datetime.utcnow()
                appointment.checked_in_by = request.current_user.id
            elif data['status'] == 'cancelled':
                appointment.cancelled_at = datetime.utcnow()
                appointment.cancelled_by = request.current_user.id
                appointment.cancellation_reason = data.get('cancellation_reason')
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'appointment': appointment.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@scheduling_bp.route('/queue', methods=['GET'])
@token_required
@tenant_isolation_required
def get_queue():
    """Get current queue entries"""
    try:
        facility_id = request.args.get('facility_id', type=int)
        status = request.args.get('status', 'waiting')
        
        query = QueueEntry.query.filter(QueueEntry.status == status)
        
        if facility_id:
            query = query.filter(QueueEntry.facility_id == facility_id)
        
        queue_entries = query.order_by(QueueEntry.priority.desc(), QueueEntry.position).all()
        
        return jsonify({
            'success': True,
            'queue': [entry.to_dict() for entry in queue_entries],
            'total': len(queue_entries)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@scheduling_bp.route('/queue', methods=['POST'])
@token_required
@role_required(['physician', 'nurse', 'admin', 'receptionist'])
def add_to_queue():
    """Add patient to queue"""
    try:
        data = request.get_json()
        
        # Get current max position
        facility_id = data['facility_id']
        max_position = db.session.query(db.func.max(QueueEntry.position)).filter(
            QueueEntry.facility_id == facility_id,
            QueueEntry.status == 'waiting'
        ).scalar() or 0
        
        queue_entry = QueueEntry(
            queue_id=f"QUE-{uuid.uuid4().hex[:12].upper()}",
            patient_id=data['patient_id'],
            appointment_id=data.get('appointment_id'),
            facility_id=facility_id,
            queue_type=data.get('queue_type', 'walk_in'),
            priority=data.get('priority', 0),
            position=max_position + 1
        )
        
        db.session.add(queue_entry)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'queue_entry': queue_entry.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@scheduling_bp.route('/queue/<int:queue_id>/call', methods=['POST'])
@token_required
@role_required(['physician', 'nurse', 'admin', 'receptionist'])
def call_patient(queue_id):
    """Call next patient from queue"""
    try:
        queue_entry = QueueEntry.query.get_or_404(queue_id)
        queue_entry.status = 'called'
        queue_entry.called_at = datetime.utcnow()
        queue_entry.assigned_provider_id = request.args.get('provider_id', type=int)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'queue_entry': queue_entry.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@scheduling_bp.route('/providers/<int:provider_id>/schedule', methods=['GET'])
@token_required
def get_provider_schedule(provider_id):
    """Get provider's schedule"""
    try:
        facility_id = request.args.get('facility_id', type=int)
        query = ProviderSchedule.query.filter(ProviderSchedule.provider_id == provider_id)
        
        if facility_id:
            query = query.filter(ProviderSchedule.facility_id == facility_id)
        
        schedules = query.all()
        
        return jsonify({
            'success': True,
            'schedules': [s.to_dict() for s in schedules]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@scheduling_bp.route('/providers/<int:provider_id>/schedule', methods=['POST'])
@token_required
@role_required(['physician', 'admin'])
def create_provider_schedule(provider_id):
    """Create or update provider schedule"""
    try:
        data = request.get_json()
        
        schedule = ProviderSchedule(
            provider_id=provider_id,
            facility_id=data['facility_id'],
            day_of_week=data['day_of_week'],
            start_time=time.fromisoformat(data['start_time']),
            end_time=time.fromisoformat(data['end_time']),
            appointment_duration=data.get('appointment_duration', 30),
            effective_from=date.fromisoformat(data['effective_from']),
            is_available=data.get('is_available', True)
        )
        
        if data.get('effective_to'):
            schedule.effective_to = date.fromisoformat(data['effective_to'])
        if data.get('break_times'):
            schedule.break_times = str(data['break_times'])
        
        db.session.add(schedule)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'schedule': schedule.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@scheduling_bp.route('/appointments/send-reminders', methods=['POST'])
@token_required
@role_required(['admin', 'scheduler'])
def send_appointment_reminders():
    """Send reminders for upcoming appointments"""
    try:
        hours_ahead = request.json.get('hours_ahead', 24)  # Default 24 hours
        appointment_date = date.today()
        
        # Find appointments in the next N hours
        appointments = Appointment.query.filter(
            Appointment.appointment_date == appointment_date,
            Appointment.status.in_(['scheduled', 'confirmed']),
            Appointment.reminder_sent_at.is_(None)
        ).all()
        
        sent_count = 0
        failed_count = 0
        
        for appointment in appointments:
            try:
                patient = Patient.query.get(appointment.patient_id)
                if patient:
                    reminder_results = notification_service.send_appointment_reminder(appointment, patient)
                    
                    appointment.reminder_sent_sms = reminder_results.get('sms', {}).get('success', False)
                    appointment.reminder_sent_email = reminder_results.get('email', {}).get('success', False)
                    
                    if appointment.reminder_sent_sms or appointment.reminder_sent_email:
                        appointment.reminder_sent_at = datetime.utcnow()
                        sent_count += 1
                    else:
                        failed_count += 1
            except Exception as e:
                failed_count += 1
                print(f"Failed to send reminder for appointment {appointment.id}: {e}")
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'reminders_sent': sent_count,
            'reminders_failed': failed_count,
            'total_appointments': len(appointments)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@scheduling_bp.route('/appointments/<int:appointment_id>/check-in', methods=['POST'])
@token_required
def check_in_appointment(appointment_id):
    """Check in patient for appointment"""
    try:
        appointment = Appointment.query.get_or_404(appointment_id)
        appointment.status = 'checked_in'
        appointment.checked_in_at = datetime.utcnow()
        appointment.checked_in_by = request.current_user.id
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'appointment': appointment.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@scheduling_bp.route('/available-slots', methods=['GET'])
@token_required
def get_available_slots():
    """Get available appointment slots for a provider on a specific date"""
    try:
        provider_id = request.args.get('provider_id', type=int)
        facility_id = request.args.get('facility_id', type=int)
        slot_date = request.args.get('date')
        
        if not provider_id or not slot_date:
            return jsonify({'error': 'provider_id and date are required'}), 400
        
        try:
            slot_date_obj = date.fromisoformat(slot_date)
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        # Get provider schedule
        provider_schedule = ProviderSchedule.query.filter_by(
            provider_id=provider_id,
            facility_id=facility_id if facility_id else None,
            day_of_week=slot_date_obj.weekday()
        ).first()
        
        if not provider_schedule:
            # Default schedule: 9 AM to 5 PM, 30-minute slots
            start_time = time(9, 0)
            end_time = time(17, 0)
            slot_duration = timedelta(minutes=30)
        else:
            start_time = provider_schedule.start_time
            end_time = provider_schedule.end_time
            slot_duration = timedelta(minutes=provider_schedule.slot_duration_minutes or 30)
        
        # Get existing appointments for this provider on this date
        existing_appointments = Appointment.query.filter_by(
            provider_id=provider_id,
            appointment_date=slot_date_obj
        ).filter(
            Appointment.status.in_(['scheduled', 'confirmed', 'checked_in'])
        ).all()
        
        booked_times = set()
        for apt in existing_appointments:
            booked_times.add(apt.appointment_time.strftime('%H:%M'))
            # Also mark duration slots as booked
            apt_duration = timedelta(minutes=apt.duration_minutes or 30)
            current_time = datetime.combine(slot_date_obj, apt.appointment_time)
            end_apt_time = current_time + apt_duration
            while current_time < end_apt_time:
                booked_times.add(current_time.time().strftime('%H:%M'))
                current_time += slot_duration
        
        # Generate available slots
        available_slots = []
        current_time = datetime.combine(slot_date_obj, start_time)
        end_datetime = datetime.combine(slot_date_obj, end_time)
        
        while current_time < end_datetime:
            time_str = current_time.time().strftime('%H:%M')
            if time_str not in booked_times:
                available_slots.append({
                    'time': time_str,
                    'available': True
                })
            current_time += slot_duration
        
        return jsonify({
            'success': True,
            'slots': available_slots,
            'date': slot_date,
            'provider_id': provider_id,
            'total_slots': len(available_slots)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

