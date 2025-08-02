/**
 * AI Interview Coach Backend - Document Upload Middleware
 * 
 * This file implements file upload middleware using multer for handling documents and images
 * that users can upload to enhance their interview coaching experience. It provides secure
 * file upload functionality with proper validation, size limits, and file type restrictions.
 * 
 * Key Features:
 * - Multi-file upload support (up to 10 files)
 * - Support for images (JPG, PNG, GIF, WebP)
 * - Support for documents (PDF, TXT, DOCX)
 * - File size validation with 5MB limit per file
 * - MIME type validation for security
 * - Memory storage for direct processing
 * - Comprehensive error handling with specific error codes
 * 
 * Security Features:
 * - File type validation using both extension and MIME type
 * - File size limits to prevent abuse
 * - Memory storage to avoid disk persistence issues
 * - Input sanitization and validation
 * - Detailed error logging
 * 
 * Supported File Formats:
 * - Images: JPG/JPEG, PNG, GIF, WebP
 * - Documents: PDF, TXT, DOCX
 * 
 * Usage:
 * - Multiple files: uploadDocuments.array('files', 10)
 * - Single file: uploadDocuments.single('file')
 * - Field validation: uploadDocuments.fields([{ name: 'files', maxCount: 10 }])
 * 
 * Related Files:
 * - src/services/fileProcessing.service.ts - File content extraction
 * - src/routes/upload.routes.ts - Upload endpoints
 * - src/models/UploadedFile.ts - File metadata storage
 * 
 * Task: Phase 1, Step 1 - Create Document Upload Middleware
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import multer, { MulterError, FileFilterCallback } from 'multer';
import { Request } from 'express';
import path from 'path';

/**
 * Interface for document upload configuration
 */
interface DocumentUploadConfig {
  maxFileSize: number;
  maxFileCount: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  fieldName: string;
}

/**
 * Configuration for document uploads
 * - 5MB max file size
 * - 10 files max per request
 * - Specific allowed file types for security
 */
const DOCUMENT_UPLOAD_CONFIG: DocumentUploadConfig = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxFileCount: 10,
  allowedMimeTypes: [
    // Image formats
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    // Document formats
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/msword' // Legacy DOC support
  ],
  allowedExtensions: [
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.pdf', '.txt', '.docx', '.doc'
  ],
  fieldName: 'files' // Default field name for uploads
};

/**
 * File filter function to validate uploaded files
 * Checks both file extension and MIME type for security
 * 
 * @param {Request} req - Express request object
 * @param {Express.Multer.File} file - Uploaded file object
 * @param {FileFilterCallback} cb - Callback to indicate if file is accepted
 */
function documentFileFilter(
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void {
  try {
    // Extract file extension
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    // Validate file extension
    if (!DOCUMENT_UPLOAD_CONFIG.allowedExtensions.includes(fileExt)) {
      const error = new MulterError('LIMIT_UNEXPECTED_FILE');
      error.message = `Invalid file type. Allowed types: ${DOCUMENT_UPLOAD_CONFIG.allowedExtensions.join(', ')}`;
      error.field = file.fieldname;
      return cb(error as any);
    }
    
    // Validate MIME type
    if (!DOCUMENT_UPLOAD_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
      const error = new MulterError('LIMIT_UNEXPECTED_FILE');
      error.message = `Invalid MIME type: ${file.mimetype}. Allowed types: images (JPG, PNG, GIF, WebP), documents (PDF, TXT, DOCX)`;
      error.field = file.fieldname;
      return cb(error as any);
    }
    
    // Additional validation for specific file types
    if (file.mimetype === 'text/plain' && fileExt !== '.txt') {
      const error = new MulterError('LIMIT_UNEXPECTED_FILE');
      error.message = 'Text file extension does not match MIME type';
      error.field = file.fieldname;
      return cb(error as any);
    }
    
    // File is valid
    cb(null, true);
    
  } catch (error) {
    console.error('Error in document file filter:', error);
    cb(error as any);
  }
}

/**
 * Multer storage configuration
 * Uses memory storage for immediate processing without disk persistence
 */
const documentStorage = multer.memoryStorage();

/**
 * Multer configuration for document uploads
 * Combines storage, file filter, and size limits
 */
const multerConfig: multer.Options = {
  storage: documentStorage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: DOCUMENT_UPLOAD_CONFIG.maxFileSize,
    files: DOCUMENT_UPLOAD_CONFIG.maxFileCount,
    parts: 50, // Limit form parts to prevent abuse
    headerPairs: 100 // Limit header pairs
  }
};

/**
 * Create multer instance for document uploads
 */
const uploadDocuments = multer(multerConfig);

/**
 * Error handling middleware for multer errors
 * Provides user-friendly error messages for upload failures
 * 
 * @param {Error} error - Error object from multer
 * @returns {Object} Formatted error response
 */
export function handleDocumentUploadError(error: Error): {
  status: number;
  message: string;
  code: string;
} {
  if (error instanceof MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return {
          status: 413,
          message: `File too large. Maximum size is ${DOCUMENT_UPLOAD_CONFIG.maxFileSize / (1024 * 1024)}MB per file.`,
          code: 'FILE_TOO_LARGE'
        };
      case 'LIMIT_FILE_COUNT':
        return {
          status: 400,
          message: `Too many files. Maximum ${DOCUMENT_UPLOAD_CONFIG.maxFileCount} files allowed per upload.`,
          code: 'TOO_MANY_FILES'
        };
      case 'LIMIT_UNEXPECTED_FILE':
        return {
          status: 400,
          message: error.message || 'Invalid file type',
          code: 'INVALID_FILE_TYPE'
        };
      case 'LIMIT_PART_COUNT':
        return {
          status: 400,
          message: 'Too many form fields',
          code: 'TOO_MANY_FIELDS'
        };
      default:
        return {
          status: 400,
          message: 'File upload error',
          code: 'UPLOAD_ERROR'
        };
    }
  }
  
  // Generic error handling
  return {
    status: 500,
    message: 'Internal server error during file upload',
    code: 'INTERNAL_ERROR'
  };
}

/**
 * Helper function to validate total upload size
 * Ensures combined size of all files doesn't exceed reasonable limits
 * 
 * @param {Express.Multer.File[]} files - Array of uploaded files
 * @returns {boolean} True if total size is within limits
 */
export function validateTotalUploadSize(files: Express.Multer.File[]): boolean {
  const maxTotalSize = 50 * 1024 * 1024; // 50MB total limit
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  return totalSize <= maxTotalSize;
}

/**
 * Helper function to get file category from MIME type
 * 
 * @param {string} mimeType - File MIME type
 * @returns {string} File category: 'image', 'pdf', 'text', or 'document'
 */
export function getFileCategory(mimeType: string): string {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType === 'application/pdf') {
    return 'pdf';
  }
  if (mimeType === 'text/plain') {
    return 'text';
  }
  if (mimeType.includes('word') || mimeType.includes('document')) {
    return 'document';
  }
  return 'unknown';
}

// Export configured multer instance and utilities
export { uploadDocuments, DOCUMENT_UPLOAD_CONFIG };
export default uploadDocuments; 