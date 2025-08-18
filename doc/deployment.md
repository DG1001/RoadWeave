# Production Deployment Guide

Complete guide for deploying RoadWeave to production with nginx, SSL, and systemd.

## Overview

RoadWeave can be deployed on a single subdomain using Flask to serve both the React frontend and API endpoints. This approach simplifies deployment and reduces server resource usage.

## Prerequisites

- **Linux server** with Python 3.8+ and Node.js 14+
- **Nginx** reverse proxy
- **SSL certificate** for HTTPS (Let's Encrypt recommended)
- **Domain/subdomain** pointing to your server
- **Git** for deployment

## Deployment Architecture

```
Internet → nginx (SSL/HTTPS) → Flask (localhost:7300)
                              ├─ /api/* (API endpoints)
                              ├─ /uploads/* (file uploads)
                              └─ /* (React frontend)
```

## Quick Start Deployment

### Option A: Manual Start with tmux

For testing and development:

```bash
# 1. Clone repository
git clone <your-repo> /opt/roadweave
cd /opt/roadweave

# 2. Set your domain
export ROADWEAVE_DOMAIN="roadweave.yourdomain.com"

# 3. Start with script
./start-roadweave.sh
```

This uses tmux for process management. See [tmux-setup.md](../deploy/tmux-setup.md) for details.

### Option B: Production Systemd Deployment

For production environments:

```bash
# 1. Clone and setup
git clone <your-repo> /opt/roadweave
cd /opt/roadweave

# 2. Run production deployment
sudo ./deploy/deploy.sh

# 3. Configure your domain in nginx
sudo nano /etc/nginx/sites-available/roadweave
```

## Detailed Production Setup

### 1. Server Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y python3 python3-pip python3-venv nodejs npm nginx git

# Create deployment directory
sudo mkdir -p /opt/roadweave
sudo chown $USER:$USER /opt/roadweave
```

### 2. Application Setup

```bash
# Clone repository
git clone <your-repository-url> /opt/roadweave
cd /opt/roadweave

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 3. Environment Configuration

```bash
# Backend configuration
cp backend/.env.example backend/.env.local
nano backend/.env.local
```

**Production backend environment** (`backend/.env.local`):
```env
# Required
GEMINI_API_KEY=your-actual-gemini-api-key-here

# Production settings
FLASK_ENV=production
FLASK_DEBUG=False
FLASK_HOST=0.0.0.0
FLASK_PORT=7300

# Security (generate strong keys)
SECRET_KEY=your-super-secure-secret-key-change-me
JWT_SECRET_KEY=your-super-secure-jwt-key-change-me

# Admin credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-admin-password

# AI Features
ENABLE_PHOTO_ANALYSIS=true
ENABLE_AUDIO_TRANSCRIPTION=true
MAX_IMAGE_SIZE=1024
DAILY_PHOTO_ANALYSIS_LIMIT=200

# Database (or use PostgreSQL for production)
SQLALCHEMY_DATABASE_URI=sqlite:///roadweave.db

# File uploads
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=16777216
```

### 4. Build Frontend

```bash
cd frontend

# Create production environment
cp .env.example .env.local
echo "REACT_APP_API_BASE=https://roadweave.yourdomain.com" > .env.local

# Build for production
npm run build
cd ..
```

### 5. Create systemd Service

Create `/etc/systemd/system/roadweave.service`:

```ini
[Unit]
Description=RoadWeave Travel Blog Application
After=network.target

[Service]
Type=simple
User=roadweave
Group=roadweave
WorkingDirectory=/opt/roadweave/backend
Environment=PATH=/opt/roadweave/venv/bin
EnvironmentFile=/opt/roadweave/backend/.env.local
ExecStart=/opt/roadweave/venv/bin/python app.py
ExecReload=/bin/kill -HUP $MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Create user and set permissions:
```bash
# Create dedicated user
sudo useradd --system --home /opt/roadweave --shell /bin/bash roadweave

# Set ownership
sudo chown -R roadweave:roadweave /opt/roadweave

# Create uploads directory
sudo mkdir -p /opt/roadweave/backend/uploads
sudo chown roadweave:roadweave /opt/roadweave/backend/uploads
```

### 6. Configure Nginx

Create `/etc/nginx/sites-available/roadweave`:

```nginx
server {
    listen 80;
    server_name roadweave.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name roadweave.yourdomain.com;

    # SSL Configuration (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/roadweave.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/roadweave.yourdomain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # File upload size limit
    client_max_body_size 16M;

    # Proxy to Flask application
    location / {
        proxy_pass http://127.0.0.1:7300;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Optimize static file serving
    location /static/ {
        proxy_pass http://127.0.0.1:7300;
        proxy_cache_valid 200 1d;
        add_header Cache-Control "public, max-age=86400";
    }

    # Optimize uploads serving  
    location /uploads/ {
        proxy_pass http://127.0.0.1:7300;
        proxy_cache_valid 200 7d;
        add_header Cache-Control "public, max-age=604800";
    }

    # Logs
    access_log /var/log/nginx/roadweave.access.log;
    error_log /var/log/nginx/roadweave.error.log;
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/roadweave /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. SSL Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d roadweave.yourdomain.com

# Verify auto-renewal
sudo certbot renew --dry-run
sudo systemctl enable certbot.timer
```

### 8. Start Services

```bash
# Enable and start RoadWeave
sudo systemctl enable roadweave
sudo systemctl start roadweave

# Check status
sudo systemctl status roadweave
```

### 9. Verify Deployment

1. **Service Status**:
   ```bash
   sudo systemctl status roadweave
   sudo journalctl -u roadweave -f
   ```

2. **Application Health**:
   ```bash
   curl https://roadweave.yourdomain.com/api/health
   ```

3. **Web Access**: Visit `https://roadweave.yourdomain.com`

## Deployment Scripts

### Automated Build Script

Create `deploy/build.sh`:
```bash
#!/bin/bash
set -e

echo "🚀 Building RoadWeave for production..."

# Build frontend
cd frontend
npm install
REACT_APP_API_BASE=https://roadweave.yourdomain.com npm run build
cd ..

# Install backend dependencies
source venv/bin/activate
pip install -r backend/requirements.txt

echo "✅ Build completed successfully!"
```

### Update Script

Create `deploy/update.sh`:
```bash
#!/bin/bash
set -e

echo "🔄 Updating RoadWeave..."

# Pull latest code
git pull

# Rebuild
./deploy/build.sh

# Restart service
sudo systemctl restart roadweave

echo "✅ Update completed successfully!"
```

## Monitoring and Maintenance

### Log Management

**View logs**:
```bash
# Application logs
sudo journalctl -u roadweave -f

# Nginx logs
sudo tail -f /var/log/nginx/roadweave.access.log
sudo tail -f /var/log/nginx/roadweave.error.log
```

**Log rotation**: Systemd handles application log rotation automatically.

### Health Monitoring

Create a simple monitoring script `monitor.sh`:
```bash
#!/bin/bash
URL="https://roadweave.yourdomain.com/api/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $URL)

if [ $RESPONSE -eq 200 ]; then
    echo "✅ RoadWeave is healthy"
else
    echo "❌ RoadWeave is down (HTTP $RESPONSE)"
    sudo systemctl restart roadweave
fi
```

Add to crontab for regular checks:
```bash
# Check every 5 minutes
*/5 * * * * /opt/roadweave/monitor.sh
```

### Backup Strategy

**Database and uploads backup**:
```bash
#!/bin/bash
BACKUP_DIR="/opt/roadweave/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database and uploads
tar -czf $BACKUP_DIR/roadweave_backup_$DATE.tar.gz \
    -C /opt/roadweave/backend \
    roadweave.db uploads/

# Keep only last 7 days
find $BACKUP_DIR -name "roadweave_backup_*.tar.gz" -mtime +7 -delete

echo "✅ Backup completed: roadweave_backup_$DATE.tar.gz"
```

**Restore from backup**:
```bash
#!/bin/bash
BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

# Stop service
sudo systemctl stop roadweave

# Restore
tar -xzf $BACKUP_FILE -C /opt/roadweave/backend/

# Restart service
sudo systemctl start roadweave

echo "✅ Restored from $BACKUP_FILE"
```

## Troubleshooting

### Common Issues

**1. Service won't start**:
```bash
# Check logs
sudo journalctl -u roadweave --no-pager

# Common causes:
# - Missing environment variables
# - Permission issues
# - Port already in use
# - Python path issues
```

**2. 502 Bad Gateway**:
```bash
# Check if Flask is running
sudo systemctl status roadweave
sudo netstat -tlnp | grep 7300

# Check nginx configuration
sudo nginx -t
```

**3. SSL certificate issues**:
```bash
# Renew certificate
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

**4. File upload failures**:
```bash
# Check permissions
ls -la /opt/roadweave/backend/uploads/
sudo chown -R roadweave:roadweave /opt/roadweave/backend/uploads

# Check nginx file size limit
grep client_max_body_size /etc/nginx/sites-available/roadweave
```

**5. High memory usage**:
```bash
# Monitor memory
free -h
ps aux | grep python

# Consider adding swap or optimizing settings
```

### Performance Optimization

**1. Database optimization** (for heavy usage):
```bash
# Switch to PostgreSQL
sudo apt install postgresql postgresql-contrib
sudo -u postgres createdb roadweave
# Update SQLALCHEMY_DATABASE_URI in .env.local
```

**2. Static file caching**:
```nginx
# In nginx config
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

**3. Application caching**:
```python
# Consider adding Redis for session storage
# pip install redis flask-session
```

## Security Considerations

### Production Security Checklist

- [ ] Strong admin passwords
- [ ] Secure secret keys (not default values)
- [ ] SSL/HTTPS enabled
- [ ] Firewall configured (only 22, 80, 443 open)
- [ ] Regular security updates
- [ ] Log monitoring
- [ ] File upload validation
- [ ] Rate limiting (consider nginx rate limiting)

### Firewall Configuration

```bash
# Basic UFW setup
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Regular Maintenance

**Monthly tasks**:
- Review logs for errors or security issues
- Update system packages
- Renew SSL certificates (automatic with certbot)
- Review backup integrity
- Monitor disk space and performance

**Security updates**:
```bash
# System updates
sudo apt update && sudo apt upgrade

# Python dependencies
cd /opt/roadweave
source venv/bin/activate
pip list --outdated
pip install --upgrade <package-name>

# Node.js dependencies
cd frontend
npm audit
npm update
```

## Scaling Considerations

For high-traffic deployments:

1. **Load Balancing**: Multiple Flask instances behind nginx
2. **Database**: PostgreSQL with connection pooling
3. **File Storage**: S3 or similar for uploads
4. **Caching**: Redis for sessions and data caching
5. **CDN**: CloudFlare for static asset delivery
6. **Monitoring**: Prometheus + Grafana for metrics

## Next Steps

- [Usage Guide](usage.md) - Learn how to use the deployed application
- [API Reference](api.md) - Integrate with the deployed API
- [Troubleshooting](troubleshooting.md) - Solve deployment issues