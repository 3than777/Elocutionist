/**
 * AI Interview Coach Backend - Services Index
 * 
 * This file serves as the central export point for all service modules.
 * Services contain business logic, external API integrations, and complex operations.
 * They implement the separation of concerns and dependency injection patterns.
 * 
 * Service Organization:
 * - AuthService - JWT token generation, password hashing, user validation
 * - OpenAIService - LLM integration for questions, feedback, and transcription
 * - InterviewService - Interview logic, question generation, session management
 * - VoiceAnalysisService - Audio processing, transcription, and vocal metrics
 * - FeedbackService - AI feedback generation and performance analysis
 * 
 * Design Principles:
 * - Functional programming patterns; avoid classes where possible
 * - Pure functions with explicit return types
 * - Dependency injection (services passed as parameters)
 * - Proper error handling with retry logic
 * - Caching strategies for frequently accessed data
 * - Rate limiting and API quota management
 * 
 * External Integrations:
 * - OpenAI API for GPT-4, Whisper transcription, and TTS
 * - MongoDB for data persistence and queries
 * - Third-party APIs for enhanced functionality
 * - File storage services for audio/video content
 * 
 * Performance Optimization:
 * - Streaming for long responses to improve UX
 * - Caching for AI-generated content when appropriate
 * - Retry logic with exponential backoff
 * - Connection pooling for database operations
 * 
 * Related Files:
 * - src/controllers/ - Service consumption in business logic
 * - src/config/ - Configuration for external service connections
 * - .env - Environment variables for API keys and secrets
 * 
 * Task: #3 - Basic folder structure organization, #10 - Auth service implementation
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

// Authentication service exports
export { default as authService } from './auth.service';
export { 
  generateToken, 
  verifyToken, 
  extractTokenFromHeader, 
  generateRefreshToken,
  isTokenExpired 
} from './auth.service';
export type { 
  IJwtPayload, 
  ITokenResult, 
  IVerifyResult, 
  ITokenConfig 
} from './auth.service';

// OpenAI service exports
export { createChatCompletion } from './openai.service';
export { 
  initializeOpenAI,
  getOpenAIClient,
  generateInterviewQuestions,
  analyzeFeedback,
  transcribeAudio,
  validateAudioFile,
  estimateAudioDuration,
  validateOpenAIConnection,
  getAvailableModels,
  createContentAwarePrompt,
  estimateTokens,
  getInterviewPromptTemplate,
  summarizeWithGPT,
  analyzeContentRelevance,
  // Voice optimization exports
  optimizeTextForVoice,
  createVoiceOptimizedPrompt,
  createVoiceOptimizedChatCompletion,
  preprocessVoiceUserMessage,
  estimateSpeechDuration
} from './openai.service';
export type {
  IQuestionGenerationParams,
  IGeneratedQuestion,
  IQuestionGenerationResponse,
  IOpenAIConfig,
  IFeedbackAnalysisParams,
  ITranscriptEntry,
  IFeedbackReport,
  IChatCompletionOptions,
  IContentAwarePromptConfig,
  IPromptTemplate,
  IVoiceOptimizationConfig
} from './openai.service';

// Content Integration service exports
export {
  getUserUploadedContent,
  summarizeContent,
  formatContentForPrompt,
  extractKeyInfo,
  estimateTokenCount,
  selectRelevantContent,
  hasUploadedContent,
  getContentStats
} from './contentIntegration.service';

// Validation service exports
export {
  validateFile,
  validateUserQuota,
  getUserQuota,
  validateProcessedContent,
  sanitizeFilename,
  validateRateLimit,
  UPLOAD_LIMITS
} from './validation.service';
export type {
  IValidationResult,
  IFileValidationOptions,
  IUserQuota
} from './validation.service';

// Error handling service exports
export {
  getUserFriendlyMessage,
  logError,
  handleFileProcessingFailure,
  cleanupFailedUpload,
  retryWithBackoff,
  isRecoverableError,
  createErrorReport,
  ErrorCategory
} from './errorHandling.service';
export type {
  IErrorMetadata,
  IRetryConfig
} from './errorHandling.service';

// Analytics service exports
export {
  getUploadMetrics,
  getTimeBasedAnalytics,
  getUserAnalytics,
  getSystemPerformanceMetrics,
  logUploadEvent,
  getDashboardSummary
} from './analytics.service';
export type {
  IUploadMetrics,
  ITimeBasedAnalytics,
  IUserAnalytics,
  ISystemPerformanceMetrics
} from './analytics.service';

// Voice Analytics service exports
export {
  recordVoiceEvent,
  getVoiceAdoptionMetrics,
  getSpeechRecognitionMetrics,
  getUserPreferencePatterns,
  getVoiceErrorMetrics,
  getVoiceSessionMetrics,
  getVoiceTimeBasedAnalytics,
  getVoiceAnalyticsSummary,
  markVoiceErrorResolved,
  exportVoiceAnalytics
} from './voiceAnalytics.service';
export type {
  IVoiceAdoptionMetrics,
  ISpeechRecognitionMetrics,
  IUserPreferencePatterns,
  IVoiceErrorMetrics,
  IVoiceSessionMetrics,
  IVoiceTimeBasedAnalytics,
  IVoiceAnalyticsSummary
} from './voiceAnalytics.service';

// Future service exports will be added here as they are implemented:
// export { default as interviewService } from './interview.service';
// export { default as voiceAnalysisService } from './voice-analysis.service';
// export { default as feedbackService } from './feedback.service'; 