/**
 * AI Interview Coach Backend - Interview Routes
 * 
 * This file implements interview management endpoints for creating and managing
 * interview sessions. It provides secure access to interview functionality with
 * proper authentication, validation, and error handling.
 * 
 * Key Features:
 * - Interview session creation with type and difficulty selection
 * - User authentication required for all endpoints
 * - Comprehensive input validation and error handling
 * - Session token generation for tracking interviews
 * - Proper HTTP status codes and response formatting
 * 
 * API Endpoints:
 * - POST /api/interviews - Create new interview session
 * 
 * Security Features:
 * - JWT authentication required for all endpoints
 * - Input validation to prevent malformed requests
 * - User ownership verification for interview sessions
 * - Rate limiting ready (can be integrated)
 * 
 * Request/Response Flow:
 * 1. Authenticate user via JWT middleware
 * 2. Validate request body structure and required fields
 * 3. Create interview with user reference and configuration
 * 4. Generate unique session token for tracking
 * 5. Return success response with interview data
 * 
 * Related Files:
 * - src/models/Interview.ts - Interview model and interfaces
 * - src/middleware/auth.ts - Authentication middleware
 * - src/services/openai.service.ts - Question generation (future)
 * 
 * Task: #14 - Interview routes with POST /api/interviews endpoint
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import Interview, { 
  IInterview, 
  InterviewType, 
  InterviewDifficulty,
  INTERVIEW_TYPES,
  INTERVIEW_DIFFICULTY,
  IInterviewQuestion 
} from '../models/Interview';
import User from '../models/User';
import { generateInterviewQuestions } from '../services/openai.service';
import { Types } from 'mongoose';
import crypto from 'crypto';
import mongoose from 'mongoose';

/**
 * Interface for creating a new interview request body
 * Defines the expected structure for interview creation
 */
interface ICreateInterviewRequest {
  interviewType: InterviewType;
  interviewDifficulty: InterviewDifficulty;
  duration?: number; // Optional, defaults to 30 minutes
  customPrompt?: string; // Optional custom instructions
  tags?: string[]; // Optional tags for categorization
}

/**
 * Interface for successful interview creation response
 * Provides consistent response structure
 */
interface ICreateInterviewResponse {
  success: boolean;
  message: string;
  interview: {
    id: string;
    userId: string;
    interviewType: InterviewType;
    interviewDifficulty: InterviewDifficulty;
    duration: number;
    sessionToken: string;
    status: string;
    totalQuestions: number;
    customPrompt?: string;
    tags?: string[];
    createdAt: string;
  };
}

/**
 * Interface for error response structure
 * Ensures consistent error format across endpoints
 */
interface IErrorResponse {
  error: string;
  message: string;
  details?: string[];
}

/**
 * Interface for pagination metadata
 * Provides consistent pagination information across list endpoints
 */
interface IPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Interface for interview list response
 * Defines the structure for returning multiple interviews with pagination
 */
