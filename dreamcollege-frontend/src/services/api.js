/**
 * AI Interview Coach Frontend - API Service
 * 
 * Centralized API service for AI rating functionality including
 * interview transcript submission, rating generation, and rating retrieval.
 * Provides consistent error handling, authentication, and response validation.
 * 
 * Features:
 * - Centralized API endpoint management
 * - Automatic authentication header injection
 * - Consistent error handling and user-friendly messages
 * - Response validation and type checking
 * - Retry mechanisms for transient failures
 * - Network timeout handling
 * 
 * Related Files:
 * - src/components/ChatBox.jsx - Main consumer of these API functions
 * - src/components/SettingsPanel.jsx - Displays AI rating results
 * - Backend: src/routes/chat.routes.ts - API endpoints
 * 
 * Task: Step 11 - Frontend API Service Functions
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

// API Configuration
const API_BASE_URL = 'http://localhost:3000';
const API_TIMEOUT = 30000; // 30 seconds

/**
 * Create fetch request with timeout and proper headers
 * @param {string} url - API endpoint URL
 * @param {Object} options - Fetch options
 * @param {string} token - Authentication token
 * @returns {Promise} Fetch promise with timeout
 */
const fetchWithTimeout = (url, options = {}, token = null) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
    signal: controller.signal
  }).finally(() => {
    clearTimeout(timeoutId);
  });
};

/**
 * Handle API response and extract data with error handling
 * @param {Response} response - Fetch response object
 * @returns {Promise<Object>} Parsed response data
 * @throws {Error} API or network errors with user-friendly messages
 */
const handleApiResponse = async (response) => {
  // Handle network errors
  if (!response.ok) {
    let errorMessage = 'An unexpected error occurred';
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorData.message || errorMessage;
    } catch (parseError) {
      // If response is not JSON, use status-based messages
      switch (response.status) {
        case 400:
          errorMessage = 'Invalid request data';
          break;
        case 401:
          errorMessage = 'Authentication required. Please log in again.';
          break;
        case 403:
          errorMessage = 'Access denied. You can only access your own data.';
          break;
        case 404:
          errorMessage = 'Requested data not found';
          break;
        case 429:
          errorMessage = 'AI service is temporarily busy. Please try again in a few moments.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
        case 503:
          errorMessage = 'AI service is temporarily unavailable. Please try again later.';
          break;
        default:
          errorMessage = `Network error (${response.status}). Please check your connection.`;
      }
    }
    
    const error = new Error(errorMessage);
    error.status = response.status;
    error.response = response;
    throw error;
  }

  try {
    const data = await response.json();
    return data;
  } catch (parseError) {
    throw new Error('Invalid response format from server');
  }
};

/**
 * Submit interview transcript when user ends interview
 * 
 * @param {Array} transcript - Array of interview messages
 * @param {Object} context - Interview context (difficulty, user profile, etc.)
 * @param {string} token - User authentication token
 * @returns {Promise<Object>} Response with transcript ID and metadata
 * @throws {Error} Validation, network, or API errors
 * 
 * @example
 * ```javascript
 * const result = await submitInterviewTranscript(
 *   messages,
 *   { difficulty: 'advanced', userProfile: user },
 *   userToken
 * );
 * console.log('Transcript saved with ID:', result.data.transcriptId);
 * ```
 */
