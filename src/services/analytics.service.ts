/**
 * AI Interview Coach Backend - Analytics Service
 * 
 * This service provides comprehensive analytics for file uploads including
 * success/failure rates, processing times, content usage tracking, and
 * system resource monitoring. It helps identify trends and optimize performance.
 * 
 * Key Features:
 * - Upload success/failure rate tracking
 * - File processing time analytics
 * - Content usage in AI conversations
 * - User engagement metrics
 * - System resource monitoring
 * - Dashboard data aggregation
 * 
 * Related Files:
 * - src/models/UploadedFile.ts - File metadata
 * - src/routes/upload.routes.ts - Upload endpoints
 * - src/services/contentIntegration.service.ts - Content usage
 * 
 * Task: Phase 4, Step 20 - Create Upload Analytics
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import UploadedFile, { PROCESSING_STATUS, FILE_TYPES } from '../models/UploadedFile';
import { Types } from 'mongoose';

/**
 * Interface for upload metrics
 */
export interface IUploadMetrics {
  totalUploads: number;
  successfulUploads: number;
  failedUploads: number;
  pendingUploads: number;
  successRate: number;
  averageProcessingTime: number;
  totalStorageUsed: number;
  fileTypeDistribution: Record<string, number>;
  processingStatusDistribution: Record<string, number>;
}

/**
 * Interface for time-based analytics
 */
export interface ITimeBasedAnalytics {
  period: 'hour' | 'day' | 'week' | 'month';
  data: {
    timestamp: Date;
    uploads: number;
    successes: number;
    failures: number;
    averageProcessingTime: number;
  }[];
}

/**
 * Interface for user analytics
 */
export interface IUserAnalytics {
  userId: string;
  totalFiles: number;
  totalStorage: number;
  averageFileSize: number;
  mostUsedFileType: string;
  uploadFrequency: number; // uploads per day
  lastUploadDate?: Date;
  contentUsageRate: number; // percentage of files used in chats
}

/**
 * Interface for system performance metrics
 */
export interface ISystemPerformanceMetrics {
  averageProcessingTimeByType: Record<string, number>;
  peakUploadHours: number[];
  errorRateByType: Record<string, number>;
  storageGrowthRate: number; // MB per day
  activeUsers: number;
}

/**
 * Gets overall upload metrics
 * 
 * @param {Date} startDate - Start date for metrics
 * @param {Date} endDate - End date for metrics
 * @returns {Promise<IUploadMetrics>} Upload metrics
 */
export async function getUploadMetrics(
  startDate?: Date,
  endDate?: Date
): Promise<IUploadMetrics> {
  const query: any = {};
  
  if (startDate || endDate) {
    query.uploadedAt = {};
    if (startDate) query.uploadedAt.$gte = startDate;
    if (endDate) query.uploadedAt.$lte = endDate;
  }
  
  // Get all files in the date range
  const files = await UploadedFile.find(query);
  
  // Calculate metrics
  const totalUploads = files.length;
  const successfulUploads = files.filter(f => f.processingStatus === PROCESSING_STATUS.COMPLETED).length;
  const failedUploads = files.filter(f => f.processingStatus === PROCESSING_STATUS.FAILED).length;
  const pendingUploads = files.filter(f => f.processingStatus === PROCESSING_STATUS.PENDING || f.processingStatus === PROCESSING_STATUS.PROCESSING).length;
  
  // Calculate average processing time (only for completed files)
  const completedFiles = files.filter(f => 
    f.processingStatus === PROCESSING_STATUS.COMPLETED && 
    f.processingDuration && 
    f.processingDuration > 0
  );
  
  const averageProcessingTime = completedFiles.length > 0
    ? completedFiles.reduce((sum, f) => sum + (f.processingDuration || 0), 0) / completedFiles.length
    : 0;
  
  // Calculate total storage
  const totalStorageUsed = files.reduce((sum, f) => sum + (f.size || 0), 0);
  
  // File type distribution
  const fileTypeDistribution: Record<string, number> = {};
  files.forEach(f => {
    fileTypeDistribution[f.fileType] = (fileTypeDistribution[f.fileType] || 0) + 1;
  });
  
  // Processing status distribution
  const processingStatusDistribution: Record<string, number> = {};
  files.forEach(f => {
    processingStatusDistribution[f.processingStatus] = (processingStatusDistribution[f.processingStatus] || 0) + 1;
  });
  
  return {
    totalUploads,
    successfulUploads,
    failedUploads,
    pendingUploads,
    successRate: totalUploads > 0 ? (successfulUploads / totalUploads) * 100 : 0,
    averageProcessingTime: Math.round(averageProcessingTime),
    totalStorageUsed,
    fileTypeDistribution,
    processingStatusDistribution
  };
}

