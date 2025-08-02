/**
 * HTTPS Handler Service
 * 
 * Handles HTTPS requirement validation and enforcement for voice features.
 * The Web Speech API requires a secure context (HTTPS) to function properly,
 * with exceptions for localhost development.
 * 
 * Features:
 * - HTTPS requirement detection and validation
 * - Development mode localhost exception handling
 * - User-friendly error messages and guidance
 * - Automatic HTTPS redirect suggestions
 * - Secure context monitoring and status reporting
 * 
 * Browser Support:
 * - All modern browsers support window.isSecureContext
 * - Localhost is considered secure for development
 * - File:// protocol handling for local development
 * 
 * Related Files:
 * - src/components/VoiceModeToggle.jsx - HTTPS validation integration
 * - src/components/VoiceTutorial.jsx - Setup guidance with HTTPS checks
 * - src/utils/voiceCompatibility.js - Browser compatibility checking
 * 
 * Task: Voice Mode Feature Implementation - Step 10
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

/**
 * Validates if the current context meets HTTPS requirements for voice features
 * 
 * @param {string} feature - Feature being checked (optional, for specific requirements)
 * @returns {Object} Validation result with status and details
 */
export function validateHTTPSRequirement(feature = 'voice') {
  const result = {
    isSecure: false,
    isLocalhost: false,
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    isValid: false,
    canProceed: false,
    securityLevel: 'none',
    message: '',
    recommendation: '',
    feature
  };

  // Check if we're in a secure context
  result.isSecure = window.isSecureContext || false;
  
  // Check if we're on localhost (development exception)
  result.isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  
  // Determine if the context is valid for voice features
  if (result.isSecure) {
    result.isValid = true;
    result.canProceed = true;
    if (result.protocol === 'https:') {
      result.securityLevel = 'https';
      result.message = 'Secure HTTPS connection detected';
    } else if (result.isLocalhost) {
      result.securityLevel = 'localhost';
      result.message = 'Development environment on localhost (secure context)';
    } else {
      result.securityLevel = 'secure';
      result.message = 'Secure context available';
    }
  } else {
    result.isValid = false;
    if (result.isLocalhost) {
      result.canProceed = true; // Allow on localhost even without HTTPS for development
      result.securityLevel = 'localhost';
      result.message = 'Localhost detected - voice features enabled for development';
      result.recommendation = 'For production, ensure HTTPS is enabled';
    } else {
      result.canProceed = false;
      result.securityLevel = 'insecure';
      result.message = 'HTTPS is required for voice features';
      result.recommendation = `Please access this site via HTTPS: https://${window.location.host}${window.location.pathname}`;
    }
  }

  return result;
}

/**
 * Gets a user-friendly status message for HTTPS requirement
 * 
 * @param {Object} validation - Validation result (optional, will validate if not provided)
 * @returns {Object} Status message with type and content
 */
export function getHTTPSStatusMessage(validation = null) {
  const validationResult = validation || validateHTTPSRequirement();
  
  if (validationResult.canProceed) {
    return {
      type: 'success',
      title: 'Voice Features Available',
      message: validationResult.message,
      showVoiceFeatures: true,
      securityLevel: validationResult.securityLevel
    };
  } else {
    return {
      type: 'warning',
      title: 'Voice Features Unavailable',
      message: validationResult.message,
      recommendation: validationResult.recommendation,
      showVoiceFeatures: false,
      securityLevel: validationResult.securityLevel
    };
  }
}

/**
 * Attempts to redirect to HTTPS version of the current page
 * Only works if not already on HTTPS and not on localhost
 * 
 * @param {boolean} force - Force redirect even on localhost
 * @returns {boolean} Whether redirect was attempted
 */
export function redirectToHTTPS(force = false) {
  const validation = validateHTTPSRequirement();
  
  // Don't redirect if already secure or on localhost (unless forced)
  if (validation.isValid || (validation.isLocalhost && !force)) {
    return false;
  }
  
  // Don't redirect if we're on file:// protocol
  if (window.location.protocol === 'file:') {
    console.warn('Cannot redirect from file:// protocol. Please use a web server.');
    return false;
  }
  
  try {
    const httpsUrl = `https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`;
    console.log('Redirecting to HTTPS:', httpsUrl);
    window.location.href = httpsUrl;
    return true;
  } catch (error) {
    console.error('Failed to redirect to HTTPS:', error);
    return false;
  }
}

