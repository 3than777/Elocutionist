/**
 * Voice Fallback Handler Service
 * 
 * Provides comprehensive fallback strategies and error recovery mechanisms for voice features
 * when browsers don't support voice APIs or when voice operations fail.
 * 
 * Features:
 * - Graceful degradation to text mode
 * - Progressive enhancement approach
 * - Intelligent retry logic for temporary failures
 * - User-friendly error messages with alternatives
 * - Fallback mode management and state tracking
 * - Recovery strategies for different failure types
 * 
 * Fallback Strategies:
 * - Full fallback: Disable all voice features, use text mode
 * - Partial fallback: Use available voice features, disable unavailable ones
 * - Temporary fallback: Retry failed operations with backoff
 * - Progressive fallback: Start with basic features, enhance over time
 * 
 * Error Types Handled:
 * - Browser compatibility issues
 * - API initialization failures
 * - Permission denied errors
 * - Network connectivity issues
 * - Temporary service unavailability
 * - HTTPS requirement violations
 * 
 * Related Files:
 * - src/utils/voiceCompatibility.js - Browser compatibility checking
 * - src/services/speechRecognition.js - Speech recognition service
 * - src/services/textToSpeech.js - Text-to-speech service
 * - src/components/ChatBox.jsx - Main voice integration point
 * 
 * Task: Voice Mode Feature Implementation - Step 9
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import { getVoiceCapabilities, generateCapabilityReport } from '../utils/voiceCompatibility';

/**
 * Fallback modes for different failure scenarios
 */
export const FALLBACK_MODES = {
  NONE: 'none',                    // Full voice functionality
  PARTIAL: 'partial',              // Some voice features available
  TEXT_ONLY: 'text_only',         // No voice features, text mode only
  RETRY_PENDING: 'retry_pending',  // Temporary failure, retrying
  PERMISSION_REQUIRED: 'permission_required', // Needs user permission
  UPGRADE_REQUIRED: 'upgrade_required'        // Needs browser upgrade
};

/**
 * Error categories for targeted fallback strategies
 */
export const ERROR_CATEGORIES = {
  COMPATIBILITY: 'compatibility',   // Browser doesn't support APIs
  PERMISSION: 'permission',         // User denied permissions
  NETWORK: 'network',              // Network connectivity issues
  INITIALIZATION: 'initialization', // Service initialization failed
  RUNTIME: 'runtime',              // Runtime errors during operation
  SECURITY: 'security',            // HTTPS or security context issues
  TEMPORARY: 'temporary'           // Temporary failures, may recover
};

/**
 * Fallback state management
 */
let fallbackState = {
  mode: FALLBACK_MODES.NONE,
  category: null,
  retryCount: 0,
  maxRetries: 3,
  retryDelay: 1000,
  lastError: null,
  capabilities: null,
  timestamp: Date.now(),
  userNotified: false,
  alternatives: []
};

/**
 * Event listeners for fallback state changes
 */
let fallbackListeners = [];

/**
 * Configuration for retry behavior
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retriableCategories: [
    ERROR_CATEGORIES.NETWORK,
    ERROR_CATEGORIES.TEMPORARY,
    ERROR_CATEGORIES.INITIALIZATION
  ]
};

/**
 * Initialize fallback handler and assess current capabilities
 * @returns {Promise<Object>} Initial fallback assessment
 */
export async function initializeFallbackHandler() {
  try {
    console.log('🔄 Initializing voice fallback handler...');
    
    // Assess current voice capabilities
    const capabilities = await getVoiceCapabilities();
    const report = await generateCapabilityReport();
    
    // Update fallback state based on capabilities
    updateFallbackState({
      capabilities,
      mode: determineFallbackMode(capabilities),
      category: null,
      lastError: null,
      timestamp: Date.now()
    });
    
    console.log('✅ Voice fallback handler initialized:', {
      mode: fallbackState.mode,
      overallSupport: capabilities.overallSupport,
      readinessLevel: capabilities.readinessLevel
    });
    
    return {
      success: true,
      mode: fallbackState.mode,
      capabilities,
      report
    };
    
  } catch (error) {
    console.error('❌ Failed to initialize fallback handler:', error);
    
    // Set emergency fallback mode
    updateFallbackState({
      mode: FALLBACK_MODES.TEXT_ONLY,
      category: ERROR_CATEGORIES.INITIALIZATION,
      lastError: {
        type: 'initialization_failed',
        message: error.message,
        timestamp: Date.now()
      }
    });
    
    return {
      success: false,
      mode: FALLBACK_MODES.TEXT_ONLY,
      error: error.message
    };
  }
}

