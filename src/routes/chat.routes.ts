/**
 * AI Interview Coach Backend - Chat Routes
 * 
 * This file implements chat endpoints enhanced with uploaded content integration
 * and AI rating functionality for interview feedback generation.
 * It handles AI-powered interview coaching conversations with the ability to
 * reference user's uploaded documents for more personalized responses.
 * 
 * Key Features:
 * - OpenAI integration for chat responses
 * - Uploaded content integration
 * - Smart content selection based on context
 * - Content summarization for token management
 * - AI rating generation for interview transcripts
 * - Usage analytics logging
 * 
 * Related Files:
 * - src/services/openai.service.ts - AI chat functionality
 * - src/services/contentIntegration.service.ts - Content management
 * - src/models/UploadedFile.ts - File metadata
 * - src/models/InterviewTranscript.ts - Transcript storage
 * 
 * Task: Phase 3, Step 16 - Enhance Chat Routes, Steps 2-4 - AI Rating Endpoints
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import { Router, Request, Response } from 'express';
import { authenticateToken, AuthenticatedRequest, optionalAuth } from '../middleware/auth';
import { createChatCompletion, createVoiceOptimizedChatCompletion } from '../services/openai.service';
import {
  getUserUploadedContent,
  summarizeContent,
  selectRelevantContent,
  formatContentForPrompt,
  estimateTokenCount
} from '../services/contentIntegration.service';
import UploadedFile, { PROCESSING_STATUS } from '../models/UploadedFile';
import InterviewTranscript, { ITranscriptMessage, IInterviewContext } from '../models/InterviewTranscript';
import { Types } from 'mongoose';
import { recordVoiceEvent, getVoiceAnalyticsSummary } from '../services/voiceAnalytics.service';

const router = Router();

/**
 * Interface for chat request
 */
interface IChatRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  includeUploadedContent?: boolean;
  interviewType?: string;
  maxContentTokens?: number;
  voiceMode?: boolean; // NEW: Enable voice-optimized responses
}

/**
 * Interface for end interview request
 */
interface IEndInterviewRequest {
  messages: ITranscriptMessage[];
  interviewContext: IInterviewContext;
}

/**
 * Interface for generate rating request
 */
interface IGenerateRatingRequest {
  transcriptId: string;
}

/**
 * Interface for voice processing request
 */
interface IVoiceProcessRequest {
  action: 'store_preferences' | 'log_usage' | 'report_error';
  data: {
    // For store_preferences
    preferences?: {
      voiceEnabled?: boolean;
      selectedVoice?: string;
      speechRate?: number;
      speechVolume?: number;
      microphoneSensitivity?: number;
      autoPlayResponses?: boolean;
      voiceGender?: 'male' | 'female' | 'neutral';
      voiceLanguage?: string;
    };
    // For log_usage
    usage?: {
      sessionDuration?: number;
      speechRecognitionAttempts?: number;
      speechRecognitionSuccesses?: number;
      textToSpeechUsage?: number;
      errorCount?: number;
      browserInfo?: string;
      deviceInfo?: string;
    };
    // For report_error
    error?: {
      errorType: 'speech_recognition' | 'text_to_speech' | 'browser_compatibility' | 'microphone_permission' | 'network' | 'other';
      errorMessage: string;
      browserInfo: string;
      timestamp: string;
      voiceCapabilities?: any;
      stackTrace?: string;
      userAgent?: string;
    };
  };
}

/**
 * POST /api/chat - Handle chat messages with optional uploaded content integration
 * 
 * @route POST /api/chat
 * @access Public with optional authentication for uploaded content
 * @param {IChatRequest} req.body - Chat messages and options
 * @returns {Object} AI response message
 */
