/**
 * Voice Compatibility Checker Utility
 * 
 * Comprehensive browser compatibility checking for voice features including
 * speech recognition, text-to-speech, microphone permissions, and HTTPS requirements.
 * 
 * Features:
 * - Detailed browser detection and voice API support
 * - Microphone permission status checking
 * - HTTPS requirement validation with development exceptions
 * - Voice quality assessment and recommendations
 * - Progressive enhancement support
 * - Error recovery and fallback guidance
 * 
 * Browser Support Matrix:
 * - Chrome: Full support (Speech Recognition + TTS)
 * - Edge: Full support (Speech Recognition + TTS)
 * - Safari: Partial support (TTS only, limited Speech Recognition)
 * - Firefox: Limited support (TTS only)
 * - Mobile: iOS Safari (TTS), Chrome Mobile (Full)
 * 
 * Security Requirements:
 * - HTTPS required for speech recognition (except localhost)
 * - Microphone permission required for speech input
 * - Secure context validation
 * 
 * Related Files:
 * - src/services/speechRecognition.js - Speech recognition implementation
 * - src/services/textToSpeech.js - Text-to-speech implementation
 * - src/components/VoiceModeToggle.jsx - Voice mode UI component
 * - src/components/SettingsPanel.jsx - Voice settings configuration
 * 
 * Task: Voice Mode Feature Implementation - Step 8
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

/**
 * Detailed browser information detection
 * @returns {Object} Browser detection results with detailed information
 */
export function getBrowserInfo() {
  const ua = navigator.userAgent;
  const vendor = navigator.vendor || '';
  
  // Detect browser engine and version
  const isChrome = /Chrome\/(\d+)/.test(ua) && /Google Inc/.test(vendor);
  const isSafari = /Safari\/(\d+)/.test(ua) && /Apple Computer/.test(vendor) && !isChrome;
  const isFirefox = /Firefox\/(\d+)/.test(ua);
  const isEdge = /Edg\/(\d+)/.test(ua);
  const isOpera = /OPR\/(\d+)/.test(ua);
  
  // Mobile detection
  const isMobile = /Mobile|Tablet|Android|iPhone|iPad|iPod/.test(ua);
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  
  // Version extraction
  const chromeVersion = isChrome ? parseInt(ua.match(/Chrome\/(\d+)/)?.[1] || '0') : 0;
  const safariVersion = isSafari ? parseInt(ua.match(/Version\/(\d+)/)?.[1] || '0') : 0;
  const firefoxVersion = isFirefox ? parseInt(ua.match(/Firefox\/(\d+)/)?.[1] || '0') : 0;
  const edgeVersion = isEdge ? parseInt(ua.match(/Edg\/(\d+)/)?.[1] || '0') : 0;
  
  return {
    // Browser type
    isChrome,
    isSafari,
    isFirefox,
    isEdge,
    isOpera,
    
    // Platform
    isMobile,
    isDesktop: !isMobile,
    isIOS,
    isAndroid,
    isMac: /Mac OS X/.test(ua),
    isWindows: /Windows/.test(ua),
    isLinux: /Linux/.test(ua),
    
    // Versions
    chromeVersion,
    safariVersion,
    firefoxVersion,
    edgeVersion,
    
    // Raw info
    userAgent: ua,
    vendor: vendor,
    
    // Browser name for display
    browserName: isChrome ? 'Chrome' :
                isSafari ? 'Safari' :
                isFirefox ? 'Firefox' :
                isEdge ? 'Edge' :
                isOpera ? 'Opera' : 'Unknown'
  };
}

/**
 * Check Speech Recognition API support with vendor prefixes
 * @returns {Object} Speech recognition support information
 */
