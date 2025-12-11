# 🚀 Quick Start Guide - Clinic+

## The Problem

You're seeing `ERR_CONNECTION_REFUSED` because the **Flask backend server is not running**.

## ✅ Solution - Start the Backend Server

### Option 1: Use the Startup Script (Easiest)

```powershell
# From project root (F:\Projects\Clinic+)
.\start-backend.ps1
```

This will:
- Check Python and Flask
- Verify port 5000 is available
- Start the Flask server

### Option 2: Manual Start

```powershell
# From project root
python main.py
```

You should see:
```
 * Running on http://0.0.0.0:5000
 * Debug mode: on
```

### Option 3: Start Both Servers at Once

```powershell
# From project root
.\start-dev.ps1
```

This starts both:
- Backend (port 5000) in a new window
- Frontend (port 5173) in current window

---

## 📋 Complete Development Setup

### Terminal 1 - Backend:
```powershell
cd F:\Projects\Clinic+
python main.py
```

### Terminal 2 - Frontend:
```powershell
cd F:\Projects\Clinic+
npm run dev
```

### Access:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/api/health

---

## 🔍 Verify Server is Running

### Check Backend:
```powershell
# Should return JSON with "status": "healthy"
Invoke-WebRequest -Uri "http://localhost:5000/api/health"
```

### Check Port:
```powershell
netstat -ano | findstr ":5000"
```

---

## ⚠️ Common Issues

### "Port 5000 already in use"
```powershell
# Find the process
netstat -ano | findstr ":5000"

# Kill it (replace PID)
taskkill /PID <PID> /F
```

### "Python not found"
- Install Python 3.9+ from https://www.python.org/
- Make sure Python is in your PATH

### "Flask not found"
```powershell
pip install flask flask-cors sqlalchemy flask-jwt-extended
```

### "ERR_CONNECTION_REFUSED" persists
1. Make sure backend is running: `python main.py`
2. Check for errors in the terminal
3. Verify port 5000 is not blocked by firewall
4. Try accessing: http://localhost:5000/api/health

---

## 📝 Fixed Issues

✅ **React Router Warnings**: Fixed by adding future flags in `src/main.jsx`
✅ **Vite Proxy**: Configured to forward `/api/*` to `http://localhost:5000`
✅ **CORS**: Enabled in Flask backend

---

## 🎯 Next Steps

1. **Start Backend**: Run `python main.py` or `.\start-backend.ps1`
2. **Start Frontend**: Run `npm run dev` (in another terminal)
3. **Open Browser**: Navigate to http://localhost:5173
4. **Login**: Use your credentials to access the app

---

## 📞 Need Help?

- Check `START_BACKEND.md` for detailed backend setup
- Check `DEV_SERVER_SETUP.md` for development server configuration
- Review terminal output for error messages
