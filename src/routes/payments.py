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
        
        # Get facility_id from appointment or use default
        facility_id = None
        if appointment_id:
            appointment = Appointment.query.get(appointment_id)
            if appointment:
                facility_id = appointment.facility_id
        
        if not facility_id:
            # Try to get from patient's default facility or use first available
            # For now, use a default facility_id (should be passed in request)
            facility_id = data.get('facility_id', 1)  # Default to facility 1
        
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
            
            callback_url = f"{os.environ.get('BASE_URL', 'http://localhost:5000')}/api/payments/verify/{selected_gateway}"
            
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