/**
 * Determine appropriate fallback mode based on capabilities
 * @param {Object} capabilities - Voice capabilities assessment
 * @returns {string} Appropriate fallback mode
 */
function determineFallbackMode(capabilities) {
  if (!capabilities) {
    return FALLBACK_MODES.TEXT_ONLY;
  }
  
  // Full voice support available
  if (capabilities.canUseVoiceMode && capabilities.readinessLevel === 'ready') {
    return FALLBACK_MODES.NONE;
  }
  
  // Partial voice support (TTS only or needs setup)
  if (capabilities.canUseTextToSpeech || capabilities.readinessLevel === 'needs-setup') {
    return FALLBACK_MODES.PARTIAL;
  }
  
  // Permission required
  if (capabilities.microphonePermission.status === 'denied') {
    return FALLBACK_MODES.PERMISSION_REQUIRED;
  }
  
  // Browser upgrade needed
  if (!capabilities.canUseTextToSpeech && !capabilities.canUseSpeechRecognition) {
    return FALLBACK_MODES.UPGRADE_REQUIRED;
  }
  
  // Default to text only
  return FALLBACK_MODES.TEXT_ONLY;
}

/**
 * Handle voice operation failure with appropriate fallback strategy
 * @param {Object} error - Error information
 * @param {Object} context - Context about the failed operation
 * @returns {Promise<Object>} Fallback handling result
 */
export async function handleVoiceFailure(error, context = {}) {
  console.warn('🚨 Voice operation failed, initiating fallback:', error);
  
  const category = categorizeError(error);
  const shouldRetry = shouldRetryOperation(category, error);
  
  // Update fallback state
  updateFallbackState({
    category,
    lastError: {
      ...error,
      context,
      timestamp: Date.now()
    }
  });
  
  const fallbackResult = {
    success: false,
    category,
    shouldRetry,
    alternatives: [],
    userMessage: '',
    technicalMessage: error.message || 'Unknown voice error',
    recovery: null
  };
  
  // Handle specific error categories
  switch (category) {
    case ERROR_CATEGORIES.PERMISSION:
      fallbackResult.alternatives = await handlePermissionFailure(error, context);
      fallbackResult.userMessage = 'Microphone permission needed for voice features';
      break;
      
    case ERROR_CATEGORIES.COMPATIBILITY:
      fallbackResult.alternatives = await handleCompatibilityFailure(error, context);
      fallbackResult.userMessage = 'Voice features not supported in this browser';
      break;
      
    case ERROR_CATEGORIES.SECURITY:
      fallbackResult.alternatives = await handleSecurityFailure(error, context);
      fallbackResult.userMessage = 'Voice features require a secure connection (HTTPS)';
      break;
      
    case ERROR_CATEGORIES.NETWORK:
      fallbackResult.alternatives = await handleNetworkFailure(error, context);
      fallbackResult.userMessage = 'Network issues affecting voice features';
      break;
      
    case ERROR_CATEGORIES.TEMPORARY:
      fallbackResult.alternatives = await handleTemporaryFailure(error, context);
      fallbackResult.userMessage = 'Temporary voice service issue';
      break;
      
    default:
      fallbackResult.alternatives = await handleGenericFailure(error, context);
      fallbackResult.userMessage = 'Voice feature temporarily unavailable';
  }
  
  // Set up retry mechanism if appropriate
  if (shouldRetry) {
    fallbackResult.recovery = setupRetryMechanism(error, context);
  }
  
  // Notify listeners about fallback activation
  notifyFallbackListeners(fallbackResult);
  
  return fallbackResult;
}

/**
 * Categorize error to determine appropriate fallback strategy
 * @param {Object} error - Error information
 * @returns {string} Error category
 */