export function checkVoiceRecognitionSupport() {
  const browserInfo = getBrowserInfo();
  
  const support = {
    isSupported: false,
    hasNativeAPI: false,
    hasWebkitAPI: false,
    supportLevel: 'none', // 'full', 'partial', 'limited', 'none'
    supportQuality: 'poor', // 'excellent', 'good', 'fair', 'poor'
    browserRecommendation: '',
    limitations: [],
    error: null
  };

  try {
    // Check for native SpeechRecognition API
    if (typeof window.SpeechRecognition !== 'undefined') {
      support.hasNativeAPI = true;
      support.isSupported = true;
    }

    // Check for webkit prefixed version
    if (typeof window.webkitSpeechRecognition !== 'undefined') {
      support.hasWebkitAPI = true;
      support.isSupported = true;
    }

    if (!support.isSupported) {
      support.error = 'Speech Recognition API not available in this browser';
      support.browserRecommendation = 'Use Chrome, Edge, or Safari for speech recognition';
      return support;
    }

    // Assess support level based on browser
    if (browserInfo.isChrome && browserInfo.chromeVersion >= 25) {
      support.supportLevel = 'full';
      support.supportQuality = 'excellent';
      support.browserRecommendation = 'Chrome provides the best speech recognition experience';
    } else if (browserInfo.isEdge && browserInfo.edgeVersion >= 79) {
      support.supportLevel = 'full';
      support.supportQuality = 'excellent';
      support.browserRecommendation = 'Edge provides excellent speech recognition support';
    } else if (browserInfo.isSafari) {
      support.supportLevel = 'partial';
      support.supportQuality = 'good';
      support.limitations.push('May have issues with continuous recognition');
      support.limitations.push('Limited language support');
      support.browserRecommendation = 'Safari has partial support - consider Chrome for better experience';
    } else if (browserInfo.isFirefox) {
      support.supportLevel = 'limited';
      support.supportQuality = 'poor';
      support.limitations.push('Very limited speech recognition support');
      support.limitations.push('May not work reliably');
      support.browserRecommendation = 'Firefox has limited support - use Chrome or Edge instead';
    } else {
      support.supportLevel = 'limited';
      support.supportQuality = 'fair';
      support.limitations.push('Untested browser - compatibility may vary');
    }

    // Mobile specific assessments
    if (browserInfo.isMobile) {
      if (browserInfo.isIOS && browserInfo.isSafari) {
        support.supportLevel = 'partial';
        support.supportQuality = 'fair';
        support.limitations.push('iOS Safari has limited speech recognition');
      } else if (browserInfo.isAndroid && browserInfo.isChrome) {
        support.supportLevel = 'full';
        support.supportQuality = 'good';
      } else {
        support.supportLevel = 'limited';
        support.supportQuality = 'poor';
        support.limitations.push('Mobile browser support varies significantly');
      }
    }

  } catch (error) {
    support.error = `Speech recognition check failed: ${error.message}`;
    support.isSupported = false;
  }

  return support;
}

/**
 * Check Text-to-Speech API support
 * @returns {Object} Text-to-speech support information
 */
export function checkTextToSpeechSupport() {
  const browserInfo = getBrowserInfo();
  
  const support = {
    isSupported: false,
    hasVoices: false,
    voiceCount: 0,
    supportLevel: 'none', // 'full', 'partial', 'limited', 'none'
    supportQuality: 'poor', // 'excellent', 'good', 'fair', 'poor'
    voiceQuality: 'basic', // 'premium', 'standard', 'basic'
    browserRecommendation: '',
    limitations: [],
    error: null
  };

  try {
    // Check for Speech Synthesis API
    if (typeof window.speechSynthesis === 'undefined') {
      support.error = 'Text-to-speech API not available in this browser';
      support.browserRecommendation = 'Use a modern browser with speech synthesis support';
      return support;
    }

    support.isSupported = true;

    // Check for available voices
    const voices = window.speechSynthesis.getVoices();
    support.voiceCount = voices.length;
    support.hasVoices = voices.length > 0;

    // Browser-specific quality assessment
    if (browserInfo.isChrome) {
      support.supportLevel = 'full';
      support.supportQuality = 'excellent';
      support.voiceQuality = 'premium';
      support.browserRecommendation = 'Chrome offers the best text-to-speech experience';
    } else if (browserInfo.isEdge) {
      support.supportLevel = 'full';
      support.supportQuality = 'excellent';
      support.voiceQuality = 'premium';
      support.browserRecommendation = 'Edge provides excellent text-to-speech with Windows voices';
    } else if (browserInfo.isSafari) {
      support.supportLevel = 'full';
      support.supportQuality = 'good';
      support.voiceQuality = 'standard';
      support.browserRecommendation = 'Safari provides good text-to-speech with system voices';
    } else if (browserInfo.isFirefox) {
      support.supportLevel = 'partial';
      support.supportQuality = 'fair';
      support.voiceQuality = 'basic';
      support.limitations.push('Limited voice selection');
      support.limitations.push('May have audio quality issues');
      support.browserRecommendation = 'Firefox has basic support - consider Chrome for better voices';
    } else {
      support.supportLevel = 'partial';
      support.supportQuality = 'fair';
      support.voiceQuality = 'basic';
      support.limitations.push('Unknown browser - voice quality may vary');
    }

    // Platform-specific enhancements
    if (browserInfo.isMac && browserInfo.isSafari) {
      support.voiceQuality = 'premium';
      support.browserRecommendation = 'Safari on Mac provides high-quality system voices';
    }

    if (browserInfo.isWindows && browserInfo.isEdge) {
      support.voiceQuality = 'premium';
      support.browserRecommendation = 'Edge on Windows provides excellent native voices';
    }

    // Mobile considerations
    if (browserInfo.isMobile) {
      if (browserInfo.isIOS) {
        support.supportQuality = 'good';
        support.voiceQuality = 'standard';
      } else if (browserInfo.isAndroid) {
        support.supportQuality = 'fair';
        support.voiceQuality = 'basic';
        support.limitations.push('Android TTS quality varies by device');
      }
    }

  } catch (error) {
    support.error = `Text-to-speech check failed: ${error.message}`;
    support.isSupported = false;
  }

  return support;
}

