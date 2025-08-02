/**
 * useFileUpload Hook - File Upload Management
 * 
 * This custom React hook manages file upload functionality including:
 * - Multiple file selection and validation
 * - Upload progress tracking
 * - Processing status monitoring
 * - Error handling and retry logic
 * - File removal capabilities
 * 
 * @returns {Object} Upload state and methods
 */

import { useState, useCallback, useRef } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// File type configurations matching backend
const ALLOWED_FILE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc']
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 10;
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total

export function useFileUpload() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [errors, setErrors] = useState([]);
  const pollingIntervals = useRef({});

  /**
   * Validates a single file
   */
  const validateFile = useCallback((file) => {
    const errors = [];
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`${file.name}: File size exceeds 5MB limit`);
    }
    
    // Check file type
    const isValidType = Object.keys(ALLOWED_FILE_TYPES).includes(file.type);
    if (!isValidType) {
      errors.push(`${file.name}: Invalid file type`);
    }
    
    return errors;
  }, []);

  /**
   * Validates multiple files
   */
  const validateFiles = useCallback((newFiles) => {
    const errors = [];
    
    // Check file count
    if (files.length + newFiles.length > MAX_FILES) {
      errors.push(`Cannot upload more than ${MAX_FILES} files total`);
    }
    
    // Check total size
    const currentSize = files.reduce((sum, f) => sum + f.size, 0);
    const newSize = newFiles.reduce((sum, f) => sum + f.size, 0);
    if (currentSize + newSize > MAX_TOTAL_SIZE) {
      errors.push('Total upload size exceeds 50MB limit');
    }
    
    // Validate each file
    newFiles.forEach(file => {
      const fileErrors = validateFile(file);
      errors.push(...fileErrors);
    });
    
    return errors;
  }, [files, validateFile]);

  /**
   * Polls for file processing status
   */
  const pollProcessingStatus = useCallback(async (fileId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/uploads/${fileId}/content`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update file status
        setFiles(prevFiles => 
          prevFiles.map(f => 
            f.id === fileId 
              ? { ...f, processingStatus: data.file.processingStatus, extractedText: data.file.extractedText }
              : f
          )
        );
        
        // Stop polling if processing is complete or failed
        if (data.file.processingStatus === 'completed' || data.file.processingStatus === 'failed') {
          clearInterval(pollingIntervals.current[fileId]);
          delete pollingIntervals.current[fileId];
        }
      }
    } catch (error) {
      console.error('Error polling status:', error);
    }
  }, []);

  /**
   * Uploads files to the backend
   */
  const uploadFiles = useCallback(async (filesToUpload) => {
    setUploading(true);
    setErrors([]);
    
    // Validate files
    const validationErrors = validateFiles(filesToUpload);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setUploading(false);
      return;
    }
    
    try {
      const formData = new FormData();
      filesToUpload.forEach(file => {
        formData.append('files', file);
      });
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/uploads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      const data = await response.json();
      
      // Add uploaded files to state with metadata
      const newFiles = data.files.map((uploadedFile, index) => ({
        ...uploadedFile,
        file: filesToUpload[index],
        uploadedAt: new Date().toISOString()
      }));
      
      setFiles(prevFiles => [...prevFiles, ...newFiles]);
      
      // Start polling for processing status
      newFiles.forEach(file => {
        if (file.processingStatus === 'pending' || file.processingStatus === 'processing') {
          pollingIntervals.current[file.id] = setInterval(() => {
            pollProcessingStatus(file.id);
          }, 2000); // Poll every 2 seconds
        }
      });
      
    } catch (error) {
      console.error('Upload error:', error);
      setErrors([error.message || 'Failed to upload files']);
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  }, [validateFiles, pollProcessingStatus]);

  /**
   * Removes a file (both locally and from server)
   */
  const removeFile = useCallback(async (fileId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/uploads/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete file');
      }
      
      // Stop polling if active
      if (pollingIntervals.current[fileId]) {
        clearInterval(pollingIntervals.current[fileId]);
        delete pollingIntervals.current[fileId];
      }
      
      // Remove from state
      setFiles(prevFiles => prevFiles.filter(f => f.id !== fileId));
      
    } catch (error) {
      console.error('Error removing file:', error);
      setErrors([error.message || 'Failed to remove file']);
    }
  }, []);

  /**
   * Retries a failed upload
   */
  const retryUpload = useCallback((fileId) => {
    const file = files.find(f => f.id === fileId);
    if (file && file.file) {
      // Remove the failed file
      setFiles(prevFiles => prevFiles.filter(f => f.id !== fileId));
      // Re-upload
      uploadFiles([file.file]);
    }
  }, [files, uploadFiles]);

  /**
   * Loads existing uploaded files from server
   */
  const loadUploadedFiles = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('[loadUploadedFiles] Token present:', !!token);
      
      if (!token) {
        console.log('[loadUploadedFiles] No token found, skipping file load');
        return;
      }
      
      const response = await fetch(`${API_BASE_URL}/uploads`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('[loadUploadedFiles] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[loadUploadedFiles] Loaded files:', data.files.length);
        setFiles(data.files);
        
        // Start polling for any files still processing
        data.files.forEach(file => {
          if (file.processingStatus === 'pending' || file.processingStatus === 'processing') {
            pollingIntervals.current[file.id] = setInterval(() => {
              pollProcessingStatus(file.id);
            }, 2000);
          }
        });
      } else {
        console.error('[loadUploadedFiles] Failed to load files:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('[loadUploadedFiles] Error loading files:', error);
    }
  }, [pollProcessingStatus]);

  /**
   * Clears all errors
   */
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  /**
   * Clean up polling intervals on unmount
   */
  const cleanup = useCallback(() => {
    Object.values(pollingIntervals.current).forEach(interval => {
      clearInterval(interval);
    });
    pollingIntervals.current = {};
  }, []);

  return {
    files,
    uploading,
    uploadProgress,
    errors,
    uploadFiles,
    removeFile,
    retryUpload,
    loadUploadedFiles,
    clearErrors,
    cleanup,
    // Expose validation for external use
    validateFile,
    validateFiles,
    // Constants
    MAX_FILE_SIZE,
    MAX_FILES,
    MAX_TOTAL_SIZE,
    ALLOWED_FILE_TYPES
  };
} 