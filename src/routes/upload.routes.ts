/**
 * AI Interview Coach Backend - Upload Routes
 * 
 * This file implements file upload management endpoints for handling document and image uploads,
 * text extraction, and content integration into AI prompts. It provides secure access to upload
 * functionality with proper authentication, validation, and error handling.
 * 
 * Key Features:
 * - Multi-file upload support (up to 10 files)
 * - Asynchronous text extraction from various file types
 * - User file management (list, delete, retrieve content)
 * - Pagination support for file listings
 * - Comprehensive input validation and error handling
 * 
 * API Endpoints:
 * - POST /api/uploads - Upload multiple files
 * - GET /api/uploads - Retrieve user's uploaded files with pagination
 * - DELETE /api/uploads/:fileId - Delete specific uploaded file
 * - GET /api/uploads/:fileId/content - Get processed text content
 * 
 * Security Features:
 * - JWT authentication required for all endpoints
 * - File ownership verification
 * - File type and size validation
 * - Rate limiting ready (can be integrated)
 * 
 * Request/Response Flow:
 * 1. Authenticate user via JWT middleware
 * 2. Validate file uploads or request parameters
 * 3. Process files asynchronously in background
 * 4. Store file metadata and track processing status
 * 5. Return success response with file information
 * 
 * Related Files:
 * - src/models/UploadedFile.ts - File metadata and storage
 * - src/middleware/documentUpload.ts - File upload middleware
 * - src/services/fileProcessing.service.ts - Text extraction service
 * - src/middleware/auth.ts - Authentication middleware
 * 
 * Task: Phase 1, Step 5 - Create Upload Routes
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { 
  uploadDocuments, 
  handleDocumentUploadError,
  validateTotalUploadSize,
  getFileCategory 
} from '../middleware/documentUpload';
import UploadedFile, { 
  IUploadedFile, 
  PROCESSING_STATUS,
  FILE_TYPES
} from '../models/UploadedFile';
import { 
  extractTextFromFile,
  determineFileType
} from '../services/fileProcessing.service';
import { 
  validateFile, 
  validateUserQuota, 
  getUserQuota, 
  sanitizeFilename,
  validateRateLimit,
  validateProcessedContent,
  UPLOAD_LIMITS 
} from '../services/validation.service';
import { 
  handleFileProcessingFailure,
  retryWithBackoff,
  cleanupFailedUpload,
  getUserFriendlyMessage,
  ErrorCategory,
  logError 
} from '../services/errorHandling.service';
import { 
  getUploadMetrics,
  getTimeBasedAnalytics,
  getUserAnalytics,
  getDashboardSummary,
  logUploadEvent
} from '../services/analytics.service';
import { Types } from 'mongoose';

/**
 * Interface for upload response
 */
interface IUploadResponse {
  success: boolean;
  message: string;
  files: Array<{
    id: string;
    originalName: string;
    size: number;
    fileType: string;
    processingStatus: string;
  }>;
}

/**
 * Interface for file list response
 */
