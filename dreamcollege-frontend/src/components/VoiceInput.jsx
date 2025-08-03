/**
 * VoiceInput Component
 * 
 * Dedicated voice input interface that replaces text input in voice mode.
 * Provides rich visual feedback, audio level visualization, and manual controls
 * for speech recognition with confirmation workflow.
 * 
 * Features:
 * - Large microphone button for intuitive voice input
 * - Real-time audio level visualization (voice activity detection)
 * - Interim speech results display
 * - Manual confirm/cancel workflow for speech input
 * - Multiple visual states: idle, listening, processing, confirmed
 * - Error handling with retry options
 * - Accessibility compliance with keyboard navigation
 * - Mobile-friendly touch interface
 * 
 * States:
 * - idle: Ready to start recording
 * - listening: Actively recording speech
 * - processing: Converting speech to text
 * - confirming: Showing transcript for user confirmation
 * - error: Displaying error with retry option
 * 
 * Integration:
 * - Uses speechRecognition service for voice input
 * - Connects to ChatBox for message submission
 * - Respects voice mode settings and preferences
 * 
 * Related Files:
 * - src/services/speechRecognition.js - Speech recognition service
 * - src/components/ChatBox.jsx - Parent component integration
 * - src/components/VoiceModeToggle.jsx - Voice mode control
 * - src/components/SpeechFeedback.jsx - Additional feedback components
 * 
 * Task: Voice Mode Feature Implementation - Step 5
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  startListening,
  stopListening,
  getSpeechRecognitionStatus
} from '../services/speechRecognition';

export default function VoiceInput({
  onVoiceInput,
  onError,
  disabled = false,
  autoSubmit = false,
  showConfirmation = true,
  placeholder = "Click to speak...",
  className = ""
}) {
  // Component state
  const [inputState, setInputState] = useState('idle'); // 'idle', 'listening', 'processing', 'confirming', 'error'
  

  const [transcript, setTranscript] = useState('');

  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Audio visualization
  const [audioContext, setAudioContext] = useState(null);
  const [audioAnalyser, setAudioAnalyser] = useState(null);
  const [audioStream, setAudioStream] = useState(null);
  const animationFrameRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  // Speech recognition management
  const isListeningRef = useRef(false);
  const lastTranscriptRef = useRef('');

  /**
   * Initialize audio visualization for voice level detection
   */
  const initializeAudioVisualization = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('Audio visualization not supported');
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      const context = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = context.createAnalyser();
      const source = context.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      setAudioContext(context);
      setAudioAnalyser(analyser);
      setAudioStream(stream);

      return true;
    } catch (error) {
      console.error('Failed to initialize audio visualization:', error);
      return false;
    }
  }, []);

  /**
   * Update audio level visualization
   */
  const updateAudioLevel = useCallback(() => {
    if (!audioAnalyser) return;

    const dataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
    audioAnalyser.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((acc, value) => acc + value, 0) / dataArray.length;
    const normalizedLevel = Math.min(average / 128, 1); // Normalize to 0-1

    setAudioLevel(normalizedLevel);

    if (inputState === 'listening') {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, [audioAnalyser, inputState]);

  /**
   * Start voice input recording
   */
  const startVoiceInput = useCallback(async () => {
    if (disabled || isListeningRef.current) return;

    try {
      setInputState('processing');
      setError(null);
      setTranscript('');
      setInterimTranscript('');

      // Initialize audio visualization if not already done
      if (!audioAnalyser) {
        await initializeAudioVisualization();
      }

      const success = await startListening(
        // onResult callback - final speech results
        (result) => {
          // Build continuous transcript by appending final results
          if (result.isFinal) {
            const newText = result.transcript.trim();
            if (newText) {
              setTranscript(prev => {
                const updated = prev ? `${prev} ${newText}` : newText;
                lastTranscriptRef.current = updated;
                return updated;
              });

            }
            
            // Keep listening until user manually stops - don't auto-submit here
            if (isListeningRef.current) {
              setInputState('listening'); // Keep listening until user manually stops
            }
          }
        },
        // onError callback
        (errorInfo) => {
          console.error('Voice input error:', errorInfo);
          setError(errorInfo);
          setInputState('error');
          isListeningRef.current = false;
          
          if (onError) {
            onError(errorInfo);
          }
        },
        // onStart callback
        () => {
          setInputState('listening');
          isListeningRef.current = true;
          
          // Start audio level visualization
          if (audioAnalyser) {
            updateAudioLevel();
          }
        },
        // onEnd callback
        () => {
          // Don't change isListeningRef here - let stopVoiceInput handle it
          // The speech recognition might end due to browser timeouts, not user action
          
          // Stop audio level updates
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          
          // Don't change inputState here - keep it as 'listening' until user manually stops
          // This callback is just for cleanup when browser automatically stops recognition
        },
        // onInterim callback - interim results
        (interimResult) => {
          if (interimResult.silenceDetected) {
            setInterimTranscript('');
          } else {
            setInterimTranscript(interimResult.transcript);
          }
        }
      );

      if (!success) {
        throw new Error('Failed to start speech recognition');
      }

    } catch (error) {
      console.error('Failed to start voice input:', error);
      setError({
        type: 'start_failed',
        message: error.message,
        recoverable: true
      });
      setInputState('error');
    }
  }, [disabled, audioAnalyser, initializeAudioVisualization, updateAudioLevel, autoSubmit, showConfirmation, transcript, onError, onVoiceInput]);

  /**
   * Stop voice input recording
   */
  const stopVoiceInput = useCallback(() => {
    // Stop the speech recognition regardless of current state
    stopListening();
    isListeningRef.current = false;
    
    // Stop audio level updates
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    setAudioLevel(0);
    setInterimTranscript('');
    
    // Give a very short delay to ensure final speech results are processed
    setTimeout(() => {
      const currentTranscript = lastTranscriptRef.current;
      
      if (currentTranscript && currentTranscript.trim().length > 0) {
        if (onVoiceInput) {
          onVoiceInput(currentTranscript.trim());
        }
        
        // Reset state after submission
        setTranscript('');
        lastTranscriptRef.current = '';
        setError(null);
      }
      
      setInputState('idle');
    }, 150); // Small delay to capture any final results
  }, [onVoiceInput]);

  /**
   * Confirm and submit voice input
   */
  const handleConfirmInput = useCallback((textToSubmit) => {
    const finalText = textToSubmit || transcript || lastTranscriptRef.current;
    
    if (!finalText || finalText.trim().length === 0) {
      setError({
        type: 'empty_transcript',
        message: 'No speech detected. Please try again.',
        recoverable: true
      });
      setInputState('error');
      return;
    }

    console.log('Confirming voice input:', finalText);
    
    if (onVoiceInput) {
      onVoiceInput(finalText.trim());
    }

    // Reset state
    setInputState('idle');
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    lastTranscriptRef.current = '';
  }, [onVoiceInput]);

  /**
   * Cancel voice input
   */
  const handleCancelInput = useCallback(() => {
    stopVoiceInput();
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    setInputState('idle');
    lastTranscriptRef.current = '';
  }, [stopVoiceInput]);

  /**
   * Retry voice input after error
   */
  const handleRetry = useCallback(() => {
    setIsRetrying(true);
    setError(null);
    
    // Brief delay before retrying
    retryTimeoutRef.current = setTimeout(() => {
      setIsRetrying(false);
      startVoiceInput();
    }, 1000);
  }, [startVoiceInput]);

  /**
   * Get microphone button style based on state
   */
  const getMicButtonStyle = useCallback(() => {
    const baseStyle = {
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '32px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'all 0.3s ease',
      position: 'relative',
      outline: 'none',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    };

    switch (inputState) {
      case 'listening':
        return {
          ...baseStyle,
          backgroundColor: '#dc3545',
          color: 'white',
          transform: 'scale(1.1)',
          boxShadow: `0 0 0 ${Math.max(4, audioLevel * 20)}px rgba(220, 53, 69, 0.3)`
        };
      case 'processing':
        return {
          ...baseStyle,
          backgroundColor: '#ffc107',
          color: 'white',
          animation: 'pulse 1.5s infinite'
        };
      case 'confirming':
        return {
          ...baseStyle,
          backgroundColor: '#17a2b8',
          color: 'white'
        };
      case 'error':
        return {
          ...baseStyle,
          backgroundColor: '#dc3545',
          color: 'white',
          opacity: 0.7
        };
      default:
        return {
          ...baseStyle,
          backgroundColor: disabled ? '#6c757d' : '#28a745',
          color: 'white',
          opacity: disabled ? 0.6 : 1
        };
    }
  }, [inputState, audioLevel, disabled]);

  /**
   * Get microphone icon based on state
   */
  const getMicIcon = useCallback(() => {
    switch (inputState) {
      case 'listening':
        return '🔴'; // Recording indicator
      case 'processing':
        return '⚙️'; // Processing indicator
      case 'confirming':
        return '✓'; // Confirmation indicator
      case 'error':
        return '⚠️'; // Error indicator
      default:
        return '🎤'; // Default microphone
    }
  }, [inputState]);

  /**
   * Get status text based on current state
   */
  const getStatusText = useCallback(() => {
    switch (inputState) {
      case 'listening':
        return 'Listening... Speak now';
      case 'processing':
        return 'Processing speech...';
      case 'confirming':
        return 'Please confirm your input';
      case 'error':
        return error?.message || 'Voice input error';
      default:
        return placeholder;
    }
  }, [inputState, error, placeholder]);

  /**
   * Handle keyboard interactions
   */
  const handleKeyDown = useCallback((event) => {
    if (disabled) return;

    switch (event.key) {
      case ' ':
      case 'Enter':
        event.preventDefault();
        if (inputState === 'idle') {
          startVoiceInput();
        } else if (inputState === 'listening') {
          stopVoiceInput();
        } else if (inputState === 'confirming') {
          handleConfirmInput();
        }
        break;
      case 'Escape':
        event.preventDefault();
        if (inputState === 'listening') {
          stopVoiceInput();
        } else if (inputState === 'confirming') {
          handleCancelInput();
        }
        break;
    }
  }, [disabled, inputState, startVoiceInput, stopVoiceInput, handleConfirmInput, handleCancelInput]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [audioStream, audioContext]);

  return (
    <div 
      className={`voice-input ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        border: '2px solid #e9ecef',
        minHeight: '200px',
        justifyContent: 'center'
      }}
    >
      {/* Main Microphone Button */}
      <button
        onClick={inputState === 'idle' ? startVoiceInput : 
                inputState === 'listening' ? stopVoiceInput :
                inputState === 'confirming' ? handleConfirmInput :
                inputState === 'error' ? handleRetry : undefined}
        onKeyDown={handleKeyDown}
        disabled={disabled || inputState === 'processing' || isRetrying}
        style={getMicButtonStyle()}
        aria-label={getStatusText()}
        tabIndex={0}
      >
        {isRetrying ? '⟳' : getMicIcon()}
      </button>

      {/* Audio Level Visualizer */}
      {inputState === 'listening' && (
        <div style={{
          display: 'flex',
          gap: '2px',
          alignItems: 'end',
          height: '24px'
        }}>
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              style={{
                width: '4px',
                backgroundColor: '#dc3545',
                borderRadius: '2px',
                height: `${Math.max(4, audioLevel * 24 * (0.5 + Math.random() * 0.5))}px`,
                transition: 'height 0.1s ease',
                opacity: audioLevel > 0.1 ? 1 : 0.3
              }}
            />
          ))}
        </div>
      )}

      {/* Status Text */}
      <div style={{
        textAlign: 'center',
        fontSize: '16px',
        fontWeight: '500',
        color: inputState === 'error' ? '#dc3545' : '#495057',
        minHeight: '24px'
      }}>
        {getStatusText()}
      </div>

      {/* Continuous Transcript Display */}
      {inputState === 'listening' && (transcript || interimTranscript) && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#495057',
          maxWidth: '400px',
          textAlign: 'left',
          border: '2px solid #28a745',
          minHeight: '60px',
          wordWrap: 'break-word'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '4px', color: '#28a745' }}>
            🎤 Recording... (Click red button to stop and send)
          </div>
          <div>
            {transcript && <span style={{ color: '#212529' }}>{transcript}</span>}
            {transcript && interimTranscript && <span> </span>}
            {interimTranscript && <span style={{ color: '#6c757d', fontStyle: 'italic' }}>{interimTranscript}</span>}
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {inputState === 'confirming' && transcript && (
        <div style={{
          padding: '16px',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '2px solid #17a2b8',
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#17a2b8',
            marginBottom: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>Confirm your input:</span>
          </div>
          
          <div style={{
            fontSize: '16px',
            marginBottom: '16px',
            fontStyle: 'italic',
            color: '#495057'
          }}>
            "{transcript}"
          </div>
          
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center'
          }}>
            <button
              onClick={handleCancelInput}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              ❌ Cancel
            </button>
            <button
              onClick={() => handleConfirmInput()}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              ✅ Confirm
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {inputState === 'error' && error && (
        <div style={{
          padding: '16px',
          backgroundColor: '#f8d7da',
          borderRadius: '8px',
          border: '1px solid #f5c6cb',
          maxWidth: '400px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#721c24',
            marginBottom: '8px'
          }}>
            ⚠️ Voice Input Error
          </div>
          
          <div style={{
            fontSize: '14px',
            color: '#721c24',
            marginBottom: '12px'
          }}>
            {error.message}
          </div>
          
          {error.recoverable && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                backgroundColor: isRetrying ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isRetrying ? 'not-allowed' : 'pointer',
                fontWeight: '500'
              }}
            >
              {isRetrying ? '⟳ Retrying...' : '🔄 Try Again'}
            </button>
          )}
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      <div style={{
        fontSize: '12px',
        color: '#6c757d',
        textAlign: 'center',
        marginTop: '8px'
      }}>
        <div>Space/Enter: Start/Stop • Escape: Cancel</div>
      </div>
    </div>
  );
}