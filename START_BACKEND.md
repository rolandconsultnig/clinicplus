# Starting the Backend Server

## Quick Start

The Flask backend server needs to be running for the frontend to work.

### Start Backend Server

```powershell
# Navigate to project root
cd F:\Projects\Clinic+

# Start Flask server
python main.py
```

The server will start on: **http://localhost:5000**

### Verify Server is Running

Open in browser or use PowerShell:
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/health"
```

You should see a JSON response with `"status": "healthy"`.

## Running Both Servers

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

### Access Application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api

## Troubleshooting

### "ERR_CONNECTION_REFUSED"
- **Solution**: Start the Flask backend server with `python main.py`

### Port 5000 already in use
- **Solution**: Kill the process using port 5000:
  ```powershell
  # Find process
  netstat -ano | findstr :5000
  
  # Kill process (replace PID with actual process ID)
  taskkill /PID <PID> /F
  ```

### Python not found
- **Solution**: Make sure Python is installed and in PATH
  ```powershell
  python --version
  ```

## Background Process

If you started the server in the background, you can check if it's running:
```powershell
Get-Process python | Where-Object {$_.Path -like "*python*"}
```

To stop the background server:
```powershell
# Find and kill Python processes running main.py
Get-Process python | Stop-Process
```

