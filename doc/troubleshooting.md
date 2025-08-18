# Troubleshooting Guide

Common issues and solutions for RoadWeave deployment and usage.

## Installation Issues

### Backend Setup Problems

#### Python Version Issues
**Problem**: `ImportError` or module compatibility errors
**Solution**:
```bash
# Check Python version
python --version  # Should be 3.8+

# Use specific Python version
python3.8 -m venv venv
# or
python3.9 -m venv venv
```

#### Virtual Environment Issues
**Problem**: `pip install` fails or packages not found
**Solution**:
```bash
# Recreate virtual environment
rm -rf venv
python3 -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Upgrade pip
pip install --upgrade pip
pip install -r requirements.txt
```

#### Missing System Dependencies
**Problem**: `error: Microsoft Visual C++ 14.0 is required` (Windows)
**Solution**:
```bash
# Install Visual Studio Build Tools
# Download from: https://visualstudio.microsoft.com/downloads/

# Or use conda environment
conda create -n roadweave python=3.8
conda activate roadweave
pip install -r requirements.txt
```

**Problem**: `Failed building wheel for X` (Linux)
**Solution**:
```bash
# Install build dependencies
sudo apt update
sudo apt install build-essential python3-dev

# For specific packages
sudo apt install libffi-dev libssl-dev
```

### Frontend Setup Problems

#### Node.js Version Issues
**Problem**: `npm install` fails with version errors
**Solution**:
```bash
# Check Node.js version
node --version  # Should be 14+

# Use Node Version Manager (nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 16
nvm use 16
```

#### npm Permission Issues
**Problem**: `EACCES: permission denied` when running npm
**Solution**:
```bash
# Fix npm permissions
sudo chown -R $(whoami) $(npm config get prefix)/{lib/node_modules,bin,share}

# Or use npx for one-time commands
npx create-react-app my-app
```

#### Package Lock Conflicts
**Problem**: `npm ci` fails with lock file conflicts
**Solution**:
```bash
# Delete lock file and node_modules
rm package-lock.json
rm -rf node_modules

# Fresh install
npm install
```

## Configuration Issues

### Environment Variables

#### Missing Gemini API Key
**Problem**: AI features not working, "API key error" in logs
**Solution**:
```bash
# Get API key from https://makersuite.google.com/app/apikey
# Add to backend/.env
GEMINI_API_KEY=your-actual-api-key-here

# Verify it's loaded
cd backend
python -c "import os; from dotenv import load_dotenv; load_dotenv(); print(os.getenv('GEMINI_API_KEY'))"
```

#### Frontend API Connection Issues
**Problem**: `Network Error` or `CORS` errors in browser console
**Solution**:
```bash
# Check frontend/.env
cat frontend/.env
# Should contain: REACT_APP_API_BASE=http://localhost:5000

# Verify backend is running
curl http://localhost:5000/api/health

# Check browser developer tools Network tab for actual requests
```

#### Database Issues
**Problem**: `sqlite3.OperationalError: unable to open database file`
**Solution**:
```bash
# Check permissions
ls -la backend/
chmod 664 backend/roadweave.db

# Check directory permissions
chmod 755 backend/

# Create uploads directory
mkdir -p backend/uploads
chmod 755 backend/uploads
```

## Runtime Issues

### Authentication Problems

#### Admin Login Fails
**Problem**: "Invalid credentials" message
**Solution**:
```bash
# Check backend console for admin credentials
# They're printed on first startup

# Reset admin password
cd backend
# Edit .env and add:
ADMIN_PASSWORD=your-new-password

# Restart backend
python app.py
```

#### JWT Token Expired
**Problem**: "Token expired" or redirected to login
**Solution**:
```bash
# Tokens expire after 30 days by default
# Clear browser storage and login again

# Or extend token lifetime in backend/.env
JWT_ACCESS_TOKEN_EXPIRES=60  # days
```

#### Traveler Token Invalid
**Problem**: "Invalid token" when accessing traveler link
**Solution**:
```bash
# Check token in URL is complete and unmodified
# Regenerate traveler link from admin dashboard
# Ensure no special characters were corrupted in sharing
```

### File Upload Issues

#### Large File Upload Fails
**Problem**: Upload stops or times out for large files
**Solution**:
```bash
# Increase upload limits in backend/.env
MAX_CONTENT_LENGTH=33554432  # 32MB

# For nginx deployment, update nginx.conf:
client_max_body_size 32M;
```

#### Upload Directory Not Writable
**Problem**: "Permission denied" when uploading files
**Solution**:
```bash
# Fix permissions
chmod 755 backend/uploads
chown -R $(whoami) backend/uploads

# For production deployment
sudo chown -R roadweave:roadweave /opt/roadweave/backend/uploads
```