interface IFileListResponse {
  success: boolean;
  files: IUploadedFile[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

/**
 * Interface for file content response
 */
interface IFileContentResponse {
  success: boolean;
  file: {
    id: string;
    originalName: string;
    fileType: string;
    extractedText: string | null;
    processingStatus: string;
    wordCount?: number;
  };
}

/**
 * Interface for error response
 */
interface IErrorResponse {
  error: string;
  message: string;
  code?: string;
}

// Create Express router instance
const router = Router();

/**
 * POST /api/uploads
 * 
 * Uploads multiple files for the authenticated user. Files are processed
 * asynchronously to extract text content for AI integration.
 * 
 * @route POST /api/uploads
 * @access Private (requires JWT authentication)
 * @param {Express.Multer.File[]} req.files - Uploaded files (max 10)
 * @returns {IUploadResponse | IErrorResponse} Upload results or error
 */
router.post(
  '/', 
  authenticateToken, 
  uploadDocuments.array('files', 10),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Check if files were uploaded
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'No files were uploaded'
        } as IErrorResponse);
        return;
      }

      const files = req.files as Express.Multer.File[];
      const userId = (req.user!._id as Types.ObjectId).toString();
      
      // Validate rate limit
      const rateLimitValidation = await validateRateLimit(userId, 'upload', 10, 60);
      if (!rateLimitValidation.isValid) {
        res.status(429).json({
          error: 'Too Many Requests',
          message: rateLimitValidation.errors[0],
          code: 'RATE_LIMIT_EXCEEDED'
        } as IErrorResponse);
        return;
      }
      
      // Calculate total size for quota validation
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      
      // Validate user quota
      const quotaValidation = await validateUserQuota(userId, totalSize, files.length);
      if (!quotaValidation.isValid) {
        res.status(403).json({
          error: 'Quota Exceeded',
          message: quotaValidation.errors.join('. '),
          code: 'QUOTA_EXCEEDED',
          quota: quotaValidation.sanitizedData
        } as IErrorResponse & { quota?: any });
        return;
      }
      
      // Validate total upload size
      if (!validateTotalUploadSize(files)) {
        res.status(413).json({
          error: 'Payload Too Large',
          message: 'Total upload size exceeds 50MB limit',
          code: 'TOTAL_SIZE_EXCEEDED'
        } as IErrorResponse);
        return;
      }

      // Process each file
      const uploadResults = await Promise.allSettled(
        files.map(async (file) => {
          // Comprehensive file validation
          const fileValidation = await validateFile(
            file.buffer,
            file.originalname,
            file.mimetype,
            {
              maxSize: UPLOAD_LIMITS.MAX_FILE_SIZE,
              scanContent: true,
              checkMagicBytes: true
            }
          );
          
          if (!fileValidation.isValid) {
            throw new Error(fileValidation.errors.join('; '));
          }
          
          // Sanitize filename
          const sanitizedOriginalName = sanitizeFilename(file.originalname);
          const filename = UploadedFile.generateUniqueFilename(sanitizedOriginalName);
          const fileType = determineFileType(file.mimetype);
          
          // Create file record in database
          const uploadedFile = new UploadedFile({
            userId: req.user!._id as Types.ObjectId,
            filename,
            originalName: sanitizedOriginalName,
            mimeType: file.mimetype,
            size: file.size,
            fileType,
            processingStatus: PROCESSING_STATUS.PENDING
          });
          
          await uploadedFile.save();
          
          // Log upload event
          const fileId = uploadedFile._id as Types.ObjectId;
          await logUploadEvent(userId, fileId.toString(), 'upload', {
            fileType: uploadedFile.fileType,
            size: uploadedFile.size,
            mimeType: uploadedFile.mimeType
          });
          
          // Process file asynchronously (don't await)
          processFileAsync(fileId.toString(), file.buffer).catch(error => {
            console.error(`Failed to process file ${fileId}:`, error);
          });
          
          return {
            id: fileId.toString(),
            originalName: uploadedFile.originalName,
            size: uploadedFile.size,
            fileType: uploadedFile.fileType,
            processingStatus: uploadedFile.processingStatus,
            warnings: fileValidation.warnings
          };
        })
      );
      
      // Collect successful uploads
      const successfulUploads = uploadResults
        .filter((result): result is PromiseFulfilledResult<any> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value);
      
      // Collect failed uploads with user-friendly messages
      const failedUploads = uploadResults
        .filter((result): result is PromiseRejectedResult => 
          result.status === 'rejected'
        )
        .map((result, index) => {
          const error = result.reason;
          const userFriendlyMessage = getUserFriendlyMessage(error, ErrorCategory.VALIDATION);
          
          // Log detailed error
          logError(error, {
            filename: files[index]?.originalname || 'Unknown file',
            userId: userId,
            operation: 'file_upload',
            timestamp: new Date()
          }, ErrorCategory.VALIDATION);
          
          return {
            file: files[index]?.originalname || 'Unknown file',
            error: userFriendlyMessage,
            technicalError: process.env.NODE_ENV === 'development' ? error?.message : undefined
          };
        });
      
      // Clean up failed uploads
      if (failedUploads.length > 0) {
        console.log(`Cleaning up ${failedUploads.length} failed uploads`);
        // Note: Cleanup happens automatically since we only save to DB on success
      }
      
      // Return response with appropriate status
      const allSuccess = failedUploads.length === 0;
      const statusCode = allSuccess ? 201 : 207; // 207 Multi-Status for partial success
      
      res.status(statusCode).json({
        success: allSuccess,
        message: allSuccess 
          ? `Successfully uploaded ${successfulUploads.length} file(s)`
          : `Uploaded ${successfulUploads.length} of ${files.length} file(s)`,
        files: successfulUploads,
        errors: failedUploads.length > 0 ? failedUploads : undefined
      } as IUploadResponse & { errors?: any[] });
      
    } catch (error) {
      console.error('Upload error:', error);
      
      // Handle multer errors
      if (error instanceof Error) {
        const uploadError = handleDocumentUploadError(error);
        res.status(uploadError.status).json({
          error: uploadError.code || 'Upload Error',
          message: uploadError.message
        } as IErrorResponse);
        return;
      }
      
      // Generic error
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to process file upload'
      } as IErrorResponse);
    }
  }
);

