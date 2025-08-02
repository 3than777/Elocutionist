/**
 * Test Setup Configuration for Voice Mode Testing
 * 
 * Sets up testing environment with Web Speech API mocking, DOM utilities,
 * and global test helpers for comprehensive voice feature testing.
 * 
 * Features:
 * - Web Speech API mocking with realistic behavior simulation
 * - Browser compatibility testing helpers
 * - HTTPS context simulation
 * - Microphone permission mocking
 * - Error scenario simulation
 * 
 * Task: Voice Mode Feature Implementation - Step 17
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import '@testing-library/jest-dom';

// Global test configuration
const TEST_CONFIG = {
  // Default browser simulation
  defaultBrowser: 'chrome',
  
  // Speech recognition configuration
  speechRecognition: {
    continuous: true,
    interimResults: true,
    lang: 'en-US',
    maxAlternatives: 1
  },
  
  // Speech synthesis configuration
  speechSynthesis: {
    voices: [
      { name: 'Google US English', lang: 'en-US', gender: 'female', default: true },
      { name: 'Microsoft Zira', lang: 'en-US', gender: 'female', default: false },
      { name: 'Alex', lang: 'en-US', gender: 'male', default: false }
    ],
    rate: 1.0,
    pitch: 1.0,
    volume: 0.8
  },
  
  // Permission states
  permissions: {
    microphone: 'granted' // 'granted', 'denied', 'prompt'
  },
  
  // HTTPS context
  isSecureContext: true
};

/**
 * Mock Web Speech API - SpeechRecognition
 */
class MockSpeechRecognition {
  constructor() {
    this.continuous = TEST_CONFIG.speechRecognition.continuous;
    this.interimResults = TEST_CONFIG.speechRecognition.interimResults;
    this.lang = TEST_CONFIG.speechRecognition.lang;
    this.maxAlternatives = TEST_CONFIG.speechRecognition.maxAlternatives;
    
    this.onstart = null;
    this.onend = null;
    this.onresult = null;
    this.onerror = null;
    this.onnomatch = null;
    this.onspeechstart = null;
    this.onspeechend = null;
    this.onaudiostart = null;
    this.onaudioend = null;
    this.onsoundstart = null;
    this.onsoundend = null;
    
    this._isListening = false;
    this._timeouts = [];
  }
  
  start() {
    if (this._isListening) {
      throw new Error('Recognition already started');
    }
    
    this._isListening = true;
    
    // Simulate async start
    setTimeout(() => {
      if (this.onstart) this.onstart();
      if (this.onaudiostart) this.onaudiostart();
      if (this.onsoundstart) this.onsoundstart();
      if (this.onspeechstart) this.onspeechstart();
    }, 50);
    
    // Simulate result after delay
    const resultTimeout = setTimeout(() => {
      this._simulateResult('Hello world', true);
    }, 1000);
    this._timeouts.push(resultTimeout);
  }
  
  stop() {
    this._isListening = false;
    this._clearTimeouts();
    
    setTimeout(() => {
      if (this.onspeechend) this.onspeechend();
      if (this.onsoundend) this.onsoundend();
      if (this.onaudioend) this.onaudioend();
      if (this.onend) this.onend();
    }, 50);
  }
  
  abort() {
    this._isListening = false;
    this._clearTimeouts();
    
    setTimeout(() => {
      if (this.onend) this.onend();
    }, 50);
  }
  
  _simulateResult(transcript, isFinal = false, confidence = 0.9) {
    if (!this._isListening || !this.onresult) return;
    
    const event = {
      results: [{
        0: { transcript, confidence },
        isFinal,
        length: 1
      }],
      resultIndex: 0
    };
    
    this.onresult(event);
  }
  
  _simulateError(error = 'network') {
    if (!this._isListening || !this.onerror) return;
    
    const event = { error };
    this.onerror(event);
  }
  
  _clearTimeouts() {
    this._timeouts.forEach(clearTimeout);
    this._timeouts = [];
  }
}

/**
 * Mock Speech Synthesis API
 */
class MockSpeechSynthesis {
  constructor() {
    this.speaking = false;
    this.pending = false;
    this.paused = false;
    this.onvoiceschanged = null;
    this._voices = TEST_CONFIG.speechSynthesis.voices.map(voice => ({
      ...voice,
      voiceURI: voice.name.toLowerCase().replace(/\s+/g, '-'),
      localService: true
    }));
    this._queue = [];
  }
  
  getVoices() {
    return this._voices;
  }
  
  speak(utterance) {
    if (!(utterance instanceof MockSpeechSynthesisUtterance)) {
      throw new Error('Utterance must be a SpeechSynthesisUtterance');
    }
    
    this._queue.push(utterance);
    this.pending = true;
    
    // Simulate async speaking
    setTimeout(() => {
      this._processQueue();
    }, 50);
  }
  
  cancel() {
    this._queue = [];
    this.speaking = false;
    this.pending = false;
    this.paused = false;
  }
  
  pause() {
    if (this.speaking) {
      this.paused = true;
    }
  }
  
  resume() {
    if (this.paused) {
      this.paused = false;
    }
  }
  
  _processQueue() {
    if (this._queue.length === 0) {
      this.pending = false;
      return;
    }
    
    const utterance = this._queue.shift();
    this.speaking = true;
    this.pending = this._queue.length > 0;
    
    // Simulate speaking events
    if (utterance.onstart) utterance.onstart();
    
    // Simulate speech duration (roughly 150 words per minute)
    const words = utterance.text.split(' ').length;
    const duration = (words / 150) * 60 * 1000; // milliseconds
    
    setTimeout(() => {
      this.speaking = false;
      if (utterance.onend) utterance.onend();
      
      // Process next in queue
      if (this._queue.length > 0) {
        this._processQueue();
      }
    }, Math.min(duration, 5000)); // Cap at 5 seconds for tests
  }
}