function categorizeError(error) {
  if (!error) return ERROR_CATEGORIES.TEMPORARY;
  
  const errorType = error.type || '';
  const errorMessage = (error.message || '').toLowerCase();
  
  // Permission-related errors
  if (errorType === 'not-allowed' || errorMessage.includes('permission') || errorMessage.includes('denied')) {
    return ERROR_CATEGORIES.PERMISSION;
  }
  
  // Compatibility errors
  if (errorType === 'not-supported' || errorMessage.includes('not supported') || errorMessage.includes('not available')) {
    return ERROR_CATEGORIES.COMPATIBILITY;
  }
  
  // Security context errors
  if (errorMessage.includes('https') || errorMessage.includes('secure context') || errorMessage.includes('security')) {
    return ERROR_CATEGORIES.SECURITY;
  }
  
  // Network errors
  if (errorType === 'network' || errorMessage.includes('network') || errorMessage.includes('connection')) {
    return ERROR_CATEGORIES.NETWORK;
  }
  
  // Initialization errors
  if (errorType === 'initialization' || errorMessage.includes('initialize') || errorMessage.includes('init')) {
    return ERROR_CATEGORIES.INITIALIZATION;
  }
  
  // Runtime errors during operation
  if (errorType === 'runtime' || errorMessage.includes('runtime') || errorMessage.includes('operation')) {
    return ERROR_CATEGORIES.RUNTIME;
  }
  
  // Default to temporary
  return ERROR_CATEGORIES.TEMPORARY;
}

/**
 * Determine if operation should be retried based on error category
 * @param {string} category - Error category
 * @param {Object} error - Error information
 * @returns {boolean} Whether to retry
 */
function shouldRetryOperation(category, error) {
  // Don't retry if we've exceeded max attempts
  if (fallbackState.retryCount >= RETRY_CONFIG.maxRetries) {
    return false;
  }
  
  // Only retry certain categories
  if (!RETRY_CONFIG.retriableCategories.includes(category)) {
    return false;
  }
  
  // Check if error explicitly indicates it's not retriable
  if (error && error.recoverable === false) {
    return false;
  }
  
  return true;
}

/**
 * Handle microphone permission failures
 * @param {Object} error - Permission error
 * @param {Object} context - Operation context
 * @returns {Promise<Array>} Alternative actions
 */
async function handlePermissionFailure(error, context) {
  console.log('🔐 Handling permission failure...');
  
  updateFallbackState({
    mode: FALLBACK_MODES.PERMISSION_REQUIRED
  });
  
  return [
    {
      type: 'permission_request',
      title: 'Grant Microphone Permission',
      description: 'Click to allow microphone access for voice features',
      action: 'requestPermission',
      priority: 'high'
    },
    {
      type: 'browser_settings',
      title: 'Check Browser Settings',
      description: 'Enable microphone permission in browser settings',
      action: 'openBrowserSettings',
      priority: 'medium'
    },
    {
      type: 'text_mode',
      title: 'Use Text Mode',
      description: 'Continue with text-based interaction',
      action: 'switchToTextMode',
      priority: 'low'
    }
  ];
}

/**
 * Handle browser compatibility failures
 * @param {Object} error - Compatibility error
 * @param {Object} context - Operation context
 * @returns {Promise<Array>} Alternative actions
 */
async function handleCompatibilityFailure(error, context) {
  console.log('🌐 Handling compatibility failure...');
  
  updateFallbackState({
    mode: FALLBACK_MODES.UPGRADE_REQUIRED
  });
  
  return [
    {
      type: 'browser_upgrade',
      title: 'Use Supported Browser',
      description: 'Switch to Chrome, Edge, or Safari for voice features',
      action: 'suggestBrowserUpgrade',
      priority: 'high'
    },
    {
      type: 'partial_features',
      title: 'Try Text-to-Speech Only',
      description: 'Some voice features may still work',
      action: 'enablePartialMode',
      priority: 'medium'
    },
    {
      type: 'text_mode',
      title: 'Continue with Text',
      description: 'Use text-based interaction instead',
      action: 'switchToTextMode',
      priority: 'low'
    }
  ];
}

