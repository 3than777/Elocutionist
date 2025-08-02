/**
 * AI Interview Coach Backend - File Processing Service
 * 
 * This file implements file processing functionality for extracting text content
 * from various file formats including PDFs, DOCX documents, images (via OCR),
 * and plain text files. The extracted text can be integrated into AI prompts
 * for enhanced interview coaching.
 * 
 * Key Features:
 * - PDF text extraction using pdf-parse
 * - DOCX text extraction using mammoth
 * - Image OCR using tesseract.js
 * - Plain text file processing
 * - File type determination and validation
 * - Comprehensive error handling and logging
 * - Progress tracking for long-running operations
 * - Text cleaning and normalization
 * 
 * Security Considerations:
 * - File content validation before processing
 * - Size limits enforced during processing
 * - Safe handling of malformed files
 * - Memory-efficient processing for large files
 * 
 * Related Files:
 * - src/models/UploadedFile.ts - File metadata storage
 * - src/middleware/documentUpload.ts - File upload handling
 * - src/routes/upload.routes.ts - Upload endpoints
 * 
 * Task: Phase 1, Step 4 - Create File Processing Service
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import pdf from 'pdf-parse';
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import { FILE_TYPES, type FileType } from '../models/UploadedFile';

/**
 * Interface for OCR progress tracking
 */
interface IOCRProgress {
  status: string;
  progress: number;
  userJobId?: string;
}

/**
 * Interface for text extraction results
 */
interface ITextExtractionResult {
  text: string;
  confidence?: number;
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    language?: string;
  };
}

/**
 * Maximum text length to prevent memory issues
 */
const MAX_TEXT_LENGTH = 500000; // 500KB of text

/**
 * Extracts text content from PDF files
 * 
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<string>} Extracted text content
 * @throws {Error} If PDF parsing fails
 * 
 * @example
 * ```typescript
 * const pdfBuffer = await fs.readFile('document.pdf');
 * const text = await extractTextFromPDF(pdfBuffer);
 * ```
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // Validate buffer
    if (!buffer || buffer.length === 0) {
      throw new Error('PDF buffer is empty');
    }
    
    // Parse PDF
    const data = await pdf(buffer, {
      // Options to improve extraction
      max: 0, // No page limit
      version: 'v2.0.550'
    });
    
    // Check if text was extracted
    if (!data.text) {
      throw new Error('No text content found in PDF');
    }
    
    // Clean and normalize text
    let extractedText = cleanExtractedText(data.text);
    
    // Truncate if too long
    if (extractedText.length > MAX_TEXT_LENGTH) {
      extractedText = extractedText.substring(0, MAX_TEXT_LENGTH) + '... [truncated]';
    }
    
    console.log(`Extracted ${extractedText.length} characters from PDF (${data.numpages} pages)`);
    
    return extractedText;
    
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extracts text content from DOCX files
 * 
 * @param {Buffer} buffer - DOCX file buffer
 * @returns {Promise<string>} Extracted text content
 * @throws {Error} If DOCX parsing fails
 * 
 * @example
 * ```typescript
 * const docxBuffer = await fs.readFile('document.docx');
 * const text = await extractTextFromDOCX(docxBuffer);
 * ```
 */
