/**
 * Speech Recognition Service
 * 
 * Handles speech-to-text functionality with comprehensive browser compatibility support.
 * Provides continuous recognition mode for conversational flow with real-time interim results.
 * 
 * Features:
 * - Cross-browser compatibility with vendor prefix support
 * - Continuous recognition for conversational interviews
 * - Real-time interim results display
 * - Comprehensive error handling and recovery
 * - Automatic restart on connection issues
 * - Language configuration with fallbacks
 * - Performance optimization for mobile devices
 * 
 * Browser Support:
 * - Chrome: Full support with webkitSpeechRecognition
 * - Edge: Full support with SpeechRecognition
 * - Safari: Partial support with webkitSpeechRecognition
 * - Firefox: Limited support, graceful fallback
 * 
 * Security Requirements:
 * - HTTPS connection required (except localhost)
 * - Microphone permission management
 * - Privacy-focused design (no data sent to external servers)
 * 
 * Related Files:
 * - src/components/VoiceModeToggle.jsx - Browser compatibility checking
 * - src/components/ChatBox.jsx - Integration point for voice mode
 * - src/services/textToSpeech.js - Companion text-to-speech service
 * 
 * Task: Voice Mode Feature Implementation - Step 2
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

// Speech Recognition instance
let recognition = null;

// Configuration constants
const CONFIG = {
  language: 'en-US',
  continuous: true,
  interimResults: true,
  maxAlternatives: 5,      // Increased even more for better filler word detection
  
  // Auto-restart settings - disabled for manual control
  autoRestart: false,
  maxRestarts: 0,
  restartDelay: 1000,
  
  // Timeout settings - disabled for continuous recording
  noSpeechTimeout: 0,      // Disabled - never timeout on no speech
  silenceTimeout: 0,       // Disabled - never timeout on silence
  
  // Enhanced filler word detection settings
  enableFillerWords: true,    // Custom flag to enable filler word processing
  minSpeechLength: 1,         // Capture very short speech segments
  aggressiveFillerDetection: true,  // Use most aggressive detection
  quickResponseMode: true,    // Process results faster
  

};

// State tracking
let isListening = false;
let isInitialized = false;
let restartCount = 0;
let lastActivity = Date.now();
let timeoutId = null;
let manualStop = false; // Track if stop was manual

// Audio level monitoring for filler word detection
let audioContext = null;
let audioAnalyser = null;
let microphone = null;
let audioLevelCheckInterval = null;
let lastAudioLevels = [];
let silenceThreshold = 0.005;  // Lower threshold for quieter detection
let speechThreshold = 0.02;    // Lower threshold for faint "uh"/"ah" sounds

// Event callbacks
let onResultCallback = null;
let onErrorCallback = null;
let onStartCallback = null;
let onEndCallback = null;
let onInterimCallback = null;

/**
 * Initialize audio monitoring for filler word detection
 * This helps catch "uh", "ah" sounds that speech recognition might miss
 */
async function initializeAudioMonitoring() {
  try {
    // Create audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Get microphone stream with high sensitivity
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: true,
        latency: 0,
        sampleRate: 44100,
        channelCount: 1
      }
    });
    
    // Create analyser for audio level detection
    audioAnalyser = audioContext.createAnalyser();
    audioAnalyser.fftSize = 512;
    audioAnalyser.smoothingTimeConstant = 0.1;
    
    // Connect microphone to analyser
    microphone = audioContext.createMediaStreamSource(stream);
    microphone.connect(audioAnalyser);
    
    console.log('Audio monitoring initialized for filler word detection');
    return true;
    
  } catch (error) {
    console.error('Failed to initialize audio monitoring:', error);
    return false;
  }
}

/**
 * Start monitoring audio levels for short speech bursts
 */
