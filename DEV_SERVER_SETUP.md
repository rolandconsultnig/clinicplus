# Development Server Setup Guide

## Issue Fixed: MIME Type Error

The error "Expected a JavaScript-or-Wasm module script but the server responded with a MIME type of 'text/html'" occurs when Flask tries to serve `.jsx` files instead of Vite dev server.

## Solution

**For Development**: Use Vite dev server directly, not Flask.

### Option 1: Use Vite Dev Server (Recommended for Development)

1. **Start Flask Backend** (Terminal 1):
   ```bash
   python main.py
   ```
   Backend runs on: `http://localhost:5000`

2. **Start Vite Dev Server** (Terminal 2):
   ```bash
   npm run dev
   ```
   Frontend runs on: `http://localhost:5173`

3. **Access Application**:
   - Open: `http://localhost:5173`
   - Vite automatically proxies `/api/*` requests to Flask backend

### Option 2: Build for Production

If you want Flask to serve everything:

1. **Build Frontend**:
   ```bash
   npm run build
   ```
   This creates `static/` folder with compiled files.

2. **Start Flask**:
   ```bash
   python main.py
   ```
   Access: `http://localhost:5000`

## Current Configuration

- **Vite Config**: Already configured to proxy `/api/*` to `http://localhost:5000`
- **Flask**: Updated to attempt proxying to Vite dev server for `/src/` paths

## Quick Start

```bash
# Terminal 1: Backend
python main.py

# Terminal 2: Frontend
npm run dev

# Then open: http://localhost:5173
```

---

**Note**: The Flask server has been updated to attempt proxying to Vite, but for best development experience, use Vite dev server directly.

