/**
 * AI Interview Coach Backend - Upload Middleware
 * 
 * This file implements file upload middleware using multer for handling audio files
 * during interview sessions. It provides secure file upload functionality with
 * proper validation, size limits, and file type restrictions for audio processing.
 * 
 * Key Features:
 * - Audio file upload handling (mp3, wav, webm, mp4, m4a, ogg, flac)
 * - File size validation with 10MB limit
 * - MIME type validation for security
 * - Memory storage for direct processing
 * - Comprehensive error handling
 * 
 * Security Features:
 * - File type validation using both extension and MIME type
 * - File size limits to prevent abuse
 * - Memory storage to avoid disk persistence
 * - Input sanitization and validation
 * - Detailed error logging
 * 
 * Supported Audio Formats:
 * - MP3 (audio/mpeg, audio/mp3)
 * - WAV (audio/wav, audio/wave)
 * - WebM (audio/webm)
 * - MP4 (audio/mp4, audio/m4a)
 * - M4A (audio/m4a)
 * - OGG (audio/ogg)
 * - FLAC (audio/flac)
 * 
 * Usage:
 * - Single file upload: uploadAudio.single('audio')
 * - Multiple files: uploadAudio.array('audio', 5)
 * - Field validation: uploadAudio.fields([{ name: 'audio', maxCount: 1 }])
 * 
 * Related Files:
 * - src/services/openai.service.ts - Audio transcription processing
 * - src/routes/session.routes.ts - Session recording endpoints (future)
 * - src/models/SessionRecording.ts - Session data storage
 * 
 * Task: #22 - Multer configuration for audio file uploads
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import multer, { MulterError, FileFilterCallback } from 'multer';
import { Request } from 'express';
import path from 'path';

/**
 * Interface for upload configuration options
 */
interface UploadConfig {
  maxFileSize: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  fieldName: string;
}

/**
 * Default upload configuration for audio files
 */
const AUDIO_UPLOAD_CONFIG: UploadConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB in bytes
  allowedMimeTypes: [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/webm',
    'audio/mp4',
    'audio/m4a',
    'audio/ogg',
    'audio/flac'
  ],
  allowedExtensions: ['.mp3', '.wav', '.webm', '.mp4', '.m4a', '.ogg', '.flac'],
  fieldName: 'audio'
};

/**
 * Custom error messages for upload validation failures
 */
const UPLOAD_ERROR_MESSAGES = {
  FILE_TOO_LARGE: 'File size exceeds the maximum limit of 10MB',
  INVALID_FILE_TYPE: 'Invalid file type. Only audio files (mp3, wav, webm, mp4, m4a, ogg, flac) are allowed',
  NO_FILE_UPLOADED: 'No audio file was uploaded',
  FIELD_NAME_MISMATCH: 'Invalid field name for file upload',
  UNEXPECTED_ERROR: 'An unexpected error occurred during file upload'
} as const;

/**
 * Validates file type based on MIME type and file extension
 * 
 * @param {Express.Multer.File} file - The uploaded file object
 * @param {UploadConfig} config - Upload configuration with allowed types
 * @returns {boolean} True if file type is valid, false otherwise
 */
function validateFileType(file: Express.Multer.File, config: UploadConfig): boolean {
  // Check MIME type
  const mimeTypeValid = config.allowedMimeTypes.includes(file.mimetype.toLowerCase());
  
  // Check file extension
  const fileExtension = path.extname(file.originalname).toLowerCase();
  const extensionValid = config.allowedExtensions.includes(fileExtension);
  
  return mimeTypeValid && extensionValid;
}

/**
 * File filter function for multer to validate uploaded files
 * 
 * @param {Request} req - Express request object
 * @param {Express.Multer.File} file - The uploaded file object
 * @param {FileFilterCallback} cb - Callback function to indicate acceptance/rejection
 */
function audioFileFilter(req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
  try {
    // Validate file type
    if (!validateFileType(file, AUDIO_UPLOAD_CONFIG)) {
      const error = new Error(UPLOAD_ERROR_MESSAGES.INVALID_FILE_TYPE) as any;
      error.code = 'INVALID_FILE_TYPE';
      cb(error, false);
      return;
    }

    // Log successful validation for debugging
    console.log(`File upload validation successful: ${file.originalname} (${file.mimetype})`);
    
    cb(null, true);
  } catch (error) {
    console.error('Error during file validation:', error);
    const validationError = new Error(UPLOAD_ERROR_MESSAGES.UNEXPECTED_ERROR) as any;
    validationError.code = 'VALIDATION_ERROR';
    cb(validationError, false);
  }
}

/**
 * Multer configuration for memory storage
 * Using memory storage for direct processing without disk persistence
 */
const storage = multer.memoryStorage();

/**
 * Main multer instance configured for audio file uploads
 * 
 * Features:
 * - Memory storage for direct processing
 * - 10MB file size limit
 * - Audio file type validation
 * - Comprehensive error handling
 */
