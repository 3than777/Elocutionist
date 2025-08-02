# Upload Information Feature Implementation Guide

## Overview
This guide provides detailed steps to implement file upload functionality that allows users to upload multiple images and text files, extract content from them, and integrate that content into AI prompts for more personalized interview coaching.

## Phase 1: Backend Infrastructure Setup

### Step 1: Create Document Upload Middleware
Create a new upload middleware specifically for documents and images in `src/middleware/documentUpload.ts`:
- Configure multer for memory storage (similar to existing audio upload)
- Support file types: JPG, PNG, GIF, WebP, PDF, TXT, DOCX
- Set file size limits: 5MB per file, maximum 10 files per request
- Add MIME type validation for security
- Create file filter function to validate uploaded files
- Export `uploadDocuments` middleware for multiple file uploads
- Add comprehensive error handling with specific error codes

### Step 2: Install File Processing Dependencies
Add required packages to handle different file types:
- Install `pdf-parse` for PDF text extraction
- Install `mammoth` for DOCX file processing
- Install `tesseract.js` for OCR (Optical Character Recognition) from images
- Install `sharp` for image optimization and preprocessing
- Update package.json and ensure all types are properly installed

### Step 3: Create UploadedFile Database Model
Create `src/models/UploadedFile.ts` with the following schema:
- `userId`: ObjectId reference to User model (required)
- `filename`: String - generated unique filename (required)
- `originalName`: String - original filename from user (required)
- `mimeType`: String - file MIME type (required)
- `size`: Number - file size in bytes (required)
- `fileType`: String - categorized type: 'image', 'pdf', 'text', 'document'
- `extractedText`: String - processed text content from file
- `processingStatus`: String enum - 'pending', 'processing', 'completed', 'failed'
- `uploadedAt`: Date - timestamp of upload
- `lastAccessedAt`: Date - when file was last used in AI prompt
- Add indexes on userId, processingStatus, uploadedAt for efficient queries
- Add virtual for file URL generation
- Include methods for text extraction status checking

### Step 4: Create File Processing Service
Create `src/services/fileProcessing.service.ts` with functions:
- `extractTextFromPDF(buffer: Buffer): Promise<string>` - Use pdf-parse to extract text
- `extractTextFromDOCX(buffer: Buffer): Promise<string>` - Use mammoth to extract text
- `extractTextFromImage(buffer: Buffer): Promise<string>` - Use tesseract.js for OCR
- `processTextFile(buffer: Buffer): string` - Handle plain text files
- `determineFileType(mimeType: string): string` - Categorize file types
- `validateFileContent(buffer: Buffer, mimeType: string): boolean` - Verify file integrity
- Add comprehensive error handling for each processing method
- Include progress tracking for long-running OCR operations
- Add text cleaning and normalization functions

### Step 5: Create Upload Routes
Create `src/routes/upload.routes.ts` with the following endpoints:
- `POST /api/uploads` - Upload multiple files endpoint
  - Use documentUpload middleware
  - Validate user authentication
  - Process each uploaded file asynchronously
  - Store file metadata in database
  - Return upload results with processing status
- `GET /api/uploads` - Retrieve user's uploaded files
  - Include pagination support
  - Filter by file type or processing status
  - Return file metadata and extracted text
- `DELETE /api/uploads/:fileId` - Delete specific uploaded file
  - Verify file ownership
  - Remove from database
  - Clean up any associated data
- `GET /api/uploads/:fileId/content` - Get processed text content
  - Return extracted text for specific file
  - Include metadata about extraction quality

### Step 6: Update Upload Middleware Index
Modify `src/middleware/index.ts`:
- Export the new documentUpload middleware
- Ensure proper error handling integration
- Add documentation for new middleware usage

### Step 7: Integrate Upload Routes
Update `src/routes/index.ts`:
- Import and mount upload routes at `/api/uploads`
- Ensure proper middleware order
- Add route-level authentication where needed

## Phase 2: Frontend Upload Interface

### Step 8: Install Frontend Dependencies
Add required packages to the frontend:
- Install `react-dropzone` for drag-and-drop file upload
- Install `file-typeimage.png` for client-side file validation
- Install any additional UI libraries for better file display
- Update package.json in dreamcollege-frontend directory

### Step 9: Create File Upload Hook
Create `dreamcollege-frontend/src/hooks/useFileUpload.js`:
- Manage upload state (uploading, progress, errors)
- Handle multiple file selection and validation
- Implement upload progress tracking
- Provide methods for file removal
- Include error handling and retry logic
- Track processing status of uploaded files
- Implement automatic polling for processing completion

### Step 10: Replace UploadButton Component
Completely rewrite `dreamcollege-frontend/src/components/UploadButton.jsx`:
- Replace static button with functional upload interface
- Implement drag-and-drop zone using react-dropzone
- Add file type validation (images, PDFs, text files)
- Show upload progress indicators
- Display file previews/thumbnails where possible
- Include file size and type information
- Add individual file removal buttons
- Show processing status for each file
- Implement retry functionality for failed uploads