#### Unsupported File Format
**Problem**: Upload accepted but file not processed
**Solution**:
```bash
# Check supported formats in app.py
# Images: png, jpg, jpeg, gif
# Audio: mp3, wav, ogg, webm

# Convert file to supported format
ffmpeg -i input.m4a output.mp3  # Audio conversion
convert input.tiff output.jpg   # Image conversion
```

### AI Feature Issues

#### Photo Analysis Not Working
**Problem**: Photos upload but no AI descriptions generated
**Solution**:
```bash
# Check if feature is enabled
grep ENABLE_PHOTO_ANALYSIS backend/.env
# Should be: ENABLE_PHOTO_ANALYSIS=true

# Check daily limit
grep DAILY_PHOTO_ANALYSIS_LIMIT backend/.env
# Increase or set to 0 for unlimited

# Check logs for API errors
tail -f backend/logs  # or check console output
```

#### Audio Transcription Fails
**Problem**: Audio uploads but no transcription in blog
**Solution**:
```bash
# Enable feature
echo "ENABLE_AUDIO_TRANSCRIPTION=true" >> backend/.env

# Check audio format is supported
file your_audio.webm
# Should show: WebM data

# Check file size (large files may fail)
ls -lh your_audio.webm
```

#### Gemini API Rate Limiting
**Problem**: "API rate limit exceeded" errors
**Solution**:
```bash
# Implement exponential backoff (already in code)
# Reduce daily limits
DAILY_PHOTO_ANALYSIS_LIMIT=50

# Monitor API usage
PHOTO_ANALYSIS_LOG_COSTS=true
AUDIO_TRANSCRIPTION_LOG_COSTS=true

# Consider upgrading Gemini API plan
```

### PWA Issues

#### PWA Not Installing
**Problem**: No "Add to Home Screen" prompt
**Solution**:
```bash
# Ensure HTTPS in production
# Check manifest.json is accessible
curl http://localhost:3000/manifest.json

# Verify service worker registration
# Check browser console for service worker errors

# For development, use browser Dev Tools > Application > Manifest
```

#### Offline Functionality Not Working
**Problem**: App doesn't work offline
**Solution**:
```bash
# Check service worker is registered
# Browser Dev Tools > Application > Service Workers

# Verify cache strategy in service-worker.js
# Test offline mode in browser Dev Tools > Network > Offline
```

## Network Issues

### CORS Errors

#### Cross-Origin Request Blocked
**Problem**: `Access-Control-Allow-Origin` errors
**Solution**:
```bash
# Verify Flask-CORS is installed
pip list | grep Flask-CORS

# Check CORS configuration in app.py
# Should have: CORS(app)

# For production, configure specific origins
CORS_ORIGINS=https://yourdomain.com
```

### Firewall Issues

#### Cannot Access from Other Devices
**Problem**: App works on localhost but not from network
**Solution**:
```bash
# Ensure backend binds to 0.0.0.0
grep FLASK_HOST backend/.env
# Should be: FLASK_HOST=0.0.0.0

# Check firewall rules
sudo ufw status
sudo ufw allow 5000  # for development
sudo ufw allow 3000  # for development

# Find your IP address
ip addr show  # Linux
ifconfig      # Mac
ipconfig      # Windows
```

### DNS Issues

#### Domain Not Resolving
**Problem**: Can't access via domain name
**Solution**:
```bash
# Check DNS propagation
nslookup roadweave.yourdomain.com
dig roadweave.yourdomain.com

# Verify nginx configuration
sudo nginx -t
sudo systemctl status nginx

# Check SSL certificate
sudo certbot certificates
```

## Performance Issues

### Slow Loading

#### Frontend Bundle Too Large
**Problem**: Slow initial page load
**Solution**:
```bash
# Analyze bundle size
cd frontend
npm run build
npx bundle-analyzer build/static/js/*.js

# Optimize build
npm install --save-dev @babel/plugin-proposal-dynamic-import
# Add lazy loading for components
```

#### Database Performance
**Problem**: Slow API responses
**Solution**:
```bash
# For SQLite, add indexes
sqlite3 backend/roadweave.db
.schema
CREATE INDEX idx_entry_trip_id ON entry(trip_id);
CREATE INDEX idx_entry_timestamp ON entry(timestamp);

# Consider PostgreSQL for production
pip install psycopg2-binary
# Update SQLALCHEMY_DATABASE_URI
```

### Memory Issues

#### High Memory Usage
**Problem**: Backend consuming too much memory
**Solution**:
```bash
# Monitor memory usage
top -p $(pgrep -f "python app.py")

# Optimize image processing
MAX_IMAGE_SIZE=512  # Reduce from 1024

# Consider adding swap space
sudo swapon --show
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## Production Deployment Issues

### Service Won't Start

#### Systemd Service Fails
**Problem**: `systemctl start roadweave` fails
**Solution**:
```bash
# Check service status
sudo systemctl status roadweave
sudo journalctl -u roadweave --no-pager

