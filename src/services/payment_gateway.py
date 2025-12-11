"""
Payment Gateway Integration Service
Supports Paystack, Flutterwave, and Stripe
"""
import requests
import os
from decimal import Decimal
from typing import Dict, Optional, Tuple

class PaymentGatewayService:
    """Unified Payment Gateway Service"""
    
    def __init__(self):
        self.paystack_secret_key = os.environ.get('PAYSTACK_SECRET_KEY', '')
        self.flutterwave_secret_key = os.environ.get('FLUTTERWAVE_SECRET_KEY', '')
        self.stripe_secret_key = os.environ.get('STRIPE_SECRET_KEY', '')
        
        # API endpoints
        self.paystack_base_url = 'https://api.paystack.co'
        self.flutterwave_base_url = 'https://api.flutterwave.com/v3'
        self.stripe_base_url = 'https://api.stripe.com/v1'
    
    def initialize_payment(self, gateway: str, amount: Decimal, email: str, 
                         reference: str, metadata: Optional[Dict] = None,
                         callback_url: Optional[str] = None) -> Tuple[bool, Dict]:
        """
        Initialize payment with specified gateway
        
        Args:
            gateway: 'paystack', 'flutterwave', or 'stripe'
            amount: Payment amount
            email: Customer email
            reference: Unique transaction reference
            metadata: Additional metadata
            callback_url: Callback URL for payment verification
        
        Returns:
            Tuple of (success, response_data)
        """
        if gateway.lower() == 'paystack':
            return self._initialize_paystack(amount, email, reference, metadata, callback_url)
        elif gateway.lower() == 'flutterwave':
            return self._initialize_flutterwave(amount, email, reference, metadata, callback_url)
        elif gateway.lower() == 'stripe':
            return self._initialize_stripe(amount, email, reference, metadata, callback_url)
        else:
            return False, {'error': f'Unsupported gateway: {gateway}'}
    
    def _initialize_paystack(self, amount: Decimal, email: str, reference: str,
                           metadata: Optional[Dict], callback_url: Optional[str]) -> Tuple[bool, Dict]:
        """Initialize Paystack payment"""
        try:
            url = f'{self.paystack_base_url}/transaction/initialize'
            headers = {
                'Authorization': f'Bearer {self.paystack_secret_key}',
                'Content-Type': 'application/json'
            }
            
            payload = {
                'email': email,
                'amount': int(amount * 100),  # Convert to kobo (cents)
                'reference': reference,
                'callback_url': callback_url or f'{os.environ.get("BASE_URL", "")}/api/payments/verify/paystack',
                'metadata': metadata or {}
            }
            
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            if data.get('status'):
                return True, {
                    'authorization_url': data['data']['authorization_url'],
                    'access_code': data['data']['access_code'],
                    'reference': data['data']['reference']
                }
            else:
                return False, {'error': data.get('message', 'Payment initialization failed')}
                
        except requests.exceptions.RequestException as e:
            return False, {'error': f'Paystack API error: {str(e)}'}
        except Exception as e:
            return False, {'error': f'Payment initialization error: {str(e)}'}
    
    def _initialize_flutterwave(self, amount: Decimal, email: str, reference: str,
                              metadata: Optional[Dict], callback_url: Optional[str]) -> Tuple[bool, Dict]:
        """Initialize Flutterwave payment"""
        try:
            url = f'{self.flutterwave_base_url}/payments'
            headers = {
                'Authorization': f'Bearer {self.flutterwave_secret_key}',
                'Content-Type': 'application/json'
            }
            
            payload = {
                'tx_ref': reference,
                'amount': float(amount),
                'currency': metadata.get('currency', 'NGN') if metadata else 'NGN',
                'redirect_url': callback_url or f'{os.environ.get("BASE_URL", "")}/api/payments/verify/flutterwave',
                'payment_options': 'card, banktransfer, ussd, mobilemoney',
                'customer': {
                    'email': email,
                    'name': metadata.get('customer_name', '') if metadata else ''
                },
                'customizations': {
                    'title': metadata.get('title', 'Clinic+ Payment') if metadata else 'Clinic+ Payment',
                    'description': metadata.get('description', '') if metadata else ''
                },
                'meta': metadata or {}
            }
            
            response = requests.post(url, json=payload, headers=headers, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            if data.get('status') == 'success':
                return True, {
                    'link': data['data']['link'],
                    'reference': reference
                }
            else:
                return False, {'error': data.get('message', 'Payment initialization failed')}
                
        except requests.exceptions.RequestException as e:
            return False, {'error': f'Flutterwave API error: {str(e)}'}
        except Exception as e:
            return False, {'error': f'Payment initialization error: {str(e)}'}
    
    def _initialize_stripe(self, amount: Decimal, email: str, reference: str,
                         metadata: Optional[Dict], callback_url: Optional[str]) -> Tuple[bool, Dict]:
        """Initialize Stripe payment"""
        try:
            url = f'{self.stripe_base_url}/payment_intents'
            headers = {
                'Authorization': f'Bearer {self.stripe_secret_key}',
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            
            payload = {
                'amount': int(amount * 100),  # Convert to cents
                'currency': metadata.get('currency', 'usd') if metadata else 'usd',
                'payment_method_types[]': 'card',
                'receipt_email': email,
                'metadata[reference]': reference,
                'metadata[source]': 'clinicplus'
            }
            
            if metadata:
                for key, value in metadata.items():
                    if key not in ['currency', 'customer_name', 'title', 'description']:
                        payload[f'metadata[{key}]'] = str(value)
            
            response = requests.post(url, data=payload, headers=headers, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            if data.get('status') in ['requires_payment_method', 'requires_confirmation']:
                return True, {
                    'client_secret': data['client_secret'],
                    'payment_intent_id': data['id'],
                    'reference': reference
                }
            else:
                return False, {'error': 'Payment intent creation failed'}
                
        except requests.exceptions.RequestException as e:
            return False, {'error': f'Stripe API error: {str(e)}'}
        except Exception as e:
            return False, {'error': f'Payment initialization error: {str(e)}'}
    
    def verify_payment(self, gateway: str, reference: str) -> Tuple[bool, Dict]:
        """
        Verify payment status
        
        Args:
            gateway: 'paystack', 'flutterwave', or 'stripe'
            reference: Transaction reference
        
        Returns:
            Tuple of (success, verification_data)
        """
        if gateway.lower() == 'paystack':
            return self._verify_paystack(reference)
        elif gateway.lower() == 'flutterwave':
            return self._verify_flutterwave(reference)
        elif gateway.lower() == 'stripe':
            return self._verify_stripe(reference)
        else:
            return False, {'error': f'Unsupported gateway: {gateway}'}
    
    def _verify_paystack(self, reference: str) -> Tuple[bool, Dict]:
        """Verify Paystack payment"""
        try:
            url = f'{self.paystack_base_url}/transaction/verify/{reference}'
            headers = {
                'Authorization': f'Bearer {self.paystack_secret_key}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            if data.get('status') and data['data']['status'] == 'success':
                return True, {
                    'status': 'success',
                    'amount': Decimal(data['data']['amount']) / 100,
                    'currency': data['data']['currency'],
                    'paid_at': data['data']['paid_at'],
                    'reference': data['data']['reference'],
                    'gateway_response': data['data']['gateway_response'],
                    'customer': data['data']['customer']
                }
            else:
                return False, {
                    'status': 'failed',
                    'message': data.get('message', 'Payment verification failed')
                }
                
        except requests.exceptions.RequestException as e:
            return False, {'error': f'Paystack API error: {str(e)}'}
        except Exception as e:
            return False, {'error': f'Payment verification error: {str(e)}'}
    
    def _verify_flutterwave(self, reference: str) -> Tuple[bool, Dict]:
        """Verify Flutterwave payment"""
        try:
            url = f'{self.flutterwave_base_url}/transactions/{reference}/verify'
            headers = {
                'Authorization': f'Bearer {self.flutterwave_secret_key}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            if data.get('status') == 'success' and data['data']['status'] == 'successful':
                return True, {
                    'status': 'success',
                    'amount': Decimal(str(data['data']['amount'])),
                    'currency': data['data']['currency'],
                    'paid_at': data['data']['created_at'],
                    'reference': data['data']['tx_ref'],
                    'gateway_response': data['data'].get('processor_response', ''),
                    'customer': data['data']['customer']
                }
            else:
                return False, {
                    'status': 'failed',
                    'message': data.get('message', 'Payment verification failed')
                }
                
        except requests.exceptions.RequestException as e:
            return False, {'error': f'Flutterwave API error: {str(e)}'}
        except Exception as e:
            return False, {'error': f'Payment verification error: {str(e)}'}
    
    def _verify_stripe(self, payment_intent_id: str) -> Tuple[bool, Dict]:
        """Verify Stripe payment"""
        try:
            url = f'{self.stripe_base_url}/payment_intents/{payment_intent_id}'
            headers = {
                'Authorization': f'Bearer {self.stripe_secret_key}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            data = response.json()
            
            if data.get('status') == 'succeeded':
                return True, {
                    'status': 'success',
                    'amount': Decimal(data['amount']) / 100,
                    'currency': data['currency'],
                    'paid_at': data.get('charges', {}).get('data', [{}])[0].get('created'),
                    'reference': data['metadata'].get('reference', payment_intent_id),
                    'gateway_response': 'Payment succeeded',
                    'customer': data.get('receipt_email')
                }
            else:
                return False, {
                    'status': 'failed',
                    'message': f"Payment status: {data.get('status')}"
                }
                
        except requests.exceptions.RequestException as e:
            return False, {'error': f'Stripe API error: {str(e)}'}
        except Exception as e:
            return False, {'error': f'Payment verification error: {str(e)}'}

# Global instance
payment_gateway_service = PaymentGatewayService()

