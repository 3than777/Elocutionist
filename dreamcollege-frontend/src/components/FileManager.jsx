/**
 * FileManager Component - Comprehensive File Management Interface
 * 
 * This component provides advanced file management features:
 * - Display uploaded files with metadata
 * - Filter by file type and processing status
 * - Search functionality
 * - Extracted text preview
 * - Batch operations
 * - Detailed file information
 */

import React, { useState, useMemo } from 'react';

// File type icons and labels
const FILE_TYPE_CONFIG = {
  image: { icon: '🖼️', label: 'Images', color: '#e91e63' },
  pdf: { icon: '📄', label: 'PDFs', color: '#f44336' },
  text: { icon: '📝', label: 'Text Files', color: '#2196f3' },
  document: { icon: '📋', label: 'Documents', color: '#4caf50' }
};

// Processing status config
const STATUS_CONFIG = {
  pending: { label: 'Waiting', color: '#ffa500', icon: '⏳' },
  processing: { label: 'Processing', color: '#007bff', icon: '⚙️' },
  completed: { label: 'Completed', color: '#28a745', icon: '✅' },
  failed: { label: 'Failed', color: '#dc3545', icon: '❌' }
};

export default function FileManager({ 
  files = [], 
  onRemoveFile, 
  onRetryUpload,
  showPreview = true,
  maxPreviewLength = 200 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFileType, setSelectedFileType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [expandedFiles, setExpandedFiles] = useState({});
  const [selectedFiles, setSelectedFiles] = useState([]);

  // Filter files based on search and filters
  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesName = file.originalName.toLowerCase().includes(searchLower);
        const matchesText = file.extractedText?.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesText) return false;
      }

      // File type filter
      if (selectedFileType !== 'all' && file.fileType !== selectedFileType) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && file.processingStatus !== selectedStatus) {
        return false;
      }

      return true;
    });
  }, [files, searchTerm, selectedFileType, selectedStatus]);

  // File statistics
  const stats = useMemo(() => {
    const typeCount = {};
    const statusCount = {};
    let totalSize = 0;
    let totalWords = 0;

    files.forEach(file => {
      // Type count
      typeCount[file.fileType] = (typeCount[file.fileType] || 0) + 1;
      
      // Status count
      statusCount[file.processingStatus] = (statusCount[file.processingStatus] || 0) + 1;
      
      // Total size
      totalSize += file.size || 0;
      
      // Total words
      if (file.extractedText) {
        totalWords += file.extractedText.split(/\s+/).filter(w => w).length;
      }
    });

    return { typeCount, statusCount, totalSize, totalWords };
  }, [files]);

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  // Toggle file expansion
  const toggleFileExpanded = (fileId) => {
    setExpandedFiles(prev => ({
      ...prev,
      [fileId]: !prev[fileId]
    }));
  };

  // Toggle file selection
  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  // Select all files
  const selectAllFiles = () => {
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(filteredFiles.map(f => f.id || f._id));
    }
  };

  // Batch remove
  const batchRemove = () => {
    if (selectedFiles.length > 0 && onRemoveFile) {
      selectedFiles.forEach(fileId => onRemoveFile(fileId));
      setSelectedFiles([]);
    }
  };

  if (files.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px',
        color: '#666'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '10px' }}>📁</div>
        <p>No files uploaded yet</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Header Stats */}
      <div style={{
        display: 'flex',
        gap: '15px',
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        flexWrap: 'wrap'
      }}>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{files.length}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>Total Files</div>
        </div>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {formatFileSize(stats.totalSize)}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>Total Size</div>
        </div>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {stats.totalWords.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>Total Words</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '15px',
        flexWrap: 'wrap'
      }}>
        {/* Search */}
        <input
          type="text"
          placeholder="Search files..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: 1,
            minWidth: '200px',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />

        {/* File Type Filter */}
        <select
          value={selectedFileType}
          onChange={(e) => setSelectedFileType(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: '#fff'
          }}
        >
          <option value="all">All Types</option>
          {Object.entries(FILE_TYPE_CONFIG).map(([type, config]) => (
            <option key={type} value={type}>
              {config.icon} {config.label} ({stats.typeCount[type] || 0})
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '14px',
            backgroundColor: '#fff'
          }}
        >
          <option value="all">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <option key={status} value={status}>
              {config.icon} {config.label} ({stats.statusCount[status] || 0})
            </option>
          ))}
        </select>
      </div>

      {/* Batch Actions */}
      {selectedFiles.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px',
          backgroundColor: '#e3f2fd',
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          <span>{selectedFiles.length} files selected</span>
          <button
            onClick={batchRemove}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              border: '1px solid #dc3545',
              backgroundColor: '#fff',
              color: '#dc3545',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Remove Selected
          </button>
        </div>
      )}

      {/* Files List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Select All */}
        {filteredFiles.length > 0 && (
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              checked={selectedFiles.length === filteredFiles.length}
              onChange={selectAllFiles}
            />
            Select All
          </label>
        )}

        {/* File Items */}
        {filteredFiles.map((file) => {
          const fileId = file.id || file._id;
          const isExpanded = expandedFiles[fileId];
          const isSelected = selectedFiles.includes(fileId);
          const typeConfig = FILE_TYPE_CONFIG[file.fileType] || FILE_TYPE_CONFIG.document;
          const statusConfig = STATUS_CONFIG[file.processingStatus];

          return (
            <div
              key={fileId}
              style={{
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                overflow: 'hidden',
                backgroundColor: isSelected ? '#f0f8ff' : '#fff'
              }}
            >
              {/* File Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                gap: '10px'
              }}>
                {/* Selection Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleFileSelection(fileId)}
                  onClick={(e) => e.stopPropagation()}
                />

                {/* File Icon */}
                <span style={{ fontSize: '24px' }}>{typeConfig.icon}</span>

                {/* File Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                    {file.originalName}
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    gap: '10px', 
                    fontSize: '12px', 
                    color: '#666' 
                  }}>
                    <span>{formatFileSize(file.size)}</span>
                    <span>•</span>
                    <span>{formatDate(file.uploadedAt)}</span>
                    {file.extractedText && (
                      <>
                        <span>•</span>
                        <span>
                          {file.extractedText.split(/\s+/).filter(w => w).length} words
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <div style={{
                  padding: '4px 8px',
                  backgroundColor: statusConfig.color + '20',
                  color: statusConfig.color,
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span>{statusConfig.icon}</span>
                  <span>{statusConfig.label}</span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '5px' }}>
                  {file.processingStatus === 'failed' && onRetryUpload && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRetryUpload(fileId);
                      }}
                      style={{
                        padding: '6px',
                        fontSize: '16px',
                        border: '1px solid #007bff',
                        backgroundColor: '#fff',
                        color: '#007bff',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      title="Retry"
                    >
                      🔄
                    </button>
                  )}

                  {showPreview && file.extractedText && (
                    <button
                      onClick={() => toggleFileExpanded(fileId)}
                      style={{
                        padding: '6px',
                        fontSize: '16px',
                        border: '1px solid #6c757d',
                        backgroundColor: '#fff',
                        color: '#6c757d',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      title={isExpanded ? 'Hide preview' : 'Show preview'}
                    >
                      {isExpanded ? '📖' : '👁️'}
                    </button>
                  )}

                  {onRemoveFile && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFile(fileId);
                      }}
                      style={{
                        padding: '6px',
                        fontSize: '16px',
                        border: '1px solid #dc3545',
                        backgroundColor: '#fff',
                        color: '#dc3545',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                      title="Remove"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && file.extractedText && (
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f8f9fa',
                  borderTop: '1px solid #dee2e6'
                }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    marginBottom: '8px',
                    color: '#495057'
                  }}>
                    Extracted Text Preview:
                  </div>
                  <div style={{
                    fontSize: '14px',
                    lineHeight: '1.5',
                    color: '#333',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '200px',
                    overflow: 'auto',
                    padding: '8px',
                    backgroundColor: '#fff',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px'
                  }}>
                    {file.extractedText.length > maxPreviewLength
                      ? file.extractedText.substring(0, maxPreviewLength) + '...'
                      : file.extractedText}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* No Results */}
        {filteredFiles.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#666'
          }}>
            <p>No files match your filters</p>
          </div>
        )}
      </div>
    </div>
  );
} 