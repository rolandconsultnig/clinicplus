# 🚂 Railway Deployment Checklist

Quick checklist to deploy Clinic+ backend to Railway.

---

## ✅ Pre-Deployment Checklist

### Files Ready
- [x] `railway.json` - Railway configuration
- [x] `nixpacks.toml` - Build configuration  
- [x] `Procfile` - Start command
- [x] `requirements.txt` - Python dependencies
- [x] `runtime.txt` - Python version
- [x] `.railwayignore` - Exclude unnecessary files
- [x] `main.py` - Flask application with CORS configured

### Code Ready
- [x] All changes committed to git
- [x] Pushed to GitHub `master` branch
- [x] Backend tested locally
- [x] CORS configured for Railway domains

---

## 🚀 Deployment Steps

### 1. Login to Railway
```bash
railway login
```
✅ Login successful: fredyammi@outlook.com

### 2. Create/Link Project
```bash
# Option A: Create new project
railway init --name clinic+

# Option B: Link existing project
railway link
```

### 3. Deploy
```bash
railway up
```

### 4. Generate Domain
```bash
railway domain
```

### 5. Get Your URL
Your backend will be at: `https://[service-name].up.railway.app`

---

## 🔧 Environment Variables to Set

In Railway dashboard or via CLI:

```bash
railway variables set SECRET_KEY="your_secure_random_key_here"
railway variables set PYTHON_VERSION="3.11.0"
```

---

## ✅ Post-Deployment Verification

### 1. Check Health Endpoint
```bash
curl https://[your-url].up.railway.app/api/health
```

Expected: `{"status":"healthy"}`

### 2. Check Logs
```bash
railway logs
```

### 3. Test API
- Visit: `https://[your-url].up.railway.app/api/health`
- Should return JSON with status

---

## 🎨 Connect Frontend (Netlify)

Once backend is deployed:

1. **Get Railway URL**: `https://[service-name].up.railway.app`

2. **Deploy to Netlify**:
   - Go to https://netlify.com
   - New site from Git → `rolandconsultnig/clinicplus`
   - Build: `npm run build`
   - Publish: `static`

3. **Set Environment Variable in Netlify**:
   ```
   VITE_API_URL=https://[your-railway-url].up.railway.app/api
   ```

4. **Redeploy Netlify** to apply changes

---

## 🐛 Troubleshooting

### Build Fails
- Check Railway logs
- Verify `requirements.txt` has all dependencies
- Test locally: `pip install -r requirements.txt`

### Service Won't Start
- Check start command in `Procfile`
- Verify port binding: `0.0.0.0:$PORT`
- Review logs for errors

### CORS Issues
- Backend already configured for Railway domains
- Check `main.py` allowed_origins
- Verify Netlify URL is accessible

---

## 📊 Current Configuration

**Python Version**: 3.11.0  
**Web Server**: Gunicorn (4 workers)  
**Health Check**: `/api/health`  
**Auto-Deploy**: Enabled (on git push)

---

## 🎯 Quick Commands

```bash
# View status
railway status

# View logs (live)
railway logs

# Open dashboard
railway open

# List environment variables
railway variables

# Redeploy
railway up --detach
```

---

**Ready to deploy!** Follow the steps above to get your backend live on Railway.
