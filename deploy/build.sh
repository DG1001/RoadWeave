#!/bin/bash
# RoadWeave Production Build Script

set -e  # Exit on any error

echo "🏗️  Building RoadWeave for production..."

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

# Check if required tools are installed
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed. Aborting." >&2; exit 1; }

# Get domain from environment or use default
DOMAIN="${ROADWEAVE_DOMAIN:-roadweave.yourdomain.com}"
API_BASE="https://${DOMAIN}"

echo "📦 Installing frontend dependencies..."
cd frontend
npm ci --only=production

echo "🔧 Building React frontend for domain: $DOMAIN"
REACT_APP_API_BASE="$API_BASE" npm run build

echo "📁 Build output:"
ls -la build/

echo "✅ Frontend build completed!"
echo "📂 Static files are in: frontend/build/"
echo "🌐 API base URL: $API_BASE"

cd "$PROJECT_DIR"

# Check if Python virtual environment exists
if [ ! -d "venv" ]; then
    echo "⚠️  Python virtual environment not found."
    echo "   Run: python3 -m venv venv && source venv/bin/activate && pip install -r backend/requirements.txt"
fi

echo ""
echo "🎉 Build completed successfully!"
echo ""
echo "Next steps for deployment:"
echo "1. Copy files to server: /opt/roadweave/"
echo "2. Set up environment: cp deploy/production.env backend/.env"
echo "3. Edit backend/.env with your actual configuration"
echo "4. Install systemd service: sudo cp deploy/roadweave.service /etc/systemd/system/"
echo "5. Install nginx config: sudo cp deploy/nginx.conf /etc/nginx/sites-available/roadweave"
echo "6. Start services: sudo systemctl enable roadweave && sudo systemctl start roadweave"