/**
 * Handle HTTPS/security context failures
 * @param {Object} error - Security error
 * @param {Object} context - Operation context
 * @returns {Promise<Array>} Alternative actions
 */
async function handleSecurityFailure(error, context) {
  console.log('🔒 Handling security failure...');
  
  updateFallbackState({
    mode: FALLBACK_MODES.UPGRADE_REQUIRED
  });
  
  return [
    {
      type: 'https_required',
      title: 'Use HTTPS Connection',
      description: 'Voice features require a secure HTTPS connection',
      action: 'redirectToHTTPS',
      priority: 'high'
    },
    {
      type: 'localhost_info',
      title: 'Development Mode Info',
      description: 'Use localhost or HTTPS for voice features in development',
      action: 'showDevInfo',
      priority: 'medium'
    },
    {
      type: 'text_mode',
      title: 'Use Text Mode',
      description: 'Continue without voice features',
      action: 'switchToTextMode',
      priority: 'low'
    }
  ];
}

/**
 * Handle network-related failures
 * @param {Object} error - Network error
 * @param {Object} context - Operation context
 * @returns {Promise<Array>} Alternative actions
 */
async function handleNetworkFailure(error, context) {
  console.log('🌐 Handling network failure...');
  
  updateFallbackState({
    mode: FALLBACK_MODES.RETRY_PENDING
  });
  
  return [
    {
      type: 'retry',
      title: 'Retry Voice Operation',
      description: 'Try the voice operation again',
      action: 'retryOperation',
      priority: 'high'
    },
    {
      type: 'check_connection',
      title: 'Check Internet Connection',
      description: 'Verify your internet connection is stable',
      action: 'checkConnection',
      priority: 'medium'
    },
    {
      type: 'text_mode',
      title: 'Use Text Mode',
      description: 'Continue with text while connection is restored',
      action: 'switchToTextMode',
      priority: 'low'
    }
  ];
}

/**
 * Handle temporary service failures
 * @param {Object} error - Temporary error
 * @param {Object} context - Operation context
 * @returns {Promise<Array>} Alternative actions
 */
async function handleTemporaryFailure(error, context) {
  console.log('⏱️ Handling temporary failure...');
  
  updateFallbackState({
    mode: FALLBACK_MODES.RETRY_PENDING
  });
  
  return [
    {
      type: 'auto_retry',
      title: 'Automatic Retry',
      description: 'System will automatically retry in a moment',
      action: 'autoRetry',
      priority: 'high'
    },
    {
      type: 'manual_retry',
      title: 'Try Again',
      description: 'Manually retry the voice operation',
      action: 'retryOperation',
      priority: 'medium'
    },
    {
      type: 'text_mode',
      title: 'Use Text Mode',
      description: 'Continue with text while service recovers',
      action: 'switchToTextMode',
      priority: 'low'
    }
  ];
}

/**
 * Handle generic failures with general fallback strategies
 * @param {Object} error - Generic error
 * @param {Object} context - Operation context
 * @returns {Promise<Array>} Alternative actions
 */
async function handleGenericFailure(error, context) {
  console.log('❓ Handling generic failure...');
  
  updateFallbackState({
    mode: FALLBACK_MODES.TEXT_ONLY
  });
  
  return [
    {
      type: 'refresh_page',
      title: 'Refresh Page',
      description: 'Reload the page to reset voice features',
      action: 'refreshPage',
      priority: 'medium'
    },
    {
      type: 'check_browser',
      title: 'Check Browser',
      description: 'Ensure your browser supports voice features',
      action: 'checkBrowser',
      priority: 'medium'
    },
    {
      type: 'text_mode',
      title: 'Use Text Mode',
      description: 'Continue with text-based interaction',
      action: 'switchToTextMode',
      priority: 'high'
    }
  ];
}

/**
 * Set up retry mechanism with exponential backoff
 * @param {Object} error - Original error
 * @param {Object} context - Operation context
 * @returns {Object} Retry configuration
 */
