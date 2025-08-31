# RoadWeave - Complete Recreation Specification

This document provides a comprehensive specification for recreating RoadWeave, a collaborative travel blogging platform with AI-powered content generation. Every detail needed to rebuild the application from scratch is documented below.

## Table of Contents

1. [System Architecture & Tech Stack](#system-architecture--tech-stack)
2. [Database Schema Specification](#database-schema-specification)
3. [Backend API Specification](#backend-api-specification)
4. [Frontend Component Architecture](#frontend-component-architecture)
5. [Core Features Implementation](#core-features-implementation)
6. [Configuration & Environment](#configuration--environment)
7. [User Workflows & Business Logic](#user-workflows--business-logic)
8. [Deployment & Production Setup](#deployment--production-setup)

---

## System Architecture & Tech Stack

### Backend Stack
```
Flask 2.3.3                    # Web framework
Flask-SQLAlchemy 3.0.5         # ORM and database management
Flask-JWT-Extended 4.5.3       # JWT authentication
Flask-CORS 4.0.0               # Cross-origin resource sharing
google-generativeai 0.3.2      # Google Gemini AI integration
Werkzeug 2.3.7                 # WSGI utilities
python-dotenv 1.0.0            # Environment variable management
Pillow 10.0.1                  # Image processing
pytz 2023.3                    # Timezone handling
```

### Frontend Stack
```
React 18.2.0                   # Frontend framework
React Router DOM 6.8.1         # Client-side routing
React Scripts 5.0.1            # Build toolchain
Axios 1.3.4                    # HTTP client
Leaflet 1.9.3                  # Interactive maps
React-Leaflet 4.2.1            # React wrapper for Leaflet
React-Markdown 10.1.0          # Markdown rendering
exif-js 2.3.0                  # EXIF data extraction
piexifjs 1.0.6                 # EXIF data manipulation
```

### Database
- **SQLite** (configurable via `SQLALCHEMY_DATABASE_URI`)
- **File Storage**: Local filesystem for uploads (configurable)

### External Services
- **Google Gemini AI**: For blog generation, photo analysis, audio transcription
- **Geolocation API**: Browser-based GPS positioning
- **Web Audio API**: Audio recording functionality

### Architecture Pattern
- **Backend**: RESTful API with JWT authentication
- **Frontend**: Single Page Application (SPA) with client-side routing
- **Database**: Relational model with foreign key relationships
- **File Handling**: Server-side upload with client-side preview
- **Real-time Features**: Polling-based updates (no WebSocket)

---

## Database Schema Specification

### Trip Model
```python
class Trip(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    admin_token = db.Column(db.String(100), unique=True, nullable=False)  # Admin access token
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    blog_content = db.Column(db.Text, default='')  # Legacy AI-generated content
    blog_language = db.Column(db.String(10), default='en')  # ISO language code
    public_enabled = db.Column(db.Boolean, default=False)  # Public blog access
    public_token = db.Column(db.String(100), unique=True)  # Public access token
    reactions_enabled = db.Column(db.Boolean, default=True)  # Enable reactions
    
    # Relationships
    travelers = db.relationship('Traveler', backref='trip', lazy=True, cascade='all, delete-orphan')
    entries = db.relationship('Entry', backref='trip', lazy=True, cascade='all, delete-orphan')
```

### Traveler Model
```python
class Traveler(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    token = db.Column(db.String(100), unique=True, nullable=False)  # Unique access token
    trip_id = db.Column(db.Integer, db.ForeignKey('trip.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    entries = db.relationship('Entry', backref='traveler', lazy=True)
```

### Entry Model
```python
class Entry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    trip_id = db.Column(db.Integer, db.ForeignKey('trip.id'), nullable=False)
    traveler_id = db.Column(db.Integer, db.ForeignKey('traveler.id'), nullable=False)
    content_type = db.Column(db.String(20), nullable=False)  # 'text', 'photo', 'audio'
    content = db.Column(db.Text)  # Text content or file path for media
    latitude = db.Column(db.Float)  # GPS latitude
    longitude = db.Column(db.Float)  # GPS longitude
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    filename = db.Column(db.String(255))  # Original filename for uploads
    disabled = db.Column(db.Boolean, default=False, nullable=False)  # Exclude from AI processing
```

### TripContent Model (AI-Generated Content Pieces)
```python
class TripContent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    trip_id = db.Column(db.Integer, db.ForeignKey('trip.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    generated_content = db.Column(db.Text, nullable=False)  # AI-generated markdown
    latitude = db.Column(db.Float)  # Location of content piece
    longitude = db.Column(db.Float)  # Location of content piece
    original_text = db.Column(db.Text)  # Original user input that prompted generation
    entry_ids = db.Column(db.Text)  # JSON array of related Entry IDs
    content_date = db.Column(db.Date, nullable=False)  # Date for calendar grouping
    
    # Relationships
    trip = db.relationship('Trip', backref=db.backref('content_pieces', lazy=True, cascade='all, delete-orphan'))
```

### PostReaction Model
```python
class PostReaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    trip_id = db.Column(db.Integer, db.ForeignKey('trip.id'), nullable=False)
    content_piece_id = db.Column(db.Integer, db.ForeignKey('trip_content.id'), nullable=False)
    reaction_type = db.Column(db.String(20), nullable=False)  # 'like', 'applause', 'support', 'love', 'insightful', 'funny'
    count = db.Column(db.Integer, default=0, nullable=False)  # Aggregated count
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    trip = db.relationship('Trip', backref=db.backref('reactions', lazy=True, cascade='all, delete-orphan'))
    content_piece = db.relationship('TripContent', backref=db.backref('reactions', lazy=True, cascade='all, delete-orphan'))
    
    # Constraints
    __table_args__ = (db.UniqueConstraint('content_piece_id', 'reaction_type', name='unique_content_reaction'),)
```

### Database Relationships
- **Trip** → **Travelers** (1:N, cascade delete)
- **Trip** → **Entries** (1:N, cascade delete)  
- **Trip** → **TripContent** (1:N, cascade delete)
- **Trip** → **PostReaction** (1:N, cascade delete)
- **Traveler** → **Entries** (1:N)
- **TripContent** → **PostReaction** (1:N, cascade delete)

---

## Backend API Specification

### Authentication System

#### JWT Authentication (Admin)
- **Header**: `Authorization: Bearer <jwt_token>` OR `X-Auth-Token: Bearer <jwt_token>`
- **Expiration**: 30 days
- **Custom header support**: `X-Auth-Token` for compatibility

#### Token Authentication (Travelers & Public)
- **URL Parameter**: `/api/traveler/<token>` or `/api/public/<token>`
- **Generated**: `secrets.token_urlsafe(32)` (URL-safe random tokens)

### Admin Endpoints

#### POST `/api/admin/login`
```json
Request:
{
  "username": "admin",
  "password": "admin_password"
}

Response (200):
{
  "token": "jwt_token_string"
}

Errors:
401: Invalid credentials
```

#### GET `/api/admin/trips`
```json
Headers: Authorization: Bearer <jwt_token>

Response (200):
[
  {
    "id": 1,
    "name": "European Adventure",
    "description": "Trip through Europe",
    "admin_token": "secure_admin_token",
    "created_at": "2023-12-01T10:00:00Z",
    "blog_language": "en",
    "public_enabled": true,
    "public_token": "public_access_token",
    "reactions_enabled": true,
    "travelers": [
      {
        "id": 1,
        "name": "John Doe",
        "token": "traveler_token"
      }
    ]
  }
]
```

#### POST `/api/admin/trips`
```json
Headers: Authorization: Bearer <jwt_token>

Request:
{
  "name": "Trip Name",
  "description": "Trip Description",
  "blog_language": "en"
}

Response (201):
{
  "id": 1,
  "name": "Trip Name",
  "admin_token": "generated_admin_token",
  "public_token": "generated_public_token"
}
```

#### POST `/api/admin/trips/<int:trip_id>/travelers`
```json
Headers: Authorization: Bearer <jwt_token>

Request:
{
  "name": "Traveler Name"
}

Response (201):
{
  "id": 1,
  "name": "Traveler Name",
  "token": "unique_traveler_token",
  "trip_id": 1
}
```

#### PUT `/api/admin/trips/<int:trip_id>/language`
```json
Headers: Authorization: Bearer <jwt_token>

Request:
{
  "blog_language": "es"
}

Response (200):
{
  "message": "Language updated",
  "blog_language": "es"
}
```

#### PUT `/api/admin/trips/<int:trip_id>/public`
```json
Headers: Authorization: Bearer <jwt_token>

Request:
{
  "public_enabled": true
}

Response (200):
{
  "public_enabled": true,
  "public_token": "public_access_token"
}
```

#### PUT `/api/admin/trips/<int:trip_id>/reactions`
```json
Headers: Authorization: Bearer <jwt_token>

Request:
{
  "reactions_enabled": false
}

Response (200):
{
  "reactions_enabled": false
}
```

#### DELETE `/api/admin/trips/<int:trip_id>`
```json
Headers: Authorization: Bearer <jwt_token>

Response (200):
{
  "message": "Trip deleted"
}
```

#### POST `/api/admin/trips/<int:trip_id>/regenerate-blog`
```json
Headers: Authorization: Bearer <jwt_token>

Response (200):
{
  "message": "Blog regeneration started",
  "trip_id": 1
}

Process: Triggers AI blog regeneration in background
```

#### POST `/api/admin/trips/<int:trip_id>/migrate-content`
```json
Headers: Authorization: Bearer <jwt_token>

Response (200):
{
  "message": "Content migrated successfully",
  "pieces_created": 5
}

Process: Converts legacy blog_content to TripContent pieces
```

### Traveler Endpoints

#### GET `/api/traveler/verify/<token>`
```json
Response (200):
{
  "traveler": {
    "id": 1,
    "name": "John Doe",
    "trip": {
      "id": 1,
      "name": "European Adventure"
    }
  }
}

Errors:
404: Invalid token
```

#### POST `/api/traveler/<token>/entries`
```json
Content-Type: multipart/form-data

Form Data:
- content_type: "text" | "photo" | "audio"
- content: "Text content" (for text entries)
- file: File object (for photo/audio entries)  
- latitude: 52.5200 (optional)
- longitude: 13.4050 (optional)

Response (201):
{
  "id": 1,
  "content_type": "text",
  "content": "Amazing sunset!",
  "latitude": 52.5200,
  "longitude": 13.4050,
  "timestamp": "2023-12-01T18:30:00Z"
}
```

### Public Blog Endpoints

#### GET `/api/public/<token>`
```json
Response (200):
{
  "trip": {
    "id": 1,
    "name": "European Adventure",
    "description": "Amazing journey",
    "reactions_enabled": true
  }
}

Errors:
404: Invalid token or public access disabled
```

#### GET `/api/public/<token>/content`
```json
Response (200):
{
  "content_pieces": [
    {
      "id": 1,
      "generated_content": "## Day 1\n\nAmazing start...",
      "timestamp": "2023-12-01T10:00:00Z",
      "latitude": 52.5200,
      "longitude": 13.4050,
      "content_date": "2023-12-01"
    }
  ]
}
```

#### GET `/api/public/<token>/content/calendar`
```json
Response (200):
{
  "2023-12-01": 3,
  "2023-12-02": 5,
  "2023-12-03": 2
}
```

#### GET `/api/public/<token>/content/date/<date>`
```json
Response (200):
{
  "content_pieces": [
    {
      "id": 1,
      "generated_content": "Content for this date...",
      "timestamp": "2023-12-01T10:00:00Z"
    }
  ]
}
```

#### GET `/api/public/<token>/reactions/<int:content_id>`
```json
Response (200):
{
  "like": 5,
  "applause": 2,
  "support": 1,
  "love": 8,
  "insightful": 0,
  "funny": 3
}
```

#### POST `/api/public/<token>/reactions/<int:content_id>`
```json
Request:
{
  "reaction_type": "like"
}

Response (200):
{
  "message": "Reaction added",
  "reaction_type": "like",
  "new_count": 6
}
```

### Admin Content Management

#### GET `/api/trips/<int:trip_id>/entries`
```json
Headers: Authorization: Bearer <jwt_token>

Response (200):
{
  "entries": [
    {
      "id": 1,
      "content_type": "photo",
      "content": "/uploads/photo_123.jpg",
      "traveler_name": "John Doe",
      "timestamp": "2023-12-01T15:30:00Z",
      "latitude": 52.5200,
      "longitude": 13.4050,
      "disabled": false
    }
  ]
}
```

#### PUT `/api/admin/entries/<int:entry_id>/coordinates`
```json
Headers: Authorization: Bearer <jwt_token>

Request:
{
  "latitude": 52.5200,
  "longitude": 13.4050
}

Response (200):
{
  "message": "Coordinates updated"
}
```

#### PUT `/api/admin/entries/<int:entry_id>/toggle-disabled`
```json
Headers: Authorization: Bearer <jwt_token>

Response (200):
{
  "disabled": true,
  "message": "Entry disabled"
}
```

### File Handling

#### GET `/uploads/<filename>`
```
Response: File content with appropriate Content-Type
Security: Basic path traversal protection
```

#### Health Check
```json
GET /api/health

Response (200):
{
  "status": "healthy",
  "timestamp": "2023-12-01T10:00:00Z"
}
```

---

## Frontend Component Architecture

### Application Structure
```
src/
├── App.js                    # Main app router
├── index.js                  # React entry point
├── config/
│   └── api.js               # API configuration utilities
└── components/
    ├── AdminLogin.js        # Admin authentication
    ├── AdminDashboard.js    # Trip management interface
    ├── TravelerPWA.js       # Content upload interface
    ├── BlogView.js          # Admin blog preview
    ├── PublicBlogView.js    # Public blog viewer
    ├── CalendarView.js      # Date navigation component
    ├── LocationPicker.js    # Interactive map location selector
    ├── MiniMapModal.js      # Location preview modal
    ├── CoordinateEditor.js  # Admin coordinate editing tool
    ├── PostReactions.js     # Reaction system component
    └── ReactionButton.js    # Individual reaction button
```

### Routing Configuration (App.js)
```javascript
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

<Routes>
  <Route path="/" element={<Navigate to="/admin" replace />} />
  <Route path="/admin" element={<AdminLogin />} />
  <Route path="/admin/dashboard" element={<AdminDashboard />} />
  <Route path="/admin/blog/:tripId" element={<BlogView />} />
  <Route path="/traveler/:token" element={<TravelerPWA />} />
  <Route path="/public/:token" element={<PublicBlogView />} />
</Routes>
```

### API Configuration (config/api.js)
```javascript
export const getApiUrl = (endpoint) => {
  const baseUrl = process.env.REACT_APP_API_BASE || 'http://localhost:5000';
  return `${baseUrl}${endpoint}`;
};

export const getAuthHeaders = () => {
  const token = localStorage.getItem('adminToken');
  return token ? { 'X-Auth-Token': `Bearer ${token}` } : {};
};
```

### Component Specifications

#### AdminLogin.js
**Purpose**: Admin authentication interface
**State Management**:
```javascript
const [username, setUsername] = useState('');
const [password, setPassword] = useState('');
const [loading, setLoading] = useState(false);
const [error, setError] = useState('');
```

**Key Functions**:
- `handleLogin()`: POST to `/api/admin/login`, store JWT in localStorage
- Redirect to `/admin/dashboard` on success
- Error handling for invalid credentials

#### AdminDashboard.js  
**Purpose**: Trip and traveler management interface
**State Management**:
```javascript
const [trips, setTrips] = useState([]);
const [selectedTrip, setSelectedTrip] = useState(null);
const [travelers, setTravelers] = useState([]);
const [newTrip, setNewTrip] = useState({ name: '', description: '', blog_language: 'en' });
const [regeneratingTrips, setRegeneratingTrips] = useState(new Set());
```

**Key Features**:
- Trip CRUD operations
- Traveler management
- Blog regeneration triggers
- Language selection (19 languages)
- Public access toggle
- Reactions toggle

**Language Support**:
```javascript
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'nl', name: 'Dutch' },
  { code: 'sv', name: 'Swedish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' }
];
```

#### TravelerPWA.js
**Purpose**: Progressive Web App for content upload
**State Management**:
```javascript
const [traveler, setTraveler] = useState(null);
const [entryType, setEntryType] = useState('text');
const [textContent, setTextContent] = useState('');
const [selectedFile, setSelectedFile] = useState(null);
const [isRecording, setIsRecording] = useState(false);
const [audioBlob, setAudioBlob] = useState(null);
const [location, setLocation] = useState(null);
const [locationSource, setLocationSource] = useState('current'); // 'current' or 'manual'
const [manualLocation, setManualLocation] = useState(null);
```

**Key Features**:
- Token verification
- Multi-type content upload (text, photo, audio)
- GPS location capture
- Manual location selection via interactive map
- Audio recording with Web Audio API
- File upload with progress indication
- Mobile-optimized UI

**Audio Recording Implementation**:
```javascript
const startRecording = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorder.current = new MediaRecorder(stream);
  
  mediaRecorder.current.ondataavailable = (event) => {
    audioChunks.current.push(event.data);
  };
  
  mediaRecorder.current.onstop = () => {
    const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
    setAudioBlob(audioBlob);
    audioChunks.current = [];
  };
  
  mediaRecorder.current.start();
  setIsRecording(true);
};
```

#### PublicBlogView.js
**Purpose**: Public blog viewing interface with map integration
**Dependencies**: 
- React-Leaflet for maps
- React-Markdown for content rendering

**State Management**:
```javascript
const [trip, setTrip] = useState(null);
const [entries, setEntries] = useState([]);
const [contentPieces, setContentPieces] = useState([]);
const [selectedDate, setSelectedDate] = useState(null);
const [calendarData, setCalendarData] = useState({});
const [showMiniMap, setShowMiniMap] = useState(false);
const [selectedLocation, setSelectedLocation] = useState(null);
```

**Map Integration**:
- Leaflet.js with custom markers for different content types
- Auto-fitting bounds based on entry locations
- Click-to-jump navigation from map to content
- Mini-map modals for location details

**Custom Map Icons**:
```javascript
const createIcon = (type) => {
  const colors = {
    text: '#007bff',
    photo: '#28a745',
    audio: '#dc3545'
  };
  
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background-color: ${colors[type] || '#007bff'};
      width: 25px;
      height: 25px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [25, 25],
    iconAnchor: [12, 12]
  });
};
```

#### CalendarView.js
**Purpose**: Date-based content navigation
**Props**:
```javascript
{
  calendarData: { "2023-12-01": 3, "2023-12-02": 5 },
  selectedDate: "2023-12-01",
  onDateSelect: (date) => {...}
}
```

**Features**:
- Monthly calendar grid
- Entry count badges on dates
- Date selection for filtering
- Responsive mobile layout

#### LocationPicker.js
**Purpose**: Interactive map for manual location selection
**Props**:
```javascript
{
  initialLocation: { lat: 52.5200, lng: 13.4050 },
  onLocationSelect: (location) => {...},
  onClose: () => {...}
}
```

**Features**:
- Click-to-select location
- Draggable marker
- Search functionality (optional)
- Coordinate display

#### PostReactions.js & ReactionButton.js
**Purpose**: LinkedIn-style reaction system
**Reaction Types**:
```javascript
const REACTIONS = [
  { type: 'like', emoji: '👍', label: 'Like' },
  { type: 'applause', emoji: '👏', label: 'Applause' },
  { type: 'support', emoji: '💪', label: 'Support' },
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'insightful', emoji: '💡', label: 'Insightful' },
  { type: 'funny', emoji: '😂', label: 'Funny' }
];
```

**Local Storage Management**:
- Store user reactions in `localStorage`
- One reaction per content piece per user
- Optimistic UI updates
- Sync with server on selection

---

## Core Features Implementation

### AI-Powered Blog Generation

#### Gemini AI Configuration
```python
import google.generativeai as genai

GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
genai.configure(api_key=GEMINI_API_KEY)

# Model configuration
model = genai.GenerativeModel('gemini-1.5-pro')
```

#### Blog Generation Workflow

1. **Content Collection**: Gather entries from database ordered by timestamp
2. **Context Preparation**: Format entries with metadata (traveler, location, timestamp)
3. **AI Prompt Construction**: Create language-specific prompts
4. **Content Generation**: Call Gemini API with prepared context
5. **Content Processing**: Split generated content into date-based pieces
6. **Database Storage**: Save content pieces to `TripContent` table

#### AI Prompt Template
```python
def generate_blog_prompt(entries, language, trip_name):
    prompt = f"""
Create an engaging travel blog in {LANGUAGE_NAMES[language]} for the trip "{trip_name}".

Guidelines:
- Write in a narrative style with personality
- Include specific details from photos and locations
- Organize chronologically by date
- Use markdown formatting
- Include location context when available
- Integrate user comments naturally

Content to process:
{format_entries_for_ai(entries)}

Generate a cohesive blog that tells the story of this journey.
"""
    return prompt
```

#### Photo Analysis Integration
```python
def analyze_image_with_ai(image_path, user_comment=""):
    """Analyze image using Gemini Vision API"""
    try:
        image = Image.open(image_path)
        
        # Resize for cost optimization
        max_size = int(os.getenv('MAX_IMAGE_SIZE', 1024))
        if image.size[0] > max_size or image.size[1] > max_size:
            image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        
        # Analyze with Gemini
        prompt = f"""
        Analyze this travel photo and describe what you see in detail.
        Focus on: location, activities, atmosphere, notable features.
        
        User context: {user_comment}
        
        Provide a vivid description that could be used in a travel blog.
        """
        
        response = model.generate_content([prompt, image])
        return response.text
        
    except Exception as e:
        print(f"Photo analysis error: {e}")
        return None
```

#### Audio Transcription
```python
def transcribe_audio_with_ai(audio_path):
    """Transcribe audio using Gemini"""
    try:
        # Upload audio file to Gemini
        audio_file = genai.upload_file(audio_path)
        
        prompt = """
        Transcribe this audio recording accurately.
        Focus on clear transcription that captures the speaker's travel experience.
        """
        
        response = model.generate_content([prompt, audio_file])
        return response.text
        
    except Exception as e:
        print(f"Audio transcription error: {e}")
        return None
```

### Interactive Map System

#### Leaflet Integration
```javascript
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.3/images/marker-shadow.png',
});
```

#### Location Services
```javascript
const getCurrentLocation = () => {
  if (!navigator.geolocation) {
    setError('Geolocation not supported');
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      setLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      });
    },
    (error) => {
      console.error('Location error:', error);
      setError('Could not get location');
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    }
  );
};
```

#### Map Bounds Auto-Fitting
```javascript
function MapBoundsFitter({ entries }) {
  const map = useMap();

  useEffect(() => {
    if (entries.length === 0) return;
    
    const validEntries = entries.filter(entry => 
      entry.latitude && entry.longitude
    );
    
    if (validEntries.length === 0) return;
    
    if (validEntries.length === 1) {
      // Single marker - center on it
      map.setView([validEntries[0].latitude, validEntries[0].longitude], 13);
    } else {
      // Multiple markers - fit bounds
      const bounds = L.latLngBounds(
        validEntries.map(entry => [entry.latitude, entry.longitude])
      );
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [entries, map]);

  return null;
}
```

### Calendar Navigation System

#### Calendar Data Structure
```javascript
// Calendar data format: { "YYYY-MM-DD": count }
const calendarData = {
  "2023-12-01": 3,
  "2023-12-02": 5,
  "2023-12-03": 2
};
```

#### Date-Based Content Filtering
```python
@app.route('/api/trips/<int:trip_id>/content/date/<date>', methods=['GET'])
@jwt_required()
def get_trip_content_by_date(trip_id, date):
    """Get content pieces for specific date"""
    try:
        # Parse date
        content_date = datetime.strptime(date, '%Y-%m-%d').date()
        
        # Query content pieces for this date
        content_pieces = TripContent.query.filter_by(
            trip_id=trip_id,
            content_date=content_date
        ).order_by(TripContent.timestamp).all()
        
        return jsonify({
            'content_pieces': [format_content_piece(piece) for piece in content_pieces]
        })
        
    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
```

### Reactions System

#### Client-Side Reaction Management
```javascript
const PostReactions = ({ contentId, token, tripReactionsEnabled }) => {
  const [reactions, setReactions] = useState({});
  const [userReaction, setUserReaction] = useState(null);
  
  useEffect(() => {
    // Load user's previous reaction from localStorage
    const stored = localStorage.getItem(`reaction_${contentId}`);
    if (stored) setUserReaction(stored);
    
    // Load reaction counts from server
    loadReactions();
  }, [contentId]);
  
  const addReaction = async (reactionType) => {
    try {
      // Optimistic update
      setUserReaction(reactionType);
      setReactions(prev => ({
        ...prev,
        [reactionType]: (prev[reactionType] || 0) + 1
      }));
      
      // Store in localStorage
      localStorage.setItem(`reaction_${contentId}`, reactionType);
      
      // Sync with server
      await axios.post(getApiUrl(`/api/public/${token}/reactions/${contentId}`), {
        reaction_type: reactionType
      });
      
      // Refresh counts
      loadReactions();
      
    } catch (error) {
      console.error('Reaction error:', error);
      // Rollback optimistic update
      setUserReaction(null);
      loadReactions();
    }
  };
  
  return (
    <div className="post-reactions">
      {REACTIONS.map(reaction => (
        <ReactionButton
          key={reaction.type}
          reaction={reaction}
          count={reactions[reaction.type] || 0}
          isSelected={userReaction === reaction.type}
          onClick={() => addReaction(reaction.type)}
        />
      ))}
    </div>
  );
};
```

#### Server-Side Reaction Aggregation
```python
@app.route('/api/public/<token>/reactions/<int:content_id>', methods=['POST'])
def add_reaction(token, content_id):
    """Add or update reaction to content piece"""
    try:
        data = request.get_json()
        reaction_type = data.get('reaction_type')
        
        if reaction_type not in ['like', 'applause', 'support', 'love', 'insightful', 'funny']:
            return jsonify({'error': 'Invalid reaction type'}), 400
        
        # Find existing reaction or create new
        reaction = PostReaction.query.filter_by(
            content_piece_id=content_id,
            reaction_type=reaction_type
        ).first()
        
        if reaction:
            reaction.count += 1
            reaction.updated_at = datetime.utcnow()
        else:
            reaction = PostReaction(
                trip_id=trip.id,
                content_piece_id=content_id,
                reaction_type=reaction_type,
                count=1
            )
            db.session.add(reaction)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Reaction added',
            'reaction_type': reaction_type,
            'new_count': reaction.count
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
```

---

## Configuration & Environment

### Backend Environment Variables (.env)

#### Required Configuration
```bash
# Flask Configuration
SECRET_KEY=your-super-secret-flask-key-change-me-in-production
JWT_SECRET_KEY=your-jwt-secret-key-change-me-in-production

# Google Gemini AI (Required)
GEMINI_API_KEY=your-gemini-api-key-here

# Database
SQLALCHEMY_DATABASE_URI=sqlite:///roadweave.db

# Flask Server
FLASK_HOST=0.0.0.0
FLASK_PORT=7300
```

#### Optional Configuration
```bash
# AI Features
ENABLE_PHOTO_ANALYSIS=true
ENABLE_AUDIO_TRANSCRIPTION=true

# Photo Analysis Settings
MAX_IMAGE_SIZE=1024
PHOTO_ANALYSIS_LOG_COSTS=true
DAILY_PHOTO_ANALYSIS_LIMIT=100

# Audio Transcription Settings  
AUDIO_TRANSCRIPTION_LOG_COSTS=true

# File Upload
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=33554432  # 32MB

# Admin User (Optional - will generate random if not set)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password

# Timezone
TIMEZONE=Europe/Berlin

# CORS (Optional)
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Frontend Environment Variables (.env)

```bash
# API Base URL
REACT_APP_API_BASE=http://localhost:5000

# Production examples:
# REACT_APP_API_BASE=https://your-domain.com
# REACT_APP_API_BASE=https://api.roadweave.com
```

### Admin Credentials Setup

#### Automatic Generation
```python
def setup_admin_credentials():
    """Setup admin credentials from environment or generate random password"""
    username = os.getenv('ADMIN_USERNAME', 'admin')
    password = os.getenv('ADMIN_PASSWORD')
    
    if not password:
        # Generate secure random password
        password = ''.join(secrets.choice(
            string.ascii_letters + string.digits + "!@#$%^&*"
        ) for _ in range(12))
        
        print("=" * 60)
        print("🔐 ADMIN CREDENTIALS")
        print("=" * 60)
        print(f"Username: {username}")
        print(f"Password: {password}")
        print("=" * 60)
        print("⚠️  SAVE THESE CREDENTIALS - Password is randomly generated!")
        print("   Set ADMIN_PASSWORD in .env to use a custom password.")
        print("=" * 60)
    
    return username, password
```

### File Upload Configuration

#### Allowed File Types
```python
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'mp3', 'wav', 'ogg', 'webm', 'm4a', 'aac'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def is_image_file(filename):
    IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in IMAGE_EXTENSIONS

def is_audio_file(filename):
    AUDIO_EXTENSIONS = {'mp3', 'wav', 'ogg', 'webm', 'm4a', 'aac'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in AUDIO_EXTENSIONS
```

#### Security Configuration
```python
from werkzeug.utils import secure_filename

def save_uploaded_file(file, prefix=''):
    """Securely save uploaded file"""
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
        unique_filename = f"{prefix}{timestamp}{filename}"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(filepath)
        return unique_filename
    return None
```

---

## User Workflows & Business Logic

### Admin Workflow

#### 1. Initial Setup
```
1. Start backend server
2. Note generated admin credentials from console
3. Navigate to /admin
4. Login with credentials
5. Access dashboard at /admin/dashboard
```

#### 2. Trip Creation
```
AdminDashboard.js:
1. Fill trip form (name, description, language)
2. POST /api/admin/trips
3. Receive admin_token and public_token
4. Trip appears in trips list
5. Auto-select new trip for management
```

#### 3. Traveler Management
```
AdminDashboard.js:
1. Select trip from list
2. Fill traveler name form
3. POST /api/admin/trips/{id}/travelers
4. Receive unique traveler token
5. Copy traveler link: /traveler/{token}
6. Share link with traveler
```

#### 4. Content Management
```
BlogView.js:
1. Navigate to /admin/blog/{tripId}
2. View all entries with map locations
3. Edit coordinates via CoordinateEditor
4. Toggle entry disabled status
5. Regenerate blog content
6. Enable/disable public access
7. Configure reactions system
```

#### 5. Blog Generation
```
Backend Process:
1. Collect all enabled entries
2. Analyze photos with Gemini (if enabled)
3. Transcribe audio with Gemini (if enabled)
4. Generate blog content with language-specific prompts
5. Split content into date-based pieces
6. Store in TripContent table
7. Update trip.blog_content (legacy support)
```

### Traveler Workflow

#### 1. Access Validation
```
TravelerPWA.js:
1. Receive link: /traveler/{token}
2. GET /api/traveler/verify/{token}
3. Display traveler name and trip info
4. Show content upload interface
```

#### 2. Location Setup
```
TravelerPWA.js:
1. Request geolocation permission
2. Get current GPS position
3. Option to switch to manual location selection
4. Use LocationPicker for manual selection
5. Store location for entry upload
```

#### 3. Content Upload - Text Entry
```
TravelerPWA.js:
1. Select "Text" entry type
2. Enter text content
3. Location automatically included
4. POST /api/traveler/{token}/entries
   - content_type: "text"
   - content: "Text content"
   - latitude: GPS_lat
   - longitude: GPS_lng
```

#### 4. Content Upload - Photo Entry
```
TravelerPWA.js:
1. Select "Photo" entry type  
2. Choose file via input or camera
3. Preview image
4. Optional: Add text description
5. POST /api/traveler/{token}/entries (multipart)
   - content_type: "photo"
   - file: image_file
   - content: "Optional description"
   - latitude: GPS_lat
   - longitude: GPS_lng
```

#### 5. Content Upload - Audio Entry
```
TravelerPWA.js:
1. Select "Audio" entry type
2. Click record button
3. Use Web Audio API to record
4. Stop recording, create blob
5. Preview audio playback
6. POST /api/traveler/{token}/entries (multipart)
   - content_type: "audio"  
   - file: audio_blob
   - latitude: GPS_lat
   - longitude: GPS_lng
```

### Public Viewer Workflow

#### 1. Blog Access
```
PublicBlogView.js:
1. Receive link: /public/{public_token}
2. GET /api/public/{token}
3. Verify public access enabled
4. Load trip information
```

#### 2. Content Viewing
```
PublicBlogView.js:
1. GET /api/public/{token}/content
2. Display content pieces chronologically
3. Render markdown with ReactMarkdown
4. Show embedded media (photos, audio)
5. Display location data
```

#### 3. Map Navigation
```
PublicBlogView.js:
1. Load all entries with coordinates
2. Display markers on map
3. Color-code by content type
4. Click marker → jump to content
5. Auto-fit map bounds
```

#### 4. Calendar Navigation
```
CalendarView.js:
1. GET /api/public/{token}/content/calendar
2. Display monthly calendar
3. Show entry count badges
4. Click date → filter content
5. GET /api/public/{token}/content/date/{date}
```

#### 5. Reactions Interaction
```
PostReactions.js:
1. Load existing reaction counts
2. Check localStorage for user's reaction
3. Click reaction button
4. Store in localStorage
5. POST /api/public/{token}/reactions/{content_id}
6. Update UI optimistically
7. Refresh counts from server
```

### AI Processing Pipeline

#### Content Processing Workflow
```
1. Entry Created (via API)
   ↓
2. File Analysis (if applicable)
   - Images → Gemini Vision API
   - Audio → Gemini Audio Transcription
   ↓
3. Blog Regeneration Trigger
   - Manual (admin button)
   - Automatic (on new entries)
   ↓
4. Content Collection
   - Fetch all non-disabled entries
   - Order by timestamp
   - Include analysis results
   ↓
5. AI Generation
   - Format context for Gemini
   - Generate language-specific content
   - Handle API rate limits/errors
   ↓
6. Content Processing
   - Split by dates
   - Extract locations
   - Create TripContent pieces
   ↓
7. Database Storage
   - Save content pieces
   - Update relationships
   - Trigger UI updates
```

#### Error Handling & Fallbacks
```python
def safe_ai_generation(entries, language, trip_name):
    """AI generation with comprehensive error handling"""
    try:
        # Primary generation attempt
        content = generate_with_gemini(entries, language, trip_name)
        if content:
            return content
    except Exception as e:
        print(f"Gemini generation failed: {e}")
    
    try:
        # Fallback: Simple template-based generation
        return generate_simple_blog(entries, language, trip_name)
    except Exception as e:
        print(f"Fallback generation failed: {e}")
        return generate_minimal_blog(entries)
```

### Data Flow Architecture

#### Entry Creation Flow
```
TravelerPWA → POST /api/traveler/{token}/entries
    ↓
Backend validation & file processing
    ↓
Database: Entry record created
    ↓
AI Analysis (if enabled)
    ↓  
Blog regeneration queued
    ↓
Admin notification (BlogView refresh)
```

#### Blog Viewing Flow
```
PublicBlogView → GET /api/public/{token}/content
    ↓
Backend: Query TripContent pieces
    ↓
Format with metadata & locations
    ↓
Frontend: Render markdown & display map
    ↓
User interactions: Calendar, reactions
```

#### Real-time Updates Strategy
```javascript
// Polling-based updates (no WebSocket complexity)
useEffect(() => {
  const interval = setInterval(() => {
    if (selectedTrip) {
      loadEntries(selectedTrip.id);
    }
  }, 30000); // 30-second polling
  
  return () => clearInterval(interval);
}, [selectedTrip]);
```

---

## Deployment & Production Setup

### Development Setup

#### Prerequisites
```bash
# Backend requirements
Python 3.8+
pip install -r requirements.txt

# Frontend requirements  
Node.js 14+
npm install
```

#### Development Workflow
```bash
# 1. Backend setup
cd backend
cp .env.example .env
# Edit .env with your GEMINI_API_KEY
python app.py

# 2. Frontend setup (new terminal)
cd frontend
cp .env.example .env
# Set REACT_APP_API_BASE=http://localhost:5000
npm start

# 3. Access
# Admin: http://localhost:3000/admin
# Credentials shown in backend console
```

### Production Deployment

#### Build Process
```bash
# Frontend build
cd frontend
npm run build
# Outputs to frontend/build/

# Backend serves static files
# Route: /<path:path> → serve from frontend/build/
```

#### Environment Configuration
```bash
# Production .env
SECRET_KEY=production-secret-key-64-chars-minimum
JWT_SECRET_KEY=production-jwt-secret-64-chars-minimum
GEMINI_API_KEY=your-production-gemini-key
FLASK_ENV=production
FLASK_DEBUG=False
FLASK_HOST=127.0.0.1
FLASK_PORT=7300
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Static files
    location /uploads/ {
        alias /path/to/roadweave/backend/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API routes
    location /api/ {
        proxy_pass http://127.0.0.1:7300;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Frontend routes
    location / {
        proxy_pass http://127.0.0.1:7300;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Systemd Service
```ini
[Unit]
Description=RoadWeave Travel Blog
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/roadweave/backend
Environment=PATH=/path/to/roadweave/backend/venv/bin
ExecStart=/path/to/roadweave/backend/venv/bin/python app.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

#### SSL Configuration (Let's Encrypt)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 3 * * * /usr/bin/certbot renew --quiet
```

#### Database Backup Strategy
```bash
# SQLite backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/roadweave"
DB_PATH="/path/to/roadweave/backend/roadweave.db"

mkdir -p $BACKUP_DIR
sqlite3 $DB_PATH ".backup $BACKUP_DIR/roadweave_$DATE.db"

# Keep only last 30 days
find $BACKUP_DIR -name "roadweave_*.db" -mtime +30 -delete
```

#### Production Monitoring
```bash
# Health check endpoint
curl http://localhost:7300/api/health

# Log monitoring
tail -f /var/log/nginx/access.log
journalctl -u roadweave -f

# Resource monitoring
htop
df -h
```

### Docker Deployment (Optional)

#### Dockerfile
```dockerfile
# Backend Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 7300

CMD ["python", "app.py"]
```

#### Docker Compose
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "7300:7300"
    environment:
      - FLASK_ENV=production
      - GEMINI_API_KEY=${GEMINI_API_KEY}
    volumes:
      - ./backend/uploads:/app/uploads
      - ./backend/roadweave.db:/app/roadweave.db

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./frontend/build:/usr/share/nginx/html
    depends_on:
      - backend
```

### Security Considerations

#### Production Security Checklist
```
✅ Change default secret keys
✅ Use HTTPS in production
✅ Set secure CORS origins
✅ Configure proper file upload limits
✅ Set up database backups
✅ Monitor API usage and costs
✅ Implement rate limiting (optional)
✅ Secure file upload directory permissions
✅ Use environment variables for secrets
✅ Set up log monitoring
```

#### API Rate Limiting (Optional)
```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["100 per hour"]
)

@app.route('/api/traveler/<token>/entries', methods=['POST'])
@limiter.limit("10 per minute")
def create_entry(token):
    # Entry creation logic
    pass
```

---

## Implementation Checklist

### Backend Implementation
- [ ] Flask application setup with CORS
- [ ] SQLAlchemy models (5 models)
- [ ] JWT authentication system
- [ ] Admin endpoints (12 endpoints)
- [ ] Traveler endpoints (2 endpoints)
- [ ] Public blog endpoints (6 endpoints)
- [ ] File upload handling
- [ ] Google Gemini AI integration
- [ ] Photo analysis pipeline
- [ ] Audio transcription pipeline
- [ ] Blog generation algorithm
- [ ] Error handling and validation
- [ ] Environment configuration
- [ ] Admin credential generation

### Frontend Implementation
- [ ] React application setup
- [ ] React Router configuration
- [ ] AdminLogin component
- [ ] AdminDashboard component
- [ ] TravelerPWA component
- [ ] BlogView component
- [ ] PublicBlogView component
- [ ] CalendarView component
- [ ] LocationPicker component
- [ ] MiniMapModal component
- [ ] PostReactions component
- [ ] ReactionButton component
- [ ] Leaflet map integration
- [ ] Audio recording functionality
- [ ] File upload with preview
- [ ] Local storage management
- [ ] Responsive mobile design

### Testing & Validation
- [ ] Admin login flow
- [ ] Trip creation and management
- [ ] Traveler token generation
- [ ] Content upload (text, photo, audio)
- [ ] GPS location capture
- [ ] Manual location selection
- [ ] AI blog generation
- [ ] Photo analysis integration
- [ ] Audio transcription
- [ ] Public blog viewing
- [ ] Calendar navigation
- [ ] Map interaction
- [ ] Reactions system
- [ ] Mobile responsiveness
- [ ] Cross-browser compatibility

### Deployment
- [ ] Environment configuration
- [ ] Build process setup
- [ ] Static file serving
- [ ] Nginx configuration
- [ ] SSL certificate setup
- [ ] Database backup strategy
- [ ] Log monitoring
- [ ] Health check endpoints
- [ ] Performance optimization

---

**Total Components**: 5 database models, 25+ API endpoints, 11 React components, complete AI integration pipeline, multi-language support, interactive mapping, calendar system, reactions system, and comprehensive deployment configuration.

This specification provides everything needed to recreate RoadWeave from scratch with complete feature parity and production readiness.