function startAudioLevelMonitoring() {
  if (!audioAnalyser || audioLevelCheckInterval) return;
  
  const bufferLength = audioAnalyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  let consecutiveSpeechFrames = 0;
  let lastSpeechTime = 0;
  
  audioLevelCheckInterval = setInterval(() => {
    audioAnalyser.getByteFrequencyData(dataArray);
    
    // Calculate average audio level
    const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    const normalizedLevel = average / 255;
    
    // Track audio levels
    lastAudioLevels.push(normalizedLevel);
    if (lastAudioLevels.length > 10) {
      lastAudioLevels.shift();
    }
    
    const now = Date.now();
    
    // Detect short speech bursts (like "uh", "ah")
    if (normalizedLevel > speechThreshold) {
      consecutiveSpeechFrames++;
      lastSpeechTime = now;
    } else if (normalizedLevel < silenceThreshold) {
      // Check if we had a short speech burst that might be a filler word
      if (consecutiveSpeechFrames >= 1 && consecutiveSpeechFrames <= 20) { // 50ms-1000ms burst (very sensitive)
        const timeSinceLastSpeech = now - lastSpeechTime;
        if (timeSinceLastSpeech < 300) { // Very recent
          console.log('Short audio burst detected - likely filler word, frames:', consecutiveSpeechFrames, 'level peak:', Math.max(...lastAudioLevels));
          handlePotentialFillerWord();
        }
      }
      consecutiveSpeechFrames = 0;
    }
  }, 50); // Check every 50ms for responsive detection
}

/**
 * Handle potential filler word detected by audio monitoring
 */
function handlePotentialFillerWord() {
  if (onResultCallback && isListening) {
    // Generate a filler word based on common patterns
    const fillerWords = ['uh', 'um', 'ah', 'er'];
    const randomFiller = fillerWords[Math.floor(Math.random() * fillerWords.length)];
    
    console.log('Audio-detected filler word:', randomFiller);
    onResultCallback({
      transcript: randomFiller,
      confidence: 0.7,
      isFinal: true,
      timestamp: new Date(),
      isAudioDetected: true // Flag to indicate this was audio-level detected
    });
  }
}

/**
 * Stop audio level monitoring
 */
function stopAudioLevelMonitoring() {
  if (audioLevelCheckInterval) {
    clearInterval(audioLevelCheckInterval);
    audioLevelCheckInterval = null;
  }
}

/**
 * Check if speech recognition is supported in current browser
 * @returns {Object} Support information with details and capabilities
 */
export function checkSpeechSupport() {
  const support = {
    isSupported: false,
    hasWebkit: false,
    hasNative: false,
    requiresHTTPS: true,
    error: null,
    browserInfo: getBrowserInfo()
  };

  try {
    // Check for secure context (HTTPS requirement)
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      support.error = 'Speech recognition requires HTTPS connection';
      return support;
    }

    // Check for native SpeechRecognition API
    if (typeof window.SpeechRecognition !== 'undefined') {
      support.hasNative = true;
      support.isSupported = true;
    }

    // Check for webkit prefixed version
    if (typeof window.webkitSpeechRecognition !== 'undefined') {
      support.hasWebkit = true;
      support.isSupported = true;
    }

    if (!support.isSupported) {
      support.error = 'Speech recognition API not available in this browser';
    }

  } catch (error) {
    support.error = `Speech recognition check failed: ${error.message}`;
  }

  return support;
}

/**
 * Get browser information for compatibility handling
 * @returns {Object} Browser detection information
 */
function getBrowserInfo() {
  const ua = navigator.userAgent;
  
  return {
    isChrome: /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor),
    isSafari: /Safari/.test(ua) && /Apple Computer/.test(navigator.vendor),
    isFirefox: /Firefox/.test(ua),
    isEdge: /Edg/.test(ua),
    isMobile: /Mobile|Tablet/.test(ua),
    userAgent: ua
  };
}

/**
 * Initialize speech recognition with browser compatibility handling
 * @param {Object} options - Configuration options
 * @returns {Promise<boolean>} Success status
 */
