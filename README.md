# RoadWeave - Collaborative Travel Blog

RoadWeave is a Progressive Web App (PWA) that enables collaborative travel blogging. An admin creates trips and adds travelers who can upload photos, text, and voice recordings with GPS data. AI automatically generates blog content from the entries.

## Features

- **Admin Dashboard**: Create trips, add travelers, manage blog content
- **Traveler PWA**: Upload photos/audio/text with automatic GPS capture
- **AI Blog Generation**: Google Gemini automatically creates travel narratives
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

4. **Set environment variables:**
   ```bash
   export SECRET_KEY="your-secret-key-here"
   export JWT_SECRET_KEY="your-jwt-secret-here"
   export GEMINI_API_KEY="your-gemini-api-key-here"
   ```
   
   Or create a `.env` file:
   ```
   SECRET_KEY=your-secret-key-here
   JWT_SECRET_KEY=your-jwt-secret-here
   GEMINI_API_KEY=your-gemini-api-key-here
   ```

5. **Run the Flask application:**
   ```bash
   python app.py
   ```
   
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

3. **Set API base URL (optional):**
   Create `.env` file in frontend directory:
   ```
   REACT_APP_API_BASE=http://localhost:5000
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
   - Use credentials: `admin` / `password123`

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
SECRET_KEY=your-flask-secret-key
JWT_SECRET_KEY=your-jwt-secret-key
GEMINI_API_KEY=your-google-gemini-api-key
SQLALCHEMY_DATABASE_URI=sqlite:///roadweave.db
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=16777216
```

**Frontend (.env):**
```
REACT_APP_API_BASE=http://localhost:5000
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