export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    // Validate buffer
    if (!buffer || buffer.length === 0) {
      throw new Error('DOCX buffer is empty');
    }
    
    // Extract text from DOCX
    const result = await mammoth.extractRawText({ buffer });
    
    if (!result.value) {
      throw new Error('No text content found in DOCX');
    }
    
    // Log any warnings
    if (result.messages && result.messages.length > 0) {
      console.warn('DOCX extraction warnings:', result.messages);
    }
    
    // Clean and normalize text
    let extractedText = cleanExtractedText(result.value);
    
    // Truncate if too long
    if (extractedText.length > MAX_TEXT_LENGTH) {
      extractedText = extractedText.substring(0, MAX_TEXT_LENGTH) + '... [truncated]';
    }
    
    console.log(`Extracted ${extractedText.length} characters from DOCX`);
    
    return extractedText;
    
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw new Error(`DOCX extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extracts text from images using OCR (Optical Character Recognition)
 * 
 * @param {Buffer} buffer - Image file buffer
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<string>} Extracted text content
 * @throws {Error} If OCR processing fails
 * 
 * @example
 * ```typescript
 * const imageBuffer = await fs.readFile('document.png');
 * const text = await extractTextFromImage(imageBuffer, (progress) => {
 *   console.log(`OCR Progress: ${progress.progress}%`);
 * });
 * ```
 */
export async function extractTextFromImage(
  buffer: Buffer,
  onProgress?: (progress: IOCRProgress) => void
): Promise<string> {
  try {
    // Validate buffer
    if (!buffer || buffer.length === 0) {
      throw new Error('Image buffer is empty');
    }
    
    // Preprocess image for better OCR results
    const processedBuffer = await preprocessImageForOCR(buffer);
    
    // Create Tesseract worker
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: (info) => {
        if (onProgress && info.status) {
          onProgress({
            status: info.status,
            progress: Math.round((info.progress || 0) * 100),
            userJobId: info.userJobId
          });
        }
      }
    });
    
    try {
      // Perform OCR
      const { data } = await worker.recognize(processedBuffer);
      
      if (!data.text) {
        throw new Error('No text detected in image');
      }
      
      // Clean and normalize text
      let extractedText = cleanExtractedText(data.text);
      
      // Truncate if too long
      if (extractedText.length > MAX_TEXT_LENGTH) {
        extractedText = extractedText.substring(0, MAX_TEXT_LENGTH) + '... [truncated]';
      }
      
      console.log(`Extracted ${extractedText.length} characters from image (confidence: ${data.confidence}%)`);
      
      return extractedText;
      
    } finally {
      // Always terminate worker to free resources
      await worker.terminate();
    }
    
  } catch (error) {
    console.error('Error extracting text from image:', error);
    throw new Error(`Image OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Preprocesses images for better OCR results
 * Converts to grayscale, adjusts contrast, and resizes if needed
 * 
 * @param {Buffer} buffer - Original image buffer
 * @returns {Promise<Buffer>} Processed image buffer
 */
async function preprocessImageForOCR(buffer: Buffer): Promise<Buffer> {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    // Configure preprocessing pipeline
    let pipeline = image
      .grayscale() // Convert to grayscale for better OCR
      .normalize() // Enhance contrast
      .sharpen(); // Improve text clarity
    
    // Resize large images to improve processing speed
    if (metadata.width && metadata.width > 3000) {
      pipeline = pipeline.resize(3000, null, {
        withoutEnlargement: true,
        fit: 'inside'
      });
    }
    
    // Convert to buffer
    return await pipeline.toBuffer();
    
  } catch (error) {
    console.warn('Image preprocessing failed, using original:', error);
    return buffer; // Return original if preprocessing fails
  }
}

/**
 * Processes plain text files
 * 
 * @param {Buffer} buffer - Text file buffer
 * @returns {string} Text content
 * @throws {Error} If text processing fails
 */