export const submitInterviewTranscript = async (transcript, context, token) => {
  // Validate inputs
  if (!transcript || !Array.isArray(transcript) || transcript.length === 0) {
    throw new Error('Interview transcript is required and cannot be empty');
  }

  if (!context) {
    throw new Error('Interview context is required');
  }

  if (!token) {
    throw new Error('Authentication token is required');
  }

  // Validate transcript contains both AI questions and user responses
  const hasUserResponses = transcript.some(msg => msg.sender === 'user');
  const hasAiQuestions = transcript.some(msg => msg.sender === 'ai');

  if (!hasUserResponses) {
    throw new Error('Interview must contain user responses for analysis');
  }

  if (!hasAiQuestions) {
    throw new Error('Interview must contain AI questions for context');
  }

  try {
    console.log('API: Submitting interview transcript', {
      messageCount: transcript.length,
      hasContext: !!context,
      contextKeys: Object.keys(context)
    });

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/chat/end-interview`,
      {
        method: 'POST',
        body: JSON.stringify({
          messages: transcript,
          interviewContext: context
        })
      },
      token
    );

    const data = await handleApiResponse(response);

    // Validate response structure
    if (!data.success || !data.data || !data.data.transcriptId) {
      throw new Error('Invalid response: Missing transcript ID');
    }

    console.log('API: Transcript submitted successfully', {
      transcriptId: data.data.transcriptId,
      status: data.data.status
    });

    return data;

  } catch (error) {
    // Handle specific error types
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    
    console.error('API: Error submitting transcript:', error);
    throw error;
  }
};

/**
 * Generate AI feedback from collected transcript
 * 
 * @param {string} transcriptId - ID of the stored transcript
 * @param {string} token - User authentication token
 * @returns {Promise<Object>} Complete AI feedback report
 * @throws {Error} Validation, network, or API errors
 * 
 * @example
 * ```javascript
 * const rating = await generateAIRating(transcriptId, userToken);
 * console.log('Overall rating:', rating.rating.overallRating);
 * ```
 */
export const generateAIRating = async (transcriptId, token) => {
  // Validate inputs
  if (!transcriptId) {
    throw new Error('Transcript ID is required');
  }

  if (!token) {
    throw new Error('Authentication token is required');
  }

  try {
    console.log('API: Generating AI rating for transcript:', transcriptId);

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/chat/generate-rating`,
      {
        method: 'POST',
        body: JSON.stringify({ transcriptId })
      },
      token
    );

    const data = await handleApiResponse(response);

    // Validate response structure
    if (!data.success || !data.rating) {
      throw new Error('Invalid response: Missing rating data');
    }

    // Validate rating structure
    const rating = data.rating;
    if (typeof rating.overallRating !== 'number' || 
        rating.overallRating < 1 || 
        rating.overallRating > 10) {
      throw new Error('Invalid rating format: Overall rating must be between 1-10');
    }

    console.log('API: AI rating generated successfully', {
      overallRating: rating.overallRating,
      hasStrengths: !!(rating.strengths && rating.strengths.length),
      hasWeaknesses: !!(rating.weaknesses && rating.weaknesses.length),
      hasRecommendations: !!(rating.recommendations && rating.recommendations.length)
    });

    return data;

  } catch (error) {
    // Handle specific error types
    if (error.name === 'AbortError') {
      throw new Error('AI rating generation timed out. This can happen with longer interviews. Please try again.');
    }
    
    // Handle specific API errors with user-friendly messages
    if (error.status === 429) {
      throw new Error('AI service is currently busy analyzing other interviews. Please wait a moment and try again.');
    }
    
    if (error.status === 410) {
      throw new Error('Interview session has expired. Please conduct a new interview to get AI feedback.');
    }
    
    console.error('API: Error generating AI rating:', error);
    throw error;
  }
};

/**
 * Retrieve previously generated AI rating
 * 
 * @param {string} transcriptId - ID of the stored transcript
 * @param {string} token - User authentication token
 * @returns {Promise<Object>} Cached AI feedback report
 * @throws {Error} Validation, network, or API errors
 * 
 * @example
 * ```javascript
 * const cachedRating = await getAIRating(transcriptId, userToken);
 * console.log('Retrieved rating:', cachedRating.rating);
 * ```
 */
