# Gunicorn configuration for production
import os

# Server socket
bind = "0.0.0.0:5000"
backlog = 2048

# Worker processes
workers = 4
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"

# Process naming
proc_name = "clinicplus"

# Server mechanics
daemon = False
pidfile = "/tmp/gunicorn.pid"
user = None
group = None
tmp_upload_dir = None

# SSL
keyfile = None
certfile = None

# Performance tuning
max_requests = 1000
max_requests_jitter = 50
preload_app = True

# Server hooks
def when_ready(server):
    server.log.info("Server is ready. Starting.")

def worker_int(worker):
    worker.log.info("Worker received INT or QUIT signal.")

def pre_fork(server, worker):
    server.log.info("Worker spawned (pid: %s)", worker.pid)

def post_fork(server, worker):
    server.log.info("Worker spawned (pid: %s)", worker.pid)
