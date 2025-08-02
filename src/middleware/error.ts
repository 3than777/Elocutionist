/**
 * AI Interview Coach Backend - Error Handling Middleware
 * 
 * This file implements comprehensive error handling middleware that catches all
 * unhandled errors, logs them with proper context, and returns user-friendly
 * error responses with appropriate HTTP status codes.
 * 
 * Key Features:
 * - Global error catching and processing
 * - Structured error logging with context information
 * - Consistent error response format across all endpoints
 * - Security-conscious error messages (no internal details exposed)
 * - Different error type handling (validation, authentication, database, etc.)
 * - Performance monitoring for error tracking
 * 
 * Error Types Handled:
 * - Validation errors (400 Bad Request)
 * - Authentication errors (401 Unauthorized)
 * - Authorization errors (403 Forbidden)
 * - Resource not found errors (404 Not Found)
 * - Conflict errors (409 Conflict)
 * - Rate limiting errors (429 Too Many Requests)
 * - Database errors (500 Internal Server Error)
 * - Generic server errors (500 Internal Server Error)
 * 
 * Security Features:
 * - No internal error details exposed to clients
 * - Comprehensive logging for debugging without client exposure
 * - Sanitized error messages for production use
 * - Request correlation IDs for error tracking
 * 
 * Related Files:
 * - src/routes/ - Error middleware integration in route definitions
 * - src/controllers/ - Error throwing in business logic
 * - src/services/ - Service layer error handling
 * 
 * Task: #31 - Error handling middleware implementation
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';

/**
 * Interface for structured error response
 * Ensures consistent error format across all endpoints
 */
export interface IErrorResponse {
  error: string;
  message: string;
  details?: string[] | undefined;
  timestamp: string;
  requestId?: string | undefined;
}

/**
 * Interface for error logging context
 * Provides comprehensive information for debugging
 */
interface IErrorContext {
  timestamp: string;
  requestId: string;
  method: string;
  url: string;
  userAgent?: string | undefined;
  ip: string;
  userId?: string | undefined;
  statusCode: number;
  errorType: string;
  errorMessage: string;
  stack?: string | undefined;
  body?: any;
  params?: any;
  query?: any;
}

/**
 * Interface for known error types with specific handling
 */
interface IKnownError extends Error {
  statusCode?: number | undefined;
  code?: string | undefined;
  details?: string[] | undefined;
  isOperational?: boolean | undefined;
}

/**
 * Custom error class for operational errors
 * Used to distinguish between operational and programming errors
 */
export class OperationalError extends Error implements IKnownError {
  public statusCode: number;
  public isOperational: boolean;
  public details?: string[] | undefined;

  constructor(message: string, statusCode: number = 500, details?: string[]) {
    super(message);
    this.name = 'OperationalError';
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;

    // Maintain proper stack trace for V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OperationalError);
    }
  }
}

/**
 * Custom error class for validation errors
 * Specific handling for input validation failures
 */