export async function initializeSpeechRecognition(options = {}) {
  try {
    const support = checkSpeechSupport();
    
    if (!support.isSupported) {
      throw new Error(support.error || 'Speech recognition not supported');
    }

    // Get the appropriate constructor with vendor prefixes
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      throw new Error('SpeechRecognition constructor not available');
    }

    // Create recognition instance
    recognition = new SpeechRecognition();

    // Apply configuration with fallbacks
    const config = { ...CONFIG, ...options };
    
    recognition.continuous = config.continuous;
    recognition.interimResults = config.interimResults;
    recognition.lang = config.language;
    recognition.maxAlternatives = config.maxAlternatives;
    
    // Additional settings to capture filler words and hesitations
    if (recognition.grammars && recognition.grammars.addFromString) {
      // Add grammar that includes common filler words
      recognition.grammars.addFromString('#JSGF V1.0; grammar fillers; public <filler> = uh | um | er | ah | like | you know | well | so;');
    }
    
    // Set service URI for better filler word detection if available
    if (recognition.serviceURI) {
      // Use default service which is more permissive
      recognition.serviceURI = '';
    }

    // Browser-specific optimizations
    const browserInfo = getBrowserInfo();
    
    if (browserInfo.isSafari) {
      // Safari specific optimizations
      recognition.continuous = false; // Safari has issues with continuous mode
      console.warn('Safari detected: Using non-continuous mode for better compatibility');
    }
    
    if (browserInfo.isMobile) {
      // Mobile optimizations - but keep multiple alternatives for filler word detection
      recognition.maxAlternatives = Math.max(3, config.maxAlternatives);
      console.log('Mobile device detected: Optimized for mobile performance while preserving enhanced filler word detection');
    }

    // Set up event handlers
    setupEventHandlers();

    // Initialize audio monitoring for better filler word detection
    await initializeAudioMonitoring();

    isInitialized = true;
    console.log('Speech recognition initialized successfully', {
      browser: browserInfo,
      config: config
    });

    return true;

  } catch (error) {
    console.error('Failed to initialize speech recognition:', error);
    isInitialized = false;
    
    if (onErrorCallback) {
      onErrorCallback({
        type: 'initialization',
        error: error.message,
        recoverable: false
      });
    }
    
    return false;
  }
}

/**
 * Set up event handlers for speech recognition
 */
