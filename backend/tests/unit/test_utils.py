import pytest
import os
from unittest.mock import patch, MagicMock
from datetime import datetime
import pytz
from app import (
    generate_random_password, generate_token, format_timestamp_local,
    timestamp_to_iso, allowed_file, is_image_file, is_audio_file,
    check_daily_limit, increment_daily_usage, daily_usage_tracker
)

@pytest.mark.unit
class TestUtilityFunctions:
    """Test utility functions"""
    
    def test_generate_random_password(self):
        """Test random password generation"""
        password = generate_random_password()
        
        assert len(password) == 12  # Default length
        assert isinstance(password, str)
        
        # Test custom length
        password_long = generate_random_password(20)
        assert len(password_long) == 20
        
        # Test that passwords are different
        password2 = generate_random_password()
        assert password != password2
    
    def test_generate_token(self):
        """Test token generation"""
        token = generate_token()
        
        assert isinstance(token, str)
        assert len(token) > 0
        
        # Test that tokens are different
        token2 = generate_token()
        assert token != token2
    
    def test_format_timestamp_local(self):
        """Test timestamp formatting to local timezone"""
        # Create UTC timestamp
        utc_time = datetime(2023, 12, 1, 12, 0, 0)
        
        # Test with default timezone (Europe/Berlin)
        formatted = format_timestamp_local(utc_time)
        assert '2023-12-01' in formatted
        assert isinstance(formatted, str)
        
        # Test with specific timezone
        formatted_ny = format_timestamp_local(utc_time, 'America/New_York')
        assert '2023-12-01' in formatted_ny
        
        # Test with timezone-aware timestamp
        utc_time_aware = pytz.utc.localize(utc_time)
        formatted_aware = format_timestamp_local(utc_time_aware)
        assert '2023-12-01' in formatted_aware
    
    def test_format_timestamp_local_error_handling(self):
        """Test timestamp formatting error handling"""
        # Test with invalid timezone
        utc_time = datetime(2023, 12, 1, 12, 0, 0)
        formatted = format_timestamp_local(utc_time, 'Invalid/Timezone')
        
        # Should fallback to UTC format or handle gracefully
        assert formatted == '2023-12-01 12:00 UTC' or '2023-12-01' in formatted
    
    def test_timestamp_to_iso(self):
        """Test timestamp to ISO format conversion"""
        utc_time = datetime(2023, 12, 1, 12, 0, 0)
        
        # Test without timezone info
        iso_string = timestamp_to_iso(utc_time)
        assert '2023-12-01T12:00:00' in iso_string
        
        # Test with timezone info
        utc_time_aware = pytz.utc.localize(utc_time)
        iso_string_aware = timestamp_to_iso(utc_time_aware)
        assert '2023-12-01T12:00:00+00:00' in iso_string_aware
    
    def test_allowed_file(self):
        """Test file extension validation"""
        # Test allowed extensions
        assert allowed_file('image.jpg') is True
        assert allowed_file('image.jpeg') is True
        assert allowed_file('image.png') is True
        assert allowed_file('image.gif') is True
        assert allowed_file('audio.mp3') is True
        assert allowed_file('audio.wav') is True
        assert allowed_file('audio.ogg') is True
        assert allowed_file('audio.webm') is True
        
        # Test disallowed extensions
        assert allowed_file('document.pdf') is False
        assert allowed_file('script.js') is False
        assert allowed_file('data.csv') is False
        assert allowed_file('noextension') is False
        
        # Test case insensitive
        assert allowed_file('IMAGE.JPG') is True
        assert allowed_file('AUDIO.MP3') is True
    
    def test_is_image_file(self):
        """Test image file detection"""
        assert is_image_file('photo.jpg') is True
        assert is_image_file('photo.jpeg') is True
        assert is_image_file('photo.png') is True
        assert is_image_file('photo.gif') is True
        
        assert is_image_file('audio.mp3') is False
        assert is_image_file('document.pdf') is False
        
        # Test case insensitive
        assert is_image_file('PHOTO.JPG') is True
    
    def test_is_audio_file(self):
        """Test audio file detection"""
        assert is_audio_file('recording.mp3') is True
        assert is_audio_file('recording.wav') is True
        assert is_audio_file('recording.ogg') is True
        assert is_audio_file('recording.webm') is True
        assert is_audio_file('recording.m4a') is True
        assert is_audio_file('recording.aac') is True
        
        assert is_audio_file('photo.jpg') is False
        assert is_audio_file('document.pdf') is False
        
        # Test case insensitive
        assert is_audio_file('RECORDING.MP3') is True
    
    @patch.dict(os.environ, {'DAILY_PHOTO_ANALYSIS_LIMIT': '10'})
    def test_check_daily_limit_with_limit(self):
        """Test daily limit checking with limit set"""
        # Clear the tracker
        daily_usage_tracker.clear()
        
        # Should be under limit initially
        assert check_daily_limit() is True
        
        # Simulate usage up to limit
        from datetime import date
        today = date.today().isoformat()
        daily_usage_tracker[today] = 10
        
        # Should be at limit
        assert check_daily_limit() is False
        
        # Reset for other tests
        daily_usage_tracker.clear()
    
    @patch.dict(os.environ, {'DAILY_PHOTO_ANALYSIS_LIMIT': '0'})
    def test_check_daily_limit_no_limit(self):
        """Test daily limit checking with no limit set"""
        assert check_daily_limit() is True
    
    def test_increment_daily_usage(self):
        """Test daily usage increment"""
        from datetime import date
        
        # Clear the tracker
        daily_usage_tracker.clear()
        
        today = date.today().isoformat()
        
        # Should start at 0
        assert daily_usage_tracker.get(today, 0) == 0
        
        # Increment usage
        increment_daily_usage()
        assert daily_usage_tracker[today] == 1
        
        # Increment again
        increment_daily_usage()
        assert daily_usage_tracker[today] == 2
        
        # Test cleanup (add old entries)  
        from datetime import timedelta
        old_date = (date.today().replace(day=1) - timedelta(days=10)).isoformat()
        daily_usage_tracker[old_date] = 5
        
        increment_daily_usage()
        
        # Old entry should be cleaned up
        assert old_date not in daily_usage_tracker
        assert daily_usage_tracker[today] == 3