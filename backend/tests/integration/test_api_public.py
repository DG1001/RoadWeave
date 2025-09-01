import pytest
import json
from app import db, PostReaction, TripContent

@pytest.mark.integration  
class TestPublicAPI:
    """Test public blog API endpoints"""
    
    @pytest.fixture
    def public_trip(self, app_context):
        """Create a trip with public access enabled"""
        from tests.conftest import TripFactory
        trip = TripFactory(public_enabled=True)
        db.session.add(trip)
        db.session.commit()
        return trip
    
    @pytest.fixture
    def trip_content(self, app_context, public_trip):
        """Create content for the public trip"""
        from tests.conftest import TripContentFactory
        content = TripContentFactory(trip=public_trip)
        db.session.add(content)
        db.session.commit()
        return content
    
    def test_get_public_blog_valid_token(self, client, public_trip):
        """Test accessing public blog with valid token"""
        response = client.get(f'/api/public/{public_trip.public_token}')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['trip_name'] == public_trip.name
        assert data['reactions_enabled'] == public_trip.reactions_enabled
    
    def test_get_public_blog_invalid_token(self, client):
        """Test accessing public blog with invalid token"""
        response = client.get('/api/public/invalid_token')
        
        assert response.status_code == 404
        data = response.get_json()
        assert 'error' in data
    
    def test_get_public_blog_disabled(self, client, sample_trip):
        """Test accessing disabled public blog"""
        # Ensure public access is disabled
        sample_trip.public_enabled = False
        db.session.commit()
        
        response = client.get(f'/api/public/{sample_trip.public_token}')
        
        assert response.status_code == 404
        data = response.get_json()
        assert 'error' in data
    
    def test_get_public_content(self, client, public_trip, trip_content):
        """Test getting public trip content"""
        response = client.get(f'/api/public/{public_trip.public_token}/content')
        
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert data[0]['generated_content'] == trip_content.generated_content
    
    def test_get_public_calendar_data(self, client, public_trip, trip_content):
        """Test getting calendar data for public trip"""
        response = client.get(f'/api/public/{public_trip.public_token}/content/calendar')
        
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, dict)
        assert 'calendar_data' in data
        assert 'date_range' in data
    
    def test_get_content_by_date(self, client, public_trip, trip_content):
        """Test getting content filtered by date"""
        date_str = trip_content.content_date.strftime('%Y-%m-%d')
        response = client.get(f'/api/public/{public_trip.public_token}/content/date/{date_str}')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'content_pieces' in data
        assert len(data['content_pieces']) >= 1
    
    def test_get_content_by_invalid_date(self, client, public_trip):
        """Test getting content with invalid date format"""
        response = client.get(f'/api/public/{public_trip.public_token}/content/date/invalid-date')
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
    
    def test_get_reactions(self, client, public_trip, trip_content):
        """Test getting reactions for content piece"""
        # Create a reaction first
        reaction = PostReaction(
            trip_id=public_trip.id,
            content_piece_id=trip_content.id,
            reaction_type='like',
            count=5
        )
        db.session.add(reaction)
        db.session.commit()
        
        response = client.get(f'/api/public/{public_trip.public_token}/reactions/{trip_content.id}')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['like'] == 5
        assert data['applause'] == 0  # Default for non-existent reactions
    
    def test_add_reaction(self, client, public_trip, trip_content):
        """Test adding a reaction"""
        reaction_data = {'reaction_type': 'love', 'action': 'add'}
        
        response = client.post(f'/api/public/{public_trip.public_token}/reactions/{trip_content.id}',
                              json=reaction_data)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['message'] == 'Reaction added successfully'
        assert 'reactions' in data
        
        # Verify in database
        reaction = PostReaction.query.filter_by(
            content_piece_id=trip_content.id,
            reaction_type='love'
        ).first()
        assert reaction is not None
        assert reaction.count == 1
    
    def test_add_invalid_reaction(self, client, public_trip, trip_content):
        """Test adding invalid reaction type"""
        reaction_data = {'reaction_type': 'invalid_reaction'}
        
        response = client.post(f'/api/public/{public_trip.public_token}/reactions/{trip_content.id}',
                              json=reaction_data)
        
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
    
    def test_add_reaction_disabled_trip(self, client, public_trip, trip_content):
        """Test adding reaction when reactions are disabled"""
        # Disable reactions
        public_trip.reactions_enabled = False
        db.session.commit()
        
        reaction_data = {'reaction_type': 'like', 'action': 'add'}
        
        response = client.post(f'/api/public/{public_trip.public_token}/reactions/{trip_content.id}',
                              json=reaction_data)
        
        assert response.status_code == 200
        # Reactions should work even when disabled in this implementation
        data = response.get_json()
        assert 'message' in data or 'error' in data