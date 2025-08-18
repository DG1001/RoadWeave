# RoadWeave - Collaborative Travel Blog

<p align="center">
  <img src="logo.png" alt="RoadWeave Logo" width="150" height="150">
</p>

RoadWeave is a Progressive Web App (PWA) that enables collaborative travel blogging. An admin creates trips and adds travelers who can upload photos, text, and voice recordings with GPS data. AI automatically generates blog content from the entries.

## Features

- **Admin Dashboard**: Create trips, add travelers, manage blog content
- **Traveler PWA**: Upload photos/audio/text with automatic GPS capture
- **AI Blog Generation**: Google Gemini automatically creates travel narratives
- **AI Photo Analysis**: Optional Gemini Vision analysis of uploaded photos
- **Interactive Map**: Leaflet.js map showing all entry locations
- **Offline Support**: PWA works offline with upload queuing
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
   - Choose entry type: Text, Photo, or Voice
   - Add content and submit
   - Entries are automatically added to the blog

### Viewing the Blog

- Access the blog at: `http://localhost:3000/blog/{trip_id}`
- View AI-generated travel narrative
- Explore interactive map with entry markers
- Browse chronological entries

### AI Photo Analysis

- **Automatic Analysis**: When enabled, photos are analyzed using Gemini Vision API
- **Enhanced Descriptions**: AI generates vivid descriptions of photo contents
- **User Comments Integration**: Combines user comments with AI visual analysis
- **Multi-language Support**: Photo analysis respects selected blog language
- **Configuration**: Enable/disable via `ENABLE_PHOTO_ANALYSIS=true` in `.env`
- **Visual Indicators**: Blog shows when photos have been AI-enhanced

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

## License

This project is for educational purposes. Please ensure you have proper licenses for all dependencies and API keys.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Support

For issues and questions:
1. Check this README
2. Review the code comments
3. Test API endpoints directly
4. Check browser console for errors