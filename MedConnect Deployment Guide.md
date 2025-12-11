# MedConnect Deployment Guide
## Production Deployment and Configuration Manual

### Table of Contents
1. [Overview](#overview)
2. [System Requirements](#system-requirements)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Database Setup](#database-setup)
5. [Backend Deployment](#backend-deployment)
6. [Frontend Deployment](#frontend-deployment)
7. [Security Configuration](#security-configuration)
8. [Monitoring and Logging](#monitoring-and-logging)
9. [Backup and Recovery](#backup-and-recovery)
10. [Maintenance and Updates](#maintenance-and-updates)

---

## Overview

### Deployment Architecture

MedConnect follows a modern three-tier architecture designed for scalability, security, and maintainability:

**Presentation Tier**: React-based frontend application served via CDN or web server
**Application Tier**: Flask-based REST API with JWT authentication and role-based access control
**Data Tier**: PostgreSQL database with proper indexing and backup strategies

### Deployment Options

**Cloud Deployment** (Recommended):
- AWS, Azure, or Google Cloud Platform
- Managed database services
- Auto-scaling and load balancing
- Built-in backup and disaster recovery

**On-Premises Deployment**:
- Self-managed infrastructure
- Direct control over data location
- Custom security configurations
- Manual scaling and maintenance

**Hybrid Deployment**:
- Combination of cloud and on-premises components
- Data residency compliance
- Flexible scaling options
- Gradual cloud migration path

---

## System Requirements

### Minimum Hardware Requirements

**Production Environment**:
- **CPU**: 4 cores (8 cores recommended)
- **RAM**: 8 GB (16 GB recommended)
- **Storage**: 100 GB SSD (500 GB recommended)
- **Network**: 1 Gbps connection

**Database Server**:
- **CPU**: 4 cores (8 cores recommended)
- **RAM**: 16 GB (32 GB recommended)
- **Storage**: 200 GB SSD with RAID 1 (1 TB recommended)
- **Network**: 1 Gbps connection

**Load Balancer** (if applicable):
- **CPU**: 2 cores
- **RAM**: 4 GB
- **Network**: 1 Gbps connection

### Software Requirements

**Operating System**:
- Ubuntu 20.04 LTS or later
- CentOS 8 or later
- Red Hat Enterprise Linux 8 or later
- Windows Server 2019 or later (with WSL2)

**Runtime Environment**:
- Python 3.9 or later
- Node.js 18 or later
- PostgreSQL 13 or later
- Redis 6 or later (for caching)

**Web Server**:
- Nginx 1.18 or later (recommended)
- Apache HTTP Server 2.4 or later
- IIS 10 or later (Windows)

### Network Requirements

**Ports**:
- **80/443**: HTTP/HTTPS traffic
- **5432**: PostgreSQL database (internal only)
- **6379**: Redis cache (internal only)
- **22**: SSH access (administrative)

**SSL/TLS**:
- Valid SSL certificate for HTTPS
- TLS 1.2 or later required
- Strong cipher suites only

**Firewall Configuration**:
- Restrict database access to application servers only
- Block unnecessary ports and services
- Implement intrusion detection and prevention

---

## Pre-Deployment Checklist

### Infrastructure Preparation

**Server Provisioning**:
- [ ] Application servers provisioned and configured
- [ ] Database server provisioned with appropriate storage
- [ ] Load balancer configured (if using multiple app servers)
- [ ] Backup storage configured and tested
- [ ] Monitoring systems installed and configured

**Network Configuration**:
- [ ] DNS records configured for production domain
- [ ] SSL certificates obtained and installed
- [ ] Firewall rules configured and tested
- [ ] VPN access configured for administrative tasks
- [ ] Network segmentation implemented

**Security Setup**:
- [ ] User accounts created with appropriate permissions
- [ ] SSH keys generated and distributed
- [ ] Database users created with minimal required permissions
- [ ] Audit logging configured
- [ ] Intrusion detection system configured

### Software Installation

**System Updates**:
- [ ] Operating system updated to latest patches
- [ ] Security updates applied
- [ ] Required packages installed
- [ ] System services configured

**Application Dependencies**:
- [ ] Python 3.9+ installed and configured
- [ ] Node.js 18+ installed and configured
- [ ] PostgreSQL 13+ installed and configured
- [ ] Redis installed and configured
- [ ] Nginx/Apache installed and configured

### Configuration Files

**Environment Variables**:
- [ ] Production environment variables configured
- [ ] Database connection strings set
- [ ] JWT secret keys generated
- [ ] API keys and external service credentials configured
- [ ] Logging levels and destinations configured

**Application Configuration**:
- [ ] Flask application configuration reviewed
- [ ] React build configuration optimized for production
- [ ] Database migration scripts prepared
- [ ] Initial data seeding scripts prepared

---

## Database Setup

### PostgreSQL Installation and Configuration

#### Installation (Ubuntu/Debian)

```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start and enable PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Database Creation

```sql
-- Connect as postgres user
sudo -u postgres psql

-- Create database
CREATE DATABASE medconnect_prod;

-- Create application user
CREATE USER medconnect_user WITH PASSWORD 'secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE medconnect_prod TO medconnect_user;

-- Create extensions
\c medconnect_prod
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Exit psql
\q
```

#### Database Configuration

**PostgreSQL Configuration** (`/etc/postgresql/13/main/postgresql.conf`):

```ini
# Connection settings
listen_addresses = 'localhost'  # or specific IP addresses
port = 5432
max_connections = 100

# Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Logging settings
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_statement = 'all'
log_min_duration_statement = 1000

# Security settings
ssl = on
ssl_cert_file = '/path/to/server.crt'
ssl_key_file = '/path/to/server.key'
```

**Access Control** (`/etc/postgresql/13/main/pg_hba.conf`):

```ini
# TYPE  DATABASE        USER            ADDRESS                 METHOD
local   all             postgres                                peer
local   all             all                                     md5
host    medconnect_prod medconnect_user 127.0.0.1/32           md5
host    medconnect_prod medconnect_user ::1/128                 md5
```

### Database Schema Migration

#### Schema Creation Script

```python
# create_schema.py
import os
import sys
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

# Add the src directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from main import create_app, db

def create_database_schema():
    """Create all database tables and initial data"""
    app = create_app()
    
    with app.app_context():
        # Create all tables
        db.create_all()
        
        # Create initial roles
        from models.auth import Role
        
        roles = [
            {'role_name': 'System Administrator', 'description': 'Full system access'},
            {'role_name': 'Facility Administrator', 'description': 'Facility management'},
            {'role_name': 'Physician', 'description': 'Medical doctor'},
            {'role_name': 'Nurse', 'description': 'Registered nurse'},
            {'role_name': 'Pharmacist', 'description': 'Licensed pharmacist'},
            {'role_name': 'Lab Technician', 'description': 'Laboratory technician'},
            {'role_name': 'Radiographer', 'description': 'Medical imaging technician'},
            {'role_name': 'Patient', 'description': 'Patient user'}
        ]
        
        for role_data in roles:
            role = Role.query.filter_by(role_name=role_data['role_name']).first()
            if not role:
                role = Role(**role_data)
                db.session.add(role)
        
        db.session.commit()
        print("Database schema created successfully!")

if __name__ == '__main__':
    create_database_schema()
```

#### Running Database Migration

```bash
# Navigate to application directory
cd /path/to/medconnect

# Activate virtual environment
source venv/bin/activate

# Set production environment variables
export FLASK_ENV=production
export DATABASE_URL=postgresql://medconnect_user:password@localhost/medconnect_prod

# Run schema creation
python create_schema.py
```

### Database Optimization

#### Indexing Strategy

```sql
-- Patient table indexes
CREATE INDEX idx_patients_universal_id ON patients(universal_patient_id);
CREATE INDEX idx_patients_name ON patients(last_name, first_name);
CREATE INDEX idx_patients_dob ON patients(date_of_birth);

-- User account indexes
CREATE INDEX idx_user_accounts_username ON user_accounts(username);
CREATE INDEX idx_user_accounts_email ON user_accounts(email);

-- Clinical encounter indexes
CREATE INDEX idx_encounters_patient ON clinical_encounters(patient_id);
CREATE INDEX idx_encounters_provider ON clinical_encounters(provider_id);
CREATE INDEX idx_encounters_date ON clinical_encounters(encounter_date);

-- Audit log indexes
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_patient ON audit_logs(patient_id);
```

#### Performance Tuning

```sql
-- Update table statistics
ANALYZE;

-- Vacuum and reindex regularly
VACUUM ANALYZE;
REINDEX DATABASE medconnect_prod;
```

---

## Backend Deployment

### Flask Application Configuration

#### Production Configuration File

```python
# config/production.py
import os
from datetime import timedelta

class ProductionConfig:
    # Basic Flask configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'production-secret-key-change-this'
    DEBUG = False
    TESTING = False
    
    # Database configuration
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'postgresql://medconnect_user:password@localhost/medconnect_prod'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 20,
        'pool_recycle': 3600,
        'pool_pre_ping': True
    }
    
    # JWT configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key-change-this'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # Security configuration
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # CORS configuration
    CORS_ORIGINS = ['https://your-frontend-domain.com']
    
    # Logging configuration
    LOG_LEVEL = 'INFO'
    LOG_FILE = '/var/log/medconnect/app.log'
    
    # Email configuration (if needed)
    MAIL_SERVER = os.environ.get('MAIL_SERVER')
    MAIL_PORT = int(os.environ.get('MAIL_PORT') or 587)
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() in ['true', 'on', '1']
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
```

#### Environment Variables

Create `/etc/environment` or use a `.env` file:

```bash
# Database configuration
DATABASE_URL=postgresql://medconnect_user:secure_password@localhost/medconnect_prod

# Security keys
SECRET_KEY=your-very-secure-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here

# Application settings
FLASK_ENV=production
FLASK_APP=src/main.py

# Email configuration
MAIL_SERVER=smtp.your-email-provider.com
MAIL_PORT=587
MAIL_USE_TLS=true
MAIL_USERNAME=your-email@domain.com
MAIL_PASSWORD=your-email-password

# Logging
LOG_LEVEL=INFO
```

### Application Server Setup

#### Using Gunicorn (Recommended)

**Installation**:
```bash
pip install gunicorn
```

**Gunicorn Configuration** (`gunicorn.conf.py`):
```python
# Gunicorn configuration file
bind = "127.0.0.1:5000"
workers = 4
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2
max_requests = 1000
max_requests_jitter = 100
preload_app = True
user = "medconnect"
group = "medconnect"
tmp_upload_dir = None
errorlog = "/var/log/medconnect/gunicorn_error.log"
accesslog = "/var/log/medconnect/gunicorn_access.log"
loglevel = "info"
```

**Systemd Service** (`/etc/systemd/system/medconnect.service`):
```ini
[Unit]
Description=MedConnect Flask Application
After=network.target

[Service]
User=medconnect
Group=medconnect
WorkingDirectory=/opt/medconnect
Environment=PATH=/opt/medconnect/venv/bin
ExecStart=/opt/medconnect/venv/bin/gunicorn --config gunicorn.conf.py src.main:app
ExecReload=/bin/kill -s HUP $MAINPID
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Service Management**:
```bash
# Enable and start the service
sudo systemctl enable medconnect
sudo systemctl start medconnect

# Check service status
sudo systemctl status medconnect

# View logs
sudo journalctl -u medconnect -f
```

### Reverse Proxy Configuration

#### Nginx Configuration

**Main Configuration** (`/etc/nginx/sites-available/medconnect`):
```nginx
upstream medconnect_backend {
    server 127.0.0.1:5000;
    # Add more servers for load balancing
    # server 127.0.0.1:5001;
    # server 127.0.0.1:5002;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL configuration
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # API routes
    location /api/ {
        proxy_pass http://medconnect_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # Frontend static files
    location / {
        root /var/www/medconnect/frontend;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /health {
        proxy_pass http://medconnect_backend;
        access_log off;
    }

    # Error pages
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /var/www/medconnect/error;
    }
}
```

**Enable Site**:
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/medconnect /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Frontend Deployment

### React Application Build

#### Production Build Configuration

**Environment Variables** (`.env.production`):
```bash
REACT_APP_API_BASE_URL=https://your-domain.com/api
REACT_APP_ENVIRONMENT=production
REACT_APP_VERSION=1.0.0
GENERATE_SOURCEMAP=false
```

**Build Process**:
```bash
# Navigate to frontend directory
cd /path/to/medconnect-frontend

# Install dependencies
npm install

# Build for production
npm run build

# The build files will be in the 'build' directory
```

#### Build Optimization

**Webpack Configuration** (if ejected):
```javascript
// webpack.config.js modifications for production
module.exports = {
  // ... other configuration
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
  // Enable gzip compression
  plugins: [
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8,
    }),
  ],
};
```

### Static File Deployment

#### File Structure

```
/var/www/medconnect/frontend/
├── index.html
├── static/
│   ├── css/
│   │   ├── main.[hash].css
│   │   └── main.[hash].css.map
│   ├── js/
│   │   ├── main.[hash].js
│   │   ├── main.[hash].js.map
│   │   └── [chunk].[hash].js
│   └── media/
│       └── [assets]
├── manifest.json
└── favicon.ico
```

#### Deployment Script

```bash
#!/bin/bash
# deploy-frontend.sh

set -e

# Configuration
BUILD_DIR="/path/to/medconnect-frontend/build"
DEPLOY_DIR="/var/www/medconnect/frontend"
BACKUP_DIR="/var/backups/medconnect-frontend"

# Create backup of current deployment
if [ -d "$DEPLOY_DIR" ]; then
    echo "Creating backup..."
    sudo mkdir -p "$BACKUP_DIR"
    sudo cp -r "$DEPLOY_DIR" "$BACKUP_DIR/$(date +%Y%m%d_%H%M%S)"
fi

# Deploy new build
echo "Deploying new build..."
sudo rm -rf "$DEPLOY_DIR"
sudo mkdir -p "$DEPLOY_DIR"
sudo cp -r "$BUILD_DIR"/* "$DEPLOY_DIR/"

# Set proper permissions
sudo chown -R www-data:www-data "$DEPLOY_DIR"
sudo chmod -R 755 "$DEPLOY_DIR"

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

echo "Frontend deployment completed successfully!"
```

### CDN Configuration (Optional)

#### CloudFlare Configuration

**DNS Settings**:
- A record: your-domain.com → your-server-ip
- CNAME record: www.your-domain.com → your-domain.com

**Page Rules**:
- Cache Level: Cache Everything
- Browser Cache TTL: 1 year
- Edge Cache TTL: 1 month

**Security Settings**:
- SSL/TLS: Full (strict)
- Always Use HTTPS: On
- HSTS: Enabled
- Minimum TLS Version: 1.2

---

## Security Configuration

### SSL/TLS Configuration

#### Certificate Installation

**Using Let's Encrypt (Recommended)**:
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

**Using Commercial Certificate**:
```bash
# Copy certificate files
sudo cp your-certificate.crt /etc/ssl/certs/
sudo cp your-private-key.key /etc/ssl/private/
sudo cp ca-bundle.crt /etc/ssl/certs/

# Set proper permissions
sudo chmod 644 /etc/ssl/certs/your-certificate.crt
sudo chmod 600 /etc/ssl/private/your-private-key.key
```

### Firewall Configuration

#### UFW (Ubuntu Firewall)

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (change port if needed)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow specific IP ranges for database access (if needed)
sudo ufw allow from 10.0.0.0/8 to any port 5432

# Check status
sudo ufw status verbose
```

#### iptables Rules

```bash
# Basic iptables rules
sudo iptables -A INPUT -i lo -j ACCEPT
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -j DROP

# Save rules
sudo iptables-save > /etc/iptables/rules.v4
```

### Application Security

#### Security Headers

**Nginx Security Headers**:
```nginx
# Add to server block
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy "strict-origin-when-cross-origin";
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

#### Rate Limiting

**Nginx Rate Limiting**:
```nginx
# Add to http block
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
    
    # Add to server block
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        # ... other configuration
    }
    
    location /api/auth/login {
        limit_req zone=login burst=5 nodelay;
        # ... other configuration
    }
}
```

### Database Security

#### PostgreSQL Security

**Configuration Hardening**:
```ini
# postgresql.conf
listen_addresses = 'localhost'
ssl = on
ssl_ciphers = 'HIGH:MEDIUM:+3DES:!aNULL'
ssl_prefer_server_ciphers = on
password_encryption = scram-sha-256
log_connections = on
log_disconnections = on
log_statement = 'all'
```

**User Permissions**:
```sql
-- Revoke unnecessary permissions
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO medconnect_user;

-- Grant only necessary table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO medconnect_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO medconnect_user;
```

---

## Monitoring and Logging

### Application Monitoring

#### Log Configuration

**Python Logging Configuration**:
```python
# logging_config.py
import logging
import logging.handlers
import os

def setup_logging():
    # Create logs directory
    log_dir = '/var/log/medconnect'
    os.makedirs(log_dir, exist_ok=True)
    
    # Configure root logger
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.handlers.RotatingFileHandler(
                os.path.join(log_dir, 'app.log'),
                maxBytes=10485760,  # 10MB
                backupCount=10
            ),
            logging.StreamHandler()
        ]
    )
    
    # Configure specific loggers
    logging.getLogger('werkzeug').setLevel(logging.WARNING)
    logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)
```

#### Health Check Endpoint

```python
# health_check.py
from flask import Blueprint, jsonify
import psutil
import time

health_bp = Blueprint('health', __name__)

@health_bp.route('/health')
def health_check():
    """Comprehensive health check endpoint"""
    start_time = time.time()
    
    # Check database connectivity
    try:
        db.session.execute('SELECT 1')
        db_status = 'healthy'
    except Exception as e:
        db_status = f'unhealthy: {str(e)}'
    
    # Check system resources
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    response_time = (time.time() - start_time) * 1000
    
    health_data = {
        'status': 'healthy' if db_status == 'healthy' else 'unhealthy',
        'timestamp': time.time(),
        'response_time_ms': response_time,
        'database': db_status,
        'system': {
            'cpu_percent': cpu_percent,
            'memory_percent': memory.percent,
            'disk_percent': (disk.used / disk.total) * 100
        }
    }
    
    status_code = 200 if health_data['status'] == 'healthy' else 503
    return jsonify(health_data), status_code
```

### System Monitoring

#### Prometheus Configuration

**Prometheus Configuration** (`prometheus.yml`):
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'medconnect'
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']

  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']
```

#### Grafana Dashboards

**Key Metrics to Monitor**:
- Application response times
- Database query performance
- System resource utilization
- Error rates and exceptions
- User authentication events
- API endpoint usage

### Log Management

#### Centralized Logging with ELK Stack

**Filebeat Configuration** (`filebeat.yml`):
```yaml
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - /var/log/medconnect/*.log
  fields:
    service: medconnect
    environment: production

output.elasticsearch:
  hosts: ["localhost:9200"]
  index: "medconnect-logs-%{+yyyy.MM.dd}"

setup.template.settings:
  index.number_of_shards: 1
  index.codec: best_compression
```

**Logstash Configuration**:
```ruby
input {
  beats {
    port => 5044
  }
}

filter {
  if [fields][service] == "medconnect" {
    grok {
      match => { "message" => "%{TIMESTAMP_ISO8601:timestamp} - %{DATA:logger} - %{LOGLEVEL:level} - %{GREEDYDATA:message}" }
    }
    
    date {
      match => [ "timestamp", "ISO8601" ]
    }
  }
}

output {
  elasticsearch {
    hosts => ["localhost:9200"]
    index => "medconnect-logs-%{+YYYY.MM.dd}"
  }
}
```

---

## Backup and Recovery

### Database Backup Strategy

#### Automated Backup Script

```bash
#!/bin/bash
# backup-database.sh

set -e

# Configuration
DB_NAME="medconnect_prod"
DB_USER="medconnect_user"
BACKUP_DIR="/var/backups/medconnect/database"
RETENTION_DAYS=30

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename
BACKUP_FILE="$BACKUP_DIR/medconnect_$(date +%Y%m%d_%H%M%S).sql.gz"

# Create database backup
echo "Creating database backup..."
pg_dump -h localhost -U "$DB_USER" -d "$DB_NAME" | gzip > "$BACKUP_FILE"

# Verify backup
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    echo "Backup created successfully: $BACKUP_FILE"
else
    echo "Backup failed!"
    exit 1
fi

# Remove old backups
find "$BACKUP_DIR" -name "medconnect_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Upload to cloud storage (optional)
# aws s3 cp "$BACKUP_FILE" s3://your-backup-bucket/database/

echo "Database backup completed successfully!"
```

#### Cron Job Configuration

```bash
# Add to crontab (crontab -e)
# Daily backup at 2 AM
0 2 * * * /opt/medconnect/scripts/backup-database.sh >> /var/log/medconnect/backup.log 2>&1

# Weekly full backup at 3 AM on Sundays
0 3 * * 0 /opt/medconnect/scripts/backup-full.sh >> /var/log/medconnect/backup.log 2>&1
```

### Application Backup

#### File System Backup

```bash
#!/bin/bash
# backup-application.sh

set -e

# Configuration
APP_DIR="/opt/medconnect"
BACKUP_DIR="/var/backups/medconnect/application"
RETENTION_DAYS=7

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate backup filename
BACKUP_FILE="$BACKUP_DIR/medconnect_app_$(date +%Y%m%d_%H%M%S).tar.gz"

# Create application backup (excluding logs and cache)
echo "Creating application backup..."
tar -czf "$BACKUP_FILE" \
    --exclude="$APP_DIR/venv" \
    --exclude="$APP_DIR/logs" \
    --exclude="$APP_DIR/__pycache__" \
    --exclude="$APP_DIR/.git" \
    "$APP_DIR"

# Verify backup
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    echo "Application backup created successfully: $BACKUP_FILE"
else
    echo "Application backup failed!"
    exit 1
fi

# Remove old backups
find "$BACKUP_DIR" -name "medconnect_app_*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Application backup completed successfully!"
```

### Disaster Recovery

#### Recovery Procedures

**Database Recovery**:
```bash
#!/bin/bash
# restore-database.sh

set -e

BACKUP_FILE="$1"
DB_NAME="medconnect_prod"
DB_USER="medconnect_user"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

# Stop application
sudo systemctl stop medconnect

# Drop and recreate database
sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

# Restore from backup
echo "Restoring database from $BACKUP_FILE..."
gunzip -c "$BACKUP_FILE" | sudo -u postgres psql -d "$DB_NAME"

# Start application
sudo systemctl start medconnect

echo "Database restoration completed successfully!"
```

**Application Recovery**:
```bash
#!/bin/bash
# restore-application.sh

set -e

BACKUP_FILE="$1"
APP_DIR="/opt/medconnect"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

# Stop application
sudo systemctl stop medconnect

# Backup current installation
sudo mv "$APP_DIR" "$APP_DIR.backup.$(date +%Y%m%d_%H%M%S)"

# Extract backup
echo "Restoring application from $BACKUP_FILE..."
sudo mkdir -p "$APP_DIR"
sudo tar -xzf "$BACKUP_FILE" -C /

# Restore virtual environment
cd "$APP_DIR"
sudo python3 -m venv venv
sudo venv/bin/pip install -r requirements.txt

# Set permissions
sudo chown -R medconnect:medconnect "$APP_DIR"

# Start application
sudo systemctl start medconnect

echo "Application restoration completed successfully!"
```

---

## Maintenance and Updates

### Regular Maintenance Tasks

#### Daily Tasks

**Automated Daily Maintenance** (`daily-maintenance.sh`):
```bash
#!/bin/bash
# daily-maintenance.sh

set -e

LOG_FILE="/var/log/medconnect/maintenance.log"

echo "$(date): Starting daily maintenance" >> "$LOG_FILE"

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "$(date): WARNING: Disk usage is ${DISK_USAGE}%" >> "$LOG_FILE"
fi

# Check application health
if ! curl -f http://localhost:5000/health > /dev/null 2>&1; then
    echo "$(date): ERROR: Application health check failed" >> "$LOG_FILE"
    sudo systemctl restart medconnect
fi

# Rotate logs
sudo logrotate /etc/logrotate.d/medconnect

# Clean temporary files
sudo find /tmp -name "medconnect_*" -mtime +1 -delete

echo "$(date): Daily maintenance completed" >> "$LOG_FILE"
```

#### Weekly Tasks

**Weekly Maintenance** (`weekly-maintenance.sh`):
```bash
#!/bin/bash
# weekly-maintenance.sh

set -e

LOG_FILE="/var/log/medconnect/maintenance.log"

echo "$(date): Starting weekly maintenance" >> "$LOG_FILE"

# Update system packages
sudo apt update && sudo apt upgrade -y

# Vacuum and analyze database
sudo -u postgres psql -d medconnect_prod -c "VACUUM ANALYZE;"

# Check SSL certificate expiration
CERT_EXPIRY=$(openssl x509 -in /etc/ssl/certs/your-certificate.crt -noout -enddate | cut -d= -f2)
EXPIRY_TIMESTAMP=$(date -d "$CERT_EXPIRY" +%s)
CURRENT_TIMESTAMP=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( (EXPIRY_TIMESTAMP - CURRENT_TIMESTAMP) / 86400 ))

if [ "$DAYS_UNTIL_EXPIRY" -lt 30 ]; then
    echo "$(date): WARNING: SSL certificate expires in $DAYS_UNTIL_EXPIRY days" >> "$LOG_FILE"
fi

# Generate security report
/opt/medconnect/scripts/security-audit.sh >> "$LOG_FILE"

echo "$(date): Weekly maintenance completed" >> "$LOG_FILE"
```

### Application Updates

#### Update Procedure

**Update Script** (`update-application.sh`):
```bash
#!/bin/bash
# update-application.sh

set -e

NEW_VERSION="$1"
APP_DIR="/opt/medconnect"
BACKUP_DIR="/var/backups/medconnect/updates"

if [ -z "$NEW_VERSION" ]; then
    echo "Usage: $0 <version>"
    exit 1
fi

echo "Updating MedConnect to version $NEW_VERSION..."

# Create backup
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/pre-update-$(date +%Y%m%d_%H%M%S).tar.gz"
tar -czf "$BACKUP_FILE" "$APP_DIR"

# Stop application
sudo systemctl stop medconnect

# Download new version
cd /tmp
wget "https://releases.medconnect.com/v$NEW_VERSION/medconnect-$NEW_VERSION.tar.gz"
tar -xzf "medconnect-$NEW_VERSION.tar.gz"

# Update application files
sudo cp -r "medconnect-$NEW_VERSION"/* "$APP_DIR/"

# Update dependencies
cd "$APP_DIR"
sudo venv/bin/pip install -r requirements.txt

# Run database migrations
sudo -u medconnect venv/bin/python migrate.py

# Update configuration
sudo cp config/production.py.example config/production.py
# Edit configuration as needed

# Set permissions
sudo chown -R medconnect:medconnect "$APP_DIR"

# Start application
sudo systemctl start medconnect

# Verify update
sleep 10
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    echo "Update completed successfully!"
else
    echo "Update failed! Rolling back..."
    sudo systemctl stop medconnect
    sudo rm -rf "$APP_DIR"
    sudo tar -xzf "$BACKUP_FILE" -C /
    sudo systemctl start medconnect
    exit 1
fi

# Clean up
rm -rf "/tmp/medconnect-$NEW_VERSION"*

echo "MedConnect updated to version $NEW_VERSION successfully!"
```

### Security Updates

#### Security Patch Management

**Security Update Script** (`security-update.sh`):
```bash
#!/bin/bash
# security-update.sh

set -e

LOG_FILE="/var/log/medconnect/security-updates.log"

echo "$(date): Starting security updates" >> "$LOG_FILE"

# Update system packages
sudo apt update
sudo apt list --upgradable | grep -i security >> "$LOG_FILE"
sudo apt upgrade -y

# Update Python packages
cd /opt/medconnect
sudo venv/bin/pip list --outdated >> "$LOG_FILE"
sudo venv/bin/pip install --upgrade pip
sudo venv/bin/pip install -r requirements.txt --upgrade

# Update Node.js packages (if applicable)
cd /var/www/medconnect/frontend
npm audit >> "$LOG_FILE"
npm audit fix

# Restart services
sudo systemctl restart medconnect
sudo systemctl restart nginx

# Verify services
sleep 10
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    echo "$(date): Security updates completed successfully" >> "$LOG_FILE"
else
    echo "$(date): ERROR: Application failed after security updates" >> "$LOG_FILE"
fi
```

### Performance Optimization

#### Database Optimization

**Database Maintenance Script** (`optimize-database.sh`):
```bash
#!/bin/bash
# optimize-database.sh

set -e

DB_NAME="medconnect_prod"

echo "Starting database optimization..."

# Update table statistics
sudo -u postgres psql -d "$DB_NAME" -c "ANALYZE;"

# Vacuum database
sudo -u postgres psql -d "$DB_NAME" -c "VACUUM;"

# Reindex database
sudo -u postgres psql -d "$DB_NAME" -c "REINDEX DATABASE $DB_NAME;"

# Check for unused indexes
sudo -u postgres psql -d "$DB_NAME" -c "
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename, indexname;
"

echo "Database optimization completed!"
```

#### Application Performance Tuning

**Performance Monitoring Script** (`performance-check.sh`):
```bash
#!/bin/bash
# performance-check.sh

set -e

LOG_FILE="/var/log/medconnect/performance.log"

echo "$(date): Starting performance check" >> "$LOG_FILE"

# Check response times
RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:5000/health)
echo "$(date): Health endpoint response time: ${RESPONSE_TIME}s" >> "$LOG_FILE"

# Check database connection pool
DB_CONNECTIONS=$(sudo -u postgres psql -d medconnect_prod -t -c "SELECT count(*) FROM pg_stat_activity WHERE datname='medconnect_prod';")
echo "$(date): Active database connections: $DB_CONNECTIONS" >> "$LOG_FILE"

# Check memory usage
MEMORY_USAGE=$(ps aux | grep gunicorn | awk '{sum+=$6} END {print sum/1024}')
echo "$(date): Application memory usage: ${MEMORY_USAGE}MB" >> "$LOG_FILE"

# Check log file sizes
LOG_SIZE=$(du -sh /var/log/medconnect/ | cut -f1)
echo "$(date): Log directory size: $LOG_SIZE" >> "$LOG_FILE"

echo "$(date): Performance check completed" >> "$LOG_FILE"
```

---

## Conclusion

This deployment guide provides comprehensive instructions for deploying MedConnect in a production environment. Following these procedures will ensure a secure, scalable, and maintainable deployment that meets healthcare industry standards and regulatory requirements.

### Key Success Factors

1. **Security First**: Implement all security measures before going live
2. **Comprehensive Testing**: Test all components thoroughly in a staging environment
3. **Monitoring and Alerting**: Set up proper monitoring before deployment
4. **Backup Strategy**: Ensure reliable backup and recovery procedures
5. **Documentation**: Maintain up-to-date documentation for all procedures

### Post-Deployment Checklist

- [ ] All services are running and healthy
- [ ] SSL certificates are properly configured
- [ ] Monitoring and alerting are functional
- [ ] Backup procedures are tested and working
- [ ] Security scans show no critical vulnerabilities
- [ ] Performance benchmarks meet requirements
- [ ] User acceptance testing is completed
- [ ] Staff training is completed
- [ ] Support procedures are in place

For additional support or questions about deployment, please contact the MedConnect support team at support@medconnect.com.

---

*This deployment guide is regularly updated to reflect best practices and new features. Please check for the latest version at docs.medconnect.com/deployment-guide.*

**Document Version**: 1.0  
**Last Updated**: September 20, 2025  
**Next Review Date**: December 20, 2025

