/**
 * AI Interview Coach Backend - Content Integration Service
 * 
 * This service handles the integration of uploaded user documents into AI chat prompts.
 * It provides intelligent content selection, summarization, and formatting for optimal
 * AI interaction while managing token limits and context relevance.
 * 
 * Key Features:
 * - Smart content selection based on conversation context
 * - Automatic summarization for token management
 * - Content formatting for AI prompt integration
 * - Relevance scoring and filtering
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import UploadedFile, { IUploadedFile } from '../models/UploadedFile';
import { Types } from 'mongoose';

/**
 * Interface for content integration options
 */
export interface IContentIntegrationOptions {
  maxTokens?: number;
  includeFileNames?: boolean;
  prioritizeRecent?: boolean;
  contextKeywords?: string[];
}

/**
 * Gets all uploaded content for a user
 * 
 * @param {string} userId - User's unique identifier
 * @returns {Promise<string | null>} Combined content or null if no content available
 */
export async function getUserUploadedContent(userId: string): Promise<string | null> {
  try {
    const files = await UploadedFile.find({
      userId: new Types.ObjectId(userId),
      processingStatus: 'completed',
      extractedText: { $exists: true, $ne: null }
    }).sort({ uploadedAt: -1 });

    if (files.length === 0) {
      return null;
    }

    // Combine all content with file separators
    const combinedContent = files
      .map(file => `=== ${file.originalName} ===\n${file.extractedText || ''}`)
      .join('\n\n');

    return combinedContent;
  } catch (error) {
    console.error('Error getting user uploaded content:', error);
    return null;
  }
}

/**
 * Selects relevant content based on conversation context
 * 
 * @param {IUploadedFile[]} files - User's uploaded files
 * @param {string} context - Current conversation context
 * @param {number} maxTokens - Maximum tokens to include
 * @returns {Promise<string | null>} Relevant content or null
 */
export async function selectRelevantContent(
  files: IUploadedFile[],
  context: string,
  maxTokens: number = 2000
): Promise<string | null> {
  console.log('\n=== SELECT RELEVANT CONTENT DEBUG ===');
  console.log(`Files passed: ${files.length}`);
  console.log(`Context: "${context.substring(0, 100)}..."`);
  console.log(`Max tokens: ${maxTokens}`);
  
  if (files.length === 0) {
    console.log('No files provided, returning null');
    return null;
  }

  // Log file details
  files.forEach((file, index) => {
    console.log(`File ${index + 1}: ${file.originalName}`);
    console.log(`  - Has extracted text: ${!!file.extractedText}`);
    console.log(`  - Text length: ${file.extractedText?.length || 0}`);
    if (file.extractedText) {
      console.log(`  - Text preview: "${file.extractedText.substring(0, 100)}..."`);
    }
  });

  // For now, combine all content (can be enhanced with relevance scoring later)
  const allContent = files
    .filter(file => file.extractedText && file.extractedText.trim().length > 0)
    .map(file => `=== ${file.originalName} ===\n${file.extractedText || ''}`)
    .join('\n\n');

  console.log(`Combined content length: ${allContent.length} chars`);

  if (!allContent.trim()) {
    console.log('All content is empty after filtering, returning null');
    return null;
  }

  // Check if content needs to be truncated
  const estimatedTokens = estimateTokenCount(allContent);
  if (estimatedTokens <= maxTokens) {
    return allContent;
  }

  // Truncate content to fit within token limit
  const avgCharsPerToken = 4;
  const maxChars = maxTokens * avgCharsPerToken;
  
  if (allContent.length > maxChars) {
    return allContent.substring(0, maxChars) + '...\n\n[Content truncated to fit token limit]';
  }

  return allContent;
}

/**
 * Formats content for AI prompt integration
 * 
 * @param {IUploadedFile[]} files - User's uploaded files
 * @param {IContentIntegrationOptions} options - Formatting options
 * @returns {string} Formatted content ready for prompt inclusion
 */
export function formatContentForPrompt(
  files: IUploadedFile[],
  options: IContentIntegrationOptions = {}
): string {
  const {
    includeFileNames = true,
    prioritizeRecent = true
  } = options;

  if (files.length === 0) {
    return '';
  }

  // Sort files - prioritize user_info files, then by recency
  const sortedFiles = [...files].sort((a, b) => {
    // Prioritize files with "user_info" in the name
    const aIsUserInfo = a.originalName.toLowerCase().includes('user_info');
    const bIsUserInfo = b.originalName.toLowerCase().includes('user_info');
    
    if (aIsUserInfo && !bIsUserInfo) return -1;
    if (!aIsUserInfo && bIsUserInfo) return 1;
    
    // Then sort by recency if requested
    if (prioritizeRecent) {
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    }
    
    return 0;
  });

  // Format each file's content
  const formattedContent = sortedFiles
    .filter(file => file.extractedText && file.extractedText.trim().length > 0)
    .map(file => {
      let content = '';
      
      if (includeFileNames) {
        content += `**Document: ${file.originalName}**\n`;
        content += `Type: ${file.fileType}\n`;
        content += `Uploaded: ${new Date(file.uploadedAt).toLocaleDateString()}\n\n`;
      }
      
      content += (file.extractedText || '').trim();
      return content;
    })
    .join('\n\n---\n\n');

  return formattedContent;
}