router.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { 
      messages, 
      includeUploadedContent = false,
      interviewType = 'general',
      maxContentTokens = 2000,
      voiceMode = false
    }: IChatRequest = req.body;

    // Validate messages
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Invalid messages format' });
      return;
    }

         // Log usage analytics
     const user = (req as any).user;
     console.log(`Chat request - Content: ${includeUploadedContent}, Type: ${interviewType}`);
     console.log(`User authenticated: ${!!user}, User ID: ${user?._id || user?.id}`);
     console.log(`Authorization header: ${req.headers.authorization ? 'Present' : 'Missing'}`);

    // Process messages with optional content
    let enhancedMessages = [...messages];
    
    // Debug: Log received messages structure
    console.log(`\n=== RECEIVED MESSAGES DEBUG ===`);
    console.log(`Number of messages received: ${messages.length}`);
    messages.forEach((msg, index) => {
      console.log(`Message ${index}: role="${msg.role}", content_length=${msg.content?.length || 0}`);
      if (msg.role === 'system') {
        console.log(`  System message preview: "${msg.content?.substring(0, 100)}..."`);
      }
    });

                   // Debug the exact conditions
      console.log(`\n=== PRE-CONTENT CHECK ===`);
      console.log(`includeUploadedContent: ${includeUploadedContent}`);
      console.log(`req.user exists: ${!!user}`);
      console.log(`req.user._id: ${user?._id || user?.id}`);
      console.log(`req.user object keys: ${user ? Object.keys(user).join(', ') : 'N/A'}`);
      
      // If uploaded content is requested, integrate it
      if (includeUploadedContent) {
        console.log(`\n=== CONTENT INTEGRATION DEBUG ===`);
        console.log(`Content requested: YES`);
        console.log(`User available: ${!!user}`);
        
        if (!user) {
          console.log(`WARNING: Content requested but user not authenticated!`);
                 } else {
          // Get user ID - handle both _id and id properties
          const userId = user._id || user.id;
          console.log(`Attempting to load content for user: ${userId}`);
          console.log(`User ID type: ${typeof userId}`);
          
          try {
        // Get user's uploaded files
        console.log(`Querying UploadedFile with criteria:`, {
          userId: userId.toString(),
          processingStatus: PROCESSING_STATUS.COMPLETED
        });
        
        const userFiles = await UploadedFile.find({
          userId: userId as Types.ObjectId,
          processingStatus: PROCESSING_STATUS.COMPLETED,
          extractedText: { $exists: true, $ne: null }
        }).sort({ uploadedAt: -1 });
        
        console.log(`Query result: ${userFiles.length} files found`);
        
        // Debug: Check if there are ANY files in the database
        if (userFiles.length === 0) {
          const allFiles = await UploadedFile.find({}).limit(5);
          console.log(`DEBUG: Total files in DB: ${allFiles.length}`);
          allFiles.forEach(f => {
            console.log(`  File: ${f.originalName}, userId: ${f.userId}, status: ${f.processingStatus}`);
          });
        }

        if (userFiles.length > 0) {
          console.log(`Found ${userFiles.length} uploaded files for user ${userId}:`);
          userFiles.forEach(file => {
            console.log(`- ${file.originalName} (${file.fileType}): ${file.extractedText ? file.extractedText.length + ' chars' : 'no text'}`);
          });

          // Get conversation context from recent messages
          const recentMessages = messages.slice(-5);
          const conversationContext = recentMessages
            .map(m => m.content)
            .join(' ');

          // Select relevant content based on conversation
          const relevantContent = await selectRelevantContent(
            userFiles,
            conversationContext,
            maxContentTokens
          );

          if (relevantContent) {
            console.log('Relevant content found, adding to messages...');
            
            // Enhance system message with uploaded content
            const systemMessageIndex = enhancedMessages.findIndex(m => m.role === 'system');
            console.log(`System message found at index: ${systemMessageIndex}`);
            
            if (systemMessageIndex >= 0 && enhancedMessages[systemMessageIndex]) {
              // Check if content needs summarization
              const contentTokens = estimateTokenCount(relevantContent);
              let contentToAdd = relevantContent;

              if (contentTokens > maxContentTokens) {
                console.log(`Summarizing content: ${contentTokens} tokens to ~${maxContentTokens} tokens`);
                contentToAdd = await summarizeContent(relevantContent);
              }

              // Add content to system message with specific instructions
              enhancedMessages[systemMessageIndex].content += `\n\n## User's Background Information\n\nThe user has provided the following personal information and documents. Use this to personalize your responses:\n\n${contentToAdd}\n\n**Instructions:**\n- Reference the user's name and background naturally when appropriate\n- Use their experiences and information to tailor your questions and advice\n- Make the conversation personal and relevant to their specific situation`;
              
              // Log content usage
              console.log(`Successfully added ${userFiles.length} files to chat context (${contentTokens} tokens)`);
              console.log('First 200 chars of content:', contentToAdd.substring(0, 200));
            } else {
              console.log('WARNING: System message not found in messages array!');
            }
          } else {
            console.log('No relevant content returned from selectRelevantContent');
          }
        }
               } catch (error) {
           console.error('Error integrating uploaded content:', error);
           // Continue without uploaded content rather than failing the request
         }
       }
     }

    // Track what content was actually used
    let contentMetadata = {
      contentRequested: includeUploadedContent,
      userAuthenticated: !!user,
      filesFound: 0,
      filesUsed: 0
    };

    // Update metadata if content was processed
    if (includeUploadedContent && user) {
      try {
        const userId = user._id || user.id;
        const userFiles = await UploadedFile.find({
          userId: userId as Types.ObjectId,
          processingStatus: PROCESSING_STATUS.COMPLETED,
          extractedText: { $exists: true, $ne: null }
        });
        
        contentMetadata.filesFound = userFiles.length;
        contentMetadata.filesUsed = userFiles.filter(f => f.extractedText).length;
      } catch (error) {
        console.error('Error counting files:', error);
      }
    }

    // Enhance system prompt with difficulty level information if provided
    if (interviewType && interviewType !== 'general') {
      // Find the system message and enhance it with difficulty information
      const systemMessageIndex = enhancedMessages.findIndex(msg => msg.role === 'system');
      if (systemMessageIndex >= 0) {
        const originalSystemPrompt = enhancedMessages[systemMessageIndex]?.content || '';
        
        // Map the interview type (which is actually the difficulty level from frontend) to difficulty instructions
        const difficultyMapping: { [key: string]: string } = {
          'beginner': 'Easy',
          'Beginner': 'Easy', 
          'easy': 'Easy',
          'Easy': 'Easy',
          'intermediate': 'Advanced',
          'Intermediate': 'Advanced',
          'advanced': 'Advanced',
          'Advanced': 'Advanced',
          'expert': 'Hard',
          'Expert': 'Hard',
          'hard': 'Hard',
          'Hard': 'Hard'
        };
        
        const mappedDifficulty = difficultyMapping[interviewType] || 'Advanced';
        
        console.log(`Difficulty mapping: ${interviewType} -> ${mappedDifficulty}`);
        console.log(`System message index: ${systemMessageIndex}`);
        
        if (systemMessageIndex >= 0) {
          console.log(`Original system prompt length: ${originalSystemPrompt.length} chars`);
          console.log(`Original prompt contains "Difficulty:": ${originalSystemPrompt.includes('Difficulty:')}`);
        }
        
        // Add reinforcement for difficulty level (frontend already includes detailed guidance)
        const difficultyGuidance = `

## BACKEND DIFFICULTY CONFIRMATION: ${mappedDifficulty}
**This reinforces the difficulty level set in the frontend. Maintain ${mappedDifficulty} complexity throughout the interview.**`;

        if (enhancedMessages[systemMessageIndex]) {
          enhancedMessages[systemMessageIndex].content = originalSystemPrompt + difficultyGuidance;
          console.log(`Enhanced system prompt length: ${enhancedMessages[systemMessageIndex].content.length} chars`);
          console.log(`Enhanced prompt contains mapped difficulty "${mappedDifficulty}": ${enhancedMessages[systemMessageIndex].content.includes(mappedDifficulty)}`);
        }
      }
    }

    // Create chat completion with enhanced messages (voice-optimized if voice mode enabled)
    const reply = voiceMode 
      ? await createVoiceOptimizedChatCompletion(enhancedMessages, { voiceMode: true })
      : await createChatCompletion(enhancedMessages);
    
    res.json({ 
      message: reply,
      contentUsed: includeUploadedContent && user && contentMetadata.filesUsed > 0,
      contentMetadata
    });

  } catch (err: any) {
    console.error('Chat error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * POST /api/chat/authenticated - Authenticated chat with real user content
 * 
 * @route POST /api/chat/authenticated
 * @access Private (requires JWT authentication)
 * @param {IChatRequest} req.body - Chat messages and options
 * @returns {Object} AI response message with content indicators
 */
router.post('/authenticated', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { 
      messages, 
      includeUploadedContent = false,
      interviewType = 'general',
      maxContentTokens = 2000,
      voiceMode = false
    }: IChatRequest = req.body;

    // Validate messages
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: 'Invalid messages format' });
      return;
    }

    const user = (req as any).user;
    const userId = user._id || user.id;
    
    // Log usage analytics with real user
    console.log(`Authenticated chat - User: ${userId}, Content: ${includeUploadedContent}, Type: ${interviewType}`);

    // Process messages
    let enhancedMessages = [...messages];
    let contentMetadata = {
      filesUsed: 0,
      totalTokens: 0,
      categories: [] as string[]
    };

    // Integrate uploaded content if requested
    if (includeUploadedContent) {
      try {
        // Get user's uploaded files
        const userFiles = await UploadedFile.find({
          userId: userId as Types.ObjectId,
          processingStatus: PROCESSING_STATUS.COMPLETED,
          extractedText: { $exists: true, $ne: null }
        }).sort({ uploadedAt: -1 });

        if (userFiles.length > 0) {
          // Get conversation context
          const recentMessages = messages.slice(-5);
          const conversationContext = recentMessages
            .map(m => m.content)
            .join(' ');

          // Select relevant content
          const relevantContent = await selectRelevantContent(
            userFiles,
            conversationContext,
            maxContentTokens
          );

          if (relevantContent) {
            // Format content for prompt
            const formattedContent = formatContentForPrompt(userFiles);
            
            // Check if summarization is needed
            const contentTokens = estimateTokenCount(formattedContent);
            let contentToAdd = formattedContent;

            if (contentTokens > maxContentTokens) {
              contentToAdd = await summarizeContent(formattedContent);
            }

            // Enhance system message
            const systemMessageIndex = enhancedMessages.findIndex(m => m.role === 'system');
            if (systemMessageIndex >= 0 && enhancedMessages[systemMessageIndex]) {
              enhancedMessages[systemMessageIndex].content += `\n\n## User's Background Information\n\nThe user has uploaded the following documents. Use this information to personalize the interview and ask relevant questions:\n\n${contentToAdd}\n\n**Instructions for using this content:**\n- Reference the user's background naturally in your questions\n- Ask follow-up questions about experiences mentioned in their documents\n- Don't reveal specific details unless the user mentions them first\n- Use phrases like "I see you have experience with..." or "Based on your background..."\n`;
            }

            // Collect metadata
            contentMetadata = {
              filesUsed: userFiles.length,
              totalTokens: contentTokens,
              categories: [...new Set(userFiles.map(f => f.fileType))]
            };

            // Update file access times
            await Promise.all(userFiles.map(file => file.markAsAccessed()));
          }
        }
      } catch (error) {
        console.error('Error integrating uploaded content:', error);
      }
    }

    // Create chat completion (voice-optimized if voice mode enabled)
    const reply = voiceMode 
      ? await createVoiceOptimizedChatCompletion(enhancedMessages, {
          voiceMode: true,
          temperature: 0.7,
          max_tokens: 800 // Reduced for voice mode
        })
      : await createChatCompletion(enhancedMessages, {
          temperature: 0.7,
          max_tokens: 1000
        });
    
    res.json({ 
      message: reply,
      contentUsed: includeUploadedContent,
      contentMetadata: includeUploadedContent ? contentMetadata : undefined
    });

  } catch (err: any) {
    console.error('Authenticated chat error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * POST /api/chat/end-interview - Collect interview transcript when user ends interview
 * 
 * @route POST /api/chat/end-interview
 * @access Private (requires JWT authentication)
 * @param {IEndInterviewRequest} req.body - Interview messages and context
 * @returns {Object} Transcript ID for later feedback generation
 */
router.post('/end-interview', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { messages, interviewContext }: IEndInterviewRequest = req.body;
    const user = (req as any).user;
    const userId = user._id || user.id;

    // Validate input
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required and cannot be empty' });
      return;
    }

    if (!interviewContext) {
      res.status(400).json({ error: 'Interview context is required' });
      return;
    }

    // Validate messages contain both AI questions and user responses
    const hasUserResponses = messages.some(msg => msg.sender === 'user');
    const hasAiQuestions = messages.some(msg => msg.sender === 'ai');

    if (!hasUserResponses) {
      res.status(400).json({ error: 'Transcript must contain user responses' });
      return;
    }

    if (!hasAiQuestions) {
      res.status(400).json({ error: 'Transcript must contain AI questions' });
      return;
    }

    // Create interview transcript record
    const transcript = new InterviewTranscript({
      userId,
      messages,
      interviewContext
    });

    await transcript.save();

    console.log(`Interview transcript created for user ${userId}: ${transcript._id}`);
    console.log(`Messages: ${messages.length}, Context: ${JSON.stringify(interviewContext)}`);

    res.status(201).json({
      success: true,
      message: 'Interview transcript collected successfully',
      data: {
        transcriptId: transcript._id,
        messageCount: messages.length,
        status: transcript.status,
        expiresAt: transcript.expiresAt
      }
    });

  } catch (err: any) {
    console.error('End interview error:', err);
    res.status(500).json({ error: err.message || 'Failed to save interview transcript' });
  }
});