export class ValidationError extends OperationalError {
  constructor(message: string, details?: string[]) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

/**
 * Custom error class for authentication errors
 * Specific handling for authentication failures
 */
export class AuthenticationError extends OperationalError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Custom error class for authorization errors
 * Specific handling for authorization failures
 */
export class AuthorizationError extends OperationalError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

/**
 * Custom error class for resource not found errors
 * Specific handling for missing resources
 */
export class NotFoundError extends OperationalError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Custom error class for conflict errors
 * Specific handling for resource conflicts
 */
export class ConflictError extends OperationalError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Generates a unique request ID for error tracking
 * 
 * @returns {string} Unique identifier for the request
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Determines the appropriate HTTP status code for an error
 * 
 * @param {Error} error - The error object to analyze
 * @returns {number} HTTP status code
 */
function getErrorStatusCode(error: any): number {
  // Check for explicit status code
  if (error.statusCode && typeof error.statusCode === 'number') {
    return error.statusCode;
  }

  // Handle specific error types
  if (error.name === 'ValidationError') return 400;
  if (error.name === 'AuthenticationError') return 401;
  if (error.name === 'AuthorizationError') return 403;
  if (error.name === 'NotFoundError') return 404;
  if (error.name === 'ConflictError') return 409;
  if (error.name === 'CastError') return 400; // MongoDB invalid ObjectId
  if (error.name === 'MongoError' && error.code === 11000) return 409; // Duplicate key
  if (error.name === 'JsonWebTokenError') return 401;
  if (error.name === 'TokenExpiredError') return 401;

  // Default to 500 for unknown errors
  return 500;
}

/**
 * Determines the error type for logging purposes
 * 
 * @param {Error} error - The error object to analyze
 * @returns {string} Error type classification
 */
function getErrorType(error: any): string {
  if (error.name) return error.name;
  if (error.code) return `Code_${error.code}`;
  return 'UnknownError';
}

/**
 * Creates a user-friendly error message
 * Ensures no internal details are exposed to clients
 * 
 * @param {Error} error - The error object to process
 * @param {number} statusCode - HTTP status code
 * @returns {string} User-friendly error message
 */
function getUserFriendlyMessage(error: any, statusCode: number): string {
  // Use custom message if it's an operational error
  if (error.isOperational && error.message) {
    return error.message;
  }

  // Provide generic messages based on status code for security
  switch (statusCode) {
    case 400:
      return 'Invalid request. Please check your input and try again.';
    case 401:
      return 'Authentication required. Please provide valid credentials.';
    case 403:
      return 'Access denied. You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'A conflict occurred. The resource may already exist.';
    case 429:
      return 'Too many requests. Please try again later.';
    case 500:
    default:
      return 'An internal server error occurred. Please try again later.';
  }
}

/**
 * Logs error with comprehensive context information
 * Provides detailed information for debugging without exposing to clients
 * 
 * @param {IErrorContext} context - Error context information
 */
function logError(context: IErrorContext): void {
  const logEntry = {
    level: 'error',
    timestamp: context.timestamp,
    requestId: context.requestId,
    http: {
      method: context.method,
      url: context.url,
      statusCode: context.statusCode,
      userAgent: context.userAgent,
      ip: context.ip
    },
    user: context.userId ? { id: context.userId } : undefined,
    error: {
      type: context.errorType,
      message: context.errorMessage,
      stack: context.stack
    },
    request: {
      body: context.body,
      params: context.params,
      query: context.query
    }
  };

  // In production, this would typically use a proper logging service like Winston
  console.error('🚨 Error occurred:', JSON.stringify(logEntry, null, 2));
}

/**
 * Main error handling middleware
 * Catches all unhandled errors and provides consistent error responses
 * 
 * @param {Error} error - The error that occurred
 * @param {Request | AuthenticatedRequest} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {void}
 * 
 * @example
 * ```typescript
 * // Usage in Express app
 * app.use(errorHandler);
 * 
 * // In route handlers, just throw errors
 * if (!user) {
 *   throw new NotFoundError('User');
 * }
 * ```
 */
export function errorHandler(
  error: any,
  req: Request | AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Skip if headers already sent
  if (res.headersSent) {
    return next(error);
  }

  // Generate request ID for tracking
  const requestId = generateRequestId();
  
  // Determine error status code
  const statusCode = getErrorStatusCode(error);
  
  // Create error context for logging
  const errorContext: IErrorContext = {
    timestamp: new Date().toISOString(),
    requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    userAgent: req.headers['user-agent'] || undefined,
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userId: (req as AuthenticatedRequest).user?.id,
    statusCode,
    errorType: getErrorType(error),
    errorMessage: error.message || 'Unknown error',
    stack: error.stack,
    body: req.body,
    params: req.params,
    query: req.query
  };

  // Log error with context
  logError(errorContext);

  // Create user-friendly error response
  const errorResponse: IErrorResponse = {
    error: statusCode >= 500 ? 'Internal Server Error' : error.name || 'Error',
    message: getUserFriendlyMessage(error, statusCode),
    ...(error.details && Array.isArray(error.details) && { details: error.details }),
    timestamp: errorContext.timestamp,
    requestId
  };

  // Send error response
  res.status(statusCode).json(errorResponse);
}

/**
 * Handles 404 Not Found errors for undefined routes
 * Should be used as the last middleware before error handler
 * 
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * @returns {void}
 * 
 * @example
 * ```typescript
 * // Usage in Express app (after all routes)
 * app.use(notFoundHandler);
 * app.use(errorHandler);
 * ```
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const error = new NotFoundError(`Route ${req.method} ${req.originalUrl}`);
  next(error);
}

/**
 * Async error wrapper for route handlers
 * Automatically catches async errors and passes them to error middleware
 * 
 * @param {Function} fn - Async route handler function
 * @returns {Function} Wrapped route handler
 * 
 * @example
 * ```typescript
 * // Usage with async route handlers
 * router.get('/users', asyncErrorHandler(async (req, res) => {
 *   const users = await User.find();
 *   res.json(users);
 * }));
 * ```
 */
export function asyncErrorHandler(
  fn: (req: Request | AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request | AuthenticatedRequest, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Default export for the error handler middleware
 */
export default errorHandler; 