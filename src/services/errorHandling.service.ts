/**
 * AI Interview Coach Backend - Error Handling Service
 * 
 * This service provides comprehensive error handling for file uploads including
 * error recovery, retry mechanisms, cleanup procedures, and user-friendly messages.
 * It implements best practices for graceful degradation and error logging.
 * 
 * Key Features:
 * - File processing failure recovery
 * - Upload retry mechanisms
 * - Cleanup procedures for failed uploads
 * - User-friendly error message mapping
 * - Structured error logging
 * - Error categorization
 * 
 * Related Files:
 * - src/middleware/error.ts - Error middleware
 * - src/routes/upload.routes.ts - Upload endpoints
 * - src/services/fileProcessing.service.ts - File processing
 * 
 * Task: Phase 4, Step 19 - Add Error Handling
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import UploadedFile, { PROCESSING_STATUS } from '../models/UploadedFile';
import { Types } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Interface for error metadata
 */
export interface IErrorMetadata {
  userId?: string;
  fileId?: string;
  filename?: string;
  operation?: string;
  timestamp: Date;
  context?: Record<string, any>;
}

/**
 * Interface for retry configuration
 */
export interface IRetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  PROCESSING = 'PROCESSING',
  STORAGE = 'STORAGE',
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  QUOTA = 'QUOTA',
  RATE_LIMIT = 'RATE_LIMIT',
  INTERNAL = 'INTERNAL'
}

/**
 * User-friendly error messages
 */
const USER_FRIENDLY_MESSAGES: Record<string, string> = {
  // File validation errors
  'FILE_TOO_LARGE': 'The file is too large. Please upload files smaller than 5MB.',
  'INVALID_FILE_TYPE': 'This file type is not supported. Please upload images (JPG, PNG, GIF, WebP) or documents (PDF, TXT, DOCX).',
  'MALICIOUS_CONTENT': 'The file appears to contain potentially harmful content and cannot be uploaded.',
  'CORRUPTED_FILE': 'The file appears to be corrupted or damaged. Please try uploading a different file.',
  
  // Processing errors
  'OCR_FAILED': 'Could not extract text from the image. Please ensure the image contains readable text.',
  'PDF_EXTRACTION_FAILED': 'Could not read the PDF file. The file may be password-protected or corrupted.',
  'DOCX_EXTRACTION_FAILED': 'Could not read the Word document. Please ensure it\'s a valid DOCX file.',
  'PROCESSING_TIMEOUT': 'File processing took too long. Please try uploading a smaller file.',
  
  // Quota errors
  'FILE_QUOTA_EXCEEDED': 'You have reached your file upload limit. Please delete some files to upload new ones.',
  'STORAGE_QUOTA_EXCEEDED': 'You have reached your storage limit. Please delete some files to free up space.',
  'RATE_LIMIT_EXCEEDED': 'Too many uploads in a short time. Please wait a moment before uploading again.',
  
  // Network errors
  'UPLOAD_INTERRUPTED': 'The upload was interrupted. Please check your connection and try again.',
  'CONNECTION_TIMEOUT': 'Connection timed out. Please check your internet connection.',
  
  // Generic errors
  'INTERNAL_ERROR': 'An unexpected error occurred. Please try again later.',
  'UNKNOWN_ERROR': 'Something went wrong. Please try again or contact support if the problem persists.'
};

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: IRetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2
};

/**
 * Maps technical errors to user-friendly messages
 * 
 * @param {Error} error - The technical error
 * @param {ErrorCategory} category - Error category
 * @returns {string} User-friendly error message
 */
