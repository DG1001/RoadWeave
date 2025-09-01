import pytest
import json
import io
from app import db, Entry

@pytest.mark.integration
class TestTravelerAPI:
    """Test traveler API endpoints"""
    
    def test_verify_traveler_token_valid(self, client, sample_traveler):
        """Test traveler token verification with valid token"""
        response = client.get(f'/api/traveler/verify/{sample_traveler.token}')
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['traveler']['name'] == sample_traveler.name
        assert data['traveler']['trip']['blog_language'] == sample_traveler.trip.blog_language
    
    def test_verify_traveler_token_invalid(self, client):
        """Test traveler token verification with invalid token"""
        response = client.get('/api/traveler/verify/invalid_token')
        
        assert response.status_code == 404
        data = response.get_json()
        assert 'error' in data
    
    def test_create_text_entry(self, client, sample_traveler):
        """Test creating a text entry"""
        entry_data = {
            'content_type': 'text',
            'content': 'Beautiful sunset at the beach!',
            'latitude': 40.7128,
            'longitude': -74.0060
        }
        
        response = client.post(f'/api/traveler/{sample_traveler.token}/entries',
                              data=entry_data)
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'id' in data
        assert data['message'] == 'Entry created successfully'
        
        # Verify entry in database
        entry = Entry.query.filter_by(traveler_id=sample_traveler.id).first()
        assert entry is not None
        assert entry.content_type == 'text'
        assert entry.content == 'Beautiful sunset at the beach!'
    
    def test_create_photo_entry(self, client, sample_traveler):
        """Test creating a photo entry"""
        # Create a fake image file
        fake_image = io.BytesIO(b'fake image data')
        fake_image.name = 'test.jpg'
        
        entry_data = {
            'content_type': 'photo',
            'content': 'Photo description',
            'latitude': 40.7128,
            'longitude': -74.0060,
            'file': (fake_image, 'test.jpg', 'image/jpeg')
        }
        
        response = client.post(f'/api/traveler/{sample_traveler.token}/entries',
                              data=entry_data,
                              content_type='multipart/form-data')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'id' in data
        assert data['message'] == 'Entry created successfully'
    
    def test_create_audio_entry(self, client, sample_traveler):
        """Test creating an audio entry"""
        # Create a fake audio file
        fake_audio = io.BytesIO(b'fake audio data')
        fake_audio.name = 'test.mp3'
        
        entry_data = {
            'content_type': 'audio',
            'latitude': 40.7128,
            'longitude': -74.0060,
            'file': (fake_audio, 'test.mp3', 'audio/mp3')
        }
        
        response = client.post(f'/api/traveler/{sample_traveler.token}/entries',
                              data=entry_data,
                              content_type='multipart/form-data')
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'id' in data
        assert data['message'] == 'Entry created successfully'
    
    def test_create_entry_invalid_token(self, client):
        """Test creating entry with invalid token"""
        entry_data = {
            'content_type': 'text',
            'content': 'This should fail'
        }
        
        response = client.post('/api/traveler/invalid_token/entries',
                              data=entry_data)
        
        assert response.status_code == 404
        data = response.get_json()
        assert 'error' in data
    
    def test_create_entry_missing_content(self, client, sample_traveler):
        """Test creating entry without required content"""
        entry_data = {
            'content_type': 'text'
            # Missing content
        }
        
        response = client.post(f'/api/traveler/{sample_traveler.token}/entries',
                              data=entry_data)
        
        assert response.status_code == 200  # Entry endpoint allows empty content
        data = response.get_json()
        assert data['message'] == 'Entry created successfully'
    
    def test_create_entry_without_location(self, client, sample_traveler):
        """Test creating entry without location (should still work)"""
        entry_data = {
            'content_type': 'text',
            'content': 'Entry without location'
        }
        
        response = client.post(f'/api/traveler/{sample_traveler.token}/entries',
                              data=entry_data)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['message'] == 'Entry created successfully'