interface IInterviewListResponse {
  success: boolean;
  message: string;
  interviews: Array<{
    id: string;
    userId: string;
    interviewType: InterviewType;
    interviewDifficulty: InterviewDifficulty;
    duration: number;
    sessionToken: string;
    status: string;
    totalQuestions: number;
    scheduledFor?: string;
    startedAt?: string;
    completedAt?: string;
    actualDuration?: number;
    customPrompt?: string;
    tags?: string[];
    score?: number;
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: IPaginationMeta;
}

/**
 * Interface for generate questions request body
 * Defines optional parameters for question generation customization
 */
interface IGenerateQuestionsRequest {
  questionCount?: number; // Number of questions to generate (default: 5)
  customPrompt?: string; // Custom instructions for question generation
  avoidPreviousQuestions?: boolean; // Whether to avoid repeating existing questions
}

/**
 * Interface for generate questions response
 * Provides the generated questions and metadata
 */
interface IGenerateQuestionsResponse {
  success: boolean;
  message: string;
  interview: {
    id: string;
    totalQuestions: number;
    questions: IInterviewQuestion[];
    generatedAt: string;
  };
  metadata: {
    questionsGenerated: number;
    interviewType: InterviewType;
    interviewDifficulty: InterviewDifficulty;
    userMajor?: string;
    tokenUsage?: {
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    };
  };
}

// Create Express router instance
const router = Router();

/**
 * POST /api/interviews
 * 
 * Creates a new interview session for the authenticated user with the specified
 * type and difficulty level. Generates a unique session token for tracking.
 * 
 * @route POST /api/interviews
 * @access Private (requires JWT authentication)
 * @param {ICreateInterviewRequest} req.body - Interview configuration
 * @returns {ICreateInterviewResponse | IErrorResponse} Interview data or error
 */
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Validate request body exists first
    if (!req.body) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Request body is required'
      } as IErrorResponse);
      return;
    }

    const { 
      interviewType, 
      interviewDifficulty, 
      duration = 30,
      customPrompt,
      tags 
    }: ICreateInterviewRequest = req.body;

    // Validate required fields
    if (!interviewType) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Interview type is required'
      } as IErrorResponse);
      return;
    }

    if (!interviewDifficulty) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Interview difficulty is required'
      } as IErrorResponse);
      return;
    }

    // Validate field types
    if (typeof interviewType !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Interview type must be a string'
      } as IErrorResponse);
      return;
    }

    if (typeof interviewDifficulty !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Interview difficulty must be a string'
      } as IErrorResponse);
      return;
    }

    // Validate field content is not empty
    if (interviewType.trim().length === 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Interview type cannot be empty'
      } as IErrorResponse);
      return;
    }

    if (interviewDifficulty.trim().length === 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Interview difficulty cannot be empty'
      } as IErrorResponse);
      return;
    }

    // Validate interview type
    const validTypes = Object.values(INTERVIEW_TYPES);
    if (!validTypes.includes(interviewType)) {
      res.status(400).json({
        error: 'Bad Request',
        message: `Interview type must be one of: ${validTypes.join(', ')}`,
        details: [`Received: ${interviewType}`]
      } as IErrorResponse);
      return;
    }

    // Validate interview difficulty
    const validDifficulties = Object.values(INTERVIEW_DIFFICULTY);
    if (!validDifficulties.includes(interviewDifficulty)) {
      res.status(400).json({
        error: 'Bad Request',
        message: `Interview difficulty must be one of: ${validDifficulties.join(', ')}`,
        details: [`Received: ${interviewDifficulty}`]
      } as IErrorResponse);
      return;
    }

    // Validate optional duration field
    if (duration !== undefined && duration !== null) {
      if (typeof duration !== 'number') {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Duration must be a number'
        } as IErrorResponse);
        return;
      }

      if (!Number.isInteger(duration)) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Duration must be a whole number of minutes'
        } as IErrorResponse);
        return;
      }

      if (duration < 5) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Interview duration must be at least 5 minutes'
        } as IErrorResponse);
        return;
      }

      if (duration > 120) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Interview duration must be no more than 120 minutes'
        } as IErrorResponse);
        return;
      }
    }

    // Validate optional custom prompt field
    if (customPrompt !== undefined && customPrompt !== null) {
      if (typeof customPrompt !== 'string') {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Custom prompt must be a string'
        } as IErrorResponse);
        return;
      }

      if (customPrompt.trim().length === 0) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Custom prompt cannot be empty if provided'
        } as IErrorResponse);
        return;
      }

      if (customPrompt.length > 500) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Custom prompt must be 500 characters or less'
        } as IErrorResponse);
        return;
      }
    }

    // Validate optional tags field
    if (tags !== undefined && tags !== null) {
      if (!Array.isArray(tags)) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Tags must be an array'
        } as IErrorResponse);
        return;
      }

      if (tags.length > 10) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Maximum of 10 tags are allowed'
        } as IErrorResponse);
        return;
      }

      // Validate each tag
      for (let i = 0; i < tags.length; i++) {
        const tag = tags[i];
        
        if (typeof tag !== 'string') {
          res.status(400).json({
            error: 'Bad Request',
            message: `Tag at index ${i} must be a string`
          } as IErrorResponse);
          return;
        }

        if (tag.trim().length === 0) {
          res.status(400).json({
            error: 'Bad Request',
            message: `Tag at index ${i} cannot be empty`
          } as IErrorResponse);
          return;
        }

        if (tag.length > 50) {
          res.status(400).json({
            error: 'Bad Request',
            message: `Tag at index ${i} must be 50 characters or less`
          } as IErrorResponse);
          return;
        }
      }
    }

    // Create new interview document
    const interviewData: any = {
      userId: new Types.ObjectId(req.user!._id.toString()),
      interviewType,
      interviewDifficulty,
      duration,
      questions: [], // Will be populated by question generation service
      totalQuestions: 0,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add optional fields only if they exist
    if (customPrompt) {
      interviewData.customPrompt = customPrompt;
    }
    if (tags && tags.length > 0) {
      interviewData.tags = tags;
    }

    // Save interview to database
    const interview = new Interview(interviewData);
    
    // Generate session token using model method
    interview.generateSessionToken();
    
    await interview.save();

    // Log successful interview creation
    console.log('Interview created successfully:', {
      timestamp: new Date().toISOString(),
      userId: req.user!._id.toString(),
      interviewId: interview._id,
      type: interviewType,
      difficulty: interviewDifficulty,
      sessionToken: interview.sessionToken
    });

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Interview session created successfully',
      interview: {
        id: (interview._id as Types.ObjectId).toString(),
        userId: interview.userId.toString(),
        interviewType: interview.interviewType,
        interviewDifficulty: interview.interviewDifficulty,
        duration: interview.duration,
        sessionToken: interview.sessionToken,
        status: interview.status,
        totalQuestions: interview.totalQuestions,
        customPrompt: interview.customPrompt,
        tags: interview.tags,
        createdAt: interview.createdAt.toISOString()
      }
    } as ICreateInterviewResponse);

  } catch (error) {
    // Log error for debugging
    console.error('Error creating interview:', {
      timestamp: new Date().toISOString(),
      userId: req.user?._id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    // Return generic error response
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create interview session. Please try again later.'
    } as IErrorResponse);
  }
});

