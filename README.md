# RoadWeave - Collaborative Travel Blog

<p align="center">
  <img src="logo.png" alt="RoadWeave Logo" width="150" height="150">
</p>

RoadWeave is a Progressive Web App (PWA) that enables collaborative travel blogging. An admin creates trips and adds travelers who can upload photos, text, and voice recordings with GPS data. AI automatically generates blog content from the entries.

## Features

### 🎯 Core Functionality
- **Admin Dashboard**: Create trips, add travelers, manage blog content with language selection
- **Traveler PWA**: Upload photos/audio/text with automatic GPS capture and comments
- **Multi-language Support**: Blog generation in 19 languages (English, Spanish, French, German, etc.)
- **Interactive Map**: Leaflet.js map showing all entry locations with detailed popups
- **Offline Support**: PWA works offline with upload queuing

### 🤖 AI-Powered Features
- **AI Blog Generation**: Google Gemini automatically creates engaging travel narratives
- **AI Photo Analysis**: Gemini Vision analyzes uploaded photos for rich descriptions
- **Smart Content Integration**: Photos appear inline with related blog content
- **Language-Aware AI**: All AI features respect selected blog language

### 📱 Enhanced User Experience
- **Magazine-Style Blog**: Professional layout with inline photos and styling
- **Collapsible Sections**: "All Entries" section folds by default for clean interface
- **Traveler Link Management**: Admin can always access and copy traveler links
- **Photo Comments**: Optional descriptions for uploaded photos
- **Real-time Updates**: Dynamic blog updates as new entries are added

## Technology Stack

### Backend
- **Flask** - Python web framework
- **SQLAlchemy** - Database ORM
- **SQLite** - Database (simple setup)
- **JWT** - Token-based authentication
- **Google Gemini AI** - Blog content generation

### Frontend
- **React.js** - UI framework
- **React Router** - Navigation
- **Leaflet.js** - Interactive maps
- **PWA** - Progressive Web App capabilities
- **Service Worker** - Offline functionality

## Quick Start

1. **Configure backend**:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and set GEMINI_API_KEY (required)
   pip install -r requirements.txt
   ```

2. **Configure frontend**:
   ```bash
   cd frontend
   cp .env.example .env
   # Edit .env and set REACT_APP_API_BASE to your backend URL
   npm install
   ```

3. **Start servers**:
   ```bash
   # Terminal 1 - Backend
   cd backend && python app.py
   
   # Terminal 2 - Frontend  
   cd frontend && npm start
   ```

4. **Access**: Admin at `http://localhost:3000/admin` (credentials in backend console)

## Setup Instructions

### Prerequisites
- Python 3.8+
- Node.js 14+
- npm or yarn
- Google Gemini API key

### Backend Setup

1. **Clone and navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env and set your API keys and configuration
   ```
   
   **Required:** Set your Google Gemini API key in `.env`:
   ```
   GEMINI_API_KEY=your-actual-gemini-api-key-here
   ```

5. **Run the Flask application:**
   ```bash
   python app.py
   ```
   
   **Note:** Admin credentials will be displayed in the console on first startup.
   
   The backend will be available at `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure API endpoint:**
   Create `.env` file in frontend directory (copy from .env.example):
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` to set your backend URL:
   ```
   # For local development (default)
   REACT_APP_API_BASE=http://localhost:5000
   
   # For production deployment
   REACT_APP_API_BASE=https://your-domain.com
   
   # For network access (replace with your IP)
   REACT_APP_API_BASE=http://192.168.1.100:5000
   ```

4. **Start the development server:**
   ```bash
   npm start
   ```
   
   The frontend will be available at `http://localhost:3000`

### Production Build

1. **Build the React app:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Serve static files via Flask:**
   Update Flask app to serve the built React files or use a web server like nginx.

## Usage Guide

### Admin Workflow

1. **Login to Admin Dashboard:**
   - Go to `http://localhost:3000/admin`
   - Use credentials displayed in backend server console
   - Default username: `admin`

2. **Create a Trip:**
   - Enter trip name and description
   - Click "Create Trip"

3. **Add Travelers:**
   - Select a trip
   - Add traveler names
   - Share the generated token links with travelers

4. **Manage Blog:**
   - View generated blog content
   - Regenerate blog if needed
   - Monitor entries and travelers

### Traveler Workflow

1. **Access Traveler Link:**
   - Use the unique token link provided by admin
   - Example: `http://localhost:3000/traveler/abc123...`

2. **Allow Location Access:**
   - Grant GPS permissions for automatic location capture

3. **Share Experiences:**
   - Allow location access for automatic GPS capture
   - Choose entry type: Text, Photo, or Voice
   - For photos: Add optional comments describing the moment
   - Add content and submit
   - Entries are automatically enhanced with AI and added to the blog