/**
 * Check microphone permission status
 * @returns {Promise<Object>} Microphone permission information
 */
export async function checkMicrophonePermission() {
  const permission = {
    status: 'unknown', // 'granted', 'denied', 'prompt', 'unknown'
    isAvailable: false,
    canRequest: false,
    error: null,
    recommendation: ''
  };

  try {
    // Check if Permissions API is supported
    if (!navigator.permissions) {
      permission.canRequest = true;
      permission.status = 'unknown';
      permission.recommendation = 'Browser does not support permission checking - will prompt when needed';
      return permission;
    }

    // Query microphone permission
    const result = await navigator.permissions.query({ name: 'microphone' });
    permission.status = result.state;
    permission.isAvailable = result.state === 'granted';
    permission.canRequest = result.state !== 'denied';

    switch (result.state) {
      case 'granted':
        permission.recommendation = 'Microphone access granted - voice features ready';
        break;
      case 'denied':
        permission.recommendation = 'Microphone access denied - enable in browser settings';
        break;
      case 'prompt':
        permission.recommendation = 'Microphone permission will be requested when using voice features';
        break;
      default:
        permission.recommendation = 'Microphone permission status unknown';
    }

  } catch (error) {
    permission.error = error.message;
    permission.status = 'unknown';
    permission.canRequest = true;
    permission.recommendation = 'Unable to check permission - will attempt to request when needed';
  }

  return permission;
}

/**
 * Check HTTPS requirement and secure context
 * @returns {Object} HTTPS and security context information
 */
export function checkSecureContext() {
  const context = {
    isSecure: false,
    isHTTPS: false,
    isLocalhost: false,
    meetsRequirements: false,
    error: null,
    recommendation: ''
  };

  try {
    // Check secure context
    context.isSecure = window.isSecureContext || false;
    
    // Check HTTPS
    context.isHTTPS = window.location.protocol === 'https:';
    
    // Check localhost (which is considered secure)
    context.isLocalhost = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname === '::1';

    // Voice features require secure context
    context.meetsRequirements = context.isSecure || context.isLocalhost;

    if (context.meetsRequirements) {
      if (context.isHTTPS) {
        context.recommendation = 'Secure HTTPS connection - all voice features available';
      } else if (context.isLocalhost) {
        context.recommendation = 'Localhost development - voice features available';
      } else {
        context.recommendation = 'Secure context available - voice features ready';
      }
    } else {
      context.error = 'Voice features require HTTPS connection for security';
      context.recommendation = 'Please access this site via HTTPS to enable voice features';
    }

  } catch (error) {
    context.error = `Security context check failed: ${error.message}`;
    context.recommendation = 'Unable to verify security context';
  }

  return context;
}

/**
 * Get comprehensive voice capabilities assessment
 * @returns {Promise<Object>} Complete voice capability report
 */