/**
 * Gets time-based analytics for uploads
 * 
 * @param {string} period - Time period ('hour', 'day', 'week', 'month')
 * @param {number} count - Number of periods to retrieve
 * @returns {Promise<ITimeBasedAnalytics>} Time-based analytics
 */
export async function getTimeBasedAnalytics(
  period: 'hour' | 'day' | 'week' | 'month',
  count: number = 7
): Promise<ITimeBasedAnalytics> {
  const now = new Date();
  const data: ITimeBasedAnalytics['data'] = [];
  
  // Calculate milliseconds per period
  const periodMs = {
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000
  };
  
  for (let i = count - 1; i >= 0; i--) {
    const startTime = new Date(now.getTime() - (i + 1) * periodMs[period]);
    const endTime = new Date(now.getTime() - i * periodMs[period]);
    
    const periodFiles = await UploadedFile.find({
      uploadedAt: {
        $gte: startTime,
        $lt: endTime
      }
    });
    
    const uploads = periodFiles.length;
    const successes = periodFiles.filter(f => f.processingStatus === PROCESSING_STATUS.COMPLETED).length;
    const failures = periodFiles.filter(f => f.processingStatus === PROCESSING_STATUS.FAILED).length;
    
    const completedWithDuration = periodFiles.filter(f => 
      f.processingStatus === PROCESSING_STATUS.COMPLETED && 
      f.processingDuration && 
      f.processingDuration > 0
    );
    
    const averageProcessingTime = completedWithDuration.length > 0
      ? completedWithDuration.reduce((sum, f) => sum + (f.processingDuration || 0), 0) / completedWithDuration.length
      : 0;
    
    data.push({
      timestamp: endTime,
      uploads,
      successes,
      failures,
      averageProcessingTime: Math.round(averageProcessingTime)
    });
  }
  
  return {
    period,
    data
  };
}

/**
 * Gets analytics for a specific user
 * 
 * @param {string} userId - User ID
 * @returns {Promise<IUserAnalytics>} User analytics
 */
export async function getUserAnalytics(userId: string): Promise<IUserAnalytics> {
  const userFiles = await UploadedFile.find({
    userId: new Types.ObjectId(userId)
  }).sort({ uploadedAt: -1 });
  
  if (userFiles.length === 0) {
    return {
      userId,
      totalFiles: 0,
      totalStorage: 0,
      averageFileSize: 0,
      mostUsedFileType: 'none',
      uploadFrequency: 0,
      contentUsageRate: 0
    };
  }
  
  // Calculate metrics
  const totalFiles = userFiles.length;
  const totalStorage = userFiles.reduce((sum, f) => sum + (f.size || 0), 0);
  const averageFileSize = totalStorage / totalFiles;
  
  // Find most used file type
  const fileTypeCounts: Record<string, number> = {};
  userFiles.forEach(f => {
    fileTypeCounts[f.fileType] = (fileTypeCounts[f.fileType] || 0) + 1;
  });
  
  const fileTypeEntries = Object.entries(fileTypeCounts).sort(([, a], [, b]) => b - a);
  const mostUsedFileType = fileTypeEntries.length > 0 ? fileTypeEntries[0]![0] : 'none';
  
  // Calculate upload frequency
  const firstUpload = userFiles[userFiles.length - 1]?.uploadedAt || new Date();
  const lastUpload = userFiles[0]?.uploadedAt || new Date();
  const daysSinceFirst = Math.max(1, (lastUpload.getTime() - firstUpload.getTime()) / (1000 * 60 * 60 * 24));
  const uploadFrequency = totalFiles / daysSinceFirst;
  
  // Calculate content usage rate (files that have been accessed)
  const accessedFiles = userFiles.filter(f => f.lastAccessedAt).length;
  const contentUsageRate = totalFiles > 0 ? (accessedFiles / totalFiles) * 100 : 0;
  
  return {
    userId,
    totalFiles,
    totalStorage,
    averageFileSize: Math.round(averageFileSize),
    mostUsedFileType,
    uploadFrequency: Math.round(uploadFrequency * 10) / 10,
    lastUploadDate: lastUpload,
    contentUsageRate: Math.round(contentUsageRate)
  };
}

/**
 * Gets system performance metrics
 * 
 * @returns {Promise<ISystemPerformanceMetrics>} System performance metrics
 */
