# Setup & Configuration Guide

Complete installation and configuration guide for RoadWeave.

## Prerequisites

- **Python 3.8+** - Backend development
- **Node.js 14+** - Frontend development  
- **npm or yarn** - Package management
- **Google Gemini API key** - Required for AI features

## Backend Setup

### 1. Environment Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Configuration

```bash
# Copy example configuration
cp .env.example .env
```

Edit `.env` file with your settings:

```env
# Required - Get from https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your-actual-gemini-api-key-here

# Security (change in production)
SECRET_KEY=your-flask-secret-key
JWT_SECRET_KEY=your-jwt-secret-key

# Admin User (optional)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-admin-password

# AI Features (optional)
ENABLE_PHOTO_ANALYSIS=true
ENABLE_AUDIO_TRANSCRIPTION=true

# Photo Analysis Configuration
MAX_IMAGE_SIZE=1024
PHOTO_ANALYSIS_LOG_COSTS=true
DAILY_PHOTO_ANALYSIS_LIMIT=100

# Audio Transcription Configuration  
AUDIO_TRANSCRIPTION_LOG_COSTS=true

# Database
SQLALCHEMY_DATABASE_URI=sqlite:///roadweave.db

# File Uploads
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=16777216

# Server Configuration
FLASK_HOST=0.0.0.0
FLASK_PORT=5000
FLASK_DEBUG=True
```

### 3. Start Backend Server

```bash
python app.py
```

Admin credentials will be displayed in console on first startup.

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configuration

```bash
cp .env.example .env
```

Edit frontend `.env`:

```env
# Local development
REACT_APP_API_BASE=http://localhost:5000

# Network access (replace with your IP)
REACT_APP_API_BASE=http://192.168.1.100:5000

# Production
REACT_APP_API_BASE=https://roadweave.yourdomain.com
```

### 3. Start Development Server

```bash
npm start
```

Frontend available at `http://localhost:3000`

## Configuration Options

### Environment Variables

**Backend (.env):**

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | ✅ | - | Google Gemini API key |
| `SECRET_KEY` | 🔄 | Auto-generated | Flask secret key |
| `JWT_SECRET_KEY` | 🔄 | Auto-generated | JWT signing key |
| `ADMIN_USERNAME` | ❌ | `admin` | Admin username |
| `ADMIN_PASSWORD` | ❌ | Random | Admin password |
| `ENABLE_PHOTO_ANALYSIS` | ❌ | `false` | AI photo analysis |
| `ENABLE_AUDIO_TRANSCRIPTION` | ❌ | `false` | AI audio transcription |
| `MAX_IMAGE_SIZE` | ❌ | `1024` | Max image size (px) |
| `PHOTO_ANALYSIS_LOG_COSTS` | ❌ | `true` | Log cost estimates |
| `DAILY_PHOTO_ANALYSIS_LIMIT` | ❌ | `0` | Daily analysis limit |
| `SQLALCHEMY_DATABASE_URI` | ❌ | SQLite | Database connection |
| `UPLOAD_FOLDER` | ❌ | `uploads` | File upload directory |
| `FLASK_HOST` | ❌ | `0.0.0.0` | Server bind address |
| `FLASK_PORT` | ❌ | `5000` | Server port |

**Frontend (.env):**

| Variable | Required | Description |
|----------|----------|-------------|
| `REACT_APP_API_BASE` | ✅ | Backend API URL |

### Network Access Setup

To access from other devices on your network:

1. Start backend with default settings (binds to `0.0.0.0:5000`)
2. Find your IP address:
   ```bash
   # Linux/Mac
   ip addr show
   ifconfig
   
   # Windows
   ipconfig
   ```
3. Update frontend `.env`:
   ```env
   REACT_APP_API_BASE=http://YOUR_IP:5000
   ```
4. Access from any device: `http://YOUR_IP:3000`

### AI Feature Configuration

#### Photo Analysis Costs

Gemini 2.0 Flash pricing per photo:
- **Input**: ~$0.00013 (1024×1024 image)
- **Output**: ~$0.00008 (description)
- **Total**: ~$0.0002 per photo

Cost controls:
- `MAX_IMAGE_SIZE=1024` - Limits token usage
- `DAILY_PHOTO_ANALYSIS_LIMIT=100` - Daily limit
- `PHOTO_ANALYSIS_LOG_COSTS=true` - Show estimates

#### Audio Transcription

- Configurable with `ENABLE_AUDIO_TRANSCRIPTION=true`
- Cost tracking with `AUDIO_TRANSCRIPTION_LOG_COSTS=true`
- Supports multiple audio formats (webm, mp3, wav, ogg)

## Database Configuration

### SQLite (Default)
```env
SQLALCHEMY_DATABASE_URI=sqlite:///roadweave.db
```

### PostgreSQL
```env
SQLALCHEMY_DATABASE_URI=postgresql://user:password@localhost/roadweave
```

### MySQL
```env
SQLALCHEMY_DATABASE_URI=mysql+pymysql://user:password@localhost/roadweave
```

## File Structure

After setup:

```
roadweave/
├── backend/
│   ├── .env                # Your configuration
│   ├── app.py              # Main Flask app
│   ├── requirements.txt    # Dependencies
│   ├── roadweave.db        # SQLite database
│   └── uploads/            # Uploaded files
├── frontend/
│   ├── .env                # API configuration
│   ├── src/                # React source
│   ├── build/              # Production build
│   └── package.json        # Dependencies
└── doc/                    # Documentation
```

## Verification

Test your setup:

1. **Backend health check**:
   ```bash
   curl http://localhost:5000/api/health
   ```

2. **Frontend loading**: Visit `http://localhost:3000`

3. **Admin access**: Go to `http://localhost:3000/admin`

4. **AI features**: Check server logs for configuration status

## Next Steps

- [Usage Guide](usage.md) - Learn how to use RoadWeave
- [AI Features](ai-features.md) - Configure advanced AI capabilities  
- [Deployment Guide](deployment.md) - Deploy to production
- [Troubleshooting](troubleshooting.md) - Fix common issues