### Viewing the Blog

- **Access**: Navigate to `http://localhost:3000/blog/{trip_id}`
- **AI-Generated Narrative**: Read engaging travel stories with inline photos
- **Interactive Map**: Explore journey with markers and entry popups
- **Smart Photo Integration**: Images appear contextually within blog content
- **Collapsible Details**: Expand "All Entries" to see raw chronological data
- **Multi-language**: Content generated in selected language

### AI Photo Analysis

- **Gemini Vision Integration**: Advanced image analysis using Google's Gemini 2.0 Flash
- **Rich Descriptions**: AI generates detailed, travel-blog-style descriptions including:
  - Scene composition and objects
  - Setting type (urban, nature, indoor, etc.)
  - Mood and atmosphere
  - Notable features and details
- **Smart Integration**: Combines user comments with AI visual insights
- **Contextual Placement**: Photos appear inline with related blog paragraphs
- **Multi-language Support**: Analysis and descriptions in selected blog language
- **Configurable Feature**: Enable/disable via `ENABLE_PHOTO_ANALYSIS=true` in backend `.env`
- **Cost Optimization**: Configurable image resizing and cost logging
- **Graceful Fallback**: Continues working if analysis fails or is disabled

### Photo Analysis Costs

**Gemini 2.0 Flash Pricing (per photo analysis):**
- **Input Cost**: ~$0.00013 per 1024×1024 image (~1,290 tokens)
- **Output Cost**: ~$0.00008 per description (~200 tokens)
- **Total Cost**: **~$0.0002 per photo** (less than 2 cents per 100 photos)

**Usage Examples:**
- **10 photos/day**: ~$0.002/day ($0.60/year)
- **100 photos/day**: ~$0.02/day ($7.30/year)  
- **1,000 photos/day**: ~$0.20/day ($73/year)

**Cost Controls:**
- `MAX_IMAGE_SIZE=1024` - Controls token usage by limiting image size
- `PHOTO_ANALYSIS_LOG_COSTS=true` - Shows cost estimates in server logs
- `DAILY_PHOTO_ANALYSIS_LIMIT=100` - Sets daily analysis limit (0 = unlimited)
- `ENABLE_PHOTO_ANALYSIS=false` - Completely disables feature to avoid costs
- **Free Tier**: Available for development and testing

**Usage Monitoring:**
- Real-time cost estimates shown in server logs
- Daily usage tracking with automatic cleanup
- Graceful fallback when limits are reached (uses user comments instead)
- Startup logging shows all configuration settings

## API Endpoints

### Admin Endpoints
- `POST /api/admin/login` - Admin authentication
- `GET /api/admin/trips` - List all trips
- `POST /api/admin/trips` - Create new trip
- `POST /api/admin/trips/{id}/travelers` - Add traveler to trip
- `POST /api/admin/trips/{id}/regenerate-blog` - Regenerate blog content

### Traveler Endpoints
- `GET /api/traveler/verify/{token}` - Verify traveler token
- `POST /api/traveler/{token}/entries` - Submit new entry

### Public Endpoints
- `GET /api/trips/{id}/blog` - Get blog content
- `GET /api/trips/{id}/entries` - Get all entries
- `GET /api/trips/{id}/travelers` - Get travelers list
- `GET /uploads/{filename}` - Serve uploaded files

## Testing the Application

### Basic Test Flow

1. **Start both backend and frontend servers**

2. **Admin creates a trip:**
   ```bash
   # Login as admin
   curl -X POST http://localhost:5000/api/admin/login \
     -H "Content-Type: application/json" \
     -d '{"username": "admin", "password": "password123"}'
   
   # Create trip (use token from login response)
   curl -X POST http://localhost:5000/api/admin/trips \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name": "European Adventure", "description": "Our amazing trip across Europe"}'
   ```

3. **Add a traveler:**
   ```bash
   curl -X POST http://localhost:5000/api/admin/trips/1/travelers \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name": "John Doe"}'
   ```

4. **Test traveler entry submission:**
   ```bash
   # Text entry
   curl -X POST http://localhost:5000/api/traveler/TRAVELER_TOKEN/entries \
     -F "content_type=text" \
     -F "content=Amazing view from the Eiffel Tower!" \
     -F "latitude=48.8584" \
     -F "longitude=2.2945"
   ```

5. **View the generated blog:**
   ```bash
   curl http://localhost:5000/api/trips/1/blog
   ```

## Configuration

### Environment Variables

