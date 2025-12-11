"""
Remote Patient Monitoring (PulseGuard) API Routes
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.rpm import (
    RPMDevice, RPMVitalReading, RPMAlert, RPMAlertRule, TelehealthSession
)
from src.models.patient import Patient
from datetime import datetime, timedelta
import uuid

rpm_bp = Blueprint('rpm', __name__)

@rpm_bp.route('/devices', methods=['POST'])
@token_required
@role_required(['physician', 'admin'])
def register_device():
    """Register a PulseGuard device"""
    try:
        data = request.get_json()
        
        device = RPMDevice(
            device_id=f"RPM-{uuid.uuid4().hex[:12].upper()}",
            device_serial_number=data['device_serial_number'],
            patient_id=data['patient_id'],
            device_type='pulseguard',
            device_model=data.get('device_model'),
            firmware_version=data.get('firmware_version'),
            is_paired=False
        )
        
        db.session.add(device)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'device': device.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@rpm_bp.route('/devices/<int:device_id>/pair', methods=['POST'])
@token_required
def pair_device(device_id):
    """Pair device with patient"""
    try:
        device = RPMDevice.query.get_or_404(device_id)
        device.is_paired = True
        device.paired_at = datetime.utcnow()
        device.last_sync = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'device': device.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@rpm_bp.route('/readings', methods=['POST'])
@token_required
def submit_vital_reading():
    """Submit vital reading from PulseGuard device"""
    try:
        data = request.get_json()
        device_serial = data.get('device_serial_number')
        
        # Find device
        device = RPMDevice.query.filter(
            RPMDevice.device_serial_number == device_serial
        ).first()
        
        if not device:
            return jsonify({'error': 'Device not found'}), 404
        
        if not device.is_paired:
            return jsonify({'error': 'Device not paired'}), 400
        
        # Create reading
        reading = RPMVitalReading(
            reading_id=f"READ-{uuid.uuid4().hex[:12].upper()}",
            device_id=device.id,
            patient_id=device.patient_id,
            systolic_bp=data.get('systolic_bp'),
            diastolic_bp=data.get('diastolic_bp'),
            heart_rate=data.get('heart_rate'),
            oxygen_saturation=data.get('oxygen_saturation'),
            measurement_method='cuffless',
            measurement_timestamp=datetime.fromisoformat(data.get('timestamp', datetime.utcnow().isoformat())),
            signal_quality=data.get('signal_quality', 'good'),
            measurement_valid=True
        )
        
        db.session.add(reading)
        
        # Update device sync time
        device.last_sync = datetime.utcnow()
        device.battery_level = data.get('battery_level')
        device.battery_status = data.get('battery_status')
        
        # Check for alerts
        check_alerts(device.patient_id, reading)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'reading': reading.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def check_alerts(patient_id, reading):
    """Check if reading triggers any alerts"""
    alert_rules = RPMAlertRule.query.filter(
        RPMAlertRule.patient_id == patient_id,
        RPMAlertRule.is_active == True
    ).all()
    
    for rule in alert_rules:
        triggered = False
        alert_level = rule.alert_level
        
        if rule.vital_type == 'systolic_bp' and reading.systolic_bp:
            if rule.threshold_max and reading.systolic_bp > rule.threshold_max:
                triggered = True
            elif rule.threshold_min and reading.systolic_bp < rule.threshold_min:
                triggered = True
        elif rule.vital_type == 'diastolic_bp' and reading.diastolic_bp:
            if rule.threshold_max and reading.diastolic_bp > rule.threshold_max:
                triggered = True
            elif rule.threshold_min and reading.diastolic_bp < rule.threshold_min:
                triggered = True
        elif rule.vital_type == 'heart_rate' and reading.heart_rate:
            if rule.threshold_max and reading.heart_rate > rule.threshold_max:
                triggered = True
            elif rule.threshold_min and reading.heart_rate < rule.threshold_min:
                triggered = True
        
        if triggered:
            alert = RPMAlert(
                alert_id=f"ALERT-{uuid.uuid4().hex[:12].upper()}",
                device_id=reading.device_id,
                patient_id=patient_id,
                reading_id=reading.id,
                alert_level=alert_level,
                alert_type=f"{rule.vital_type}_abnormal",
                alert_message=f"{rule.vital_type} reading outside normal range",
                trigger_systolic_bp=reading.systolic_bp,
                trigger_diastolic_bp=reading.diastolic_bp,
                trigger_heart_rate=reading.heart_rate,
                threshold_min=rule.threshold_min,
                threshold_max=rule.threshold_max,
                status='active'
            )
            
            # Escalate if Level 3
            if alert_level == 3:
                alert.emergency_contacts_notified = rule.notify_emergency_contacts
                alert.emergency_response_dispatched = rule.notify_emergency_response
            
            db.session.add(alert)

@rpm_bp.route('/readings', methods=['GET'])
@token_required
def get_vital_readings():
    """Get vital readings for a patient"""
    try:
        patient_id = request.args.get('patient_id', type=int)
        device_id = request.args.get('device_id', type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = RPMVitalReading.query
        
        if patient_id:
            query = query.filter(RPMVitalReading.patient_id == patient_id)
        if device_id:
            query = query.filter(RPMVitalReading.device_id == device_id)
        if start_date:
            query = query.filter(RPMVitalReading.measurement_timestamp >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(RPMVitalReading.measurement_timestamp <= datetime.fromisoformat(end_date))
        
        readings = query.order_by(RPMVitalReading.measurement_timestamp.desc()).limit(100).all()
        
        return jsonify({
            'success': True,
            'readings': [r.to_dict() for r in readings]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@rpm_bp.route('/alerts', methods=['GET'])
@token_required
def get_alerts():
    """Get RPM alerts"""
    try:
        patient_id = request.args.get('patient_id', type=int)
        status = request.args.get('status', 'active')
        alert_level = request.args.get('alert_level', type=int)
        
        query = RPMAlert.query
        
        if patient_id:
            query = query.filter(RPMAlert.patient_id == patient_id)
        if status:
            query = query.filter(RPMAlert.status == status)
        if alert_level:
            query = query.filter(RPMAlert.alert_level == alert_level)
        
        alerts = query.order_by(RPMAlert.created_at.desc()).limit(50).all()
        
        return jsonify({
            'success': True,
            'alerts': [a.to_dict() for a in alerts]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@rpm_bp.route('/alerts/<int:alert_id>/acknowledge', methods=['POST'])
@token_required
@role_required(['physician', 'nurse'])
def acknowledge_alert(alert_id):
    """Acknowledge an alert"""
    try:
        alert = RPMAlert.query.get_or_404(alert_id)
        alert.status = 'acknowledged'
        alert.acknowledged_at = datetime.utcnow()
        alert.acknowledged_by = request.current_user.id
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'alert': alert.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@rpm_bp.route('/alert-rules', methods=['POST'])
@token_required
@role_required(['physician', 'admin'])
def create_alert_rule():
    """Create alert rule for patient"""
    try:
        data = request.get_json()
        
        rule = RPMAlertRule(
            patient_id=data['patient_id'],
            vital_type=data['vital_type'],
            threshold_min=data.get('threshold_min'),
            threshold_max=data.get('threshold_max'),
            alert_level=data.get('alert_level', 2),
            notify_provider=data.get('notify_provider', True),
            notify_emergency_contacts=data.get('notify_emergency_contacts', False),
            notify_emergency_response=data.get('notify_emergency_response', False),
            assigned_provider_id=data.get('assigned_provider_id')
        )
        
        db.session.add(rule)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'rule': rule.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@rpm_bp.route('/telehealth/sessions', methods=['POST'])
@token_required
@role_required(['physician', 'nurse'])
def create_telehealth_session():
    """Create telehealth session"""
    try:
        data = request.get_json()
        
        session = TelehealthSession(
            session_id=f"TH-{uuid.uuid4().hex[:12].upper()}",
            patient_id=data['patient_id'],
            provider_id=data['provider_id'],
            facility_id=data['facility_id'],
            session_type=data.get('session_type', 'video'),
            platform=data.get('platform', 'zoom'),
            meeting_url=data.get('meeting_url'),
            meeting_id=data.get('meeting_id'),
            scheduled_start=datetime.fromisoformat(data['scheduled_start']),
            scheduled_end=datetime.fromisoformat(data['scheduled_end']) if data.get('scheduled_end') else None,
            encounter_id=data.get('encounter_id')
        )
        
        db.session.add(session)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'session': session.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