function setupRetryMechanism(error, context) {
  const retryCount = fallbackState.retryCount + 1;
  const delay = Math.min(
    RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount - 1),
    RETRY_CONFIG.maxDelay
  );
  
  const retryConfig = {
    attempt: retryCount,
    maxAttempts: RETRY_CONFIG.maxRetries,
    delay,
    context,
    scheduledTime: Date.now() + delay
  };
  
  console.log(`⏰ Scheduling retry ${retryCount}/${RETRY_CONFIG.maxRetries} in ${delay}ms`);
  
  // Schedule the retry
  setTimeout(() => {
    executeRetry(error, context, retryConfig);
  }, delay);
  
  return retryConfig;
}

/**
 * Execute retry operation
 * @param {Object} originalError - Original error that caused the retry
 * @param {Object} context - Operation context
 * @param {Object} retryConfig - Retry configuration
 */
async function executeRetry(originalError, context, retryConfig) {
  try {
    console.log(`🔄 Executing retry ${retryConfig.attempt}/${retryConfig.maxAttempts}`);
    
    // Update retry count
    updateFallbackState({
      retryCount: retryConfig.attempt
    });
    
    // Reassess capabilities before retry
    const capabilities = await getVoiceCapabilities();
    
    // Check if the issue has been resolved
    const newMode = determineFallbackMode(capabilities);
    
    if (newMode === FALLBACK_MODES.NONE || newMode === FALLBACK_MODES.PARTIAL) {
      console.log('✅ Voice capabilities restored, clearing fallback mode');
      
      updateFallbackState({
        mode: newMode,
        category: null,
        lastError: null,
        retryCount: 0,
        capabilities
      });
      
      // Notify listeners about recovery
      notifyFallbackListeners({
        success: true,
        type: 'recovery',
        message: 'Voice features have been restored',
        capabilities
      });
      
      return;
    }
    
    // If still failing and we've reached max retries, give up
    if (retryConfig.attempt >= RETRY_CONFIG.maxRetries) {
      console.warn('❌ Max retries reached, switching to permanent fallback');
      
      updateFallbackState({
        mode: FALLBACK_MODES.TEXT_ONLY,
        retryCount: 0
      });
      
      notifyFallbackListeners({
        success: false,
        type: 'max_retries_reached',
        message: 'Voice features unavailable after multiple attempts',
        alternatives: [
          {
            type: 'text_mode',
            title: 'Continue with Text',
            description: 'Voice features are currently unavailable',
            action: 'switchToTextMode',
            priority: 'high'
          }
        ]
      });
    }
    
  } catch (error) {
    console.error('❌ Retry failed:', error);
    
    // If retry failed, handle the new error
    await handleVoiceFailure(error, context);
  }
}

/**
 * Update fallback state and persist to localStorage
 * @param {Object} updates - State updates
 */
function updateFallbackState(updates) {
  fallbackState = {
    ...fallbackState,
    ...updates,
    timestamp: Date.now()
  };
  
  // Persist important state to localStorage
  try {
    const persistedState = {
      mode: fallbackState.mode,
      category: fallbackState.category,
      retryCount: fallbackState.retryCount,
      timestamp: fallbackState.timestamp
    };
    localStorage.setItem('voiceFallbackState', JSON.stringify(persistedState));
  } catch (error) {
    console.warn('Failed to persist fallback state:', error);
  }
}

/**
 * Load persisted fallback state from localStorage
 * @returns {Object} Loaded state or default state
 */
export function loadPersistedFallbackState() {
  try {
    const persistedState = localStorage.getItem('voiceFallbackState');
    if (persistedState) {
      const state = JSON.parse(persistedState);
      
      // Check if state is recent (within last hour)
      const stateAge = Date.now() - state.timestamp;
      if (stateAge < 3600000) { // 1 hour
        return state;
      }
    }
  } catch (error) {
    console.warn('Failed to load persisted fallback state:', error);
  }
  
  return {
    mode: FALLBACK_MODES.NONE,
    category: null,
    retryCount: 0,
    timestamp: Date.now()
  };
}

/**
 * Get current fallback state
 * @returns {Object} Current fallback state
 */
export function getFallbackState() {
  return { ...fallbackState };
}

/**
 * Check if currently in fallback mode
 * @returns {boolean} True if in any fallback mode
 */
export function isInFallbackMode() {
  return fallbackState.mode !== FALLBACK_MODES.NONE;
}