/**
 * GET /api/interviews
 * 
 * Retrieves all interviews for the authenticated user, sorted by creation date
 * in descending order (most recent first). Provides pagination support and
 * filtering options for better performance with large datasets.
 * 
 * @route GET /api/interviews
 * @access Private (requires JWT authentication)
 * @returns {Array<IInterview> | IErrorResponse} Array of interview data or error
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Extract query parameters for validation (without defaults)
    const { 
      page: rawPage, 
      limit: rawLimit, 
      status, 
      type, 
      difficulty 
    } = req.query;

    // Validate limit parameter first (if present)
    if (rawLimit !== undefined) {
      if (typeof rawLimit !== 'string') {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Limit parameter must be a string number'
        } as IErrorResponse);
        return;
      }

      const limitNum = parseInt(rawLimit as string, 10);
      
      if (isNaN(limitNum)) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Limit parameter must be a valid number'
        } as IErrorResponse);
        return;
      }

      if (limitNum < 1) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Limit parameter must be 1 or greater'
        } as IErrorResponse);
        return;
      }

      if (limitNum > 100) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Limit parameter must be 100 or less'
        } as IErrorResponse);
        return;
      }
    }

    // Validate page parameter
    if (rawPage !== undefined) {
      if (typeof rawPage !== 'string') {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Page parameter must be a string number'
        } as IErrorResponse);
        return;
      }

      const pageNum = parseInt(rawPage as string, 10);
      
      if (isNaN(pageNum)) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Page parameter must be a valid number'
        } as IErrorResponse);
        return;
      }

      if (pageNum < 1) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Page parameter must be 1 or greater'
        } as IErrorResponse);
        return;
      }
    }

    // Validate status filter
    if (status !== undefined) {
      if (typeof status !== 'string') {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Status parameter must be a string'
        } as IErrorResponse);
        return;
      }

      if (status.trim().length === 0) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Status filter cannot be empty'
        } as IErrorResponse);
        return;
      }

      const validStatuses = ['pending', 'active', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Status filter must be one of: pending, active, completed, cancelled'
        } as IErrorResponse);
        return;
      }
    }

    // Set defaults after validation
    const page = rawPage ? parseInt(rawPage as string, 10) : 1;
    const limit = rawLimit ? parseInt(rawLimit as string, 10) : 20;



    // Validate type filter
    if (type !== undefined) {
      if (typeof type !== 'string') {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Type filter must be a string'
        } as IErrorResponse);
        return;
      }

      if (type.trim().length === 0) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Type filter cannot be empty'
        } as IErrorResponse);
        return;
      }

      const validTypes = Object.values(INTERVIEW_TYPES);
      if (!validTypes.includes(type as InterviewType)) {
        res.status(400).json({
          error: 'Bad Request',
          message: `Type filter must be one of: ${validTypes.join(', ')}`
        } as IErrorResponse);
        return;
      }
    }

    // Validate difficulty filter
    if (difficulty !== undefined) {
      if (typeof difficulty !== 'string') {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Difficulty filter must be a string'
        } as IErrorResponse);
        return;
      }

      if (difficulty.trim().length === 0) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Difficulty filter cannot be empty'
        } as IErrorResponse);
        return;
      }

      const validDifficulties = Object.values(INTERVIEW_DIFFICULTY);
      if (!validDifficulties.includes(difficulty as InterviewDifficulty)) {
        res.status(400).json({
          error: 'Bad Request',
          message: `Difficulty filter must be one of: ${validDifficulties.join(', ')}`
        } as IErrorResponse);
        return;
      }
    }

    // Build filter object
    const filter: any = { userId: new Types.ObjectId(req.user!._id.toString()) };
    
    // Add optional filters if provided
    if (status && typeof status === 'string') {
      filter.status = status;
    }
    if (type && typeof type === 'string') {
      filter.interviewType = type;
    }
    if (difficulty && typeof difficulty === 'string') {
      filter.interviewDifficulty = difficulty;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination info
    const total = await Interview.countDocuments(filter);

    // Retrieve interviews sorted by createdAt descending
    const interviews = await Interview.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Use lean() for better performance as we don't need model methods

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Log successful interviews retrieval
    console.log('Interviews retrieved successfully:', {
      timestamp: new Date().toISOString(),
      userId: req.user!._id.toString(),
      total,
      page: page,
      limit: limit,
      filters: filter
    });

    // Return interviews with pagination metadata
    res.status(200).json({
      success: true,
      message: 'Interviews retrieved successfully',
      interviews: interviews.map(interview => ({
        id: interview._id.toString(),
        userId: interview.userId.toString(),
        interviewType: interview.interviewType,
        interviewDifficulty: interview.interviewDifficulty,
        duration: interview.duration,
        sessionToken: interview.sessionToken,
        status: interview.status,
        totalQuestions: interview.totalQuestions,
        scheduledFor: interview.scheduledFor?.toISOString(),
        startedAt: interview.startedAt?.toISOString(),
        completedAt: interview.completedAt?.toISOString(),
        actualDuration: interview.actualDuration,
        customPrompt: interview.customPrompt,
        tags: interview.tags,
        score: interview.score,
        createdAt: interview.createdAt.toISOString(),
        updatedAt: interview.updatedAt.toISOString()
      })),
      pagination: {
        page: page,
        limit: limit,
        total,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    } as IInterviewListResponse);

  } catch (error) {
    // Log error for debugging
    console.error('Error retrieving interviews:', {
      timestamp: new Date().toISOString(),
      userId: req.user?._id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    // Return generic error response
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve interviews. Please try again later.'
    } as IErrorResponse);
  }
});

/**
 * GET /api/interviews/:id
 * 
 * Retrieves a specific interview by its ID. Validates that the requesting user
 * owns the interview before returning the data. Provides comprehensive error
 * handling for not found and unauthorized access scenarios.
 * 
 * @route GET /api/interviews/:id
 * @access Private (requires JWT authentication)
 * @param {string} req.params.id - Interview ID to retrieve
 * @returns {IInterview | IErrorResponse} Interview data or error
 */
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate that ID is provided
    if (!id) {
      res.status(400).json({
        error: 'Missing interview ID',
        message: 'Interview ID is required',
        details: ['ID parameter is missing from the request']
      } as IErrorResponse);
      return;
    }

    // Validate MongoDB ObjectId format
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        error: 'Invalid interview ID',
        message: 'The provided interview ID is not a valid format',
        details: [`Received: ${id}`]
      } as IErrorResponse);
      return;
    }

    // Find interview by ID
    const interview = await Interview.findById(id);

    // Check if interview exists
    if (!interview) {
      res.status(404).json({
        error: 'Interview not found',
        message: 'The requested interview does not exist or has been deleted'
      } as IErrorResponse);
      return;
    }

    // Verify user ownership (interview is guaranteed to be non-null here)
    if (interview.userId.toString() !== req.user!._id.toString()) {
      res.status(403).json({
        error: 'Access forbidden',
        message: 'You do not have permission to access this interview'
      } as IErrorResponse);
      return;
    }

    // Log successful interview retrieval
    console.log('Interview retrieved successfully:', {
      timestamp: new Date().toISOString(),
      userId: req.user!._id.toString(),
      interviewId: interview._id,
      type: interview.interviewType,
      status: interview.status
    });

    // Return interview data
    res.status(200).json({
      success: true,
      message: 'Interview retrieved successfully',
      interview: {
        id: (interview._id as Types.ObjectId).toString(),
        userId: interview.userId.toString(),
        interviewType: interview.interviewType,
        interviewDifficulty: interview.interviewDifficulty,
        duration: interview.duration,
        sessionToken: interview.sessionToken,
        status: interview.status,
        totalQuestions: interview.totalQuestions,
        questions: interview.questions,
        scheduledFor: interview.scheduledFor?.toISOString(),
        startedAt: interview.startedAt?.toISOString(),
        completedAt: interview.completedAt?.toISOString(),
        actualDuration: interview.actualDuration,
        customPrompt: interview.customPrompt,
        tags: interview.tags,
        score: interview.score,
        createdAt: interview.createdAt.toISOString(),
        updatedAt: interview.updatedAt.toISOString()
      }
    });

  } catch (error) {
    // Log error for debugging
    console.error('Error retrieving interview:', {
      timestamp: new Date().toISOString(),
      userId: req.user?._id,
      interviewId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    // Return generic error response
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve interview. Please try again later.'
    } as IErrorResponse);
  }
});

