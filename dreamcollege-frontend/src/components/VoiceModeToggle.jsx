/**
 * VoiceModeToggle Component
 * 
 * Voice mode toggle component that allows users to switch between text and voice input modes.
 * Includes browser compatibility checking and visual feedback for voice availability.
 * 
 * Features:
 * - Visual toggle switch with clear mode indicators
 * - Browser compatibility detection on mount
 * - Error handling and user feedback
 * - Disabled state for unsupported browsers
 * - Professional styling with smooth animations
 */

import React, { useState, useEffect } from 'react';

export default function VoiceModeToggle({ 
  isVoiceMode, 
  onVoiceModeChange, 
  disabled = false 
}) {
  const [isVoiceSupported, setIsVoiceSupported] = useState(false);
  const [voiceError, setVoiceError] = useState(null);
  const [isChecking, setIsChecking] = useState(true);

  // Check browser compatibility on component mount
  useEffect(() => {
    checkVoiceSupport();
  }, []);

  /**
   * Check if voice features are supported in current browser
   */
  const checkVoiceSupport = async () => {
    setIsChecking(true);
    setVoiceError(null);

    try {
      // Check for HTTPS requirement (more permissive for localhost)
      const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
      const isSecure = window.isSecureContext || isLocalhost;
      
      if (!isSecure) {
        throw new Error('Voice features require HTTPS connection');
      }

      // Check for Speech Recognition API (with vendor prefixes)
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const hasSpeechRecognition = !!SpeechRecognition;

      // Check for Speech Synthesis API
      const hasTextToSpeech = !!window.speechSynthesis;

      // Require at least one voice feature to be available
      if (!hasSpeechRecognition && !hasTextToSpeech) {
        throw new Error('Browser does not support voice features (Speech Recognition or Text-to-Speech)');
      }

      // For development, allow voice mode even if only one feature is available
      if (isLocalhost) {
        console.log('Voice feature check:', {
          speechRecognition: hasSpeechRecognition,
          textToSpeech: hasTextToSpeech,
          secure: isSecure,
          localhost: isLocalhost
        });
      }

      // Check for microphone permission (only if speech recognition is available)
      if (hasSpeechRecognition && navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'microphone' });
          if (permission.state === 'denied') {
            // Don't fail completely, just warn user
            setVoiceError('Microphone access denied. Voice input will not work, but text-to-speech is available.');
            console.warn('Microphone permission denied, but continuing with limited voice features');
          }
        } catch (permissionError) {
          // Some browsers don't support permissions API, continue anyway
          console.warn('Could not check microphone permission:', permissionError);
        }
      }

      setIsVoiceSupported(true);
    } catch (error) {
      console.warn('Voice features not available:', error.message);
      setVoiceError(error.message);
      setIsVoiceSupported(false);
    } finally {
      setIsChecking(false);
    }
  };

  /**
   * Handle toggle click
   */
  const handleToggle = () => {
    if (!isVoiceSupported || disabled) return;
    
    const newVoiceMode = !isVoiceMode;
    onVoiceModeChange(newVoiceMode);
  };

  /**
   * Get appropriate tooltip text
   */
  const getTooltipText = () => {
    if (isChecking) return 'Checking voice support...';
    if (!isVoiceSupported) return voiceError || 'Voice mode not available';
    if (disabled) return 'Voice mode temporarily disabled';
    
    // If there's a voice error but voice is still supported (limited functionality)
    if (voiceError && isVoiceSupported) {
      return `Voice mode available with limitations: ${voiceError}`;
    }
    
    return isVoiceMode ? 'Switch to text mode' : 'Switch to voice mode';
  };

  /**
   * Get toggle button classes
   */
  const getToggleClasses = () => {
    let classes = 'voice-toggle';
    
    if (isVoiceMode) classes += ' voice-toggle--active';
    if (!isVoiceSupported || disabled || isChecking) classes += ' voice-toggle--disabled';
    
    return classes;
  };

  return (
    <div className="voice-toggle-container">
      <button
        className={getToggleClasses()}
        onClick={handleToggle}
        disabled={!isVoiceSupported || disabled || isChecking}
        title={getTooltipText()}
        aria-label={`Voice mode ${isVoiceMode ? 'enabled' : 'disabled'}. ${getTooltipText()}`}
      >
        {/* Toggle Track */}
        <div className="voice-toggle__track">
          {/* Toggle Thumb */}
          <div className="voice-toggle__thumb">
            {isChecking ? (
              <div className="voice-toggle__loading">⟳</div>
            ) : isVoiceMode ? (
              <div className="voice-toggle__icon voice-toggle__icon--mic">🎤</div>
            ) : (
              <div className="voice-toggle__icon voice-toggle__icon--text">✎</div>
            )}
          </div>
        </div>
        
        {/* Mode Labels */}
        <div className="voice-toggle__labels">
          <span className={`voice-toggle__label ${!isVoiceMode ? 'voice-toggle__label--active' : ''}`}>
            Text
          </span>
          <span className={`voice-toggle__label ${isVoiceMode ? 'voice-toggle__label--active' : ''}`}>
            Voice
          </span>
        </div>
      </button>

      {/* Error Message */}
      {voiceError && !isVoiceSupported && (
        <div className="voice-toggle__error">
          <small>{voiceError}</small>
          {voiceError.includes('HTTPS') && (
            <div className="voice-toggle__help">
              <small>
                Voice features require a secure connection. 
                {window.location.hostname === 'localhost' 
                  ? ' Try using HTTPS in production.' 
                  : ' Please access this site via HTTPS.'}
              </small>
            </div>
          )}
        </div>
      )}

      {/* Warning Message for Limited Functionality */}
      {voiceError && isVoiceSupported && (
        <div className="voice-toggle__warning">
          <small style={{ color: '#856404' }}>⚠️ {voiceError}</small>
        </div>
      )}

      {/* Support Info */}
      {isVoiceSupported && !voiceError && (
        <div className="voice-toggle__info">
          <small style={{ color: '#28a745' }}>✅ Voice mode available</small>
        </div>
      )}
    </div>
  );
}