/**
 * GET /api/uploads
 * 
 * Retrieves the authenticated user's uploaded files with optional filtering
 * and pagination support.
 * 
 * @route GET /api/uploads
 * @access Private (requires JWT authentication)
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 10, max: 50)
 * @query {string} status - Filter by processing status
 * @query {string} fileType - Filter by file type
 * @returns {IFileListResponse | IErrorResponse} File list or error
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Parse query parameters
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
    const offset = (page - 1) * limit;
    
    const status = req.query.status as string;
    const fileType = req.query.fileType as string;
    
    // Build query options
    const queryOptions: any = {
      limit,
      offset
    };
    
    // Add filters if provided
    if (status && Object.values(PROCESSING_STATUS).includes(status as any)) {
      queryOptions.status = status;
    }
    
    if (fileType && Object.values(FILE_TYPES).includes(fileType as any)) {
      queryOptions.fileType = fileType;
    }
    
    // Get total count for pagination
    const userId = (req.user!._id as Types.ObjectId).toString();
    const totalQuery: any = { userId };
    if (queryOptions.status) totalQuery.processingStatus = queryOptions.status;
    if (queryOptions.fileType) totalQuery.fileType = queryOptions.fileType;
    
    const total = await UploadedFile.countDocuments(totalQuery);
    
    // Get files
    const files = await UploadedFile.findByUserId(userId, queryOptions);
    
    // Calculate pagination info
    const pages = Math.ceil(total / limit);
    
    // Return response
    res.json({
      success: true,
      files,
      pagination: {
        total,
        page,
        limit,
        pages
      }
    } as IFileListResponse);
    
  } catch (error) {
    console.error('Error fetching uploaded files:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve uploaded files'
    } as IErrorResponse);
  }
});

/**
 * DELETE /api/uploads/:fileId
 * 
 * Deletes a specific uploaded file owned by the authenticated user.
 * 
 * @route DELETE /api/uploads/:fileId
 * @access Private (requires JWT authentication)
 * @param {string} fileId - MongoDB ObjectId of the file
 * @returns {Object} Success message or error
 */
router.delete('/:fileId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const fileId = req.params.fileId;
    
    // Validate ObjectId
    if (!fileId || !Types.ObjectId.isValid(fileId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid file ID format'
      } as IErrorResponse);
      return;
    }
    
    // Find and verify ownership
    const file = await UploadedFile.findOne({
      _id: fileId,
      userId: req.user!._id as Types.ObjectId
    });
    
    if (!file) {
      res.status(404).json({
        error: 'Not Found',
        message: 'File not found or access denied'
      } as IErrorResponse);
      return;
    }
    
    // Delete the file
    await file.deleteOne();
    
    // Log delete event
    await logUploadEvent(
      (req.user!._id as Types.ObjectId).toString(), 
      fileId, 
      'delete',
      { 
        filename: file.originalName,
        fileType: file.fileType,
        size: file.size
      }
    );
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete file'
    } as IErrorResponse);
  }
});