/**
 * POST /api/interviews/:id/generate-questions
 * 
 * Generates interview questions for a specific interview using the OpenAI service
 * and updates the interview document with the generated questions. Uses the user's
 * profile information to personalize question generation.
 * 
 * @route POST /api/interviews/:id/generate-questions
 * @access Private (requires JWT authentication)
 * @param {string} req.params.id - Interview ID to generate questions for
 * @returns {IInterview | IErrorResponse} Updated interview with questions or error
 */
router.post('/:id/generate-questions', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Validate that ID is provided
    if (!id) {
      res.status(400).json({
        error: 'Missing interview ID',
        message: 'Interview ID is required',
        details: ['ID parameter is missing from the request']
      } as IErrorResponse);
      return;
    }

    // Validate MongoDB ObjectId format
    if (!Types.ObjectId.isValid(id)) {
      res.status(400).json({
        error: 'Invalid interview ID',
        message: 'The provided interview ID is not a valid format',
        details: [`Received: ${id}`]
      } as IErrorResponse);
      return;
    }

    // Find interview by ID
    const interview = await Interview.findById(id);

    // Check if interview exists
    if (!interview) {
      res.status(404).json({
        error: 'Interview not found',
        message: 'The requested interview does not exist or has been deleted'
      } as IErrorResponse);
      return;
    }

    // Verify user ownership
    if (interview.userId.toString() !== req.user!._id.toString()) {
      res.status(403).json({
        error: 'Access forbidden',
        message: 'You do not have permission to access this interview'
      } as IErrorResponse);
      return;
    }

    // Check if questions have already been generated
    if (interview.questions.length > 0) {
      res.status(409).json({
        error: 'Questions already generated',
        message: 'This interview already has questions. Delete existing questions first to regenerate.',
        details: [`Current question count: ${interview.questions.length}`]
      } as IErrorResponse);
      return;
    }

    // Get user profile for personalized question generation
    const user = await User.findById(req.user!._id);
    if (!user) {
      res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      } as IErrorResponse);
      return;
    }

    // Prepare parameters for question generation
    const userMajor = user.targetMajor || 'General Studies';
    const questionCount = 5; // Default number of questions

    try {
      // Generate questions using OpenAI service
      const additionalParams: any = {
        questionCount
      };
      
      if (interview.customPrompt) additionalParams.customPrompt = interview.customPrompt;
      if (user.targetColleges) additionalParams.targetColleges = user.targetColleges;
      if (user.grade) additionalParams.userGrade = user.grade;
      if (user.strengths) additionalParams.userStrengths = user.strengths;
      if (user.weaknesses) additionalParams.userWeaknesses = user.weaknesses;
      
      const generatedQuestions = await generateInterviewQuestions(
        interview.interviewType,
        interview.interviewDifficulty,
        userMajor,
        additionalParams
      );

      // Convert generated questions to interview question format
      const interviewQuestions: IInterviewQuestion[] = generatedQuestions.map((questionText, index) => ({
        id: crypto.randomUUID(),
        text: questionText,
        category: interview.interviewType,
        expectedDuration: 120, // 2 minutes default per question
        hints: [],
        followUps: [],
        order: index + 1
      }));

      // Update interview with generated questions
      interview.questions = interviewQuestions;
      interview.totalQuestions = interviewQuestions.length;
      interview.updatedAt = new Date();

      // Save updated interview
      await interview.save();

      // Log successful question generation
      console.log('Questions generated successfully:', {
        timestamp: new Date().toISOString(),
        userId: req.user!._id.toString(),
        interviewId: interview._id,
        questionCount: interviewQuestions.length,
        interviewType: interview.interviewType,
        difficulty: interview.interviewDifficulty,
        userMajor
      });

      // Return updated interview with questions
      res.status(200).json({
        success: true,
        message: `Successfully generated ${interviewQuestions.length} questions for the interview`,
        interview: {
          id: (interview._id as Types.ObjectId).toString(),
          userId: interview.userId.toString(),
          interviewType: interview.interviewType,
          interviewDifficulty: interview.interviewDifficulty,
          duration: interview.duration,
          sessionToken: interview.sessionToken,
          status: interview.status,
          totalQuestions: interview.totalQuestions,
          questions: interview.questions,
          scheduledFor: interview.scheduledFor?.toISOString(),
          startedAt: interview.startedAt?.toISOString(),
          completedAt: interview.completedAt?.toISOString(),
          actualDuration: interview.actualDuration,
          customPrompt: interview.customPrompt,
          tags: interview.tags,
          score: interview.score,
          createdAt: interview.createdAt.toISOString(),
          updatedAt: interview.updatedAt.toISOString()
        }
      });

    } catch (openaiError: any) {
      // Handle OpenAI service errors specifically
      console.error('OpenAI question generation failed:', {
        timestamp: new Date().toISOString(),
        userId: req.user!._id.toString(),
        interviewId: interview._id,
        error: openaiError.message,
        interviewType: interview.interviewType,
        difficulty: interview.interviewDifficulty,
        userMajor
      });

      // Return specific error for OpenAI failures
      res.status(503).json({
        error: 'Question generation failed',
        message: 'Failed to generate interview questions. Please try again later.',
        details: [openaiError.message]
      } as IErrorResponse);
      return;
    }

  } catch (error) {
    // Log error for debugging
    console.error('Error generating interview questions:', {
      timestamp: new Date().toISOString(),
      userId: req.user?._id,
      interviewId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    // Return generic error response
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate interview questions. Please try again later.'
    } as IErrorResponse);
  }
});

