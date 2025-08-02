/**
 * AI Interview Coach Backend - Middleware Index
 * 
 * This file serves as the central export point for all middleware functions.
 * Middleware handles cross-cutting concerns like authentication, validation,
 * error handling, logging, and request preprocessing.
 * 
 * Middleware Organization:
 * - Authentication - JWT token validation and user context
 * - Validation - Request body and parameter validation
 * - Error Handling - Global error processing and logging
 * - Rate Limiting - API request throttling and abuse prevention
 * - Logging - Request/response logging and performance monitoring
 * - File Upload - Multer configuration for audio/video processing
 * 
 * Design Principles:
 * - Functional middleware patterns over class-based
 * - Explicit type definitions for request/response objects
 * - Proper error propagation to error handling middleware
 * - Security-first approach with input sanitization
 * - Performance monitoring and request correlation IDs
 * 
 * Security Features:
 * - JWT token verification with proper error handling
 * - Input validation to prevent injection attacks
 * - Rate limiting on authentication and resource-intensive endpoints
 * - CORS configuration for secure cross-origin requests
 * - Request sanitization and data validation
 * 
 * Error Handling:
 * - Structured error logging with context
 * - User-friendly error messages without internal details
 * - Proper HTTP status code mapping
 * - Error correlation and tracking
 * 
 * Related Files:
 * - src/routes/ - Middleware integration in route definitions
 * - src/services/ - Service layer for authentication logic
 * - src/controllers/ - Error handling in business logic
 * 
 * Task: #3 - Basic folder structure organization, #11 - Auth middleware implementation
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

// Authentication middleware exports
export { default as authMiddleware } from './auth';
export { 
  authenticateToken, 
  optionalAuth, 
  requireRoles 
} from './auth';
export type { 
  AuthenticatedRequest 
} from './auth';

// File upload middleware exports
export {
  uploadAudio,
  uploadSingleAudio,
  uploadMultipleAudio,
  getUploadErrorMessage,
  validateAudioBuffer,
  UPLOAD_CONSTANTS
} from './upload';

// Document upload middleware exports
export {
  uploadDocuments,
  handleDocumentUploadError,
  validateTotalUploadSize,
  getFileCategory,
  DOCUMENT_UPLOAD_CONFIG
} from './documentUpload';

// Error handling middleware exports
export { default as errorHandler } from './error';
export {
  errorHandler as errorMiddleware,
  notFoundHandler,
  asyncErrorHandler,
  OperationalError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError
} from './error';
export type { IErrorResponse } from './error';

// Future middleware exports will be added here as they are implemented:
// export { default as validateRequest } from './validation';
// export { default as rateLimiter } from './rate-limit'; 