"""
Payment Processing API Routes for Clinic+
Handles payment processing for appointments and other services
"""
from flask import Blueprint, request, jsonify
from src.auth.jwt_manager import token_required, role_required
from src.middleware.hipaa_audit import hipaa_audit_required, log_user_action
from src.models.user import db
from src.models.billing import Payment
from src.models.scheduling import Appointment
from src.models.patient import Patient
from src.models.todo2_support import WebhookIdempotency
from src.services.payment_gateway import payment_gateway_service
from datetime import datetime
from decimal import Decimal
import uuid
import os

payments_bp = Blueprint('payments', __name__)

@payments_bp.route('/process', methods=['POST'])
@token_required
@role_required(['patient', 'physician', 'nurse', 'admin', 'receptionist'])
def process_payment():
    """Process a payment for an appointment or service"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['patient_id', 'amount', 'payment_method']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        patient_id = data['patient_id']
        amount = float(data['amount'])
        if amount <= 0:
            return jsonify({'error': 'Amount must be greater than zero'}), 400
        payment_method = data['payment_method']
        appointment_id = data.get('appointment_id')
        invoice_id = data.get('invoice_id')
        
        # Validate patient exists
        patient = Patient.query.get_or_404(patient_id)
        
        # For patients, ensure they can only pay for their own appointments
        user_roles = [role['role_name'] for role in request.token_payload.get('roles', [])]
        user_type = request.token_payload.get('user_type', '').lower()
        
        if user_type == 'patient' or 'Patient' in user_roles:
            # Verify patient is paying for their own appointment
            if appointment_id:
                appointment = Appointment.query.get(appointment_id)
                if appointment and appointment.patient_id != patient_id:
                    return jsonify({'error': 'You can only pay for your own appointments'}), 403
        
        # Process payment based on method
        payment_status = 'pending'
        transaction_id = f"TXN-{uuid.uuid4().hex[:12].upper()}"
        
        # Resolve facility context from token -> appointment -> patient -> explicit payload
        facility_id = request.token_payload.get('facility_id')
        if appointment_id:
            appointment = Appointment.query.get(appointment_id)
            if appointment:
                facility_id = appointment.facility_id
        if not facility_id:
            facility_id = patient.facility_id
        if not facility_id:
            facility_id = data.get('facility_id')
        if not facility_id:
            return jsonify({'error': 'Facility context is required'}), 400
        
        # Determine payment gateway
        gateway = data.get('gateway', 'paystack')  # Default to Paystack
        gateway_map = {
            'card': gateway,
            'bank_transfer': gateway,
            'wallet': gateway
        }
        selected_gateway = gateway_map.get(payment_method, gateway)
        
        # Get patient email for payment gateway
        patient_email = patient.email or data.get('email')
        if not patient_email:
            return jsonify({'error': 'Patient email is required for payment processing'}), 400
        
        # Initialize payment with gateway
        if payment_method == 'card':
            # Use payment gateway
            metadata = {
                'patient_id': patient_id,
                'appointment_id': appointment_id,
                'invoice_id': invoice_id,
                'customer_name': f"{patient.first_name} {patient.last_name}",
                'description': f"Payment for appointment {appointment_id}" if appointment_id else "Service payment"
            }
            
            callback_url = f"{os.environ.get('BASE_URL', 'http://localhost:4300')}/api/payments/verify/{selected_gateway}"
            
            success, gateway_response = payment_gateway_service.initialize_payment(
                gateway=selected_gateway,
                amount=Decimal(str(amount)),
                email=patient_email,
                reference=transaction_id,
                metadata=metadata,
                callback_url=callback_url
            )
            
            if success:
                payment_status = 'pending'  # Will be updated after verification
                # Stripe verification uses PaymentIntent id, not our TXN reference
                if selected_gateway.lower() == 'stripe' and gateway_response.get('payment_intent_id'):
                    reference_number = gateway_response['payment_intent_id']
                else:
                    reference_number = gateway_response.get('reference', transaction_id)
                authorization_url = gateway_response.get('authorization_url') or gateway_response.get('link') or gateway_response.get('client_secret')
            else:
                return jsonify({
                    'error': gateway_response.get('error', 'Payment initialization failed'),
                    'details': gateway_response
                }), 400
        elif payment_method == 'bank_transfer':
            payment_status = 'pending'
            reference_number = data.get('payment_details', {}).get('account_number', transaction_id)
            authorization_url = None
        elif payment_method == 'wallet':
            # Wallet payments are typically instant
            payment_status = 'completed'
            reference_number = transaction_id
            authorization_url = None
        else:
            return jsonify({'error': 'Invalid payment method'}), 400
        
        # Create payment record
        payment = Payment(
            payment_id=f"PAY-{uuid.uuid4().hex[:12].upper()}",
            patient_id=patient_id,
            facility_id=facility_id,
            payment_amount=amount,
            payment_method=payment_method,
            status=payment_status,
            reference_number=reference_number,
            payment_date=datetime.utcnow().date(),
            created_by=request.current_user.id
        )
        
        db.session.add(payment)
        db.session.flush()  # Get payment ID
        
        # Update appointment status if payment is for appointment
        if appointment_id and payment_status == 'completed':
            appointment = Appointment.query.get(appointment_id)
            if appointment:
                appointment.status = 'confirmed'
                # Note: Appointment model may not have payment_status field
                # We'll store payment reference in appointment notes or separate table
        
        db.session.commit()
        
        payment_dict = payment.to_dict()
        payment_dict['transaction_id'] = transaction_id
        
        # Log payment action
        log_user_action(
            action_type='payment_initiated',
            resource_type='payment',
            resource_id=payment.id,
            details={
                'amount': str(amount),
                'method': payment_method,
                'gateway': selected_gateway,
                'status': payment_status
            }
        )
        
        response_data = {
            'success': True,
            'payment': payment_dict,
            'message': 'Payment processed successfully' if payment_status == 'completed' else 'Payment pending confirmation'
        }
        
        # Include authorization URL for card payments
        if payment_method == 'card' and authorization_url:
            response_data['authorization_url'] = authorization_url
            response_data['payment_intent'] = gateway_response.get('payment_intent_id')
            response_data['client_secret'] = gateway_response.get('client_secret')
        
        return jsonify(response_data), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


def _resolve_verify_reference(gateway: str, data: dict):
    """reference / payment_intent from JSON body or query (callbacks)."""
    ref = (data or {}).get('reference') or (data or {}).get('trxref')
    pi = (data or {}).get('payment_intent_id') or (data or {}).get('payment_intent')
    if not ref and request.args:
        ref = request.args.get('reference') or request.args.get('trxref')
        pi = pi or request.args.get('payment_intent')
    g = (gateway or '').lower()
    if g == 'stripe' and pi:
        return None, pi
    return ref, pi


@payments_bp.route('/verify/<gateway>', methods=['GET', 'POST'])
def verify_gateway_payment(gateway):
    """Confirm payment with Paystack / Flutterwave / Stripe. GET supports redirect callbacks (reference in query)."""
    try:
        data = request.get_json(silent=True) or {}
        reference, payment_intent_id = _resolve_verify_reference(gateway, data)

        if gateway.lower() == 'stripe' and not payment_intent_id:
            payment_intent_id = reference
            reference = None

        verify_id = payment_intent_id or reference
        if not verify_id:
            return jsonify({'error': 'reference or payment_intent_id required'}), 400

        ok, result = payment_gateway_service.verify_payment(gateway, verify_id)
        if not ok:
            return jsonify({'success': False, 'verification': result}), 400

        payment = None
        if reference:
            payment = Payment.query.filter_by(reference_number=reference).first()
        if not payment and payment_intent_id:
            payment = Payment.query.filter_by(reference_number=payment_intent_id).first()
        if payment and payment.status == 'pending':
            payment.status = 'completed'
            db.session.commit()

        return jsonify({
            'success': True,
            'verification': result,
            'payment_updated': bool(payment and payment.status == 'completed'),
            'payment_id': payment.payment_id if payment else None,
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@payments_bp.route('/refund', methods=['POST'])
@token_required
@role_required(['admin', 'receptionist', 'physician'])
def refund_payment():
    """Refund a completed card/gateway payment (partial amount optional)."""
    try:
        data = request.get_json() or {}
        payment_id = data.get('payment_id')
        gateway = (data.get('gateway') or 'paystack').lower()
        amount = data.get('amount')
        payment_intent_id = data.get('payment_intent_id')

        if not payment_id:
            return jsonify({'error': 'payment_id is required'}), 400

        payment = Payment.query.filter_by(payment_id=payment_id).first_or_404()
        if payment.status != 'completed':
            return jsonify({'error': 'Only completed payments can be refunded'}), 400

        ref = payment.reference_number
        if not ref:
            return jsonify({'error': 'Payment has no gateway reference stored'}), 400

        amt = Decimal(str(amount)) if amount is not None else None
        ok, res = payment_gateway_service.create_refund(
            gateway,
            ref,
            amt,
            payment_intent_id=payment_intent_id,
        )
        if not ok:
            return jsonify({'success': False, 'error': res.get('error', 'Refund failed'), 'details': res}), 400

        payment.status = 'refunded'
        db.session.commit()
        log_user_action(
            action_type='payment_refunded',
            resource_type='payment',
            resource_id=payment.id,
            details={'gateway': gateway, 'amount': str(amt) if amt else 'full'},
        )
        return jsonify({'success': True, 'payment': payment.to_dict(), 'gateway': res}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@payments_bp.route('/history/<int:patient_id>', methods=['GET'])
@token_required
@role_required(['patient', 'physician', 'nurse', 'admin', 'receptionist'])
def get_payment_history(patient_id):
    """Get payment history for a patient"""
    try:
        # Verify patient access
        user_roles = [role['role_name'] for role in request.token_payload.get('roles', [])]
        user_type = request.token_payload.get('user_type', '').lower()
        
        if user_type == 'patient' or 'Patient' in user_roles:
            # Patients can only view their own payments
            if request.current_user.patient_id != patient_id:
                return jsonify({'error': 'You can only view your own payment history'}), 403
        
        payments = Payment.query.filter_by(patient_id=patient_id)\
            .order_by(Payment.payment_date.desc()).all()
        
        return jsonify({
            'success': True,
            'payments': [p.to_dict() if hasattr(p, 'to_dict') else {} for p in payments],
            'total': len(payments)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@payments_bp.route('/<payment_id>/receipt', methods=['GET'])
@token_required
@role_required(['patient', 'physician', 'nurse', 'admin', 'receptionist'])
def get_payment_receipt(payment_id):
    """Structured receipt for a payment (JSON)."""
    try:
        payment = Payment.query.filter_by(payment_id=payment_id).first_or_404()
        user_roles = [role['role_name'] for role in request.token_payload.get('roles', [])]
        user_type = request.token_payload.get('user_type', '').lower()
        if user_type == 'patient' or 'Patient' in user_roles:
            if payment.patient_id != request.current_user.patient_id:
                return jsonify({'error': 'Access denied'}), 403

        patient = Patient.query.get(payment.patient_id)
        receipt = {
            'receipt_id': payment.payment_id,
            'issued_at': datetime.utcnow().isoformat() + 'Z',
            'status': payment.status,
            'amount': float(payment.payment_amount) if payment.payment_amount else None,
            'method': payment.payment_method,
            'reference': payment.reference_number,
            'patient': {
                'id': patient.id,
                'name': f'{patient.first_name} {patient.last_name}'.strip() if patient else None,
            } if patient else None,
            'facility_id': payment.facility_id,
        }
        return jsonify({'success': True, 'receipt': receipt}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@payments_bp.route('/<payment_id>', methods=['GET'])
@token_required
@role_required(['patient', 'physician', 'nurse', 'admin', 'receptionist'])
def get_payment(payment_id):
    """Get payment details by payment ID"""
    try:
        payment = Payment.query.filter_by(payment_id=payment_id).first_or_404()
        
        # Verify access
        user_roles = [role['role_name'] for role in request.token_payload.get('roles', [])]
        user_type = request.token_payload.get('user_type', '').lower()
        
        if user_type == 'patient' or 'Patient' in user_roles:
            if payment.patient_id != request.current_user.patient_id:
                return jsonify({'error': 'Access denied'}), 403
        
        return jsonify({
            'success': True,
            'payment': payment.to_dict() if hasattr(payment, 'to_dict') else {}
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@payments_bp.route('/webhooks/stripe', methods=['POST'])
def stripe_webhook():
    """Verify Stripe signature, idempotent processing, mark Payment completed on payment_intent.succeeded."""
    wh_secret = os.environ.get('STRIPE_WEBHOOK_SECRET', '').strip()
    if not wh_secret:
        return jsonify({'error': 'STRIPE_WEBHOOK_SECRET not configured (webhook disabled)'}), 501
    try:
        import stripe
    except ImportError:
        return jsonify({'error': 'stripe package required'}), 500
    payload = request.get_data()
    sig = request.headers.get('Stripe-Signature', '')
    try:
        event = stripe.Webhook.construct_event(payload, sig, wh_secret)
    except ValueError:
        return jsonify({'error': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError:
        return jsonify({'error': 'Invalid signature'}), 400

    eid = event.get('id') or ''
    if WebhookIdempotency.query.filter_by(event_id=eid, provider='stripe').first():
        return jsonify({'ok': True, 'duplicate': True}), 200

    row = WebhookIdempotency(provider='stripe', event_id=eid, note=(event.get('type') or '')[:200])
    db.session.add(row)
    if event.get('type') == 'payment_intent.succeeded':
        obj = (event.get('data') or {}).get('object') or {}
        pi = obj.get('id')
        if pi:
            pay = Payment.query.filter_by(reference_number=pi).first()
            if pay and pay.status == 'pending':
                pay.status = 'completed'
    db.session.commit()
    return jsonify({'ok': True, 'type': event.get('type')}), 200
