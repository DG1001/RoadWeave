#!/bin/bash
# Build Frontend for Production
# Use this if you already have npm dependencies installed

set -e

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load local configuration if available
if [ -f "$PROJECT_DIR/.env.local" ]; then
    source "$PROJECT_DIR/.env.local"
fi

DOMAIN="${ROADWEAVE_DOMAIN:-roadweave.yourdomain.com}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🏗️  Building frontend for $DOMAIN${NC}"

cd "$PROJECT_DIR/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found. Run 'npm install' first${NC}"
    exit 1
fi

# Build for production
echo -e "${BLUE}📦 Building React app...${NC}"
REACT_APP_API_BASE="https://$DOMAIN" npm run build

echo -e "${GREEN}✅ Frontend built successfully for $DOMAIN${NC}"
echo -e "${BLUE}📂 Static files are in: frontend/build/${NC}"