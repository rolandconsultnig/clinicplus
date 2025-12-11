"""
Health Data API Routes for Smart Watch and Wearable Device Integration
"""

from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required
from src.models.user import db
from src.models.health_data import HealthDataPoint, HealthDataSummary, WearableDevice
from src.models.patient import Patient
from datetime import datetime, date, timedelta
import json

health_data_bp = Blueprint('health_data', __name__)

@health_data_bp.route('/health-data', methods=['POST'])
@token_required
def upload_health_data(current_user):
    """Upload health data from wearable devices"""
    try:
        data = request.get_json()
        
        # Get patient ID from user
        user = current_user
        patient_id = user.get('patient_id') or user.get('id')
        
        if not patient_id:
            return jsonify({'error': 'Patient ID not found'}), 400
        
        # Validate patient exists
        patient = Patient.query.get(patient_id)
        if not patient:
            return jsonify({'error': 'Patient not found'}), 404
        
        # Handle single data point or batch
        data_points = data.get('data_points', [data]) if isinstance(data.get('data_points'), list) else [data]
        
        created_points = []
        for point_data in data_points:
            # Validate required fields
            if 'data_type' not in point_data or 'value' not in point_data:
                continue
            
            health_point = HealthDataPoint(
                patient_id=patient_id,
                device_type=point_data.get('device_type', 'unknown'),
                device_id=point_data.get('device_id'),
                device_name=point_data.get('device_name'),
                data_type=point_data['data_type'],
                value=float(point_data['value']),
                unit=point_data.get('unit'),
                recorded_at=datetime.fromisoformat(point_data['recorded_at']) if point_data.get('recorded_at') else datetime.utcnow(),
                data_metadata=json.dumps(point_data.get('metadata', {})) if point_data.get('metadata') else None,
                source=point_data.get('source', 'wearable'),
                quality_score=point_data.get('quality_score'),
                is_valid=point_data.get('is_valid', True)
            )
            
            db.session.add(health_point)
            created_points.append(health_point)
        
        db.session.commit()
        
        # Update daily summary
        update_daily_summary(patient_id, date.today())
        
        return jsonify({
            'success': True,
            'message': f'Successfully uploaded {len(created_points)} data points',
            'data_points': [p.to_dict() for p in created_points]
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@health_data_bp.route('/health-data', methods=['GET'])
@token_required
def get_health_data(current_user):
    """Get health data for patient"""
    try:
        user = current_user
        patient_id = user.get('patient_id') or user.get('id')
        
        if not patient_id:
            return jsonify({'error': 'Patient ID not found'}), 400
        
        # Query parameters
        data_type = request.args.get('data_type')  # heart_rate, steps, sleep, etc.
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        device_type = request.args.get('device_type')
        limit = request.args.get('limit', 100, type=int)
        
        query = HealthDataPoint.query.filter_by(patient_id=patient_id, is_valid=True)
        
        if data_type:
            query = query.filter_by(data_type=data_type)
        if device_type:
            query = query.filter_by(device_type=device_type)
        if start_date:
            query = query.filter(HealthDataPoint.recorded_at >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(HealthDataPoint.recorded_at <= datetime.fromisoformat(end_date))
        
        data_points = query.order_by(HealthDataPoint.recorded_at.desc()).limit(limit).all()
        
        return jsonify({
            'success': True,
            'data_points': [dp.to_dict() for dp in data_points],
            'count': len(data_points)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@health_data_bp.route('/health-data/summary', methods=['GET'])
@token_required
def get_health_summary(current_user):
    """Get health data summaries"""
    try:
        user = current_user
        patient_id = user.get('patient_id') or user.get('id')
        
        if not patient_id:
            return jsonify({'error': 'Patient ID not found'}), 400
        
        # Query parameters
        period_type = request.args.get('period_type', 'daily')  # daily, weekly, monthly
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        days = request.args.get('days', 7, type=int)
        
        if not start_date:
            start_date = (date.today() - timedelta(days=days)).isoformat()
        if not end_date:
            end_date = date.today().isoformat()
        
        query = HealthDataSummary.query.filter_by(
            patient_id=patient_id,
            period_type=period_type
        ).filter(
            HealthDataSummary.summary_date >= date.fromisoformat(start_date),
            HealthDataSummary.summary_date <= date.fromisoformat(end_date)
        )
        
        summaries = query.order_by(HealthDataSummary.summary_date.desc()).all()
        
        return jsonify({
            'success': True,
            'summaries': [s.to_dict() for s in summaries],
            'count': len(summaries)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@health_data_bp.route('/health-data/devices', methods=['GET'])
@token_required
def get_devices(current_user):
    """Get registered wearable devices"""
    try:
        user = current_user
        patient_id = user.get('patient_id') or user.get('id')
        
        if not patient_id:
            return jsonify({'error': 'Patient ID not found'}), 400
        
        devices = WearableDevice.query.filter_by(patient_id=patient_id, is_active=True).all()
        
        return jsonify({
            'success': True,
            'devices': [d.to_dict() for d in devices]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@health_data_bp.route('/health-data/devices', methods=['POST'])
@token_required
def register_device(current_user):
    """Register a new wearable device"""
    try:
        user = current_user
        patient_id = user.get('patient_id') or user.get('id')
        
        if not patient_id:
            return jsonify({'error': 'Patient ID not found'}), 400
        
        data = request.get_json()
        
        # Check if device already exists
        existing = WearableDevice.query.filter_by(device_id=data.get('device_id')).first()
        if existing:
            return jsonify({'error': 'Device already registered'}), 400
        
        device = WearableDevice(
            patient_id=patient_id,
            device_type=data.get('device_type'),
            device_id=data.get('device_id'),
            device_name=data.get('device_name'),
            manufacturer=data.get('manufacturer'),
            model=data.get('model'),
            connection_type=data.get('connection_type', 'bluetooth'),
            sync_frequency=data.get('sync_frequency', 'realtime'),
            data_types_enabled=json.dumps(data.get('data_types_enabled', []))
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

@health_data_bp.route('/health-data/devices/<int:device_id>', methods=['PUT'])
@token_required
def update_device(current_user, device_id):
    """Update device settings"""
    try:
        user = current_user
        patient_id = user.get('patient_id') or user.get('id')
        
        device = WearableDevice.query.get(device_id)
        if not device or device.patient_id != patient_id:
            return jsonify({'error': 'Device not found'}), 404
        
        data = request.get_json()
        
        if 'device_name' in data:
            device.device_name = data['device_name']
        if 'sync_frequency' in data:
            device.sync_frequency = data['sync_frequency']
        if 'data_types_enabled' in data:
            device.data_types_enabled = json.dumps(data['data_types_enabled'])
        if 'is_active' in data:
            device.is_active = data['is_active']
        
        device.last_sync_at = datetime.utcnow()
        device.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Device updated successfully',
            'device': device.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

def update_daily_summary(patient_id, summary_date):
    """Update or create daily health data summary"""
    try:
        summary = HealthDataSummary.query.filter_by(
            patient_id=patient_id,
            summary_date=summary_date,
            period_type='daily'
        ).first()
        
        if not summary:
            summary = HealthDataSummary(
                patient_id=patient_id,
                summary_date=summary_date,
                period_type='daily'
            )
            db.session.add(summary)
        
        # Get all data points for the day
        start_datetime = datetime.combine(summary_date, datetime.min.time())
        end_datetime = datetime.combine(summary_date, datetime.max.time())
        
        data_points = HealthDataPoint.query.filter(
            HealthDataPoint.patient_id == patient_id,
            HealthDataPoint.recorded_at >= start_datetime,
            HealthDataPoint.recorded_at <= end_datetime,
            HealthDataPoint.is_valid == True
        ).all()
        
        if not data_points:
            return
        
        # Calculate aggregates
        heart_rates = [dp.value for dp in data_points if dp.data_type == 'heart_rate']
        steps = [dp.value for dp in data_points if dp.data_type == 'steps']
        sleep_data = [dp.value for dp in data_points if dp.data_type == 'sleep_hours']
        bp_systolic = [dp.value for dp in data_points if dp.data_type == 'blood_pressure_systolic']
        bp_diastolic = [dp.value for dp in data_points if dp.data_type == 'blood_pressure_diastolic']
        blood_oxygen = [dp.value for dp in data_points if dp.data_type == 'blood_oxygen']
        
        if heart_rates:
            summary.avg_heart_rate = sum(heart_rates) / len(heart_rates)
            summary.max_heart_rate = max(heart_rates)
            summary.min_heart_rate = min(heart_rates)
        
        if steps:
            summary.total_steps = int(sum(steps))
        
        if sleep_data:
            summary.sleep_hours = sum(sleep_data)
        
        if bp_systolic:
            summary.avg_blood_pressure_systolic = sum(bp_systolic) / len(bp_systolic)
        if bp_diastolic:
            summary.avg_blood_pressure_diastolic = sum(bp_diastolic) / len(bp_diastolic)
        
        if blood_oxygen:
            summary.avg_blood_oxygen = sum(blood_oxygen) / len(blood_oxygen)
        
        # Count devices used
        devices = set([dp.device_type for dp in data_points if dp.device_type])
        summary.devices_used = json.dumps(list(devices))
        summary.data_points_count = len(data_points)
        
        summary.updated_at = datetime.utcnow()
        db.session.commit()
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating daily summary: {e}")

