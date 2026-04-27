"""
IoT Vitals Routes
Handles IoT device registration, data ingestion, and real-time vital monitoring
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.patient import Patient
from src.models.iot_vitals import DeviceRegistration, IoTVitalReading, VitalAlert, DeviceSyncLog
from datetime import datetime, timedelta
import uuid
import json

iot_vitals_bp = Blueprint('iot_vitals', __name__)

# Register IoT Device
@iot_vitals_bp.route('/devices/register', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse', 'Receptionist', 'System Administrator'])
def register_device():
    """Register a new IoT device or wearable for a patient"""
    try:
        data = request.get_json()
        
        device = DeviceRegistration(
            device_id=data.get('device_id') or f"DEV-{uuid.uuid4().hex[:12].upper()}",
            patient_id=data.get('patient_id'),
            device_type=data.get('device_type'),
            device_manufacturer=data.get('device_manufacturer'),
            device_model=data.get('device_model'),
            device_serial_number=data.get('device_serial_number'),
            connection_type=data.get('connection_type'),
            api_endpoint=data.get('api_endpoint'),
            is_active=True,
            registered_by=request.current_user.id
        )
        
        db.session.add(device)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Device registered successfully',
            'device': device.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Get Patient Devices
@iot_vitals_bp.route('/devices/patient/<int:patient_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'Receptionist', 'System Administrator'])
def get_patient_devices(patient_id):
    """Get all registered devices for a patient"""
    try:
        devices = DeviceRegistration.query.filter_by(
            patient_id=patient_id,
            is_active=True
        ).all()
        
        return jsonify({
            'success': True,
            'devices': [d.to_dict() for d in devices]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Ingest Vital Reading (API endpoint for devices)
@iot_vitals_bp.route('/readings/ingest', methods=['POST'])
def ingest_vital_reading():
    """
    Ingest vital reading from IoT device
    This endpoint can be called by devices or integration services
    Authentication via API key in header
    """
    try:
        # Check API key authentication
        api_key = request.headers.get('X-API-Key')
        if not api_key:
            return jsonify({'error': 'API key required'}), 401
        
        # Verify device exists and is active
        device_id = request.headers.get('X-Device-ID')
        device = DeviceRegistration.query.filter_by(
            device_id=device_id,
            is_active=True
        ).first()
        
        if not device:
            return jsonify({'error': 'Device not found or inactive'}), 404
        
        data = request.get_json()
        
        # Create vital reading
        reading = IoTVitalReading(
            reading_id=f"READ-{uuid.uuid4().hex[:12].upper()}",
            patient_id=device.patient_id,
            device_id=device_id,
            reading_timestamp=datetime.fromisoformat(data.get('timestamp')) if data.get('timestamp') else datetime.utcnow(),
            data_source=data.get('data_source', 'device'),
            
            # Cardiovascular
            systolic_bp=data.get('systolic_bp'),
            diastolic_bp=data.get('diastolic_bp'),
            heart_rate=data.get('heart_rate'),
            heart_rate_variability=data.get('heart_rate_variability'),
            
            # Respiratory
            respiratory_rate=data.get('respiratory_rate'),
            oxygen_saturation=data.get('oxygen_saturation'),
            
            # Temperature
            temperature=data.get('temperature'),
            temperature_unit=data.get('temperature_unit', 'F'),
            temperature_location=data.get('temperature_location'),
            
            # Body Composition
            weight=data.get('weight'),
            weight_unit=data.get('weight_unit', 'lbs'),
            height=data.get('height'),
            height_unit=data.get('height_unit', 'in'),
            bmi=data.get('bmi'),
            body_fat_percentage=data.get('body_fat_percentage'),
            
            # Glucose
            blood_glucose=data.get('blood_glucose'),
            glucose_context=data.get('glucose_context'),
            
            # Activity
            steps=data.get('steps'),
            distance=data.get('distance'),
            calories_burned=data.get('calories_burned'),
            active_minutes=data.get('active_minutes'),
            
            # Sleep
            sleep_duration=data.get('sleep_duration'),
            sleep_quality_score=data.get('sleep_quality_score'),
            deep_sleep_minutes=data.get('deep_sleep_minutes'),
            rem_sleep_minutes=data.get('rem_sleep_minutes'),
            
            # ECG
            ecg_rhythm=data.get('ecg_rhythm'),
            ecg_file_path=data.get('ecg_file_path'),
            
            # Quality
            data_quality=data.get('data_quality', 'good'),
            confidence_score=data.get('confidence_score'),
            
            # Location
            latitude=data.get('latitude'),
            longitude=data.get('longitude'),
            location_name=data.get('location_name'),
            
            # Raw data
            raw_data=json.dumps(data.get('raw_data', {})) if data.get('raw_data') else None
        )
        
        # Check for abnormal values and create alerts
        alerts = check_vital_thresholds(reading, device.patient_id)
        if alerts:
            reading.is_abnormal = True
            reading.alert_triggered = True
        
        db.session.add(reading)
        
        # Update device last sync
        device.last_sync = datetime.utcnow()
        device.battery_level = data.get('battery_level')
        device.signal_strength = data.get('signal_strength')
        
        # Log sync event
        sync_log = DeviceSyncLog(
            device_id=device_id,
            sync_type='automatic',
            sync_status='success',
            readings_synced=1
        )
        db.session.add(sync_log)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Vital reading recorded',
            'reading_id': reading.reading_id,
            'alerts': [a.to_dict() for a in alerts] if alerts else []
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Get Latest IoT Vitals for Patient
@iot_vitals_bp.route('/readings/patient/<int:patient_id>/latest', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_latest_iot_vitals(patient_id):
    """Get the most recent vital readings from all sources"""
    try:
        # Get latest reading from each device type
        device_types = ['smartwatch', 'bp_monitor', 'pulse_oximeter', 'glucose_meter', 'weight_scale', 'thermometer']
        
        latest_readings = {}
        
        for device_type in device_types:
            reading = db.session.query(IoTVitalReading).join(
                DeviceRegistration,
                IoTVitalReading.device_id == DeviceRegistration.device_id
            ).filter(
                IoTVitalReading.patient_id == patient_id,
                DeviceRegistration.device_type == device_type
            ).order_by(IoTVitalReading.reading_timestamp.desc()).first()
            
            if reading:
                latest_readings[device_type] = reading.to_dict()
        
        # Get most recent overall reading
        most_recent = IoTVitalReading.query.filter_by(
            patient_id=patient_id
        ).order_by(IoTVitalReading.reading_timestamp.desc()).first()
        
        return jsonify({
            'success': True,
            'latest_by_device': latest_readings,
            'most_recent': most_recent.to_dict() if most_recent else None
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get IoT Vitals History
@iot_vitals_bp.route('/readings/patient/<int:patient_id>/history', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_iot_vitals_history(patient_id):
    """Get historical vital readings with filtering"""
    try:
        # Query parameters
        days = request.args.get('days', 7, type=int)
        device_type = request.args.get('device_type')
        vital_type = request.args.get('vital_type')  # heart_rate, blood_pressure, etc.
        
        # Calculate date range
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Build query
        query = IoTVitalReading.query.filter(
            IoTVitalReading.patient_id == patient_id,
            IoTVitalReading.reading_timestamp >= start_date
        )
        
        # Filter by device type if specified
        if device_type:
            query = query.join(DeviceRegistration).filter(
                DeviceRegistration.device_type == device_type
            )
        
        readings = query.order_by(IoTVitalReading.reading_timestamp.desc()).all()
        
        # Filter by vital type if specified
        if vital_type:
            filtered_readings = []
            for reading in readings:
                reading_dict = reading.to_dict()
                if vital_type == 'heart_rate' and reading.heart_rate:
                    filtered_readings.append(reading_dict)
                elif vital_type == 'blood_pressure' and (reading.systolic_bp or reading.diastolic_bp):
                    filtered_readings.append(reading_dict)
                elif vital_type == 'oxygen_saturation' and reading.oxygen_saturation:
                    filtered_readings.append(reading_dict)
                elif vital_type == 'temperature' and reading.temperature:
                    filtered_readings.append(reading_dict)
                elif vital_type == 'glucose' and reading.blood_glucose:
                    filtered_readings.append(reading_dict)
            readings_data = filtered_readings
        else:
            readings_data = [r.to_dict() for r in readings]
        
        return jsonify({
            'success': True,
            'count': len(readings_data),
            'readings': readings_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get Active Alerts
@iot_vitals_bp.route('/alerts/patient/<int:patient_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_patient_alerts(patient_id):
    """Get active vital alerts for a patient"""
    try:
        status = request.args.get('status', 'active')
        
        alerts = VitalAlert.query.filter_by(
            patient_id=patient_id,
            status=status
        ).order_by(VitalAlert.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'count': len(alerts),
            'alerts': [a.to_dict() for a in alerts]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Acknowledge Alert
@iot_vitals_bp.route('/alerts/<alert_id>/acknowledge', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def acknowledge_alert(alert_id):
    """Acknowledge a vital alert"""
    try:
        alert = VitalAlert.query.filter_by(alert_id=alert_id).first_or_404()
        
        alert.status = 'acknowledged'
        alert.acknowledged_by = request.current_user.id
        alert.acknowledged_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Alert acknowledged'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Get Vital Trends
@iot_vitals_bp.route('/trends/patient/<int:patient_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_vital_trends(patient_id):
    """Get trending data for vitals visualization"""
    try:
        vital_type = request.args.get('vital_type', 'heart_rate')
        days = request.args.get('days', 7, type=int)
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        readings = IoTVitalReading.query.filter(
            IoTVitalReading.patient_id == patient_id,
            IoTVitalReading.reading_timestamp >= start_date
        ).order_by(IoTVitalReading.reading_timestamp).all()
        
        # Extract trend data based on vital type
        trend_data = []
        for reading in readings:
            data_point = {
                'timestamp': reading.reading_timestamp.isoformat(),
                'device_id': reading.device_id
            }
            
            if vital_type == 'heart_rate' and reading.heart_rate:
                data_point['value'] = reading.heart_rate
                data_point['unit'] = 'bpm'
                trend_data.append(data_point)
            elif vital_type == 'blood_pressure' and (reading.systolic_bp or reading.diastolic_bp):
                data_point['systolic'] = reading.systolic_bp
                data_point['diastolic'] = reading.diastolic_bp
                data_point['unit'] = 'mmHg'
                trend_data.append(data_point)
            elif vital_type == 'oxygen_saturation' and reading.oxygen_saturation:
                data_point['value'] = reading.oxygen_saturation
                data_point['unit'] = '%'
                trend_data.append(data_point)
            elif vital_type == 'glucose' and reading.blood_glucose:
                data_point['value'] = reading.blood_glucose
                data_point['unit'] = 'mg/dL'
                data_point['context'] = reading.glucose_context
                trend_data.append(data_point)
            elif vital_type == 'weight' and reading.weight:
                data_point['value'] = reading.weight
                data_point['unit'] = reading.weight_unit
                trend_data.append(data_point)
        
        # Calculate statistics
        if trend_data:
            values = [d.get('value') for d in trend_data if d.get('value')]
            if values:
                stats = {
                    'min': min(values),
                    'max': max(values),
                    'avg': sum(values) / len(values),
                    'count': len(values)
                }
            else:
                stats = None
        else:
            stats = None
        
        return jsonify({
            'success': True,
            'vital_type': vital_type,
            'period_days': days,
            'data': trend_data,
            'statistics': stats
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Sync Device Data (Manual trigger)
@iot_vitals_bp.route('/devices/<device_id>/sync', methods=['POST'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def sync_device_data(device_id):
    """Manually trigger device data synchronization"""
    try:
        device = DeviceRegistration.query.filter_by(device_id=device_id).first_or_404()
        previous_sync = device.last_sync
        now = datetime.utcnow()
        recent_query = IoTVitalReading.query.filter(IoTVitalReading.device_id == device_id)
        if previous_sync:
            recent_query = recent_query.filter(IoTVitalReading.reading_timestamp > previous_sync)
        readings_synced = recent_query.count()

        sync_status = 'success'
        if readings_synced == 0:
            sync_status = 'partial'

        sync_log = DeviceSyncLog(
            device_id=device_id,
            sync_type='manual',
            sync_status=sync_status,
            readings_synced=readings_synced
        )
        
        device.last_sync = now
        
        db.session.add(sync_log)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Device sync completed',
            'last_sync': device.last_sync.isoformat(),
            'readings_synced': readings_synced,
            'sync_status': sync_status
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Helper function to check vital thresholds
def check_vital_thresholds(reading, patient_id):
    """Check if vital readings exceed thresholds and create alerts"""
    alerts = []
    
    try:
        # Blood Pressure
        if reading.systolic_bp and reading.diastolic_bp:
            if reading.systolic_bp >= 180 or reading.diastolic_bp >= 120:
                alert = create_alert(
                    patient_id, reading.reading_id,
                    'critical', 'bp_high',
                    f'Critical hypertension: {reading.systolic_bp}/{reading.diastolic_bp} mmHg',
                    'blood_pressure', f'{reading.systolic_bp}/{reading.diastolic_bp}', '180/120'
                )
                alerts.append(alert)
            elif reading.systolic_bp < 90 or reading.diastolic_bp < 60:
                alert = create_alert(
                    patient_id, reading.reading_id,
                    'warning', 'bp_low',
                    f'Low blood pressure: {reading.systolic_bp}/{reading.diastolic_bp} mmHg',
                    'blood_pressure', f'{reading.systolic_bp}/{reading.diastolic_bp}', '90/60'
                )
                alerts.append(alert)
        
        # Heart Rate
        if reading.heart_rate:
            if reading.heart_rate > 120:
                alert = create_alert(
                    patient_id, reading.reading_id,
                    'warning', 'hr_high',
                    f'Elevated heart rate: {reading.heart_rate} bpm',
                    'heart_rate', str(reading.heart_rate), '120'
                )
                alerts.append(alert)
            elif reading.heart_rate < 50:
                alert = create_alert(
                    patient_id, reading.reading_id,
                    'warning', 'hr_low',
                    f'Low heart rate: {reading.heart_rate} bpm',
                    'heart_rate', str(reading.heart_rate), '50'
                )
                alerts.append(alert)
        
        # Oxygen Saturation
        if reading.oxygen_saturation:
            if reading.oxygen_saturation < 90:
                alert = create_alert(
                    patient_id, reading.reading_id,
                    'critical', 'spo2_low',
                    f'Low oxygen saturation: {reading.oxygen_saturation}%',
                    'oxygen_saturation', str(reading.oxygen_saturation), '90'
                )
                alerts.append(alert)
        
        # Blood Glucose
        if reading.blood_glucose:
            if reading.blood_glucose > 250:
                alert = create_alert(
                    patient_id, reading.reading_id,
                    'warning', 'glucose_high',
                    f'High blood glucose: {reading.blood_glucose} mg/dL',
                    'blood_glucose', str(reading.blood_glucose), '250'
                )
                alerts.append(alert)
            elif reading.blood_glucose < 70:
                alert = create_alert(
                    patient_id, reading.reading_id,
                    'critical', 'glucose_low',
                    f'Low blood glucose: {reading.blood_glucose} mg/dL',
                    'blood_glucose', str(reading.blood_glucose), '70'
                )
                alerts.append(alert)
        
        # Temperature
        if reading.temperature:
            temp_f = reading.temperature if reading.temperature_unit == 'F' else (reading.temperature * 9/5) + 32
            if temp_f >= 103:
                alert = create_alert(
                    patient_id, reading.reading_id,
                    'warning', 'temp_high',
                    f'High temperature: {reading.temperature}°{reading.temperature_unit}',
                    'temperature', f'{reading.temperature}°{reading.temperature_unit}', '103°F'
                )
                alerts.append(alert)
        
        # Commit all alerts
        if alerts:
            db.session.add_all(alerts)
            db.session.commit()
        
        return alerts
        
    except Exception as e:
        print(f"Error checking thresholds: {e}")
        return []

def create_alert(patient_id, reading_id, alert_type, category, message, vital_type, value, threshold):
    """Helper to create a vital alert"""
    return VitalAlert(
        alert_id=f"ALERT-{uuid.uuid4().hex[:12].upper()}",
        patient_id=patient_id,
        reading_id=reading_id,
        alert_type=alert_type,
        alert_category=category,
        alert_message=message,
        severity='critical' if alert_type == 'critical' else 'high',
        vital_type=vital_type,
        vital_value=value,
        threshold_value=threshold,
        status='active'
    )