export function processTextFile(buffer: Buffer): string {
  try {
    // Validate buffer
    if (!buffer || buffer.length === 0) {
      throw new Error('Text buffer is empty');
    }
    
    // Convert buffer to string
    let text = buffer.toString('utf8');
    
    // Clean and normalize
    text = cleanExtractedText(text);
    
    // Truncate if too long
    if (text.length > MAX_TEXT_LENGTH) {
      text = text.substring(0, MAX_TEXT_LENGTH) + '... [truncated]';
    }
    
    console.log(`Processed ${text.length} characters from text file`);
    
    return text;
    
  } catch (error) {
    console.error('Error processing text file:', error);
    throw new Error(`Text processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Determines file type category from MIME type
 * 
 * @param {string} mimeType - File MIME type
 * @returns {FileType} Categorized file type
 */
export function determineFileType(mimeType: string): FileType {
  if (mimeType.startsWith('image/')) {
    return FILE_TYPES.IMAGE;
  }
  
  if (mimeType === 'application/pdf') {
    return FILE_TYPES.PDF;
  }
  
  if (mimeType === 'text/plain') {
    return FILE_TYPES.TEXT;
  }
  
  if (
    mimeType.includes('word') || 
    mimeType.includes('document') ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return FILE_TYPES.DOCUMENT;
  }
  
  // Default to document for unknown types
  return FILE_TYPES.DOCUMENT;
}

/**
 * Validates file content before processing
 * 
 * @param {Buffer} buffer - File buffer to validate
 * @param {string} mimeType - Expected MIME type
 * @returns {boolean} True if file content is valid
 */
export function validateFileContent(buffer: Buffer, mimeType: string): boolean {
  try {
    // Check buffer exists and has content
    if (!buffer || buffer.length === 0) {
      return false;
    }
    
    // Check file signatures for common formats
    const signature = buffer.subarray(0, 4).toString('hex');
    
    switch (mimeType) {
      case 'application/pdf':
        // PDF files start with %PDF
        return signature.startsWith('25504446');
        
      case 'image/jpeg':
      case 'image/jpg':
        // JPEG files start with FFD8
        return signature.startsWith('ffd8');
        
      case 'image/png':
        // PNG files start with 89504E47
        return signature.startsWith('89504e47');
        
      case 'image/gif':
        // GIF files start with GIF87a or GIF89a
        const gifSig = buffer.subarray(0, 6).toString('ascii');
        return gifSig === 'GIF87a' || gifSig === 'GIF89a';
        
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        // DOCX files are ZIP archives starting with PK
        return signature.startsWith('504b0304');
        
      case 'text/plain':
        // Text files - check if content is valid UTF-8
        try {
          buffer.toString('utf8');
          return true;
        } catch {
          return false;
        }
        
      default:
        // For other types, assume valid if buffer has content
        return true;
    }
    
  } catch (error) {
    console.error('Error validating file content:', error);
    return false;
  }
}

/**
 * Cleans and normalizes extracted text
 * Removes excessive whitespace, special characters, and formats text
 * 
 * @param {string} text - Raw extracted text
 * @returns {string} Cleaned text
 */
function cleanExtractedText(text: string): string {
  if (!text) return '';
  
  return text
    // Remove null bytes and control characters
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive line breaks (more than 2)
    .replace(/\n{3,}/g, '\n\n')
    // Remove excessive spaces
    .replace(/[ \t]+/g, ' ')
    // Trim lines
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Final trim
    .trim();
}

/**
 * Extracts text from any supported file type
 * Main entry point for file processing
 * 
 * @param {Buffer} buffer - File buffer
 * @param {string} mimeType - File MIME type
 * @param {Function} onProgress - Optional progress callback for OCR
 * @returns {Promise<ITextExtractionResult>} Extraction result with text and metadata
 */
export async function extractTextFromFile(
  buffer: Buffer,
  mimeType: string,
  onProgress?: (progress: IOCRProgress) => void
): Promise<ITextExtractionResult> {
  // Validate file content
  if (!validateFileContent(buffer, mimeType)) {
    throw new Error('Invalid file content for specified MIME type');
  }
  
  const fileType = determineFileType(mimeType);
  let text: string;
  let metadata: ITextExtractionResult['metadata'] = {};
  
  switch (fileType) {
    case FILE_TYPES.PDF:
      text = await extractTextFromPDF(buffer);
      break;
      
    case FILE_TYPES.DOCUMENT:
      text = await extractTextFromDOCX(buffer);
      break;
      
    case FILE_TYPES.IMAGE:
      text = await extractTextFromImage(buffer, onProgress);
      break;
      
    case FILE_TYPES.TEXT:
      text = processTextFile(buffer);
      break;
      
    default:
      throw new Error(`Unsupported file type: ${mimeType}`);
  }
  
  // Calculate metadata
  metadata.wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
  
  return {
    text,
    metadata
  };
} 