/**
 * GET /api/uploads/:fileId/content
 * 
 * Retrieves the processed text content of a specific uploaded file.
 * 
 * @route GET /api/uploads/:fileId/content
 * @access Private (requires JWT authentication)
 * @param {string} fileId - MongoDB ObjectId of the file
 * @returns {IFileContentResponse | IErrorResponse} File content or error
 */
router.get('/:fileId/content', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const fileId = req.params.fileId;
    
    // Validate ObjectId
    if (!fileId || !Types.ObjectId.isValid(fileId)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid file ID format'
      } as IErrorResponse);
      return;
    }
    
    // Find and verify ownership
    const file = await UploadedFile.findOne({
      _id: fileId,
      userId: req.user!._id as Types.ObjectId
    });
    
    if (!file) {
      res.status(404).json({
        error: 'Not Found',
        message: 'File not found or access denied'
      } as IErrorResponse);
      return;
    }
    
    // Mark file as accessed
    await file.markAsAccessed();
    
    // Log access event
    await logUploadEvent(
      (req.user!._id as Types.ObjectId).toString(),
      fileId,
      'access',
      { 
        filename: file.originalName,
        fileType: file.fileType
      }
    );
    
    // Calculate word count if text is available
    let wordCount: number | undefined;
    if (file.extractedText) {
      wordCount = file.extractedText.split(/\s+/).filter(word => word.length > 0).length;
    }
    
    // Return file content
    res.json({
      success: true,
      file: {
        id: (file._id as Types.ObjectId).toString(),
        originalName: file.originalName,
        fileType: file.fileType,
        extractedText: file.extractedText,
        processingStatus: file.processingStatus,
        wordCount
      }
    } as IFileContentResponse);
    
  } catch (error) {
    console.error('Error retrieving file content:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve file content'
    } as IErrorResponse);
  }
});

/**
 * Processes a file asynchronously to extract text content
 * 
 * @param {string} fileId - MongoDB ObjectId of the file
 * @param {Buffer} buffer - File buffer to process
 */
async function processFileAsync(fileId: string, buffer: Buffer, attemptNumber: number = 1): Promise<void> {
  const startTime = Date.now();
  
  try {
    // Update status to processing
    await UploadedFile.findByIdAndUpdate(fileId, {
      processingStatus: PROCESSING_STATUS.PROCESSING
    });
    
    // Get file details
    const file = await UploadedFile.findById(fileId);
    if (!file) {
      throw new Error('File not found');
    }
    
    // Use retry logic for text extraction
    const result = await retryWithBackoff(
      async () => extractTextFromFile(buffer, file.mimeType),
      {
        maxAttempts: 3,
        initialDelay: 1000,
        maxDelay: 5000,
        backoffMultiplier: 2
      },
      `text extraction for ${file.originalName}`
    );
    
    // Validate extracted content
    const contentValidation = validateProcessedContent(result.text, file.fileType);
    if (!contentValidation.isValid) {
      throw new Error(`Content validation failed: ${contentValidation.errors.join('; ')}`);
    }
    
    // Calculate processing duration
    const processingDuration = Date.now() - startTime;
    
    // Update file with extracted text
    await UploadedFile.findByIdAndUpdate(fileId, {
      extractedText: result.text,
      processingStatus: PROCESSING_STATUS.COMPLETED,
      processingDuration,
      // Store warnings if any
      processingError: contentValidation.warnings ? 
        `Warnings: ${contentValidation.warnings.join('; ')}` : undefined
    });
    
    console.log(`Successfully processed file ${fileId} in ${processingDuration}ms`);
    
    // Log processing event
    await logUploadEvent(
      file.userId.toString(),
      fileId,
      'process',
      {
        duration: processingDuration,
        wordCount: result.text.split(/\s+/).filter(word => word.length > 0).length,
        status: 'completed'
      }
    );
    
  } catch (error: any) {
    // Log detailed error
    logError(error, {
      fileId,
      operation: 'file_processing',
      timestamp: new Date(),
      context: { attemptNumber }
    }, ErrorCategory.PROCESSING);
    
    // Handle failure with recovery
    const shouldRetry = await handleFileProcessingFailure(fileId, error, attemptNumber);
    
    if (shouldRetry) {
      // Schedule retry
      const delay = Math.min(1000 * Math.pow(2, attemptNumber - 1), 30000);
      setTimeout(() => {
        processFileAsync(fileId, buffer, attemptNumber + 1).catch(err => {
          console.error(`Retry ${attemptNumber + 1} failed for file ${fileId}:`, err);
        });
      }, delay);
    }
  }
}

