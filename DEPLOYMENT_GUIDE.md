# Clinic+ Deployment Guide

## Prerequisites

1. Python 3.9+
2. Node.js 18+
3. PostgreSQL (production) or SQLite (development)
4. Payment gateway accounts (Paystack, Stripe, or Flutterwave)
5. AI/ML service accounts (optional, for AI Consultation Room)

## Backend Deployment

### 1. Environment Setup

Create `.env` file:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost/clinicplus

# Flask
SECRET_KEY=your-secret-key-here
FLASK_ENV=production
FLASK_DEBUG=False

# Payment Gateways
PAYSTACK_PUBLIC_KEY=your-paystack-public-key
PAYSTACK_SECRET_KEY=your-paystack-secret-key
STRIPE_PUBLIC_KEY=your-stripe-public-key
STRIPE_SECRET_KEY=your-stripe-secret-key
FLUTTERWAVE_PUBLIC_KEY=your-flutterwave-public-key
FLUTTERWAVE_SECRET_KEY=your-flutterwave-secret-key

# AI Services (Optional)
GOOGLE_SPEECH_API_KEY=your-google-speech-key
OPENAI_API_KEY=your-openai-key
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Database Migration

```bash
# Apply all migrations
python -m alembic upgrade head

# Verify migration status
python -m alembic current
```

### 4. Run Application

**Development:**
```bash
python main.py
```

**Production (using Gunicorn):**
```bash
gunicorn -w 4 -b 0.0.0.0:5000 main:app
```

**Production (using Docker):**
```bash
docker build -t clinicplus .
docker run -p 5000:5000 --env-file .env clinicplus
```

## Frontend Deployment

### 1. Environment Setup

Create `.env` file in `src/`:
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_PAYMENT_GATEWAY=paystack
```

### 2. Install Dependencies

```bash
cd src
npm install
```

### 3. Build for Production

```bash
npm run build
```

### 4. Serve Static Files

The Flask app serves static files from the `static/` folder. After building:

```bash
# Copy build output to static folder
cp -r dist/* ../static/
```

## Payment Gateway Configuration

### Paystack (Recommended for Nigeria)

1. Sign up at https://paystack.com
2. Get API keys from dashboard
3. Set up webhook URL: `https://yourdomain.com/api/payments/callback/paystack`
4. Add keys to `.env` file

### Stripe

1. Sign up at https://stripe.com
2. Get API keys from dashboard
3. Set up webhook URL: `https://yourdomain.com/api/payments/callback/stripe`
4. Add keys to `.env` file

### Flutterwave

1. Sign up at https://flutterwave.com
2. Get API keys from dashboard
3. Set up webhook URL: `https://yourdomain.com/api/payments/callback/flutterwave`
4. Add keys to `.env` file

## AI/ML Service Integration

### Google Cloud Speech-to-Text

1. Create Google Cloud project
2. Enable Speech-to-Text API
3. Create service account and download credentials
4. Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable

### OpenAI (for documentation generation)

1. Sign up at https://openai.com
2. Get API key
3. Add to `.env` file

## Database Setup

### PostgreSQL (Production)

```sql
CREATE DATABASE clinicplus;
CREATE USER clinicplus_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE clinicplus TO clinicplus_user;
```

Update `DATABASE_URL` in `.env`:
```
DATABASE_URL=postgresql://clinicplus_user:your_password@localhost/clinicplus
```

## Security Checklist

- [ ] Change `SECRET_KEY` in production
- [ ] Enable HTTPS/SSL
- [ ] Set up CORS properly (restrict origins)
- [ ] Configure firewall rules
- [ ] Set up rate limiting
- [ ] Enable database backups
- [ ] Set up monitoring and logging
- [ ] Configure MFA for admin accounts
- [ ] Review and update API keys regularly

## Monitoring

### Health Check Endpoint

```bash
curl http://localhost:5000/api/health
```

### Logs

Application logs are written to stdout/stderr. For production, use:
- CloudWatch (AWS)
- Google Cloud Logging
- Datadog
- Sentry (error tracking)

## Scaling

### Horizontal Scaling

Use load balancer with multiple Gunicorn workers:
```bash
gunicorn -w 8 -b 0.0.0.0:5000 main:app
```

### Database Scaling

- Use read replicas for read-heavy operations
- Implement connection pooling
- Use Redis for caching

## Backup Strategy

1. **Database Backups**: Daily automated backups
2. **File Storage**: Backup uploaded documents
3. **Configuration**: Version control for `.env` files (without secrets)

## Troubleshooting

### Migration Issues

```bash
# Check current migration
python -m alembic current

# Rollback if needed
python -m alembic downgrade -1

# Re-run migration
python -m alembic upgrade head
```

### Payment Gateway Issues

- Verify API keys are correct
- Check webhook URLs are accessible
- Review gateway logs

### Database Connection Issues

- Verify database credentials
- Check network connectivity
- Verify database is running

## Support

For issues or questions:
1. Check logs
2. Review API documentation
3. Check GitHub issues
4. Contact support team