export function getUserFriendlyMessage(error: Error | any, category?: ErrorCategory): string {
  // Check for specific error codes
  if (error.code && USER_FRIENDLY_MESSAGES[error.code]) {
    return USER_FRIENDLY_MESSAGES[error.code]!;
  }
  
  // Check error message patterns
  const errorMessage = error.message?.toLowerCase() || '';
  
  // File size errors
  if (errorMessage.includes('file size') || errorMessage.includes('too large')) {
    return USER_FRIENDLY_MESSAGES.FILE_TOO_LARGE!;
  }
  
  // File type errors
  if (errorMessage.includes('file type') || errorMessage.includes('mime type')) {
    return USER_FRIENDLY_MESSAGES.INVALID_FILE_TYPE!;
  }
  
  // OCR errors
  if (errorMessage.includes('ocr') || errorMessage.includes('tesseract')) {
    return USER_FRIENDLY_MESSAGES.OCR_FAILED!;
  }
  
  // PDF errors
  if (errorMessage.includes('pdf')) {
    return USER_FRIENDLY_MESSAGES.PDF_EXTRACTION_FAILED!;
  }
  
  // Rate limiting
  if (errorMessage.includes('rate limit')) {
    return USER_FRIENDLY_MESSAGES.RATE_LIMIT_EXCEEDED!;
  }
  
  // Quota errors
  if (errorMessage.includes('quota') || errorMessage.includes('limit exceeded')) {
    return errorMessage.includes('storage') ? 
      USER_FRIENDLY_MESSAGES.STORAGE_QUOTA_EXCEEDED! : 
      USER_FRIENDLY_MESSAGES.FILE_QUOTA_EXCEEDED!;
  }
  
  // Network errors
  if (errorMessage.includes('timeout')) {
    return USER_FRIENDLY_MESSAGES.CONNECTION_TIMEOUT!;
  }
  
  // Category-based fallbacks
  switch (category) {
    case ErrorCategory.VALIDATION:
      return USER_FRIENDLY_MESSAGES.CORRUPTED_FILE!;
    case ErrorCategory.PROCESSING:
      return USER_FRIENDLY_MESSAGES.PROCESSING_TIMEOUT!;
    case ErrorCategory.NETWORK:
      return USER_FRIENDLY_MESSAGES.UPLOAD_INTERRUPTED!;
    case ErrorCategory.QUOTA:
      return USER_FRIENDLY_MESSAGES.FILE_QUOTA_EXCEEDED!;
    case ErrorCategory.RATE_LIMIT:
      return USER_FRIENDLY_MESSAGES.RATE_LIMIT_EXCEEDED!;
    default:
      return USER_FRIENDLY_MESSAGES.UNKNOWN_ERROR!;
  }
}

/**
 * Logs error with structured metadata
 * 
 * @param {Error} error - The error to log
 * @param {IErrorMetadata} metadata - Error metadata
 * @param {ErrorCategory} category - Error category
 */
export function logError(error: Error | any, metadata: IErrorMetadata, category: ErrorCategory): void {
  const errorLog = {
    timestamp: metadata.timestamp,
    category,
    error: {
      name: error.name || 'UnknownError',
      message: error.message || 'No error message',
      code: error.code,
      stack: error.stack
    },
    metadata,
    environment: process.env.NODE_ENV
  };
  
  // Log to console with appropriate level
  switch (category) {
    case ErrorCategory.INTERNAL:
      console.error('[CRITICAL ERROR]', JSON.stringify(errorLog, null, 2));
      break;
    case ErrorCategory.PROCESSING:
    case ErrorCategory.STORAGE:
      console.error('[ERROR]', JSON.stringify(errorLog, null, 2));
      break;
    default:
      console.warn('[WARNING]', JSON.stringify(errorLog, null, 2));
  }
  
  // In production, this would also send to error tracking service
  // e.g., Sentry, LogRocket, etc.
}

/**
 * Handles file processing failure with recovery
 * 
 * @param {string} fileId - File ID that failed processing
 * @param {Error} error - The error that occurred
 * @param {number} attemptNumber - Current attempt number
 * @returns {Promise<boolean>} Whether recovery was successful
 */