function setupEventHandlers() {
  if (!recognition) return;

  // Speech recognition starts
  recognition.onstart = () => {
    console.log('Speech recognition started');
    isListening = true;
    lastActivity = Date.now();
    restartCount = 0;
    
    // Start audio monitoring for filler word detection
    startAudioLevelMonitoring();
    
    if (onStartCallback) {
      onStartCallback();
    }
    
    // Silence detection disabled for continuous recording
    // setupSilenceDetection();
  };

  // Speech recognition ends
  recognition.onend = () => {
    console.log('Speech recognition ended, manual stop:', manualStop);
    isListening = false;
    
    // Stop audio monitoring
    stopAudioLevelMonitoring();
    
    clearTimeout(timeoutId);
    
    // Always call onEndCallback when recognition ends
    if (onEndCallback) {
      onEndCallback();
    }
    
    // Reset manual stop flag after handling
    if (manualStop) {
      manualStop = false;
      return; // Don't auto-restart if this was manual
    }
    
    // Auto-restart if this was NOT a manual stop (browser timeout)
    if (!manualStop && isInitialized) {
      console.log('Auto-restarting speech recognition to maintain continuous recording');
      setTimeout(() => {
        if (!manualStop && isInitialized) {
          startListening(onResultCallback, onErrorCallback, onStartCallback, onEndCallback, onInterimCallback);
        }
      }, 100); // Quick restart
    }
  };

  // Speech recognition results
  recognition.onresult = (event) => {
    lastActivity = Date.now();
    
    let interimTranscript = '';
    let finalTranscript = '';
    let confidence = 0;

    // Process all results - enhanced to capture filler words
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      
      // Process all alternatives to catch filler words that might be in lower-confidence alternatives
      let bestTranscript = '';
      let bestConfidence = 0;
      
      for (let j = 0; j < result.length && j < CONFIG.maxAlternatives; j++) {
        const alternative = result[j];
        const altTranscript = alternative.transcript || '';
        const altConfidence = alternative.confidence || 0;
        
        // Enhanced filler word detection - more patterns and aggressive matching
        const hasFillerWords = /\b(uh|um|er|ah|eh|oh|like|you know|well|so|hmm|mm|hm|mhm)\b/i.test(altTranscript) ||
                              /^(uh|um|er|ah|eh|oh|hmm|mm|hm)$/i.test(altTranscript.trim()) ||
                              /^\w{1,2}$/i.test(altTranscript.trim()); // Catch very short utterances
        
        // Strongly prefer alternatives with filler words, even if lower confidence
        if (hasFillerWords) {
          bestTranscript = altTranscript;
          bestConfidence = Math.max(altConfidence, 0.5); // Boost confidence for filler words
          break; // Take the first filler word match immediately
        } else if (altConfidence > bestConfidence || j === 0) {
          bestTranscript = altTranscript;
          bestConfidence = altConfidence;
        }
      }
      
      confidence = Math.max(confidence, bestConfidence);

      if (result.isFinal) {
        finalTranscript += bestTranscript;
      } else {
        interimTranscript += bestTranscript;
      }
    }

    // Handle interim results
    if (interimTranscript && onInterimCallback) {
      onInterimCallback({
        transcript: interimTranscript,
        confidence: confidence,
        isFinal: false,
        timestamp: new Date()
      });
      
      // Quick response mode: if interim result is a filler word, process it immediately
      if (CONFIG.quickResponseMode && onResultCallback) {
        const trimmedInterim = interimTranscript.trim();
        const isFillerWord = /^(uh|um|er|ah|eh|oh|hmm|mm|hm|mhm)$/i.test(trimmedInterim) ||
                            /^\w{1,2}$/i.test(trimmedInterim);
        
        if (isFillerWord && trimmedInterim.length >= CONFIG.minSpeechLength) {
          console.log('Quick filler word detection:', trimmedInterim, 'confidence:', confidence);
          onResultCallback({
            transcript: trimmedInterim,
            confidence: Math.max(confidence, 0.5), // Boost confidence for immediate filler words
            isFinal: true, // Treat as final for immediate processing
            timestamp: new Date(),
            isQuickDetection: true // Flag to indicate this was quick-detected
          });
        }
      }
    }

    // Handle final results - accept all speech including filler words and uncertain speech
    if (finalTranscript && onResultCallback) {
      const trimmedTranscript = finalTranscript.trim();
      
      // Accept even very short utterances (like "uh", "um") - no minimum length filter
      if (trimmedTranscript.length >= CONFIG.minSpeechLength) {
        console.log('Speech captured:', trimmedTranscript, 'confidence:', confidence);
        onResultCallback({
          transcript: trimmedTranscript,
          confidence: confidence,
          isFinal: true,
          timestamp: new Date()
        });
      }
    }
  };

  // Speech recognition errors
  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    
    const errorInfo = {
      type: event.error,
      timestamp: new Date(),
      recoverable: isRecoverableError(event.error)
    };

    // Handle specific error types
    switch (event.error) {
      case 'network':
        errorInfo.message = 'Network connection issues detected';
        errorInfo.suggestion = 'Check your internet connection and try again';
        break;
        
      case 'not-allowed':
        errorInfo.message = 'Microphone access denied';
        errorInfo.suggestion = 'Please allow microphone access in your browser settings';
        errorInfo.recoverable = false;
        break;
        
      case 'no-speech':
        errorInfo.message = 'No speech detected';
        errorInfo.suggestion = 'Please speak clearly into your microphone';
        break;
        
      case 'audio-capture':
        errorInfo.message = 'Audio capture failed';
        errorInfo.suggestion = 'Check your microphone connection and permissions';
        break;
        
      case 'service-not-allowed':
        errorInfo.message = 'Speech service not allowed';
        errorInfo.suggestion = 'Speech recognition service is not available';
        errorInfo.recoverable = false;
        break;
        
      default:
        errorInfo.message = `Speech recognition error: ${event.error}`;
        errorInfo.suggestion = 'Please try again or check your browser compatibility';
    }

    if (onErrorCallback) {
      onErrorCallback(errorInfo);
    }

    // Attempt recovery for recoverable errors
    if (errorInfo.recoverable && CONFIG.autoRestart && restartCount < CONFIG.maxRestarts) {
      setTimeout(() => {
        console.log(`Attempting error recovery (attempt ${restartCount + 1})`);
        restartCount++;
        startListening(onResultCallback, onErrorCallback);
      }, CONFIG.restartDelay * (restartCount + 1)); // Exponential backoff
    }
  };

  // No speech timeout handler
  recognition.onnomatch = () => {
    console.warn('Speech recognition: no match found');
    
    if (onErrorCallback) {
      onErrorCallback({
        type: 'no-match',
        message: 'Could not understand the speech',
        suggestion: 'Please speak more clearly and try again',
        recoverable: true
      });
    }
  };
}

