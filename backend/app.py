from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from flask_cors import CORS
import os
import uuid
from datetime import datetime, timedelta, date, timezone
import secrets
import string
import pytz
import google.generativeai as genai
from werkzeug.utils import secure_filename
import json
from dotenv import load_dotenv
import base64
from PIL import Image
import io

# Load environment variables
load_dotenv()

app = Flask(__name__, static_folder=None)
CORS(app, 
     origins=['*'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
     allow_headers=['Content-Type', 'Authorization', 'X-Auth-Token'],
     supports_credentials=True)

app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('SQLALCHEMY_DATABASE_URI', 'sqlite:///roadweave.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-string')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=30)
app.config['JWT_TOKEN_LOCATION'] = ['headers', 'query_string']
app.config['JWT_HEADER_NAME'] = 'X-Auth-Token'
app.config['JWT_HEADER_TYPE'] = 'Bearer'
app.config['UPLOAD_FOLDER'] = os.getenv('UPLOAD_FOLDER', 'uploads')
app.config['MAX_CONTENT_LENGTH'] = int(os.getenv('MAX_CONTENT_LENGTH', 32 * 1024 * 1024))  # 32MB max file size

# Create uploads directory
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

db = SQLAlchemy(app)
jwt = JWTManager(app)

# Configure JWT to also accept tokens from X-Auth-Token header
@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    return False

@jwt.additional_headers_loader
def add_custom_headers(identity):
    return {}

# Custom token location function
def get_jwt_from_custom_header():
    token = request.headers.get('X-Auth-Token')
    if token and token.startswith('Bearer '):
        return token[7:]  # Remove 'Bearer ' prefix
    elif token:
        return token
    return None

# Error handlers
@app.errorhandler(413)
def request_entity_too_large(error):
    max_size_mb = app.config['MAX_CONTENT_LENGTH'] / (1024 * 1024)
    return jsonify({
        'error': f'File too large. Maximum file size is {max_size_mb:.0f}MB.',
        'max_size_bytes': app.config['MAX_CONTENT_LENGTH'],
        'max_size_mb': max_size_mb
    }), 413

@app.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request. Please check your input.'}), 400

# CORS preflight handler
@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        response = jsonify({})
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add('Access-Control-Allow-Headers', "Content-Type,Authorization,X-Auth-Token")
        response.headers.add('Access-Control-Allow-Methods', "GET,PUT,POST,DELETE,OPTIONS")
        return response

# JWT error handlers
@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({'error': 'Token has expired'}), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({'error': 'Invalid token'}), 401

@jwt.unauthorized_loader
def unauthorized_callback(error):
    return jsonify({'error': 'Authorization token required'}), 401

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
    public_enabled = db.Column(db.Boolean, default=False)  # Whether public access is enabled
    public_token = db.Column(db.String(100), unique=True)  # Token for public access
    
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
    disabled = db.Column(db.Boolean, default=False, nullable=False)  # Whether entry is disabled from AI processing

