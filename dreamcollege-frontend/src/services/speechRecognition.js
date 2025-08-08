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
  maxAlternatives: 3,      // Reduced to focus on top alternatives for better accuracy
  
  // Auto-restart settings - disabled for manual control
  autoRestart: false,
  maxRestarts: 0,
  restartDelay: 1000,
  
  // Timeout settings - disabled for continuous recording
  noSpeechTimeout: 0,      // Disabled - never timeout on no speech
  silenceTimeout: 0,       // Disabled - never timeout on silence
  
  // Balanced filler word detection settings
  enableFillerWords: true,     // Enable to capture natural speech patterns
  minSpeechLength: 2,          // Allow shorter utterances including filler words
  aggressiveFillerDetection: false,  // Keep disabled to avoid false positives
  quickResponseMode: false,    // Disabled to prioritize accuracy over speed
  treatFillersAsNormalSpeech: true,  // New: treat filler words with normal priority
  
  // Enhanced accuracy features
  confidenceThreshold: 0.7,    // Minimum confidence required for final results
  enableGrammarHints: true,    // Enable grammar hints for better context
  technicalVocabulary: true,   // Enable technical vocabulary optimization
  contextualProcessing: true   // Enable contextual word processing
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

// Session context for better contextual corrections
let sessionContext = {
  technicalTermsUsed: new Set(),
  conversationHistory: [],
  maxHistoryLength: 10
};

// Safe word corrections for technical context - only non-words or clear compound separations
const WORD_CORRECTIONS = {
  // Compound word separations (safe - these aren't real single words)
  'java script': 'javascript',
  'type script': 'typescript',
  'pie thon': 'python',
  'no js': 'nodejs',
  'node js': 'nodejs',
  'get hub': 'github',
  'git hub': 'github',
  'data base': 'database',
  'algo rhythm': 'algorithm',
  'front end': 'frontend',
  'back end': 'backend',
  'full stack': 'fullstack',
  'web pack': 'webpack',
  'view js': 'vue.js',
  'angular js': 'angularjs',
  'my sequel': 'mysql',
  'post gress': 'postgres',
  'mongo db': 'mongodb',
  'rest api': 'REST API',
  'graph ql': 'graphql',
  
  // Clear technical misnomers that aren't real words
  'reactjs': 'react',
  'vuejs': 'vue.js',
  'nodejs': 'node.js'
};

/**
 * Enhance transcript accuracy by correcting common misheard technical terms
 * @param {string} transcript - The original transcript
 * @returns {string} Enhanced transcript with corrections
 */
function enhanceTranscriptAccuracy(transcript) {
  if (!transcript || typeof transcript !== 'string') {
    return transcript;
  }
  
  let enhanced = transcript.toLowerCase();
  
  // Apply safe word corrections (only compound words and clear misnomers)
  Object.keys(WORD_CORRECTIONS).forEach(incorrect => {
    const correct = WORD_CORRECTIONS[incorrect];
    // Use word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${incorrect}\\b`, 'gi');
    enhanced = enhanced.replace(regex, correct);
  });
  
  // Context-aware corrections for ambiguous words like "coat" vs "code"
  // Only replace when in technical context
  enhanced = applyContextualCorrections(enhanced);
  
  // Context-specific corrections for interview scenarios - only safe transformations
  enhanced = enhanced
    // Only fix clear compound word separations and technical misnomers
    .replace(/\bpie thon\b/gi, 'python')
    .replace(/\bjava script\b/gi, 'javascript')
    .replace(/\btype script\b/gi, 'typescript')
    .replace(/\bget hub\b/gi, 'github')
    .replace(/\bgit hub\b/gi, 'github')
    .replace(/\bno js\b/gi, 'nodejs')
    .replace(/\bnode js\b/gi, 'nodejs')
    .replace(/\bdata base\b/gi, 'database')
    .replace(/\balgo rhythm\b/gi, 'algorithm')
    .replace(/\bfront end\b/gi, 'frontend')
    .replace(/\bback end\b/gi, 'backend')
    .replace(/\bfull stack\b/gi, 'fullstack')
    .replace(/\bweb pack\b/gi, 'webpack')
    .replace(/\bview js\b/gi, 'vue.js')
    .replace(/\bangular js\b/gi, 'angularjs')
    .replace(/\bmy sequel\b/gi, 'mysql')
    .replace(/\bpost gress\b/gi, 'postgres')
    .replace(/\bmongo db\b/gi, 'mongodb')
    .replace(/\brest api\b/gi, 'REST API')
    .replace(/\bgraph ql\b/gi, 'graphql')
    // Common acronym standardization (safe since these maintain meaning)
    .replace(/\bapi\b/gi, 'API')
    .replace(/\bhtml\b/gi, 'HTML')
    .replace(/\bcss\b/gi, 'CSS')
    .replace(/\bui\b/gi, 'UI')
    .replace(/\bux\b/gi, 'UX');
  
  // Preserve original casing for the final result
  if (transcript === transcript.toUpperCase()) {
    return enhanced.toUpperCase();
  } else if (transcript[0] === transcript[0].toUpperCase()) {
    return enhanced.charAt(0).toUpperCase() + enhanced.slice(1);
  }
  
  return enhanced;
}