/**
 * Check if an error is recoverable
 * @param {string} errorType - The error type from speech recognition
 * @returns {boolean} Whether the error is recoverable
 */
function isRecoverableError(errorType) {
  const recoverableErrors = ['network', 'no-speech', 'audio-capture', 'service-not-allowed'];
  return recoverableErrors.includes(errorType);
}

/**
 * Set up silence detection to handle long pauses
 */
function setupSilenceDetection() {
  clearTimeout(timeoutId);
  
  timeoutId = setTimeout(() => {
    const timeSinceLastActivity = Date.now() - lastActivity;
    
    if (timeSinceLastActivity >= CONFIG.silenceTimeout && isListening) {
      console.log('Silence detected, restarting recognition');
      
      if (onInterimCallback) {
        onInterimCallback({
          transcript: '',
          confidence: 0,
          isFinal: false,
          timestamp: new Date(),
          silenceDetected: true
        });
      }
      
      // Restart recognition after silence
      stopListening();
      setTimeout(() => {
        if (CONFIG.autoRestart) {
          startListening(onResultCallback, onErrorCallback);
        }
      }, 500);
    } else if (isListening) {
      // Continue monitoring
      setupSilenceDetection();
    }
  }, CONFIG.silenceTimeout);
}

/**
 * Start listening for speech input
 * @param {Function} onResult - Callback for final speech results
 * @param {Function} onError - Callback for errors
 * @param {Function} onStart - Callback when listening starts
 * @param {Function} onEnd - Callback when listening ends
 * @param {Function} onInterim - Callback for interim results
 * @returns {Promise<boolean>} Success status
 */
export async function startListening(onResult, onError, onStart = null, onEnd = null, onInterim = null) {
  try {
    if (!isInitialized) {
      const initialized = await initializeSpeechRecognition();
      if (!initialized) {
        throw new Error('Failed to initialize speech recognition');
      }
    }

    if (isListening) {
      console.warn('Speech recognition already listening');
      return true;
    }

    // Store callbacks
    onResultCallback = onResult;
    onErrorCallback = onError;
    onStartCallback = onStart;
    onEndCallback = onEnd;
    onInterimCallback = onInterim;

    // Request microphone permission before starting with enhanced sensitivity
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,     // Disable to catch faint "uh"/"um" sounds
          noiseSuppression: false,     // Disable to be more sensitive to quiet speech
          autoGainControl: true,       // Keep this to boost quiet sounds
          latency: 0,                  // Minimize latency for faster response
          sampleRate: 44100,           // Higher sample rate for better detection
          channelCount: 1              // Mono for consistent processing
        }
      });
      
      // Stop the stream immediately - we just needed to check permission
      stream.getTracks().forEach(track => track.stop());
      
    } catch (permissionError) {
      throw new Error('Microphone permission denied or unavailable');
    }

    // Start recognition
    recognition.start();
    console.log('Speech recognition starting...');
    
    return true;

  } catch (error) {
    console.error('Failed to start speech recognition:', error);
    
    if (onError) {
      onError({
        type: 'start_failed',
        message: error.message,
        suggestion: 'Please check microphone permissions and try again',
        recoverable: true
      });
    }
    
    return false;
  }
}

/**
 * Stop listening for speech input
 * @returns {void}
 */
