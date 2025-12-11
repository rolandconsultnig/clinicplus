"""
Electronic Billing & Claims API Routes
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.auth.tenant_middleware import tenant_isolation_required
from src.models.user import db
from src.models.billing import (
    BillingCode, FeeSchedule, FeeScheduleItem, Charge, Claim, 
    ClaimItem, Payment, PaymentAllocation, Statement
)
from src.models.auth import AuditLog
from datetime import datetime, date, timedelta
from decimal import Decimal
import uuid
import json

billing_bp = Blueprint('billing', __name__)

# Billing Codes
@billing_bp.route('/billing-codes', methods=['GET'])
@token_required
def get_billing_codes():
    """Get billing codes"""
    try:
        code_type = request.args.get('code_type')  # CPT4, ICD10, HCPCS
        search = request.args.get('search')
        
        query = BillingCode.query.filter(BillingCode.is_active == True)
        
        if code_type:
            query = query.filter(BillingCode.code_type == code_type)
        if search:
            query = query.filter(
                db.or_(
                    BillingCode.code.contains(search),
                    BillingCode.description.contains(search)
                )
            )
        
        codes = query.limit(100).all()
        
        return jsonify({
            'success': True,
            'codes': [c.to_dict() for c in codes]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Charges
@billing_bp.route('/charges', methods=['POST'])
@token_required
@role_required(['physician', 'admin', 'billing'])
def create_charge():
    """Create a charge"""
    try:
        data = request.get_json()
        
        charge = Charge(
            charge_id=f"CHG-{uuid.uuid4().hex[:12].upper()}",
            patient_id=data['patient_id'],
            encounter_id=data.get('encounter_id'),
            facility_id=data['facility_id'],
            charge_date=date.fromisoformat(data.get('charge_date', date.today().isoformat())),
            billing_code_id=data['billing_code_id'],
            quantity=data.get('quantity', 1),
            unit_price=Decimal(str(data['unit_price'])),
            total_amount=Decimal(str(data['unit_price'])) * data.get('quantity', 1),
            created_by=request.current_user.id
        )
        
        db.session.add(charge)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'charge': charge.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@billing_bp.route('/charges', methods=['GET'])
@token_required
@tenant_isolation_required
def get_charges():
    """Get charges"""
    try:
        patient_id = request.args.get('patient_id', type=int)
        encounter_id = request.args.get('encounter_id', type=int)
        facility_id = request.args.get('facility_id', type=int)
        
        query = Charge.query
        
        if patient_id:
            query = query.filter(Charge.patient_id == patient_id)
        if encounter_id:
            query = query.filter(Charge.encounter_id == encounter_id)
        if facility_id:
            query = query.filter(Charge.facility_id == facility_id)
        
        charges = query.order_by(Charge.charge_date.desc()).all()
        
        return jsonify({
            'success': True,
            'charges': [c.to_dict() for c in charges]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Claims
@billing_bp.route('/claims', methods=['POST'])
@token_required
@role_required(['admin', 'billing'])
def create_claim():
    """Create a claim"""
    try:
        data = request.get_json()
        
        # Calculate total from charges
        charge_ids = data.get('charge_ids', [])
        charges = Charge.query.filter(Charge.id.in_(charge_ids)).all()
        total_amount = sum(float(c.total_amount) for c in charges)
        
        claim = Claim(
            claim_id=f"CLM-{uuid.uuid4().hex[:12].upper()}",
            patient_id=data['patient_id'],
            facility_id=data['facility_id'],
            claim_type=data.get('claim_type', 'primary'),
            claim_format=data.get('claim_format', '837P'),
            total_charge_amount=Decimal(str(total_amount)),
            insurance_provider=data.get('insurance_provider'),
            insurance_policy_number=data.get('insurance_policy_number'),
            subscriber_id=data.get('subscriber_id'),
            created_by=request.current_user.id
        )
        
        db.session.add(claim)
        db.session.flush()
        
        # Create claim items
        for idx, charge in enumerate(charges, 1):
            claim_item = ClaimItem(
                claim_id=claim.id,
                charge_id=charge.id,
                line_number=idx,
                procedure_code=charge.billing_code.code if charge.billing_code else None,
                charge_amount=charge.total_amount
            )
            db.session.add(claim_item)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'claim': claim.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@billing_bp.route('/claims/<int:claim_id>/submit', methods=['POST'])
@token_required
@role_required(['admin', 'billing'])
def submit_claim(claim_id):
    """Submit claim electronically"""
    try:
        claim = Claim.query.get_or_404(claim_id)
        claim.status = 'submitted'
        claim.submission_date = datetime.utcnow()
        
        # Generate EDI file
        from src.services.edi_service import edi_service
        from src.models.patient import Patient
        from src.models.provider import Provider
        from src.models.provider import Facility
        
        patient = Patient.query.get(claim.patient_id)
        facility = Facility.query.get(claim.facility_id)
        
        # Get provider from first charge's encounter
        provider = None
        claim_items = claim.claim_items
        if claim_items:
            first_charge = Charge.query.get(claim_items[0].charge_id)
            if first_charge and first_charge.encounter_id:
                from src.models.clinical import ClinicalEncounter
                encounter = ClinicalEncounter.query.get(first_charge.encounter_id)
                if encounter:
                    provider = Provider.query.get(encounter.provider_id)
        
        # Fallback: get any provider from facility
        if not provider and facility:
            provider_facility = ProviderFacility.query.filter_by(facility_id=facility.id).first()
            if provider_facility:
                provider = Provider.query.get(provider_facility.provider_id)
        
        if patient and facility:
            # Generate 837P EDI file
            edi_content = edi_service.generate_837p(claim, patient, provider, facility)
            edi_file_path = edi_service.save_edi_file(edi_content, claim.claim_id, '837P')
            
            claim.edi_transaction_id = f"EDI-{uuid.uuid4().hex[:16].upper()}"
            claim.edi_file_path = edi_file_path
            
            # Also generate HCFA 1500 format
            hcfa_content = edi_service.generate_hcfa1500(claim, patient, provider, facility)
            hcfa_file_path = edi_service.save_edi_file(hcfa_content, claim.claim_id, 'HCFA1500')
            claim.hcfa_file_path = hcfa_file_path
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'claim': claim.to_dict(),
            'message': 'Claim submitted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Payments
@billing_bp.route('/payments', methods=['POST'])
@token_required
@role_required(['admin', 'billing', 'receptionist'])
def create_payment():
    """Record a payment"""
    try:
        data = request.get_json()
        
        payment = Payment(
            payment_id=f"PAY-{uuid.uuid4().hex[:12].upper()}",
            patient_id=data['patient_id'],
            facility_id=data['facility_id'],
            payment_date=date.fromisoformat(data.get('payment_date', date.today().isoformat())),
            payment_method=data['payment_method'],
            payment_amount=Decimal(str(data['payment_amount'])),
            reference_number=data.get('reference_number'),
            check_number=data.get('check_number'),
            created_by=request.current_user.id
        )
        
        db.session.add(payment)
        db.session.flush()
        
        # Allocate payment to charges
        allocations = data.get('allocations', [])
        for alloc in allocations:
            allocation = PaymentAllocation(
                payment_id=payment.id,
                charge_id=alloc['charge_id'],
                allocated_amount=Decimal(str(alloc['amount']))
            )
            db.session.add(allocation)
            
            # Update charge status
            charge = Charge.query.get(alloc['charge_id'])
            if charge:
                charge.status = 'paid'
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'payment': payment.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Statements
@billing_bp.route('/statements', methods=['GET'])
@token_required
@tenant_isolation_required
def get_statements():
    """Get patient statements"""
    try:
        patient_id = request.args.get('patient_id', type=int)
        facility_id = request.args.get('facility_id', type=int)
        
        query = Statement.query
        
        if patient_id:
            query = query.filter(Statement.patient_id == patient_id)
        if facility_id:
            query = query.filter(Statement.facility_id == facility_id)
        
        statements = query.order_by(Statement.statement_date.desc()).all()
        
        return jsonify({
            'success': True,
            'statements': [s.to_dict() for s in statements]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@billing_bp.route('/statements', methods=['POST'])
@token_required
@role_required(['admin', 'billing'])
def generate_statement():
    """Generate a patient statement"""
    try:
        data = request.get_json()
        patient_id = data['patient_id']
        facility_id = data['facility_id']
        
        # Get unpaid charges
        charges = Charge.query.filter(
            Charge.patient_id == patient_id,
            Charge.facility_id == facility_id,
            Charge.status.in_(['pending', 'billed'])
        ).all()
        
        total_charges = sum(float(c.total_amount) for c in charges)
        
        # Get payments
        payments = Payment.query.filter(
            Payment.patient_id == patient_id,
            Payment.facility_id == facility_id
        ).all()
        total_payments = sum(float(p.payment_amount) for p in payments)
        
        balance_due = total_charges - total_payments
        
        statement = Statement(
            statement_id=f"STMT-{uuid.uuid4().hex[:12].upper()}",
            patient_id=patient_id,
            facility_id=facility_id,
            statement_date=date.today(),
            due_date=date.today() + timedelta(days=30),
            total_charges=Decimal(str(total_charges)),
            total_payments=Decimal(str(total_payments)),
            balance_due=Decimal(str(balance_due)),
            status='open' if balance_due > 0 else 'paid',
            created_by=request.current_user.id
        )
        
        db.session.add(statement)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'statement': statement.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Reports
@billing_bp.route('/reports', methods=['GET'])
@token_required
@tenant_isolation_required
def get_billing_reports():
    """Get financial reports for billing"""
    try:
        period = request.args.get('period', 'month')  # month, quarter, year
        facility_id = request.args.get('facility_id', type=int)
        
        # Get facility_id from token if not provided
        if not facility_id:
            facility_id = request.token_payload.get('facility_id')
        
        # Calculate date range based on period
        today = date.today()
        if period == 'month':
            start_date = date(today.year, today.month, 1)
            end_date = today
        elif period == 'quarter':
            quarter = (today.month - 1) // 3
            start_date = date(today.year, quarter * 3 + 1, 1)
            end_date = today
        else:  # year
            start_date = date(today.year, 1, 1)
            end_date = today
        
        # Get charges (revenue)
        charges_query = Charge.query.filter(
            Charge.facility_id == facility_id,
            Charge.charge_date >= start_date,
            Charge.charge_date <= end_date
        )
        charges = charges_query.all()
        total_revenue = sum(float(c.total_amount) for c in charges)
        
        # Get previous period for comparison
        if period == 'month':
            prev_start = date(today.year, today.month - 1, 1) if today.month > 1 else date(today.year - 1, 12, 1)
            prev_end = date(today.year, today.month - 1, 
                           (date(today.year, today.month, 1) - timedelta(days=1)).day) if today.month > 1 else date(today.year - 1, 12, 31)
        elif period == 'quarter':
            quarter = (today.month - 1) // 3
            if quarter > 0:
                prev_start = date(today.year, (quarter - 1) * 3 + 1, 1)
                prev_end = date(today.year, quarter * 3, 
                               (date(today.year, quarter * 3 + 1, 1) - timedelta(days=1)).day)
            else:
                prev_start = date(today.year - 1, 10, 1)
                prev_end = date(today.year - 1, 12, 31)
        else:
            prev_start = date(today.year - 1, 1, 1)
            prev_end = date(today.year - 1, 12, 31)
        
        prev_charges = Charge.query.filter(
            Charge.facility_id == facility_id,
            Charge.charge_date >= prev_start,
            Charge.charge_date <= prev_end
        ).all()
        prev_revenue = sum(float(c.total_amount) for c in prev_charges)
        
        revenue_change = ((total_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0
        
        # Get payments
        payments_query = Payment.query.filter(
            Payment.facility_id == facility_id,
            Payment.payment_date >= start_date,
            Payment.payment_date <= end_date
        )
        payments = payments_query.all()
        total_payments = sum(float(p.payment_amount) for p in payments)
        
        prev_payments = Payment.query.filter(
            Payment.facility_id == facility_id,
            Payment.payment_date >= prev_start,
            Payment.payment_date <= prev_end
        ).all()
        prev_payments_total = sum(float(p.payment_amount) for p in prev_payments)
        
        expense_change = ((total_payments - prev_payments_total) / prev_payments_total * 100) if prev_payments_total > 0 else 0
        
        # Calculate net profit
        net_profit = total_revenue - total_payments
        prev_profit = prev_revenue - prev_payments_total
        profit_change = ((net_profit - prev_profit) / prev_profit * 100) if prev_profit > 0 else 0
        
        # Generate monthly breakdown for charts
        months = []
        current = start_date
        while current <= end_date:
            month_start = date(current.year, current.month, 1)
            if period == 'month':
                month_end = today if current.month == today.month else date(current.year, current.month + 1, 1) - timedelta(days=1)
            else:
                month_end = date(current.year, current.month + 1, 1) - timedelta(days=1)
            
            month_charges = Charge.query.filter(
                Charge.facility_id == facility_id,
                Charge.charge_date >= month_start,
                Charge.charge_date <= month_end
            ).all()
            month_revenue = sum(float(c.total_amount) for c in month_charges)
            
            month_payments = Payment.query.filter(
                Payment.facility_id == facility_id,
                Payment.payment_date >= month_start,
                Payment.payment_date <= month_end
            ).all()
            month_expenses = sum(float(p.payment_amount) for p in month_payments)
            
            months.append({
                'month': month_start.strftime('%b'),
                'amount': float(month_revenue),
                'claims': len(month_charges),
                'expenses': float(month_expenses),
                'category': 'Revenue'
            })
            
            if period == 'month':
                break
            current = date(current.year, current.month + 1, 1)
        
        # Payment methods breakdown
        payment_methods = {}
        for payment in payments:
            method = payment.payment_method or 'Other'
            if method not in payment_methods:
                payment_methods[method] = {'count': 0, 'amount': Decimal('0')}
            payment_methods[method]['count'] += 1
            payment_methods[method]['amount'] += payment.payment_amount
        
        total_payment_amount = sum(float(pm['amount']) for pm in payment_methods.values())
        payment_methods_list = []
        for method, data in payment_methods.items():
            percentage = (float(data['amount']) / total_payment_amount * 100) if total_payment_amount > 0 else 0
            payment_methods_list.append({
                'name': method,
                'value': round(percentage, 1),
                'amount': float(data['amount'])
            })
        
        # Outstanding balances
        statements = Statement.query.filter(
            Statement.facility_id == facility_id,
            Statement.status == 'open'
        ).all()
        total_outstanding = sum(float(s.balance_due) for s in statements)
        overdue_outstanding = sum(float(s.balance_due) for s in statements if s.due_date < today)
        current_outstanding = total_outstanding - overdue_outstanding
        
        return jsonify({
            'success': True,
            'data': {
                'summary': {
                    'totalRevenue': float(total_revenue),
                    'totalExpenses': float(total_payments),
                    'netProfit': float(net_profit),
                    'revenueChange': round(revenue_change, 1),
                    'expenseChange': round(expense_change, 1),
                    'profitChange': round(profit_change, 1)
                },
                'revenue': months,
                'expenses': [
                    {
                        'month': m['month'],
                        'amount': m['expenses'],
                        'category': 'Expenses'
                    }
                    for m in months
                ],
                'paymentMethods': payment_methods_list,
                'outstanding': {
                    'total': float(total_outstanding),
                    'overdue': float(overdue_outstanding),
                    'current': float(current_outstanding)
                }
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

