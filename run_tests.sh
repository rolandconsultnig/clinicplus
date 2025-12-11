#!/bin/bash
# Run integration tests
# First check if server is running, if not start it

echo "Starting Flask server in background..."
python main.py &
FLASK_PID=$!
sleep 3

echo "Running integration tests..."
python test_frontend_backend_integration.py

echo "Stopping Flask server..."
kill $FLASK_PID 2>/dev/null || true