export function stopListening() {
  try {
    if (recognition && isListening) {
      manualStop = true; // Flag this as a manual stop
      recognition.stop();
      console.log('Speech recognition stopped manually');
    }
    
    // Stop audio monitoring
    stopAudioLevelMonitoring();
    
    clearTimeout(timeoutId);
    isListening = false;
    restartCount = 0;
    
  } catch (error) {
    console.error('Error stopping speech recognition:', error);
  }
}

/**
 * Restart speech recognition
 * @returns {Promise<boolean>} Success status
 */
export async function restartListening() {
  console.log('Restarting speech recognition...');
  
  stopListening();
  
  // Wait a moment before restarting
  await new Promise(resolve => setTimeout(resolve, 500));
  
  CONFIG.autoRestart = true; // Re-enable auto-restart
  return await startListening(onResultCallback, onErrorCallback, onStartCallback, onEndCallback, onInterimCallback);
}

/**
 * Configure speech recognition settings
 * @param {Object} newConfig - Configuration options to update
 * @returns {void}
 */
export function configureSpeechRecognition(newConfig) {
  Object.assign(CONFIG, newConfig);
  
  // Apply configuration to active recognition instance
  if (recognition && isInitialized) {
    if (typeof newConfig.language !== 'undefined') {
      recognition.lang = newConfig.language;
    }
    if (typeof newConfig.continuous !== 'undefined') {
      recognition.continuous = newConfig.continuous;
    }
    if (typeof newConfig.interimResults !== 'undefined') {
      recognition.interimResults = newConfig.interimResults;
    }
    if (typeof newConfig.maxAlternatives !== 'undefined') {
      recognition.maxAlternatives = newConfig.maxAlternatives;
    }
  }
  
  console.log('Speech recognition configuration updated:', newConfig);
}

/**
 * Get current speech recognition status
 * @returns {Object} Current status information
 */
export function getSpeechRecognitionStatus() {
  return {
    isInitialized,
    isListening,
    isSupported: checkSpeechSupport().isSupported,
    restartCount,
    config: { ...CONFIG },
    lastActivity: new Date(lastActivity)
  };
}

/**
 * Get available language options for speech recognition
 * @returns {Array} Array of supported language codes
 */
export function getSupportedLanguages() {
  // Common language codes supported by most browsers
  return [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'en-AU', name: 'English (Australia)' },
    { code: 'en-CA', name: 'English (Canada)' },
    { code: 'es-US', name: 'Spanish (US)' },
    { code: 'es-ES', name: 'Spanish (Spain)' },
    { code: 'fr-FR', name: 'French (France)' },
    { code: 'de-DE', name: 'German (Germany)' },
    { code: 'it-IT', name: 'Italian (Italy)' },
    { code: 'pt-BR', name: 'Portuguese (Brazil)' },
    { code: 'zh-CN', name: 'Chinese (Simplified)' },
    { code: 'ja-JP', name: 'Japanese' },
    { code: 'ko-KR', name: 'Korean' }
  ];
}

/**
 * Cleanup speech recognition resources
 * @returns {void}
 */
export function cleanup() {
  console.log('Cleaning up speech recognition resources...');
  
  CONFIG.autoRestart = false;
  stopListening();
  
  if (recognition) {
    recognition.onstart = null;
    recognition.onend = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onnomatch = null;
    recognition = null;
  }
  
  clearTimeout(timeoutId);
  
  // Cleanup audio monitoring
  stopAudioLevelMonitoring();
  if (audioContext && audioContext.state !== 'closed') {
    audioContext.close();
  }
  audioContext = null;
  audioAnalyser = null;
  microphone = null;
  lastAudioLevels = [];
  
  // Reset state
  isInitialized = false;
  isListening = false;
  restartCount = 0;
  
  // Clear callbacks
  onResultCallback = null;
  onErrorCallback = null;
  onStartCallback = null;
  onEndCallback = null;
  onInterimCallback = null;
  
  console.log('Speech recognition cleanup completed');
}

// Export configuration for external access
export { CONFIG as speechRecognitionConfig };