# 🚂 Railway Deployment Guide for Clinic+

Complete guide to deploy the Clinic+ backend on Railway.

---

## 📋 Prerequisites

- ✅ GitHub account with repository: `rolandconsultnig/clinicplus`
- ✅ Railway account (sign up at https://railway.app)
- ✅ Railway CLI installed (optional but recommended)

---

## 🚀 Deployment Methods

### Method 1: Deploy via Railway Dashboard (Recommended)

#### Step 1: Create Railway Project

1. Go to https://railway.app
2. Sign in with GitHub (fredyammi@outlook.com)
3. Click **"New Project"**
4. Select **"Deploy from GitHub repo"**
5. Choose **`rolandconsultnig/clinicplus`**
6. Railway will automatically detect the configuration

#### Step 2: Configure Service

Railway will auto-detect the Python backend using:
- `railway.json` configuration
- `nixpacks.toml` for build settings
- `Procfile` for start command

**Verify these settings in Railway dashboard:**
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn main:app --bind 0.0.0.0:$PORT --workers 4`
- **Health Check Path**: `/api/health`

#### Step 3: Add Environment Variables

In Railway dashboard → **Variables** tab, add:

```
SECRET_KEY=your_secure_random_secret_key_here
PYTHON_VERSION=3.11.0
```

**Optional (for database):**
```
DATABASE_URL=postgresql://user:password@host:port/database
```

#### Step 4: Deploy

1. Click **"Deploy"**
2. Railway will:
   - Clone your repository
   - Install Python 3.11
   - Install dependencies from `requirements.txt`
   - Start the Flask backend with gunicorn
3. Wait 2-5 minutes for deployment

#### Step 5: Get Your Backend URL

Once deployed:
1. Go to **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Your backend URL will be: `https://your-service-name.up.railway.app`

**Copy this URL - you'll need it for the frontend!**

---

### Method 2: Deploy via Railway CLI

#### Install Railway CLI

**Windows (PowerShell):**
```powershell
iwr https://railway.app/install.ps1 | iex
```

**macOS/Linux:**
```bash
curl -fsSL https://railway.app/install.sh | sh
```

#### Deploy Steps

```bash
# 1. Login to Railway
railway login

# 2. Initialize project (if not already linked)
railway init

# 3. Deploy
railway up

# 4. Get the URL
railway domain
```

---

## 🔧 Configuration Files Explained

### 1. `railway.json`
Main Railway configuration:
- Specifies Python 3.11
- Build and install commands
- Start command with gunicorn
- Health check endpoint

### 2. `nixpacks.toml`
Nixpacks build configuration:
- Python packages to install
- Build phases
- Start command

### 3. `Procfile`
Process configuration:
- Defines the web process
- Gunicorn with 4 workers

### 4. `requirements.txt`
Python dependencies:
- Flask, SQLAlchemy, gunicorn
- All required packages

---

## 🌐 CORS Configuration

The backend is already configured to accept requests from:
- ✅ Local development (`localhost:5173`, `localhost:5174`)
- ✅ Railway domains (auto-detected via `RAILWAY_PUBLIC_DOMAIN`)
- ✅ Netlify domains (all `*.netlify.app`)
- ✅ Custom domains (via environment variables)

---

## 📊 Database Setup (Optional)

### Add PostgreSQL Database

1. In Railway project, click **"New"** → **"Database"** → **"PostgreSQL"**
2. Railway will automatically:
   - Create the database
   - Add `DATABASE_URL` to environment variables
3. Your Flask app will use this for production data

### Update Flask to Use Database

The `DATABASE_URL` environment variable is automatically available.

---

## 🔐 Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SECRET_KEY` | Flask secret key | `your_secure_random_key` |
| `PORT` | Port number (auto-set by Railway) | `8080` |

### Optional Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | Auto-set by Railway |
| `NETLIFY_SITE_URL` | Frontend URL | `https://your-app.netlify.app` |
| `PYTHON_VERSION` | Python version | `3.11.0` |

---

## ✅ Verify Deployment

### 1. Check Health Endpoint

Visit: `https://your-service.up.railway.app/api/health`

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-12-19T00:00:00"
}
```

### 2. Check Logs

In Railway dashboard:
- Click on your service
- Go to **"Deployments"** tab
- Click on the latest deployment
- View logs for any errors

### 3. Test API Endpoints

```bash
# Health check
curl https://your-service.up.railway.app/api/health