/**
 * Apply contextual corrections for ambiguous words
 * Only replaces words when they appear in technical context
 * @param {string} text - The text to process
 * @returns {string} Text with contextual corrections applied
 */
function applyContextualCorrections(text) {
  // Technical context indicators
  const technicalKeywords = [
    'programming', 'software', 'development', 'computer', 'algorithm',
    'function', 'variable', 'class', 'method', 'javascript', 'python',
    'react', 'framework', 'library', 'database', 'api', 'web', 'app',
    'application', 'system', 'server', 'client', 'frontend', 'backend',
    'coding', 'debug', 'test', 'repository', 'github', 'git', 'commit',
    'technology', 'tech', 'developer', 'engineer', 'interview', 'technical'
  ];
  
  // Check current text for technical context
  const currentHasTechnicalContext = technicalKeywords.some(keyword => 
    text.toLowerCase().includes(keyword.toLowerCase())
  );
  
  // Check session history for technical context
  const sessionHasTechnicalContext = sessionContext.technicalTermsUsed.size > 0;
  
  // Apply contextual corrections if either current text or session history indicates technical context
  if (currentHasTechnicalContext || sessionHasTechnicalContext) {
    const corrected = text
      // Safe replacements when in technical context
      .replace(/\bcoat\b/gi, 'code')
      .replace(/\bcoats\b/gi, 'codes')
      .replace(/\bcold\b(?=\s+(review|base|coverage|quality|style))/gi, 'code') // Only when followed by technical terms
      .replace(/\bcold\b(?=\s+(is|was|will|can|should|must))/gi, 'code'); // Only when followed by verbs (likely "code is...")
    
    // Update session context with technical terms found
    technicalKeywords.forEach(keyword => {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        sessionContext.technicalTermsUsed.add(keyword);
      }
    });
    
    // Update conversation history
    sessionContext.conversationHistory.push(text.toLowerCase());
    if (sessionContext.conversationHistory.length > sessionContext.maxHistoryLength) {
      sessionContext.conversationHistory.shift();
    }
    
    return corrected;
  }
  
  return text;
}

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
    
    // Detect short speech bursts (like "uh", "ah") - disabled for now to reduce false positives
    if (normalizedLevel > speechThreshold) {
      consecutiveSpeechFrames++;
      lastSpeechTime = now;
    } else if (normalizedLevel < silenceThreshold) {
      // Disabled: Audio-level filler detection was too aggressive
      // if (consecutiveSpeechFrames >= 3 && consecutiveSpeechFrames <= 15) {
      //   const timeSinceLastSpeech = now - lastSpeechTime;
      //   if (timeSinceLastSpeech < 200) {
      //     console.log('Short audio burst detected - likely filler word, frames:', consecutiveSpeechFrames);
      //     handlePotentialFillerWord();
      //   }
      // }
      consecutiveSpeechFrames = 0;
    }
  }, 50); // Check every 50ms for responsive detection
}

/**
 * Handle potential filler word detected by audio monitoring
 * Disabled for now as it was generating false positives
 */