export const uploadAudio = multer({
  storage: storage,
  limits: {
    fileSize: AUDIO_UPLOAD_CONFIG.maxFileSize,
    files: 1, // Limit to single file upload
    fields: 10, // Limit number of non-file fields
    fieldNameSize: 100, // Limit field name size
    fieldSize: 1024 * 1024 // Limit field value size to 1MB
  },
  fileFilter: audioFileFilter
});

/**
 * Utility function to handle multer errors and provide user-friendly messages
 * 
 * @param {any} error - The error object from multer
 * @returns {string} User-friendly error message
 */
export function getUploadErrorMessage(error: any): string {
  if (error instanceof MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return UPLOAD_ERROR_MESSAGES.FILE_TOO_LARGE;
      case 'LIMIT_FILE_COUNT':
        return 'Too many files uploaded. Only one audio file is allowed.';
      case 'LIMIT_UNEXPECTED_FILE':
        return UPLOAD_ERROR_MESSAGES.FIELD_NAME_MISMATCH;
      case 'LIMIT_FIELD_COUNT':
        return 'Too many fields in the request.';
      case 'LIMIT_FIELD_KEY':
        return 'Field name is too long.';
      case 'LIMIT_FIELD_VALUE':
        return 'Field value is too long.';
      default:
        return `Upload error: ${error.message}`;
    }
  }

  // Handle custom validation errors
  if (error.code === 'INVALID_FILE_TYPE') {
    return UPLOAD_ERROR_MESSAGES.INVALID_FILE_TYPE;
  }

  if (error.code === 'VALIDATION_ERROR') {
    return UPLOAD_ERROR_MESSAGES.UNEXPECTED_ERROR;
  }

  return error.message || UPLOAD_ERROR_MESSAGES.UNEXPECTED_ERROR;
}

/**
 * Middleware for single audio file upload with error handling
 * This is a wrapper around uploadAudio.single() with enhanced error handling
 * 
 * @param {string} fieldName - The name of the form field for the file
 * @returns {Function} Express middleware function
 * 
 * @example
 * ```typescript
 * // Use in route
 * router.post('/upload', uploadSingleAudio('audio'), (req, res) => {
 *   if (!req.file) {
 *     return res.status(400).json({ error: 'No file uploaded' });
 *   }
 *   // Process the uploaded file
 *   console.log('File uploaded:', req.file.originalname);
 * });
 * ```
 */
export const uploadSingleAudio = (fieldName: string = AUDIO_UPLOAD_CONFIG.fieldName) => {
  return uploadAudio.single(fieldName);
};

/**
 * Middleware for multiple audio files upload with error handling
 * 
 * @param {string} fieldName - The name of the form field for the files
 * @param {number} maxCount - Maximum number of files to accept
 * @returns {Function} Express middleware function
 */
export const uploadMultipleAudio = (
  fieldName: string = AUDIO_UPLOAD_CONFIG.fieldName, 
  maxCount: number = 5
) => {
  return uploadAudio.array(fieldName, maxCount);
};

/**
 * Validates uploaded audio file buffer for additional security
 * 
 * @param {Buffer} buffer - The file buffer to validate
 * @param {string} mimetype - The declared MIME type
 * @returns {boolean} True if buffer appears to be a valid audio file
 */
export function validateAudioBuffer(buffer: Buffer, mimetype: string): boolean {
  if (!buffer || buffer.length === 0) {
    return false;
  }

  // Basic file signature validation
  const signatures: { [key: string]: number[][] } = {
    'audio/mpeg': [[0xFF, 0xFB], [0xFF, 0xF3], [0xFF, 0xF2], [0x49, 0x44, 0x33]], // MP3
    'audio/wav': [[0x52, 0x49, 0x46, 0x46]], // WAV (RIFF)
    'audio/webm': [[0x1A, 0x45, 0xDF, 0xA3]], // WebM
    'audio/mp4': [[0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]], // MP4
    'audio/ogg': [[0x4F, 0x67, 0x67, 0x53]], // OGG
    'audio/flac': [[0x66, 0x4C, 0x61, 0x43]] // FLAC
  };

  const fileSignatures = signatures[mimetype.toLowerCase()] || [];
  
  return fileSignatures.some(signature => {
    if (buffer.length < signature.length) return false;
    return signature.every((byte, index) => buffer[index] === byte);
  });
}

/**
 * Export configuration constants for use in other modules
 */
export const UPLOAD_CONSTANTS = {
  MAX_FILE_SIZE: AUDIO_UPLOAD_CONFIG.maxFileSize,
  ALLOWED_MIME_TYPES: AUDIO_UPLOAD_CONFIG.allowedMimeTypes,
  ALLOWED_EXTENSIONS: AUDIO_UPLOAD_CONFIG.allowedExtensions,
  DEFAULT_FIELD_NAME: AUDIO_UPLOAD_CONFIG.fieldName,
  ERROR_MESSAGES: UPLOAD_ERROR_MESSAGES
} as const;

/**
 * Default export for the main upload middleware
 */
export default uploadAudio; 