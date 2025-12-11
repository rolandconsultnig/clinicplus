"""
Patient Flow Board Routes - OpenEMR-style patient tracking
Real-time patient flow management with status tracking
"""
from flask import Blueprint, request, jsonify
from src.models.scheduling import Appointment, QueueEntry
from src.models.patient import Patient
from src.models.user import db
from src.auth.jwt_manager import token_required, role_required
from datetime import datetime, date, timedelta
import uuid

flow_board_bp = Blueprint('flow_board', __name__)

@flow_board_bp.route('/statuses', methods=['GET'])
@token_required
def get_statuses():
    """Get available patient flow statuses"""
    statuses = [
        {'value': 'waiting', 'label': 'Waiting', 'color': 'yellow'},
        {'value': 'called', 'label': 'Called', 'color': 'blue'},
        {'value': 'in_progress', 'label': 'In Progress', 'color': 'green'},
        {'value': 'completed', 'label': 'Completed', 'color': 'gray'},
        {'value': 'cancelled', 'label': 'Cancelled', 'color': 'red'},
        {'value': 'no_show', 'label': 'No Show', 'color': 'orange'}
    ]
    return jsonify({'success': True, 'statuses': statuses}), 200

@flow_board_bp.route('/board', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'Receptionist', 'System Administrator'])
def get_flow_board():
    """Get patient flow board data"""
    try:
        facility_id = request.args.get('facility_id', type=int)
        provider_id = request.args.get('provider_id', type=int)
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        
        # Default to today if no dates provided
        if not from_date:
            from_date = date.today()
        else:
            from_date = datetime.fromisoformat(from_date).date() if isinstance(from_date, str) else from_date
        
        if not to_date:
            to_date = from_date
        else:
            to_date = datetime.fromisoformat(to_date).date() if isinstance(to_date, str) else to_date
        
        # Get appointments for date range
        query = Appointment.query.filter(
            Appointment.appointment_date >= from_date,
            Appointment.appointment_date <= to_date
        )
        
        if facility_id:
            query = query.filter_by(facility_id=facility_id)
        
        if provider_id:
            query = query.filter_by(provider_id=provider_id)
        
        appointments = query.all()
        
        # Get queue entries
        queue_query = QueueEntry.query.filter(
            QueueEntry.created_at >= datetime.combine(from_date, datetime.min.time()),
            QueueEntry.created_at <= datetime.combine(to_date, datetime.max.time())
        )
        
        if facility_id:
            queue_query = queue_query.filter_by(facility_id=facility_id)
        
        queue_entries = queue_query.all()
        
        # Organize by status
        board_data = {
            'waiting': [],
            'called': [],
            'in_progress': [],
            'completed': [],
            'cancelled': [],
            'no_show': []
        }
        
        # Process appointments
        for apt in appointments:
            status = apt.status if apt.status in board_data else 'waiting'
            patient = Patient.query.get(apt.patient_id)
            
            board_data[status].append({
                'id': apt.id,
                'type': 'appointment',
                'appointment_id': apt.appointment_id,
                'patient': patient.to_dict() if patient else None,
                'patient_id': apt.patient_id,
                'provider_id': apt.provider_id,
                'appointment_date': apt.appointment_date.isoformat() if apt.appointment_date else None,
                'appointment_time': apt.appointment_time.strftime('%H:%M') if apt.appointment_time else None,
                'status': apt.status,
                'priority': apt.priority,
                'reason_for_visit': apt.reason_for_visit,
                'checked_in_at': apt.checked_in_at.isoformat() if apt.checked_in_at else None
            })
        
        # Process queue entries
        for entry in queue_entries:
            status = entry.status if entry.status in board_data else 'waiting'
            patient = Patient.query.get(entry.patient_id)
            
            board_data[status].append({
                'id': entry.id,
                'type': 'queue',
                'queue_id': entry.queue_id,
                'patient': patient.to_dict() if patient else None,
                'patient_id': entry.patient_id,
                'appointment_id': entry.appointment_id,
                'status': entry.status,
                'priority': entry.priority,
                'position': entry.position,
                'called_at': entry.called_at.isoformat() if entry.called_at else None,
                'started_at': entry.started_at.isoformat() if entry.started_at else None
            })
        
        return jsonify({
            'success': True,
            'board_data': board_data,
            'date_range': {
                'from_date': from_date.isoformat() if isinstance(from_date, date) else from_date,
                'to_date': to_date.isoformat() if isinstance(to_date, date) else to_date
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@flow_board_bp.route('/update-status', methods=['PUT'])
@token_required
@role_required(['Physician', 'Nurse', 'Receptionist', 'System Administrator'])
def update_patient_status():
    """Update patient status in flow board"""
    try:
        data = request.get_json()
        item_type = data.get('type')  # 'appointment' or 'queue'
        item_id = data.get('id')
        new_status = data.get('status')
        
        if item_type == 'appointment':
            appointment = Appointment.query.get_or_404(item_id)
            old_status = appointment.status
            appointment.status = new_status
            
            # Update timestamps based on status
            if new_status == 'checked_in' and old_status != 'checked_in':
                appointment.checked_in_at = datetime.utcnow()
                appointment.checked_in_by = request.current_user.id if hasattr(request, 'current_user') else None
            
            db.session.commit()
            
            return jsonify({'success': True, 'appointment': appointment.to_dict()}), 200
        
        elif item_type == 'queue':
            queue_entry = QueueEntry.query.get_or_404(item_id)
            old_status = queue_entry.status
            queue_entry.status = new_status
            
            # Update timestamps
            if new_status == 'called' and old_status != 'called':
                queue_entry.called_at = datetime.utcnow()
            elif new_status == 'in_progress' and old_status != 'in_progress':
                queue_entry.started_at = datetime.utcnow()
            elif new_status == 'completed':
                queue_entry.completed_at = datetime.utcnow()
            
            db.session.commit()
            
            return jsonify({'success': True, 'queue_entry': {
                'id': queue_entry.id,
                'status': queue_entry.status,
                'called_at': queue_entry.called_at.isoformat() if queue_entry.called_at else None,
                'started_at': queue_entry.started_at.isoformat() if queue_entry.started_at else None
            }}), 200
        
        else:
            return jsonify({'error': 'Invalid item type'}), 400
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@flow_board_bp.route('/room-assignment', methods=['PUT'])
@token_required
@role_required(['Receptionist', 'System Administrator'])
def assign_room():
    """Assign room to patient"""
    try:
        data = request.get_json()
        item_type = data.get('type')
        item_id = data.get('id')
        room = data.get('room')
        
        if item_type == 'appointment':
            appointment = Appointment.query.get_or_404(item_id)
            # Add room field if needed
            if not hasattr(appointment, 'room'):
                # Would need migration to add room field
                pass
            else:
                appointment.room = room
            
            db.session.commit()
            return jsonify({'success': True}), 200
        
        elif item_type == 'queue':
            queue_entry = QueueEntry.query.get_or_404(item_id)
            if not hasattr(queue_entry, 'room'):
                pass
            else:
                queue_entry.room = room
            
            db.session.commit()
            return jsonify({'success': True}), 200
        
        return jsonify({'error': 'Invalid item type'}), 400
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

