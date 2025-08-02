/**
 * AI Interview Coach Backend - Validation Service
 * 
 * This service provides comprehensive validation for file uploads including
 * type validation, size limits, content scanning, and user quota management.
 * It implements security best practices to prevent malicious uploads.
 * 
 * Key Features:
 * - File type and extension validation
 * - File size and total upload size limits
 * - Content scanning for malicious patterns
 * - User quota enforcement
 * - Rate limiting helpers
 * - Sanitization utilities
 * 
 * Related Files:
 * - src/middleware/documentUpload.ts - Upload middleware
 * - src/models/UploadedFile.ts - File metadata storage
 * - src/services/fileProcessing.service.ts - File processing
 * 
 * Task: Phase 4, Step 18 - Implement Comprehensive Validation
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import { Types } from 'mongoose';
import UploadedFile, { IUploadedFile, FILE_TYPES } from '../models/UploadedFile';
import * as fileType from 'file-type';
import * as path from 'path';

/**
 * Interface for validation result
 */
export interface IValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  sanitizedData?: any;
}

/**
 * Interface for file validation options
 */
export interface IFileValidationOptions {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
  scanContent?: boolean;
  checkMagicBytes?: boolean;
}

/**
 * Interface for user quota
 */
export interface IUserQuota {
  maxFiles: number;
  maxTotalSize: number; // in bytes
  maxFileSize: number; // in bytes
  currentFiles: number;
  currentTotalSize: number;
  remainingFiles: number;
  remainingSize: number;
}

/**
 * File upload limits
 */
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_TOTAL_SIZE: 50 * 1024 * 1024, // 50MB total per user
  MAX_FILES_PER_USER: 100,
  MAX_FILES_PER_REQUEST: 10,
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ],
  ALLOWED_EXTENSIONS: [
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.pdf', '.txt', '.docx', '.doc'
  ]
};

/**
 * Malicious content patterns to detect
 */
const MALICIOUS_PATTERNS = [
  /<script[\s\S]*?<\/script>/gi,
  /<iframe[\s\S]*?<\/iframe>/gi,
  /javascript:/gi,
  /data:text\/html/gi,
  /<object[\s\S]*?<\/object>/gi,
  /<embed[\s\S]*?>/gi,
  /on\w+\s*=/gi, // Event handlers
  /eval\s*\(/gi,
  /expression\s*\(/gi
];

/**
 * Validates a file comprehensively
 * 
 * @param {Buffer} fileBuffer - File buffer to validate
 * @param {string} filename - Original filename
 * @param {string} mimeType - Declared MIME type
 * @param {IFileValidationOptions} options - Validation options
 * @returns {Promise<IValidationResult>} Validation result
 */
export async function validateFile(
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
  options: IFileValidationOptions = {}
): Promise<IValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Set default options
  const {
    maxSize = UPLOAD_LIMITS.MAX_FILE_SIZE,
    allowedTypes = UPLOAD_LIMITS.ALLOWED_MIME_TYPES,
    allowedExtensions = UPLOAD_LIMITS.ALLOWED_EXTENSIONS,
    scanContent = true,
    checkMagicBytes = true
  } = options;

  // 1. Check file size
  if (fileBuffer.length > maxSize) {
    errors.push(`File size (${formatFileSize(fileBuffer.length)}) exceeds maximum allowed size (${formatFileSize(maxSize)})`);
  }

  // 2. Validate file extension
  const ext = path.extname(filename).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    errors.push(`File extension '${ext}' is not allowed. Allowed: ${allowedExtensions.join(', ')}`);
  }

  // 3. Validate MIME type
  if (!allowedTypes.includes(mimeType)) {
    errors.push(`File type '${mimeType}' is not allowed. Allowed: ${allowedTypes.join(', ')}`);
  }

  // 4. Check magic bytes (file signature)
  if (checkMagicBytes) {
    try {
      const detectedType = await fileType.fromBuffer(fileBuffer);
      if (detectedType) {
        // Check if detected type matches declared type
        if (detectedType.mime !== mimeType) {
          warnings.push(`Declared MIME type (${mimeType}) doesn't match detected type (${detectedType.mime})`);
          
          // Check if detected type is allowed
          if (!allowedTypes.includes(detectedType.mime)) {
            errors.push(`Detected file type '${detectedType.mime}' is not allowed`);
          }
        }
      } else if (mimeType !== 'text/plain') {
        // Could not detect type for non-text files
        warnings.push('Could not verify file type from content');
      }
    } catch (error) {
      warnings.push('Error checking file type signature');
    }
  }

  // 5. Scan content for malicious patterns
  if (scanContent) {
    const contentValidation = await scanFileContent(fileBuffer, mimeType);
    if (!contentValidation.isValid) {
      errors.push(...contentValidation.errors);
    }
    if (contentValidation.warnings) {
      warnings.push(...contentValidation.warnings);
    }
  }

  // 6. Additional validations based on file type
  const typeSpecificValidation = await validateFileTypeSpecific(fileBuffer, mimeType, filename);
  if (!typeSpecificValidation.isValid) {
    errors.push(...typeSpecificValidation.errors);
  }

  const result: IValidationResult = {
    isValid: errors.length === 0,
    errors
  };
  
  if (warnings.length > 0) {
    result.warnings = warnings;
  }
  
  return result;
}

