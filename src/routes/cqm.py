"""
Clinical Quality Measures (CQM) Routes
CMS eCQMs, HEDIS, MIPS, PQRS measures
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.middleware.hipaa_audit import hipaa_audit_required
from src.models.user import db
from src.models.cqm import CQMMeasure, CQMResult, CQMPatientEligibility, CQMGapAnalysis
from src.services.cqm_engine import cqm_engine
from datetime import datetime, date
import uuid

cqm_bp = Blueprint('cqm', __name__)

@cqm_bp.route('/measures', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator', 'Facility Administrator'])
def get_cqm_measures():
    """Get list of CQM measures"""
    try:
        measure_type = request.args.get('type')  # eCQM, HEDIS, MIPS, etc.
        category = request.args.get('category')
        is_active = request.args.get('is_active', 'true').lower() == 'true'
        
        query = CQMMeasure.query
        
        if measure_type:
            query = query.filter(CQMMeasure.measure_type == measure_type)
        if category:
            query = query.filter(CQMMeasure.measure_category == category)
        if is_active:
            query = query.filter(CQMMeasure.is_active == True)
        
        measures = query.all()
        
        return jsonify({
            'success': True,
            'measures': [m.to_dict() for m in measures],
            'total': len(measures)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@cqm_bp.route('/measures/<int:measure_id>', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_cqm_measure(measure_id):
    """Get specific CQM measure details"""
    try:
        measure = CQMMeasure.query.get_or_404(measure_id)
        
        return jsonify({
            'success': True,
            'measure': measure.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@cqm_bp.route('/calculate', methods=['POST'])
@token_required
@role_required(['System Administrator', 'Facility Administrator'])
@hipaa_audit_required(action_type='calculate', resource_type='cqm')
def calculate_cqm():
    """Calculate CQM measure"""
    try:
        data = request.get_json()
        measure_id = data.get('measure_id')
        facility_id = data.get('facility_id')
        provider_id = data.get('provider_id')
        period_start = data.get('period_start')
        period_end = data.get('period_end')
        
        if not measure_id:
            return jsonify({'error': 'Measure ID is required'}), 400
        
        # Parse dates
        if period_start:
            period_start = datetime.fromisoformat(period_start).date()
        if period_end:
            period_end = datetime.fromisoformat(period_end).date()
        
        success, result_id, result_data = cqm_engine.calculate_measure(
            measure_id=measure_id,
            facility_id=facility_id,
            provider_id=provider_id,
            period_start=period_start,
            period_end=period_end
        )
        
        if success:
            return jsonify({
                'success': True,
                'result': result_data
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': result_data.get('error', 'Calculation failed')
            }), 400
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@cqm_bp.route('/results', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator', 'Facility Administrator'])
def get_cqm_results():
    """Get CQM calculation results"""
    try:
        measure_id = request.args.get('measure_id', type=int)
        facility_id = request.args.get('facility_id', type=int)
        provider_id = request.args.get('provider_id', type=int)
        period_start = request.args.get('period_start')
        period_end = request.args.get('period_end')
        
        query = CQMResult.query
        
        if measure_id:
            query = query.filter(CQMResult.measure_id == measure_id)
        if facility_id:
            query = query.filter(CQMResult.facility_id == facility_id)
        if provider_id:
            query = query.filter(CQMResult.provider_id == provider_id)
        if period_start:
            query = query.filter(CQMResult.reporting_period_start >= datetime.fromisoformat(period_start).date())
        if period_end:
            query = query.filter(CQMResult.reporting_period_end <= datetime.fromisoformat(period_end).date())
        
        results = query.order_by(CQMResult.reporting_period_end.desc()).limit(100).all()
        
        return jsonify({
            'success': True,
            'results': [r.to_dict() for r in results],
            'total': len(results)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@cqm_bp.route('/gaps', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator'])
def get_care_gaps():
    """Get care gaps for CQM measures"""
    try:
        measure_id = request.args.get('measure_id', type=int)
        patient_id = request.args.get('patient_id', type=int)
        facility_id = request.args.get('facility_id', type=int)
        status = request.args.get('status', 'open')
        
        query = CQMGapAnalysis.query.filter(CQMGapAnalysis.status == status)
        
        if measure_id:
            query = query.filter(CQMGapAnalysis.measure_id == measure_id)
        if patient_id:
            query = query.filter(CQMGapAnalysis.patient_id == patient_id)
        if facility_id:
            # Would need to join with Patient
            pass
        
        gaps = query.order_by(CQMGapAnalysis.action_priority.desc()).limit(100).all()
        
        return jsonify({
            'success': True,
            'gaps': [g.to_dict() for g in gaps],
            'total': len(gaps)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@cqm_bp.route('/gaps/identify', methods=['POST'])
@token_required
@role_required(['System Administrator', 'Facility Administrator'])
def identify_care_gaps():
    """Identify care gaps for a measure"""
    try:
        data = request.get_json()
        measure_id = data.get('measure_id')
        patient_id = data.get('patient_id')
        facility_id = data.get('facility_id')
        
        if not measure_id:
            return jsonify({'error': 'Measure ID is required'}), 400
        
        gaps = cqm_engine.identify_care_gaps(
            measure_id=measure_id,
            patient_id=patient_id,
            facility_id=facility_id
        )
        
        return jsonify({
            'success': True,
            'gaps': gaps,
            'total': len(gaps)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@cqm_bp.route('/dashboard', methods=['GET'])
@token_required
@role_required(['Physician', 'Nurse', 'System Administrator', 'Facility Administrator'])
def get_cqm_dashboard():
    """Get CQM dashboard data"""
    try:
        facility_id = request.args.get('facility_id', type=int)
        provider_id = request.args.get('provider_id', type=int)
        
        # Get recent results
        query = CQMResult.query.filter(CQMResult.calculation_status == 'calculated')
        
        if facility_id:
            query = query.filter(CQMResult.facility_id == facility_id)
        if provider_id:
            query = query.filter(CQMResult.provider_id == provider_id)
        
        recent_results = query.order_by(CQMResult.calculated_at.desc()).limit(10).all()
        
        # Get open gaps
        gaps_query = CQMGapAnalysis.query.filter(CQMGapAnalysis.status == 'open')
        if facility_id:
            # Would need to join
            pass
        
        open_gaps = gaps_query.count()
        
        # Get measures requiring attention
        measures = CQMMeasure.query.filter(CQMMeasure.is_required == True, CQMMeasure.is_active == True).all()
        
        dashboard_data = {
            'recent_results': [r.to_dict() for r in recent_results],
            'open_gaps': open_gaps,
            'required_measures': len(measures),
            'measures': [m.to_dict() for m in measures[:5]]
        }
        
        return jsonify({
            'success': True,
            'dashboard': dashboard_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@cqm_bp.route('/measures/<int:measure_id>/improvement-plan', methods=['POST'])
@token_required
@role_required(['System Administrator', 'Facility Administrator'])
def create_improvement_plan(measure_id):
    """Create improvement plan for a CQM measure"""
    try:
        data = request.get_json()
        
        measure = CQMMeasure.query.get_or_404(measure_id)
        
        # Get current performance
        latest_result = CQMResult.query.filter_by(measure_id=measure_id)\
            .order_by(CQMResult.calculated_at.desc()).first()
        
        if not latest_result:
            return jsonify({
                'error': 'No calculation results found for this measure'
            }), 400
        
        # Create improvement plan
        improvement_plan = {
            'measure_id': measure_id,
            'measure_name': measure.measure_name,
            'current_performance_rate': float(latest_result.performance_rate) if latest_result.performance_rate else 0,
            'benchmark_rate': float(latest_result.benchmark_rate) if latest_result.benchmark_rate else None,
            'target_rate': data.get('target_rate', float(latest_result.benchmark_rate) if latest_result.benchmark_rate else 80.0),
            'action_items': data.get('action_items', []),
            'timeline': data.get('timeline', '30 days'),
            'responsible_party': data.get('responsible_party'),
            'created_at': datetime.utcnow().isoformat()
        }
        
        return jsonify({
            'success': True,
            'improvement_plan': improvement_plan
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

