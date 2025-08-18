#!/bin/bash
# RoadWeave Deployment Script
# This script sets up RoadWeave on a production server

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

log_info "Starting RoadWeave deployment to $DOMAIN"
log_info "Deploy path: $DEPLOY_PATH"

# Create deploy user
log_info "Creating deployment user: $DEPLOY_USER"
if ! id "$DEPLOY_USER" &>/dev/null; then
    useradd --system --shell /bin/bash --home-dir $DEPLOY_PATH --create-home $DEPLOY_USER
    log_success "User $DEPLOY_USER created"
else
    log_warning "User $DEPLOY_USER already exists"
fi

# Create project directory
log_info "Setting up project directory"
mkdir -p $DEPLOY_PATH
chown $DEPLOY_USER:$DEPLOY_USER $DEPLOY_PATH

# Install system dependencies
log_info "Installing system dependencies"
apt update
apt install -y python3 python3-venv python3-pip nodejs npm nginx certbot python3-certbot-nginx

# Copy project files (assumes script is run from project directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

log_info "Copying project files"
cp -r "$PROJECT_DIR"/* $DEPLOY_PATH/
chown -R $DEPLOY_USER:$DEPLOY_USER $DEPLOY_PATH

# Set up Python environment
log_info "Setting up Python virtual environment"
sudo -u $DEPLOY_USER bash -c "
    cd $DEPLOY_PATH
    python3 -m venv venv
    source venv/bin/activate
    pip install -r backend/requirements.txt
"

# Build frontend
log_info "Building frontend for domain: $DOMAIN"
sudo -u $DEPLOY_USER bash -c "
    cd $DEPLOY_PATH/frontend
    npm ci --only=production
    REACT_APP_API_BASE=https://$DOMAIN npm run build
"

# Set up environment file
log_info "Setting up environment configuration"
if [ ! -f "$DEPLOY_PATH/backend/.env" ]; then
    cp "$DEPLOY_PATH/deploy/production.env" "$DEPLOY_PATH/backend/.env"
    chown $DEPLOY_USER:$DEPLOY_USER "$DEPLOY_PATH/backend/.env"
    log_warning "Environment file created. EDIT $DEPLOY_PATH/backend/.env with your actual configuration!"
else
    log_warning "Environment file already exists: $DEPLOY_PATH/backend/.env"
fi

# Create uploads directory
log_info "Setting up uploads directory"
mkdir -p "$DEPLOY_PATH/backend/uploads"
chown $DEPLOY_USER:$DEPLOY_USER "$DEPLOY_PATH/backend/uploads"
chmod 755 "$DEPLOY_PATH/backend/uploads"

# Install systemd service
log_info "Installing systemd service"
sed "s/roadweave.yourdomain.com/$DOMAIN/g" "$DEPLOY_PATH/deploy/roadweave.service" > /etc/systemd/system/roadweave.service
systemctl daemon-reload
systemctl enable roadweave

# Install nginx configuration
log_info "Installing nginx configuration"
sed "s/roadweave.yourdomain.com/$DOMAIN/g" "$DEPLOY_PATH/deploy/nginx.conf" > /etc/nginx/sites-available/roadweave

# Enable nginx site
if [ ! -L "/etc/nginx/sites-enabled/roadweave" ]; then
    ln -s /etc/nginx/sites-available/roadweave /etc/nginx/sites-enabled/
    log_success "Nginx site enabled"
else
    log_warning "Nginx site already enabled"
fi

# Test nginx configuration
log_info "Testing nginx configuration"
nginx -t

# Start services
log_info "Starting RoadWeave service"
systemctl start roadweave

# Reload nginx
log_info "Reloading nginx"
systemctl reload nginx

# Check service status
log_info "Checking service status"
if systemctl is-active --quiet roadweave; then
    log_success "RoadWeave service is running"
else
    log_error "RoadWeave service failed to start"
    systemctl status roadweave
    exit 1
fi

# Display next steps
echo ""
log_success "Deployment completed successfully!"
echo ""
log_info "Next steps:"
echo "1. Edit configuration: $DEPLOY_PATH/backend/.env"
echo "   - Set your GEMINI_API_KEY"
echo "   - Set secure ADMIN_PASSWORD"
echo "   - Update SECRET_KEY and JWT_SECRET_KEY"
echo ""
echo "2. Obtain SSL certificate:"
echo "   sudo certbot --nginx -d $DOMAIN"
echo ""
echo "3. Restart service after configuration:"
echo "   sudo systemctl restart roadweave"
echo ""
echo "4. Monitor logs:"
echo "   sudo journalctl -u roadweave -f"
echo ""
log_info "Access your application at: https://$DOMAIN"