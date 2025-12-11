"""
Micro-Insurance Platform API Routes
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.auth.tenant_middleware import tenant_isolation_required
from src.models.user import db
from src.models.insurance import (
    InsurancePlan, InsuranceSubscription, InsuranceClaim, 
    InsurancePayment, PassengerAccidentCover
)
from src.models.clinical import ClinicalEncounter
from src.models.billing import Charge
from datetime import datetime, date, timedelta
from decimal import Decimal
import uuid
import json

insurance_bp = Blueprint('insurance', __name__)

# Insurance Plans
@insurance_bp.route('/plans', methods=['GET'])
@token_required
def get_insurance_plans():
    """Get available insurance plans"""
    try:
        plan_type = request.args.get('plan_type')
        is_active = request.args.get('is_active', type=bool, default=True)
        
        query = InsurancePlan.query
        
        if plan_type:
            query = query.filter(InsurancePlan.plan_type == plan_type)
        if is_active is not None:
            query = query.filter(InsurancePlan.is_active == is_active)
        
        plans = query.all()
        
        return jsonify({
            'success': True,
            'plans': [p.to_dict() for p in plans]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Subscriptions
@insurance_bp.route('/subscriptions', methods=['POST'])
@token_required
def create_subscription():
    """Subscribe to an insurance plan"""
    try:
        data = request.get_json()
        plan = InsurancePlan.query.get_or_404(data['plan_id'])
        
        # Validate plan is active
        if not plan.is_active:
            return jsonify({'error': 'Plan is not active'}), 400
        
        # Calculate dates
        start_date = date.fromisoformat(data.get('start_date', date.today().isoformat()))
        
        if plan.premium_frequency == 'weekly':
            end_date = start_date + timedelta(weeks=1)
            next_payment_due = start_date + timedelta(weeks=1)
        elif plan.premium_frequency == 'monthly':
            end_date = start_date + timedelta(days=30)
            next_payment_due = start_date + timedelta(days=30)
        else:
            end_date = start_date + timedelta(days=365)
            next_payment_due = start_date + timedelta(days=365)
        
        subscription = InsuranceSubscription(
            subscription_id=f"SUB-{uuid.uuid4().hex[:12].upper()}",
            subscriber_id=data['subscriber_id'],
            plan_id=plan.id,
            covered_members=json.dumps(data.get('covered_members', [data['subscriber_id']])),
            start_date=start_date,
            end_date=end_date,
            renewal_date=end_date,
            premium_amount=plan.premium_amount,
            payment_status='pending',
            next_payment_due_date=next_payment_due,
            remaining_coverage=plan.coverage_amount
        )
        
        db.session.add(subscription)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'subscription': subscription.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@insurance_bp.route('/subscriptions', methods=['GET'])
@token_required
@tenant_isolation_required
def get_subscriptions():
    """Get insurance subscriptions"""
    try:
        subscriber_id = request.args.get('subscriber_id', type=int)
        plan_id = request.args.get('plan_id', type=int)
        status = request.args.get('status')
        
        query = InsuranceSubscription.query
        
        if subscriber_id:
            query = query.filter(InsuranceSubscription.subscriber_id == subscriber_id)
        if plan_id:
            query = query.filter(InsuranceSubscription.plan_id == plan_id)
        if status:
            query = query.filter(InsuranceSubscription.status == status)
        
        subscriptions = query.order_by(InsuranceSubscription.start_date.desc()).all()
        
        return jsonify({
            'success': True,
            'subscriptions': [s.to_dict() for s in subscriptions]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Payments
@insurance_bp.route('/subscriptions/<int:subscription_id>/pay', methods=['POST'])
@token_required
def pay_premium(subscription_id):
    """Pay insurance premium"""
    try:
        subscription = InsuranceSubscription.query.get_or_404(subscription_id)
        data = request.get_json()
        
        payment = InsurancePayment(
            payment_id=f"INSPAY-{uuid.uuid4().hex[:12].upper()}",
            subscription_id=subscription_id,
            subscriber_id=subscription.subscriber_id,
            payment_date=date.today(),
            payment_amount=subscription.premium_amount,
            payment_method=data.get('payment_method', 'credit_card'),
            payment_reference=data.get('payment_reference'),
            coverage_start_date=subscription.start_date,
            coverage_end_date=subscription.end_date,
            status='completed'
        )
        
        # Update subscription
        subscription.payment_status = 'active'
        subscription.last_payment_date = date.today()
        subscription.status = 'active'
        
        # Calculate next payment due
        if subscription.plan.premium_frequency == 'weekly':
            subscription.next_payment_due_date = date.today() + timedelta(weeks=1)
        elif subscription.plan.premium_frequency == 'monthly':
            subscription.next_payment_due_date = date.today() + timedelta(days=30)
        
        db.session.add(payment)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'payment': payment.to_dict(),
            'subscription': subscription.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Claims
@insurance_bp.route('/claims', methods=['POST'])
@token_required
@role_required(['admin', 'billing'])
def create_insurance_claim():
    """Create an insurance claim"""
    try:
        data = request.get_json()
        
        # Find active subscription
        subscription = InsuranceSubscription.query.filter(
            InsuranceSubscription.subscriber_id == data.get('subscriber_id'),
            InsuranceSubscription.status == 'active',
            InsuranceSubscription.start_date <= date.today(),
            db.or_(
                InsuranceSubscription.end_date >= date.today(),
                InsuranceSubscription.end_date.is_(None)
            )
        ).first()
        
        if not subscription:
            return jsonify({'error': 'No active subscription found'}), 400
        
        # Check if patient is covered
        covered_members = json.loads(subscription.covered_members)
        if data['patient_id'] not in covered_members:
            return jsonify({'error': 'Patient not covered under this subscription'}), 400
        
        # Check remaining coverage
        if subscription.remaining_coverage and float(subscription.remaining_coverage) < float(data['billed_amount']):
            return jsonify({
                'error': 'Insufficient coverage remaining',
                'remaining': float(subscription.remaining_coverage)
            }), 400
        
        claim = InsuranceClaim(
            claim_id=f"INS-{uuid.uuid4().hex[:12].upper()}",
            subscription_id=subscription.id,
            patient_id=data['patient_id'],
            encounter_id=data.get('encounter_id'),
            facility_id=data['facility_id'],
            claim_date=date.today(),
            service_type=data['service_type'],
            service_description=data.get('service_description'),
            billed_amount=Decimal(str(data['billed_amount'])),
            status='submitted',
            created_by=request.current_user.id
        )
        
        db.session.add(claim)
        db.session.flush()
        
        # Update subscription
        subscription.total_claims += 1
        subscription.total_claim_amount += claim.billed_amount
        if subscription.remaining_coverage:
            subscription.remaining_coverage -= claim.billed_amount
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'claim': claim.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@insurance_bp.route('/claims/<int:claim_id>/approve', methods=['POST'])
@token_required
@role_required(['admin', 'insurance_admin'])
def approve_claim(claim_id):
    """Approve an insurance claim"""
    try:
        claim = InsuranceClaim.query.get_or_404(claim_id)
        data = request.get_json()
        
        claim.status = 'approved'
        claim.approved_amount = Decimal(str(data.get('approved_amount', claim.billed_amount)))
        claim.review_date = datetime.utcnow()
        
        # Auto-pay if approved
        if data.get('auto_pay', True):
            claim.status = 'paid'
            claim.paid_amount = claim.approved_amount
            claim.payment_date = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'claim': claim.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Passenger Accident Cover
@insurance_bp.route('/passenger-accident-cover', methods=['POST'])
@token_required
def create_passenger_accident_cover():
    """Create passenger accident cover for a trip"""
    try:
        data = request.get_json()
        
        # Calculate coverage period (typically trip duration + 24 hours)
        trip_start = datetime.fromisoformat(data['trip_start'])
        trip_end = datetime.fromisoformat(data.get('trip_end', data['trip_start']))
        coverage_end = trip_end + timedelta(hours=24)
        
        cover = PassengerAccidentCover(
            cover_id=f"PAC-{uuid.uuid4().hex[:12].upper()}",
            passenger_id=data['passenger_id'],
            trip_reference=data['trip_reference'],
            trip_date=trip_start.date(),
            trip_origin=data.get('trip_origin'),
            trip_destination=data.get('trip_destination'),
            coverage_amount=Decimal('2000000'),  # ₦2,000,000
            premium_paid=Decimal('500'),  # ₦500
            coverage_start_time=trip_start,
            coverage_end_time=coverage_end,
            status='active'
        )
        
        db.session.add(cover)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'cover': cover.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@insurance_bp.route('/passenger-accident-cover/<int:cover_id>/claim', methods=['POST'])
@token_required
def claim_passenger_accident(cover_id):
    """File a claim for passenger accident cover"""
    try:
        cover = PassengerAccidentCover.query.get_or_404(cover_id)
        
        if cover.status != 'active':
            return jsonify({'error': 'Cover is not active'}), 400
        
        if datetime.utcnow() > cover.coverage_end_time:
            return jsonify({'error': 'Coverage period has expired'}), 400
        
        data = request.get_json()
        
        # Create insurance claim
        claim = InsuranceClaim(
            claim_id=f"PAC-CLM-{uuid.uuid4().hex[:12].upper()}",
            subscription_id=None,  # Passenger accident is standalone
            patient_id=cover.passenger_id,
            encounter_id=data.get('encounter_id'),
            facility_id=data['facility_id'],
            claim_date=date.today(),
            service_type='emergency_trauma',
            service_description='Passenger accident emergency care',
            billed_amount=Decimal(str(data['billed_amount'])),
            status='submitted'
        )
        
        cover.claim_id = claim.id
        cover.status = 'claimed'
        
        db.session.add(claim)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'claim': claim.to_dict(),
            'cover': cover.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

