"""
Billing Management Routes - Comprehensive OpenEMR-style billing management
Includes billing report, payment processing, batch payments, ERA, UB-04, EDI history
"""
from flask import Blueprint, request, jsonify
from src.models.billing import Charge, Claim, Payment, PaymentAllocation, Statement
from src.models.patient import Patient
from src.models.user import db
from src.auth.jwt_manager import token_required, role_required
from datetime import datetime, date, timedelta
from decimal import Decimal
import json

billing_mgmt_bp = Blueprint('billing_mgmt', __name__)

@billing_mgmt_bp.route('/report', methods=['GET'])
@token_required
@role_required(['Billing Staff', 'System Administrator', 'Receptionist'])
def get_billing_report():
    """Get comprehensive billing report"""
    try:
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        facility_id = request.args.get('facility_id', type=int)
        provider_id = request.args.get('provider_id', type=int)
        status = request.args.get('status')  # unbilled, billed, paid, etc.
        
        if not from_date:
            from_date = date.today() - timedelta(days=30)
        else:
            from_date = datetime.fromisoformat(from_date).date() if isinstance(from_date, str) else from_date
        
        if not to_date:
            to_date = date.today()
        else:
            to_date = datetime.fromisoformat(to_date).date() if isinstance(to_date, str) else to_date
        
        # Get charges
        query = Charge.query.filter(
            Charge.charge_date >= from_date,
            Charge.charge_date <= to_date
        )
        
        if facility_id:
            query = query.filter_by(facility_id=facility_id)
        
        charges = query.all()
        
        # Get claims
        claims_query = Claim.query.filter(
            Claim.created_at >= datetime.combine(from_date, datetime.min.time()),
            Claim.created_at <= datetime.combine(to_date, datetime.max.time())
        )
        
        if facility_id:
            claims_query = claims_query.filter_by(facility_id=facility_id)
        
        claims = claims_query.all()
        
        # Get payments
        payments_query = Payment.query.filter(
            Payment.payment_date >= from_date,
            Payment.payment_date <= to_date
        )
        
        if facility_id:
            payments_query = payments_query.filter_by(facility_id=facility_id)
        
        payments = payments_query.all()
        
        # Calculate totals
        total_charges = sum(float(c.total_amount) for c in charges)
        total_payments = sum(float(p.amount) for p in payments)
        total_outstanding = total_charges - total_payments
        
        report = {
            'date_range': {
                'from_date': from_date.isoformat() if isinstance(from_date, date) else from_date,
                'to_date': to_date.isoformat() if isinstance(to_date, date) else to_date
            },
            'summary': {
                'total_charges': total_charges,
                'total_payments': total_payments,
                'total_outstanding': total_outstanding,
                'total_claims': len(claims),
                'pending_claims': len([c for c in claims if c.status == 'pending']),
                'paid_claims': len([c for c in claims if c.status == 'paid'])
            },
            'charges': [c.to_dict() for c in charges],
            'claims': [c.to_dict() for c in claims],
            'payments': [p.to_dict() for p in payments]
        }
        
        return jsonify({'success': True, 'report': report}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@billing_mgmt_bp.route('/payment/new', methods=['POST'])
@token_required
@role_required(['Billing Staff', 'Receptionist', 'System Administrator'])
def create_payment():
    """Create new payment entry"""
    try:
        data = request.get_json()
        
        payment = Payment(
            payment_id=f"PAY-{datetime.now().strftime('%Y%m%d')}-{len(Payment.query.all()) + 1}",
            patient_id=data['patient_id'],
            facility_id=data.get('facility_id'),
            payment_date=datetime.fromisoformat(data.get('payment_date', datetime.utcnow().isoformat())).date() if isinstance(data.get('payment_date'), str) else data.get('payment_date', date.today()),
            amount=Decimal(str(data['amount'])),
            payment_method=data.get('payment_method', 'cash'),
            reference_number=data.get('reference_number'),
            check_number=data.get('check_number'),
            notes=data.get('notes'),
            created_by=request.current_user.id if hasattr(request, 'current_user') else None
        )
        
        db.session.add(payment)
        
        # Create allocations if provided
        if 'allocations' in data:
            for alloc_data in data['allocations']:
                from src.models.billing import PaymentAllocation
                allocation = PaymentAllocation(
                    payment_id=payment.id,
                    charge_id=alloc_data.get('charge_id'),
                    amount=Decimal(str(alloc_data['amount']))
                )
                db.session.add(allocation)
        
        db.session.commit()
        
        return jsonify({'success': True, 'payment': payment.to_dict()}), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@billing_mgmt_bp.route('/payment/search', methods=['GET'])
@token_required
@role_required(['Billing Staff', 'Receptionist', 'System Administrator'])
def search_payments():
    """Search payments"""
    try:
        patient_id = request.args.get('patient_id', type=int)
        reference_number = request.args.get('reference_number')
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        
        query = Payment.query
        
        if patient_id:
            query = query.filter_by(patient_id=patient_id)
        
        if reference_number:
            query = query.filter_by(reference_number=reference_number)
        
        if from_date:
            from_date_obj = datetime.fromisoformat(from_date).date() if isinstance(from_date, str) else from_date
            query = query.filter(Payment.payment_date >= from_date_obj)
        
        if to_date:
            to_date_obj = datetime.fromisoformat(to_date).date() if isinstance(to_date, str) else to_date
            query = query.filter(Payment.payment_date <= to_date_obj)
        
        payments = query.order_by(Payment.payment_date.desc()).limit(100).all()
        
        return jsonify({
            'success': True,
            'payments': [p.to_dict() for p in payments]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@billing_mgmt_bp.route('/payment/batch', methods=['POST'])
@token_required
@role_required(['Billing Staff', 'System Administrator'])
def create_batch_payments():
    """Create batch payments"""
    try:
        data = request.get_json()
        payments_data = data.get('payments', [])
        
        created_payments = []
        
        for payment_data in payments_data:
            payment = Payment(
                payment_id=f"PAY-{datetime.now().strftime('%Y%m%d')}-{len(Payment.query.all()) + len(created_payments) + 1}",
                patient_id=payment_data['patient_id'],
                facility_id=payment_data.get('facility_id'),
                payment_date=datetime.fromisoformat(payment_data.get('payment_date', datetime.utcnow().isoformat())).date() if isinstance(payment_data.get('payment_date'), str) else payment_data.get('payment_date', date.today()),
                amount=Decimal(str(payment_data['amount'])),
                payment_method=payment_data.get('payment_method', 'cash'),
                reference_number=payment_data.get('reference_number'),
                notes=payment_data.get('notes'),
                created_by=request.current_user.id if hasattr(request, 'current_user') else None
            )
            
            db.session.add(payment)
            created_payments.append(payment)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'payments': [p.to_dict() for p in created_payments],
            'count': len(created_payments)
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@billing_mgmt_bp.route('/daily-summary', methods=['GET'])
@token_required
@role_required(['Billing Staff', 'System Administrator'])
def get_daily_summary():
    """Get daily summary report"""
    try:
        report_date = request.args.get('date')
        if not report_date:
            report_date = date.today()
        else:
            report_date = datetime.fromisoformat(report_date).date() if isinstance(report_date, str) else report_date
        
        # Get charges for the day
        charges = Charge.query.filter_by(charge_date=report_date).all()
        
        # Get payments for the day
        payments = Payment.query.filter_by(payment_date=report_date).all()
        
        # Calculate totals by payment method
        payment_by_method = {}
        for payment in payments:
            method = payment.payment_method or 'cash'
            if method not in payment_by_method:
                payment_by_method[method] = 0
            payment_by_method[method] += float(payment.amount)
        
        summary = {
            'date': report_date.isoformat() if isinstance(report_date, date) else report_date,
            'total_charges': sum(float(c.total_amount) for c in charges),
            'total_payments': sum(float(p.amount) for p in payments),
            'charges_count': len(charges),
            'payments_count': len(payments),
            'payments_by_method': payment_by_method,
            'charges': [c.to_dict() for c in charges],
            'payments': [p.to_dict() for p in payments]
        }
        
        return jsonify({'success': True, 'summary': summary}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

