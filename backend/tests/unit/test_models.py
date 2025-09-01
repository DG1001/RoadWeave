import pytest
from datetime import datetime, date
from app import db, Trip, Traveler, Entry, TripContent, PostReaction

@pytest.mark.unit
class TestModels:
    """Test database models"""
    
    def test_trip_model_creation(self, app_context):
        """Test Trip model creation and attributes"""
        trip = Trip(
            name="Test Trip",
            description="A test trip",
            admin_token="test_admin_token",
            blog_language="en",
            public_enabled=True,
            public_token="test_public_token",
            reactions_enabled=True
        )
        
        db.session.add(trip)
        db.session.commit()
        
        assert trip.id is not None
        assert trip.name == "Test Trip"
        assert trip.description == "A test trip"
        assert trip.admin_token == "test_admin_token"
        assert trip.blog_language == "en"
        assert trip.public_enabled is True
        assert trip.public_token == "test_public_token"
        assert trip.reactions_enabled is True
        assert trip.created_at is not None
        assert isinstance(trip.created_at, datetime)
    
    def test_trip_default_values(self, app_context):
        """Test Trip model default values"""
        trip = Trip(
            name="Minimal Trip",
            admin_token="admin_token"
        )
        
        db.session.add(trip)
        db.session.commit()
        
        assert trip.blog_content == ''
        assert trip.blog_language == 'en'
        assert trip.public_enabled is False
        assert trip.reactions_enabled is True
    
    def test_traveler_model_creation(self, app_context, sample_trip):
        """Test Traveler model creation"""
        traveler = Traveler(
            name="John Doe",
            token="traveler_token",
            trip_id=sample_trip.id
        )
        
        db.session.add(traveler)
        db.session.commit()
        
        assert traveler.id is not None
        assert traveler.name == "John Doe"
        assert traveler.token == "traveler_token"
        assert traveler.trip_id == sample_trip.id
        assert traveler.created_at is not None
        
        # Test relationship
        assert traveler.trip == sample_trip
        assert traveler in sample_trip.travelers
    
    def test_entry_model_creation(self, app_context, sample_trip, sample_traveler):
        """Test Entry model creation"""
        entry = Entry(
            trip_id=sample_trip.id,
            traveler_id=sample_traveler.id,
            content_type="text",
            content="Test content",
            latitude=40.7128,
            longitude=-74.0060,
            filename="test.jpg",
            disabled=False
        )
        
        db.session.add(entry)
        db.session.commit()
        
        assert entry.id is not None
        assert entry.content_type == "text"
        assert entry.content == "Test content"
        assert entry.latitude == 40.7128
        assert entry.longitude == -74.0060
        assert entry.filename == "test.jpg"
        assert entry.disabled is False
        assert entry.timestamp is not None
        
        # Test relationships
        assert entry.trip == sample_trip
        assert entry.traveler == sample_traveler
    
    def test_trip_content_model_creation(self, app_context, sample_trip):
        """Test TripContent model creation"""
        content_date = date(2023, 12, 1)
        content = TripContent(
            trip_id=sample_trip.id,
            generated_content="# Day 1\n\nGreat adventure!",
            latitude=40.7128,
            longitude=-74.0060,
            original_text="Original input",
            entry_ids='[1, 2, 3]',
            content_date=content_date
        )
        
        db.session.add(content)
        db.session.commit()
        
        assert content.id is not None
        assert content.generated_content == "# Day 1\n\nGreat adventure!"
        assert content.latitude == 40.7128
        assert content.longitude == -74.0060
        assert content.original_text == "Original input"
        assert content.entry_ids == '[1, 2, 3]'
        assert content.content_date == content_date
        assert content.timestamp is not None
        
        # Test relationship
        assert content.trip == sample_trip
    
    def test_post_reaction_model_creation(self, app_context, sample_trip):
        """Test PostReaction model creation"""
        # Create content first
        content = TripContent(
            trip_id=sample_trip.id,
            generated_content="Test content",
            content_date=date.today()
        )
        db.session.add(content)
        db.session.commit()
        
        reaction = PostReaction(
            trip_id=sample_trip.id,
            content_piece_id=content.id,
            reaction_type="like",
            count=5
        )
        
        db.session.add(reaction)
        db.session.commit()
        
        assert reaction.id is not None
        assert reaction.reaction_type == "like"
        assert reaction.count == 5
        assert reaction.created_at is not None
        assert reaction.updated_at is not None
        
        # Test relationships
        assert reaction.trip == sample_trip
        assert reaction.content_piece == content
    
    def test_post_reaction_unique_constraint(self, app_context, sample_trip):
        """Test PostReaction unique constraint"""
        # Create content
        content = TripContent(
            trip_id=sample_trip.id,
            generated_content="Test content",
            content_date=date.today()
        )
        db.session.add(content)
        db.session.commit()
        
        # Create first reaction
        reaction1 = PostReaction(
            trip_id=sample_trip.id,
            content_piece_id=content.id,
            reaction_type="like",
            count=1
        )
        db.session.add(reaction1)
        db.session.commit()
        
        # Try to create duplicate reaction (should fail)
        reaction2 = PostReaction(
            trip_id=sample_trip.id,
            content_piece_id=content.id,
            reaction_type="like",  # Same reaction type
            count=1
        )
        db.session.add(reaction2)
        
        with pytest.raises(Exception):  # Should raise integrity error
            db.session.commit()
    
    def test_cascade_delete_trip(self, app_context, sample_trip, sample_traveler, sample_entry):
        """Test cascade delete when trip is deleted"""
        trip_id = sample_trip.id
        traveler_id = sample_traveler.id
        entry_id = sample_entry.id
        
        # Delete the trip
        db.session.delete(sample_trip)
        db.session.commit()
        
        # Verify cascade delete worked
        assert Trip.query.get(trip_id) is None
        assert Traveler.query.get(traveler_id) is None
        assert Entry.query.get(entry_id) is None
    
    def test_trip_relationships(self, app_context, sample_trip, sample_traveler, sample_entry):
        """Test Trip model relationships"""
        assert len(sample_trip.travelers) >= 1
        assert sample_traveler in sample_trip.travelers
        assert len(sample_trip.entries) >= 1
        assert sample_entry in sample_trip.entries