export async function getSystemPerformanceMetrics(): Promise<ISystemPerformanceMetrics> {
  // Get all files from the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentFiles = await UploadedFile.find({
    uploadedAt: { $gte: thirtyDaysAgo }
  });
  
  // Calculate average processing time by file type
  const averageProcessingTimeByType: Record<string, number> = {};
  const processingTimesByType: Record<string, number[]> = {};
  
  recentFiles.forEach(f => {
    if (f.processingStatus === PROCESSING_STATUS.COMPLETED && f.processingDuration && f.processingDuration > 0) {
      if (!processingTimesByType[f.fileType]) {
        processingTimesByType[f.fileType] = [];
      }
      processingTimesByType[f.fileType]!.push(f.processingDuration);
    }
  });
  
  Object.entries(processingTimesByType).forEach(([type, times]) => {
    averageProcessingTimeByType[type] = Math.round(
      times.reduce((sum, t) => sum + t, 0) / times.length
    );
  });
  
  // Find peak upload hours
  const hourCounts: Record<number, number> = {};
  recentFiles.forEach(f => {
    const hour = f.uploadedAt.getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  
  const peakUploadHours = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => parseInt(hour));
  
  // Calculate error rate by file type
  const errorRateByType: Record<string, number> = {};
  const filesByType: Record<string, number> = {};
  const errorsByType: Record<string, number> = {};
  
  recentFiles.forEach(f => {
    filesByType[f.fileType] = (filesByType[f.fileType] || 0) + 1;
    if (f.processingStatus === PROCESSING_STATUS.FAILED) {
      errorsByType[f.fileType] = (errorsByType[f.fileType] || 0) + 1;
    }
  });
  
  Object.keys(filesByType).forEach(type => {
    const fileCount = filesByType[type] || 0;
    const errorCount = errorsByType[type] || 0;
    errorRateByType[type] = fileCount > 0 
      ? Math.round((errorCount / fileCount) * 100)
      : 0;
  });
  
  // Calculate storage growth rate
  const firstDayFiles = recentFiles.filter(f => 
    f.uploadedAt.getTime() >= thirtyDaysAgo.getTime() &&
    f.uploadedAt.getTime() < thirtyDaysAgo.getTime() + 24 * 60 * 60 * 1000
  );
  const lastDayFiles = recentFiles.filter(f => 
    f.uploadedAt.getTime() >= Date.now() - 24 * 60 * 60 * 1000
  );
  
  const firstDayStorage = firstDayFiles.reduce((sum, f) => sum + (f.size || 0), 0);
  const lastDayStorage = lastDayFiles.reduce((sum, f) => sum + (f.size || 0), 0);
  const storageGrowthRate = (lastDayStorage - firstDayStorage) / (1024 * 1024); // MB per day
  
  // Count active users
  const uniqueUserIds = new Set(recentFiles.map(f => f.userId.toString()));
  const activeUsers = uniqueUserIds.size;
  
  return {
    averageProcessingTimeByType,
    peakUploadHours,
    errorRateByType,
    storageGrowthRate: Math.round(storageGrowthRate * 10) / 10,
    activeUsers
  };
}

/**
 * Logs upload event for analytics
 * 
 * @param {string} userId - User ID
 * @param {string} fileId - File ID
 * @param {string} event - Event type (upload, process, access, delete)
 * @param {any} metadata - Additional metadata
 */
export async function logUploadEvent(
  userId: string,
  fileId: string,
  event: 'upload' | 'process' | 'access' | 'delete',
  metadata?: any
): Promise<void> {
  // In production, this would log to an analytics service
  // For now, we'll just log to console with structured format
  const eventLog = {
    timestamp: new Date(),
    userId,
    fileId,
    event,
    metadata,
    environment: process.env.NODE_ENV
  };
  
  console.log('[ANALYTICS]', JSON.stringify(eventLog));
  
  // In production, send to analytics service:
  // - Google Analytics
  // - Mixpanel
  // - Custom analytics database
  // - etc.
}

/**
 * Gets dashboard summary data
 * 
 * @returns {Promise<Object>} Dashboard summary
 */
export async function getDashboardSummary(): Promise<{
  currentMetrics: IUploadMetrics;
  recentActivity: ITimeBasedAnalytics;
  systemPerformance: ISystemPerformanceMetrics;
  topUsers: IUserAnalytics[];
}> {
  // Get current metrics for the last 24 hours
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const currentMetrics = await getUploadMetrics(yesterday);
  
  // Get activity for the last 7 days
  const recentActivity = await getTimeBasedAnalytics('day', 7);
  
  // Get system performance
  const systemPerformance = await getSystemPerformanceMetrics();
  
  // Get top 5 users by storage usage
  const allUsers = await UploadedFile.aggregate([
    {
      $group: {
        _id: '$userId',
        totalStorage: { $sum: '$size' },
        fileCount: { $sum: 1 }
      }
    },
    { $sort: { totalStorage: -1 } },
    { $limit: 5 }
  ]);
  
  const topUsers = await Promise.all(
    allUsers.map(async user => getUserAnalytics(user._id.toString()))
  );
  
  return {
    currentMetrics,
    recentActivity,
    systemPerformance,
    topUsers
  };
} 