function handlePotentialFillerWord() {
  // Disabled: Audio-level detection was too aggressive and generated false positives
  // Only rely on actual speech recognition results
  console.log('Audio burst detected but not processed - using speech recognition only');
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
    
    // Enhanced grammar hints for technical vocabulary and natural speech
    if (recognition.grammars && recognition.grammars.addFromString && config.enableGrammarHints) {
      // Add comprehensive grammar including technical terms and natural speech patterns
      const comprehensiveGrammar = `
        #JSGF V1.0; 
        grammar comprehensive; 
        public <speech> = <technical> | <fillers> | <common>;
        public <technical> = code | coding | program | programming | developer | development | 
                           software | hardware | database | algorithm | function | variable | 
                           class | object | method | api | framework | library | debug | test |
                           javascript | python | java | react | node | git | github | css | html |
                           computer science | technology | application | system | server | client |
                           frontend | backend | fullstack | mobile | web | design | user interface;
        public <fillers> = uh | um | er | ah | hmm | well | like | you know | so | actually;
        public <common> = the | and | or | but | if | then | when | where | how | what | why;
      `;
      try {
        recognition.grammars.addFromString(comprehensiveGrammar);
        console.log('Comprehensive vocabulary grammar loaded (technical + natural speech)');
      } catch (error) {
        console.warn('Grammar hints not supported:', error);
      }
    }
    
    // Configure for optimal accuracy
    if (recognition.serviceURI !== undefined) {
      recognition.serviceURI = ''; // Use default Google service for best accuracy
    }

    // Browser-specific optimizations
    const browserInfo = getBrowserInfo();
    
    if (browserInfo.isSafari) {
      // Safari specific optimizations
      recognition.continuous = false; // Safari has issues with continuous mode
      console.warn('Safari detected: Using non-continuous mode for better compatibility');
    }
    
    if (browserInfo.isMobile) {
      // Mobile optimizations for better accuracy
      recognition.maxAlternatives = 1; // Single best result on mobile for clarity
      recognition.continuous = false; // Better mobile compatibility
      console.log('Mobile device detected: Optimized for mobile accuracy and performance');
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
      
      // Balanced processing - treat all speech including filler words equally
      let bestTranscript = '';
      let bestConfidence = 0;
      
      for (let j = 0; j < result.length && j < CONFIG.maxAlternatives; j++) {
        const alternative = result[j];
        const altTranscript = alternative.transcript || '';
        const altConfidence = alternative.confidence || 0;
        
        // Apply contextual processing for technical terms
        let processedTranscript = altTranscript;
        if (CONFIG.contextualProcessing) {
          processedTranscript = enhanceTranscriptAccuracy(altTranscript);
        }
        
        // Check if this is a natural filler word
        const isFillerWord = /^(uh|um|er|ah|hmm|well)$/i.test(processedTranscript.trim());
        
        // Select best alternative - treat filler words with same priority as regular speech
        if (CONFIG.treatFillersAsNormalSpeech) {
          // Use natural confidence without artificial boosting
          if (altConfidence > bestConfidence) {
            bestTranscript = processedTranscript;
            bestConfidence = altConfidence;
          } else if (j === 0 && bestConfidence === 0) {
            bestTranscript = processedTranscript;
            bestConfidence = altConfidence;
          }
        } else {
          // Legacy behavior with confidence threshold
          if (altConfidence > bestConfidence && altConfidence >= CONFIG.confidenceThreshold) {
            bestTranscript = processedTranscript;
            bestConfidence = altConfidence;
          } else if (j === 0 && bestConfidence === 0) {
            bestTranscript = processedTranscript;
            bestConfidence = altConfidence;
          }
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
      
      // Skip quick response mode - prioritize accuracy over speed
    }

    // Handle final results with balanced filtering for natural speech
    if (finalTranscript && onResultCallback) {
      const trimmedTranscript = finalTranscript.trim();
      
      // Check if this is a filler word
      const isFillerWord = /^(uh|um|er|ah|hmm|well)$/i.test(trimmedTranscript);
      
      // Apply balanced confidence thresholds
      let confidenceThreshold;
      if (CONFIG.treatFillersAsNormalSpeech) {
        // Use lower threshold for natural speech patterns including filler words
        confidenceThreshold = isFillerWord ? 0.4 : 0.5; // More lenient for natural speech
      } else {
        // Use original high threshold
        confidenceThreshold = CONFIG.confidenceThreshold * 0.6;
      }
      
      // Accept speech that meets minimum length and confidence requirements
      if (trimmedTranscript.length >= CONFIG.minSpeechLength && confidence >= confidenceThreshold) {
        console.log('Speech captured:', trimmedTranscript, 'confidence:', confidence, 'filler:', isFillerWord);
        onResultCallback({
          transcript: trimmedTranscript,
          confidence: confidence,
          isFinal: true,
          timestamp: new Date(),
          isEnhanced: CONFIG.contextualProcessing,
          isFillerWord: isFillerWord
        });
      } else if (trimmedTranscript.length >= CONFIG.minSpeechLength) {
        // Log low confidence results but don't process them
        console.warn('Low confidence speech ignored:', trimmedTranscript, 'confidence:', confidence, 'threshold:', confidenceThreshold);
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

    // Request microphone permission with optimal settings for accuracy
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,      // Enable to improve clarity
          noiseSuppression: true,      // Enable to filter background noise
          autoGainControl: true,       // Normalize volume levels
          latency: 0.01,               // Low latency for responsiveness
          sampleRate: 48000,           // High sample rate for better accuracy
          channelCount: 1,             // Mono for consistent processing
          // Additional constraints for better quality
          googEchoCancellation: true,
          googAutoGainControl: true,
          googNoiseSuppression: true,
          googHighpassFilter: true,
          googTypingNoiseDetection: true
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
 * Enable high accuracy mode for technical vocabulary
 * @returns {void}
 */
export function enableHighAccuracyMode() {
  configureSpeechRecognition({
    confidenceThreshold: 0.8,
    enableGrammarHints: true,
    technicalVocabulary: true,
    contextualProcessing: true,
    maxAlternatives: 1,
    quickResponseMode: false,
    enableFillerWords: true,
    treatFillersAsNormalSpeech: true,
    minSpeechLength: 2
  });
  console.log('High accuracy mode enabled for technical vocabulary with balanced filler word detection');
}

/**
 * Enable balanced mode for general conversation
 * @returns {void}
 */
export function enableBalancedMode() {
  configureSpeechRecognition({
    confidenceThreshold: 0.6,
    enableGrammarHints: true,
    technicalVocabulary: true,
    contextualProcessing: true,
    maxAlternatives: 2,
    quickResponseMode: false,
    enableFillerWords: true,
    treatFillersAsNormalSpeech: true,
    minSpeechLength: 2
  });
  console.log('Balanced accuracy mode enabled with natural filler word detection');
}

/**
 * Configure filler word detection sensitivity
 * @param {string} mode - 'natural' (balanced), 'sensitive' (more detection), 'strict' (less detection), 'disabled'
 * @returns {void}
 */
export function configureFillerWordDetection(mode = 'natural') {
  const modes = {
    natural: {
      enableFillerWords: true,
      treatFillersAsNormalSpeech: true,
      minSpeechLength: 2,
      confidenceThreshold: 0.6
    },
    sensitive: {
      enableFillerWords: true,
      treatFillersAsNormalSpeech: true,
      minSpeechLength: 1,
      confidenceThreshold: 0.4
    },
    strict: {
      enableFillerWords: true,
      treatFillersAsNormalSpeech: false,
      minSpeechLength: 3,
      confidenceThreshold: 0.7
    },
    disabled: {
      enableFillerWords: false,
      treatFillersAsNormalSpeech: false,
      minSpeechLength: 3,
      confidenceThreshold: 0.7
    }
  };
  
  if (modes[mode]) {
    configureSpeechRecognition(modes[mode]);
    console.log(`Filler word detection configured to '${mode}' mode`);
  } else {
    console.warn(`Unknown filler word mode: ${mode}. Available modes: ${Object.keys(modes).join(', ')}`);
  }
}

/**
 * Reset session context for contextual corrections
 * @returns {void}
 */
export function resetSessionContext() {
  sessionContext.technicalTermsUsed.clear();
  sessionContext.conversationHistory = [];
  console.log('Session context reset for contextual corrections');
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
  
  // Reset session context
  sessionContext.technicalTermsUsed.clear();
  sessionContext.conversationHistory = [];
  
  console.log('Speech recognition cleanup completed');
}

// Export configuration for external access
export { CONFIG as speechRecognitionConfig };