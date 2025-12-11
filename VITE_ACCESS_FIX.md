# Fix: MIME Type Errors

## Problem

You're seeing errors like:
- `jsx-dev-runtime: Failed to load module script - MIME type "text/html"`
- `index.css: Failed to load module script - MIME type "text/css"`

## Root Cause

**You're accessing Flask (port 5000) instead of Vite (port 5173)**

Flask cannot serve JSX files or handle Vite's module system. You MUST use Vite dev server for development.

---

## ✅ Solution

### Step 1: Verify Vite is Running

Check if Vite is running:
```bash
# Check if port 5173 is in use
netstat -ano | findstr ":5173"
```

If NOT running, start it:
```bash
npm run dev
```

### Step 2: Access the Correct URL

**✅ CORRECT**: http://localhost:5173  
**❌ WRONG**: http://localhost:5000

---

## 🔍 How to Check

1. **Vite Terminal**: Look for output like:
   ```
   VITE v4.x.x  ready in xxx ms
   ➜  Local:   http://localhost:5173/
   ```

2. **Browser**: Make sure the URL bar shows `localhost:5173`, NOT `localhost:5000`

3. **Test**: Try accessing http://localhost:5173 directly

---

## 📋 Quick Fix

1. **Stop any existing Vite process** (Ctrl+C in Vite terminal)
2. **Start Vite fresh**:
   ```bash
   npm run dev
   ```
3. **Wait for "ready" message**
4. **Open browser**: http://localhost:5173
5. **Do NOT use**: http://localhost:5000

---

## Why This Happens

- **Flask (5000)**: Backend API only - cannot serve JSX/CSS modules
- **Vite (5173)**: Frontend dev server - handles JSX, CSS, hot reload

**Always use Vite for development!**

---

## Summary

✅ **Use**: http://localhost:5173 (Vite)  
❌ **Don't use**: http://localhost:5000 (Flask) for frontend

The MIME type errors will disappear once you access Vite directly!

