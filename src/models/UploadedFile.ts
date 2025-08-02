/**
 * AI Interview Coach Backend - UploadedFile Model
 * 
 * This file defines the UploadedFile model for storing metadata about user-uploaded
 * documents and images. It tracks file information, processing status, and extracted
 * text content that can be integrated into AI prompts for enhanced interview coaching.
 * 
 * Key Features:
 * - TypeScript interfaces for type safety
 * - Reference to User model for ownership
 * - File metadata storage (name, type, size)
 * - Text extraction tracking and storage
 * - Processing status management
 * - Virtual fields for file URL generation
 * - Instance methods for status checking
 * - Performance indexes for efficient queries
 * 
 * File Processing Lifecycle:
 * 1. File uploaded and metadata stored (status: 'pending')
 * 2. Processing begins (status: 'processing')
 * 3. Text extraction completed (status: 'completed')
 * 4. Or processing fails (status: 'failed')
 * 
 * Related Files:
 * - src/models/User.ts - User reference for ownership
 * - src/services/fileProcessing.service.ts - Text extraction logic
 * - src/middleware/documentUpload.ts - File upload handling
 * - src/routes/upload.routes.ts - Upload endpoints
 * 
 * Task: Phase 1, Step 3 - Create UploadedFile Database Model
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import mongoose, { Document, Schema, Types, Model } from 'mongoose';
import crypto from 'crypto';

/**
 * Enum for file processing status
 * Using const object with 'as const' assertion per .cursorrules
 */
export const PROCESSING_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const;

export type ProcessingStatus = typeof PROCESSING_STATUS[keyof typeof PROCESSING_STATUS];

/**
 * Enum for file types
 * Categorizes uploaded files by their content type
 */
export const FILE_TYPES = {
  IMAGE: 'image',
  PDF: 'pdf',
  TEXT: 'text',
  DOCUMENT: 'document'
} as const;

export type FileType = typeof FILE_TYPES[keyof typeof FILE_TYPES];

/**
 * Interface defining the uploaded file document structure
 * Extends Mongoose Document for type safety
 */
export interface IUploadedFile extends Document {
  // User reference
  userId: Types.ObjectId;
  
  // File metadata
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  fileType: FileType;
  
  // Processing information
  extractedText?: string;
  processingStatus: ProcessingStatus;
  processingError?: string;
  processingDuration?: number; // milliseconds
  
  // Timestamps
  uploadedAt: Date;
  lastAccessedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual fields
  fileUrl?: string;
  
  // Instance methods
  isProcessed(): boolean;
  isProcessing(): boolean;
  hasFailed(): boolean;
  markAsAccessed(): Promise<void>;
  getProcessingStatusDisplay(): string;
}

/**
 * Static methods interface for the model
 */
interface IUploadedFileModel extends Model<IUploadedFile> {
  generateUniqueFilename(originalName: string): string;
  findByUserId(userId: string | Types.ObjectId, options?: {
    status?: ProcessingStatus;
    fileType?: FileType;
    limit?: number;
    offset?: number;
  }): Promise<IUploadedFile[]>;
  cleanupOldFiles(daysOld: number): Promise<number>;
}

/**
 * Mongoose schema definition for the UploadedFile model
 * Implements all fields with proper validation and defaults
 */
