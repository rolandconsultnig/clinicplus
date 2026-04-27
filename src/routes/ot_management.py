"""
Operation Theatre (OT) management routes.
"""
from datetime import datetime
import uuid
from flask import Blueprint, jsonify, request
from src.auth.jwt_manager import token_required, role_required
from src.models.user import db
from src.models.ot_management import OTSurgerySchedule

ot_management_bp = Blueprint('ot_management', __name__)
_tables_ready = False


def _ensure_ot_tables():
    global _tables_ready
    if _tables_ready:
        return
    OTSurgerySchedule.__table__.create(bind=db.engine, checkfirst=True)
    _tables_ready = True


@ot_management_bp.before_request
def initialize_ot_module():
    _ensure_ot_tables()


def _parse_datetime(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except (TypeError, ValueError):
        return None


@ot_management_bp.route('/surgeries', methods=['GET'])
@token_required
@role_required(['ot_manager', 'admin', 'physician', 'nurse'])
def list_surgeries():
    try:
        status = request.args.get('status')
        query = OTSurgerySchedule.query
        if status and status != 'all':
            query = query.filter(OTSurgerySchedule.status == status)
        surgeries = query.order_by(OTSurgerySchedule.scheduled_start.asc()).all()
        return jsonify({'success': True, 'surgeries': [s.to_dict() for s in surgeries]}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@ot_management_bp.route('/surgeries', methods=['POST'])
@token_required
@role_required(['ot_manager', 'admin', 'physician'])
def create_surgery():
    try:
        data = request.get_json() or {}
        procedure_name = (data.get('procedure_name') or '').strip()
        scheduled_start = _parse_datetime(data.get('scheduled_start'))
        if not procedure_name:
            return jsonify({'success': False, 'error': 'procedure_name is required'}), 400
        if not scheduled_start:
            return jsonify({'success': False, 'error': 'scheduled_start must be an ISO datetime'}), 400

        surgery = OTSurgerySchedule(
            surgery_code=f"OT-{uuid.uuid4().hex[:8].upper()}",
            patient_id=data.get('patient_id'),
            provider_id=data.get('provider_id'),
            theatre_name=data.get('theatre_name') or 'OT-1',
            procedure_name=procedure_name,
            scheduled_start=scheduled_start,
            estimated_duration_minutes=int(data.get('estimated_duration_minutes') or 60),
            priority=(data.get('priority') or 'routine').lower(),
            status='scheduled',
            anesthesia_type=data.get('anesthesia_type'),
            notes=data.get('notes'),
            created_by_user_id=getattr(request.current_user, 'id', None),
        )
        db.session.add(surgery)
        db.session.commit()
        return jsonify({'success': True, 'surgery': surgery.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@ot_management_bp.route('/surgeries/<int:surgery_id>/status', methods=['PATCH'])
@token_required
@role_required(['ot_manager', 'admin', 'physician', 'nurse'])
def update_surgery_status(surgery_id):
    try:
        data = request.get_json() or {}
        new_status = (data.get('status') or '').lower()
        allowed = {'scheduled', 'in_progress', 'completed', 'cancelled'}
        if new_status not in allowed:
            return jsonify({'success': False, 'error': 'Invalid status'}), 400

        surgery = OTSurgerySchedule.query.get_or_404(surgery_id)
        surgery.status = new_status
        if data.get('notes') is not None:
            surgery.notes = data.get('notes')
        db.session.commit()
        return jsonify({'success': True, 'surgery': surgery.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500


@ot_management_bp.route('/dashboard', methods=['GET'])
@token_required
@role_required(['ot_manager', 'admin', 'physician', 'nurse'])
def ot_dashboard():
    try:
        all_rows = OTSurgerySchedule.query.all()
        summary = {
            'total': len(all_rows),
            'scheduled': sum(1 for s in all_rows if s.status == 'scheduled'),
            'in_progress': sum(1 for s in all_rows if s.status == 'in_progress'),
            'completed': sum(1 for s in all_rows if s.status == 'completed'),
            'cancelled': sum(1 for s in all_rows if s.status == 'cancelled'),
        }
        return jsonify({'success': True, 'summary': summary}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
