/**
 * Text-to-Speech Service
 * 
 * Handles text-to-speech functionality for AI responses with comprehensive browser compatibility.
 * Provides natural-sounding voice synthesis with queue management and user customization options.
 * 
 * Features:
 * - Cross-browser Speech Synthesis API support
 * - Voice selection with intelligent fallbacks
 * - Speech rate, pitch, and volume configuration
 * - Message queue management for sequential playback
 * - Interrupt and resume functionality
 * - Natural voice prioritization
 * - Mobile device optimizations
 * - Accessibility compliance
 * 
 * Browser Support:
 * - Chrome: Full support with extensive voice options
 * - Edge: Full support with Windows voices
 * - Safari: Full support with system voices
 * - Firefox: Basic support with limited voices
 * - Mobile: iOS and Android native voice support
 * 
 * Voice Selection Strategy:
 * - Prioritize natural-sounding English voices
 * - Fallback to system default voices
 * - Gender preference options
 * - Regional accent selection
 * 
 * Related Files:
 * - src/services/speechRecognition.js - Companion speech recognition service
 * - src/components/ChatBox.jsx - Integration point for AI responses
 * - src/components/SettingsPanel.jsx - Voice configuration UI
 * - src/components/SpeechFeedback.jsx - Visual feedback component
 * 
 * Task: Voice Mode Feature Implementation - Step 3
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

// Speech synthesis instance and state
let synthesis = null;
let isInitialized = false;
let availableVoices = [];
let selectedVoice = null;
let speechQueue = [];
let currentUtterance = null;
let isPaused = false;
let isSpeaking = false;

// Configuration with optimal defaults
const CONFIG = {
  // Voice preferences
  preferredLanguage: 'en-US',
  preferredGender: 'female', // 'male', 'female', or 'any'
  preferredNames: ['Samantha', 'Alex', 'Daniel', 'Karen', 'Moira', 'Tessa'],
  
  // Speech parameters
  rate: 1.0,        // 0.1 to 10 (normal speed)
  pitch: 1.0,       // 0 to 2 (normal pitch)
  volume: 0.8,      // 0 to 1 (80% volume)
  
  // Queue management
  maxQueueSize: 5,
  autoPlay: true,
  interruptOnNew: false,
  
  // Text processing
  maxTextLength: 1000,
  pauseBetweenSentences: 300, // milliseconds
  
  // Accessibility
  announceStart: false,
  announceEnd: false,
  
  // Performance
  preloadVoices: true,
  cacheVoices: true
};

// Event callbacks
let onStartCallback = null;
let onEndCallback = null;
let onErrorCallback = null;
let onPauseCallback = null;
let onResumeCallback = null;
let onQueueChangeCallback = null;

/**
 * Check if text-to-speech is supported in current browser
 * @returns {Object} Support information with capabilities
 */
export function checkTextToSpeechSupport() {
  const support = {
    isSupported: false,
    hasSynthesis: false,
    hasVoices: false,
    voiceCount: 0,
    error: null,
    browserInfo: getBrowserInfo()
  };

  try {
    // Check for Speech Synthesis API
    if (typeof window.speechSynthesis !== 'undefined') {
      support.hasSynthesis = true;
      support.isSupported = true;
      
      // Check for voices (may need to wait for voices to load)
      const voices = window.speechSynthesis.getVoices();
      support.voiceCount = voices.length;
      support.hasVoices = voices.length > 0;
      
    } else {
      support.error = 'Speech synthesis API not available in this browser';
    }

  } catch (error) {
    support.error = `Text-to-speech check failed: ${error.message}`;
  }

  return support;
}

/**
 * Get browser information for optimization
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
    isIOS: /iPad|iPhone|iPod/.test(ua),
    isAndroid: /Android/.test(ua),
    userAgent: ua
  };
}

/**
 * Initialize text-to-speech with voice loading and configuration
 * @param {Object} options - Configuration options
 * @returns {Promise<boolean>} Success status
 */