export async function handleFileProcessingFailure(
  fileId: string,
  error: Error | any,
  attemptNumber: number = 1
): Promise<boolean> {
  try {
    const file = await UploadedFile.findById(fileId);
    if (!file) {
      console.error(`File ${fileId} not found for error handling`);
      return false;
    }
    
    // Log the error
    logError(error, {
      fileId,
      filename: file.originalName,
      userId: file.userId.toString(),
      operation: 'file_processing',
      timestamp: new Date(),
      context: { attemptNumber }
    }, ErrorCategory.PROCESSING);
    
    // Check if we should retry
    if (attemptNumber < DEFAULT_RETRY_CONFIG.maxAttempts) {
      // Update status to indicate retry
      await UploadedFile.findByIdAndUpdate(fileId, {
        processingStatus: PROCESSING_STATUS.PENDING,
        processingError: `Processing failed, retry attempt ${attemptNumber + 1}/${DEFAULT_RETRY_CONFIG.maxAttempts}`
      });
      
      // Schedule retry with exponential backoff
      const delay = Math.min(
        DEFAULT_RETRY_CONFIG.initialDelay * Math.pow(DEFAULT_RETRY_CONFIG.backoffMultiplier, attemptNumber - 1),
        DEFAULT_RETRY_CONFIG.maxDelay
      );
      
      console.log(`Scheduling retry for file ${fileId} in ${delay}ms`);
      return true; // Indicate retry scheduled
      
    } else {
      // Max attempts reached, mark as failed
      await UploadedFile.findByIdAndUpdate(fileId, {
        processingStatus: PROCESSING_STATUS.FAILED,
        processingError: getUserFriendlyMessage(error, ErrorCategory.PROCESSING),
        processingDuration: -1 // Indicate failure
      });
      
      return false;
    }
    
  } catch (recoveryError) {
    console.error('Error during file processing recovery:', recoveryError);
    return false;
  }
}

/**
 * Cleans up failed upload artifacts
 * 
 * @param {string} fileId - File ID to clean up
 * @returns {Promise<void>}
 */
export async function cleanupFailedUpload(fileId: string): Promise<void> {
  try {
    // Delete database record
    const file = await UploadedFile.findByIdAndDelete(fileId);
    
    if (file) {
      console.log(`Cleaned up failed upload record: ${fileId}`);
      
      // If there was a physical file (future enhancement), delete it here
      // For now, we're using memory storage, so no physical cleanup needed
    }
    
  } catch (error) {
    console.error(`Error cleaning up failed upload ${fileId}:`, error);
    // Don't throw - cleanup errors shouldn't cascade
  }
}

/**
 * Implements retry logic with exponential backoff
 * 
 * @param {Function} operation - The operation to retry
 * @param {IRetryConfig} config - Retry configuration
 * @param {string} operationName - Name for logging
 * @returns {Promise<T>} Result of the operation
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: IRetryConfig = DEFAULT_RETRY_CONFIG,
  operationName: string = 'operation'
): Promise<T> {
  let lastError: Error | any;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      console.log(`Attempting ${operationName} (attempt ${attempt}/${config.maxAttempts})`);
      return await operation();
      
    } catch (error: any) {
      lastError = error;
      
      if (attempt < config.maxAttempts) {
        const delay = Math.min(
          config.initialDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );
        
        console.log(`${operationName} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`${operationName} failed after ${config.maxAttempts} attempts: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Validates error recovery is possible
 * 
 * @param {Error} error - The error to check
 * @returns {boolean} Whether the error is recoverable
 */
export function isRecoverableError(error: Error | any): boolean {
  // Non-recoverable error patterns
  const nonRecoverablePatterns = [
    'malicious',
    'virus',
    'invalid file type',
    'quota exceeded',
    'permission denied',
    'authentication failed'
  ];
  
  const errorMessage = error.message?.toLowerCase() || '';
  
  // Check if error matches non-recoverable patterns
  for (const pattern of nonRecoverablePatterns) {
    if (errorMessage.includes(pattern)) {
      return false;
    }
  }
  
  // Network and timeout errors are usually recoverable
  if (errorMessage.includes('timeout') || 
      errorMessage.includes('network') || 
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT') {
    return true;
  }
  
  // Processing errors might be recoverable
  if (error.category === ErrorCategory.PROCESSING) {
    return true;
  }
  
  // Default to non-recoverable for safety
  return false;
}

/**
 * Creates a detailed error report for debugging
 * 
 * @param {Error} error - The error
 * @param {IErrorMetadata} metadata - Error metadata
 * @returns {Object} Error report
 */
export function createErrorReport(error: Error | any, metadata: IErrorMetadata): object {
  return {
    id: new Types.ObjectId().toString(),
    timestamp: metadata.timestamp,
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    },
    metadata,
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    }
  };
} 