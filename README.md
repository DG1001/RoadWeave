# RoadWeave - Collaborative Travel Blog

<p align="center">
  <img src="logo.png" alt="RoadWeave Logo" width="150" height="150">
</p>

**RoadWeave** is a Progressive Web App (PWA) that enables collaborative travel blogging. Create trips, add travelers, and let AI automatically generate engaging travel blogs from photos, text, and voice recordings with GPS data.

## ✨ Key Features

- **🤖 AI-Powered Blogging**: Google Gemini automatically generates travel narratives
- **📸 Smart Photo Analysis**: AI analyzes photos for rich descriptions
- **🎤 Voice-to-Text**: Audio messages transcribed and integrated into blogs
- **🌍 Multi-language Support**: Blog generation in 19 languages
- **📱 PWA Experience**: Works offline, installable on mobile devices
- **🗺️ Interactive Maps**: Leaflet.js maps with entry locations
- **🔒 Secure Access**: Token-based traveler access, admin dashboard

## 🚀 Quick Start

### Prerequisites
- Python 3.8+ and Node.js 14+
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Setup
```bash
# 1. Clone and install backend
cd backend
cp .env.example .env  # Edit and add your GEMINI_API_KEY
pip install -r requirements.txt
python app.py

# 2. Setup frontend (in new terminal)
cd frontend  
cp .env.example .env  # Set REACT_APP_API_BASE=http://localhost:5000
npm install
npm start
```

### Access
- **Admin Dashboard**: `http://localhost:3000/admin`
- **Credentials**: Displayed in backend console on first startup

## 📱 How It Works

1. **Admin** creates trips and adds travelers via dashboard
2. **Travelers** receive unique token links to upload content
3. **AI** automatically generates blog content from entries
4. **Everyone** can view the generated travel blog with maps

## 🔧 Configuration

Enable advanced AI features in `backend/.env`:

```env
# Required
GEMINI_API_KEY=your-api-key-here

# Optional AI Features
ENABLE_PHOTO_ANALYSIS=true      # AI photo descriptions
ENABLE_AUDIO_TRANSCRIPTION=true # Voice-to-text
```

## 🌐 Production Deployment

See [Deployment Guide](doc/deployment.md) for production setup with nginx, SSL, and systemd.

## 📚 Documentation

- **[Setup & Configuration](doc/setup.md)** - Detailed installation guide
- **[Usage Guide](doc/usage.md)** - Admin and traveler workflows  
- **[API Reference](doc/api.md)** - Complete API documentation
- **[AI Features](doc/ai-features.md)** - Photo analysis and audio transcription
- **[Deployment Guide](doc/deployment.md)** - Production deployment
- **[Troubleshooting](doc/troubleshooting.md)** - Common issues and solutions

## 🏗️ Technology Stack

**Backend**: Flask, SQLAlchemy, JWT, Google Gemini AI  
**Frontend**: React.js, Leaflet.js, PWA, Service Worker  
**Database**: SQLite (configurable)

## 🎯 Recent Updates

### Audio Transcription (New!) 🎤
- Voice messages are now transcribed to text using AI
- Transcriptions are intelligently integrated into blog content
- Configure with `ENABLE_AUDIO_TRANSCRIPTION=true`

### Enhanced Security 🔒
- Fixed blog access security vulnerability
- Admin-only routes properly protected
- Public blogs only accessible via tokens

## 🤝 Development

Built with:
- **[Claude Code](https://claude.ai/code)** - Anthropic's AI development environment
- **[XaresAICoder](https://github.com/DG1001/XaresAICoder)** - Enhanced AI coding tools

## 📄 License

Educational use. Ensure proper API key licenses and dependency compliance.

---

**Need help?** Check the [documentation](doc/) or review the detailed guides for setup, usage, and deployment.