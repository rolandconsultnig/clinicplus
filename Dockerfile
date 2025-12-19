# Use Python base image
FROM python:3.11-slim

# Install system dependencies and Node.js 20
RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install Node.js dependencies (including devDependencies for build)
RUN npm ci --no-audit

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Build frontend
RUN npm run build

# Expose port (Railway sets PORT env var)
EXPOSE 8080

# Start application
CMD gunicorn main:app --bind 0.0.0.0:${PORT:-8080} --workers 4 --timeout 120