/**
 * Monitors HTTPS status changes (useful for service workers or dynamic contexts)
 * 
 * @param {Function} callback - Callback function to receive status updates
 * @returns {Function} Cleanup function to stop monitoring
 */
export function monitorHTTPSStatus(callback) {
  if (typeof callback !== 'function') {
    console.error('monitorHTTPSStatus requires a callback function');
    return () => {};
  }

  // Initial status check
  let lastStatus = validateHTTPSRequirement();
  callback(lastStatus);

  // Set up periodic checking (in case context changes)
  const intervalId = setInterval(() => {
    const currentStatus = validateHTTPSRequirement();
    
    // Check if status changed
    if (currentStatus.isValid !== lastStatus.isValid || 
        currentStatus.protocol !== lastStatus.protocol) {
      lastStatus = currentStatus;
      callback(currentStatus);
    }
  }, 5000); // Check every 5 seconds

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
  };
}

/**
 * Provides setup instructions for enabling HTTPS in development
 * 
 * @returns {Object} Instructions and commands for different environments
 */
export function getHTTPSSetupInstructions() {
  return {
    development: {
      title: 'Development HTTPS Setup',
      options: [
        {
          method: 'Local Development Server',
          description: 'Use a local HTTPS development server',
          steps: [
            'Install a local HTTPS proxy like mkcert',
            'Generate local SSL certificates',
            'Configure your development server for HTTPS',
            'Access your app via https://localhost:port'
          ]
        },
        {
          method: 'Localhost Exception',
          description: 'Voice features work on localhost even without HTTPS',
          steps: [
            'Ensure you\'re accessing via http://localhost:port',
            'Avoid using 127.0.0.1 or other IP addresses',
            'Voice features should work in this secure context'
          ]
        }
      ]
    },
    production: {
      title: 'Production HTTPS Setup',
      description: 'HTTPS is mandatory for voice features in production',
      options: [
        {
          method: 'SSL Certificate',
          description: 'Obtain and configure SSL certificate',
          steps: [
            'Get SSL certificate from a trusted CA',
            'Configure your web server (nginx, Apache, etc.)',
            'Ensure all pages redirect HTTP to HTTPS',
            'Test voice features on HTTPS domain'
          ]
        },
        {
          method: 'CDN/Proxy',
          description: 'Use a service that provides HTTPS',
          steps: [
            'Configure Cloudflare, AWS CloudFront, or similar',
            'Enable HTTPS at the CDN level',
            'Update your application URLs to use HTTPS',
            'Verify secure context is properly detected'
          ]
        }
      ]
    }
  };
}

/**
 * Checks if current browser supports secure context API
 * 
 * @returns {boolean} Whether secure context checking is supported
 */
export function supportsSecureContextAPI() {
  return typeof window !== 'undefined' && 
         typeof window.isSecureContext !== 'undefined';
}

/**
 * Gets detailed security context information for debugging
 * 
 * @returns {Object} Comprehensive security context details
 */
export function getSecurityContextDetails() {
  return {
    isSecureContext: window.isSecureContext || false,
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    port: window.location.port,
    origin: window.location.origin,
    userAgent: navigator.userAgent,
    isLocalhost: ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname),
    supportsSecureContextAPI: supportsSecureContextAPI(),
    timestamp: new Date().toISOString()
  };
}

/**
 * Logs security context information for debugging
 */
export function logSecurityContext() {
  const context = getSecurityContextDetails();
  console.group('🔒 Security Context Information');
  console.log('Secure Context:', context.isSecureContext ? '✅ Yes' : '❌ No');
  console.log('Protocol:', context.protocol);
  console.log('Hostname:', context.hostname);
  console.log('Is Localhost:', context.isLocalhost ? '✅ Yes' : '❌ No');
  console.log('Full Context:', context);
  console.groupEnd();
}

// Export all functions for easy importing
export default {
  validateHTTPSRequirement,
  getHTTPSStatusMessage,
  redirectToHTTPS,
  monitorHTTPSStatus,
  getHTTPSSetupInstructions,
  supportsSecureContextAPI,
  getSecurityContextDetails,
  logSecurityContext
};