/**
 * Mock SpeechSynthesisUtterance
 */
class MockSpeechSynthesisUtterance {
  constructor(text = '') {
    this.text = text;
    this.lang = 'en-US';
    this.voice = null;
    this.volume = 1;
    this.rate = 1;
    this.pitch = 1;
    
    this.onstart = null;
    this.onend = null;
    this.onerror = null;
    this.onpause = null;
    this.onresume = null;
    this.onmark = null;
    this.onboundary = null;
  }
}

/**
 * Mock MediaDevices API for microphone permissions
 */
const mockMediaDevices = {
  getUserMedia: jest.fn(() => {
    const permission = TEST_CONFIG.permissions.microphone;
    
    if (permission === 'granted') {
      return Promise.resolve({
        getTracks: () => [{ stop: jest.fn() }]
      });
    } else if (permission === 'denied') {
      return Promise.reject(new Error('Permission denied'));
    } else {
      // Simulate permission prompt
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          // Default to granted for tests
          resolve({
            getTracks: () => [{ stop: jest.fn() }]
          });
        }, 100);
      });
    }
  }),
  
  enumerateDevices: jest.fn(() => Promise.resolve([
    { deviceId: 'default', kind: 'audioinput', label: 'Default microphone' }
  ]))
};

/**
 * Mock Navigator Permissions API
 */
const mockPermissions = {
  query: jest.fn(({ name }) => {
    const state = name === 'microphone' ? TEST_CONFIG.permissions.microphone : 'granted';
    return Promise.resolve({ state });
  })
};

/**
 * Setup global mocks
 */
beforeAll(() => {
  // Mock Web Speech API
  global.SpeechRecognition = MockSpeechRecognition;
  global.webkitSpeechRecognition = MockSpeechRecognition;
  global.speechSynthesis = new MockSpeechSynthesis();
  global.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
  
  // Mock MediaDevices API
  Object.defineProperty(navigator, 'mediaDevices', {
    writable: true,
    value: mockMediaDevices
  });
  
  // Mock Permissions API
  Object.defineProperty(navigator, 'permissions', {
    writable: true,
    value: mockPermissions
  });
  
  // Mock secure context
  Object.defineProperty(window, 'isSecureContext', {
    writable: true,
    value: TEST_CONFIG.isSecureContext
  });
  
  // Mock location for HTTPS testing
  Object.defineProperty(window, 'location', {
    writable: true,
    value: {
      hostname: 'localhost',
      protocol: 'https:',
      href: 'https://localhost:3000'
    }
  });
  
  // Suppress console methods to reduce test noise
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'debug').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
});

/**
 * Test utilities for voice testing
 */
global.voiceTestUtils = {
  // Update test configuration
  setTestConfig: (config) => {
    Object.assign(TEST_CONFIG, config);
  },
  
  // Simulate browser capabilities
  simulateBrowser: (browser) => {
    const configs = {
      chrome: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        speechRecognition: true,
        webkitSpeechRecognition: true,
        speechSynthesis: true,
        voices: TEST_CONFIG.speechSynthesis.voices
      },
      safari: {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
        speechRecognition: false,
        webkitSpeechRecognition: true,
        speechSynthesis: true,
        voices: TEST_CONFIG.speechSynthesis.voices.slice(0, 2)
      },
      firefox: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        speechRecognition: false,
        webkitSpeechRecognition: false,
        speechSynthesis: true,
        voices: TEST_CONFIG.speechSynthesis.voices.slice(0, 1)
      }
    };
    
    const config = configs[browser];
    if (config) {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: config.userAgent
      });
      
      // Update API availability
      if (!config.speechRecognition) {
        delete global.SpeechRecognition;
      }
      if (!config.webkitSpeechRecognition) {
        delete global.webkitSpeechRecognition;
      }
      
      // Update available voices
      global.speechSynthesis._voices = config.voices.map(voice => ({
        ...voice,
        voiceURI: voice.name.toLowerCase().replace(/\s+/g, '-'),
        localService: true
      }));
    }
  },
  
  // Simulate speech recognition results
  simulateSpeechResult: (transcript, isFinal = true, confidence = 0.9) => {
    const recognition = new MockSpeechRecognition();
    recognition._simulateResult(transcript, isFinal, confidence);
    return recognition;
  },
  
  // Simulate speech recognition errors
  simulateSpeechError: (error = 'network') => {
    const recognition = new MockSpeechRecognition();
    recognition._simulateError(error);
    return recognition;
  },
  
  // Simulate permission states
  setPermission: (type, state) => {
    TEST_CONFIG.permissions[type] = state;
  },
  
  // Simulate HTTPS context
  setSecureContext: (isSecure) => {
    Object.defineProperty(window, 'isSecureContext', {
      writable: true,
      value: isSecure
    });
    TEST_CONFIG.isSecureContext = isSecure;
  }
};

/**
 * Reset mocks after each test
 */
afterEach(() => {
  jest.clearAllMocks();
  
  // Reset speech synthesis state
  global.speechSynthesis.cancel();
  
  // Reset test configuration to defaults
  global.voiceTestUtils.setTestConfig({
    defaultBrowser: 'chrome',
    permissions: { microphone: 'granted' },
    isSecureContext: true
  });
});