/**
 * POST /api/interviews/:id/start - Start an interview session
 * 
 * @route POST /api/interviews/:id/start
 * @access Private (requires JWT authentication)
 * @param {string} req.params.id - Interview ID
 * @returns {Object} Success response with updated interview
 */
router.post('/:id/start', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user!._id.toString();

    // Validate interview ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid interview ID format'
      } as IErrorResponse);
      return;
    }

    // Find interview
    const interview = await Interview.findById(id);
    if (!interview) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Interview not found'
      } as IErrorResponse);
      return;
    }

    // Verify ownership
    if (interview.userId.toString() !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: Interview belongs to another user'
      } as IErrorResponse);
      return;
    }

    // Start the interview
    await interview.start();

    res.status(200).json({
      success: true,
      message: 'Interview started successfully',
      interview: {
        id: (interview._id as Types.ObjectId).toString(),
        status: interview.status,
        startedAt: interview.startedAt?.toISOString(),
        sessionToken: interview.sessionToken
      }
    });

  } catch (error: any) {
    console.error('Error starting interview:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to start interview'
    } as IErrorResponse);
  }
});

/**
 * POST /api/interviews/:id/complete - Complete an interview session
 * 
 * @route POST /api/interviews/:id/complete
 * @access Private (requires JWT authentication)
 * @param {string} req.params.id - Interview ID
 * @param {number} req.body.score - Optional interview score (0-100)
 * @returns {Object} Success response with completed interview
 */
