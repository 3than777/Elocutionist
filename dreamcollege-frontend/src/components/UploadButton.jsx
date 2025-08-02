/**
 * UploadButton Component - Advanced File Upload Interface
 * 
 * This component provides a comprehensive file upload experience with:
 * - Drag-and-drop functionality
 * - Multiple file selection
 * - File validation and preview
 * - Upload progress tracking
 * - Processing status display
 * - Error handling and retry capabilities
 */

import React, { useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useFileUpload } from '../hooks/useFileUpload';

// File type icons
const FILE_ICONS = {
  image: '🖼️',
  pdf: '📄',
  text: '📝',
  document: '📋',
  default: '📎'
};

// Processing status colors
const STATUS_COLORS = {
  pending: '#ffa500',
  processing: '#007bff',
  completed: '#28a745',
  failed: '#dc3545'
};

export default function UploadButton() {
  const {
    files,
    uploading,
    errors,
    uploadFiles,
    removeFile,
    retryUpload,
    loadUploadedFiles,
    clearErrors,
    cleanup,
    ALLOWED_FILE_TYPES,
    MAX_FILE_SIZE,
    MAX_FILES
  } = useFileUpload();

  // Load existing files on mount
  useEffect(() => {
    loadUploadedFiles();
    return cleanup;
  }, [loadUploadedFiles, cleanup]);

  // Handle file drop/selection
  const onDrop = useCallback((acceptedFiles) => {
    clearErrors();
    uploadFiles(acceptedFiles);
  }, [uploadFiles, clearErrors]);

  // Configure dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: Object.keys(ALLOWED_FILE_TYPES).reduce((acc, mimeType) => {
      acc[mimeType] = ALLOWED_FILE_TYPES[mimeType];
      return acc;
    }, {}),
    maxSize: MAX_FILE_SIZE,
    maxFiles: MAX_FILES,
    disabled: uploading
  });

  // Get file icon based on type
  const getFileIcon = (fileType) => {
    return FILE_ICONS[fileType] || FILE_ICONS.default;
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Get status display text
  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Waiting...';
      case 'processing': return 'Processing...';
      case 'completed': return 'Ready';
      case 'failed': return 'Failed';
      default: return status;
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Drag and Drop Zone */}
      <div
        {...getRootProps()}
        style={{
          border: `2px dashed ${isDragActive ? '#007bff' : '#ccc'}`,
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: isDragActive ? '#f0f8ff' : '#fafafa',
          cursor: uploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          opacity: uploading ? 0.6 : 1
        }}
      >
        <input {...getInputProps()} />
        
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>
          {uploading ? '⏳' : '📤'}
        </div>
        
        <p style={{ margin: '0 0 10px 0', fontWeight: '500' }}>
          {isDragActive
            ? 'Drop files here...'
            : uploading
            ? 'Uploading...'
            : 'Drag & drop files here, or click to select'}
        </p>
        
        <p style={{ 
          margin: '0', 
          fontSize: '12px', 
          color: '#666' 
        }}>
          Supports: Images (JPG, PNG, GIF, WebP), Documents (PDF, TXT, DOCX)
        </p>
        <p style={{ 
          margin: '5px 0 0 0', 
          fontSize: '12px', 
          color: '#666' 
        }}>
          Max {MAX_FILES} files, {formatFileSize(MAX_FILE_SIZE)} each
        </p>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div style={{
          marginTop: '10px',
          padding: '10px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          fontSize: '14px',
          color: '#c00'
        }}>
          {errors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </div>
      )}

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div style={{ marginTop: '15px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '600' }}>
            Uploaded Files ({files.length})
          </h4>
          
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '8px' 
          }}>
            {files.map((file) => (
              <div
                key={file.id || file.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #dee2e6',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                {/* File Icon */}
                <span style={{ 
                  fontSize: '20px', 
                  marginRight: '10px' 
                }}>
                  {getFileIcon(file.fileType)}
                </span>

                {/* File Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500' }}>
                    {file.originalName}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#666',
                    marginTop: '2px'
                  }}>
                    {formatFileSize(file.size)}
                    {file.extractedText && 
                      ` • ${file.extractedText.split(/\s+/).filter(w => w).length} words`
                    }
                  </div>
                </div>

                {/* Processing Status */}
                <div style={{
                  marginRight: '10px',
                  padding: '4px 8px',
                  backgroundColor: STATUS_COLORS[file.processingStatus] + '20',
                  color: STATUS_COLORS[file.processingStatus],
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {getStatusText(file.processingStatus)}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '5px' }}>
                  {file.processingStatus === 'failed' && (
                    <button
                      onClick={() => retryUpload(file.id)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        border: '1px solid #007bff',
                        backgroundColor: '#fff',
                        color: '#007bff',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      title="Retry upload"
                    >
                      🔄
                    </button>
                  )}
                  
                  <button
                    onClick={() => removeFile(file.id)}
                    style={{
                      padding: '4px 8px',
                      fontSize: '12px',
                      border: '1px solid #dc3545',
                      backgroundColor: '#fff',
                      color: '#dc3545',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                    title="Remove file"
                  >
                    ❌
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}