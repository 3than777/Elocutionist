/**
 * UploadContext - Global Upload State Management
 * 
 * This context provides centralized state management for file uploads,
 * making upload functionality accessible throughout the application.
 * It wraps the useFileUpload hook and adds additional features like
 * persistent state and cross-component communication.
 */

import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useFileUpload } from '../hooks/useFileUpload';

// Create the context
const UploadContext = createContext(null);

/**
 * UploadProvider Component
 * Provides upload state and methods to child components
 */
export function UploadProvider({ children, user }) {
  const fileUpload = useFileUpload();
  
  // Load files when user changes (login/logout)
  useEffect(() => {
    console.log('[UploadProvider] User changed:', user);
    if (user) {
      console.log('[UploadProvider] User authenticated, loading uploaded files...');
      fileUpload.loadUploadedFiles();
    } else {
      console.log('[UploadProvider] No user, skipping file load');
    }
    
    // Cleanup on unmount
    return () => {
      fileUpload.cleanup();
    };
  }, [user?.id]); // Only re-run when user ID changes

  // Enhanced file stats
  const getFileStats = useCallback(() => {
    const { files } = fileUpload;
    
    const stats = {
      totalFiles: files.length,
      totalSize: files.reduce((sum, file) => sum + (file.size || 0), 0),
      totalWords: files.reduce((sum, file) => {
        if (file.extractedText) {
          return sum + file.extractedText.split(/\s+/).filter(w => w).length;
        }
        return sum;
      }, 0),
      byType: {},
      byStatus: {},
      completedFiles: files.filter(f => f.processingStatus === 'completed').length,
      failedFiles: files.filter(f => f.processingStatus === 'failed').length,
      processingFiles: files.filter(f => 
        f.processingStatus === 'pending' || f.processingStatus === 'processing'
      ).length
    };

    // Count by type
    files.forEach(file => {
      stats.byType[file.fileType] = (stats.byType[file.fileType] || 0) + 1;
      stats.byStatus[file.processingStatus] = (stats.byStatus[file.processingStatus] || 0) + 1;
    });

    return stats;
  }, [fileUpload.files]);

  // Get files by status
  const getFilesByStatus = useCallback((status) => {
    return fileUpload.files.filter(file => file.processingStatus === status);
  }, [fileUpload.files]);

  // Get files by type
  const getFilesByType = useCallback((type) => {
    return fileUpload.files.filter(file => file.fileType === type);
  }, [fileUpload.files]);

  // Check if any files are uploading or processing
  const isProcessing = useCallback(() => {
    return fileUpload.uploading || fileUpload.files.some(file => 
      file.processingStatus === 'pending' || file.processingStatus === 'processing'
    );
  }, [fileUpload.uploading, fileUpload.files]);

  // Get all extracted text combined
  const getAllExtractedText = useCallback(() => {
    return fileUpload.files
      .filter(file => file.extractedText && file.processingStatus === 'completed')
      .map(file => ({
        fileId: file.id || file._id,
        fileName: file.originalName,
        text: file.extractedText,
        wordCount: file.extractedText.split(/\s+/).filter(w => w).length
      }));
  }, [fileUpload.files]);

  // Check if user has uploaded any files
  const hasUploadedFiles = useCallback(() => {
    return fileUpload.files.length > 0;
  }, [fileUpload.files]);

  // Refresh files manually
  const refreshFiles = useCallback(() => {
    if (user) {
      console.log('Manually refreshing uploaded files...');
      fileUpload.loadUploadedFiles();
    }
  }, [user, fileUpload.loadUploadedFiles]);

  // Enhanced context value
  const contextValue = {
    // All original fileUpload properties and methods
    ...fileUpload,
    
    // Additional enhanced methods
    getFileStats,
    getFilesByStatus,
    getFilesByType,
    isProcessing,
    getAllExtractedText,
    hasUploadedFiles,
    refreshFiles,
    
    // Convenience getters
    uploadedFiles: fileUpload.files,
    isUploading: fileUpload.uploading,
    uploadErrors: fileUpload.errors,
    hasErrors: fileUpload.errors.length > 0
  };

  return (
    <UploadContext.Provider value={contextValue}>
      {children}
    </UploadContext.Provider>
  );
}

/**
 * Custom hook to use the upload context
 * Throws error if used outside of UploadProvider
 */
export function useUploadContext() {
  const context = useContext(UploadContext);
  
  if (!context) {
    throw new Error('useUploadContext must be used within an UploadProvider');
  }
  
  return context;
}

// Export the context for advanced use cases
export { UploadContext }; 