export async function initializeTextToSpeech(options = {}) {
  try {
    const support = checkTextToSpeechSupport();
    
    if (!support.isSupported) {
      throw new Error(support.error || 'Text-to-speech not supported');
    }

    // Get synthesis instance
    synthesis = window.speechSynthesis;
    
    if (!synthesis) {
      throw new Error('Speech synthesis not available');
    }

    // Apply configuration
    Object.assign(CONFIG, options);

    // Load available voices
    await loadAvailableVoices();
    
    // Select optimal voice
    selectOptimalVoice();
    
    // Set up synthesis event handlers
    setupSynthesisEventHandlers();

    isInitialized = true;
    console.log('Text-to-speech initialized successfully', {
      voiceCount: availableVoices.length,
      selectedVoice: selectedVoice?.name || 'default',
      config: CONFIG
    });

    return true;

  } catch (error) {
    console.error('Failed to initialize text-to-speech:', error);
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
 * Load available voices from the system
 * @returns {Promise<Array>} Array of available voices
 */
function loadAvailableVoices() {
  return new Promise((resolve) => {
    availableVoices = synthesis.getVoices();
    
    if (availableVoices.length > 0) {
      console.log(`Loaded ${availableVoices.length} voices immediately`);
      resolve(availableVoices);
      return;
    }

    // Some browsers load voices asynchronously
    let attempts = 0;
    const maxAttempts = 10;
    const interval = 100;

    const checkVoices = () => {
      availableVoices = synthesis.getVoices();
      attempts++;

      if (availableVoices.length > 0) {
        console.log(`Loaded ${availableVoices.length} voices after ${attempts} attempts`);
        resolve(availableVoices);
      } else if (attempts < maxAttempts) {
        setTimeout(checkVoices, interval);
      } else {
        console.warn('No voices loaded after maximum attempts');
        resolve([]);
      }
    };

    // Listen for voices changed event
    if ('onvoiceschanged' in synthesis) {
      synthesis.onvoiceschanged = () => {
        availableVoices = synthesis.getVoices();
        if (availableVoices.length > 0) {
          console.log(`Loaded ${availableVoices.length} voices via event`);
          resolve(availableVoices);
        }
      };
    }

    // Start checking
    setTimeout(checkVoices, interval);
  });
}

/**
 * Select the optimal voice based on preferences
 * @returns {Object|null} Selected voice or null if none available
 */
function selectOptimalVoice() {
  if (availableVoices.length === 0) {
    console.warn('No voices available for selection');
    return null;
  }

  const browserInfo = getBrowserInfo();
  
  // Filter voices by language
  let languageVoices = availableVoices.filter(voice => 
    voice.lang.toLowerCase().startsWith(CONFIG.preferredLanguage.toLowerCase().substring(0, 2))
  );

  if (languageVoices.length === 0) {
    console.warn(`No voices found for language ${CONFIG.preferredLanguage}, using all voices`);
    languageVoices = availableVoices;
  }

  // Score voices based on preferences
  let scoredVoices = languageVoices.map(voice => {
    let score = 0;
    const name = voice.name.toLowerCase();
    const isLocal = voice.localService;
    
    // Prefer local voices for better performance
    if (isLocal) score += 10;
    
    // Prefer specific voice names
    CONFIG.preferredNames.forEach(preferredName => {
      if (name.includes(preferredName.toLowerCase())) {
        score += 15;
      }
    });
    
    // Gender preference
    if (CONFIG.preferredGender !== 'any') {
      const isFemale = /female|woman|girl|samantha|karen|moira|tessa|zira|hazel|serena/i.test(name);
      const isMale = /male|man|boy|alex|daniel|david|mark|james|ryan/i.test(name);
      
      if (CONFIG.preferredGender === 'female' && isFemale) score += 8;
      if (CONFIG.preferredGender === 'male' && isMale) score += 8;
    }
    
    // Browser-specific preferences
    if (browserInfo.isChrome) {
      if (name.includes('google')) score += 5;
    } else if (browserInfo.isSafari || browserInfo.isIOS) {
      if (name.includes('enhanced') || name.includes('premium')) score += 5;
    } else if (browserInfo.isEdge) {
      if (name.includes('microsoft')) score += 5;
    }
    
    // Quality indicators
    if (name.includes('enhanced') || name.includes('premium') || name.includes('neural')) {
      score += 7;
    }
    
    // Language specificity
    if (voice.lang === CONFIG.preferredLanguage) score += 5;
    
    return { voice, score };
  });

  // Sort by score and select the best
  scoredVoices.sort((a, b) => b.score - a.score);
  
  selectedVoice = scoredVoices[0]?.voice || availableVoices[0];
  
  console.log('Voice selection completed:', {
    selectedVoice: selectedVoice.name,
    language: selectedVoice.lang,
    isLocal: selectedVoice.localService,
    topScores: scoredVoices.slice(0, 3).map(v => ({
      name: v.voice.name,
      score: v.score
    }))
  });

  return selectedVoice;
}

/**
 * Set up event handlers for speech synthesis
 */
function setupSynthesisEventHandlers() {
  // Note: Event handlers are set per utterance, not globally
  // This function sets up the framework for utterance event handling
  console.log('Speech synthesis event framework ready');
}

/**
 * Speak text with customizable options
 * @param {string} text - Text to speak
 * @param {Object} options - Speech options
 * @returns {Promise<void>} Promise that resolves when speech completes
 */
export async function speakText(text, options = {}) {
  try {
    if (!isInitialized) {
      const initialized = await initializeTextToSpeech();
      if (!initialized) {
        throw new Error('Failed to initialize text-to-speech');
      }
    }

    if (!text || typeof text !== 'string') {
      throw new Error('Invalid text provided for speech synthesis');
    }

    // Process and clean text
    const cleanText = processTextForSpeech(text);
    
    if (cleanText.length === 0) {
      console.warn('No speakable text after processing');
      return;
    }

    // Create speech options
    const speechOptions = {
      voice: options.voice || selectedVoice,
      rate: options.rate || CONFIG.rate,
      pitch: options.pitch || CONFIG.pitch,
      volume: options.volume || CONFIG.volume,
      interrupt: options.interrupt || CONFIG.interruptOnNew,
      priority: options.priority || 'normal' // 'high', 'normal', 'low'
    };

    // Handle interruption
    if (speechOptions.interrupt && isSpeaking) {
      stopSpeaking();
    }

    // Create utterance
    const utterance = createUtterance(cleanText, speechOptions);

    // Add to queue or play immediately
    if (speechOptions.priority === 'high' || !CONFIG.autoPlay) {
      await playUtterance(utterance);
    } else {
      addToQueue(utterance);
      processQueue();
    }

    console.log('Speech request processed:', {
      textLength: cleanText.length,
      queueSize: speechQueue.length,
      speaking: isSpeaking
    });

  } catch (error) {
    console.error('Failed to speak text:', error);
    
    if (onErrorCallback) {
      onErrorCallback({
        type: 'speech_failed',
        error: error.message,
        text: text.substring(0, 100),
        recoverable: true
      });
    }
    
    throw error;
  }
}

/**
 * Process text for optimal speech synthesis
 * @param {string} text - Raw text to process
 * @returns {string} Processed text
 */
function processTextForSpeech(text) {
  let processed = text.trim();

  // Remove markdown formatting
  processed = processed.replace(/\*\*(.*?)\*\*/g, '$1'); // Bold
  processed = processed.replace(/\*(.*?)\*/g, '$1'); // Italic
  processed = processed.replace(/`(.*?)`/g, '$1'); // Code
  processed = processed.replace(/\[(.*?)\]\(.*?\)/g, '$1'); // Links
  
  // Replace special characters with speakable equivalents
  processed = processed.replace(/&amp;/g, 'and');
  processed = processed.replace(/&lt;/g, 'less than');
  processed = processed.replace(/&gt;/g, 'greater than');
  processed = processed.replace(/&nbsp;/g, ' ');
  
  // Improve pronunciation of common terms
  processed = processed.replace(/\bAPI\b/g, 'A P I');
  processed = processed.replace(/\bURL\b/g, 'U R L');
  processed = processed.replace(/\bHTML\b/g, 'H T M L');
  processed = processed.replace(/\bCSS\b/g, 'C S S');
  processed = processed.replace(/\bJS\b/g, 'JavaScript');
  
  // Add natural pauses
  processed = processed.replace(/\. /g, '. <break time="300ms"/> ');
  processed = processed.replace(/\? /g, '? <break time="400ms"/> ');
  processed = processed.replace(/! /g, '! <break time="400ms"/> ');
  
  // Limit length
  if (processed.length > CONFIG.maxTextLength) {
    processed = processed.substring(0, CONFIG.maxTextLength - 3) + '...';
    console.warn(`Text truncated to ${CONFIG.maxTextLength} characters`);
  }

  return processed;
}

/**
 * Create speech utterance with event handlers
 * @param {string} text - Text to speak
 * @param {Object} options - Speech options
 * @returns {SpeechSynthesisUtterance} Configured utterance
 */
function createUtterance(text, options) {
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Apply voice and parameters
  if (options.voice) utterance.voice = options.voice;
  utterance.rate = Math.max(0.1, Math.min(10, options.rate));
  utterance.pitch = Math.max(0, Math.min(2, options.pitch));
  utterance.volume = Math.max(0, Math.min(1, options.volume));
  
  // Set up event handlers
  utterance.onstart = () => {
    isSpeaking = true;
    currentUtterance = utterance;
    
    console.log('Speech started:', text.substring(0, 50) + '...');
    
    if (onStartCallback) {
      onStartCallback({
        text: text,
        voice: utterance.voice?.name || 'default',
        duration: estimateSpeechDuration(text, options.rate)
      });
    }
  };

  utterance.onend = () => {
    isSpeaking = false;
    currentUtterance = null;
    
    console.log('Speech ended');
    
    if (onEndCallback) {
      onEndCallback({
        text: text,
        completed: true
      });
    }
    
    // Process next item in queue
    setTimeout(() => processQueue(), CONFIG.pauseBetweenSentences);
  };

  utterance.onerror = (event) => {
    console.error('Speech synthesis error:', event.error);
    
    isSpeaking = false;
    currentUtterance = null;
    
    if (onErrorCallback) {
      onErrorCallback({
        type: 'synthesis_error',
        error: event.error,
        text: text,
        recoverable: true
      });
    }
    
    // Continue with queue processing
    processQueue();
  };

  utterance.onpause = () => {
    isPaused = true;
    
    if (onPauseCallback) {
      onPauseCallback({ text: text });
    }
  };

  utterance.onresume = () => {
    isPaused = false;
    
    if (onResumeCallback) {
      onResumeCallback({ text: text });
    }
  };

  return utterance;
}

/**
 * Estimate speech duration in milliseconds
 * @param {string} text - Text to analyze
 * @param {number} rate - Speech rate
 * @returns {number} Estimated duration in milliseconds
 */
function estimateSpeechDuration(text, rate = 1.0) {
  // Average speech rate is about 150-160 words per minute
  const wordsPerMinute = 155 * rate;
  const wordCount = text.split(/\s+/).length;
  const minutes = wordCount / wordsPerMinute;
  return Math.round(minutes * 60 * 1000);
}

/**
 * Add utterance to speech queue
 * @param {SpeechSynthesisUtterance} utterance - Utterance to queue
 */
function addToQueue(utterance) {
  if (speechQueue.length >= CONFIG.maxQueueSize) {
    console.warn('Speech queue full, removing oldest item');
    speechQueue.shift();
  }
  
  speechQueue.push(utterance);
  
  if (onQueueChangeCallback) {
    onQueueChangeCallback({
      queueSize: speechQueue.length,
      action: 'added'
    });
  }
}

/**
 * Process speech queue
 */
function processQueue() {
  if (isSpeaking || speechQueue.length === 0) {
    return;
  }
  
  const nextUtterance = speechQueue.shift();
  
  if (onQueueChangeCallback) {
    onQueueChangeCallback({
      queueSize: speechQueue.length,
      action: 'processing'
    });
  }
  
  playUtterance(nextUtterance);
}

/**
 * Play utterance immediately
 * @param {SpeechSynthesisUtterance} utterance - Utterance to play
 * @returns {Promise<void>} Promise that resolves when speech completes
 */
function playUtterance(utterance) {
  return new Promise((resolve, reject) => {
    const originalOnEnd = utterance.onend;
    const originalOnError = utterance.onerror;
    
    utterance.onend = (event) => {
      if (originalOnEnd) originalOnEnd(event);
      resolve();
    };
    
    utterance.onerror = (event) => {
      if (originalOnError) originalOnError(event);
      reject(new Error(event.error));
    };
    
    try {
      synthesis.speak(utterance);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Stop current speech and clear queue
 */
export function stopSpeaking() {
  try {
    if (synthesis) {
      synthesis.cancel();
    }
    
    // Clear state
    isSpeaking = false;
    isPaused = false;
    currentUtterance = null;
    speechQueue.length = 0;
    
    console.log('Speech stopped and queue cleared');
    
    if (onQueueChangeCallback) {
      onQueueChangeCallback({
        queueSize: 0,
        action: 'cleared'
      });
    }
    
  } catch (error) {
    console.error('Error stopping speech:', error);
  }
}

/**
 * Pause current speech
 */
export function pauseSpeaking() {
  try {
    if (synthesis && isSpeaking) {
      synthesis.pause();
      console.log('Speech paused');
    }
  } catch (error) {
    console.error('Error pausing speech:', error);
  }
}

/**
 * Resume paused speech
 */
export function resumeSpeaking() {
  try {
    if (synthesis && isPaused) {
      synthesis.resume();
      console.log('Speech resumed');
    }
  } catch (error) {
    console.error('Error resuming speech:', error);
  }
}

/**
 * Get available voices
 * @returns {Array} Array of available voice objects
 */
export function getAvailableVoices() {
  return availableVoices.map(voice => ({
    name: voice.name,
    lang: voice.lang,
    gender: detectVoiceGender(voice.name),
    isLocal: voice.localService,
    isDefault: voice.default,
    quality: estimateVoiceQuality(voice)
  }));
}

/**
 * Detect voice gender from name
 * @param {string} voiceName - Name of the voice
 * @returns {string} 'male', 'female', or 'unknown'
 */
function detectVoiceGender(voiceName) {
  const name = voiceName.toLowerCase();
  
  const femaleIndicators = ['female', 'woman', 'girl', 'samantha', 'karen', 'moira', 'tessa', 'zira', 'hazel', 'serena', 'susan', 'allison', 'ava', 'melina'];
  const maleIndicators = ['male', 'man', 'boy', 'alex', 'daniel', 'david', 'mark', 'james', 'ryan', 'bruce', 'fred', 'junior', 'ralph', 'albert'];
  
  if (femaleIndicators.some(indicator => name.includes(indicator))) {
    return 'female';
  }
  
  if (maleIndicators.some(indicator => name.includes(indicator))) {
    return 'male';
  }
  
  return 'unknown';
}

/**
 * Estimate voice quality
 * @param {SpeechSynthesisVoice} voice - Voice object
 * @returns {string} 'high', 'medium', or 'basic'
 */
function estimateVoiceQuality(voice) {
  const name = voice.name.toLowerCase();
  
  if (name.includes('enhanced') || name.includes('premium') || name.includes('neural') || name.includes('natural')) {
    return 'high';
  }
  
  if (voice.localService || name.includes('compact')) {
    return 'medium';
  }
  
  return 'basic';
}

/**
 * Set selected voice
 * @param {string|Object} voice - Voice name or voice object
 * @returns {boolean} Success status
 */
export function setVoice(voice) {
  try {
    if (typeof voice === 'string') {
      selectedVoice = availableVoices.find(v => v.name === voice);
    } else if (voice && voice.name) {
      selectedVoice = voice;
    }
    
    if (selectedVoice) {
      console.log('Voice changed to:', selectedVoice.name);
      return true;
    } else {
      console.warn('Voice not found, keeping current selection');
      return false;
    }
    
  } catch (error) {
    console.error('Error setting voice:', error);
    return false;
  }
}

/**
 * Configure text-to-speech settings
 * @param {Object} newConfig - Configuration options to update
 */
export function configureTextToSpeech(newConfig) {
  Object.assign(CONFIG, newConfig);
  
  // Re-select voice if preferences changed
  if (newConfig.preferredLanguage || newConfig.preferredGender || newConfig.preferredNames) {
    selectOptimalVoice();
  }
  
  console.log('Text-to-speech configuration updated:', newConfig);
}

/**
 * Get current text-to-speech status
 * @returns {Object} Current status information
 */
export function getTextToSpeechStatus() {
  return {
    isInitialized,
    isSpeaking,
    isPaused,
    queueSize: speechQueue.length,
    selectedVoice: selectedVoice?.name || null,
    availableVoiceCount: availableVoices.length,
    config: { ...CONFIG }
  };
}

/**
 * Set event callbacks
 * @param {Object} callbacks - Event callback functions
 */
export function setTextToSpeechCallbacks(callbacks) {
  onStartCallback = callbacks.onStart || null;
  onEndCallback = callbacks.onEnd || null;
  onErrorCallback = callbacks.onError || null;
  onPauseCallback = callbacks.onPause || null;
  onResumeCallback = callbacks.onResume || null;
  onQueueChangeCallback = callbacks.onQueueChange || null;
  
  console.log('Text-to-speech callbacks configured');
}

/**
 * Test speech with sample text
 * @param {string} testText - Text to test with
 * @returns {Promise<void>} Promise that resolves when test completes
 */
export async function testSpeech(testText = "Hello! This is a test of the text-to-speech system.") {
  try {
    console.log('Testing text-to-speech...');
    await speakText(testText, { interrupt: true, priority: 'high' });
    console.log('Text-to-speech test completed successfully');
  } catch (error) {
    console.error('Text-to-speech test failed:', error);
    throw error;
  }
}

/**
 * Cleanup text-to-speech resources
 */
export function cleanup() {
  console.log('Cleaning up text-to-speech resources...');
  
  stopSpeaking();
  
  // Clear state
  isInitialized = false;
  availableVoices = [];
  selectedVoice = null;
  currentUtterance = null;
  
  // Clear callbacks
  onStartCallback = null;
  onEndCallback = null;
  onErrorCallback = null;
  onPauseCallback = null;
  onResumeCallback = null;
  onQueueChangeCallback = null;
  
  console.log('Text-to-speech cleanup completed');
}

// Export configuration for external access
export { CONFIG as textToSpeechConfig };