/**
 * Estimates token count for content
 * Uses OpenAI's rule of thumb: 1 token ≈ 4 characters
 * 
 * @param {string} content - Content to estimate
 * @returns {number} Estimated token count
 */
export function estimateTokenCount(content: string): number {
  if (!content) return 0;
  return Math.ceil(content.length / 4);
}

/**
 * Summarizes content to fit within token limits
 * 
 * @param {string} content - Content to summarize
 * @param {number} targetTokens - Target token count for summary
 * @returns {Promise<string>} Summarized content
 */
export async function summarizeContent(
  content: string,
  targetTokens: number = 1000
): Promise<string> {
  try {
    // Import createChatCompletion from openai.service
    const { createChatCompletion } = await import('./openai.service');
    
    const messages = [
      {
        role: 'system' as const,
        content: 'You are a professional summarizer. Create concise summaries that preserve key information relevant for college admissions interviews. Focus on academic achievements, extracurricular activities, leadership experiences, and personal qualities.'
      },
      {
        role: 'user' as const,
        content: `Summarize the following content in approximately ${targetTokens * 4} characters, focusing on information relevant for college interviews:\n\n${content}`
      }
    ];

    const summary = await createChatCompletion(messages, {
      temperature: 0.3,
      max_tokens: targetTokens,
      model: 'gpt-3.5-turbo'
    });

    return summary || content.substring(0, targetTokens * 4);
  } catch (error) {
    console.error('Error summarizing content:', error);
    // Fallback to simple truncation
    const maxChars = targetTokens * 4;
    return content.length > maxChars 
      ? content.substring(0, maxChars) + '...'
      : content;
  }
}

/**
 * Checks if user has uploaded content available
 * 
 * @param {string} userId - User's unique identifier
 * @returns {Promise<boolean>} True if user has content available
 */
export async function hasUploadedContent(userId: string): Promise<boolean> {
  try {
    const count = await UploadedFile.countDocuments({
      userId: new Types.ObjectId(userId),
      processingStatus: 'completed',
      extractedText: { $exists: true, $ne: null }
    });

    return count > 0;
  } catch (error) {
    console.error('Error checking uploaded content:', error);
    return false;
  }
}

/**
 * Gets content statistics for a user
 * 
 * @param {string} userId - User's unique identifier
 * @returns {Promise<Object>} Content statistics
 */
export async function getContentStats(userId: string): Promise<{
  fileCount: number;
  totalWords: number;
  totalCharacters: number;
  estimatedTokens: number;
  fileTypes: string[];
}> {
  try {
    const files = await UploadedFile.find({
      userId: new Types.ObjectId(userId),
      processingStatus: 'completed',
      extractedText: { $exists: true, $ne: null }
    });

    const allContent = files
      .map(file => file.extractedText || '')
      .join(' ');

    const wordCount = allContent.split(/\s+/).filter(word => word.length > 0).length;
    const charCount = allContent.length;
    const tokenCount = estimateTokenCount(allContent);
    const fileTypes = [...new Set(files.map(file => file.fileType))];

    return {
      fileCount: files.length,
      totalWords: wordCount,
      totalCharacters: charCount,
      estimatedTokens: tokenCount,
      fileTypes
    };
  } catch (error) {
    console.error('Error getting content stats:', error);
    return {
      fileCount: 0,
      totalWords: 0,
      totalCharacters: 0,
      estimatedTokens: 0,
      fileTypes: []
    };
  }
}

/**
 * Extracts key information from content for quick reference
 * 
 * @param {string} content - Content to analyze
 * @returns {Object} Extracted key information
 */
export function extractKeyInfo(content: string): {
  schools: string[];
  majors: string[];
  activities: string[];
  achievements: string[];
} {
  // Simple keyword extraction (can be enhanced with NLP)
  const schoolPatterns = /(?:university|college|school) of|(?:harvard|stanford|mit|princeton|yale|columbia|chicago|penn|brown|cornell|dartmouth|northwestern|duke|vanderbilt|rice|emory|georgetown|carnegie mellon|johns hopkins|washington university|notre dame|ucla|berkeley|michigan|virginia|north carolina|georgia tech|nyu)/gi;
  
  const majorPatterns = /(?:major|studying|degree) in|(?:computer science|engineering|business|economics|biology|chemistry|physics|mathematics|psychology|english|history|political science|international relations|pre-med|pre-law)/gi;
  
  const schools = (content.match(schoolPatterns) || [])
    .map(match => match.trim())
    .filter((value, index, self) => self.indexOf(value) === index);
  
  const majors = (content.match(majorPatterns) || [])
    .map(match => match.trim())
    .filter((value, index, self) => self.indexOf(value) === index);

  return {
    schools: schools.slice(0, 5), // Limit to top 5
    majors: majors.slice(0, 3),   // Limit to top 3
    activities: [],               // To be implemented
    achievements: []              // To be implemented
  };
}

export default {
  getUserUploadedContent,
  selectRelevantContent,
  formatContentForPrompt,
  estimateTokenCount,
  summarizeContent,
  hasUploadedContent,
  getContentStats,
  extractKeyInfo
}; 