# 🚀 How to Start Development Servers

## Current Status

- ✅ **Flask Backend**: Running on port 5000
- ❌ **Vite Frontend**: Not running (needs to be started)

---

## Step-by-Step Instructions

### Option 1: Two Terminal Windows (Recommended)

**Terminal 1 - Backend (Already Running):**
```bash
python main.py
```
✅ Flask is already running on `http://localhost:5000`

**Terminal 2 - Frontend (Start This):**
```bash
npm run dev
```
This will start Vite dev server on `http://localhost:5173`

**Then Access:**
- Open browser: `http://localhost:5173`
- Vite automatically proxies `/api/*` to Flask backend

---

### Option 2: Build for Production

If you want Flask to serve everything:

```bash
# Build frontend
npm run build

# Start Flask (already running)
python main.py

# Access
http://localhost:5000
```

---

## Troubleshooting

### Flask shows "nothing" on port 5000
- This is normal! Flask is an API server
- Access `http://localhost:5000/api/health` to verify it's working
- For frontend, use Vite dev server on port 5173

### Vite won't start
1. Make sure dependencies are installed: `npm install`
2. Check if port 5173 is already in use
3. Check terminal output for errors

### MIME type errors
- Always use `http://localhost:5173` for development (not port 5000)
- Vite handles `.jsx` files correctly
- Flask cannot serve `.jsx` files directly

---

## Quick Commands

```bash
# Start backend
python main.py

# Start frontend (in separate terminal)
npm run dev

# Build frontend
npm run build

# Check health
curl http://localhost:5000/api/health
```

---

**Remember**: For development, always use Vite dev server (`http://localhost:5173`), not Flask directly!