### Step 11: Create File Management Component
Create `dreamcollege-frontend/src/components/FileManager.jsx`:
- Display list of uploaded files with metadata
- Show file processing status (pending, processing, completed, failed)
- Provide file removal functionality
- Display extracted text preview
- Include file type icons and thumbnails
- Add search/filter functionality for multiple files
- Show upload date and file size information

### Step 12: Create Upload State Management
Create `dreamcollege-frontend/src/context/UploadContext.jsx`:
- Manage global upload state across components
- Track all uploaded files and their processing status
- Provide functions for adding, removing, and updating files
- Handle API calls for upload operations
- Include error state management
- Implement automatic refresh for processing status

### Step 13: Update Settings Panel Integration
Modify `dreamcollege-frontend/src/components/SettingsPanel.jsx`:
- Replace simple UploadButton with new upload interface
- Integrate FileManager component to show uploaded files
- Add upload statistics (file count, total size, processing status)
- Include toggle for showing/hiding file details
- Ensure proper layout and responsive design

## Phase 3: AI Integration

### Step 14: Create Content Integration Service
Create `src/services/contentIntegration.service.ts`:
- `getUserUploadedContent(userId: string): Promise<string>` - Compile all user's file content
- `summarizeContent(content: string): Promise<string>` - Use AI to summarize long content
- `formatContentForPrompt(files: UploadedFile[]): string` - Format content for AI consumption
- `checkContentRelevance(content: string, interviewType: string): boolean` - Filter relevant content
- Include content length management to stay within token limits
- Add content categorization (resume, transcripts, essays, etc.)

### Step 15: Update Chat Integration
Modify `dreamcollege-frontend/src/components/ChatBox.jsx`:
- Add uploaded content to system prompts
- Include file context in API calls to chat endpoint
- Display when uploaded content is being used
- Add toggle to enable/disable uploaded content in conversation
- Show indicators when AI references uploaded files
- Implement content relevance filtering based on conversation topic

### Step 16: Enhance Chat Routes
Update `src/routes/chat.routes.ts`:
- Accept uploaded content in chat requests
- Integrate with contentIntegration service
- Include uploaded content in OpenAI API calls
- Add content summarization for long uploads
- Implement smart content selection based on conversation context
- Add logging for content usage analytics

### Step 17: Update OpenAI Service
Modify `src/services/openai.service.ts`:
- Add functions to incorporate uploaded content into prompts
- Implement content summarization using GPT for long files
- Add content relevance scoring for interview context
- Include uploaded content formatting for different interview types
- Add token count management to prevent API limit issues
- Create content-aware prompt templates

## Phase 4: Validation and Error Handling

### Step 18: Implement Comprehensive Validation
Add validation layers throughout the system:
- Frontend file validation (size, type, count limits)
- Backend middleware validation for security
- Content validation after processing (ensure readable text)
- Database validation with proper error messages
- API rate limiting for upload endpoints
- User quota management (total files per user)

### Step 19: Add Error Handling
Implement robust error handling:
- File processing failure recovery
- Upload retry mechanisms
- Graceful degradation when files can't be processed
- User-friendly error messages for all failure scenarios
- Logging for debugging upload and processing issues
- Cleanup procedures for failed uploads

### Step 20: Create Upload Analytics
Add analytics and monitoring:
- Track upload success/failure rates
- Monitor file processing times
- Log content usage in AI conversations
- Track user engagement with upload feature
- Monitor system resource usage during file processing
- Create dashboards for upload metrics

## Phase 5: Testing and Documentation

### Step 21: Create Test Files
Develop comprehensive tests:
- Unit tests for file processing functions
- Integration tests for upload endpoints
- Frontend component tests for upload interface
- End-to-end tests for complete upload workflow
- Performance tests for large file uploads
- Security tests for malicious file handling

### Step 22: Update Documentation
Create and update documentation:
- API documentation for upload endpoints
- Frontend component documentation
- File processing service documentation
- Environment variables documentation
- Deployment guides for file storage
- User guides for upload functionality

### Step 23: Environment Configuration
Update environment setup:
- Add configuration for file storage limits
- Configure OCR service settings
- Set up file cleanup schedules
- Add monitoring and logging configurations
- Configure rate limiting parameters
- Set up backup procedures for uploaded content

## Implementation Notes

### File Size and Limits
- Maximum 5MB per file
- Maximum 10 files per upload session
- Maximum 50MB total storage per user
- Automatic cleanup of old files after 30 days

### Security Considerations
- Validate all file types and content
- Scan for malicious content
- Implement proper access controls
- Use secure file naming conventions
- Add virus scanning if required
- Implement proper CORS policies

### Performance Optimization
- Process files asynchronously
- Implement file compression where appropriate
- Use efficient database indexing
- Cache frequently accessed content
- Implement proper error recovery
- Monitor and optimize OCR processing times

### User Experience
- Provide clear feedback during upload and processing
- Show processing progress for long operations
- Allow users to continue using the app while files process
- Implement graceful error recovery
- Provide help text and examples
- Make upload interface intuitive and accessible

This implementation will provide users with a robust file upload system that enhances their interview coaching experience by allowing the AI to reference their personal documents and information during practice sessions. 