router.post('/:id/complete', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { score } = req.body;
    const userId = req.user!._id.toString();

    // Validate interview ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid interview ID format'
      } as IErrorResponse);
      return;
    }

    // Validate optional score
    if (score !== undefined && score !== null) {
      if (typeof score !== 'number' || score < 0 || score > 100) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Score must be a number between 0 and 100'
        } as IErrorResponse);
        return;
      }
    }

    // Find interview
    const interview = await Interview.findById(id);
    if (!interview) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Interview not found'
      } as IErrorResponse);
      return;
    }

    // Verify ownership
    if (interview.userId.toString() !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: Interview belongs to another user'
      } as IErrorResponse);
      return;
    }

    // Complete the interview
    await interview.complete(score);

    res.status(200).json({
      success: true,
      message: 'Interview completed successfully',
      interview: {
        id: (interview._id as Types.ObjectId).toString(),
        status: interview.status,
        startedAt: interview.startedAt?.toISOString(),
        completedAt: interview.completedAt?.toISOString(),
        actualDuration: interview.actualDuration,
        score: interview.score
      }
    });

  } catch (error: any) {
    console.error('Error completing interview:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to complete interview'
    } as IErrorResponse);
  }
});

/**
 * POST /api/interviews/:id/stop - Stop an active interview session
 * 
 * Stops an interview that is currently in progress. This allows users to terminate
 * an interview session before natural completion, setting the status to 'cancelled'
 * and recording the stop time.
 * 
 * @route POST /api/interviews/:id/stop
 * @access Private (requires JWT authentication)
 * @param {string} req.params.id - Interview ID
 * @returns {Object} Success response with stopped interview data
 */
router.post('/:id/stop', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user!._id.toString();

    // Validate interview ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid interview ID format'
      } as IErrorResponse);
      return;
    }

    // Find interview
    const interview = await Interview.findById(id);
    if (!interview) {
      res.status(404).json({
        error: 'Not Found',
        message: 'Interview not found'
      } as IErrorResponse);
      return;
    }

    // Verify ownership
    if (interview.userId.toString() !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: Interview belongs to another user'
      } as IErrorResponse);
      return;
    }

    // Check if interview can be stopped (must be active)
    if (interview.status !== 'active') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Only active interviews can be stopped'
      } as IErrorResponse);
      return;
    }

    // Stop the interview by cancelling it
    await interview.cancel('User stopped interview');

    res.status(200).json({
      success: true,
      message: 'Interview stopped successfully',
      interview: {
        id: (interview._id as Types.ObjectId).toString(),
        status: interview.status,
        startedAt: interview.startedAt?.toISOString(),
        stoppedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('Error stopping interview:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to stop interview'
    } as IErrorResponse);
  }
});

export default router; 