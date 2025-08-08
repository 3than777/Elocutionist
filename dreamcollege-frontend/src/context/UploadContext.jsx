/**
 * UploadContext - Global Upload State Management
 * 
 * This context provides centralized state management for file uploads,
 * making upload functionality accessible throughout the application.
 * It wraps the useFileUpload hook and adds additional features like
 * persistent state and cross-component communication.
 */

import React, { createContext, useContext, useEffect, useCallback, useRef } from 'react';
import { useFileUpload } from '../hooks/useFileUpload';

// Create the context
const UploadContext = createContext(null);

/**
 * UploadProvider Component
 * Provides upload state and methods to child components
 */
export function UploadProvider({ children, user }) {
  const fileUpload = useFileUpload();
  const refreshIntervalRef = useRef(null);
  const lastRefreshTimeRef = useRef(null);
  
  // Load files when user changes (login/logout)
  useEffect(() => {
    console.log('[UploadProvider] User changed:', user);
    if (user) {
      console.log('[UploadProvider] User authenticated, loading uploaded files...');
      fileUpload.loadUploadedFiles();
      lastRefreshTimeRef.current = Date.now();
    } else {
      console.log('[UploadProvider] No user, skipping file load');
    }
    
    // Cleanup on unmount
    return () => {
      fileUpload.cleanup();
    };
  }, [user?.id]); // Only re-run when user ID changes
  
  // Automatic refresh functionality
  useEffect(() => {
    if (!user) {
      console.log('[UploadProvider] No user - skipping automatic refresh setup');
      return;
    }
    
    console.log('[UploadProvider] Setting up automatic file refresh...');
    
    // Refresh files with debouncing to prevent excessive API calls
    const refreshFiles = () => {
      const now = Date.now();
      const timeSinceLastRefresh = now - (lastRefreshTimeRef.current || 0);
      const MIN_REFRESH_INTERVAL = 10000; // 10 seconds minimum between refreshes
      
      if (timeSinceLastRefresh < MIN_REFRESH_INTERVAL) {
        console.log('[UploadProvider] Skipping refresh - too soon since last refresh');
        return;
      }
      
      console.log('[UploadProvider] Auto-refreshing files...');
      fileUpload.loadUploadedFiles();
      lastRefreshTimeRef.current = now;
    };
    
    // 1. Page Visibility API - refresh when user returns to tab
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[UploadProvider] Page became visible - checking for file updates');
        refreshFiles();
      }
    };
    
    // 2. Window focus event - refresh when window regains focus
    const handleWindowFocus = () => {
      console.log('[UploadProvider] Window focused - checking for file updates');
      refreshFiles();
    };
    
    // 3. Periodic refresh - check every 30 seconds (when tab is active)
    const startPeriodicRefresh = () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      
      refreshIntervalRef.current = setInterval(() => {
        if (!document.hidden) {
          console.log('[UploadProvider] Periodic refresh triggered');
          refreshFiles();
        }
      }, 30000); // 30 seconds
    };
    
    // 4. Storage event listener - refresh if localStorage changes (indicating potential file changes)
    const handleStorageChange = (event) => {
      // Only refresh if it's a relevant storage change
      if (event.key === 'token' || event.key === 'user' || event.key?.includes('file')) {
        console.log('[UploadProvider] Storage change detected - refreshing files');
        refreshFiles();
      }
    };
    
    // 5. Custom file events - listen for file upload/removal events
    const handleFileUploadComplete = (event) => {
      console.log('[UploadProvider] File upload completed - auto-refreshing files');
      refreshFiles();
    };
    
    const handleFileRemoved = (event) => {
      console.log('[UploadProvider] File removed - auto-refreshing files');
      refreshFiles();
    };
    
    // Set up event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('fileUploadComplete', handleFileUploadComplete);
    window.addEventListener('fileRemoved', handleFileRemoved);
    
    // Start periodic refresh
    startPeriodicRefresh();
    
    // Cleanup function
    return () => {
      console.log('[UploadProvider] Cleaning up automatic refresh...');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('fileUploadComplete', handleFileUploadComplete);
      window.removeEventListener('fileRemoved', handleFileRemoved);
      
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [user?.id, fileUpload.loadUploadedFiles]); // Re-setup when user changes

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