/**
 * POST /api/chat/generate-rating - Generate AI feedback from collected transcript
 * 
 * @route POST /api/chat/generate-rating
 * @access Private (requires JWT authentication)
 * @param {IGenerateRatingRequest} req.body - Transcript ID
 * @returns {Object} Complete AI feedback report
 */
router.post('/generate-rating', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { transcriptId }: IGenerateRatingRequest = req.body;
    const user = (req as any).user;
    const userId = user._id || user.id;

    // Validate input
    if (!transcriptId) {
      res.status(400).json({ error: 'Transcript ID is required' });
      return;
    }

    // Validate transcript ID format
    if (!Types.ObjectId.isValid(transcriptId)) {
      res.status(400).json({ error: 'Invalid transcript ID format' });
      return;
    }

    // Find the transcript
    const transcript = await InterviewTranscript.findById(transcriptId);
    
    if (!transcript) {
      res.status(404).json({ error: 'Transcript not found' });
      return;
    }

    // Verify ownership
    if (transcript.userId.toString() !== userId.toString()) {
      res.status(403).json({ error: 'Access denied: You can only generate ratings for your own transcripts' });
      return;
    }

    // Check if transcript is expired
    if (transcript.isExpired()) {
      res.status(410).json({ error: 'Transcript has expired' });
      return;
    }

    // Check if rating already exists
    if (transcript.status === 'rated' && transcript.aiRating) {
      res.json({
        success: true,
        message: 'Rating already exists',
        rating: transcript.aiRating,
        generatedAt: transcript.ratingGeneratedAt
      });
      return;
    }

    // Generate the AI rating
    try {
      await transcript.generateRating();
      
      console.log(`AI rating generated for transcript ${transcriptId}`);
      
      res.json({
        success: true,
        message: 'AI rating generated successfully',
        rating: transcript.aiRating,
        generatedAt: transcript.ratingGeneratedAt,
        metadata: {
          transcriptId: transcript._id,
          messageCount: transcript.messages.length,
          interviewType: transcript.interviewContext.interviewType,
          difficulty: transcript.interviewContext.difficulty
        }
      });

    } catch (ratingError: any) {
      console.error('AI rating generation failed:', ratingError);
      
      // Handle specific OpenAI errors
      if (ratingError.message.includes('rate limit')) {
        res.status(429).json({ 
          error: 'AI service is temporarily busy. Please try again in a few moments.',
          retryAfter: 60
        });
      } else if (ratingError.message.includes('authentication')) {
        res.status(503).json({ 
          error: 'AI service is temporarily unavailable. Please try again later.'
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to generate AI rating. Please try again.',
          details: ratingError.message
        });
      }
    }

  } catch (err: any) {
    console.error('Generate rating error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * GET /api/chat/rating/:transcriptId - Retrieve previously generated AI rating
 * 
 * @route GET /api/chat/rating/:transcriptId
 * @access Private (requires JWT authentication)
 * @param {string} req.params.transcriptId - Transcript ID
 * @returns {Object} Cached AI feedback report
 */
router.get('/rating/:transcriptId', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { transcriptId } = req.params;
    const user = (req as any).user;
    const userId = user._id || user.id;

    // Validate transcript ID is provided and has valid format
    if (!transcriptId || !Types.ObjectId.isValid(transcriptId)) {
      res.status(400).json({ error: 'Invalid transcript ID format' });
      return;
    }

    // Find the transcript
    const transcript = await InterviewTranscript.findById(transcriptId);
    
    if (!transcript) {
      res.status(404).json({ error: 'Transcript not found' });
      return;
    }

    // Verify ownership
    if (transcript.userId.toString() !== userId.toString()) {
      res.status(403).json({ error: 'Access denied: You can only access your own ratings' });
      return;
    }

    // Check if rating exists
    if (transcript.status !== 'rated' || !transcript.aiRating) {
      res.status(404).json({ 
        error: 'Rating not found',
        message: 'AI rating has not been generated for this transcript yet',
        status: transcript.status
      });
      return;
    }

    console.log(`AI rating retrieved for transcript ${transcriptId}`);

    res.json({
      success: true,
      message: 'AI rating retrieved successfully',
      rating: transcript.aiRating,
      generatedAt: transcript.ratingGeneratedAt,
      metadata: {
        transcriptId: transcript._id,
        messageCount: transcript.messages.length,
        interviewType: transcript.interviewContext.interviewType,
        difficulty: transcript.interviewContext.difficulty,
        createdAt: transcript.createdAt,
        expiresAt: transcript.expiresAt
      }
    });

  } catch (err: any) {
    console.error('Get rating error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * GET /api/chat/test-auth - Test authentication and user ID
 * 
 * @route GET /api/chat/test-auth
 * @access Public with optional auth
 * @returns {Object} Authentication status
 */
router.get('/test-auth', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = (req as any).user;
  res.json({
    authenticated: !!user,
    userId: user?._id?.toString() || user?.id?.toString() || null,
    userIdType: user?._id ? typeof user._id : null,
    userName: user?.name || null
  });
});

/**
 * GET /api/chat/debug-files - Debug endpoint to check user's uploaded files
 * 
 * @route GET /api/chat/debug-files
 * @access Private (requires JWT authentication)
 * @returns {Object} List of user's uploaded files with details
 */
router.get('/debug-files', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const userId = user._id || user.id;
    
    const files = await UploadedFile.find({
      userId: userId
    }).select('originalName fileType processingStatus extractedText uploadedAt');
    
    res.json({
      userId: userId.toString(),
      fileCount: files.length,
      files: files.map(f => ({
        id: f._id,
        name: f.originalName,
        type: f.fileType,
        status: f.processingStatus,
        hasText: !!f.extractedText,
        textLength: f.extractedText?.length || 0,
        textPreview: f.extractedText?.substring(0, 100) || null,
        uploadedAt: f.uploadedAt
      }))
    });
  } catch (error) {
    console.error('Error in debug-files:', error);
    res.status(500).json({ error: 'Failed to get debug info' });
  }
});

/**
 * GET /api/chat/content-summary - Get summary of user's uploaded content
 * 
 * @route GET /api/chat/content-summary
 * @access Private (requires JWT authentication)
 * @returns {Object} Summary of user's uploaded content
 */
router.get('/content-summary', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const userId = user._id || user.id;

    // Get user's uploaded content
    const content = await getUserUploadedContent(userId.toString());
    
    if (!content) {
      res.json({ 
        hasContent: false,
        summary: null
      });
      return;
    }

    // Get files for metadata
    const files = await UploadedFile.find({
      userId: userId,
      processingStatus: PROCESSING_STATUS.COMPLETED
    }).select('originalName fileType size uploadedAt');

    // Create summary
    const summary = content.length > 1000 
      ? await summarizeContent(content)
      : content;

    res.json({
      hasContent: true,
      summary,
      fileCount: files.length,
      files: files.map(f => ({
        name: f.originalName,
        type: f.fileType,
        uploadedAt: f.uploadedAt
      }))
    });

  } catch (error) {
    console.error('Error getting content summary:', error);
    res.status(500).json({ error: 'Failed to get content summary' });
  }
});