# Common fixes:
# 1. Check file paths in service file
# 2. Verify user permissions
# 3. Check environment file exists
# 4. Verify Python virtual environment path
```

#### Port Already in Use
**Problem**: "Address already in use" error
**Solution**:
```bash
# Find process using port
sudo netstat -tlnp | grep :7300
sudo lsof -i :7300

# Kill process
sudo kill <PID>

# Or change port in .env
FLASK_PORT=7301
```

### SSL Certificate Issues

#### Certificate Expired
**Problem**: Browser shows "Not Secure"
**Solution**:
```bash
# Check certificate expiry
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Auto-renewal setup
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

#### Mixed Content Warnings
**Problem**: Some content not loading over HTTPS
**Solution**:
```bash
# Check for http:// URLs in code
grep -r "http://" frontend/src/
grep -r "http://" backend/

# Update to relative URLs or https://
# Check Content Security Policy headers
```

### Database Migration Issues

#### Schema Changes
**Problem**: Database errors after updates
**Solution**:
```bash
# Backup database first
cp backend/roadweave.db backend/roadweave.db.backup

# Check migration in app.py migrate_database()
# For custom migrations:
sqlite3 backend/roadweave.db
.schema
# Add missing columns manually if needed
```

## Browser-Specific Issues

### Safari Issues

#### PWA Installation Problems
**Problem**: "Add to Home Screen" not working on Safari
**Solution**:
- Ensure HTTPS is used
- Check manifest.json has all required fields
- Verify apple-touch-icon is present
- Test on iOS Safari specifically

### Chrome Issues

#### Service Worker Caching Issues
**Problem**: Old version cached even after updates
**Solution**:
```javascript
// In browser console
navigator.serviceWorker.getRegistrations()
  .then(registrations => {
    registrations.forEach(reg => reg.unregister())
  })

// Or use "Update on reload" in DevTools
```

## Debugging Tools

### Backend Debugging

```bash
# Enable Flask debug mode
FLASK_DEBUG=True

# Check database contents
sqlite3 backend/roadweave.db
.tables
SELECT * FROM trip;
SELECT * FROM traveler;
SELECT * FROM entry ORDER BY timestamp DESC;

# Monitor API requests
tail -f /var/log/nginx/roadweave.access.log
```

### Frontend Debugging

```javascript
// Browser console debugging
console.log('API Base:', process.env.REACT_APP_API_BASE)

// Network requests
fetch('/api/health')
  .then(r => r.json())
  .then(console.log)

// Local storage inspection
console.log('Admin Token:', localStorage.getItem('adminToken'))
```

### Log Analysis

```bash
# Backend logs
cd backend
python app.py > app.log 2>&1 &
tail -f app.log

# System logs
sudo journalctl -u roadweave -f
sudo tail -f /var/log/nginx/error.log

# Filter logs by type
grep "ERROR" app.log
grep "🤖" app.log  # AI features
grep "💰" app.log  # Cost tracking
```

## Getting Help

### Information to Gather

When reporting issues, include:

1. **Environment**:
   ```bash
   python --version
   node --version
   uname -a  # Linux/Mac
   ```

2. **Configuration**:
   ```bash
   # Remove sensitive data like API keys
   cat backend/.env | grep -v API_KEY
   cat frontend/.env
   ```

3. **Error Messages**:
   ```bash
   # Full error output
   sudo journalctl -u roadweave --no-pager
   ```

4. **Browser Console**:
   - Open Developer Tools (F12)
   - Check Console tab for JavaScript errors
   - Check Network tab for failed API calls

### Community Resources

- Check existing GitHub issues
- Review documentation in `doc/` directory
- Test with minimal reproduction case
- Include relevant log excerpts (sanitized)

### Quick Diagnostic Script

```bash
#!/bin/bash
echo "=== RoadWeave Diagnostic ==="
echo "Python: $(python --version)"
echo "Node: $(node --version)"
echo "Backend status: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health)"
echo "Frontend status: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)"
echo "Backend env file exists: $(test -f backend/.env && echo "Yes" || echo "No")"
echo "Frontend env file exists: $(test -f frontend/.env && echo "Yes" || echo "No")"
echo "Uploads directory: $(test -d backend/uploads && echo "Exists" || echo "Missing")"
echo "Build directory: $(test -d frontend/build && echo "Exists" || echo "Missing")"
```

## Next Steps

- [Setup Guide](setup.md) - Initial configuration
- [Usage Guide](usage.md) - Application workflows  
- [Deployment Guide](deployment.md) - Production setup
- [API Reference](api.md) - Technical details