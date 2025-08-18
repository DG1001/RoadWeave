# API Reference

Complete API documentation for RoadWeave's REST endpoints.

## Authentication

RoadWeave uses JWT (JSON Web Tokens) for admin authentication and unique tokens for traveler access.

### Admin Authentication

```bash
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "your-password"
}
```

**Response:**
```json
{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Usage in subsequent requests:**
```bash
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

## Admin Endpoints

All admin endpoints require JWT authentication via `Authorization` header.

### Trips Management

#### List All Trips
```bash
GET /api/admin/trips
Authorization: Bearer <jwt-token>
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "European Adventure",
    "description": "Our amazing trip across Europe",
    "blog_language": "en",
    "public_enabled": false,
    "public_token": null,
    "created_at": "2024-01-15T10:30:00",
    "traveler_count": 3,
    "entry_count": 15
  }
]
```

#### Create New Trip
```bash
POST /api/admin/trips
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "Asian Adventure",
  "description": "Exploring the wonders of Asia",
  "blog_language": "en"
}
```

**Response:**
```json
{
  "id": 2,
  "name": "Asian Adventure", 
  "description": "Exploring the wonders of Asia",
  "blog_language": "en",
  "admin_token": "abc123def456...",
  "created_at": "2024-01-15T11:00:00"
}
```

#### Delete Trip
```bash
DELETE /api/admin/trips/{trip_id}
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "message": "Trip deleted successfully"
}
```

### Travelers Management

#### Add Traveler to Trip
```bash
POST /api/admin/trips/{trip_id}/travelers
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "name": "John Doe"
}
```

**Response:**
```json
{
  "id": 5,
  "name": "John Doe",
  "token": "unique-traveler-token-abc123...",
  "link": "/traveler/unique-traveler-token-abc123..."
}
```

#### List Trip Travelers
```bash
GET /api/trips/{trip_id}/travelers
```

**Response:**
```json
[
  {
    "id": 5,
    "name": "John Doe",
    "token": "unique-traveler-token-abc123...",
    "created_at": "2024-01-15T12:00:00"
  }
]
```

### Blog Management

#### Get Blog Content (Admin)
```bash
GET /api/trips/{trip_id}/blog
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "trip_name": "European Adventure",
  "description": "Our amazing trip across Europe", 
  "blog_content": "# European Adventure\n\nOur journey began...",
  "blog_language": "en",
  "created_at": "2024-01-15T10:30:00"
}
```

#### Get Trip Entries (Admin)
```bash
GET /api/trips/{trip_id}/entries
Authorization: Bearer <jwt-token>
```

**Response:**
```json
[
  {
    "id": 23,
    "content_type": "photo",
    "content": "Amazing sunset from our hotel balcony!",
    "latitude": 41.9028,
    "longitude": 12.4964,
    "timestamp": "2024-01-15T18:30:00",
    "traveler_name": "John Doe",
    "filename": "uuid_sunset.jpg"
  },
  {
    "id": 24,
    "content_type": "text", 
    "content": "The pasta here is incredible!",
    "latitude": 41.9028,
    "longitude": 12.4964,
    "timestamp": "2024-01-15T19:00:00",
    "traveler_name": "Jane Smith",
    "filename": null
  }
]
```

#### Regenerate Blog Content
```bash
POST /api/admin/trips/{trip_id}/regenerate-blog
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "message": "Blog regenerated successfully"
}
```

#### Update Trip Language
```bash
PUT /api/admin/trips/{trip_id}/language
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "language": "es"
}
```

**Response:**
```json
{
  "message": "Language updated successfully",
  "language": "es"
}
```

#### Toggle Public Access
```bash
PUT /api/admin/trips/{trip_id}/public
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "enabled": true
}
```

**Response:**
```json
{
  "message": "Public access updated successfully",
  "public_enabled": true,
  "public_token": "public-token-xyz789..."
}
```

## Traveler Endpoints

Traveler endpoints use unique tokens in the URL path for authentication.

### Token Verification

#### Verify Traveler Token
```bash
GET /api/traveler/verify/{token}
```

**Response:**
```json
{
  "traveler": {
    "id": 5,
    "name": "John Doe",
    "trip_name": "European Adventure"
  }
}
```

### Entry Submission

#### Submit New Entry
```bash
POST /api/traveler/{token}/entries
Content-Type: multipart/form-data

# Form fields:
content_type: text|photo|audio
content: "Text content or photo comment"
latitude: 41.9028 (optional)
longitude: 12.4964 (optional)
file: <binary-file> (for photo/audio)
```

**Text Entry Example:**
```bash
curl -X POST http://localhost:5000/api/traveler/abc123.../entries \
  -F "content_type=text" \
  -F "content=Amazing view from the Eiffel Tower!" \
  -F "latitude=48.8584" \
  -F "longitude=2.2945"
```

**Photo Entry Example:**
```bash
curl -X POST http://localhost:5000/api/traveler/abc123.../entries \
  -F "content_type=photo" \
  -F "content=Sunset from our hotel balcony" \
  -F "latitude=41.9028" \
  -F "longitude=12.4964" \
  -F "file=@sunset.jpg"
```

**Audio Entry Example:**
```bash
curl -X POST http://localhost:5000/api/traveler/abc123.../entries \
  -F "content_type=audio" \
  -F "content=Voice recording" \
  -F "latitude=41.9028" \
  -F "longitude=12.4964" \
  -F "file=@voice_memo.webm"
```

**Response:**
```json
{
  "id": 25,
  "message": "Entry created successfully"
}
```

## Public Endpoints