/**
 * Scans file content for malicious patterns
 * 
 * @param {Buffer} fileBuffer - File buffer to scan
 * @param {string} mimeType - File MIME type
 * @returns {Promise<IValidationResult>} Scan result
 */
async function scanFileContent(fileBuffer: Buffer, mimeType: string): Promise<IValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // For text-based files, check for malicious patterns
  if (mimeType.startsWith('text/') || mimeType.includes('xml') || mimeType.includes('html')) {
    const content = fileBuffer.toString('utf-8');
    
    for (const pattern of MALICIOUS_PATTERNS) {
      if (pattern.test(content)) {
        errors.push(`File contains potentially malicious content: ${pattern.source}`);
      }
    }
  }

  // Check for embedded executables
  const executableSignatures = [
    Buffer.from([0x4D, 0x5A]), // MZ (DOS/Windows executable)
    Buffer.from([0x7F, 0x45, 0x4C, 0x46]), // ELF (Linux executable)
    Buffer.from([0xFE, 0xED, 0xFA, 0xCE]), // Mach-O (macOS executable)
    Buffer.from([0xFE, 0xED, 0xFA, 0xCF]), // Mach-O 64-bit
    Buffer.from([0xCE, 0xFA, 0xED, 0xFE]), // Mach-O (reverse byte order)
    Buffer.from([0xCF, 0xFA, 0xED, 0xFE])  // Mach-O 64-bit (reverse)
  ];

  for (const signature of executableSignatures) {
    if (fileBuffer.subarray(0, signature.length).equals(signature)) {
      errors.push('File appears to be an executable, which is not allowed');
      break;
    }
  }

  const result: IValidationResult = {
    isValid: errors.length === 0,
    errors
  };
  
  if (warnings.length > 0) {
    result.warnings = warnings;
  }
  
  return result;
}

/**
 * Performs file type specific validation
 * 
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} mimeType - MIME type
 * @param {string} filename - Filename
 * @returns {Promise<IValidationResult>} Validation result
 */
