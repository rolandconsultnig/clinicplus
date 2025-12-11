"""
Laboratory Management Routes - Comprehensive OpenEMR-style lab management
Includes lab orders, results entry, batch processing, procedure management
"""
from flask import Blueprint, request, jsonify
from src.models.clinical import LabOrder, LabResult
from src.models.patient import Patient
from src.models.user import db
from src.auth.jwt_manager import token_required, role_required
from datetime import datetime, date, timedelta
import uuid

lab_mgmt_bp = Blueprint('lab_mgmt', __name__)

@lab_mgmt_bp.route('/orders', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'Lab Technician', 'System Administrator'])
def get_lab_orders():
    """Get lab orders with filtering"""
    try:
        patient_id = request.args.get('patient_id', type=int)
        encounter_id = request.args.get('encounter_id', type=int)
        status = request.args.get('status')  # pending, completed, cancelled
        provider_id = request.args.get('provider_id', type=int)
        
        query = LabOrder.query
        
        if patient_id:
            query = query.filter_by(patient_id=patient_id)
        
        if encounter_id:
            query = query.filter_by(encounter_id=encounter_id)
        
        if status:
            query = query.filter_by(status=status)
        
        if provider_id:
            query = query.filter_by(ordering_provider_id=provider_id)
        
        orders = query.order_by(LabOrder.order_date.desc()).limit(100).all()
        
        return jsonify({
            'success': True,
            'orders': [o.to_dict() if hasattr(o, 'to_dict') else {
                'id': o.id,
                'patient_id': o.patient_id,
                'encounter_id': o.encounter_id,
                'order_date': o.order_date.isoformat() if hasattr(o, 'order_date') and o.order_date else None,
                'status': o.status if hasattr(o, 'status') else 'pending'
            } for o in orders]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@lab_mgmt_bp.route('/orders/pending-review', methods=['GET'])
@token_required
@role_required(['Physician', 'Lab Technician', 'System Administrator'])
def get_pending_review():
    """Get lab orders pending review"""
    try:
        orders = LabOrder.query.filter_by(status='pending').order_by(LabOrder.order_date.desc()).all()
        
        return jsonify({
            'success': True,
            'orders': [o.to_dict() if hasattr(o, 'to_dict') else {} for o in orders]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@lab_mgmt_bp.route('/results/batch', methods=['POST'])
@token_required
@role_required(['Lab Technician', 'System Administrator'])
def create_batch_results():
    """Create batch lab results"""
    try:
        data = request.get_json()
        results_data = data.get('results', [])
        
        created_results = []
        
        for result_data in results_data:
            result = LabResult(
                order_id=result_data.get('order_id'),
                patient_id=result_data['patient_id'],
                test_name=result_data['test_name'],
                test_code=result_data.get('test_code'),
                result_value=result_data.get('result_value'),
                result_unit=result_data.get('result_unit'),
                reference_range=result_data.get('reference_range'),
                status=result_data.get('status', 'final'),
                result_date=datetime.fromisoformat(result_data.get('result_date', datetime.utcnow().isoformat())) if isinstance(result_data.get('result_date'), str) else result_data.get('result_date', datetime.utcnow()),
                performed_by=result_data.get('performed_by'),
                created_by=request.current_user.id if hasattr(request, 'current_user') else None
            )
            
            db.session.add(result)
            created_results.append(result)
            
            # Update order status if order_id provided
            if result_data.get('order_id'):
                order = LabOrder.query.get(result_data['order_id'])
                if order:
                    order.status = 'completed'
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'results': [r.to_dict() if hasattr(r, 'to_dict') else {} for r in created_results],
            'count': len(created_results)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@lab_mgmt_bp.route('/patient/<int:patient_id>/results', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_patient_lab_results(patient_id):
    """Get all lab results for a patient"""
    try:
        Patient.query.get_or_404(patient_id)
        
        results = LabResult.query.filter_by(patient_id=patient_id)\
            .order_by(LabResult.result_date.desc()).all()
        
        return jsonify({
            'success': True,
            'results': [r.to_dict() if hasattr(r, 'to_dict') else {} for r in results]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@lab_mgmt_bp.route('/procedures/types', methods=['GET'])
@token_required
@role_required(['System Administrator'])
def get_procedure_types():
    """Get procedure types"""
    # In OpenEMR, this would come from procedure_type table
    procedure_types = [
        {'id': 1, 'name': 'Laboratory', 'category': 'lab'},
        {'id': 2, 'name': 'Radiology', 'category': 'imaging'},
        {'id': 3, 'name': 'Pathology', 'category': 'pathology'},
        {'id': 4, 'name': 'Cardiology', 'category': 'cardiology'}
    ]
    
    return jsonify({'success': True, 'procedure_types': procedure_types}), 200

@lab_mgmt_bp.route('/procedures/providers', methods=['GET'])
@token_required
@role_required(['System Administrator'])
def get_procedure_providers():
    """Get procedure providers"""
    from src.models.provider import Provider
    providers = Provider.query.filter_by(is_active=True).all()
    
    return jsonify({
        'success': True,
        'providers': [p.to_dict() if hasattr(p, 'to_dict') else {} for p in providers]
    }), 200

@lab_mgmt_bp.route('/statistics', methods=['GET'])
@token_required
@role_required(['Lab Technician', 'System Administrator'])
def get_lab_statistics():
    """Get laboratory statistics"""
    try:
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        
        if not from_date:
            from_date = date.today() - timedelta(days=30)
        else:
            from_date = datetime.fromisoformat(from_date).date() if isinstance(from_date, str) else from_date
        
        if not to_date:
            to_date = date.today()
        else:
            to_date = datetime.fromisoformat(to_date).date() if isinstance(to_date, str) else to_date
        
        # Get orders in date range
        orders = LabOrder.query.filter(
            LabOrder.order_date >= from_date,
            LabOrder.order_date <= to_date
        ).all()
        
        # Get results in date range
        results = LabResult.query.filter(
            LabResult.result_date >= datetime.combine(from_date, datetime.min.time()),
            LabResult.result_date <= datetime.combine(to_date, datetime.max.time())
        ).all()
        
        stats = {
            'date_range': {
                'from_date': from_date.isoformat() if isinstance(from_date, date) else from_date,
                'to_date': to_date.isoformat() if isinstance(to_date, date) else to_date
            },
            'total_orders': len(orders),
            'pending_orders': len([o for o in orders if o.status == 'pending']),
            'completed_orders': len([o for o in orders if o.status == 'completed']),
            'total_results': len(results),
            'pending_review': len([r for r in results if hasattr(r, 'status') and r.status == 'pending'])
        }
        
        return jsonify({'success': True, 'statistics': stats}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

