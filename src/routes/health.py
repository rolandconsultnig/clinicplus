"""
Health Check and System Status API Routes
"""
import os

from flask import Blueprint, jsonify
from src.models.user import db
from datetime import datetime

health_bp = Blueprint('health', __name__)

@health_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for load balancers and platform health checks (includes DB probe)."""
    try:
        # Check database connection
        from sqlalchemy import text
        db.session.execute(text('SELECT 1'))
        db_status = 'healthy'
    except Exception as e:
        db_status = f'unhealthy: {str(e)}'

    hosting = 'production' if (
        os.environ.get('RAILWAY_ENVIRONMENT')
        or os.environ.get('RENDER')
        or os.environ.get('RENDER_EXTERNAL_URL')
        or os.environ.get('DYNO')
    ) else 'development'

    ok = db_status == 'healthy'
    return jsonify({
        'status': 'healthy' if ok else 'degraded',
        'message': 'Clinic+ API is running',
        'timestamp': datetime.utcnow().isoformat(),
        'database': db_status,
        'version': '1.0.0',
        'environment': hosting,
    }), 200 if ok else 503

@health_bp.route('/status', methods=['GET'])
def system_status():
    """Detailed system status"""
    try:
        # Check database
        from sqlalchemy import text
        db.session.execute(text('SELECT 1'))
        db_healthy = True
    except:
        db_healthy = False
    
    # Get table counts (if database is healthy)
    stats = {}
    if db_healthy:
        try:
            from src.models.patient import Patient
            from src.models.provider import Provider
            from src.models.clinical import ClinicalEncounter
            
            from src.models.organization import Organization
            from src.models.scheduling import Appointment
            
            stats = {
                'patients': Patient.query.count(),
                'providers': Provider.query.count(),
                'encounters': ClinicalEncounter.query.count(),
                'organizations': Organization.query.count(),
                'appointments': Appointment.query.count()
            }
        except Exception as e:
            stats = {'error': f'Could not retrieve statistics: {str(e)}'}
    
    return jsonify({
        'status': 'operational' if db_healthy else 'degraded',
        'database': 'connected' if db_healthy else 'disconnected',
        'statistics': stats,
        'timestamp': datetime.utcnow().isoformat()
    }), 200 if db_healthy else 503

