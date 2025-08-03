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



  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 0',
        width: '100%'
      }}>
        <button
          onClick={handleToggle}
          disabled={!isVoiceSupported || disabled || isChecking}
          title={getTooltipText()}
          aria-label={`Voice mode ${isVoiceMode ? 'enabled' : 'disabled'}. ${getTooltipText()}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: '#F2F2F7',
            borderRadius: '20px',
            border: 'none',
            cursor: (!isVoiceSupported || disabled || isChecking) ? 'not-allowed' : 'pointer',
            opacity: (!isVoiceSupported || disabled || isChecking) ? 0.5 : 1,
            transition: 'all 0.2s ease',
            width: '140px',
            height: '40px'
          }}
        >
          <span style={{
            fontSize: '15px',
            fontWeight: !isVoiceMode ? '600' : '400',
            color: !isVoiceMode ? '#007AFF' : '#8E8E93',
            letterSpacing: '-0.24px',
            transition: 'all 0.2s ease'
          }}>
            Text
          </span>
        
        {/* Toggle Track */}
        <div style={{
          position: 'relative',
          width: '40px',
          height: '24px',
          backgroundColor: isVoiceMode ? '#007AFF' : '#D1D1D6',
          borderRadius: '12px',
          transition: 'background-color 0.3s ease',
          cursor: (!isVoiceSupported || disabled || isChecking) ? 'not-allowed' : 'pointer'
        }}>
          {/* Toggle Thumb */}
          <div 
            style={{
              position: 'absolute',
              top: '2px',
              left: isVoiceMode ? '18px' : '2px',
              width: '20px',
              height: '20px',
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              cursor: (!isVoiceSupported || disabled || isChecking) ? 'not-allowed' : 'pointer'
            }}
            onMouseOver={(e) => {
              if (isVoiceSupported && !disabled && !isChecking) {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
              }
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }}
          >
            {isChecking ? (
              <div style={{
                fontSize: '10px',
                animation: 'spin 1s linear infinite'
              }}>⟳</div>
            ) : isVoiceMode ? (
              <div style={{ fontSize: '10px' }}>🎤</div>
            ) : (
              <div style={{ fontSize: '10px' }}>✎</div>
            )}
          </div>
        </div>
        
          <span style={{
            fontSize: '15px',
            fontWeight: isVoiceMode ? '600' : '400',
            color: isVoiceMode ? '#007AFF' : '#8E8E93',
            letterSpacing: '-0.24px',
            transition: 'all 0.2s ease'
          }}>
            Voice
          </span>
        </button>
      </div>

      {/* Error Message */}
      {voiceError && !isVoiceSupported && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#FFF2F2',
          borderRadius: '12px',
          border: '1px solid #FECACA'
        }}>
          <div style={{
            fontSize: '13px',
            color: '#DC2626',
            letterSpacing: '-0.08px',
            marginBottom: voiceError.includes('HTTPS') ? '8px' : '0'
          }}>
            {voiceError}
          </div>
          {voiceError.includes('HTTPS') && (
            <div style={{
              fontSize: '12px',
              color: '#7F1D1D',
              letterSpacing: '-0.05px'
            }}>
              Voice features require a secure connection. 
              {window.location.hostname === 'localhost' 
                ? ' Try using HTTPS in production.' 
                : ' Please access this site via HTTPS.'}
            </div>
          )}
        </div>
      )}

      {/* Warning Message for Limited Functionality */}
      {voiceError && isVoiceSupported && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#FFF8E6',
          borderRadius: '12px',
          border: '1px solid #FDE68A'
        }}>
          <div style={{
            fontSize: '13px',
            color: '#92400E',
            letterSpacing: '-0.08px'
          }}>
            ⚠️ {voiceError}
          </div>
        </div>
      )}

      {/* Support Info */}
      {isVoiceSupported && !voiceError && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#F0FDF4',
          borderRadius: '12px',
          border: '1px solid #BBF7D0'
        }}>
          <div style={{
            fontSize: '13px',
            color: '#166534',
            letterSpacing: '-0.08px'
          }}>
            ✅ Voice mode available
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}