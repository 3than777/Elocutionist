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
          border: `2px dashed ${isDragActive ? 'var(--accent-blue)' : 'var(--border-tertiary)'}`,
          borderRadius: '8px',
          padding: '20px',
          textAlign: 'center',
          backgroundColor: isDragActive ? 'var(--checkbox-background)' : 'var(--background-secondary)',
          color: 'var(--text-primary)',
          cursor: uploading ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          opacity: uploading ? 0.6 : 1
        }}
      >
        <input {...getInputProps()} />
        
        <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'center' }}>
          {uploading ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="12" cy="12" r="10" stroke="#ddd" strokeWidth="2"/>
              <path d="M4 12a8 8 0 0 1 8-8" stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <polyline points="7,10 12,5 17,10" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="12" y1="5" x2="12" y2="15" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
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
          color: 'var(--text-tertiary)' 
        }}>
          Supports: Images (JPG, PNG, GIF, WebP), Documents (PDF, TXT, DOCX)
        </p>
        <p style={{ 
          margin: '5px 0 0 0', 
          fontSize: '12px', 
          color: 'var(--text-tertiary)' 
        }}>
          Max {MAX_FILES} files, {formatFileSize(MAX_FILE_SIZE)} each
        </p>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div style={{
          marginTop: '10px',
          padding: '10px',
          backgroundColor: 'var(--error-background)',
          border: '1px solid var(--error-border)',
          borderRadius: '4px',
          fontSize: '14px',
          color: 'var(--error-text)'
        }}>
          {errors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </div>
      )}

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div style={{ marginTop: '15px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
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
                  backgroundColor: 'var(--background-quaternary)',
                  border: '1px solid var(--border-primary)',
                  color: 'var(--text-primary)',
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