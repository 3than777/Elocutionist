/**
 * SpeechFeedback Component
 * 
 * Provides comprehensive visual feedback for speech recognition and text-to-speech functionality.
 * Displays real-time indicators for listening state, speech confidence, TTS progress, and audio levels.
 * 
 * Features:
 * - Animated microphone indicator with pulse effects
 * - Speech recognition confidence meter with color coding
 * - Text-to-speech progress indicator with estimated duration
 * - Real-time audio level visualization (waveform/bars)
 * - Error messages with retry options and help text
 * - Accessibility-compliant with screen reader support
 * - Mobile-friendly responsive design
 * 
 * Visual States:
 * - idle: Ready state with subtle animations
 * - listening: Active recording with audio visualization
 * - processing: Speech-to-text conversion indicator
 * - speaking: Text-to-speech playback progress
 * - error: Error display with recovery options
 * 
 * Integration:
 * - Receives events from speechRecognition and textToSpeech services
 * - Provides visual feedback for VoiceInput and ChatBox components
 * - Supports voice settings configuration from SettingsPanel
 * 
 * Related Files:
 * - src/services/speechRecognition.js - Speech recognition events
 * - src/services/textToSpeech.js - Text-to-speech events
 * - src/components/VoiceInput.jsx - Voice input integration
 * - src/components/ChatBox.jsx - Chat flow integration
 * 
 * Task: Voice Mode Feature Implementation - Step 6
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

export default function SpeechFeedback({
  // Speech Recognition Props
  isListening = false,
  speechConfidence = 0,
  interimTranscript = '',
  speechError = null,
  audioLevel = 0,
  
  // Text-to-Speech Props
  isSpeaking = false,
  speechProgress = 0,
  estimatedDuration = 0,
  currentSpeechText = '',
  ttsError = null,
  
  // Configuration Props
  showConfidence = true,
  showAudioLevel = true,
  showProgress = true,
  showInterimText = true,
  compactMode = false,
  className = '',
  
  // Event Handlers
  onRetryRecognition = null,
  onStopSpeech = null,
  onSkipSpeech = null
}) {
  // Component state
  const [animationPhase, setAnimationPhase] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [lastError, setLastError] = useState(null);
  
  // Animation references
  const animationFrameRef = useRef(null);
  const pulseIntervalRef = useRef(null);
  
  /**
   * Manage component visibility based on activity
   */
  useEffect(() => {
    const hasActivity = isListening || isSpeaking || speechError || ttsError || interimTranscript;
    setIsVisible(hasActivity);
  }, [isListening, isSpeaking, speechError, ttsError, interimTranscript]);
  
  /**
   * Handle error state management
   */
  useEffect(() => {
    const currentError = speechError || ttsError;
    if (currentError && currentError !== lastError) {
      setLastError(currentError);
      
      // Auto-clear error after delay if no new errors
      setTimeout(() => {
        if (!speechError && !ttsError) {
          setLastError(null);
        }
      }, 5000);
    }
  }, [speechError, ttsError, lastError]);
  
  /**
   * Animation loop for smooth visual effects
   */
  const updateAnimations = useCallback(() => {
    setAnimationPhase(prev => (prev + 1) % 60); // 60-frame cycle
    
    if (isListening || isSpeaking) {
      animationFrameRef.current = requestAnimationFrame(updateAnimations);
    }
  }, [isListening, isSpeaking]);
  
  /**
   * Start animations when active
   */
  useEffect(() => {
    if (isListening || isSpeaking) {
      animationFrameRef.current = requestAnimationFrame(updateAnimations);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isListening, isSpeaking, updateAnimations]);
  
  /**
   * Pulse animation for microphone
   */
  useEffect(() => {
    if (isListening) {
      pulseIntervalRef.current = setInterval(() => {
        // Trigger CSS animation class
      }, 1000);
    } else {
      clearInterval(pulseIntervalRef.current);
    }
    
    return () => clearInterval(pulseIntervalRef.current);
  }, [isListening]);
  
  /**
   * Get confidence level color
   */
  const getConfidenceColor = useCallback((confidence) => {
    if (confidence >= 0.8) return '#28a745'; // High - Green
    if (confidence >= 0.6) return '#ffc107'; // Medium - Yellow
    if (confidence >= 0.4) return '#fd7e14'; // Low - Orange
    return '#dc3545'; // Very Low - Red
  }, []);
  
  /**
   * Get progress color based on speech state
   */
  const getProgressColor = useCallback(() => {
    if (ttsError) return '#dc3545';
    if (isSpeaking) return '#17a2b8';
    return '#6c757d';
  }, [isSpeaking, ttsError]);
  
  /**
   * Render microphone indicator with animation
   */
  const renderMicrophoneIndicator = () => {
    const micSize = compactMode ? 32 : 48;
    const isActive = isListening || audioLevel > 0.1;
    
    const micStyle = {
      width: `${micSize}px`,
      height: `${micSize}px`,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: `${micSize * 0.6}px`,
      transition: 'all 0.3s ease',
      backgroundColor: isActive ? '#dc3545' : '#6c757d',
      color: 'white',
      transform: isActive ? `scale(${1 + audioLevel * 0.3})` : 'scale(1)',
      boxShadow: isActive 
        ? `0 0 ${Math.max(8, audioLevel * 30)}px rgba(220, 53, 69, 0.6)`
        : '0 2px 8px rgba(0,0,0,0.2)',
      animation: isListening ? 'speechPulse 1.5s infinite' : 'none'
    };
    
    return (
      <div 
        style={micStyle}
        role="status"
        aria-label={isListening ? `Listening, audio level ${Math.round(audioLevel * 100)}%` : 'Microphone ready'}
      >
        {isListening ? '🔴' : '🎤'}
      </div>
    );
  };
  
  /**
   * Render audio level visualization
   */
  const renderAudioLevel = () => {
    if (!showAudioLevel || (!isListening && audioLevel === 0)) return null;
    
    const barCount = compactMode ? 5 : 8;
    const maxHeight = compactMode ? 16 : 24;
    
    return (
      <div 
        style={{
          display: 'flex',
          gap: '2px',
          alignItems: 'end',
          height: `${maxHeight}px`,
          marginLeft: '12px'
        }}
        role="progressbar"
        aria-label={`Audio level ${Math.round(audioLevel * 100)}%`}
        aria-valuenow={Math.round(audioLevel * 100)}
        aria-valuemin="0"
        aria-valuemax="100"
      >
        {[...Array(barCount)].map((_, i) => {
          const intensity = Math.max(0.1, audioLevel + (Math.random() * 0.3 - 0.15));
          const height = Math.max(3, intensity * maxHeight * (0.5 + i * 0.1));
          
          return (
            <div
              key={i}
              style={{
                width: '3px',
                height: `${height}px`,
                backgroundColor: intensity > 0.7 ? '#dc3545' : 
                               intensity > 0.4 ? '#ffc107' : '#28a745',
                borderRadius: '1px',
                transition: 'height 0.1s ease',
                opacity: audioLevel > 0.05 ? 1 : 0.3
              }}
            />
          );
        })}
      </div>
    );
  };
  
  /**
   * Render confidence meter
   */
  const renderConfidenceMeter = () => {
    if (!showConfidence || speechConfidence === 0) return null;
    
    const meterWidth = compactMode ? 80 : 120;
    const confidence = Math.round(speechConfidence * 100);
    
    return (
      <div style={{ marginTop: '8px' }}>
        <div style={{
          fontSize: compactMode ? '11px' : '12px',
          color: '#6c757d',
          marginBottom: '4px',
          fontWeight: '500'
        }}>
          Confidence: {confidence}%
        </div>
        
        <div style={{
          width: `${meterWidth}px`,
          height: '6px',
          backgroundColor: '#e9ecef',
          borderRadius: '3px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div
            style={{
              width: `${confidence}%`,
              height: '100%',
              backgroundColor: getConfidenceColor(speechConfidence),
              borderRadius: '3px',
              transition: 'all 0.3s ease',
              position: 'relative'
            }}
            role="progressbar"
            aria-label={`Speech confidence ${confidence}%`}
            aria-valuenow={confidence}
            aria-valuemin="0"
            aria-valuemax="100"
          >
            {/* Shimmer effect for active confidence */}
            {speechConfidence > 0 && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                animation: 'shimmer 2s infinite'
              }} />
            )}
          </div>
        </div>
      </div>
    );
  };
  
  /**
   * Render TTS progress indicator
   */
  const renderTTSProgress = () => {
    if (!showProgress || !isSpeaking) return null;
    
    const progressWidth = compactMode ? 100 : 150;
    const progressPercent = estimatedDuration > 0 ? 
      Math.round((speechProgress / estimatedDuration) * 100) : 0;
    
    return (
      <div style={{ marginTop: '8px' }}>
        <div style={{
          fontSize: compactMode ? '11px' : '12px',
          color: '#17a2b8',
          marginBottom: '4px',
          fontWeight: '500',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>Speaking...</span>
          {onStopSpeech && (
            <button
              onClick={onStopSpeech}
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                backgroundColor: 'transparent',
                border: '1px solid #17a2b8',
                borderRadius: '3px',
                color: '#17a2b8',
                cursor: 'pointer'
              }}
              aria-label="Stop speech"
            >
              Stop
            </button>
          )}
        </div>
        
        <div style={{
          width: `${progressWidth}px`,
          height: '6px',
          backgroundColor: '#e9ecef',
          borderRadius: '3px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div
            style={{
              width: `${progressPercent}%`,
              height: '100%',
              backgroundColor: getProgressColor(),
              borderRadius: '3px',
              transition: 'width 0.5s ease',
              position: 'relative'
            }}
            role="progressbar"
            aria-label={`Speech progress ${progressPercent}%`}
            aria-valuenow={progressPercent}
            aria-valuemin="0"
            aria-valuemax="100"
          >
            {/* Animated progress indicator */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              animation: 'progress-shimmer 1.5s infinite'
            }} />
          </div>
        </div>
      </div>
    );
  };
  
  /**
   * Render interim transcript
   */
  const renderInterimTranscript = () => {
    if (!showInterimText || !interimTranscript || !isListening) return null;
    
    return (
      <div style={{
        marginTop: '8px',
        padding: '8px',
        backgroundColor: '#e3f2fd',
        borderRadius: '6px',
        border: '1px solid #2196f3',
        maxWidth: compactMode ? '200px' : '300px'
      }}>
        <div style={{
          fontSize: compactMode ? '10px' : '11px',
          color: '#1976d2',
          fontWeight: '500',
          marginBottom: '4px'
        }}>
          Hearing...
        </div>
        <div style={{
          fontSize: compactMode ? '12px' : '14px',
          color: '#1976d2',
          fontStyle: 'italic',
          wordBreak: 'break-word'
        }}>
          "{interimTranscript}"
        </div>
      </div>
    );
  };
  
  /**
   * Render error display
   */
  const renderErrorDisplay = () => {
    const error = speechError || ttsError || lastError;
    if (!error) return null;
    
    const isRecoverable = error.recoverable !== false;
    const errorType = error.type || 'unknown';
    
    return (
      <div style={{
        marginTop: '8px',
        padding: '8px',
        backgroundColor: '#f8d7da',
        borderRadius: '6px',
        border: '1px solid #f5c6cb',
        maxWidth: compactMode ? '250px' : '350px'
      }}>
        <div style={{
          fontSize: compactMode ? '11px' : '12px',
          color: '#721c24',
          fontWeight: '600',
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          ⚠️ {errorType === 'speech_failed' ? 'Speech Error' : 
               errorType === 'synthesis_error' ? 'TTS Error' : 
               'Voice Error'}
        </div>
        
        <div style={{
          fontSize: compactMode ? '11px' : '12px',
          color: '#721c24',
          marginBottom: isRecoverable ? '8px' : '0'
        }}>
          {error.message || 'An unknown error occurred'}
        </div>
        
        {error.suggestion && (
          <div style={{
            fontSize: compactMode ? '10px' : '11px',
            color: '#856404',
            marginBottom: isRecoverable ? '8px' : '0',
            fontStyle: 'italic'
          }}>
            💡 {error.suggestion}
          </div>
        )}
        
        {isRecoverable && onRetryRecognition && (
          <button
            onClick={onRetryRecognition}
            style={{
              fontSize: compactMode ? '10px' : '11px',
              padding: '4px 8px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
            aria-label="Retry voice recognition"
          >
            🔄 Try Again
          </button>
        )}
      </div>
    );
  };
  
  // Don't render if not visible and not in compact mode
  if (!isVisible && !compactMode) return null;
  
  return (
    <div 
      className={`speech-feedback ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: compactMode ? '8px' : '12px',
        backgroundColor: compactMode ? 'transparent' : '#f8f9fa',
        borderRadius: compactMode ? '0' : '8px',
        border: compactMode ? 'none' : '1px solid #e9ecef',
        minHeight: compactMode ? 'auto' : '120px',
        opacity: isVisible ? 1 : 0.7,
        transition: 'all 0.3s ease'
      }}
      role="region"
      aria-label="Speech feedback display"
      aria-live="polite"
    >
      {/* Main indicator row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        {/* Microphone indicator */}
        {(isListening || audioLevel > 0) && renderMicrophoneIndicator()}
        
        {/* Audio level visualization */}
        {renderAudioLevel()}
        
        {/* Speaking indicator */}
        {isSpeaking && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#17a2b8',
            fontSize: compactMode ? '12px' : '14px',
            fontWeight: '500'
          }}>
            <span style={{ 
              animation: 'speaking-pulse 1s infinite',
              fontSize: compactMode ? '16px' : '20px'
            }}>
              🔊
            </span>
            {!compactMode && <span>Speaking</span>}
          </div>
        )}
      </div>
      
      {/* Secondary information */}
      {!compactMode && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%'
        }}>
          {renderConfidenceMeter()}
          {renderTTSProgress()}
          {renderInterimTranscript()}
          {renderErrorDisplay()}
        </div>
      )}
      
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes speechPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes progress-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        
        @keyframes speaking-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        
        .speech-feedback {
          user-select: none;
        }
        
        .speech-feedback button:hover {
          opacity: 0.8;
          transform: translateY(-1px);
        }
        
        .speech-feedback button:active {
          transform: translateY(0);
        }
        
        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .speech-feedback {
            border: 2px solid #000;
          }
        }
        
        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .speech-feedback * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}