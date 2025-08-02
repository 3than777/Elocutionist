/**
 * Utils Index - Central export point for utility functions
 * 
 * This file provides clean imports for all utility functions used throughout
 * the application, promoting code organization and maintainability.
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

// Voice compatibility utilities
export {
  getBrowserInfo,
  checkVoiceRecognitionSupport,
  checkTextToSpeechSupport,
  checkMicrophonePermission,
  checkSecureContext,
  getVoiceCapabilities,
  generateCapabilityReport,
  isVoiceSupported,
  isTextToSpeechSupported,
  isSpeechRecognitionSupported,
  getBrowserRecommendation,
  VOICE_COMPATIBILITY_CONFIG
} from './voiceCompatibility';

// Voice fallback utilities
export {
  initializeFallbackHandler,
  handleVoiceFailure,
  getFallbackState,
  isInFallbackMode,
  getFallbackMessage,
  addFallbackListener,
  removeFallbackListener,
  resetFallbackState,
  forceTextMode,
  cleanupFallbackHandler,
  loadPersistedFallbackState,
  FALLBACK_MODES,
  ERROR_CATEGORIES
} from '../services/voiceFallback';

// HTTPS requirement utilities
export {
  validateHTTPSRequirement,
  handleHTTPSViolation,
  redirectToHTTPS,
  getHTTPSStatusMessage,
  shouldEnableVoiceFeature,
  monitorHTTPSStatus,
  initializeHTTPSHandler,
  SECURITY_LEVELS,
  HTTPS_REQUIREMENTS,
  FEATURE_SECURITY_REQUIREMENTS
} from '../services/httpsHandler';