const uploadedFileSchema = new Schema<IUploadedFile>(
  {
    // User reference
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true // Index for fast user file queries
    },
    
    // File metadata
    filename: {
      type: String,
      required: [true, 'Filename is required'],
      unique: true,
      trim: true,
      maxlength: [255, 'Filename cannot exceed 255 characters']
    },
    
    originalName: {
      type: String,
      required: [true, 'Original filename is required'],
      trim: true,
      maxlength: [255, 'Original filename cannot exceed 255 characters']
    },
    
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
      trim: true,
      maxlength: [100, 'MIME type cannot exceed 100 characters']
    },
    
    size: {
      type: Number,
      required: [true, 'File size is required'],
      min: [0, 'File size must be non-negative'],
      max: [5 * 1024 * 1024, 'File size cannot exceed 5MB'] // 5MB limit
    },
    
    fileType: {
      type: String,
      required: [true, 'File type is required'],
      enum: Object.values(FILE_TYPES),
      index: true // Index for filtering by file type
    },
    
    // Processing information
    extractedText: {
      type: String,
      default: null,
      maxlength: [500000, 'Extracted text cannot exceed 500,000 characters'] // ~500KB text limit
    },
    
    processingStatus: {
      type: String,
      required: true,
      enum: Object.values(PROCESSING_STATUS),
      default: PROCESSING_STATUS.PENDING,
      index: true // Index for status filtering
    },
    
    processingError: {
      type: String,
      default: null,
      maxlength: [1000, 'Processing error message cannot exceed 1000 characters']
    },
    
    processingDuration: {
      type: Number,
      default: null,
      min: [0, 'Processing duration must be non-negative']
    },
    
    // Timestamps
    uploadedAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true // Index for chronological queries
    },
    
    lastAccessedAt: {
      type: Date,
      default: null
    }
  },
  {
    // Schema options
    timestamps: true, // Automatically manage createdAt and updatedAt
    toJSON: {
      virtuals: true,
      transform: function(doc: any, ret: any) {
        // Remove sensitive fields from JSON output
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Create compound indexes for common query patterns
uploadedFileSchema.index({ userId: 1, uploadedAt: -1 }); // User's files by upload date
uploadedFileSchema.index({ userId: 1, processingStatus: 1 }); // User's files by status
uploadedFileSchema.index({ userId: 1, fileType: 1 }); // User's files by type

/**
 * Virtual field for generating file URL
 * In production, this would generate a signed URL for secure file access
 */
uploadedFileSchema.virtual('fileUrl').get(function(this: IUploadedFile) {
  // TODO: Implement actual file URL generation based on storage solution
  // For now, return a placeholder URL structure
  return `/api/uploads/${this._id}/download`;
});

/**
 * Instance method to check if file processing is completed
 */
uploadedFileSchema.methods.isProcessed = function(): boolean {
  return this.processingStatus === PROCESSING_STATUS.COMPLETED;
};

/**
 * Instance method to check if file is currently being processed
 */
uploadedFileSchema.methods.isProcessing = function(): boolean {
  return this.processingStatus === PROCESSING_STATUS.PROCESSING;
};

/**
 * Instance method to check if file processing has failed
 */
uploadedFileSchema.methods.hasFailed = function(): boolean {
  return this.processingStatus === PROCESSING_STATUS.FAILED;
};

/**
 * Instance method to update last accessed timestamp
 */
uploadedFileSchema.methods.markAsAccessed = async function(): Promise<void> {
  this.lastAccessedAt = new Date();
  await this.save();
};

/**
 * Instance method to get human-readable processing status
 */
uploadedFileSchema.methods.getProcessingStatusDisplay = function(): string {
  const statusDisplayMap: Record<ProcessingStatus, string> = {
    [PROCESSING_STATUS.PENDING]: 'Waiting to process',
    [PROCESSING_STATUS.PROCESSING]: 'Processing file...',
    [PROCESSING_STATUS.COMPLETED]: 'Processing complete',
    [PROCESSING_STATUS.FAILED]: 'Processing failed'
  };
  
  return statusDisplayMap[this.processingStatus as ProcessingStatus] || 'Unknown status';
};

/**
 * Static method to generate unique filename
 * Combines timestamp, random string, and original extension
 */
uploadedFileSchema.statics.generateUniqueFilename = function(originalName: string): string {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = originalName.substring(originalName.lastIndexOf('.'));
  
  return `${timestamp}-${randomString}${extension}`;
};

/**
 * Static method to find files by user ID with optional filters
 */
uploadedFileSchema.statics.findByUserId = async function(
  userId: string | Types.ObjectId,
  options: {
    status?: ProcessingStatus;
    fileType?: FileType;
    limit?: number;
    offset?: number;
  } = {}
): Promise<IUploadedFile[]> {
  const query: any = { userId };
  
  // Apply optional filters
  if (options.status) {
    query.processingStatus = options.status;
  }
  
  if (options.fileType) {
    query.fileType = options.fileType;
  }
  
  // Build query with pagination
  let dbQuery = this.find(query).sort({ uploadedAt: -1 });
  
  if (options.offset) {
    dbQuery = dbQuery.skip(options.offset);
  }
  
  if (options.limit) {
    dbQuery = dbQuery.limit(options.limit);
  }
  
  return dbQuery.exec();
};

/**
 * Static method to cleanup old files
 * Removes files older than specified days
 */
uploadedFileSchema.statics.cleanupOldFiles = async function(daysOld: number): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  const result = await this.deleteMany({
    uploadedAt: { $lt: cutoffDate },
    lastAccessedAt: { $lt: cutoffDate }
  });
  
  return result.deletedCount || 0;
};

// Create and export the model
const UploadedFile = mongoose.model<IUploadedFile, IUploadedFileModel>('UploadedFile', uploadedFileSchema);

export default UploadedFile; 