# Test authentication endpoint
curl https://your-service.up.railway.app/api/auth/login
```

---

## 🔄 Automatic Deployments

Railway is configured for automatic deployments:

- **Push to GitHub `master` branch** → Railway auto-deploys
- **No manual steps needed** after initial setup
- **View deployment status** in Railway dashboard

---

## 🎨 Connect Frontend (Netlify)

Once your Railway backend is deployed:

### 1. Get Backend URL
From Railway dashboard: `https://your-service.up.railway.app`

### 2. Deploy Frontend to Netlify

1. Go to https://netlify.com
2. **New site from Git** → Choose `rolandconsultnig/clinicplus`
3. Build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `static`

### 3. Add Environment Variable in Netlify

In Netlify → **Site settings** → **Environment variables**:
```
VITE_API_URL=https://your-service.up.railway.app/api
```

### 4. Redeploy Frontend

Click **"Trigger deploy"** in Netlify to rebuild with the new API URL.

---

## 🐛 Troubleshooting

### Build Fails

**Check:**
- All dependencies in `requirements.txt`
- Python version compatibility
- Build logs in Railway dashboard

**Solution:**
```bash
# Test locally
pip install -r requirements.txt
python main.py
```

### Service Won't Start

**Check:**
- Start command is correct
- Port binding to `$PORT` variable
- Logs for Python errors

**Solution:**
- Review Railway deployment logs
- Check `gunicorn` configuration

### CORS Errors

**Check:**
- Frontend URL is in allowed origins
- `NETLIFY_SITE_URL` environment variable set

**Solution:**
- Update `main.py` allowed_origins list
- Redeploy backend

### Database Connection Issues

**Check:**
- `DATABASE_URL` is set
- Database service is running
- Connection string format

**Solution:**
- Verify database service in Railway
- Check SQLAlchemy configuration

---

## 💰 Railway Pricing

### Free Tier (Trial)
- **$5 credit** (one-time)
- Good for testing and development
- Services sleep after inactivity

### Paid Plans
- **Hobby**: $5/month + usage
- **Pro**: $20/month + usage
- **No sleep**, better performance
- Includes $5 usage credit

### Cost Optimization
- Use free tier for development
- Upgrade to Hobby for production
- Monitor usage in Railway dashboard

---

## 📈 Monitoring & Logs

### View Logs
1. Railway dashboard → Your service
2. Click **"Deployments"**
3. Select deployment → View logs

### Monitor Performance
- CPU and Memory usage in dashboard
- Response times
- Error rates

### Set Up Alerts
- Configure notifications in Railway
- Get alerts for deployment failures
- Monitor uptime

---

## 🔒 Security Best Practices

1. ✅ Use strong `SECRET_KEY` (never commit to git)
2. ✅ Enable HTTPS (automatic on Railway)
3. ✅ Set proper CORS origins
4. ✅ Use environment variables for secrets
5. ✅ Keep dependencies updated
6. ✅ Monitor logs for suspicious activity

---

## 🚀 Quick Start Commands

```bash
# Check Railway CLI version
railway --version

# Login
railway login

# Link to existing project
railway link

# View service status
railway status

# View logs
railway logs

# Open in browser
railway open

# Add environment variable
railway variables set SECRET_KEY=your_secret_key

# Deploy
railway up
```

---

## 📝 Deployment Checklist

Before deploying:
- [ ] All code committed and pushed to GitHub
- [ ] `requirements.txt` is up to date
- [ ] `railway.json` is configured
- [ ] `nixpacks.toml` is present
- [ ] `Procfile` has correct start command
- [ ] Environment variables documented

After deploying:
- [ ] Health endpoint returns 200 OK
- [ ] API endpoints are accessible
- [ ] CORS is working with frontend
- [ ] Database connection works (if applicable)
- [ ] Logs show no errors
- [ ] Frontend can communicate with backend

---

## 🎯 Next Steps After Deployment

1. ✅ Test all API endpoints
2. ✅ Deploy frontend to Netlify
3. ✅ Configure custom domain (optional)
4. ✅ Set up monitoring and alerts
5. ✅ Document production URLs
6. ✅ Share with team

---

## 📞 Support

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **GitHub Issues**: Report issues in your repository

---

**Your backend is now ready for Railway deployment!** 🎉

Follow the steps above to deploy and get your production URL.