/**
 * POST /api/chat/voice-process - Process voice-related metadata and preferences
 * 
 * @route POST /api/chat/voice-process
 * @access Private (requires JWT authentication)
 * @param {IVoiceProcessRequest} req.body - Voice processing request with action and data
 * @returns {Object} Processing confirmation and updated preferences
 */
router.post('/voice-process', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { action, data }: IVoiceProcessRequest = req.body;
    const user = (req as any).user;
    const userId = user._id || user.id;

    // Validate input
    if (!action || !data) {
      res.status(400).json({ error: 'Action and data are required' });
      return;
    }

    // Validate action type
    const validActions = ['store_preferences', 'log_usage', 'report_error'];
    if (!validActions.includes(action)) {
      res.status(400).json({ error: 'Invalid action type' });
      return;
    }

    let response: any = {
      success: true,
      action,
      timestamp: new Date().toISOString()
    };

    switch (action) {
      case 'store_preferences':
        if (!data.preferences) {
          res.status(400).json({ error: 'Preferences data is required for store_preferences action' });
          return;
        }

        // Validate preferences structure
        const { preferences } = data;
        const validatedPreferences: any = {};

        // Validate and sanitize preferences
        if (typeof preferences.voiceEnabled === 'boolean') {
          validatedPreferences.voiceEnabled = preferences.voiceEnabled;
        }
        if (typeof preferences.selectedVoice === 'string' && preferences.selectedVoice.length <= 100) {
          validatedPreferences.selectedVoice = preferences.selectedVoice;
        }
        if (typeof preferences.speechRate === 'number' && preferences.speechRate >= 0.5 && preferences.speechRate <= 2.0) {
          validatedPreferences.speechRate = preferences.speechRate;
        }
        if (typeof preferences.speechVolume === 'number' && preferences.speechVolume >= 0 && preferences.speechVolume <= 1) {
          validatedPreferences.speechVolume = preferences.speechVolume;
        }
        if (typeof preferences.microphoneSensitivity === 'number' && preferences.microphoneSensitivity >= 0 && preferences.microphoneSensitivity <= 1) {
          validatedPreferences.microphoneSensitivity = preferences.microphoneSensitivity;
        }
        if (typeof preferences.autoPlayResponses === 'boolean') {
          validatedPreferences.autoPlayResponses = preferences.autoPlayResponses;
        }
        if (preferences.voiceGender && ['male', 'female', 'neutral'].includes(preferences.voiceGender)) {
          validatedPreferences.voiceGender = preferences.voiceGender;
        }
        if (typeof preferences.voiceLanguage === 'string' && preferences.voiceLanguage.length <= 10) {
          validatedPreferences.voiceLanguage = preferences.voiceLanguage;
        }

        // Store preferences (in production, this would be saved to user profile)
        console.log(`[VOICE PREFERENCES] User ${userId}:`, JSON.stringify(validatedPreferences, null, 2));

        // Record voice analytics event
        recordVoiceEvent(
          userId.toString(),
          'preference_change',
          { preferences: validatedPreferences },
          req.headers['user-agent'],
          undefined // device info would be extracted from user-agent in production
        );

        response.message = 'Voice preferences stored successfully';
        response.preferences = validatedPreferences;
        break;

      case 'log_usage':
        if (!data.usage) {
          res.status(400).json({ error: 'Usage data is required for log_usage action' });
          return;
        }

        // Validate and sanitize usage data
        const { usage } = data;
        const validatedUsage: any = {};

        if (typeof usage.sessionDuration === 'number' && usage.sessionDuration >= 0) {
          validatedUsage.sessionDuration = Math.min(usage.sessionDuration, 3600000); // Max 1 hour
        }
        if (typeof usage.speechRecognitionAttempts === 'number' && usage.speechRecognitionAttempts >= 0) {
          validatedUsage.speechRecognitionAttempts = Math.min(usage.speechRecognitionAttempts, 10000);
        }
        if (typeof usage.speechRecognitionSuccesses === 'number' && usage.speechRecognitionSuccesses >= 0) {
          validatedUsage.speechRecognitionSuccesses = Math.min(usage.speechRecognitionSuccesses, 10000);
        }
        if (typeof usage.textToSpeechUsage === 'number' && usage.textToSpeechUsage >= 0) {
          validatedUsage.textToSpeechUsage = Math.min(usage.textToSpeechUsage, 1000);
        }
        if (typeof usage.errorCount === 'number' && usage.errorCount >= 0) {
          validatedUsage.errorCount = Math.min(usage.errorCount, 1000);
        }
        if (typeof usage.browserInfo === 'string' && usage.browserInfo.length <= 200) {
          validatedUsage.browserInfo = usage.browserInfo;
        }
        if (typeof usage.deviceInfo === 'string' && usage.deviceInfo.length <= 200) {
          validatedUsage.deviceInfo = usage.deviceInfo;
        }

        // Calculate success rate if data is available
        let successRate = null;
        if (validatedUsage.speechRecognitionAttempts > 0) {
          successRate = (validatedUsage.speechRecognitionSuccesses || 0) / validatedUsage.speechRecognitionAttempts;
        }

        // Record voice usage analytics
        recordVoiceEvent(
          userId.toString(),
          'speech_attempt',
          { 
            usage: validatedUsage,
            successRate,
            attempts: validatedUsage.speechRecognitionAttempts,
            successes: validatedUsage.speechRecognitionSuccesses
          },
          validatedUsage.browserInfo,
          validatedUsage.deviceInfo
        );

        response.message = 'Voice usage analytics logged successfully';
        response.usage = validatedUsage;
        if (successRate !== null) {
          response.successRate = Math.round(successRate * 100) / 100;
        }
        break;

      case 'report_error':
        if (!data.error) {
          res.status(400).json({ error: 'Error data is required for report_error action' });
          return;
        }

        // Validate and sanitize error data
        const { error } = data;
        const validErrorTypes = ['speech_recognition', 'text_to_speech', 'browser_compatibility', 'microphone_permission', 'network', 'other'];
        
        if (!error.errorType || !validErrorTypes.includes(error.errorType)) {
          res.status(400).json({ error: 'Invalid error type' });
          return;
        }
        if (!error.errorMessage || typeof error.errorMessage !== 'string') {
          res.status(400).json({ error: 'Error message is required' });
          return;
        }
        if (!error.browserInfo || typeof error.browserInfo !== 'string') {
          res.status(400).json({ error: 'Browser info is required' });
          return;
        }
        if (!error.timestamp || typeof error.timestamp !== 'string') {
          res.status(400).json({ error: 'Timestamp is required' });
          return;
        }

        const validatedError = {
          errorType: error.errorType,
          errorMessage: error.errorMessage.substring(0, 1000), // Limit message length
          browserInfo: error.browserInfo.substring(0, 500),
          timestamp: error.timestamp,
          voiceCapabilities: error.voiceCapabilities || null,
          stackTrace: error.stackTrace ? error.stackTrace.substring(0, 2000) : null,
          userAgent: error.userAgent ? error.userAgent.substring(0, 500) : null
        };

        // Record voice error analytics
        recordVoiceEvent(
          userId.toString(),
          'speech_error',
          { error: validatedError },
          validatedError.browserInfo,
          undefined // device info would be extracted from user-agent in production
        );

        // In production, this would also:
        // - Send to error tracking service (Sentry, LogRocket, etc.)
        // - Update error metrics in analytics dashboard
        // - Trigger alerts for critical errors
        // - Store in dedicated error logging database

        response.message = 'Voice error reported successfully';
        response.errorId = `ve_${Date.now()}_${userId.toString().slice(-6)}`; // Generate error ID
        break;

      default:
        res.status(400).json({ error: 'Unknown action type' });
        return;
    }

    res.json(response);

  } catch (err: any) {
    console.error('Voice process error:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to process voice request',
      action: req.body?.action || 'unknown'
    });
  }
});

/**
 * GET /api/chat/voice-analytics - Get voice mode analytics summary
 * 
 * @route GET /api/chat/voice-analytics
 * @access Private (requires JWT authentication)
 * @returns {Object} Voice analytics summary with adoption, performance, and error metrics
 */
router.get('/voice-analytics', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const userId = user._id || user.id;

    // Get comprehensive voice analytics summary
    const analyticsSummary = await getVoiceAnalyticsSummary();

    console.log(`Voice analytics summary requested by user ${userId}`);

    res.json({
      success: true,
      message: 'Voice analytics summary retrieved successfully',
      data: analyticsSummary,
      timestamp: new Date().toISOString(),
      metadata: {
        requestedBy: userId.toString(),
        dataGeneratedAt: new Date().toISOString()
      }
    });

  } catch (err: any) {
    console.error('Voice analytics error:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to retrieve voice analytics',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
