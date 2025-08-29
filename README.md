# RoadWeave - Collaborative Travel Blog

<p align="center">
  <img src="logo.png" alt="RoadWeave Logo" width="150" height="150">
</p>

**RoadWeave** is a collaborative travel blogging platform. Create trips, add travelers, and let AI automatically generate engaging travel blogs from photos, text, and voice recordings with GPS data.


https://github.com/user-attachments/assets/bfab7424-db05-4c42-9c6a-260fb53b415d


## ✨ Key Features

- **🤖 AI-Powered Blogging**: Google Gemini automatically generates travel narratives
- **📸 Smart Photo Analysis**: AI analyzes photos for rich descriptions
- **🎤 Voice-to-Text**: Audio messages transcribed and integrated into blogs
- **🗺️ Interactive Location Picker**: Choose exact locations via interactive maps
- **📅 Calendar View**: Navigate blog entries by date with visual calendar
- **📍 Coordinate Editing**: Admin tools for precise location management
- **🌍 Multi-language Support**: Blog generation in 19 languages
- **👍 Interactive Reactions**: LinkedIn-style reactions for public engagement
- **📱 Mobile-Friendly**: Responsive design optimized for mobile devices
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
- **[Interactive Reactions](doc/reactions.md)** - Public engagement system guide
- **[API Reference](doc/api.md)** - Complete API documentation
- **[AI Features](doc/ai-features.md)** - Photo analysis and audio transcription
- **[Deployment Guide](doc/deployment.md)** - Production deployment
- **[Troubleshooting](doc/troubleshooting.md)** - Common issues and solutions

## 🏗️ Technology Stack

**Backend**: Flask, SQLAlchemy, JWT, Google Gemini AI  
**Frontend**: React.js, Leaflet.js  
**Database**: SQLite (configurable)

## 🎯 Recent Updates

### Interactive Reactions System (Latest!) 👍
- **LinkedIn-Style Reactions**: 6 reaction types (Like, Applause, Support, Love, Insightful, Funny) for public blog engagement
- **Admin Control**: Toggle reactions on/off per trip with visual feedback buttons  
- **Privacy-Friendly**: No user tracking - reactions stored locally, counts aggregated anonymously
- **One Reaction Per User**: Users can select one reaction per post, stored in browser localStorage
- **Real-time Counts**: See reaction counts from all visitors with optimistic UI updates
- **Mobile Responsive**: Styled reaction buttons adapt to all screen sizes

### Click-to-Jump Navigation & Location Mini-Maps 🗺️
- **Interactive Map Popups**: Click on mini-images, text, or audio buttons in map markers to jump directly to that content in the blog
- **Smart Date Filtering**: Automatically clears date filters when jumping to entries from different dates
- **Location Mini-Maps**: Click 📍 icons next to timestamps to see exactly where entries were created
- **Universal Navigation**: Works for all entry types (photos, text, audio) in both admin and public views

### Interactive Location Selection 🗺️
- **Manual Location Picker**: Choose exact locations using interactive maps
- **GPS + Map Options**: Switch between automatic GPS and manual selection
- **Precise Positioning**: Click or drag markers for perfect accuracy
- **Admin Coordinate Editing**: Fix incorrect coordinates with visual map tools

### Calendar Navigation & Content Splitting 📅
- **Visual Calendar**: Navigate blog entries by date with entry count badges
- **Content Pieces**: Blog entries split into individual timestamped pieces
- **Date Filtering**: Click calendar days to filter entries
- **Clean Timestamps**: Professional timestamp metadata with traveler names

### Location System Improvements 📍
- **Removed EXIF GPS**: No more unreliable photo GPS extraction
- **Consistent Location Source**: All entries use device GPS or manual selection
- **Better Accuracy**: More reliable and user-controlled positioning

### Audio Transcription 🎤
- Voice messages are transcribed to text using AI
- Transcriptions are intelligently integrated into blog content
- Configure with `ENABLE_AUDIO_TRANSCRIPTION=true`

### Enhanced Security 🔒
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