// Export router
/**
 * GET /api/uploads/quota
 * 
 * Retrieves the user's upload quota and current usage statistics.
 * 
 * @route GET /api/uploads/quota
 * @access Private (requires JWT authentication)
 * @returns {Object} User quota information
 */
router.get('/quota', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = (req.user!._id as Types.ObjectId).toString();
    const quota = await getUserQuota(userId);
    
    res.status(200).json({
      success: true,
      quota: {
        files: {
          used: quota.currentFiles,
          limit: quota.maxFiles,
          remaining: quota.remainingFiles,
          percentage: Math.round((quota.currentFiles / quota.maxFiles) * 100)
        },
        storage: {
          used: quota.currentTotalSize,
          limit: quota.maxTotalSize,
          remaining: quota.remainingSize,
          percentage: Math.round((quota.currentTotalSize / quota.maxTotalSize) * 100)
        },
        maxFileSize: quota.maxFileSize
      }
    });
    
  } catch (error: any) {
    console.error('Error retrieving user quota:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve quota information'
    } as IErrorResponse);
  }
});

/**
 * GET /api/uploads/analytics
 * 
 * Retrieves upload analytics for the authenticated user.
 * 
 * @route GET /api/uploads/analytics
 * @access Private (requires JWT authentication)
 * @returns {Object} User analytics data
 */
router.get('/analytics', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = (req.user!._id as Types.ObjectId).toString();
    const analytics = await getUserAnalytics(userId);
    
    res.status(200).json({
      success: true,
      analytics
    });
    
  } catch (error: any) {
    console.error('Error retrieving user analytics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve analytics'
    } as IErrorResponse);
  }
});

/**
 * GET /api/uploads/analytics/metrics
 * 
 * Retrieves overall upload metrics (admin only).
 * 
 * @route GET /api/uploads/analytics/metrics
 * @access Private (requires JWT authentication and admin role)
 * @query {string} startDate - Start date for metrics
 * @query {string} endDate - End date for metrics
 * @returns {Object} Upload metrics
 */
router.get('/analytics/metrics', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // TODO: Add admin role check here
    const { startDate, endDate } = req.query;
    
    const metrics = await getUploadMetrics(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    
    res.status(200).json({
      success: true,
      metrics
    });
    
  } catch (error: any) {
    console.error('Error retrieving upload metrics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve metrics'
    } as IErrorResponse);
  }
});

/**
 * GET /api/uploads/analytics/time-series
 * 
 * Retrieves time-based analytics for uploads.
 * 
 * @route GET /api/uploads/analytics/time-series
 * @access Private (requires JWT authentication and admin role)
 * @query {string} period - Time period ('hour', 'day', 'week', 'month')
 * @query {number} count - Number of periods to retrieve
 * @returns {Object} Time-based analytics
 */
router.get('/analytics/time-series', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // TODO: Add admin role check here
    const { period = 'day', count = '7' } = req.query;
    
    const analytics = await getTimeBasedAnalytics(
      period as 'hour' | 'day' | 'week' | 'month',
      parseInt(count as string)
    );
    
    res.status(200).json({
      success: true,
      analytics
    });
    
  } catch (error: any) {
    console.error('Error retrieving time-based analytics:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve time-series data'
    } as IErrorResponse);
  }
});

/**
 * GET /api/uploads/analytics/dashboard
 * 
 * Retrieves dashboard summary data (admin only).
 * 
 * @route GET /api/uploads/analytics/dashboard
 * @access Private (requires JWT authentication and admin role)
 * @returns {Object} Dashboard summary
 */
router.get('/analytics/dashboard', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // TODO: Add admin role check here
    const dashboard = await getDashboardSummary();
    
    res.status(200).json({
      success: true,
      dashboard
    });
    
  } catch (error: any) {
    console.error('Error retrieving dashboard data:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve dashboard data'
    } as IErrorResponse);
  }
});

export default router; 