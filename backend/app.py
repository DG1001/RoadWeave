from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from flask_cors import CORS
import os
import uuid
from datetime import datetime, timedelta
import secrets
import string
import google.generativeai as genai
from werkzeug.utils import secure_filename
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI', 'sqlite:///roadweave.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-string')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=30)
app.config['UPLOAD_FOLDER'] = os.getenv('UPLOAD_FOLDER', 'uploads')
app.config['MAX_CONTENT_LENGTH'] = int(os.getenv('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))  # 16MB max file size

# Create uploads directory
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

db = SQLAlchemy(app)
jwt = JWTManager(app)

# Configure Gemini AI
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', 'your-gemini-api-key-here')
genai.configure(api_key=GEMINI_API_KEY)

# Models
class Trip(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    admin_token = db.Column(db.String(100), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    blog_content = db.Column(db.Text, default='')
    blog_language = db.Column(db.String(10), default='en')  # Language code (en, es, fr, de, etc.)
    
    travelers = db.relationship('Traveler', backref='trip', lazy=True, cascade='all, delete-orphan')
    entries = db.relationship('Entry', backref='trip', lazy=True, cascade='all, delete-orphan')

class Traveler(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    token = db.Column(db.String(100), unique=True, nullable=False)
    trip_id = db.Column(db.Integer, db.ForeignKey('trip.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    entries = db.relationship('Entry', backref='traveler', lazy=True)

class Entry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    trip_id = db.Column(db.Integer, db.ForeignKey('trip.id'), nullable=False)
    traveler_id = db.Column(db.Integer, db.ForeignKey('traveler.id'), nullable=False)
    content_type = db.Column(db.String(20), nullable=False)  # 'text', 'photo', 'audio'
    content = db.Column(db.Text)  # Text content or file path
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    filename = db.Column(db.String(255))  # For uploaded files

def generate_random_password(length=12):
    """Generate a secure random password"""
    characters = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(characters) for _ in range(length))

def setup_admin_credentials():
    """Setup admin credentials from environment or generate random password"""
    username = os.getenv('ADMIN_USERNAME', 'admin')
    password = os.getenv('ADMIN_PASSWORD')
    
    if not password:
        # Generate random password if not set in environment
        password = generate_random_password()
        print("=" * 60)
        print("🔐 ADMIN CREDENTIALS")
        print("=" * 60)
        print(f"Username: {username}")
        print(f"Password: {password}")
        print("=" * 60)
        print("⚠️  SAVE THESE CREDENTIALS - Password is randomly generated!")
        print("   Set ADMIN_PASSWORD in .env to use a custom password.")
        print("=" * 60)
    else:
        print(f"✅ Using admin credentials from environment (username: {username})")
    
    return username, password

# Setup admin credentials
ADMIN_USERNAME, ADMIN_PASSWORD = setup_admin_credentials()

def generate_token():
    return secrets.token_urlsafe(32)

def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'mp3', 'wav', 'ogg', 'webm'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Language code to language name mapping
LANGUAGE_NAMES = {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ru': 'Russian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'zh': 'Chinese',
    'ar': 'Arabic',
    'hi': 'Hindi',
    'nl': 'Dutch',
    'sv': 'Swedish',
    'no': 'Norwegian',
    'da': 'Danish',
    'fi': 'Finnish',
    'pl': 'Polish',
    'tr': 'Turkish'
}

# AI Integration
def generate_blog_update(trip, new_entry):
    try:
        model = genai.GenerativeModel('gemini-2.0-flash-exp')
        
        # Prepare context
        existing_blog = trip.blog_content or "This is the beginning of a travel blog."
        location_info = f"GPS coordinates: {new_entry.latitude}, {new_entry.longitude}" if new_entry.latitude and new_entry.longitude else "No location data"
        
        # Get language name for the prompt
        language_name = LANGUAGE_NAMES.get(trip.blog_language, 'English')
        
        prompt = f"""
        You are helping to incrementally update a travel blog for a trip called "{trip.name}".
        
        IMPORTANT: Write your response in {language_name} language.
        
        Current blog content:
        {existing_blog}
        
        New entry details:
        - Type: {new_entry.content_type}
        - Content: {new_entry.content}
        - Location: {location_info}
        - Traveler: {new_entry.traveler.name}
        - Time: {new_entry.timestamp.strftime('%Y-%m-%d %H:%M')}
        
        Please add a short, engaging paragraph (2-3 sentences) about this new entry to the blog IN {language_name.upper()}. 
        Consider the location if GPS is available, and comment meaningfully on the user's input.
        Do NOT regenerate the entire blog - just provide the new content to append.
        Write in a friendly, travel blog style in {language_name}.
        """
        
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"AI generation error: {e}")
        return f"\n\n**{new_entry.timestamp.strftime('%Y-%m-%d %H:%M')}** - {new_entry.traveler.name} shared a {new_entry.content_type}."

# Routes
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        token = create_access_token(identity='admin')
        return jsonify({'token': token})
    
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/admin/trips', methods=['POST'])
@jwt_required()
def create_trip():
    if get_jwt_identity() != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    data = request.get_json()
    name = data.get('name')
    description = data.get('description', '')
    blog_language = data.get('blog_language', 'en')
    
    if not name:
        return jsonify({'error': 'Trip name is required'}), 400
    
    admin_token = generate_token()
    trip = Trip(name=name, description=description, admin_token=admin_token, blog_language=blog_language)
    db.session.add(trip)
    db.session.commit()
    
    return jsonify({
        'id': trip.id,
        'name': trip.name,
        'description': trip.description,
        'blog_language': trip.blog_language,
        'admin_token': trip.admin_token,
        'created_at': trip.created_at.isoformat()
    })

@app.route('/api/admin/trips', methods=['GET'])
@jwt_required()
def get_trips():
    if get_jwt_identity() != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    trips = Trip.query.all()
    return jsonify([{
        'id': trip.id,
        'name': trip.name,
        'description': trip.description,
        'blog_language': trip.blog_language,
        'created_at': trip.created_at.isoformat(),
        'traveler_count': len(trip.travelers),
        'entry_count': len(trip.entries)
    } for trip in trips])

@app.route('/api/admin/trips/<int:trip_id>/travelers', methods=['POST'])
@jwt_required()
def add_traveler(trip_id):
    if get_jwt_identity() != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    trip = Trip.query.get_or_404(trip_id)
    data = request.get_json()
    name = data.get('name')
    
    if not name:
        return jsonify({'error': 'Traveler name is required'}), 400
    
    token = generate_token()
    traveler = Traveler(name=name, token=token, trip_id=trip.id)
    db.session.add(traveler)
    db.session.commit()
    
    return jsonify({
        'id': traveler.id,
        'name': traveler.name,
        'token': traveler.token,
        'link': f'/traveler/{traveler.token}'
    })

@app.route('/api/trips/<int:trip_id>/travelers', methods=['GET'])
def get_travelers(trip_id):
    trip = Trip.query.get_or_404(trip_id)
    return jsonify([{
        'id': traveler.id,
        'name': traveler.name,
        'created_at': traveler.created_at.isoformat()
    } for traveler in trip.travelers])

@app.route('/api/traveler/verify/<token>', methods=['GET'])
def verify_traveler_token(token):
    traveler = Traveler.query.filter_by(token=token).first()
    if not traveler:
        return jsonify({'error': 'Invalid token'}), 404
    
    return jsonify({
        'traveler': {
            'id': traveler.id,
            'name': traveler.name,
            'trip_name': traveler.trip.name
        }
    })

@app.route('/api/traveler/<token>/entries', methods=['POST'])
def create_entry(token):
    traveler = Traveler.query.filter_by(token=token).first()
    if not traveler:
        return jsonify({'error': 'Invalid token'}), 404
    
    content_type = request.form.get('content_type')
    content = request.form.get('content', '')
    latitude = request.form.get('latitude', type=float)
    longitude = request.form.get('longitude', type=float)
    
    filename = None
    if 'file' in request.files:
        file = request.files['file']
        if file and file.filename and allowed_file(file.filename):
            filename = secure_filename(f"{uuid.uuid4()}_{file.filename}")
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            content = filename
    
    entry = Entry(
        trip_id=traveler.trip_id,
        traveler_id=traveler.id,
        content_type=content_type,
        content=content,
        latitude=latitude,
        longitude=longitude,
        filename=filename
    )
    
    db.session.add(entry)
    db.session.commit()
    
    # Generate AI blog update
    try:
        ai_update = generate_blog_update(traveler.trip, entry)
        if ai_update:
            traveler.trip.blog_content += f"\n\n{ai_update}"
            db.session.commit()
    except Exception as e:
        print(f"AI update failed: {e}")
    
    return jsonify({
        'id': entry.id,
        'message': 'Entry created successfully'
    })

@app.route('/api/trips/<int:trip_id>/blog', methods=['GET'])
def get_blog(trip_id):
    trip = Trip.query.get_or_404(trip_id)
    return jsonify({
        'trip_name': trip.name,
        'description': trip.description,
        'blog_content': trip.blog_content,
        'blog_language': trip.blog_language,
        'created_at': trip.created_at.isoformat()
    })

@app.route('/api/trips/<int:trip_id>/entries', methods=['GET'])
def get_entries(trip_id):
    trip = Trip.query.get_or_404(trip_id)
    entries = Entry.query.filter_by(trip_id=trip_id).order_by(Entry.timestamp.desc()).all()
    
    return jsonify([{
        'id': entry.id,
        'content_type': entry.content_type,
        'content': entry.content,
        'latitude': entry.latitude,
        'longitude': entry.longitude,
        'timestamp': entry.timestamp.isoformat(),
        'traveler_name': entry.traveler.name,
        'filename': entry.filename
    } for entry in entries])

@app.route('/api/admin/trips/<int:trip_id>/regenerate-blog', methods=['POST'])
@jwt_required()
def regenerate_blog(trip_id):
    if get_jwt_identity() != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    trip = Trip.query.get_or_404(trip_id)
    entries = Entry.query.filter_by(trip_id=trip_id).order_by(Entry.timestamp.asc()).all()
    
    # Reset blog content
    trip.blog_content = f"# {trip.name}\n\n{trip.description}\n"
    
    # Process each entry
    for entry in entries:
        try:
            ai_update = generate_blog_update(trip, entry)
            if ai_update:
                trip.blog_content += f"\n\n{ai_update}"
        except Exception as e:
            print(f"AI update failed for entry {entry.id}: {e}")
    
    db.session.commit()
    return jsonify({'message': 'Blog regenerated successfully'})

@app.route('/api/admin/trips/<int:trip_id>/language', methods=['PUT'])
@jwt_required()
def update_trip_language(trip_id):
    if get_jwt_identity() != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    trip = Trip.query.get_or_404(trip_id)
    data = request.get_json()
    new_language = data.get('language')
    
    if not new_language:
        return jsonify({'error': 'Language is required'}), 400
    
    trip.blog_language = new_language
    db.session.commit()
    
    return jsonify({
        'message': 'Language updated successfully',
        'language': trip.blog_language
    })

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/health')
def health():
    return jsonify({'status': 'healthy'})

def migrate_database():
    """Apply database migrations for new columns"""
    try:
        from sqlalchemy import inspect, text
        
        # Check if blog_language column exists
        inspector = inspect(db.engine)
        trip_columns = [col['name'] for col in inspector.get_columns('trip')]
        
        if 'blog_language' not in trip_columns:
            print("🔄 Migrating database: Adding blog_language column...")
            with db.engine.connect() as conn:
                conn.execute(text('ALTER TABLE trip ADD COLUMN blog_language VARCHAR(10) DEFAULT "en"'))
                conn.commit()
            print("✅ Database migration completed!")
        else:
            print("✅ Database is up to date!")
            
    except Exception as e:
        print(f"⚠️  Database migration error: {e}")
        print("   This might be a new database - continuing...")

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        migrate_database()
    
    # Get configuration from environment
    host = os.getenv('FLASK_HOST', '0.0.0.0')
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    
    print(f"🚀 Starting RoadWeave backend server...")
    print(f"   Host: {host}")
    print(f"   Port: {port}")
    print(f"   Debug: {debug}")
    print(f"   API Base: http://{host}:{port}")
    
    app.run(debug=debug, host=host, port=port)