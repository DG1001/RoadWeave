import pytest
import json
from app import db, Trip, Traveler

@pytest.mark.integration
class TestAdminAPI:
    """Test admin API endpoints"""
    
    def test_admin_login_success(self, client):
        """Test successful admin login"""
        response = client.post('/api/admin/login', json={
            'username': 'admin',
            'password': 'test_password'
        })
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'token' in data
        assert len(data['token']) > 0
    
    def test_admin_login_invalid_credentials(self, client):
        """Test admin login with invalid credentials"""
        response = client.post('/api/admin/login', json={
            'username': 'admin',
            'password': 'wrong_password'
        })
        
        assert response.status_code == 401
        data = response.get_json()
        assert 'error' in data
    
    def test_create_trip(self, client, admin_auth_headers):
        """Test trip creation"""
        trip_data = {
            'name': 'Test Trip',
            'description': 'A test trip',
            'blog_language': 'en'
        }
        
        response = client.post('/api/admin/trips',
                              json=trip_data,
                              headers=admin_auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['name'] == 'Test Trip'
        assert data['description'] == 'A test trip'
        assert data['blog_language'] == 'en'
        assert 'admin_token' in data
        assert 'id' in data
        
        # Verify trip in database
        trip = Trip.query.filter_by(name='Test Trip').first()
        assert trip is not None
        assert trip.blog_language == 'en'
    
    def test_create_trip_unauthorized(self, client):
        """Test trip creation without authentication"""
        trip_data = {
            'name': 'Test Trip',
            'description': 'A test trip'
        }
        
        response = client.post('/api/admin/trips', json=trip_data)
        assert response.status_code == 401
    
    def test_get_all_trips(self, client, admin_auth_headers, sample_trip):
        """Test getting all trips"""
        response = client.get('/api/admin/trips', headers=admin_auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]['name'] == sample_trip.name
    
    def test_add_traveler_to_trip(self, client, admin_auth_headers, sample_trip):
        """Test adding traveler to trip"""
        traveler_data = {'name': 'John Doe'}
        
        response = client.post(f'/api/admin/trips/{sample_trip.id}/travelers',
                              json=traveler_data,
                              headers=admin_auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['name'] == 'John Doe'
        assert 'token' in data
        assert 'id' in data
        assert 'link' in data
        
        # Verify traveler in database
        traveler = Traveler.query.filter_by(name='John Doe').first()
        assert traveler is not None
        assert traveler.trip_id == sample_trip.id
    
    def test_update_trip_language(self, client, admin_auth_headers, sample_trip):
        """Test updating trip language"""
        response = client.put(f'/api/admin/trips/{sample_trip.id}/language',
                             json={'language': 'de'},
                             headers=admin_auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['language'] == 'de'
        assert 'message' in data
        
        # Verify in database
        trip = Trip.query.get(sample_trip.id)
        assert trip.blog_language == 'de'
    
    def test_enable_public_access(self, client, admin_auth_headers, sample_trip):
        """Test enabling public access for trip"""
        response = client.put(f'/api/admin/trips/{sample_trip.id}/public',
                             json={'enabled': True},
                             headers=admin_auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['public_enabled'] is True
        assert 'public_token' in data
    
    def test_toggle_reactions(self, client, admin_auth_headers, sample_trip):
        """Test toggling reactions for trip"""
        response = client.put(f'/api/admin/trips/{sample_trip.id}/reactions',
                             json={'enabled': False},
                             headers=admin_auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['reactions_enabled'] is False
    
    def test_delete_trip(self, client, admin_auth_headers, sample_trip):
        """Test deleting trip"""
        trip_id = sample_trip.id
        
        response = client.delete(f'/api/admin/trips/{trip_id}',
                               headers=admin_auth_headers)
        
        assert response.status_code == 200
        
        # Verify trip is deleted
        trip = Trip.query.get(trip_id)
        assert trip is None
    
    def test_regenerate_blog(self, client, admin_auth_headers, sample_trip):
        """Test blog regeneration trigger"""
        response = client.post(f'/api/admin/trips/{sample_trip.id}/regenerate-blog',
                              headers=admin_auth_headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert 'message' in data
        assert 'regenerated successfully' in data['message']