export async function getVoiceCapabilities() {
  const browserInfo = getBrowserInfo();
  const speechRecognition = checkVoiceRecognitionSupport();
  const textToSpeech = checkTextToSpeechSupport();
  const secureContext = checkSecureContext();
  const microphonePermission = await checkMicrophonePermission();

  // Overall capability assessment
  const capabilities = {
    // Component results
    browser: browserInfo,
    speechRecognition,
    textToSpeech,
    secureContext,
    microphonePermission,
    
    // Overall assessments
    overallSupport: 'none', // 'full', 'partial', 'limited', 'none'
    readinessLevel: 'not-ready', // 'ready', 'needs-setup', 'limited', 'not-ready'
    recommendedBrowser: '',
    primaryLimitations: [],
    setupInstructions: [],
    
    // Feature flags
    canUseSpeechRecognition: false,
    canUseTextToSpeech: false,
    canUseVoiceMode: false,
    
    // Quality metrics
    expectedPerformance: 'poor', // 'excellent', 'good', 'fair', 'poor'
    userExperience: 'unsupported' // 'optimal', 'good', 'acceptable', 'limited', 'unsupported'
  };

  // Assess speech recognition capability
  capabilities.canUseSpeechRecognition = 
    speechRecognition.isSupported && 
    secureContext.meetsRequirements && 
    microphonePermission.status !== 'denied';

  // Assess text-to-speech capability
  capabilities.canUseTextToSpeech = textToSpeech.isSupported;

  // Assess overall voice mode capability
  capabilities.canUseVoiceMode = 
    capabilities.canUseSpeechRecognition && 
    capabilities.canUseTextToSpeech;

  // Determine overall support level
  if (capabilities.canUseVoiceMode) {
    if (speechRecognition.supportLevel === 'full' && textToSpeech.supportLevel === 'full') {
      capabilities.overallSupport = 'full';
      capabilities.expectedPerformance = 'excellent';
      capabilities.userExperience = 'optimal';
    } else if (speechRecognition.supportLevel !== 'none' && textToSpeech.supportLevel !== 'none') {
      capabilities.overallSupport = 'partial';
      capabilities.expectedPerformance = 'good';
      capabilities.userExperience = 'good';
    } else {
      capabilities.overallSupport = 'limited';
      capabilities.expectedPerformance = 'fair';
      capabilities.userExperience = 'acceptable';
    }
  } else if (capabilities.canUseTextToSpeech) {
    capabilities.overallSupport = 'limited';
    capabilities.expectedPerformance = 'fair';
    capabilities.userExperience = 'limited';
  } else {
    capabilities.overallSupport = 'none';
    capabilities.expectedPerformance = 'poor';
    capabilities.userExperience = 'unsupported';
  }

  // Determine readiness level
  if (capabilities.canUseVoiceMode) {
    if (microphonePermission.status === 'granted') {
      capabilities.readinessLevel = 'ready';
    } else if (microphonePermission.canRequest) {
      capabilities.readinessLevel = 'needs-setup';
    } else {
      capabilities.readinessLevel = 'limited';
    }
  } else {
    capabilities.readinessLevel = 'not-ready';
  }

  // Browser recommendations
  if (browserInfo.isChrome && browserInfo.chromeVersion >= 25) {
    capabilities.recommendedBrowser = 'Current browser (Chrome) is excellent for voice features';
  } else if (browserInfo.isEdge && browserInfo.edgeVersion >= 79) {
    capabilities.recommendedBrowser = 'Current browser (Edge) is excellent for voice features';
  } else {
    capabilities.recommendedBrowser = 'For best voice experience, use Chrome or Edge';
  }

  // Collect limitations
  if (speechRecognition.limitations.length > 0) {
    capabilities.primaryLimitations.push(...speechRecognition.limitations);
  }
  if (textToSpeech.limitations.length > 0) {
    capabilities.primaryLimitations.push(...textToSpeech.limitations);
  }
  if (!secureContext.meetsRequirements) {
    capabilities.primaryLimitations.push('Requires HTTPS connection');
  }
  if (microphonePermission.status === 'denied') {
    capabilities.primaryLimitations.push('Microphone access denied');
  }

  // Setup instructions
  if (!secureContext.meetsRequirements) {
    capabilities.setupInstructions.push('Access the site via HTTPS');
  }
  if (microphonePermission.status === 'denied') {
    capabilities.setupInstructions.push('Enable microphone permission in browser settings');
  }
  if (microphonePermission.status === 'prompt') {
    capabilities.setupInstructions.push('Grant microphone permission when prompted');
  }
  if (speechRecognition.supportLevel === 'none') {
    capabilities.setupInstructions.push('Switch to Chrome or Edge for speech recognition');
  }
  if (textToSpeech.supportLevel === 'none') {
    capabilities.setupInstructions.push('Use a browser with text-to-speech support');
  }

  return capabilities;
}

/**
 * Generate user-friendly capability report
 * @returns {Promise<Object>} Human-readable capability report
 */