async function validateFileTypeSpecific(
  fileBuffer: Buffer,
  mimeType: string,
  filename: string
): Promise<IValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  switch (mimeType) {
    case 'application/pdf':
      // PDF specific validation
      if (!fileBuffer.subarray(0, 5).toString('ascii').startsWith('%PDF-')) {
        errors.push('Invalid PDF file format');
      }
      break;

    case 'image/jpeg':
    case 'image/jpg':
      // JPEG validation
      if (!(fileBuffer[0] === 0xFF && fileBuffer[1] === 0xD8 && fileBuffer[2] === 0xFF)) {
        errors.push('Invalid JPEG file format');
      }
      break;

    case 'image/png':
      // PNG validation
      const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
      if (!fileBuffer.subarray(0, 8).equals(pngSignature)) {
        errors.push('Invalid PNG file format');
      }
      break;

    case 'image/gif':
      // GIF validation
      const gifHeader = fileBuffer.subarray(0, 6).toString('ascii');
      if (!gifHeader.startsWith('GIF87a') && !gifHeader.startsWith('GIF89a')) {
        errors.push('Invalid GIF file format');
      }
      break;

    case 'text/plain':
      // Text file validation
      try {
        const text = fileBuffer.toString('utf-8');
        // Check if it's valid UTF-8
        if (Buffer.from(text, 'utf-8').length !== fileBuffer.length) {
          warnings.push('File may contain non-UTF-8 characters');
        }
      } catch (error) {
        errors.push('File is not valid UTF-8 text');
      }
      break;
  }

  const result: IValidationResult = {
    isValid: errors.length === 0,
    errors
  };
  
  if (warnings.length > 0) {
    result.warnings = warnings;
  }
  
  return result;
}

/**
 * Validates user upload quota
 * 
 * @param {string} userId - User ID
 * @param {number} newFileSize - Size of new file to upload
 * @param {number} newFileCount - Number of new files to upload
 * @returns {Promise<IValidationResult>} Quota validation result
 */
export async function validateUserQuota(
  userId: string,
  newFileSize: number,
  newFileCount: number = 1
): Promise<IValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const quota = await getUserQuota(userId);

    // Check file count limit
    if (quota.currentFiles + newFileCount > quota.maxFiles) {
      errors.push(`Uploading ${newFileCount} file(s) would exceed your file limit of ${quota.maxFiles}. Current: ${quota.currentFiles}`);
    }

    // Check total size limit
    if (quota.currentTotalSize + newFileSize > quota.maxTotalSize) {
      errors.push(`Upload would exceed your storage limit of ${formatFileSize(quota.maxTotalSize)}. Current usage: ${formatFileSize(quota.currentTotalSize)}`);
    }

    // Warnings for approaching limits
    const usagePercent = (quota.currentTotalSize / quota.maxTotalSize) * 100;
    if (usagePercent > 80) {
      warnings.push(`You are using ${usagePercent.toFixed(1)}% of your storage quota`);
    }

    const filePercent = (quota.currentFiles / quota.maxFiles) * 100;
    if (filePercent > 80) {
      warnings.push(`You have used ${quota.currentFiles} of ${quota.maxFiles} allowed files`);
    }

    const result: IValidationResult = {
      isValid: errors.length === 0,
      errors,
      sanitizedData: quota
    };
    
    if (warnings.length > 0) {
      result.warnings = warnings;
    }
    
    return result;

  } catch (error) {
    console.error('Error validating user quota:', error);
    errors.push('Failed to validate user quota');
    return {
      isValid: false,
      errors
    };
  }
}

/**
 * Gets user's current upload quota and usage
 * 
 * @param {string} userId - User ID
 * @returns {Promise<IUserQuota>} User quota information
 */
export async function getUserQuota(userId: string): Promise<IUserQuota> {
  // Get user's current uploads
  const userFiles = await UploadedFile.find({
    userId: new Types.ObjectId(userId)
  }).select('size');

  const currentFiles = userFiles.length;
  const currentTotalSize = userFiles.reduce((sum, file) => sum + (file.size || 0), 0);

  const quota: IUserQuota = {
    maxFiles: UPLOAD_LIMITS.MAX_FILES_PER_USER,
    maxTotalSize: UPLOAD_LIMITS.MAX_TOTAL_SIZE,
    maxFileSize: UPLOAD_LIMITS.MAX_FILE_SIZE,
    currentFiles,
    currentTotalSize,
    remainingFiles: Math.max(0, UPLOAD_LIMITS.MAX_FILES_PER_USER - currentFiles),
    remainingSize: Math.max(0, UPLOAD_LIMITS.MAX_TOTAL_SIZE - currentTotalSize)
  };

  return quota;
}

