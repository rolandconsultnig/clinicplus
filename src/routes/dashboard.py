"""
Dashboard Routes
Provides system-wide dashboard data and pending actions
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from datetime import datetime, timedelta
from sqlalchemy import func
from src.models.billing import Payment
from src.models.opd import OPDQueue

# Import models with error handling
try:
    from src.models.prescribing import Prescription
except ImportError:
    Prescription = None

try:
    from src.models.clinical import LabOrder
except ImportError:
    LabOrder = None

try:
    from src.models.scheduling import Appointment
except ImportError:
    Appointment = None

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/stats', methods=['GET'])
@token_required
def get_admin_stats():
    """Get admin dashboard statistics"""
    try:
        stats = {
            'total_users': 0,
            'total_patients': 0,
            'total_providers': 0,
            'total_appointments': 0,
            'active_encounters': 0
        }
        
        # Try to get counts from database
        try:
            from src.models.auth import UserAccount
            stats['total_users'] = UserAccount.query.count()
        except:
            pass
            
        try:
            from src.models.patient import Patient
            stats['total_patients'] = Patient.query.count()
        except:
            pass
            
        try:
            from src.models.provider import Provider
            stats['total_providers'] = Provider.query.count()
        except:
            pass

        try:
            from src.models.scheduling import Appointment as AppointmentModel
            stats['total_appointments'] = AppointmentModel.query.count()
        except:
            pass

        try:
            from src.models.clinical import ClinicalEncounter
            stats['active_encounters'] = ClinicalEncounter.query.filter(
                ClinicalEncounter.encounter_status.in_(['scheduled', 'in_progress'])
            ).count()
        except:
            pass
        
        return jsonify({
            'success': True,
            'stats': stats
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'stats': {
                'total_users': 0,
                'total_patients': 0,
                'total_providers': 0,
                'total_appointments': 0,
                'active_encounters': 0
            }
        }), 200

@dashboard_bp.route('/pending-actions', methods=['GET'])
@token_required
def get_pending_actions():
    """Get count of pending actions for current user"""
    try:
        user_id = request.current_user.id
        user_type = request.current_user.user_type.lower() if request.current_user.user_type else ''
        
        pending = {
            'prescriptions': 0,
            'labOrders': 0,
            'appointments': 0,
            'messages': 0,
            'alerts': 0
        }
        
        # Count pending prescriptions (for pharmacists)
        if 'pharmacist' in user_type and Prescription:
            try:
                pending['prescriptions'] = Prescription.query.filter_by(
                    status='pending'
                ).count()
            except:
                pending['prescriptions'] = 0
        
        # Count pending lab orders (for lab techs)
        if 'lab' in user_type and LabOrder:
            try:
                pending['labOrders'] = LabOrder.query.filter_by(
                    status='pending'
                ).count()
            except:
                pending['labOrders'] = 0
        
        # Count upcoming appointments (for doctors/nurses)
        if ('physician' in user_type or 'nurse' in user_type or 'doctor' in user_type) and Appointment:
            try:
                provider_id = None
                try:
                    from src.models.provider import Provider as ProviderModel
                    provider = ProviderModel.query.filter_by(user_account_id=user_id).first()
                    provider_id = provider.id if provider else None
                except:
                    provider_id = None
                tomorrow = datetime.now() + timedelta(days=1)
                query = Appointment.query.filter(
                    Appointment.appointment_date <= tomorrow,
                    Appointment.status == 'scheduled'
                )
                if provider_id:
                    query = query.filter(Appointment.provider_id == provider_id)
                pending['appointments'] = query.count()
            except:
                pending['appointments'] = 0
        
        # Count unread messages
        try:
            from src.models.messaging import Message
            pending['messages'] = Message.query.filter(
                Message.recipient_id == user_id,
                Message.status == 'unread'
            ).count()
        except:
            pending['messages'] = 0
        
        # Count active vital alerts (for doctors/nurses)
        if 'physician' in user_type or 'nurse' in user_type or 'doctor' in user_type:
            try:
                from src.models.iot_vitals import VitalAlert
                pending['alerts'] = VitalAlert.query.filter_by(
                    status='active'
                ).count()
            except:
                pending['alerts'] = 0
        
        return jsonify({
            'success': True,
            'pending_actions': pending
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'pending_actions': {
                'prescriptions': 0,
                'labOrders': 0,
                'appointments': 0,
                'messages': 0,
                'alerts': 0
            }
        }), 200  # Return 200 with zeros instead of error

@dashboard_bp.route('/receptionist/stats', methods=['GET'])
@token_required
@role_required(['Receptionist', 'admin', 'root_admin'])
def get_receptionist_stats():
    """Get receptionist dashboard statistics"""
    try:
        from src.models.patient import Patient
        
        today = datetime.now().date()
        facility_id = request.token_payload.get('facility_id')
        
        # Today's registrations
        today_registrations = Patient.query.filter(
            func.date(Patient.created_at) == today,
            Patient.facility_id == facility_id
        ).count()
        
        # Waiting patients (those with appointments today but not checked out)
        waiting_patients = 0
        if Appointment:
            try:
                waiting_patients = Appointment.query.filter(
                    Appointment.facility_id == facility_id,
                    func.date(Appointment.appointment_date) == today,
                    Appointment.status.in_(['scheduled', 'checked_in'])
                ).count()
            except:
                pass
        
        # Total collections today
        total_collections = 0
        try:
            collections = db.session.query(func.coalesce(func.sum(Payment.payment_amount), 0)).filter(
                Payment.payment_date == today,
                Payment.facility_id == facility_id,
                Payment.status == 'completed'
            ).scalar()
            total_collections = float(collections) if collections else 0
        except:
            pass
        
        # Average wait time from current queue entries
        avg_wait_time = 0
        try:
            waiting_entries = OPDQueue.query.filter(
                OPDQueue.facility_id == facility_id,
                OPDQueue.status == 'waiting'
            ).all()
            if waiting_entries:
                now = datetime.utcnow()
                waits = [
                    max(0, int((now - row.created_at).total_seconds() / 60))
                    for row in waiting_entries if row.created_at
                ]
                avg_wait_time = int(sum(waits) / len(waits)) if waits else 0
        except:
            avg_wait_time = 0
        
        return jsonify({
            'success': True,
            'stats': {
                'todayRegistrations': today_registrations,
                'waitingPatients': waiting_patients,
                'totalCollections': total_collections,
                'avgWaitTime': avg_wait_time
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': True,
            'stats': {
                'todayRegistrations': 0,
                'waitingPatients': 0,
                'totalCollections': 0,
                'avgWaitTime': 0
            }
        }), 200

@dashboard_bp.route('/receptionist/today-appointments', methods=['GET'])
@token_required
@role_required(['Receptionist', 'admin', 'root_admin'])
def get_today_appointments():
    """Get today's appointments for reception desk"""
    try:
        if not Appointment:
            return jsonify({
                'success': True,
                'appointments': []
            }), 200
        
        from src.models.patient import Patient
        from src.models.provider import Provider
        
        today = datetime.now().date()
        
        appointments = db.session.query(Appointment, Patient, Provider).join(
            Patient, Appointment.patient_id == Patient.id
        ).outerjoin(
            Provider, Appointment.provider_id == Provider.id
        ).filter(
            func.date(Appointment.appointment_date) == today
        ).order_by(Appointment.appointment_time).all()
        
        result = []
        for appt, patient, provider in appointments:
            result.append({
                'id': appt.id,
                'time': appt.appointment_time.strftime('%H:%M') if appt.appointment_time else '',
                'patient_name': f"{patient.first_name} {patient.last_name}",
                'patient_mrn': patient.universal_patient_id,
                'provider_name': f"Dr. {provider.last_name}" if provider else 'N/A',
                'status': appt.status,
                'appointment_type': appt.appointment_type
            })
        
        return jsonify({
            'success': True,
            'appointments': result
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': True,
            'appointments': []
        }), 200

@dashboard_bp.route('/receptionist/recent-registrations', methods=['GET'])
@token_required
@role_required(['Receptionist', 'admin', 'root_admin'])
def get_recent_registrations():
    """Get recent patient registrations"""
    try:
        from src.models.patient import Patient
        
        limit = request.args.get('limit', 10, type=int)
        
        patients = Patient.query.order_by(
            Patient.created_at.desc()
        ).limit(limit).all()
        
        result = []
        for patient in patients:
            result.append({
                'id': patient.id,
                'mrn': patient.universal_patient_id,
                'name': f"{patient.first_name} {patient.last_name}",
                'age': patient.age if hasattr(patient, 'age') else 'N/A',
                'gender': patient.gender,
                'phone': patient.phone_primary,
                'registered_at': patient.created_at.strftime('%Y-%m-%d %H:%M') if patient.created_at else ''
            })
        
        return jsonify({
            'success': True,
            'registrations': result
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': True,
            'registrations': []
        }), 200
