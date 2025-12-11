/**
 * Payment Processing Service
 * Integrates with payment gateways (Stripe, Paystack, Flutterwave, etc.)
 */

const PAYMENT_GATEWAY = import.meta.env.VITE_PAYMENT_GATEWAY || 'paystack';

class PaymentService {
  constructor() {
    this.gateway = PAYMENT_GATEWAY;
  }

  /**
   * Initialize payment
   */
  async initializePayment(amount, currency, description, metadata = {}) {
    try {
      const response = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          amount,
          currency,
          description,
          metadata,
          gateway: this.gateway
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error(`Payment initialization failed: ${error.message}`);
    }
  }

  /**
   * Verify payment
   */
  async verifyPayment(reference) {
    try {
      const response = await fetch(`/api/payments/verify/${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }

  /**
   * Process subscription payment
   */
  async processSubscription(subscriptionId, amount, currency) {
    return this.initializePayment(
      amount,
      currency,
      'Insurance Premium Payment',
      { subscription_id: subscriptionId, type: 'insurance' }
    );
  }

  /**
   * Process professional token payment
   */
  async processTokenPayment(tokenId, amount, currency) {
    return this.initializePayment(
      amount,
      currency,
      'Professional Token Fee',
      { token_id: tokenId, type: 'professional_token' }
    );
  }

  /**
   * Process passenger accident cover payment
   */
  async processAccidentCover(amount, currency, tripReference) {
    return this.initializePayment(
      amount,
      currency,
      'Passenger Accident Cover',
      { trip_reference: tripReference, type: 'accident_cover' }
    );
  }
}

export const paymentService = new PaymentService();
export default PaymentService;

