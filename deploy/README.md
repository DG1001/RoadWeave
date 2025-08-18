# RoadWeave Deployment Files

This directory contains all files needed for production deployment of RoadWeave.

## Files Overview

### Configuration Files
- `nginx.conf` - Nginx reverse proxy configuration for subdomain
- `roadweave.service` - Systemd service file for RoadWeave
- `production.env` - Production environment template

### Scripts
- `build.sh` - Build React frontend for production
- `deploy.sh` - Complete deployment script for new installations
- `update.sh` - Update existing deployment script

## Quick Deployment

### For roadweave.sensem.de

1. **Set domain environment variable:**
   ```bash
   export ROADWEAVE_DOMAIN="roadweave.sensem.de"
   ```

2. **Run deployment script as root:**
   ```bash
   sudo ./deploy.sh
   ```

3. **Configure environment:**
   ```bash
   sudo nano /opt/roadweave/backend/.env
   # Set your GEMINI_API_KEY and other settings
   ```

4. **Obtain SSL certificate:**
   ```bash
   sudo certbot --nginx -d roadweave.sensem.de
   ```

5. **Restart service:**
   ```bash
   sudo systemctl restart roadweave
   ```

## Manual Deployment Steps

### 1. Build Application
```bash
# Set your domain
export ROADWEAVE_DOMAIN="roadweave.sensem.de"
./build.sh
```

### 2. Server Setup
```bash
# Copy files to server
sudo mkdir -p /opt/roadweave
sudo cp -r * /opt/roadweave/

# Create user
sudo useradd --system --shell /bin/bash --home-dir /opt/roadweave roadweave
sudo chown -R roadweave:roadweave /opt/roadweave
```

### 3. Install Service
```bash
# Install systemd service
sudo cp roadweave.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable roadweave
```

### 4. Install Nginx Config
```bash
# Update domain in config
sed -i 's/roadweave.yourdomain.com/roadweave.sensem.de/g' nginx.conf

# Install nginx config
sudo cp nginx.conf /etc/nginx/sites-available/roadweave
sudo ln -s /etc/nginx/sites-available/roadweave /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Configure Environment
```bash
# Copy and edit environment
sudo cp production.env /opt/roadweave/backend/.env
sudo nano /opt/roadweave/backend/.env
```

### 6. Start Services
```bash
sudo systemctl start roadweave
sudo systemctl status roadweave
```

## Environment Configuration

Edit `/opt/roadweave/backend/.env` with your settings:

```env
# Required
GEMINI_API_KEY=your-actual-api-key
ADMIN_PASSWORD=your-secure-password

# Security (generate new keys!)
SECRET_KEY=your-unique-secret-key
JWT_SECRET_KEY=your-unique-jwt-key

# Optional
ENABLE_PHOTO_ANALYSIS=true
DAILY_PHOTO_ANALYSIS_LIMIT=200
```

## Monitoring

```bash
# View logs
sudo journalctl -u roadweave -f

# Check status
sudo systemctl status roadweave

# Check nginx logs
sudo tail -f /var/log/nginx/roadweave_*.log
```

## Updates

For future updates:
```bash
# Pull new code, then:
sudo ./update.sh
```

This will:
- Backup current deployment
- Update code and dependencies
- Rebuild frontend
- Restart services
- Rollback if anything fails

## File Permissions

The deployment uses these permissions:
- Service runs as `roadweave` user
- Files owned by `roadweave:roadweave`
- Uploads directory: `755` permissions
- Scripts: executable (`+x`)

## SSL Certificate

The nginx config expects Let's Encrypt certificates at:
```
/etc/letsencrypt/live/roadweave.sensem.de/fullchain.pem
/etc/letsencrypt/live/roadweave.sensem.de/privkey.pem
```

Obtain with:
```bash
sudo certbot --nginx -d roadweave.sensem.de
```

## Troubleshooting

1. **Service won't start:**
   ```bash
   sudo journalctl -u roadweave --no-pager
   ```

2. **502 Bad Gateway:**
   - Check if service is running: `sudo systemctl status roadweave`
   - Check nginx config: `sudo nginx -t`

3. **File upload issues:**
   ```bash
   sudo chown -R roadweave:roadweave /opt/roadweave/backend/uploads
   sudo chmod 755 /opt/roadweave/backend/uploads
   ```

4. **Frontend not loading:**
   - Ensure React build exists: `ls /opt/roadweave/frontend/build/`
   - Check FLASK_ENV=production in .env
   - Rebuild: `cd /opt/roadweave && sudo -u roadweave ./deploy/build.sh`