# PCI DSS scope — Clinic+ payments (reference)

- **Card data**: Use hosted checkout or Stripe Elements; **never** post raw card numbers to this API. `POST /api/payments/process` with `payment_method: card` expects gateway redirect / PaymentIntent, not primary account numbers in JSON.
- **Webhooks**: Configure `STRIPE_WEBHOOK_SECRET`; verify signatures on `POST /api/payments/webhooks/stripe` only in production.
- **Secrets**: `STRIPE_SECRET_KEY`, `PAYSTACK_SECRET_KEY`, `FLUTTERWAVE_SECRET_KEY` are server-only environment variables. Do not commit.
- **SAQ type**: If all card data is accepted only by PCI-validated third parties (Stripe, etc.), the clinic typically qualifies for **SAQ A**; confirm with your QSA. This file is not legal or compliance advice.
