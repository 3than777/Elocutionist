/**
 * SettingsPanel Component - Enhanced with Upload Management
 * 
 * This component now includes comprehensive file upload management
 * with the ability to toggle between simple and detailed views,
 * show upload statistics, and manage uploaded files.
 */

import React, { useState, useEffect, useCallback } from 'react';
import LevelSelector from './LevelSelector';
import UploadButton from './UploadButton';
import FileManager from './FileManager';
import CheckboxInput from './CheckboxInput';
import AIRatingDisplay from './AIRatingDisplay';
import { useUploadContext } from '../context/UploadContext';
import {
  getAvailableVoices,
  setVoice,
  configureTextToSpeech,
  testSpeech,
  initializeTextToSpeech,
  checkTextToSpeechSupport
} from '../services/textToSpeech';

export default function SettingsPanel({ 
  onDifficultyChange, 
  user, 
  aiRating, 
  ratingLoading, 
  ratingError, 
  onRetryRating,
  testVoiceTutorial
}) {
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const uploadContext = useUploadContext();
  
  // Voice Settings State
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState('');
  const [voiceSettings, setVoiceSettings] = useState({
    rate: 1.0,
    volume: 0.8,
    pitch: 1.0
  });
  const [speechSettings, setSpeechSettings] = useState({
    autoPlayAI: true,
    preferredGender: 'female'
  });
  const [voiceInitialized, setVoiceInitialized] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  
  // Get upload statistics
  const stats = uploadContext.getFileStats();
  const isProcessing = uploadContext.isProcessing();

  // Initialize voice services on component mount
  useEffect(() => {
    initializeVoiceServices();
    loadSavedSettings();
  }, []);

  // Save settings when they change
  useEffect(() => {
    if (voiceInitialized) {
      saveSettings();
    }
  }, [voiceSettings, speechSettings, selectedVoiceId, voiceInitialized]);

  /**
   * Initialize voice services and load available voices
   */
  const initializeVoiceServices = async () => {
    try {
      console.log('Initializing voice services...');
      
      // Check if text-to-speech is supported
      const support = checkTextToSpeechSupport();
      if (!support.isSupported) {
        setVoiceError(support.error || 'Text-to-speech not supported');
        return;
      }

      // Initialize text-to-speech service
      const initialized = await initializeTextToSpeech({
        preferredLanguage: 'en-US',
        preferredGender: speechSettings.preferredGender,
        rate: voiceSettings.rate,
        volume: voiceSettings.volume,
        pitch: voiceSettings.pitch
      });

      if (initialized) {
        setVoiceInitialized(true);
        await loadVoices();
        setVoiceError(null);
        console.log('Voice services initialized successfully');
      } else {
        setVoiceError('Failed to initialize voice services');
      }
    } catch (error) {
      console.error('Error initializing voice services:', error);
      setVoiceError(error.message);
    }
  };

  /**
   * Load available voices
   */
  const loadVoices = useCallback(async () => {
    try {
      const voices = getAvailableVoices();
      console.log('Loaded voices:', voices);
      setAvailableVoices(voices);
      
      // Set default voice if none selected
      if (voices.length > 0 && !selectedVoiceId) {
        const defaultVoice = voices.find(v => v.isDefault) || voices[0];
        setSelectedVoiceId(defaultVoice.name);
      }
    } catch (error) {
      console.error('Failed to load voices:', error);
      setVoiceError('Failed to load available voices');
    }
  }, [selectedVoiceId]);

  /**
   * Load saved settings from localStorage
   */
  const loadSavedSettings = useCallback(() => {
    try {
      const savedVoiceSettings = localStorage.getItem('voiceSettings');
      const savedSpeechSettings = localStorage.getItem('speechSettings');
      const savedSelectedVoice = localStorage.getItem('selectedVoice');
      
      if (savedVoiceSettings) {
        setVoiceSettings(JSON.parse(savedVoiceSettings));
      }
      
      if (savedSpeechSettings) {
        setSpeechSettings(JSON.parse(savedSpeechSettings));
      }
      
      if (savedSelectedVoice) {
        setSelectedVoiceId(savedSelectedVoice);
      }
    } catch (error) {
      console.error('Failed to load saved settings:', error);
    }
  }, []);

  /**
   * Save settings to localStorage
   */
  const saveSettings = useCallback(() => {
    try {
      localStorage.setItem('voiceSettings', JSON.stringify(voiceSettings));
      localStorage.setItem('speechSettings', JSON.stringify(speechSettings));
      localStorage.setItem('selectedVoice', selectedVoiceId);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, [voiceSettings, speechSettings, selectedVoiceId]);

  /**
   * Handle voice selection change
   */
  const handleVoiceChange = (voiceName) => {
    setSelectedVoiceId(voiceName);
    try {
      setVoice(voiceName);
    } catch (error) {
      console.error('Failed to set voice:', error);
    }
  };

  /**
   * Handle voice settings change
   */
  const handleVoiceSettingChange = (setting, value) => {
    const newSettings = { ...voiceSettings, [setting]: value };
    setVoiceSettings(newSettings);
    
    try {
      configureTextToSpeech(newSettings);
    } catch (error) {
      console.error('Failed to update voice settings:', error);
    }
  };

  /**
   * Handle speech settings change
   */
  const handleSpeechSettingChange = (setting, value) => {
    setSpeechSettings({ ...speechSettings, [setting]: value });
  };

  /**
   * Test voice with current settings
   */
  const handleTestVoice = async () => {
    try {
      await testSpeech('Hello! This is a test of your voice settings. How does it sound?');
    } catch (error) {
      console.error('Voice test failed:', error);
      setVoiceError('Voice test failed: ' + error.message);
    }
  };

  /**
   * Apply voice settings
   */
  const handleApplySettings = () => {
    try {
      configureTextToSpeech(voiceSettings);
      setVoice(selectedVoiceId);
      // Show success message or close settings panel
      console.log('Voice settings applied successfully');
    } catch (error) {
      console.error('Failed to apply settings:', error);
      setVoiceError('Failed to apply settings: ' + error.message);
    }
  };

  /**
   * Reset voice settings to defaults
   */
  const handleResetSettings = () => {
    const defaultVoiceSettings = {
      rate: 1.0,
      volume: 0.8,
      pitch: 1.0
    };
    const defaultSpeechSettings = {
      autoPlayAI: true,
      preferredGender: 'female'
    };
    
    setVoiceSettings(defaultVoiceSettings);
    setSpeechSettings(defaultSpeechSettings);
    
    try {
      configureTextToSpeech(defaultVoiceSettings);
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Handle refresh with visual feedback
  const handleRefreshFiles = async () => {
    setIsRefreshing(true);
    try {
      await uploadContext.refreshFiles();
      // Keep the visual feedback for a moment so user sees it worked
      setTimeout(() => {
        setIsRefreshing(false);
      }, 800);
    } catch (error) {
      console.error('Error refreshing files:', error);
      setIsRefreshing(false);
    }
  };

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif'
    }}>
      {/* Expert/Advanced/Beginner */}
      <div style={{
        backgroundColor: 'var(--settings-background)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '16px',
        boxShadow: '0 1px 3px var(--shadow-light)',
        border: '1px solid var(--border-primary)'
      }}>
        <h3 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: 'var(--text-secondary)',
          margin: '0 0 16px 0',
          letterSpacing: '-0.32px'
        }}>Choose Level</h3>
        <LevelSelector onChange={onDifficultyChange} />
      </div>


      {/* Voice Settings */}
      <div style={{
        backgroundColor: 'var(--settings-background)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '16px',
        boxShadow: '0 1px 3px var(--shadow-light)',
        border: '1px solid var(--border-primary)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 style={{ 
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: 'var(--text-secondary)',
            letterSpacing: '-0.32px'
          }}>Voice Settings</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={testVoiceTutorial}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                backgroundColor: '#FF9500',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                letterSpacing: '-0.08px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#DB7600';
                e.currentTarget.style.transform = 'scale(0.98)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#FF9500';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Test Tutorial
            </button>
            <button
              onClick={() => setShowVoiceSettings(!showVoiceSettings)}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                border: 'none',
                backgroundColor: '#34C759',
                color: '#ffffff',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                letterSpacing: '-0.08px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#30D158';
                e.currentTarget.style.transform = 'scale(0.98)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#34C759';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {showVoiceSettings ? 'Hide Settings' : 'Show Settings'}
            </button>
          </div>
        </div>

        {voiceError && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#FFF8E6',
            border: '1px solid #FDE68A',
            borderRadius: '12px',
            marginBottom: '16px',
            fontSize: '15px',
            color: '#92400E',
            letterSpacing: '-0.24px'
          }}>
            ⚠️ {voiceError}
          </div>
        )}

        {showVoiceSettings && (
          <div style={{ marginTop: '10px' }}>
            {/* Voice Selection */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '8px', 
                fontWeight: '600',
                fontSize: '15px',
                color: 'var(--text-primary)',
                letterSpacing: '-0.24px'
              }}>
                🎭 Voice Selection
              </label>
              <select
                value={selectedVoiceId}
                onChange={(e) => handleVoiceChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid var(--border-primary)',
                  color: 'var(--text-primary)',
                  borderRadius: '12px',
                  fontSize: '17px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                  letterSpacing: '-0.41px',
                  backgroundColor: 'var(--input-background)',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  appearance: 'none',
                  backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23999\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6,9 12,15 18,9\'%3e%3c/polyline%3e%3c/svg%3e")',
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  backgroundSize: '16px',
                  paddingRight: '40px'
                }}
                disabled={!voiceInitialized || availableVoices.length === 0}
                onFocus={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--background-primary)';
                  e.currentTarget.style.borderColor = 'var(--accent-blue)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,122,255,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--input-background)';
                  e.currentTarget.style.borderColor = 'var(--border-primary)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value="">Select a voice...</option>
                {availableVoices.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang}) {voice.isDefault ? '⭐' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Speech Rate */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', fontWeight: '600' }}>
                🏃 Speech Rate: {voiceSettings.rate.toFixed(1)}x
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Slow (0.5x)</span>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={voiceSettings.rate}
                  onChange={(e) => handleVoiceSettingChange('rate', parseFloat(e.target.value))}
                  style={{ flex: 1 }}
                  disabled={!voiceInitialized}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Fast (2.0x)</span>
              </div>
              <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                Normal (1.0x)
              </div>
            </div>

            {/* Volume */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', fontWeight: '600' }}>
                🔊 Volume: {Math.round(voiceSettings.volume * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={voiceSettings.volume}
                onChange={(e) => handleVoiceSettingChange('volume', parseFloat(e.target.value))}
                style={{ width: '100%' }}
                disabled={!voiceInitialized}
              />
            </div>

            {/* Pitch */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', fontWeight: '600' }}>
                🎵 Pitch: {voiceSettings.pitch.toFixed(1)}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Low (0.5)</span>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={voiceSettings.pitch}
                  onChange={(e) => handleVoiceSettingChange('pitch', parseFloat(e.target.value))}
                  style={{ flex: 1 }}
                  disabled={!voiceInitialized}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>High (2.0)</span>
              </div>
              <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                Normal (1.0)
              </div>
            </div>

            {/* Preferred Gender */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', fontWeight: '600' }}>
                👤 Preferred Gender
              </label>
              <select
                value={speechSettings.preferredGender}
                onChange={(e) => handleSpeechSettingChange('preferredGender', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid var(--border-secondary)',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'var(--input-background)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="any">Any</option>
              </select>
            </div>



            {/* Auto-play AI responses */}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={speechSettings.autoPlayAI}
                  onChange={(e) => handleSpeechSettingChange('autoPlayAI', e.target.checked)}
                />
                <span style={{ fontWeight: '600' }}>📢 Auto-play AI responses</span>
              </label>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px', marginLeft: '24px' }}>
                Automatically speak AI responses in voice mode
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button
                onClick={handleTestVoice}
                disabled={!voiceInitialized}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  backgroundColor: '#17a2b8',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: voiceInitialized ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  opacity: voiceInitialized ? 1 : 0.6
                }}
              >
                🎤 Test Voice
              </button>
              <button
                onClick={handleApplySettings}
                disabled={!voiceInitialized}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: voiceInitialized ? 'pointer' : 'not-allowed',
                  fontSize: '14px',
                  opacity: voiceInitialized ? 1 : 0.6
                }}
              >
                ✅ Apply Settings
              </button>
              <button
                onClick={handleResetSettings}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                🔄 Reset
              </button>
            </div>
          </div>
        )}

        {!showVoiceSettings && voiceInitialized && (
          <div style={{
            fontSize: '14px',
            color: '#28a745',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            ✅ Voice mode available
          </div>
        )}
      </div>

      {/* Upload Information - Enhanced */}
      <div className="settings-box">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px'
        }}>
          <h3 style={{ margin: 0 }}>
            Upload Information
            {isProcessing && (
              <span style={{
                marginLeft: '10px',
                fontSize: '14px',
                color: 'var(--accent-primary)'
              }}>
                ⚙️ Processing...
              </span>
            )}
          </h3>
          
          {stats.totalFiles > 0 && (
            <button
              onClick={() => setShowDetailedView(!showDetailedView)}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                border: '1px solid var(--accent-primary)',
                backgroundColor: 'var(--background-primary)',
                color: 'var(--accent-primary)',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {showDetailedView ? '📊 Simple View' : '📋 Detailed View'}
            </button>
          )}
        </div>

        {/* Upload Statistics Summary */}
        {stats.totalFiles > 0 && !showDetailedView && (
          <div style={{
            padding: '10px',
            backgroundColor: 'var(--background-quaternary)',
            borderRadius: '4px',
            marginBottom: '10px',
            fontSize: '13px',
            color: 'var(--text-tertiary)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span>Files: {stats.totalFiles}</span>
              <span>Size: {formatFileSize(stats.totalSize)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Words: {stats.totalWords.toLocaleString()}</span>
              <span>
                Ready: {stats.completedFiles}/{stats.totalFiles}
              </span>
            </div>
            {stats.failedFiles > 0 && (
              <div style={{ marginTop: '5px', color: 'var(--error-text)' }}>
                ⚠️ {stats.failedFiles} file(s) failed
              </div>
            )}
          </div>
        )}

        {/* Show appropriate view */}
        {showDetailedView ? (
          <FileManager
            files={uploadContext.uploadedFiles}
            onRemoveFile={uploadContext.removeFile}
            onRetryUpload={uploadContext.retryUpload}
            showPreview={true}
            maxPreviewLength={300}
          />
        ) : (
          user ? (
            <UploadButton />
          ) : (
            <div style={{
              padding: '20px',
              backgroundColor: 'var(--background-quaternary)',
              border: '1px dashed var(--border-tertiary)',
              borderRadius: '8px',
              textAlign: 'center',
              color: 'var(--text-tertiary)'
            }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>🔒</div>
              <p style={{ margin: '0 0 10px 0', fontWeight: '500' }}>
                Authentication Required
              </p>
              <p style={{ margin: '0', fontSize: '14px' }}>
                Please log in to upload documents and personalize your interview experience.
              </p>
            </div>
          )
        )}

        {/* Upload Content Toggle for Chat */}
        {stats.completedFiles > 0 && (
          <div style={{
            marginTop: '15px',
            padding: '10px',
            backgroundColor: 'var(--checkbox-background)',
            borderRadius: '4px',
            fontSize: '13px'
          }}>
            <CheckboxInput 
              label={`Use uploaded content in chat (${stats.completedFiles} files ready)`}
              defaultChecked={true}
            />
            <p style={{ 
              margin: '5px 0 0 20px', 
              fontSize: '12px', 
              color: 'var(--text-tertiary)' 
            }}>
              AI will reference your uploaded files when answering questions
            </p>
          </div>
        )}

        {/* Automatic Refresh Information */}
        <div style={{
          padding: '8px 12px',
          backgroundColor: 'var(--tip-background)',
          border: '1px solid var(--tip-border)',
          borderRadius: '4px',
          marginBottom: '10px',
          marginTop: '10px',
          fontSize: '12px',
          color: 'var(--tip-text)'
        }}>
          ✨ <strong>Auto-Refresh:</strong> Files are automatically refreshed when you switch tabs, upload files, or every 30 seconds.
        </div>

        {/* Manual Refresh Button (Optional Override) */}
        <div style={{ marginBottom: '10px' }}>
          <button
            onClick={handleRefreshFiles}
            disabled={isRefreshing}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              backgroundColor: isRefreshing ? '#28a745' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRefreshing ? 'default' : 'pointer',
              width: '100%',
              transition: 'background-color 0.2s ease',
              opacity: isRefreshing ? 0.9 : 1
            }}
            title="Force an immediate refresh of your uploaded files"
          >
            {isRefreshing ? '✅ Refreshed!' : '🔄 Manual Refresh'}
          </button>
        </div>
      </div>

      {/* Separator + AI Rating lowered */}
      <hr style={{ margin: '24px 0' }} />

      <div className="settings-box">
        <h3>AI Rating</h3>
        <AIRatingDisplay
          rating={aiRating}
          loading={ratingLoading}
          error={ratingError}
          onRetry={onRetryRating}
        />
      </div>
    </div>
  );
}