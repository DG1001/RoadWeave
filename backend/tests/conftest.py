import pytest
import tempfile
import os

# Set environment variables BEFORE importing app
os.environ['ADMIN_USERNAME'] = 'admin'
os.environ['ADMIN_PASSWORD'] = 'test_password'
os.environ['SECRET_KEY'] = 'test-secret-key'
os.environ['JWT_SECRET_KEY'] = 'test-jwt-secret'

from app import app, db, Trip, Traveler, Entry, TripContent, PostReaction
import factory
from faker import Faker

fake = Faker()

@pytest.fixture
def test_app():
    """Create application for testing"""
    # Create temporary database
    db_fd, db_path = tempfile.mkstemp()
    
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
    app.config['WTF_CSRF_ENABLED'] = False
    app.config['SECRET_KEY'] = 'test-secret-key'
    app.config['JWT_SECRET_KEY'] = 'test-jwt-secret'
    
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()
    
    os.close(db_fd)
    os.unlink(db_path)

@pytest.fixture
def client(test_app):
    """Create test client"""
    return test_app.test_client()

@pytest.fixture
def app_context(test_app):
    """Create application context"""
    with test_app.app_context():
        yield test_app

@pytest.fixture
def db_session(app_context):
    """Create database session"""
    yield db

# Factory classes for test data
class TripFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = Trip
        sqlalchemy_session = db.session
        sqlalchemy_session_persistence = "commit"
    
    name = factory.LazyAttribute(lambda o: fake.sentence(nb_words=3))
    description = factory.LazyAttribute(lambda o: fake.text(max_nb_chars=200))
    admin_token = factory.LazyAttribute(lambda o: fake.uuid4())
    blog_language = 'en'
    public_enabled = False
    public_token = factory.LazyAttribute(lambda o: fake.uuid4())
    reactions_enabled = True

class TravelerFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = Traveler
        sqlalchemy_session = db.session
        sqlalchemy_session_persistence = "commit"
    
    name = factory.LazyAttribute(lambda o: fake.name())
    token = factory.LazyAttribute(lambda o: fake.uuid4())
    trip = factory.SubFactory(TripFactory)

class EntryFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = Entry
        sqlalchemy_session = db.session
        sqlalchemy_session_persistence = "commit"
    
    content_type = 'text'
    content = factory.LazyAttribute(lambda o: fake.text(max_nb_chars=500))
    latitude = factory.LazyAttribute(lambda o: fake.latitude())
    longitude = factory.LazyAttribute(lambda o: fake.longitude())
    trip = factory.SubFactory(TripFactory)
    traveler = factory.SubFactory(TravelerFactory)

class TripContentFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = TripContent
        sqlalchemy_session = db.session
        sqlalchemy_session_persistence = "commit"
    
    generated_content = factory.LazyAttribute(lambda o: fake.text(max_nb_chars=1000))
    latitude = factory.LazyAttribute(lambda o: fake.latitude())
    longitude = factory.LazyAttribute(lambda o: fake.longitude())
    content_date = factory.LazyAttribute(lambda o: fake.date_object())
    trip = factory.SubFactory(TripFactory)

@pytest.fixture
def sample_trip(app_context):
    """Create a sample trip for testing"""
    return TripFactory()

@pytest.fixture
def sample_traveler(app_context, sample_trip):
    """Create a sample traveler for testing"""
    return TravelerFactory(trip=sample_trip)

@pytest.fixture
def sample_entry(app_context, sample_trip, sample_traveler):
    """Create a sample entry for testing"""
    return EntryFactory(trip=sample_trip, traveler=sample_traveler)

@pytest.fixture 
def admin_auth_headers(client, app_context):
    """Get admin authentication headers"""
    response = client.post('/api/admin/login', json={
        'username': 'admin',
        'password': 'test_password'
    })
    
    if response.status_code == 200:
        token = response.json['token']
        return {'X-Auth-Token': f'Bearer {token}'}
    return {}