Public endpoints provide read-only access to published blogs.

### Public Blog Access

#### Get Public Blog Content
```bash
GET /api/public/{public_token}
```

**Response:**
```json
{
  "trip_name": "European Adventure",
  "description": "Our amazing trip across Europe",
  "blog_content": "# European Adventure\n\nOur journey began...",
  "blog_language": "en", 
  "created_at": "2024-01-15T10:30:00"
}
```

#### Get Public Blog Entries
```bash
GET /api/public/{public_token}/entries
```

**Response:**
```json
[
  {
    "id": 23,
    "content_type": "photo",
    "latitude": 41.9028,
    "longitude": 12.4964,
    "timestamp": "2024-01-15T18:30:00",
    "traveler_name": "John Doe",
    "filename": "uuid_sunset.jpg"
  }
]
```

## File Endpoints

### File Access

#### Get Uploaded File
```bash
GET /uploads/{filename}
```

Returns the binary file content with appropriate MIME type headers.

**Example:**
```bash
GET /uploads/uuid_sunset.jpg
Content-Type: image/jpeg
```

## Utility Endpoints

### Health Check

#### Application Health
```bash
GET /api/health
```

**Response:**
```json
{
  "status": "healthy"
}
```

## Error Responses

All endpoints return consistent error responses:

### Authentication Errors

```json
HTTP 401 Unauthorized
{
  "error": "Invalid credentials"
}
```

```json
HTTP 403 Forbidden  
{
  "error": "Admin access required"
}
```

### Validation Errors

```json
HTTP 400 Bad Request
{
  "error": "Trip name is required"
}
```

### Not Found Errors

```json
HTTP 404 Not Found
{
  "error": "Trip not found"
}
```

### Server Errors

```json
HTTP 500 Internal Server Error
{
  "error": "Internal server error"
}
```

## Rate Limiting

Currently no rate limiting is implemented. For production deployments, consider implementing rate limiting at the nginx level:

```nginx
# nginx.conf
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api/ {
    limit_req zone=api burst=20 nodelay;
    proxy_pass http://127.0.0.1:5000;
}
```

## API Usage Examples

### Complete Workflow Example

```bash
# 1. Admin login
TOKEN=$(curl -s -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}' \
  | jq -r '.token')

# 2. Create trip
TRIP_ID=$(curl -s -X POST http://localhost:5000/api/admin/trips \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Trip","description":"A test trip","blog_language":"en"}' \
  | jq -r '.id')

# 3. Add traveler
TRAVELER_TOKEN=$(curl -s -X POST "http://localhost:5000/api/admin/trips/$TRIP_ID/travelers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Traveler"}' \
  | jq -r '.token')

# 4. Submit entry as traveler
curl -X POST "http://localhost:5000/api/traveler/$TRAVELER_TOKEN/entries" \
  -F "content_type=text" \
  -F "content=This is a test entry!" \
  -F "latitude=40.7128" \
  -F "longitude=-74.0060"

# 5. Get blog content
curl -s "http://localhost:5000/api/trips/$TRIP_ID/blog" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.blog_content'
```

### JavaScript/React Integration

```javascript
// Admin API client
class RoadWeaveAPI {
  constructor(baseURL, token = null) {
    this.baseURL = baseURL;
    this.token = token;
  }

  async login(username, password) {
    const response = await fetch(`${this.baseURL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    this.token = data.token;
    return data;
  }

  async getTrips() {
    const response = await fetch(`${this.baseURL}/api/admin/trips`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return response.json();
  }

  async createTrip(name, description, language = 'en') {
    const response = await fetch(`${this.baseURL}/api/admin/trips`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, description, blog_language: language })
    });
    return response.json();
  }

  async addTraveler(tripId, name) {
    const response = await fetch(`${this.baseURL}/api/admin/trips/${tripId}/travelers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name })
    });
    return response.json();
  }
}

// Usage
const api = new RoadWeaveAPI('http://localhost:5000');
await api.login('admin', 'password123');
const trips = await api.getTrips();
```

### Python Integration

```python
import requests
import json

class RoadWeaveAPI:
    def __init__(self, base_url):
        self.base_url = base_url
        self.token = None

    def login(self, username, password):
        response = requests.post(
            f"{self.base_url}/api/admin/login",
            json={"username": username, "password": password}
        )
        data = response.json()
        self.token = data["token"]
        return data

    def get_trips(self):
        response = requests.get(
            f"{self.base_url}/api/admin/trips",
            headers={"Authorization": f"Bearer {self.token}"}
        )
        return response.json()

    def create_trip(self, name, description, language="en"):
        response = requests.post(
            f"{self.base_url}/api/admin/trips",
            headers={"Authorization": f"Bearer {self.token}"},
            json={
                "name": name,
                "description": description,
                "blog_language": language
            }
        )
        return response.json()

# Usage
api = RoadWeaveAPI("http://localhost:5000")
api.login("admin", "password123")
trips = api.get_trips()
```

## WebSocket Support

Currently, RoadWeave uses HTTP polling for real-time updates. WebSocket support is not implemented but could be added for real-time blog updates and entry notifications.

## API Versioning

The current API is version 1.0. Future versions may include:
- `/api/v2/` endpoints for backward compatibility
- Enhanced filtering and pagination
- Bulk operations
- Real-time subscriptions

## Next Steps

- [Setup Guide](setup.md) - Configure your development environment
- [Usage Guide](usage.md) - Learn the application workflows
- [Deployment Guide](deployment.md) - Deploy to production
- [Troubleshooting](troubleshooting.md) - Solve common API issues