/**
 * Validates file processing result
 * 
 * @param {string} extractedText - Extracted text content
 * @param {string} fileType - File type
 * @returns {IValidationResult} Content validation result
 */
export function validateProcessedContent(
  extractedText: string,
  fileType: string
): IValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if content was extracted
  if (!extractedText || extractedText.trim().length === 0) {
    errors.push('No text content could be extracted from the file');
  }

  // Check minimum content length
  const minLength = fileType === FILE_TYPES.IMAGE ? 10 : 50;
  if (extractedText && extractedText.trim().length < minLength) {
    warnings.push(`Extracted content is very short (${extractedText.length} characters)`);
  }

  // Check for garbled text (common OCR issue)
  if (extractedText) {
    const nonAsciiRatio = (extractedText.match(/[^\x00-\x7F]/g) || []).length / extractedText.length;
    if (nonAsciiRatio > 0.3) {
      warnings.push('Extracted text contains many non-standard characters, which may indicate OCR issues');
    }
  }

  // Scan extracted content for malicious patterns
  if (extractedText) {
    for (const pattern of MALICIOUS_PATTERNS) {
      if (pattern.test(extractedText)) {
        errors.push('Extracted content contains potentially malicious patterns');
        break;
      }
    }
  }

  const result: IValidationResult = {
    isValid: errors.length === 0,
    errors
  };
  
  if (warnings.length > 0) {
    result.warnings = warnings;
  }
  
  return result;
}

/**
 * Sanitizes filename to prevent path traversal and other attacks
 * 
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove any path components
  const basename = path.basename(filename);
  
  // Replace dangerous characters
  let sanitized = basename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace non-alphanumeric chars
    .replace(/\.{2,}/g, '_') // Replace multiple dots
    .replace(/^\./, '_'); // Don't start with dot
  
  // Ensure it has an extension
  if (!path.extname(sanitized)) {
    sanitized += '.txt';
  }
  
  // Limit length
  const maxLength = 255;
  if (sanitized.length > maxLength) {
    const ext = path.extname(sanitized);
    const nameWithoutExt = sanitized.slice(0, sanitized.length - ext.length);
    sanitized = nameWithoutExt.slice(0, maxLength - ext.length) + ext;
  }
  
  return sanitized;
}

/**
 * Validates request rate limit
 * 
 * @param {string} userId - User ID
 * @param {string} operation - Operation type (e.g., 'upload', 'delete')
 * @param {number} limit - Rate limit
 * @param {number} window - Time window in seconds
 * @returns {Promise<IValidationResult>} Rate limit validation result
 */
export async function validateRateLimit(
  userId: string,
  operation: string,
  limit: number,
  window: number
): Promise<IValidationResult> {
  // This is a placeholder for rate limiting logic
  // In production, you would use Redis or similar for tracking
  const errors: string[] = [];
  const warnings: string[] = [];

  // For now, we'll use a simple in-memory approach
  // In production, use Redis or database-backed rate limiting
  
  // Example: Check recent uploads
  const recentUploads = await UploadedFile.countDocuments({
    userId: new Types.ObjectId(userId),
    uploadedAt: { $gte: new Date(Date.now() - window * 1000) }
  });

  if (recentUploads >= limit) {
    errors.push(`Rate limit exceeded. Maximum ${limit} ${operation}s allowed per ${window} seconds`);
  } else if (recentUploads >= limit * 0.8) {
    warnings.push(`Approaching rate limit: ${recentUploads}/${limit} ${operation}s in the last ${window} seconds`);
  }

  const result: IValidationResult = {
    isValid: errors.length === 0,
    errors
  };
  
  if (warnings.length > 0) {
    result.warnings = warnings;
  }
  
  return result;
}

/**
 * Formats file size for display
 * 
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 