/**
 * Get user-friendly fallback message
 * @returns {Object} Fallback message information
 */
export function getFallbackMessage() {
  const mode = fallbackState.mode;
  const category = fallbackState.category;
  
  const messages = {
    [FALLBACK_MODES.NONE]: {
      title: 'Voice Features Active',
      message: 'All voice features are working normally',
      type: 'success',
      icon: '✅'
    },
    [FALLBACK_MODES.PARTIAL]: {
      title: 'Limited Voice Features',
      message: 'Some voice features are available',
      type: 'warning',
      icon: '⚠️'
    },
    [FALLBACK_MODES.TEXT_ONLY]: {
      title: 'Text Mode Only',
      message: 'Voice features are not available, using text mode',
      type: 'info',
      icon: '📝'
    },
    [FALLBACK_MODES.RETRY_PENDING]: {
      title: 'Retrying Voice Features',
      message: 'Attempting to restore voice functionality',
      type: 'info',
      icon: '🔄'
    },
    [FALLBACK_MODES.PERMISSION_REQUIRED]: {
      title: 'Permission Required',
      message: 'Microphone permission needed for voice features',
      type: 'warning',
      icon: '🔐'
    },
    [FALLBACK_MODES.UPGRADE_REQUIRED]: {
      title: 'Browser Upgrade Needed',
      message: 'Voice features require a supported browser',
      type: 'warning',
      icon: '🌐'
    }
  };
  
  return messages[mode] || messages[FALLBACK_MODES.TEXT_ONLY];
}

/**
 * Add listener for fallback state changes
 * @param {Function} listener - Callback function
 */
export function addFallbackListener(listener) {
  if (typeof listener === 'function') {
    fallbackListeners.push(listener);
  }
}

/**
 * Remove fallback state listener
 * @param {Function} listener - Callback function to remove
 */
export function removeFallbackListener(listener) {
  const index = fallbackListeners.indexOf(listener);
  if (index > -1) {
    fallbackListeners.splice(index, 1);
  }
}

/**
 * Notify all fallback listeners about state changes
 * @param {Object} event - Fallback event information
 */
function notifyFallbackListeners(event) {
  fallbackListeners.forEach(listener => {
    try {
      listener({
        ...event,
        state: { ...fallbackState },
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Error in fallback listener:', error);
    }
  });
}

/**
 * Reset fallback state to normal operation
 */
export function resetFallbackState() {
  console.log('🔄 Resetting fallback state to normal operation');
  
  updateFallbackState({
    mode: FALLBACK_MODES.NONE,
    category: null,
    retryCount: 0,
    lastError: null,
    userNotified: false,
    alternatives: []
  });
  
  notifyFallbackListeners({
    success: true,
    type: 'reset',
    message: 'Fallback state has been reset'
  });
}

/**
 * Force fallback to text mode
 * @param {string} reason - Reason for forcing fallback
 */
export function forceTextMode(reason = 'Manual fallback requested') {
  console.log('📝 Forcing fallback to text mode:', reason);
  
  updateFallbackState({
    mode: FALLBACK_MODES.TEXT_ONLY,
    category: ERROR_CATEGORIES.RUNTIME,
    lastError: {
      type: 'forced_fallback',
      message: reason,
      timestamp: Date.now()
    }
  });
  
  notifyFallbackListeners({
    success: false,
    type: 'forced_fallback',
    message: reason
  });
}

/**
 * Cleanup fallback handler resources
 */
export function cleanupFallbackHandler() {
  console.log('🧹 Cleaning up fallback handler...');
  
  // Clear all listeners
  fallbackListeners = [];
  
  // Reset state
  fallbackState = {
    mode: FALLBACK_MODES.NONE,
    category: null,
    retryCount: 0,
    maxRetries: 3,
    retryDelay: 1000,
    lastError: null,
    capabilities: null,
    timestamp: Date.now(),
    userNotified: false,
    alternatives: []
  };
  
  // Clear persisted state
  try {
    localStorage.removeItem('voiceFallbackState');
  } catch (error) {
    console.warn('Failed to clear persisted fallback state:', error);
  }
}

// Export constants for external use
export { ERROR_CATEGORIES, FALLBACK_MODES, RETRY_CONFIG };