export const getAIRating = async (transcriptId, token) => {
  // Validate inputs
  if (!transcriptId) {
    throw new Error('Transcript ID is required');
  }

  if (!token) {
    throw new Error('Authentication token is required');
  }

  try {
    console.log('API: Retrieving AI rating for transcript:', transcriptId);

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/chat/rating/${encodeURIComponent(transcriptId)}`,
      {
        method: 'GET'
      },
      token
    );

    const data = await handleApiResponse(response);

    // Validate response structure
    if (!data.success || !data.rating) {
      throw new Error('Invalid response: Missing rating data');
    }

    console.log('API: AI rating retrieved successfully', {
      transcriptId: data.metadata?.transcriptId,
      generatedAt: data.generatedAt
    });

    return data;

  } catch (error) {
    // Handle specific error types
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    
    if (error.status === 404) {
      throw new Error('Rating not found. The AI feedback may not have been generated yet for this interview.');
    }
    
    console.error('API: Error retrieving AI rating:', error);
    throw error;
  }
};

/**
 * Retry an API call with exponential backoff
 * 
 * @param {Function} apiCall - The API function to retry
 * @param {Array} args - Arguments to pass to the API function
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} Result of the API call
 * @throws {Error} Final error after all retries exhausted
 */
export const retryApiCall = async (apiCall, args, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall(...args);
    } catch (error) {
      lastError = error;
      
      // Don't retry for certain error types
      if (error.status === 400 || // Bad request
          error.status === 401 || // Unauthorized  
          error.status === 403 || // Forbidden
          error.status === 404) { // Not found
        throw error;
      }
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`API: Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

/**
 * Get AI ratings history for the authenticated user
 * 
 * @param {string} token - User authentication token
 * @param {number} limit - Number of ratings to fetch (default: 10)
 * @param {number} offset - Pagination offset (default: 0)
 * @returns {Promise<Object>} Ratings history with statistics
 * @throws {Error} Validation, network, or API errors
 * 
 * @example
 * ```javascript
 * const history = await getAIRatingsHistory(userToken, 10, 0);
 * console.log('Latest rating:', history.data.statistics.latestRating);
 * ```
 */
export const getAIRatingsHistory = async (token, limit = 10, offset = 0) => {
  // Validate inputs
  if (!token) {
    throw new Error('Authentication token is required');
  }

  try {
    console.log('API: Fetching AI ratings history', { limit, offset });

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/chat/ratings/history?limit=${limit}&offset=${offset}`,
      {
        method: 'GET'
      },
      token
    );

    const data = await handleApiResponse(response);

    // Validate response structure
    if (!data.success || !data.data) {
      throw new Error('Invalid response: Missing ratings data');
    }

    console.log('API: AI ratings history retrieved successfully', {
      totalRatings: data.data.statistics?.totalRatings,
      avgRating: data.data.statistics?.averageRating
    });

    return data;

  } catch (error) {
    // Handle specific error types
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    
    console.error('API: Error fetching ratings history:', error);
    throw error;
  }
};

/**
 * Test API connectivity and authentication
 * 
 * @param {string} token - User authentication token (optional)
 * @returns {Promise<Object>} Connection status and user info
 */
export const testApiConnection = async (token = null) => {
  try {
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/chat/test-auth`,
      {
        method: 'GET'
      },
      token
    );

    return await handleApiResponse(response);
  } catch (error) {
    console.error('API: Connection test failed:', error);
    throw error;
  }
};

/**
 * Get user-friendly error message based on error type and context
 * 
 * @param {Error} error - The original error
 * @param {string} context - Context where error occurred ('transcript', 'rating', 'retrieval')
 * @returns {string} User-friendly error message
 */
export const getUserFriendlyErrorMessage = (error, context = 'general') => {
  const message = error.message || 'An unexpected error occurred';
  
  // Handle specific error patterns
  if (message.includes('Authentication') || error.status === 401) {
    return 'Your session has expired. Please log in again to continue.';
  }
  
  if (message.includes('Network') || error.name === 'AbortError') {
    return 'Connection issue detected. Please check your internet and try again.';
  }
  
  if (message.includes('rate limit') || error.status === 429) {
    switch (context) {
      case 'rating':
        return 'AI service is currently busy analyzing other interviews. Please wait 30-60 seconds and try again.';
      case 'transcript':
        return 'Too many requests. Please wait a moment before ending another interview.';
      default:
        return 'Service is temporarily busy. Please wait and try again.';
    }
  }
  
  if (error.status === 503) {
    return 'AI service is temporarily down for maintenance. Please try again later.';
  }
  
  if (message.includes('timeout')) {
    switch (context) {
      case 'rating':
        return 'AI rating generation is taking longer than expected. This can happen with longer interviews. Please try again.';
      default:
        return 'Request timed out. Please try again with a stable connection.';
    }
  }
  
  if (message.includes('too short')) {
    return 'Interview needs at least 2-3 exchanges (questions and answers) for meaningful AI analysis.';
  }
  
  if (message.includes('expired')) {
    return 'Interview session expired. Please conduct a new interview to receive AI feedback.';
  }
  
  // Return the original message if no specific pattern matches
  return message;
};

/**
 * Create a progress indicator for long-running operations
 * 
 * @param {string} operation - Type of operation ('transcript', 'rating')
 * @param {number} step - Current step (1-3)
 * @returns {string} Progress message
 */
export const getProgressMessage = (operation, step = 1) => {
  const messages = {
    transcript: [
      'Collecting interview transcript...',
      'Validating interview content...',
      'Saving transcript for analysis...'
    ],
    rating: [
      'Preparing interview data for AI analysis...',
      'AI is analyzing your responses...',
      'Generating personalized feedback...'
    ]
  };
  
  const operationMessages = messages[operation] || messages.rating;
  const index = Math.min(step - 1, operationMessages.length - 1);
  return operationMessages[index];
};

// Export API configuration for other modules
export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  TIMEOUT: API_TIMEOUT
}; 