**Backend (.env):**
```
# Required
GEMINI_API_KEY=your-google-gemini-api-key

# Security (recommended to change in production)
SECRET_KEY=your-flask-secret-key
JWT_SECRET_KEY=your-jwt-secret-key

# Admin User (optional - if not set, random password generated)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-admin-password

# AI Photo Analysis (optional - requires Gemini API key)
ENABLE_PHOTO_ANALYSIS=true

# Photo Analysis Configuration (optional)
MAX_IMAGE_SIZE=1024
PHOTO_ANALYSIS_LOG_COSTS=true

# Database and uploads (optional)
SQLALCHEMY_DATABASE_URI=sqlite:///roadweave.db
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=16777216

# Server configuration (optional)
FLASK_HOST=0.0.0.0
FLASK_PORT=5000
FLASK_DEBUG=True
```

**Frontend (.env):**
```
# Required: Backend API URL
REACT_APP_API_BASE=http://localhost:5000

# Common configurations:
# Local development: http://localhost:5000
# Network access: http://192.168.1.100:5000  
# Production: https://api.yourdomain.com
# Docker: http://backend:5000
```

### Deployment Configuration Examples

**Local Network Access:**
If you want to access the app from other devices on your network:
1. Start backend with: `python app.py` (binds to 0.0.0.0:5000)
2. Find your IP: `ip addr show` or `ifconfig`
3. Set frontend `.env`: `REACT_APP_API_BASE=http://YOUR_IP:5000`
4. Access from any device: `http://YOUR_IP:3000`

**Docker Deployment:**
```yaml
# docker-compose.yml example
version: '3'
services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_BASE=http://backend:5000
```

**Production Deployment:**
```bash
# Build React app for production
cd frontend
REACT_APP_API_BASE=https://api.yourdomain.com npm run build

# Serve with nginx, Apache, or Flask
```

### Security Notes

- Change default admin credentials in production
- Use strong secret keys
- Configure CORS properly for production
- Implement rate limiting for API endpoints
- Use HTTPS in production
- Secure file upload validation

## File Structure

```
roadweave/
├── backend/
│   ├── app.py              # Main Flask application
│   ├── requirements.txt    # Python dependencies
│   └── uploads/           # Uploaded files directory
├── frontend/
│   ├── public/
│   │   ├── manifest.json  # PWA manifest
│   │   ├── service-worker.js
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminLogin.js
│   │   │   ├── AdminDashboard.js
│   │   │   ├── TravelerPWA.js
│   │   │   └── BlogView.js
│   │   ├── App.js
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
└── README.md
```

## Troubleshooting

### Common Issues

1. **CORS Errors:**
   - Ensure Flask-CORS is configured
   - Check API_BASE URL in frontend

2. **File Upload Issues:**
   - Verify uploads directory exists and is writable
   - Check file size limits

3. **Geolocation Not Working:**
   - Ensure HTTPS in production
   - Check browser permissions

4. **AI Not Generating Content:**
   - Verify Gemini API key is correct
   - Check API rate limits

5. **PWA Not Installing:**
   - Ensure HTTPS in production
   - Check manifest.json validity

### Development Tips

- Use browser developer tools to debug PWA features
- Monitor network requests for API issues
- Check console for JavaScript errors
- Use Flask debug mode for backend development

## Development Credits

This application was created using:

- **[Claude Code](https://claude.ai/code)** - Anthropic's official CLI for Claude AI
- **[XaresAICoder](https://github.com/DG1001/XaresAICoder)** - Enhanced AI coding environment

The entire RoadWeave application, including its sophisticated AI photo analysis, multi-language support, and PWA capabilities, was developed through AI-assisted coding. This demonstrates the power of modern AI development tools in creating production-ready applications.

## License

This project is for educational purposes. Please ensure you have proper licenses for all dependencies and API keys.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Recent Updates

### Version 2.0 Features ✨
- **🤖 AI Photo Analysis**: Gemini Vision analyzes uploaded photos for rich descriptions
- **📷 Inline Photo Display**: Smart contextual photo placement in blog content
- **🗂️ Collapsible UI**: "All Entries" section folds by default for cleaner interface
- **🔗 Traveler Link Management**: Admin dashboard shows all traveler access links
- **💬 Photo Comments**: Optional descriptions when uploading photos
- **🌍 Multi-language Support**: Blog generation in 19 languages
- **⚙️ Configurable Features**: Environment-based feature toggles

### What's New in Blog Experience
- **Magazine-Style Layout**: Professional design with inline photos and styling
- **Smart Photo Matching**: Images automatically appear with related content
- **Enhanced Narratives**: AI combines visual analysis with user comments
- **Progressive Disclosure**: Main story prominent, details available on demand
- **Rich Media Integration**: Photos, maps, and text work seamlessly together

## Support

For issues and questions:
1. Check this README
2. Review the code comments
3. Test API endpoints directly
4. Check browser console for errors
5. Verify environment configuration (especially `GEMINI_API_KEY` and `ENABLE_PHOTO_ANALYSIS`)