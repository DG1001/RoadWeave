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
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  
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
    
    // PWA install prompt handling
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
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

  const compressImage = (file, quality = 0.7, maxWidth = 1920, maxHeight = 1080) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          }));
        }, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setError('');
      
      const maxSizeBytes = 32 * 1024 * 1024; // 32MB
      const originalSizeMB = (file.size / (1024 * 1024)).toFixed(1);
      
      // Compress ALL images, regardless of size, to ensure they're optimized
      if (file.type.startsWith('image/')) {
        setError(`Optimizing image (${originalSizeMB}MB)...`);
        try {
          let compressedFile = await compressImage(file, 0.8, 1920, 1080);
          
          // If still too large, compress more aggressively
          if (compressedFile.size > maxSizeBytes) {
            compressedFile = await compressImage(file, 0.6, 1920, 1080);
          }
          
          // If still too large, compress even more
          if (compressedFile.size > maxSizeBytes) {
            compressedFile = await compressImage(file, 0.4, 1280, 720);
          }
          
          // Final attempt with very aggressive compression
          if (compressedFile.size > maxSizeBytes) {
            compressedFile = await compressImage(file, 0.2, 1024, 768);
          }
          
          const compressedSizeMB = (compressedFile.size / (1024 * 1024)).toFixed(1);
          
          if (compressedFile.size > maxSizeBytes) {
            setError(`Image still too large after compression (${compressedSizeMB}MB). Please try taking a photo with lower resolution.`);
            setSelectedFile(null);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            return;
          }
          
          setSelectedFile(compressedFile);
          if (originalSizeMB !== compressedSizeMB) {
            setError(`✓ Image optimized from ${originalSizeMB}MB to ${compressedSizeMB}MB`);
            setTimeout(() => setError(''), 3000); // Clear success message after 3 seconds
          }
          
        } catch (error) {
          setError('Failed to optimize image. Please try again.');
          setSelectedFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      } else if (file.size > maxSizeBytes) {
        // Non-image files
        setError(`File too large! Selected file is ${originalSizeMB}MB, but maximum allowed is 32MB.`);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setSelectedFile(file);
      }
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

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowInstallPrompt(false);
    }
    
    setDeferredPrompt(null);
  };

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false);
    setDeferredPrompt(null);
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

        {/* PWA Install Prompt */}
        {showInstallPrompt && (
          <div className="card" style={{ backgroundColor: '#e8f5e8', border: '1px solid #d4edda' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#155724' }}>📱 Install RoadWeave</h3>
            <p style={{ margin: '0 0 15px 0', color: '#155724' }}>
              Install RoadWeave as an app on your device for quick access to this trip!
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={handleInstallClick}
                className="btn"
                style={{ backgroundColor: '#28a745', color: 'white' }}
              >
                📱 Install App
              </button>
              <button 
                onClick={dismissInstallPrompt}
                className="btn btn-secondary"
              >
                Not now
              </button>
            </div>
          </div>
        )}

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
                  <label>Add a photo:</label>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => document.getElementById('camera-input').click()}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.9em' }}
                    >
                      📷 Take Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => document.getElementById('file-input').click()}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.9em' }}
                    >
                      📁 Choose File
                    </button>
                  </div>
                  
                  {/* Hidden camera input */}
                  <input
                    id="camera-input"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                  />
                  
                  {/* Hidden file input */}
                  <input
                    id="file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
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
              disabled={loading || updatingLocation || (entryType === 'photo' && !selectedFile)}
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