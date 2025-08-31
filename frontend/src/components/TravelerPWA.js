import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { getApiUrl } from '../config/api';
import LocationPicker from './LocationPicker';

function TravelerPWA() {
  const { token } = useParams();
  const { t, i18n } = useTranslation();
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
  const [locationSource, setLocationSource] = useState('current'); // 'current' or 'manual'
  const [manualLocation, setManualLocation] = useState(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    verifyToken();
    getCurrentLocation();
  }, [token]);

  // Auto-switch language when traveler data loads
  useEffect(() => {
    if (traveler?.trip?.blog_language) {
      i18n.changeLanguage(traveler.trip.blog_language);
    }
  }, [traveler, i18n]);

  const verifyToken = async () => {
    try {
      const response = await axios.get(getApiUrl(`/api/traveler/verify/${token}`));
      setTraveler(response.data.traveler);
    } catch (err) {
      setError(t('traveler.errors.invalidToken'));
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError(t('traveler.errors.geolocationNotSupported'));
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
      setError(t('traveler.errors.microphoneAccess'));
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };


  const compressImage = (file, quality = 0.9, maxWidth = 2560, maxHeight = 1440) => {
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
      
      
      // Now compress the image if needed
      if (file.type.startsWith('image/')) {
        setError(`Optimizing image (${originalSizeMB}MB)...`);
        try {
          let compressedFile = await compressImage(file, 0.9, 2560, 1440);
          
          // If still too large, compress more aggressively
          if (compressedFile.size > maxSizeBytes) {
            compressedFile = await compressImage(file, 0.8, 2560, 1440);
          }
          
          // If still too large, compress even more
          if (compressedFile.size > maxSizeBytes) {
            compressedFile = await compressImage(file, 0.7, 1920, 1080);
          }
          
          // Final attempt with very aggressive compression
          if (compressedFile.size > maxSizeBytes) {
            compressedFile = await compressImage(file, 0.5, 1920, 1080);
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
          
          // Show final status message
          if (originalSizeMB !== compressedSizeMB) {
            setError(`✓ Image optimized from ${originalSizeMB}MB to ${compressedSizeMB}MB. Using current location.`);
            setTimeout(() => setError(''), 3000);
          } else {
            setError(`✓ Image ready. Using current location.`);
            setTimeout(() => setError(''), 2000);
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

    // Get location for this entry
    let entryLocation = null;
    
    if (locationSource === 'manual' && manualLocation) {
      // Use manually selected location
      entryLocation = {
        latitude: manualLocation.lat,
        longitude: manualLocation.lng
      };
    } else {
      // Get current location
      entryLocation = location;
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
          entryLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          // Update state for next time
          setLocation(entryLocation);
        } catch (error) {
          console.warn('Could not get current location, using last known location:', error);
          // Continue with existing location or no location
        } finally {
          setUpdatingLocation(false);
        }
      }
    }

    const formData = new FormData();
    formData.append('content_type', entryType);
    
    if (entryLocation) {
      formData.append('latitude', entryLocation.latitude);
      formData.append('longitude', entryLocation.longitude);
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
      setError(t('traveler.errors.contentRequired'));
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
      setLocationSource('current');
      setManualLocation(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setSuccess(t('traveler.messages.success'));
      
      // Refresh location for next entry
      getCurrentLocation();
    } catch (err) {
      if (err.response?.data?.offline) {
        setSuccess('You are offline. Entry will be submitted when connection is restored.');
      } else if (err.response?.status === 413) {
        setError(t('traveler.errors.fileTooLarge'));
      } else {
        setError(err.response?.data?.error || t('traveler.errors.uploadFailed'));
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
            <div className="loading">{t('traveler.title')}</div>
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
          {t('traveler.welcome', { name: traveler.name })}
        </p>
        <p style={{ margin: 0, textAlign: 'center', fontSize: '0.9em', color: '#666' }}>
          {t('traveler.trip', { tripName: traveler.trip_name })}
        </p>
      </div>

      <div className="container">
        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}


        {/* Location Status */}
        <div className="card">
          <h3>{t('traveler.location.title')}</h3>
          {locationLoading ? (
            <p>{t('traveler.location.getting')}</p>
          ) : updatingLocation ? (
            <p style={{ color: '#007bff' }}>📍 Updating location for entry...</p>
          ) : location ? (
            <div>
              <p style={{ color: '#28a745' }}>
                ✓ {t('traveler.location.selected')}: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </p>
              <p style={{ fontSize: '0.9em', color: '#666', margin: '5px 0 0 0' }}>
                📍 {t('traveler.location.freshCapture')}
              </p>
            </div>
          ) : (
            <div>
              <p style={{ color: '#dc3545' }}>⚠ {t('traveler.location.failed')}</p>
              <button onClick={getCurrentLocation} className="btn btn-secondary">
                {t('traveler.actions.retry')}
              </button>
            </div>
          )}
        </div>

        {/* Entry Form */}
        <div className="card">
          <h3>{t('traveler.title')}</h3>
          <form onSubmit={submitEntry}>
            {/* Entry Type Selection */}
            <div className="form-group">
              <label>{t('traveler.contentType')}</label>
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
                  <div style={{ fontSize: '12px', fontWeight: '500' }}>{t('traveler.contentTypes.text')}</div>
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
                  <div style={{ fontSize: '12px', fontWeight: '500' }}>{t('traveler.contentTypes.photo')}</div>
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
                  <div style={{ fontSize: '12px', fontWeight: '500' }}>{t('traveler.contentTypes.audio')}</div>
                </button>
              </div>
            </div>

            {/* Text Entry */}
            {entryType === 'text' && (
              <div className="form-group">
                <label>{t('traveler.textLabel')}</label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder={t('traveler.textPlaceholder')}
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
                      📷 {t('traveler.fileUpload.choose')}
                    </button>
                    <button
                      type="button"
                      onClick={() => document.getElementById('file-input').click()}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.9em' }}
                    >
                      📁 {t('traveler.fileUpload.choose')}
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
                    <div style={{ marginTop: '10px' }}>
                      <p style={{ color: '#28a745', margin: '0 0 5px 0' }}>
                        ✓ Selected: {selectedFile.name}
                      </p>
                      
                      <div style={{ 
                        backgroundColor: '#f8f9fa', 
                        padding: '8px 12px', 
                        borderRadius: '4px',
                        fontSize: '0.9em',
                        border: '1px solid #dee2e6'
                      }}>
                        <div style={{ color: '#6c757d' }}>
                          📍 Will use current location
                        </div>
                      </div>
                    </div>
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
                      🎤 {t('traveler.audioRecording.record')}
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
                        ⏹ {t('traveler.audioRecording.stop')}
                      </button>
                      <p style={{ marginTop: '10px', color: '#dc3545' }}>
                        🔴 {t('traveler.audioRecording.playing')}
                      </p>
                    </div>
                  )}
                  
                  {audioBlob && (
                    <div>
                      <p style={{ color: '#28a745' }}>✓ {t('traveler.audioRecording.recorded', { duration: '?' })}</p>
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
                        {t('traveler.audioRecording.record')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Location Selection */}
            <div className="form-group" style={{ marginTop: '20px' }}>
              <label>{t('traveler.location.title')}:</label>
              <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setLocationSource('current')}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      backgroundColor: locationSource === 'current' ? '#007bff' : '#f8f9fa',
                      color: locationSource === 'current' ? 'white' : '#666',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    📱 {t('traveler.location.current')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLocationPicker(true)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      backgroundColor: locationSource === 'manual' ? '#007bff' : '#f8f9fa',
                      color: locationSource === 'manual' ? 'white' : '#666',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    🗺️ {t('traveler.location.manual')}
                  </button>
                </div>
                
                {locationSource === 'current' && (
                  <div style={{ 
                    backgroundColor: '#f8f9fa', 
                    padding: '8px 12px', 
                    borderRadius: '4px',
                    fontSize: '0.9em',
                    border: '1px solid #dee2e6'
                  }}>
                    <div style={{ color: '#6c757d' }}>
                      📍 {t('traveler.location.willUse')}
                      {location && (
                        <div style={{ marginTop: '4px', fontSize: '0.8em' }}>
                          {t('traveler.location.currentPrefix')}{location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {locationSource === 'manual' && manualLocation && (
                  <div style={{ 
                    backgroundColor: '#e3f2fd', 
                    padding: '8px 12px', 
                    borderRadius: '4px',
                    fontSize: '0.9em',
                    border: '1px solid #bbdefb'
                  }}>
                    <div style={{ color: '#1976d2', marginBottom: '4px' }}>
                      📍 Selected location: {manualLocation.lat.toFixed(4)}, {manualLocation.lng.toFixed(4)}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowLocationPicker(true)}
                      style={{
                        fontSize: '0.8em',
                        padding: '2px 6px',
                        backgroundColor: '#1976d2',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      {t('traveler.location.manual')}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button 
              type="submit" 
              className="btn" 
              disabled={loading || updatingLocation || (entryType === 'photo' && !selectedFile)}
              style={{ width: '100%', marginTop: '20px' }}
            >
              {updatingLocation ? `📍 ${t('traveler.location.getting')}` : loading ? t('traveler.actions.submitting') : t('traveler.actions.submit')}
            </button>
          </form>
        </div>


        {/* Instructions */}
        <div className="card">
          <h3>{t('traveler.tips.title')}</h3>
          <ul>
            {t('traveler.tips.items', { returnObjects: true }).map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* Location Picker Modal */}
      <LocationPicker
        isVisible={showLocationPicker}
        initialLocation={manualLocation || (location ? { lat: location.latitude, lng: location.longitude } : { lat: 51.505, lng: -0.09 })}
        onLocationSelect={(selectedLocation) => {
          setManualLocation(selectedLocation);
          setLocationSource('manual');
          setShowLocationPicker(false);
        }}
        onCancel={() => setShowLocationPicker(false)}
      />
    </div>
  );
}

export default TravelerPWA;