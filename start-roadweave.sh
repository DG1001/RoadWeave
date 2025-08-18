#!/bin/bash
# RoadWeave Manual Start Script for tmux
# Usage: ./start-roadweave.sh

set -e

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load local configuration if available
if [ -f "$PROJECT_DIR/.env.local" ]; then
    echo -e "${BLUE}📋 Loading local configuration...${NC}"
    source "$PROJECT_DIR/.env.local"
fi

DOMAIN="${ROADWEAVE_DOMAIN:-roadweave.yourdomain.com}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting RoadWeave for $DOMAIN${NC}"

# Check if .env exists
if [ ! -f "$PROJECT_DIR/backend/.env" ]; then
    echo -e "${YELLOW}⚠️  No .env file found. Creating from template...${NC}"
    cp "$PROJECT_DIR/backend/.env.example" "$PROJECT_DIR/backend/.env"
    echo -e "${YELLOW}📝 Please edit backend/.env with your settings!${NC}"
fi

# Check if local configuration exists
if [ ! -f "$PROJECT_DIR/.env.local" ]; then
    echo -e "${YELLOW}💡 Tip: Create .env.local for your domain configuration${NC}"
    echo -e "${BLUE}   Example: echo 'ROADWEAVE_DOMAIN=roadweave.example.com' > .env.local${NC}"
fi

# Check if frontend is built
if [ ! -d "$PROJECT_DIR/frontend/build" ]; then
    echo -e "${YELLOW}📦 Frontend not built. Building now...${NC}"
    cd "$PROJECT_DIR/frontend"
    
    # Check if node_modules exists, if not install dependencies
    if [ ! -d "node_modules" ]; then
        echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
        npm install --only=production
    else
        echo -e "${BLUE}📦 Dependencies already installed, building...${NC}"
    fi
    
    REACT_APP_API_BASE="https://$DOMAIN" npm run build
    cd "$PROJECT_DIR"
    echo -e "${GREEN}✅ Frontend built successfully${NC}"
fi

# Check if virtual environment exists
if [ ! -d "$PROJECT_DIR/venv" ]; then
    echo -e "${YELLOW}🐍 Creating Python virtual environment...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    pip install -r backend/requirements.txt
    echo -e "${GREEN}✅ Virtual environment created${NC}"
else
    echo -e "${BLUE}🐍 Activating virtual environment...${NC}"
    source venv/bin/activate
fi

# Start Flask application
echo -e "${GREEN}🌐 Starting RoadWeave on port 7300...${NC}"
echo -e "${BLUE}📱 Access at: https://$DOMAIN${NC}"
echo -e "${YELLOW}⏹️  Press Ctrl+C to stop${NC}"
echo ""

cd backend
python app.py