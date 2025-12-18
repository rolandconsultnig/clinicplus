# Clinic+ Deployment Guide
## Backend (Render) + Frontend (Netlify)

This guide explains how to deploy the Clinic+ application with the backend on Render and frontend on Netlify.

---

## 🔧 Architecture

```
Frontend (Netlify)  →  Backend API (Render)  →  Database (Render PostgreSQL)
React/Vite App          Flask/Python            PostgreSQL
```

---

## 📋 Step 1: Deploy Backend to Render

### 1.1 Create Render Account
- Go to https://render.com
- Sign up with your GitHub account (fredyammi@outlook.com)

### 1.2 Create New Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository: `rolandconsultnig/clinicplus`
3. Configure the service:
   - **Name**: `clinicplus-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn main:app --bind 0.0.0.0:$PORT --workers 4`
   - **Plan**: Free (or paid for better performance)

### 1.3 Add Environment Variables
In Render dashboard, add these environment variables:
```
SECRET_KEY=<generate-a-secure-random-key>
PYTHON_VERSION=3.11.0
```

### 1.4 Create PostgreSQL Database (Optional)
1. Click **"New +"** → **"PostgreSQL"**
2. Name: `clinicplus-db`
3. Link it to your web service
4. Render will auto-add `DATABASE_URL` to your environment variables

### 1.5 Get Your Backend URL
After deployment, your backend will be available at:
```
https://clinicplus-backend.onrender.com
```
**Save this URL - you'll need it for the frontend!**

---

## 🎨 Step 2: Deploy Frontend to Netlify

### 2.1 Create Netlify Account
- Go to https://netlify.com
- Sign up with your GitHub account

### 2.2 Create New Site
1. Click **"Add new site"** → **"Import an existing project"**
2. Choose **GitHub** and select: `rolandconsultnig/clinicplus`
3. Configure build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `static`
   - **Branch**: `master`

### 2.3 Add Environment Variables
In Netlify dashboard → **Site settings** → **Environment variables**, add:
```
VITE_API_URL=https://clinicplus-backend.onrender.com/api
```
**Replace with your actual Render backend URL from Step 1.5**

### 2.4 Deploy
- Click **"Deploy site"**
- Netlify will build and deploy your frontend
- You'll get a URL like: `https://your-site-name.netlify.app`

---

## 🔗 Step 3: Connect Frontend and Backend

### 3.1 Update Backend CORS (Already Done)
The backend is already configured to accept requests from Netlify domains.

### 3.2 Test the Connection
1. Open your Netlify URL in a browser
2. Try to log in or access any API feature
3. Check browser console for any CORS errors

---

## ✅ Step 4: Verify Deployment

### Backend Health Check
Visit: `https://clinicplus-backend.onrender.com/api/health`

Should return:
```json
{
  "status": "healthy",
  "timestamp": "..."
}
```

### Frontend Check
Visit your Netlify URL and verify:
- ✅ Page loads correctly
- ✅ Can make API calls
- ✅ Login works
- ✅ No CORS errors in console

---

## 🔄 Automatic Deployments

Both services are configured for automatic deployment:

- **Push to GitHub master branch** → Both Render and Netlify auto-deploy
- **No manual steps needed** after initial setup

---

## 🌐 Custom Domains (Optional)

### For Netlify (Frontend)
1. Go to **Domain settings** in Netlify
2. Add your custom domain
3. Update DNS records as instructed

### For Render (Backend)
1. Go to **Settings** → **Custom Domain**
2. Add your API subdomain (e.g., `api.yourdomain.com`)
3. Update DNS records

**Remember to update `VITE_API_URL` in Netlify if you change the backend domain!**

---

## 📊 Monitoring

### Render Dashboard
- View logs: https://dashboard.render.com
- Monitor performance and errors
- Check database connections

### Netlify Dashboard
- View build logs
- Monitor deploy status
- Check analytics

---

## 🐛 Troubleshooting

### CORS Errors
- Verify `VITE_API_URL` is set correctly in Netlify
- Check backend logs for CORS configuration
- Ensure Netlify URL is in allowed origins

### Backend Not Responding
- Check Render logs for errors
- Verify environment variables are set
- Check if service is sleeping (free tier)

### Frontend Build Fails
- Check Netlify build logs
- Verify `VITE_API_URL` environment variable
- Ensure all dependencies are in `package.json`

---

## 💰 Cost Estimates

### Free Tier (Recommended for Development)
- **Render**: Free (with limitations - sleeps after inactivity)
- **Netlify**: Free (100GB bandwidth/month)
- **Total**: $0/month

### Paid Tier (Production)
- **Render**: $7/month (always on, better performance)
- **Netlify**: Free or $19/month (for teams)
- **Total**: $7-26/month

---

## 🚀 Quick Commands

### Local Development
```bash
# Backend
python main.py

# Frontend
npm run dev
```

### Check Deployment Status
```bash
# Render CLI (optional)
render services list

# Netlify CLI (optional)
netlify status
```

---

## 📝 Environment Variables Summary

### Backend (Render)
```
SECRET_KEY=<your-secret-key>
PYTHON_VERSION=3.11.0
DATABASE_URL=<auto-generated-by-render>
```

### Frontend (Netlify)
```
VITE_API_URL=https://clinicplus-backend.onrender.com/api
```

---

## ✨ Next Steps After Deployment

1. ✅ Test all features thoroughly
2. ✅ Set up custom domains (optional)
3. ✅ Configure database backups on Render
4. ✅ Set up monitoring/alerts
5. ✅ Update documentation with production URLs
6. ✅ Share the Netlify URL with your team

---

**Your application is now live and ready to use!** 🎉
