# Clinic+ Deployment Guide

## Backend Deployment (Railway)

The backend is configured for Railway deployment with the following settings:

- **Builder**: Nixpacks
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn main:app --bind 0.0.0.0:$PORT --workers 4`
- **Health Check**: `/api/health`
- **Python Version**: 3.11.0

### Required Environment Variables for Railway:

```
DATABASE_URL=postgresql://...
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## Frontend Deployment (Netlify)

The frontend is configured for Netlify deployment:

- **Build Command**: `npm run build`
- **Publish Directory**: `static`
- **Node Version**: 18

### Deployment Steps:

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Fix build errors and prepare for deployment"
   git push origin main
   ```

2. **Railway Backend**:
   - Connect your GitHub repository to Railway
   - Railway will automatically detect the `railway.json` configuration
   - Set environment variables in Railway dashboard
   - Deploy

3. **Netlify Frontend**:
   - Connect your GitHub repository to Netlify
   - Netlify will automatically detect the `netlify.toml` configuration
   - Set the API URL environment variable:
     ```
     VITE_API_BASE_URL=https://your-railway-backend-url.railway.app
     ```
   - Deploy

## Post-Deployment Configuration

1. Update the frontend's API base URL to point to your Railway backend
2. Test all functionality
3. Set up monitoring and logging as needed