class TripContent(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    trip_id = db.Column(db.Integer, db.ForeignKey('trip.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    generated_content = db.Column(db.Text, nullable=False)  # AI-generated markdown content
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    original_text = db.Column(db.Text)  # Original user input that prompted this generation
    entry_ids = db.Column(db.Text)  # JSON array of related entry IDs
    content_date = db.Column(db.Date, nullable=False)  # Date for calendar grouping (extracted from timestamp)
    
    trip = db.relationship('Trip', backref=db.backref('content_pieces', lazy=True, cascade='all, delete-orphan'))

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

def format_timestamp_local(utc_timestamp, timezone_name='Europe/Berlin'):
    """Convert UTC timestamp to local timezone and format it"""
    try:
        # Get timezone from environment or use default
        local_tz_name = os.getenv('TIMEZONE', timezone_name)
        local_tz = pytz.timezone(local_tz_name)
        
        # Convert UTC to local timezone
        if utc_timestamp.tzinfo is None:
            # Assume UTC if no timezone info
            utc_timestamp = pytz.utc.localize(utc_timestamp)
        
        local_time = utc_timestamp.astimezone(local_tz)
        return local_time.strftime('%Y-%m-%d %H:%M')
    except Exception as e:
        print(f"Timezone conversion error: {e}")
        # Fallback to UTC
        return utc_timestamp.strftime('%Y-%m-%d %H:%M UTC')

def timestamp_to_iso(utc_timestamp):
    """Convert UTC timestamp to ISO format with timezone info"""
    try:
        if utc_timestamp.tzinfo is None:
            # Add UTC timezone info if missing
            utc_timestamp = pytz.utc.localize(utc_timestamp)
        return utc_timestamp.isoformat()
    except Exception as e:
        print(f"ISO timestamp conversion error: {e}")
        return utc_timestamp.isoformat()

# Simple daily usage tracking (in-memory for MVP)
daily_usage_tracker = {}

def check_daily_limit():
    """Check if daily photo analysis limit has been reached"""
    daily_limit = int(os.getenv('DAILY_PHOTO_ANALYSIS_LIMIT', 0))
    if daily_limit <= 0:
        return True  # No limit set
    
    today = date.today().isoformat()
    current_count = daily_usage_tracker.get(today, 0)
    
    if current_count >= daily_limit:
        print(f"⚠️  Daily photo analysis limit reached: {current_count}/{daily_limit}")
        return False
    
    return True

def increment_daily_usage():
    """Increment daily usage counter"""
    today = date.today().isoformat()
    daily_usage_tracker[today] = daily_usage_tracker.get(today, 0) + 1
    
    # Clean up old entries (keep only last 7 days)
    cutoff_date = (date.today() - timedelta(days=7)).isoformat()
    keys_to_remove = [k for k in daily_usage_tracker.keys() if k < cutoff_date]
    for key in keys_to_remove:
        del daily_usage_tracker[key]

def allowed_file(filename):
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'mp3', 'wav', 'ogg', 'webm'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def is_image_file(filename):
    """Check if file is an image"""
    IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in IMAGE_EXTENSIONS

def is_audio_file(filename):
    """Check if file is an audio file"""
    AUDIO_EXTENSIONS = {'mp3', 'wav', 'ogg', 'webm', 'm4a', 'aac'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in AUDIO_EXTENSIONS

def analyze_image_with_ai(image_path, user_comment=""):
    """Analyze image using Gemini Vision API with cost tracking"""
    try:
        # Read and prepare image
        with open(image_path, 'rb') as img_file:
            image_data = img_file.read()
        
        # Convert to PIL Image for processing
        image = Image.open(io.BytesIO(image_data))
        original_size = image.size
        
        # Resize if too large (Gemini has size limits and cost optimization)
        max_image_size = int(os.getenv('MAX_IMAGE_SIZE', 1024))
        max_size = (max_image_size, max_image_size)
        resized = False
        if image.size[0] > max_size[0] or image.size[1] > max_size[1]:
            image.thumbnail(max_size, Image.Resampling.LANCZOS)
            resized = True
            
            # Save resized image to bytes
            img_byte_arr = io.BytesIO()
            format = 'JPEG' if image.mode == 'RGB' else 'PNG'
            image.save(img_byte_arr, format=format)
            image_data = img_byte_arr.getvalue()
        
        # Calculate estimated token usage (1290 tokens for 1024x1024)
        final_size = image.size
        estimated_tokens = int((final_size[0] * final_size[1] / (1024 * 1024)) * 1290)
        estimated_input_cost = estimated_tokens * (0.10 / 1000000)  # $0.10 per 1M tokens
        
        # Log cost information (if enabled)
        log_costs = os.getenv('PHOTO_ANALYSIS_LOG_COSTS', 'true').lower() == 'true'
        if log_costs:
            print(f"💰 Photo Analysis Cost Estimate:")
            print(f"   Original size: {original_size[0]}x{original_size[1]} {'(resized)' if resized else ''}")
            print(f"   Final size: {final_size[0]}x{final_size[1]}")
            print(f"   Estimated tokens: {estimated_tokens}")
            print(f"   Estimated input cost: ${estimated_input_cost:.6f}")
        
        # Use Gemini vision model (stable version)
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Prepare the image for Gemini
        image_part = {
            "mime_type": "image/jpeg",
            "data": base64.b64encode(image_data).decode('utf-8')
        }
        
        # Create analysis prompt
        prompt = f"""
        Analyze this travel photo and provide a detailed description for a travel blog.
        
        User's comment about the photo: "{user_comment}"
        
        Please describe:
        1. What you see in the image (objects, people, scenery, architecture, etc.)
        2. The setting/location type (urban, nature, indoor, outdoor, etc.)
        3. The mood or atmosphere of the scene
        4. Any interesting details or notable features
        5. How this relates to the user's comment if provided
        
        Write 2-3 sentences in a engaging, descriptive travel blog style.
        Focus on creating vivid imagery that helps readers visualize the scene.
        """
        
        response = model.generate_content([prompt, image_part])
        
        # Estimate output cost
        output_length = len(response.text.split())
        estimated_output_tokens = output_length * 1.3  # Rough estimate
        estimated_output_cost = estimated_output_tokens * (0.40 / 1000000)  # $0.40 per 1M tokens
        total_estimated_cost = estimated_input_cost + estimated_output_cost
        
        if log_costs:
            print(f"   Estimated output tokens: {estimated_output_tokens:.0f}")
            print(f"   Estimated output cost: ${estimated_output_cost:.6f}")
            print(f"   Total estimated cost: ${total_estimated_cost:.6f}")
        
        return response.text.strip()
        
    except Exception as e:
        print(f"❌ Image analysis error: {e}")
        return f"A photo was shared{f': {user_comment}' if user_comment else '.'}"

def transcribe_audio_with_ai(audio_path):
    """Transcribe audio using Gemini API with cost tracking"""
    try:
        # Check if audio transcription is enabled
        transcription_enabled = os.getenv('ENABLE_AUDIO_TRANSCRIPTION', 'false').lower() == 'true'
        if not transcription_enabled:
            print("🎤 Audio transcription disabled by configuration")
            return "Voice message shared"

        # Read audio file
        with open(audio_path, 'rb') as audio_file:
            audio_data = audio_file.read()
        
        # Get file size for cost estimation
        file_size_mb = len(audio_data) / (1024 * 1024)
        estimated_cost = file_size_mb * 0.001  # Rough estimate: $0.001 per MB
        
        # Log cost information (if enabled)
        log_costs = os.getenv('AUDIO_TRANSCRIPTION_LOG_COSTS', 'true').lower() == 'true'
        if log_costs:
            print(f"💰 Audio Transcription Cost Estimate:")
            print(f"   File size: {file_size_mb:.2f} MB")
            print(f"   Estimated cost: ${estimated_cost:.6f}")
        
        # Use Gemini model for transcription
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Prepare the audio for Gemini
        audio_part = {
            "mime_type": "audio/webm",  # Most common format from web browsers
            "data": base64.b64encode(audio_data).decode('utf-8')
        }
        
        # Create transcription prompt
        prompt = """
        Please transcribe this audio recording accurately. 
        
        Instructions:
        1. Convert the speech to text exactly as spoken
        2. Use proper punctuation and capitalization
        3. If there are unclear parts, mark them as [unclear]
        4. If multiple speakers, indicate when speaker changes
        5. Keep the natural flow and tone of the speech
        6. If the audio contains travel experiences, preserve the enthusiasm and details
        
        Provide only the transcription, no additional commentary.
        """
        
        response = model.generate_content([prompt, audio_part])
        transcription = response.text.strip()
        
        if log_costs:
            output_length = len(transcription.split())
            estimated_output_tokens = output_length * 1.3
            estimated_output_cost = estimated_output_tokens * (0.40 / 1000000)
            total_estimated_cost = estimated_cost + estimated_output_cost
            print(f"   Transcription length: {len(transcription)} characters")
            print(f"   Estimated total cost: ${total_estimated_cost:.6f}")
        
        print(f"🎤 Audio transcription successful: {transcription[:100]}...")
        return transcription
        
    except Exception as e:
        print(f"❌ Audio transcription error: {e}")
        return "Voice message shared"

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
def create_content_piece(trip, new_entry):
    """Create a new TripContent record for the given entry"""
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Get language name for the prompt
        language_name = LANGUAGE_NAMES.get(trip.blog_language, 'English')
        
        # Handle photo analysis (if enabled)
        photo_analysis = ""
        photo_analysis_enabled = os.getenv('ENABLE_PHOTO_ANALYSIS', 'false').lower() == 'true'
        
        if photo_analysis_enabled and new_entry.content_type == 'photo' and new_entry.filename:
            image_path = os.path.join(app.config['UPLOAD_FOLDER'], new_entry.filename)
            if os.path.exists(image_path) and is_image_file(new_entry.filename):
                # Check daily limit before proceeding
                if check_daily_limit():
                    print(f"📸 Analyzing image: {new_entry.filename}")
                    photo_analysis = analyze_image_with_ai(image_path, new_entry.content)
                    increment_daily_usage()
                    print(f"🤖 Photo analysis result: {photo_analysis}")
                else:
                    print("📸 Daily photo analysis limit reached - skipping analysis")
                    photo_analysis = f"Photo shared by {new_entry.traveler.name}"
                    if new_entry.content and new_entry.content != "Photo upload":
                        photo_analysis += f": {new_entry.content}"
        elif not photo_analysis_enabled and new_entry.content_type == 'photo':
            print("📸 Photo analysis disabled by configuration")
        
        # Handle audio transcription (if enabled)
        audio_transcription = ""
        if new_entry.content_type == 'audio' and new_entry.filename:
            audio_path = os.path.join(app.config['UPLOAD_FOLDER'], new_entry.filename)
            if os.path.exists(audio_path) and is_audio_file(new_entry.filename):
                print(f"🎤 Transcribing audio: {new_entry.filename}")
                audio_transcription = transcribe_audio_with_ai(audio_path)
                print(f"🤖 Audio transcription result: {audio_transcription}")
        
        # Build enhanced content description
        content_description = new_entry.content
        original_text = new_entry.content
        
        if photo_analysis:
            content_description = f"Photo Analysis: {photo_analysis}"
            if new_entry.content and new_entry.content != "Photo upload":
                content_description += f"\nUser Comment: {new_entry.content}"
        elif audio_transcription:
            content_description = f"Voice Message Transcription: {audio_transcription}"
            original_text = audio_transcription
        
        # Prepare photo placement instruction
        photo_instruction = ""
        if new_entry.content_type == 'photo' and new_entry.filename:
            photo_instruction = f"""
        IMPORTANT: Include the photo placement marker [PHOTO:{new_entry.id}] at the appropriate place in your text where the photo should appear. This marker will be replaced with the actual photo.
        """
        
        prompt = f"""
        You are creating a travel blog entry for a trip called "{trip.name}".
        
        IMPORTANT: Write your response in {language_name} language.
        
        New entry details:
        - Type: {new_entry.content_type}
        - Content: {content_description}
        - Traveler: {new_entry.traveler.name}
        - Time: {format_timestamp_local(new_entry.timestamp)}
        {"- GPS location data is available" if new_entry.latitude and new_entry.longitude else "- No GPS location data"}
        
        Please create an engaging paragraph (2-3 sentences) about this entry for the travel blog IN {language_name.upper()}. 
        {"If this is a photo, use the photo analysis to create vivid, descriptive content about what's shown in the image. " if photo_analysis else ""}
        {"If this is an audio message, use the transcription to capture the traveler's voice and emotions in your blog text. " if audio_transcription else ""}
        If GPS location is available, try to reference the general area or setting contextually, but do NOT include specific coordinates in your response.
        Focus on creating engaging narrative content rather than technical details.
        Write in a friendly, travel blog style in {language_name}. 
        
        IMPORTANT: Do NOT include timestamps, dates, entry numbers, or labels like "Entry ID", "Eintrag", or any numbering in your response. Start directly with the travel narrative content.
        {photo_instruction}
        """
        
        response = model.generate_content(prompt)
        generated_content = response.text.strip()
        
        # Create TripContent record
        trip_content = TripContent(
            trip_id=trip.id,
            timestamp=new_entry.timestamp,
            generated_content=generated_content,
            latitude=new_entry.latitude,
            longitude=new_entry.longitude,
            original_text=original_text,
            entry_ids=json.dumps([new_entry.id]),
            content_date=new_entry.timestamp.date()
        )
        
        db.session.add(trip_content)
        db.session.commit()
        
        print(f"✅ Created TripContent record {trip_content.id} for entry {new_entry.id}")
        return trip_content
        
    except Exception as e:
        print(f"AI generation error: {e}")
        # Create fallback content
        fallback_content = f"**{format_timestamp_local(new_entry.timestamp)}** - {new_entry.traveler.name} shared a {new_entry.content_type}" + (f": {new_entry.content}" if new_entry.content else "") + "."
        
        trip_content = TripContent(
            trip_id=trip.id,
            timestamp=new_entry.timestamp,
            generated_content=fallback_content,
            latitude=new_entry.latitude,
            longitude=new_entry.longitude,
            original_text=new_entry.content,
            entry_ids=json.dumps([new_entry.id]),
            content_date=new_entry.timestamp.date()
        )
        
        db.session.add(trip_content)
        db.session.commit()
        return trip_content

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
        'created_at': timestamp_to_iso(trip.created_at)
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
        'public_enabled': trip.public_enabled,
        'public_token': trip.public_token,
        'created_at': timestamp_to_iso(trip.created_at),
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
        'token': traveler.token,
        'created_at': timestamp_to_iso(traveler.created_at)
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
    
    # Create AI-generated content piece
    try:
        create_content_piece(traveler.trip, entry)
    except Exception as e:
        print(f"Content piece creation failed: {e}")
    
    return jsonify({
        'id': entry.id,
        'message': 'Entry created successfully'
    })

@app.route('/api/trips/<int:trip_id>/blog', methods=['GET'])
@jwt_required()
def get_blog(trip_id):
    if get_jwt_identity() != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
        
    trip = Trip.query.get_or_404(trip_id)
    return jsonify({
        'trip_name': trip.name,
        'description': trip.description,
        'blog_content': trip.blog_content,
        'blog_language': trip.blog_language,
        'created_at': timestamp_to_iso(trip.created_at)
    })

@app.route('/api/trips/<int:trip_id>/entries', methods=['GET'])
@jwt_required()
def get_entries(trip_id):
    if get_jwt_identity() != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
        
    trip = Trip.query.get_or_404(trip_id)
    entries = Entry.query.filter_by(trip_id=trip_id).order_by(Entry.timestamp.desc()).all()
    
    return jsonify([{
        'id': entry.id,
        'content_type': entry.content_type,
        'content': entry.content,
        'latitude': entry.latitude,
        'longitude': entry.longitude,
        'timestamp': timestamp_to_iso(entry.timestamp),
        'traveler_name': entry.traveler.name,
        'filename': entry.filename,
        'disabled': entry.disabled
    } for entry in entries])

@app.route('/api/admin/trips/<int:trip_id>/regenerate-blog', methods=['POST'])
@jwt_required()
def regenerate_blog(trip_id):
    if get_jwt_identity() != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    trip = Trip.query.get_or_404(trip_id)
    all_entries = Entry.query.filter_by(trip_id=trip_id).order_by(Entry.timestamp.asc()).all()
    
    # Filter out disabled entries
    enabled_entries = [entry for entry in all_entries if not entry.disabled]
    disabled_count = len(all_entries) - len(enabled_entries)
    
    # Clear existing content pieces
    TripContent.query.filter_by(trip_id=trip_id).delete()
    
    # Reset blog content (keep for backwards compatibility during transition)
    trip.blog_content = f"# {trip.name}\n\n{trip.description}\n"
    
    # Process each enabled entry to create new content pieces
    created_count = 0
    for entry in enabled_entries:
        try:
            create_content_piece(trip, entry)
            created_count += 1
        except Exception as e:
            print(f"Content piece creation failed for entry {entry.id}: {e}")
    
    db.session.commit()
    
    # Build informative response message
    message = f'Blog regenerated successfully. Created {created_count} content pieces from {len(enabled_entries)} enabled entries.'
    if disabled_count > 0:
        message += f' Skipped {disabled_count} disabled entries.'
    
    return jsonify({'message': message})

@app.route('/api/admin/trips/<int:trip_id>/migrate-content', methods=['POST'])
@jwt_required()
def migrate_existing_content(trip_id):
    """Migrate existing blog_content to TripContent records"""
    if get_jwt_identity() != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    trip = Trip.query.get_or_404(trip_id)
    entries = Entry.query.filter_by(trip_id=trip_id).order_by(Entry.timestamp.asc()).all()
    
    # Check if migration is needed
    if not trip.blog_content or trip.blog_content.strip() == f"# {trip.name}\n\n{trip.description}":
        return jsonify({'message': 'No content to migrate or content already empty.'})
    
    # Check if TripContent records already exist
    existing_content_count = TripContent.query.filter_by(trip_id=trip_id).count()
    if existing_content_count > 0:
        return jsonify({
            'error': f'Trip already has {existing_content_count} content pieces. Use regenerate-blog to recreate them.'
        }), 400
    
    try:
        # Simple migration: create one content piece per entry based on timestamp
        # This is a best-effort approach since we can't perfectly parse the monolithic content
        migrated_count = 0
        
        for entry in entries:
            # Create a simple content piece for each entry
            content_text = f"**{format_timestamp_local(entry.timestamp)}** - {entry.traveler.name} shared a {entry.content_type}"
            if entry.content:
                content_text += f": {entry.content}"
            
            # Add photo marker if it's a photo
            if entry.content_type == 'photo' and entry.filename:
                content_text += f"\n\n[PHOTO:{entry.id}]"
            
            # Create TripContent record
            trip_content = TripContent(
                trip_id=trip.id,
                timestamp=entry.timestamp,
                generated_content=content_text,
                latitude=entry.latitude,
                longitude=entry.longitude,
                original_text=entry.content,
                entry_ids=json.dumps([entry.id]),
                content_date=entry.timestamp.date()
            )
            
            db.session.add(trip_content)
            migrated_count += 1
        
        # Backup the original blog_content
        trip.blog_content = f"# {trip.name}\n\n{trip.description}\n\n<!-- Original content migrated to individual pieces -->"
        
        db.session.commit()
        
        return jsonify({
            'message': f'Migration completed successfully. Created {migrated_count} content pieces from {len(entries)} entries.',
            'migrated_entries': migrated_count,
            'total_entries': len(entries)
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': f'Migration failed: {str(e)}'
        }), 500

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

@app.route('/api/admin/trips/<int:trip_id>', methods=['DELETE'])
@jwt_required()
def delete_trip(trip_id):
    if get_jwt_identity() != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    trip = Trip.query.get_or_404(trip_id)
    
    # Delete associated files
    for entry in trip.entries:
        if entry.filename:
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], entry.filename)
            if os.path.exists(file_path):
                os.remove(file_path)
    
    db.session.delete(trip)
    db.session.commit()
    
    return jsonify({'message': 'Trip deleted successfully'})

@app.route('/api/admin/trips/<int:trip_id>/public', methods=['PUT'])
@jwt_required()
def toggle_public_access(trip_id):
    if get_jwt_identity() != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    trip = Trip.query.get_or_404(trip_id)
    data = request.get_json()
    enabled = data.get('enabled', False)
    
    trip.public_enabled = enabled
    if enabled and not trip.public_token:
        trip.public_token = generate_token()
    elif not enabled:
        trip.public_token = None
    
    db.session.commit()
    
    return jsonify({
        'message': 'Public access updated successfully',
        'public_enabled': trip.public_enabled,
        'public_token': trip.public_token
    })

@app.route('/api/public/<token>')
def get_public_blog(token):
    trip = Trip.query.filter_by(public_token=token, public_enabled=True).first()
    if not trip:
        return jsonify({'error': 'Blog not found or not publicly accessible'}), 404
    
    return jsonify({
        'trip_name': trip.name,
        'description': trip.description,
        'blog_content': trip.blog_content,
        'blog_language': trip.blog_language,
        'created_at': timestamp_to_iso(trip.created_at)
    })

@app.route('/api/public/<token>/entries')
def get_public_entries(token):
    trip = Trip.query.filter_by(public_token=token, public_enabled=True).first()
    if not trip:
        return jsonify({'error': 'Blog not found or not publicly accessible'}), 404
    
    # Return all entries for blog content rendering, but include location info for mapping
    entries = Entry.query.filter_by(trip_id=trip.id).order_by(Entry.timestamp.desc()).all()
    
    return jsonify([{
        'id': entry.id,
        'content_type': entry.content_type,
        'latitude': entry.latitude,
        'longitude': entry.longitude,
        'timestamp': timestamp_to_iso(entry.timestamp),
        'traveler_name': entry.traveler.name,
        'filename': entry.filename
    } for entry in entries])

@app.route('/api/public/<token>/content')
def get_public_trip_content(token):
    trip = Trip.query.filter_by(public_token=token, public_enabled=True).first()
    if not trip:
        return jsonify({'error': 'Blog not found or not publicly accessible'}), 404
    
    content_pieces = TripContent.query.filter_by(trip_id=trip.id).order_by(TripContent.timestamp.desc()).all()
    
    return jsonify([{
        'id': content.id,
        'timestamp': timestamp_to_iso(content.timestamp),
        'generated_content': content.generated_content,
        'latitude': content.latitude,
        'longitude': content.longitude,
        'original_text': content.original_text,
        'entry_ids': json.loads(content.entry_ids) if content.entry_ids else [],
        'content_date': content.content_date.isoformat()
    } for content in content_pieces])

@app.route('/api/public/<token>/content/calendar')
def get_public_calendar_data(token):
    trip = Trip.query.filter_by(public_token=token, public_enabled=True).first()
    if not trip:
        return jsonify({'error': 'Blog not found or not publicly accessible'}), 404
    
    # Get all entries grouped by date
    entries = Entry.query.filter_by(trip_id=trip.id).all()
    calendar_data = {}
    
    for entry in entries:
        entry_date = entry.timestamp.date().isoformat()
        if entry_date not in calendar_data:
            calendar_data[entry_date] = {
                'date': entry_date,
                'text_count': 0,
                'photo_count': 0,
                'audio_count': 0,
                'total_count': 0
            }
        
        if entry.content_type == 'text':
            calendar_data[entry_date]['text_count'] += 1
        elif entry.content_type == 'photo':
            calendar_data[entry_date]['photo_count'] += 1
        elif entry.content_type == 'audio':
            calendar_data[entry_date]['audio_count'] += 1
        
        calendar_data[entry_date]['total_count'] += 1
    
    return jsonify({
        'calendar_data': list(calendar_data.values()),
        'date_range': {
            'start': min(calendar_data.keys()) if calendar_data else None,
            'end': max(calendar_data.keys()) if calendar_data else None
        }
    })

@app.route('/api/public/<token>/content/date/<date>')
def get_public_content_by_date(token, date):
    trip = Trip.query.filter_by(public_token=token, public_enabled=True).first()
    if not trip:
        return jsonify({'error': 'Blog not found or not publicly accessible'}), 404
    
    try:
        # Parse the date string
        from datetime import datetime
        target_date = datetime.strptime(date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    # Get entries for the specific date
    entries = Entry.query.filter(
        Entry.trip_id == trip.id,
        db.func.date(Entry.timestamp) == target_date
    ).order_by(Entry.timestamp.asc()).all()
    
    # Get content pieces for the specific date
    content_pieces = TripContent.query.filter_by(
        trip_id=trip.id, 
        content_date=target_date
    ).order_by(TripContent.timestamp.asc()).all()
    
    return jsonify({
        'date': date,
        'entries': [{
            'id': entry.id,
            'content_type': entry.content_type,
            'content': entry.content,
            'latitude': entry.latitude,
            'longitude': entry.longitude,
            'timestamp': timestamp_to_iso(entry.timestamp),
            'traveler_name': entry.traveler.name,
            'filename': entry.filename
        } for entry in entries],
        'content_pieces': [{
            'id': content.id,
            'timestamp': timestamp_to_iso(content.timestamp),
            'generated_content': content.generated_content,
            'latitude': content.latitude,
            'longitude': content.longitude,
            'original_text': content.original_text,
            'entry_ids': json.loads(content.entry_ids) if content.entry_ids else []
        } for content in content_pieces]
    })

@app.route('/api/admin/entries/<int:entry_id>/coordinates', methods=['PUT'])
@jwt_required()
def update_entry_coordinates(entry_id):
    if get_jwt_identity() != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    entry = Entry.query.get_or_404(entry_id)
    data = request.get_json()
    
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    
    if latitude is not None and longitude is not None:
        # Validate coordinate ranges
        if not (-90 <= latitude <= 90):
            return jsonify({'error': 'Latitude must be between -90 and 90'}), 400
        if not (-180 <= longitude <= 180):
            return jsonify({'error': 'Longitude must be between -180 and 180'}), 400
        
        entry.latitude = latitude
        entry.longitude = longitude
    else:
        # Clear coordinates if null values are provided
        entry.latitude = None
        entry.longitude = None
    
    db.session.commit()
    
    return jsonify({
        'message': 'Coordinates updated successfully',
        'id': entry.id,
        'latitude': entry.latitude,
        'longitude': entry.longitude
    })

@app.route('/api/admin/entries/<int:entry_id>/toggle-disabled', methods=['PUT'])
@jwt_required()
def toggle_entry_disabled(entry_id):
    if get_jwt_identity() != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    entry = Entry.query.get_or_404(entry_id)
    
    # Toggle the disabled state
    entry.disabled = not entry.disabled
    db.session.commit()
    
    return jsonify({
        'message': f'Entry {"disabled" if entry.disabled else "enabled"} successfully',
        'id': entry.id,
        'disabled': entry.disabled
    })

@app.route('/api/trips/<int:trip_id>/content', methods=['GET'])
@jwt_required()
def get_trip_content(trip_id):
    if get_jwt_identity() != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    trip = Trip.query.get_or_404(trip_id)
    content_pieces = TripContent.query.filter_by(trip_id=trip_id).order_by(TripContent.timestamp.desc()).all()
    
    return jsonify([{
        'id': content.id,
        'timestamp': timestamp_to_iso(content.timestamp),
        'generated_content': content.generated_content,
        'latitude': content.latitude,
        'longitude': content.longitude,
        'original_text': content.original_text,
        'entry_ids': json.loads(content.entry_ids) if content.entry_ids else [],
        'content_date': content.content_date.isoformat()
    } for content in content_pieces])

@app.route('/api/trips/<int:trip_id>/content/calendar', methods=['GET'])
@jwt_required()
def get_calendar_data(trip_id):
    if get_jwt_identity() != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    trip = Trip.query.get_or_404(trip_id)
    
    # Get all entries grouped by date
    entries = Entry.query.filter_by(trip_id=trip_id).all()
    calendar_data = {}
    
    for entry in entries:
        entry_date = entry.timestamp.date().isoformat()
        if entry_date not in calendar_data:
            calendar_data[entry_date] = {
                'date': entry_date,
                'text_count': 0,
                'photo_count': 0,
                'audio_count': 0,
                'total_count': 0
            }
        
        if entry.content_type == 'text':
            calendar_data[entry_date]['text_count'] += 1
        elif entry.content_type == 'photo':
            calendar_data[entry_date]['photo_count'] += 1
        elif entry.content_type == 'audio':
            calendar_data[entry_date]['audio_count'] += 1
        
        calendar_data[entry_date]['total_count'] += 1
    
    return jsonify({
        'calendar_data': list(calendar_data.values()),
        'date_range': {
            'start': min(calendar_data.keys()) if calendar_data else None,
            'end': max(calendar_data.keys()) if calendar_data else None
        }
    })

@app.route('/api/trips/<int:trip_id>/content/date/<date>', methods=['GET'])
@jwt_required()
def get_content_by_date(trip_id, date):
    if get_jwt_identity() != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    
    try:
        # Parse the date string
        from datetime import datetime
        target_date = datetime.strptime(date, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
    
    trip = Trip.query.get_or_404(trip_id)
    
    # Get entries for the specific date
    entries = Entry.query.filter(
        Entry.trip_id == trip_id,
        db.func.date(Entry.timestamp) == target_date
    ).order_by(Entry.timestamp.asc()).all()
    
    # Get content pieces for the specific date
    content_pieces = TripContent.query.filter_by(
        trip_id=trip_id, 
        content_date=target_date
    ).order_by(TripContent.timestamp.asc()).all()
    
    return jsonify({
        'date': date,
        'entries': [{
            'id': entry.id,
            'content_type': entry.content_type,
            'content': entry.content,
            'latitude': entry.latitude,
            'longitude': entry.longitude,
            'timestamp': timestamp_to_iso(entry.timestamp),
            'traveler_name': entry.traveler.name,
            'filename': entry.filename
        } for entry in entries],
        'content_pieces': [{
            'id': content.id,
            'timestamp': timestamp_to_iso(content.timestamp),
            'generated_content': content.generated_content,
            'latitude': content.latitude,
            'longitude': content.longitude,
            'original_text': content.original_text,
            'entry_ids': json.loads(content.entry_ids) if content.entry_ids else []
        } for content in content_pieces]
    })

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/health')
def health():
    return jsonify({'status': 'healthy'})


# Serve static files explicitly (before catch-all route)
@app.route('/static/<path:filename>')
def serve_static(filename):
    """Serve static files from React build directory"""
    if os.getenv('FLASK_ENV') == 'production' or os.getenv('FLASK_DEBUG', 'True').lower() == 'false':
        react_build_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'build')
        static_dir = os.path.join(react_build_dir, 'static')
        
        if os.path.exists(static_dir):
            response = send_from_directory(static_dir, filename)
            
            # Set correct MIME types
            if filename.endswith('.css'):
                response.headers['Content-Type'] = 'text/css'
            elif filename.endswith('.js'):
                response.headers['Content-Type'] = 'application/javascript'
            elif filename.endswith('.map'):
                response.headers['Content-Type'] = 'application/json'
                
            return response
    return jsonify({'error': 'Static file not found'}), 404

# Serve React App (production mode)
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react_app(path):
    """Serve React app for all non-API routes in production"""
    # Check if we're in production mode
    if os.getenv('FLASK_ENV') == 'production' or os.getenv('FLASK_DEBUG', 'True').lower() == 'false':
        # Path to the React build directory
        react_build_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'build')
        
        # If build directory doesn't exist, return error
        if not os.path.exists(react_build_dir):
            return jsonify({
                'error': 'Frontend not built',
                'message': 'Run "cd frontend && npm run build" first'
            }), 500
        
        # Serve static files
        if path and os.path.exists(os.path.join(react_build_dir, path)):
            return send_from_directory(react_build_dir, path)
        
        # For all other routes, serve index.html (React Router will handle routing)
        return send_from_directory(react_build_dir, 'index.html')
    
    # In development mode, return API info
    return jsonify({
        'message': 'RoadWeave API',
        'status': 'Development mode',
        'frontend': 'Run separately with npm start',
        'version': '1.0.0'
    })

def migrate_database():
    """Apply database migrations for new columns and tables"""
    try:
        from sqlalchemy import inspect, text
        
        inspector = inspect(db.engine)
        existing_tables = inspector.get_table_names()
        
        # Check if columns exist in existing tables
        migrations_needed = []
        
        if 'trip' in existing_tables:
            trip_columns = [col['name'] for col in inspector.get_columns('trip')]
            if 'blog_language' not in trip_columns:
                migrations_needed.append('ALTER TABLE trip ADD COLUMN blog_language VARCHAR(10) DEFAULT "en"')
            if 'public_enabled' not in trip_columns:
                migrations_needed.append('ALTER TABLE trip ADD COLUMN public_enabled BOOLEAN DEFAULT 0')
            if 'public_token' not in trip_columns:
                migrations_needed.append('ALTER TABLE trip ADD COLUMN public_token VARCHAR(100)')
        
        # Check if entry table needs disabled column
        if 'entry' in existing_tables:
            entry_columns = [col['name'] for col in inspector.get_columns('entry')]
            if 'disabled' not in entry_columns:
                migrations_needed.append('ALTER TABLE entry ADD COLUMN disabled BOOLEAN DEFAULT 0 NOT NULL')
        
        # Check if trip_content table exists, create if not
        if 'trip_content' not in existing_tables:
            print("🔄 Creating trip_content table...")
            migrations_needed.append('''
                CREATE TABLE trip_content (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    trip_id INTEGER NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    generated_content TEXT NOT NULL,
                    latitude FLOAT,
                    longitude FLOAT,
                    original_text TEXT,
                    entry_ids TEXT,
                    content_date DATE NOT NULL,
                    FOREIGN KEY (trip_id) REFERENCES trip (id) ON DELETE CASCADE
                )
            ''')
        
        if migrations_needed:
            print(f"🔄 Migrating database: Applying {len(migrations_needed)} migration(s)...")
            with db.engine.connect() as conn:
                for migration in migrations_needed:
                    conn.execute(text(migration))
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
    
    # Check photo analysis configuration
    photo_analysis_enabled = os.getenv('ENABLE_PHOTO_ANALYSIS', 'false').lower() == 'true'
    daily_limit = int(os.getenv('DAILY_PHOTO_ANALYSIS_LIMIT', 0))
    
    # Check audio transcription configuration
    audio_transcription_enabled = os.getenv('ENABLE_AUDIO_TRANSCRIPTION', 'false').lower() == 'true'
    
    print(f"🚀 Starting RoadWeave backend server...")
    print(f"   Host: {host}")
    print(f"   Port: {port}")
    print(f"   Debug: {debug}")
    print(f"   API Base: http://{host}:{port}")
    print(f"   📸 Photo Analysis: {'✅ Enabled' if photo_analysis_enabled else '❌ Disabled'}")
    if photo_analysis_enabled:
        if daily_limit > 0:
            print(f"      Daily limit: {daily_limit} photos")
        else:
            print(f"      Daily limit: Unlimited")
        max_size = int(os.getenv('MAX_IMAGE_SIZE', 1024))
        print(f"      Max image size: {max_size}×{max_size}px")
        log_costs = os.getenv('PHOTO_ANALYSIS_LOG_COSTS', 'true').lower() == 'true'
        print(f"      Cost logging: {'✅ Enabled' if log_costs else '❌ Disabled'}")
    else:
        print(f"      Set ENABLE_PHOTO_ANALYSIS=true in .env to enable AI photo analysis")
    
    print(f"   🎤 Audio Transcription: {'✅ Enabled' if audio_transcription_enabled else '❌ Disabled'}")
    if audio_transcription_enabled:
        audio_log_costs = os.getenv('AUDIO_TRANSCRIPTION_LOG_COSTS', 'true').lower() == 'true'
        print(f"      Cost logging: {'✅ Enabled' if audio_log_costs else '❌ Disabled'}")
    else:
        print(f"      Set ENABLE_AUDIO_TRANSCRIPTION=true in .env to enable AI audio transcription")
    
    app.run(debug=debug, host=host, port=port)