import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

function TravelerPWA() {
  const { token } = useParams();
  const [traveler, setTraveler] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  
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
      const response = await axios.get(`${API_BASE}/api/traveler/verify/${token}`);
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
      setSelectedFile(file);
    }
  };

  const submitEntry = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('content_type', entryType);
    
    if (location) {
      formData.append('latitude', location.latitude);
      formData.append('longitude', location.longitude);
    }

    if (entryType === 'text') {
      formData.append('content', textContent);
    } else if (entryType === 'photo' && selectedFile) {
      formData.append('file', selectedFile);
      formData.append('content', 'Photo upload');
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
      await axios.post(`${API_BASE}/api/traveler/${token}/entries`, formData, {
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
        <h1>RoadWeave</h1>
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
          ) : location ? (
            <p style={{ color: '#28a745' }}>
              ✓ Location captured: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </p>
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
              <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'normal' }}>
                  <input
                    type="radio"
                    value="text"
                    checked={entryType === 'text'}
                    onChange={(e) => setEntryType(e.target.value)}
                    style={{ marginRight: '5px' }}
                  />
                  Text
                </label>
                <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'normal' }}>
                  <input
                    type="radio"
                    value="photo"
                    checked={entryType === 'photo'}
                    onChange={(e) => setEntryType(e.target.value)}
                    style={{ marginRight: '5px' }}
                  />
                  Photo
                </label>
                <label style={{ display: 'flex', alignItems: 'center', fontWeight: 'normal' }}>
                  <input
                    type="radio"
                    value="audio"
                    checked={entryType === 'audio'}
                    onChange={(e) => setEntryType(e.target.value)}
                    style={{ marginRight: '5px' }}
                  />
                  Voice
                </label>
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
              disabled={loading}
              style={{ width: '100%', marginTop: '20px' }}
            >
              {loading ? 'Submitting...' : 'Share Entry'}
            </button>
          </form>
        </div>

        {/* Instructions */}
        <div className="card">
          <h3>Tips</h3>
          <ul>
            <li>Allow location access for the best experience</li>
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