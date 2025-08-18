import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { getApiUrl } from '../config/api';

function TravelerPWA() {
  const { token } = useParams();
  const [traveler, setTraveler] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  
  // Form states
  const [entryType, setEntryType] = useState('text');
  const [textContent, setTextContent] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    verifyToken();
    getCurrentLocation();
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await axios.get(getApiUrl(`/api/traveler/verify/${token}`));
      setTraveler(response.data.traveler);
    } catch (err) {
      setError('Invalid or expired link');
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setLocationLoading(false);
      },
      (error) => {
        console.warn('Geolocation error:', error);
        setLocationLoading(false);
        // Continue without location
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      setError('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size (32MB limit)
      const maxSizeBytes = 32 * 1024 * 1024; // 32MB
      if (file.size > maxSizeBytes) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
        setError(`File too large! Selected file is ${sizeMB}MB, but maximum allowed is 32MB. Please compress your file or choose a smaller one.`);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }
      setError(''); // Clear any previous errors
      setSelectedFile(file);
    }
  };

  const submitEntry = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Get current location for this entry
    let currentLocation = location;
    if (navigator.geolocation) {
      setUpdatingLocation(true);
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 60000 // Accept location up to 1 minute old
            }
          );
        });
        currentLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        };
        // Update state for next time
        setLocation(currentLocation);
      } catch (error) {
        console.warn('Could not get current location, using last known location:', error);
        // Continue with existing location or no location
      } finally {
        setUpdatingLocation(false);
      }
    }

    const formData = new FormData();
    formData.append('content_type', entryType);
    
    if (currentLocation) {
      formData.append('latitude', currentLocation.latitude);
      formData.append('longitude', currentLocation.longitude);
    }

    if (entryType === 'text') {
      formData.append('content', textContent);
    } else if (entryType === 'photo' && selectedFile) {
      formData.append('file', selectedFile);
      formData.append('content', textContent || 'Photo upload');
    } else if (entryType === 'audio' && audioBlob) {
      const audioFile = new File([audioBlob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
      formData.append('file', audioFile);
      formData.append('content', 'Voice recording');
    } else {
      setError('Please provide content for your entry');
      setLoading(false);
      return;
    }

    try {
      await axios.post(getApiUrl(`/api/traveler/${token}/entries`), formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Reset form
      setTextContent('');
      setSelectedFile(null);
      setAudioBlob(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setSuccess('Entry submitted successfully!');
      
      // Refresh location for next entry
      getCurrentLocation();
    } catch (err) {
      if (err.response?.data?.offline) {
        setSuccess('You are offline. Entry will be submitted when connection is restored.');
      } else if (err.response?.status === 413) {
        const maxSizeMB = err.response?.data?.max_size_mb || 32;
        setError(`File too large! Maximum file size is ${maxSizeMB}MB. Please choose a smaller file or compress your image/audio.`);
      } else {
        setError(err.response?.data?.error || 'Failed to submit entry');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!traveler) {
    return (
      <div className="container">
        <div className="card">
          {error ? (
            <div className="error">{error}</div>
          ) : (
            <div className="loading">Verifying access...</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginBottom: '10px' }}>
          <img src="/logo.png" alt="RoadWeave" style={{ width: '40px', height: '40px' }} />
          <h1>RoadWeave</h1>
        </div>
        <p style={{ margin: 0, textAlign: 'center' }}>
          Welcome {traveler.name} to {traveler.trip_name}
        </p>
      </div>

      <div className="container">
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        {/* Location Status */}
        <div className="card">
          <h3>Location Status</h3>
          {locationLoading ? (
            <p>Getting your location...</p>
          ) : updatingLocation ? (
            <p style={{ color: '#007bff' }}>📍 Updating location for entry...</p>
          ) : location ? (
            <div>
              <p style={{ color: '#28a745' }}>
                ✓ Location captured: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </p>
              <p style={{ fontSize: '0.9em', color: '#666', margin: '5px 0 0 0' }}>
                📍 Fresh location will be captured when you share an entry
              </p>
            </div>
          ) : (
            <div>
              <p style={{ color: '#dc3545' }}>⚠ Location not available</p>
              <button onClick={getCurrentLocation} className="btn btn-secondary">
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Entry Form */}
        <div className="card">
          <h3>Share Your Experience</h3>
          <form onSubmit={submitEntry}>
            {/* Entry Type Selection */}
            <div className="form-group">
              <label>What would you like to share?</label>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap',
                gap: '12px', 
                marginTop: '15px',
                justifyContent: 'center'
              }}>
                <button
                  type="button"
                  onClick={() => setEntryType('text')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '80px',
                    height: '80px',
                    cursor: 'pointer',
                    padding: '12px',
                    borderRadius: '16px',
                    border: 'none',
                    backgroundColor: entryType === 'text' ? '#007bff' : '#f8f9fa',
                    color: entryType === 'text' ? 'white' : '#6c757d',
                    boxShadow: entryType === 'text' 
                      ? '0 4px 12px rgba(0, 123, 255, 0.3)' 
                      : '0 2px 4px rgba(0, 0, 0, 0.1)',
                    transform: entryType === 'text' ? 'translateY(-2px)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: '28px', marginBottom: '4px' }}>📝</div>
                  <div style={{ fontSize: '12px', fontWeight: '500' }}>Text</div>
                </button>

                <button
                  type="button"
                  onClick={() => setEntryType('photo')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '80px',
                    height: '80px',
                    cursor: 'pointer',
                    padding: '12px',
                    borderRadius: '16px',
                    border: 'none',
                    backgroundColor: entryType === 'photo' ? '#007bff' : '#f8f9fa',
                    color: entryType === 'photo' ? 'white' : '#6c757d',
                    boxShadow: entryType === 'photo' 
                      ? '0 4px 12px rgba(0, 123, 255, 0.3)' 
                      : '0 2px 4px rgba(0, 0, 0, 0.1)',
                    transform: entryType === 'photo' ? 'translateY(-2px)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: '28px', marginBottom: '4px' }}>📷</div>
                  <div style={{ fontSize: '12px', fontWeight: '500' }}>Photo</div>
                </button>

                <button
                  type="button"
                  onClick={() => setEntryType('audio')}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '80px',
                    height: '80px',
                    cursor: 'pointer',
                    padding: '12px',
                    borderRadius: '16px',
                    border: 'none',
                    backgroundColor: entryType === 'audio' ? '#007bff' : '#f8f9fa',
                    color: entryType === 'audio' ? 'white' : '#6c757d',
                    boxShadow: entryType === 'audio' 
                      ? '0 4px 12px rgba(0, 123, 255, 0.3)' 
                      : '0 2px 4px rgba(0, 0, 0, 0.1)',
                    transform: entryType === 'audio' ? 'translateY(-2px)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: '28px', marginBottom: '4px' }}>🎤</div>
                  <div style={{ fontSize: '12px', fontWeight: '500' }}>Voice</div>
                </button>
              </div>
            </div>

            {/* Text Entry */}
            {entryType === 'text' && (
              <div className="form-group">
                <label>Your thoughts:</label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Share what you're experiencing..."
                  required
                />
              </div>
            )}

            {/* Photo Entry */}
            {entryType === 'photo' && (
              <div>
                <div className="form-group">
                  <label>Select a photo:</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    required
                  />
                  {selectedFile && (
                    <p style={{ marginTop: '10px', color: '#28a745' }}>
                      ✓ Selected: {selectedFile.name}
                    </p>
                  )}
                </div>
                <div className="form-group">
                  <label>Add a comment about this photo (optional):</label>
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Describe what's in this photo, where it was taken, or how you're feeling..."
                    rows="3"
                  />
                </div>
              </div>
            )}

            {/* Audio Entry */}
            {entryType === 'audio' && (
              <div className="form-group">
                <label>Record your voice:</label>
                <div style={{ marginTop: '10px' }}>
                  {!isRecording && !audioBlob && (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="btn"
                      style={{ backgroundColor: '#dc3545' }}
                    >
                      🎤 Start Recording
                    </button>
                  )}
                  
                  {isRecording && (
                    <div>
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="btn"
                        style={{ backgroundColor: '#dc3545' }}
                      >
                        ⏹ Stop Recording
                      </button>
                      <p style={{ marginTop: '10px', color: '#dc3545' }}>
                        🔴 Recording in progress...
                      </p>
                    </div>
                  )}
                  
                  {audioBlob && (
                    <div>
                      <p style={{ color: '#28a745' }}>✓ Recording ready</p>
                      <audio controls src={URL.createObjectURL(audioBlob)} />
                      <br />
                      <button
                        type="button"
                        onClick={() => {
                          setAudioBlob(null);
                          setIsRecording(false);
                        }}
                        className="btn btn-secondary"
                        style={{ marginTop: '10px' }}
                      >
                        Record Again
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button 
              type="submit" 
              className="btn" 
              disabled={loading || updatingLocation}
              style={{ width: '100%', marginTop: '20px' }}
            >
              {updatingLocation ? '📍 Getting location...' : loading ? 'Submitting...' : 'Share Entry'}
            </button>
          </form>
        </div>

        {/* Instructions */}
        <div className="card">
          <h3>Tips</h3>
          <ul>
            <li>Allow location access for the best experience</li>
            <li>Fresh GPS coordinates are captured each time you share an entry</li>
            <li>Your entries will be added to the trip blog automatically</li>
            <li>The app works offline - entries will be submitted when you reconnect</li>
            <li>For photos, try to capture interesting moments and places</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default TravelerPWA;