export async function generateCapabilityReport() {
  const capabilities = await getVoiceCapabilities();
  
  const report = {
    // Summary
    summary: {
      title: '',
      description: '',
      status: capabilities.overallSupport,
      color: '',
      icon: ''
    },
    
    // Detailed findings
    features: {
      speechRecognition: {
        available: capabilities.canUseSpeechRecognition,
        quality: capabilities.speechRecognition.supportQuality,
        description: ''
      },
      textToSpeech: {
        available: capabilities.canUseTextToSpeech,
        quality: capabilities.textToSpeech.supportQuality,
        description: ''
      },
      voiceMode: {
        available: capabilities.canUseVoiceMode,
        quality: capabilities.expectedPerformance,
        description: ''
      }
    },
    
    // Recommendations
    recommendations: {
      browser: capabilities.recommendedBrowser,
      setup: capabilities.setupInstructions,
      limitations: capabilities.primaryLimitations
    },
    
    // Technical details
    technical: {
      browser: `${capabilities.browser.browserName} on ${capabilities.browser.isMobile ? 'Mobile' : 'Desktop'}`,
      secureContext: capabilities.secureContext.isSecure,
      microphonePermission: capabilities.microphonePermission.status
    }
  };

  // Generate summary based on overall support
  switch (capabilities.overallSupport) {
    case 'full':
      report.summary.title = 'Full Voice Support Available';
      report.summary.description = 'Your browser fully supports voice features with excellent quality';
      report.summary.color = '#28a745';
      report.summary.icon = '✅';
      break;
    case 'partial':
      report.summary.title = 'Partial Voice Support';
      report.summary.description = 'Voice features available with some limitations';
      report.summary.color = '#ffc107';
      report.summary.icon = '⚠️';
      break;
    case 'limited':
      report.summary.title = 'Limited Voice Support';
      report.summary.description = 'Basic voice features available, consider upgrading browser';
      report.summary.color = '#fd7e14';
      report.summary.icon = '⚡';
      break;
    default:
      report.summary.title = 'Voice Features Not Available';
      report.summary.description = 'Your browser does not support voice features';
      report.summary.color = '#dc3545';
      report.summary.icon = '❌';
  }

  // Feature descriptions
  report.features.speechRecognition.description = capabilities.canUseSpeechRecognition
    ? `Speech recognition available with ${capabilities.speechRecognition.supportQuality} quality`
    : 'Speech recognition not available in this browser';

  report.features.textToSpeech.description = capabilities.canUseTextToSpeech
    ? `Text-to-speech available with ${capabilities.textToSpeech.voiceQuality} voices`
    : 'Text-to-speech not available in this browser';

  report.features.voiceMode.description = capabilities.canUseVoiceMode
    ? `Full voice mode available with ${capabilities.expectedPerformance} performance`
    : 'Voice mode not available - missing required features';

  return report;
}

/**
 * Check if current environment supports voice features
 * @returns {Promise<boolean>} True if voice features are supported
 */
export async function isVoiceSupported() {
  const capabilities = await getVoiceCapabilities();
  return capabilities.canUseVoiceMode;
}

/**
 * Check if current environment supports text-to-speech only
 * @returns {boolean} True if TTS is supported
 */
export function isTextToSpeechSupported() {
  return checkTextToSpeechSupport().isSupported;
}

/**
 * Check if current environment supports speech recognition only
 * @returns {boolean} True if speech recognition is supported
 */
export function isSpeechRecognitionSupported() {
  const recognition = checkVoiceRecognitionSupport();
  const context = checkSecureContext();
  return recognition.isSupported && context.meetsRequirements;
}

/**
 * Get quick browser recommendation for voice features
 * @returns {string} Browser recommendation message
 */
export function getBrowserRecommendation() {
  const browser = getBrowserInfo();
  
  if (browser.isChrome && browser.chromeVersion >= 25) {
    return 'Chrome provides excellent voice support';
  } else if (browser.isEdge && browser.edgeVersion >= 79) {
    return 'Edge provides excellent voice support';
  } else if (browser.isSafari) {
    return 'Safari has partial voice support - consider Chrome for full features';
  } else if (browser.isFirefox) {
    return 'Firefox has limited voice support - use Chrome or Edge for better experience';
  } else {
    return 'For best voice features, use Chrome or Edge browser';
  }
}

// Export configuration for external access
export const VOICE_COMPATIBILITY_CONFIG = {
  MINIMUM_VERSIONS: {
    chrome: 25,
    edge: 79,
    safari: 14,
    firefox: 70
  },
  SUPPORT_MATRIX: {
    chrome: { speechRecognition: 'full', textToSpeech: 'full' },
    edge: { speechRecognition: 'full', textToSpeech: 'full' },
    safari: { speechRecognition: 'partial', textToSpeech: 'full' },
    firefox: { speechRecognition: 'none', textToSpeech: 'partial' }
  },
  REQUIREMENTS: {
    https: true,
    microphone: true,
    secureContext: true
  }
};