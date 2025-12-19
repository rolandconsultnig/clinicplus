# Use Python base image
FROM python:3.11-slim

# Install Node.js 20 (which includes npm)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Build frontend
RUN npm run build

# Expose port
EXPOSE $PORT

# Start application
CMD gunicorn main:app --bind 0.0.0.0:$PORT --workers 4

