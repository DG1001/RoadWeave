#!/bin/bash
# RoadWeave Update Script
# Updates an existing RoadWeave deployment

set -e  # Exit on any error

# Configuration
PROJECT_NAME="roadweave"
DEPLOY_USER="roadweave"
DEPLOY_PATH="/opt/roadweave"
DOMAIN="${ROADWEAVE_DOMAIN:-roadweave.yourdomain.com}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   log_error "This script must be run as root (use sudo)"
   exit 1
fi

log_info "Updating RoadWeave deployment"

# Check if deployment exists
if [ ! -d "$DEPLOY_PATH" ]; then
    log_error "RoadWeave deployment not found at $DEPLOY_PATH"
    log_info "Run deploy.sh first to create initial deployment"
    exit 1
fi

# Stop service
log_info "Stopping RoadWeave service"
systemctl stop roadweave

# Backup current deployment
BACKUP_DIR="/tmp/roadweave-backup-$(date +%Y%m%d-%H%M%S)"
log_info "Creating backup at $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
cp -r "$DEPLOY_PATH/backend/.env" "$BACKUP_DIR/" 2>/dev/null || log_warning "No .env file to backup"
cp -r "$DEPLOY_PATH/backend/roadweave.db" "$BACKUP_DIR/" 2>/dev/null || log_warning "No database to backup"
cp -r "$DEPLOY_PATH/backend/uploads" "$BACKUP_DIR/" 2>/dev/null || log_warning "No uploads to backup"

# Get current directory (assumes script is run from project directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Update project files (preserve .env and data)
log_info "Updating project files"
sudo -u $DEPLOY_USER bash -c "
    cd $PROJECT_DIR
    
    # Copy new code
    cp -r backend/app.py $DEPLOY_PATH/backend/
    cp -r backend/requirements.txt $DEPLOY_PATH/backend/
    cp -r frontend/ $DEPLOY_PATH/
    
    # Preserve existing .env and database
    # (they are not overwritten by the copy above)
"

# Update Python dependencies
log_info "Updating Python dependencies"
sudo -u $DEPLOY_USER bash -c "
    cd $DEPLOY_PATH
    source venv/bin/activate
    pip install -r backend/requirements.txt
"

# Update and rebuild frontend
log_info "Updating and rebuilding frontend"
sudo -u $DEPLOY_USER bash -c "
    cd $DEPLOY_PATH/frontend
    npm ci --only=production
    REACT_APP_API_BASE=https://$DOMAIN npm run build
"

# Update configuration files if needed
log_info "Updating system configuration files"
if [ -f "$DEPLOY_PATH/deploy/roadweave.service" ]; then
    cp "$DEPLOY_PATH/deploy/roadweave.service" /etc/systemd/system/
    systemctl daemon-reload
    log_success "Systemd service updated"
fi

if [ -f "$DEPLOY_PATH/deploy/nginx.conf" ]; then
    sed "s/roadweave.yourdomain.com/$DOMAIN/g" "$DEPLOY_PATH/deploy/nginx.conf" > /etc/nginx/sites-available/roadweave
    nginx -t
    systemctl reload nginx
    log_success "Nginx configuration updated"
fi

# Set proper permissions
chown -R $DEPLOY_USER:$DEPLOY_USER $DEPLOY_PATH

# Start service
log_info "Starting RoadWeave service"
systemctl start roadweave

# Check service status
log_info "Checking service status"
sleep 3
if systemctl is-active --quiet roadweave; then
    log_success "RoadWeave service is running"
else
    log_error "RoadWeave service failed to start"
    log_info "Restoring from backup..."
    
    # Restore backup
    systemctl stop roadweave
    cp "$BACKUP_DIR/.env" "$DEPLOY_PATH/backend/" 2>/dev/null || true
    cp "$BACKUP_DIR/roadweave.db" "$DEPLOY_PATH/backend/" 2>/dev/null || true
    cp -r "$BACKUP_DIR/uploads/"* "$DEPLOY_PATH/backend/uploads/" 2>/dev/null || true
    systemctl start roadweave
    
    log_error "Update failed. Backup restored. Check logs:"
    log_info "sudo journalctl -u roadweave --no-pager"
    exit 1
fi

# Cleanup old backup (keep only last 5)
log_info "Cleaning up old backups"
ls -dt /tmp/roadweave-backup-* 2>/dev/null | tail -n +6 | xargs rm -rf 2>/dev/null || true

log_success "Update completed successfully!"
log_info "Backup saved at: $BACKUP_DIR"
log_info "Monitor logs: sudo journalctl -u roadweave -f"