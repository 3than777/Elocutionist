/**
 * AI Interview Coach Backend - Session Routes
 * 
 * This file implements session recording management endpoints for handling audio transcription,
 * transcript storage, and session data management. It provides secure access to session functionality
 * with proper authentication, validation, and error handling.
 * 
 * Key Features:
 * - Audio file upload and transcription using OpenAI Whisper
 * - Session recording creation and management
 * - Transcript entry storage and retrieval
 * - User authentication required for all endpoints
 * - Comprehensive input validation and error handling
 * 
 * API Endpoints:
 * - POST /api/sessions/:interviewId/transcribe - Upload and transcribe audio file
 * - POST /api/sessions - Create new session recording
 * - POST /api/sessions/:id/transcript - Append transcript entry to existing session
 * - GET /api/sessions/interview/:interviewId - Retrieve session recording for specific interview
 * - POST /api/sessions/:id/generate-feedback - Generate AI feedback for session transcript
 * - GET /api/sessions/:id/feedback - Retrieve feedback and score for completed session
 * 
 * Security Features:
 * - JWT authentication required for all endpoints
 * - Interview ownership verification
 * - Audio file validation and size limits
 * - Rate limiting ready (can be integrated)
 * 
 * Request/Response Flow:
 * 1. Authenticate user via JWT middleware
 * 2. Validate interview existence and ownership
 * 3. Process uploaded audio file
 * 4. Transcribe audio using OpenAI Whisper
 * 5. Create or update session recording with transcript
 * 6. Return success response with transcription data
 * 
 * Related Files:
 * - src/models/SessionRecording.ts - Session recording model and interfaces
 * - src/models/Interview.ts - Interview model for ownership verification
 * - src/middleware/auth.ts - Authentication middleware
 * - src/middleware/upload.ts - File upload middleware
 * - src/services/openai.service.ts - Audio transcription service
 * 
 * Task: #23 - Session transcription endpoint with audio upload and Whisper integration
 * Task: #26 - GET endpoint to retrieve session recording by interview ID
 * Task: #27 - POST endpoint to generate AI feedback for session transcript
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { uploadSingleAudio, getUploadErrorMessage } from '../middleware/upload';
import Interview from '../models/Interview';
import SessionRecording, { ISessionRecording, ITranscriptEntry } from '../models/SessionRecording';
import User, { IUser } from '../models/User';
import { transcribeAudio, ITranscriptionResponse as IOpenAITranscriptionResponse, analyzeFeedback, IFeedbackAnalysisParams } from '../services/openai.service';
import mongoose from 'mongoose';



/**
 * Interface for transcription request body (from form data)
 */
interface ITranscriptionRequestBody {
  speaker?: 'user' | 'ai' | 'system';
  language?: string;
  prompt?: string;
}

/**
 * Interface for transcription response
 */
interface ITranscriptionResponse {
  success: boolean;
  message: string;
  data: {
    sessionId: string;
    transcriptEntry: ITranscriptEntry;
    totalEntries: number;
    sessionDuration?: number;
  };
}

/**
 * Interface for error response
 */
interface IErrorResponse {
  success: false;
  message: string;
  code?: string;
  details?: any;
}

/**
 * Interface for create session request body
 */
interface ICreateSessionRequest {
  interviewId: string;
}

/**
 * Interface for create session response
 */
interface ICreateSessionResponse {
  success: boolean;
  message: string;
  data: {
    sessionId: string;
    interviewId: string;
    userId: string;
    status: string;
    processingStatus: {
      transcription: string;
      analysis: string;
      feedback: string;
    };
    createdAt: Date;
  };
}

/**
 * Interface for append transcript request body
 */
interface IAppendTranscriptRequest {
  speaker: 'user' | 'ai' | 'system';
  text: string;
  audioUrl?: string;
  confidence?: number;
  duration?: number;
}

/**
 * Interface for append transcript response
 */
interface IAppendTranscriptResponse {
  success: boolean;
  message: string;
  data: {
    sessionId: string;
    transcriptEntry: ITranscriptEntry;
    totalEntries: number;
    sessionDuration: number;
  };
}

const router = Router();

/**
 * POST /api/sessions
 * 
 * Creates a new session recording for an interview with an initial empty transcript.
 * This endpoint initializes a session that can later receive transcript entries
 * via the transcribe endpoint or other session management endpoints.
 * 
 * Request Body:
 * - interviewId (string): MongoDB ObjectId of the interview to create session for
 * 
 * Response:
 * - 201 Created: Session recording created successfully
 * - 400 Bad Request: Invalid interview ID or validation errors
 * - 403 Forbidden: User doesn't own the interview
 * - 404 Not Found: Interview not found
 * - 409 Conflict: Session already exists for this interview
 * - 500 Internal Server Error: Database or server errors
 * 
 * Security:
 * - Requires JWT authentication
 * - Verifies interview ownership
 * - Prevents duplicate sessions per interview
 * 
 * @example
 * ```bash
 * curl -X POST /api/sessions \
 *   -H "Authorization: Bearer your-jwt-token" \
 *   -H "Content-Type: application/json" \
 *   -d '{"interviewId": "60f7b3b3b3b3b3b3b3b3b3b3"}'
 * ```
 */
router.post(
  '/',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Validate request body exists first
      if (!req.body) {
        res.status(400).json({
          success: false,
          message: 'Request body is required',
          code: 'MISSING_REQUEST_BODY'
        } as IErrorResponse);
        return;
      }

      const { interviewId } = req.body as ICreateSessionRequest;

      // Validate interviewId field
      if (!interviewId) {
        res.status(400).json({
          success: false,
          message: 'Interview ID is required',
          code: 'MISSING_INTERVIEW_ID'
        } as IErrorResponse);
        return;
      }

      // Validate interviewId type
      if (typeof interviewId !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Interview ID must be a string',
          code: 'INVALID_INTERVIEW_ID_TYPE'
        } as IErrorResponse);
        return;
      }

      // Validate interviewId is not empty
      if (interviewId.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'Interview ID cannot be empty',
          code: 'EMPTY_INTERVIEW_ID'
        } as IErrorResponse);
        return;
      }

      // Validate MongoDB ObjectId format
      if (!mongoose.Types.ObjectId.isValid(interviewId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid or missing interview ID. Please provide a valid MongoDB ObjectId.',
          code: 'INVALID_INTERVIEW_ID'
        } as IErrorResponse);
        return;
      }

      // Find interview and verify ownership
      const interview = await Interview.findById(interviewId);
      if (!interview) {
        res.status(404).json({
          success: false,
          message: 'Interview not found',
          code: 'INTERVIEW_NOT_FOUND'
        } as IErrorResponse);
        return;
      }

      // Verify user owns the interview
      if (interview.userId.toString() !== (req.user as any)._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You can only create sessions for your own interviews.',
          code: 'INTERVIEW_ACCESS_DENIED'
        } as IErrorResponse);
        return;
      }

      // Check if session already exists
      const existingSession = await SessionRecording.findOne({ interviewId });
      if (existingSession) {
        res.status(409).json({
          success: false,
          message: 'A session recording already exists for this interview',
          code: 'SESSION_ALREADY_EXISTS',
          details: {
            sessionId: existingSession._id,
            createdAt: existingSession.createdAt
          }
        } as IErrorResponse);
        return;
      }

      // Create new session recording with empty transcript
      const sessionRecording = new SessionRecording({
        interviewId: new mongoose.Types.ObjectId(interviewId),
        userId: (req.user as any)._id,
        transcript: [], // Empty transcript as requested
        transcriptComplete: false,
        analysisComplete: false,
        sessionStartTime: new Date(),
        isActive: true,
        processingStatus: {
          transcription: 'pending',
          analysis: 'pending',
          feedback: 'pending'
        }
      });

      await sessionRecording.save();

      console.log(`Created new session recording ${sessionRecording._id} for interview ${interviewId}`);

      // Return success response
      res.status(201).json({
        success: true,
        message: 'Session recording created successfully',
        data: {
          sessionId: (sessionRecording._id as mongoose.Types.ObjectId).toString(),
          interviewId: sessionRecording.interviewId.toString(),
          userId: sessionRecording.userId.toString(),
          status: sessionRecording.isActive ? 'active' : 'inactive',
          processingStatus: {
            transcription: sessionRecording.processingStatus.transcription,
            analysis: sessionRecording.processingStatus.analysis,
            feedback: sessionRecording.processingStatus.feedback
          },
          createdAt: sessionRecording.createdAt
        }
      } as ICreateSessionResponse);

    } catch (error: any) {
      console.error('Error creating session recording:', {
        error: error.message,
        stack: error.stack,
        interviewId: req.body.interviewId,
        userId: (req.user as any)?._id
      });

      res.status(500).json({
        success: false,
        message: 'An unexpected error occurred while creating session recording',
        code: 'INTERNAL_SERVER_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      } as IErrorResponse);
    }
  }
);

/**
 * POST /api/sessions/:interviewId/transcribe
 * 
 * Uploads audio file, transcribes it using OpenAI Whisper, and creates/updates
 * session recording with the transcript entry. Supports multiple audio formats
 * and provides real-time transcript building for interview sessions.
 * 
 * Route Parameters:
 * - interviewId (string): MongoDB ObjectId of the interview session
 * 
 * Request Body (multipart/form-data):
 * - audio (file): Audio file (mp3, wav, webm, mp4, m4a, ogg, flac) - max 10MB
 * - speaker (optional): Speaker identification ('user', 'ai', 'system') - default 'user'
 * - language (optional): ISO-639-1 language code for transcription hint
 * - prompt (optional): Text to guide transcription style/context
 * 
 * Response:
 * - 201 Created: Transcription successful with session data
 * - 400 Bad Request: Invalid interview ID, missing file, or validation errors
 * - 403 Forbidden: User doesn't own the interview
 * - 404 Not Found: Interview not found
 * - 413 Payload Too Large: Audio file exceeds size limit
 * - 500 Internal Server Error: Transcription or database errors
 * 
 * @example
 * ```bash
 * curl -X POST /api/sessions/60f7b3b3b3b3b3b3b3b3b3b3/transcribe \
 *   -H "Authorization: Bearer your-jwt-token" \
 *   -F "audio=@recording.mp3" \
 *   -F "speaker=user" \
 *   -F "language=en"
 * ```
 */
router.post(
  '/:interviewId/transcribe',
  authenticateToken,
  uploadSingleAudio('audio'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
                    const { interviewId } = req.params;
       const { speaker = 'user', language, prompt } = req.body as ITranscriptionRequestBody;
       
       // Validate interview ID format
       if (!interviewId || !mongoose.Types.ObjectId.isValid(interviewId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid interview ID format',
          code: 'INVALID_INTERVIEW_ID'
        } as IErrorResponse);
        return;
      }

      // Check if audio file was uploaded
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No audio file uploaded. Please provide an audio file in the "audio" field.',
          code: 'MISSING_AUDIO_FILE'
        } as IErrorResponse);
        return;
      }

      // Find interview and verify ownership
      const interview = await Interview.findById(interviewId);
      if (!interview) {
        res.status(404).json({
          success: false,
          message: 'Interview not found',
          code: 'INTERVIEW_NOT_FOUND'
        } as IErrorResponse);
        return;
      }

             // Verify user owns the interview
       if (interview.userId.toString() !== (req.user as any)._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You can only transcribe your own interviews.',
          code: 'INTERVIEW_ACCESS_DENIED'
        } as IErrorResponse);
        return;
      }

      console.log(`Starting transcription for interview ${interviewId}, file: ${req.file.originalname} (${req.file.size} bytes)`);

             // Transcribe audio using OpenAI Whisper
       let transcriptionResult: IOpenAITranscriptionResponse;
      try {
                 const transcriptionOptions: any = {
           responseFormat: 'verbose_json',
           timestampGranularities: ['segment'],
           temperature: 0.0
         };
         
         if (language) transcriptionOptions.language = language;
         if (prompt) transcriptionOptions.prompt = prompt;
         
         transcriptionResult = await transcribeAudio(
           req.file.buffer,
           req.file.originalname,
           transcriptionOptions
         );
      } catch (transcriptionError: any) {
        console.error('Transcription failed:', {
          error: transcriptionError.message,
          interviewId,
          filename: req.file.originalname,
          fileSize: req.file.size
        });

        res.status(500).json({
          success: false,
          message: `Transcription failed: ${transcriptionError.message}`,
          code: 'TRANSCRIPTION_ERROR',
          details: {
            filename: req.file.originalname,
            fileSize: req.file.size
          }
        } as IErrorResponse);
        return;
      }

             // Create transcript entry
       const transcriptEntry: ITranscriptEntry = {
         speaker,
         text: transcriptionResult.text,
         timestamp: Date.now()
       };
       
       // Add optional fields if they have values
       if (transcriptionResult.segments) {
         transcriptEntry.confidence = transcriptionResult.segments.reduce((avg, seg) => avg + (1 - seg.no_speech_prob), 0) / transcriptionResult.segments.length;
       }
       
       if (transcriptionResult.duration) {
         transcriptEntry.duration = Math.round(transcriptionResult.duration * 1000);
       }

      // Find existing session recording or create new one
      let sessionRecording = await SessionRecording.findOne({ interviewId });

      if (sessionRecording) {
        // Update existing session recording
        sessionRecording.transcript.push(transcriptEntry);
        sessionRecording.processingStatus.transcription = 'completed';
        
        // Update session metadata if this is the first transcript entry
        if (sessionRecording.transcript.length === 1) {
          sessionRecording.sessionStartTime = new Date();
          sessionRecording.isActive = true;
        }
        
        await sessionRecording.save();
      } else {
                 // Create new session recording
         sessionRecording = new SessionRecording({
           interviewId: new mongoose.Types.ObjectId(interviewId),
           userId: (req.user as any)._id,
          transcript: [transcriptEntry],
          transcriptComplete: false,
          analysisComplete: false,
          sessionStartTime: new Date(),
          isActive: true,
          processingStatus: {
            transcription: 'completed',
            analysis: 'pending',
            feedback: 'pending'
          }
        });

        await sessionRecording.save();
      }

      // Calculate total session duration if we have timestamps
      let sessionDuration: number | undefined;
      if (sessionRecording.transcript.length > 1) {
        const firstEntry = sessionRecording.transcript[0];
        const lastEntry = sessionRecording.transcript[sessionRecording.transcript.length - 1];
        if (firstEntry && lastEntry) {
          sessionDuration = lastEntry.timestamp - firstEntry.timestamp;
        }
      }

      console.log(`Transcription completed for interview ${interviewId}: "${transcriptionResult.text.substring(0, 100)}..."`);

      // Return success response
      res.status(201).json({
        success: true,
        message: 'Audio transcribed and added to session recording successfully',
                 data: {
           sessionId: (sessionRecording._id as mongoose.Types.ObjectId).toString(),
          transcriptEntry: {
            speaker: transcriptEntry.speaker,
            text: transcriptEntry.text,
            timestamp: transcriptEntry.timestamp,
            confidence: transcriptEntry.confidence,
            duration: transcriptEntry.duration
          },
          totalEntries: sessionRecording.transcript.length,
          sessionDuration
        }
      } as ITranscriptionResponse);

    } catch (error: any) {
      console.error('Error in transcription endpoint:', {
        error: error.message,
        stack: error.stack,
        interviewId: req.params.interviewId,
                 userId: (req.user as any)?._id
      });

      res.status(500).json({
        success: false,
        message: 'An unexpected error occurred during transcription',
        code: 'INTERNAL_SERVER_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      } as IErrorResponse);
    }
  }
);

/**
 * POST /api/sessions/:id/transcript
 * 
 * Appends a new transcript entry (speaker, text, timestamp) to an existing session recording.
 * This endpoint is useful for real-time transcript building where text is already available
 * (e.g., from live transcription services or manual input) without needing audio processing.
 * 
 * Route Parameters:
 * - id (string): MongoDB ObjectId of the session recording
 * 
 * Request Body:
 * - speaker (string, required): Speaker identification ('user', 'ai', 'system')
 * - text (string, required): The transcript text to append
 * - audioUrl (string, optional): URL to the audio recording for this entry
 * - confidence (number, optional): Confidence score (0-1) for the transcription
 * - duration (number, optional): Duration of this speech segment in milliseconds
 * 
 * Response:
 * - 201 Created: Transcript entry appended successfully
 * - 400 Bad Request: Invalid session ID or validation errors
 * - 403 Forbidden: User doesn't own the session
 * - 404 Not Found: Session recording not found
 * - 500 Internal Server Error: Database errors
 * 
 * Security:
 * - Requires JWT authentication
 * - Verifies session ownership through user ID
 * 
 * @example
 * ```bash
 * curl -X POST /api/sessions/60f7b3b3b3b3b3b3b3b3b3b3/transcript \
 *   -H "Authorization: Bearer your-jwt-token" \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "speaker": "user",
 *     "text": "I have experience in project management...",
 *     "confidence": 0.95
 *   }'
 * ```
 */
router.post(
  '/:id/transcript',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id: sessionId } = req.params;
      const { speaker, text, audioUrl, confidence, duration } = req.body as IAppendTranscriptRequest;
      
      // Validate session ID parameter
      if (!sessionId) {
        res.status(400).json({
          success: false,
          message: 'Session ID parameter is required',
          code: 'MISSING_SESSION_ID'
        } as IErrorResponse);
        return;
      }

      // Validate session ID type
      if (typeof sessionId !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Session ID must be a string',
          code: 'INVALID_SESSION_ID_TYPE'
        } as IErrorResponse);
        return;
      }

      // Validate session ID is not empty
      if (sessionId.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'Session ID cannot be empty',
          code: 'EMPTY_SESSION_ID'
        } as IErrorResponse);
        return;
      }

      // Validate MongoDB ObjectId format
      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid session ID format. Please provide a valid MongoDB ObjectId.',
          code: 'INVALID_SESSION_ID'
        } as IErrorResponse);
        return;
      }

      // Validate request body exists
      if (!req.body) {
        res.status(400).json({
          success: false,
          message: 'Request body is required',
          code: 'MISSING_REQUEST_BODY'
        } as IErrorResponse);
        return;
      }

      // Validate required speaker field
      if (!speaker) {
        res.status(400).json({
          success: false,
          message: 'Speaker field is required',
          code: 'MISSING_SPEAKER'
        } as IErrorResponse);
        return;
      }

      // Validate speaker type
      if (typeof speaker !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Speaker must be a string',
          code: 'INVALID_SPEAKER_TYPE'
        } as IErrorResponse);
        return;
      }

      // Validate speaker value
      if (!['user', 'ai', 'system'].includes(speaker)) {
        res.status(400).json({
          success: false,
          message: 'Invalid speaker. Must be one of: user, ai, system',
          code: 'INVALID_SPEAKER'
        } as IErrorResponse);
        return;
      }

      // Validate required text field
      if (!text) {
        res.status(400).json({
          success: false,
          message: 'Text field is required',
          code: 'MISSING_TEXT'
        } as IErrorResponse);
        return;
      }

      // Validate text type
      if (typeof text !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Text must be a string',
          code: 'INVALID_TEXT_TYPE'
        } as IErrorResponse);
        return;
      }

      // Validate text is not empty
      if (text.trim().length === 0) {
        res.status(400).json({
          success: false,
          message: 'Text is required and must be a non-empty string',
          code: 'INVALID_TEXT'
        } as IErrorResponse);
        return;
      }

      // Validate text length
      if (text.length > 10000) {
        res.status(400).json({
          success: false,
          message: 'Text must be 10,000 characters or less',
          code: 'TEXT_TOO_LONG'
        } as IErrorResponse);
        return;
      }

      // Validate optional audioUrl field
      if (audioUrl !== undefined && audioUrl !== null) {
        if (typeof audioUrl !== 'string') {
          res.status(400).json({
            success: false,
            message: 'Audio URL must be a string',
            code: 'INVALID_AUDIO_URL_TYPE'
          } as IErrorResponse);
          return;
        }

        if (audioUrl.trim().length === 0) {
          res.status(400).json({
            success: false,
            message: 'Audio URL cannot be empty if provided',
            code: 'EMPTY_AUDIO_URL'
          } as IErrorResponse);
          return;
        }

        if (audioUrl.length > 2000) {
          res.status(400).json({
            success: false,
            message: 'Audio URL must be 2000 characters or less',
            code: 'AUDIO_URL_TOO_LONG'
          } as IErrorResponse);
          return;
        }
      }

      // Validate optional confidence field
      if (confidence !== undefined && confidence !== null) {
        if (typeof confidence !== 'number') {
          res.status(400).json({
            success: false,
            message: 'Confidence must be a number between 0 and 1',
            code: 'INVALID_CONFIDENCE'
          } as IErrorResponse);
          return;
        }

        if (confidence < 0 || confidence > 1) {
          res.status(400).json({
            success: false,
            message: 'Confidence must be a number between 0 and 1',
            code: 'INVALID_CONFIDENCE'
          } as IErrorResponse);
          return;
        }
      }

      // Validate optional duration field
      if (duration !== undefined && duration !== null) {
        if (typeof duration !== 'number') {
          res.status(400).json({
            success: false,
            message: 'Duration must be a positive number in milliseconds',
            code: 'INVALID_DURATION'
          } as IErrorResponse);
          return;
        }

        if (duration < 0) {
          res.status(400).json({
            success: false,
            message: 'Duration must be a positive number in milliseconds',
            code: 'INVALID_DURATION'
          } as IErrorResponse);
          return;
        }

        if (duration > 3600000) { // 1 hour in milliseconds
          res.status(400).json({
            success: false,
            message: 'Duration must be 1 hour or less',
            code: 'DURATION_TOO_LONG'
          } as IErrorResponse);
          return;
        }
      }

      // Find session recording
      const sessionRecording = await SessionRecording.findById(sessionId);
      if (!sessionRecording) {
        res.status(404).json({
          success: false,
          message: 'Session recording not found',
          code: 'SESSION_NOT_FOUND'
        } as IErrorResponse);
        return;
      }

      // Verify user owns the session
      if (sessionRecording.userId.toString() !== (req.user as any)._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You can only modify your own session recordings.',
          code: 'SESSION_ACCESS_DENIED'
        } as IErrorResponse);
        return;
      }

      // Check if session is active
      if (!sessionRecording.isActive) {
        res.status(400).json({
          success: false,
          message: 'Cannot append transcript to an inactive session',
          code: 'SESSION_INACTIVE',
          details: {
            sessionEndTime: sessionRecording.sessionEndTime
          }
        } as IErrorResponse);
        return;
      }

      // Create transcript entry using the model's method
      const transcriptEntry: Omit<ITranscriptEntry, 'timestamp'> = {
        speaker,
        text: text.trim()
      };
      
      // Add optional fields if provided
      if (audioUrl) transcriptEntry.audioUrl = audioUrl;
      if (confidence !== undefined) transcriptEntry.confidence = confidence;
      if (duration !== undefined) transcriptEntry.duration = duration;

      // Use the model's addTranscriptEntry method which handles timestamp calculation
      await sessionRecording.addTranscriptEntry(transcriptEntry);

      // Get the newly added entry (last in the array)
      const addedEntry = sessionRecording.transcript[sessionRecording.transcript.length - 1];

      // Ensure we have the added entry (TypeScript safety)
      if (!addedEntry) {
        throw new Error('Failed to retrieve added transcript entry');
      }

      // Calculate total session duration
      let sessionDuration = 0;
      if (sessionRecording.transcript.length > 1) {
        const firstEntry = sessionRecording.transcript[0];
        const lastEntry = sessionRecording.transcript[sessionRecording.transcript.length - 1];
        if (firstEntry && lastEntry) {
          sessionDuration = lastEntry.timestamp - firstEntry.timestamp;
        }
      }

      console.log(`Added transcript entry to session ${sessionId}: "${text.substring(0, 50)}..." by ${speaker}`);

      // Return success response
      res.status(201).json({
        success: true,
        message: 'Transcript entry appended successfully',
        data: {
          sessionId: sessionId,
          transcriptEntry: {
            speaker: addedEntry.speaker,
            text: addedEntry.text,
            timestamp: addedEntry.timestamp,
            audioUrl: addedEntry.audioUrl,
            confidence: addedEntry.confidence,
            duration: addedEntry.duration
          },
          totalEntries: sessionRecording.transcript.length,
          sessionDuration
        }
      } as IAppendTranscriptResponse);

    } catch (error: any) {
      console.error('Error appending transcript entry:', {
        error: error.message,
        stack: error.stack,
        sessionId: req.params.id,
        userId: (req.user as any)?._id
      });

      res.status(500).json({
        success: false,
        message: 'An unexpected error occurred while appending transcript entry',
        code: 'INTERNAL_SERVER_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      } as IErrorResponse);
    }
  }
);

/**
 * GET /api/sessions/interview/:interviewId
 * 
 * Retrieves the session recording for a specific interview if it exists.
 * This endpoint allows users to fetch session data including transcript,
 * vocal analysis, and feedback for a given interview.
 * 
 * Route Parameters:
 * - interviewId (string): MongoDB ObjectId of the interview
 * 
 * Response:
 * - 200 OK: Session recording found and returned
 * - 400 Bad Request: Invalid interview ID format
 * - 403 Forbidden: User doesn't own the interview
 * - 404 Not Found: Interview not found or no session exists
 * - 500 Internal Server Error: Database errors
 * 
 * Security:
 * - Requires JWT authentication
 * - Verifies interview ownership
 * 
 * @example
 * ```bash
 * curl -X GET /api/sessions/interview/60f7b3b3b3b3b3b3b3b3b3b3 \
 *   -H "Authorization: Bearer your-jwt-token"
 * ```
 */
router.get(
  '/interview/:interviewId',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { interviewId } = req.params;
      
      // Validate interview ID format
      if (!interviewId || !mongoose.Types.ObjectId.isValid(interviewId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid interview ID format. Please provide a valid MongoDB ObjectId.',
          code: 'INVALID_INTERVIEW_ID'
        } as IErrorResponse);
        return;
      }

      // Find interview and verify ownership
      const interview = await Interview.findById(interviewId);
      if (!interview) {
        res.status(404).json({
          success: false,
          message: 'Interview not found',
          code: 'INTERVIEW_NOT_FOUND'
        } as IErrorResponse);
        return;
      }

      // Verify user owns the interview
      if (interview.userId.toString() !== (req.user as any)._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You can only view sessions for your own interviews.',
          code: 'INTERVIEW_ACCESS_DENIED'
        } as IErrorResponse);
        return;
      }

      // Find session recording for this interview using the static method
      const sessionRecording = await SessionRecording.findByInterviewId(interviewId);
      
      if (!sessionRecording) {
        res.status(404).json({
          success: false,
          message: 'No session recording found for this interview',
          code: 'SESSION_NOT_FOUND',
          details: {
            interviewId
          }
        } as IErrorResponse);
        return;
      }

      // Calculate session duration if transcript exists
      let sessionDuration = 0;
      if (sessionRecording.transcript && sessionRecording.transcript.length > 1) {
        const firstEntry = sessionRecording.transcript[0];
        const lastEntry = sessionRecording.transcript[sessionRecording.transcript.length - 1];
        if (firstEntry && lastEntry) {
          sessionDuration = lastEntry.timestamp - firstEntry.timestamp;
        }
      }

      console.log(`Retrieved session recording ${sessionRecording._id} for interview ${interviewId}`);

      // Return session recording data
      res.status(200).json({
        success: true,
        message: 'Session recording retrieved successfully',
        data: {
          sessionId: (sessionRecording._id as mongoose.Types.ObjectId).toString(),
          interviewId: sessionRecording.interviewId.toString(),
          userId: sessionRecording.userId.toString(),
          status: sessionRecording.isActive ? 'active' : 'completed',
          transcript: sessionRecording.transcript.map(entry => ({
            speaker: entry.speaker,
            text: entry.text,
            timestamp: entry.timestamp,
            audioUrl: entry.audioUrl,
            confidence: entry.confidence,
            duration: entry.duration
          })),
          transcriptCount: sessionRecording.transcript.length,
          sessionStartTime: sessionRecording.sessionStartTime,
          sessionEndTime: sessionRecording.sessionEndTime,
          sessionDuration,
          processingStatus: {
            transcription: sessionRecording.processingStatus.transcription,
            analysis: sessionRecording.processingStatus.analysis,
            feedback: sessionRecording.processingStatus.feedback
          },
          vocalAnalysis: sessionRecording.vocalAnalysis,
          overallScore: sessionRecording.overallScore,
          feedback: sessionRecording.feedback,
          transcriptComplete: sessionRecording.transcriptComplete,
          analysisComplete: sessionRecording.analysisComplete,
          createdAt: sessionRecording.createdAt,
          updatedAt: sessionRecording.updatedAt
        }
      });

    } catch (error: any) {
      console.error('Error retrieving session recording:', {
        error: error.message,
        stack: error.stack,
        interviewId: req.params.interviewId,
        userId: (req.user as any)?._id
      });

      res.status(500).json({
        success: false,
        message: 'An unexpected error occurred while retrieving session recording',
        code: 'INTERNAL_SERVER_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      } as IErrorResponse);
    }
  }
);

/**
 * POST /api/sessions/:id/generate-feedback
 * 
 * Retrieves session transcript, analyzes it using OpenAI GPT-4, and updates
 * the session with comprehensive feedback and performance scores.
 * 
 * Route Parameters:
 * - id (string): MongoDB ObjectId of the session recording
 * 
 * Response:
 * - 200 OK: Feedback generated and stored successfully
 * - 400 Bad Request: Invalid session ID or insufficient transcript data
 * - 403 Forbidden: User doesn't own the session
 * - 404 Not Found: Session recording not found
 * - 409 Conflict: Feedback already generated for this session
 * - 500 Internal Server Error: OpenAI API or database errors
 * 
 * Security:
 * - Requires JWT authentication
 * - Verifies session ownership through user ID
 * 
 * @example
 * ```bash
 * curl -X POST /api/sessions/60f7b3b3b3b3b3b3b3b3b3b3/generate-feedback \
 *   -H "Authorization: Bearer your-jwt-token"
 * ```
 */
router.post(
  '/:id/generate-feedback',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id: sessionId } = req.params;
      
      // Validate session ID format
      if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid session ID format. Please provide a valid MongoDB ObjectId.',
          code: 'INVALID_SESSION_ID'
        } as IErrorResponse);
        return;
      }

      // Find session recording
      const sessionRecording = await SessionRecording.findById(sessionId);
      if (!sessionRecording) {
        res.status(404).json({
          success: false,
          message: 'Session recording not found',
          code: 'SESSION_NOT_FOUND'
        } as IErrorResponse);
        return;
      }

      // Verify user owns the session
      if (sessionRecording.userId.toString() !== (req.user as any)._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You can only generate feedback for your own sessions.',
          code: 'SESSION_ACCESS_DENIED'
        } as IErrorResponse);
        return;
      }

      // Check if feedback already exists
      if (sessionRecording.feedback && sessionRecording.processingStatus.feedback === 'completed') {
        res.status(409).json({
          success: false,
          message: 'Feedback has already been generated for this session',
          code: 'FEEDBACK_ALREADY_EXISTS',
          details: {
            feedbackGeneratedAt: sessionRecording.feedbackGeneratedAt,
            overallScore: sessionRecording.overallScore
          }
        } as IErrorResponse);
        return;
      }

      // Check if session has transcript entries
      if (!sessionRecording.transcript || sessionRecording.transcript.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Cannot generate feedback for session without transcript entries',
          code: 'NO_TRANSCRIPT_DATA'
        } as IErrorResponse);
        return;
      }

      // Check if there are enough user responses
      const userResponses = sessionRecording.transcript.filter(entry => entry.speaker === 'user');
      if (userResponses.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Cannot generate feedback without user responses in transcript',
          code: 'INSUFFICIENT_USER_RESPONSES'
        } as IErrorResponse);
        return;
      }

      // Get the interview for context
      const interview = await Interview.findById(sessionRecording.interviewId);
      if (!interview) {
        res.status(404).json({
          success: false,
          message: 'Associated interview not found',
          code: 'INTERVIEW_NOT_FOUND'
        } as IErrorResponse);
        return;
      }

      // Get user profile for additional context
      const user = await User.findById(sessionRecording.userId).lean() as IUser | null;
      
      console.log(`Starting feedback generation for session ${sessionId} with ${sessionRecording.transcript.length} transcript entries`);

      // Update processing status to indicate feedback generation in progress
      sessionRecording.processingStatus.feedback = 'processing';
      await sessionRecording.save();

      try {
        // Prepare parameters for feedback analysis
        const analysisParams: IFeedbackAnalysisParams = {
          transcript: sessionRecording.transcript,
          interviewType: interview.interviewType,
          interviewDifficulty: interview.interviewDifficulty,
          userMajor: user?.targetMajor || 'General Studies',
          questions: interview.questions.map(q => q.text),
          interviewDuration: interview.duration,
          userProfile: user ? {
            ...(user.grade !== undefined && { grade: user.grade }),
            ...(user.targetColleges?.length && { targetColleges: user.targetColleges }),
            ...(user.strengths?.length && { strengths: user.strengths }),
            ...(user.weaknesses?.length && { weaknesses: user.weaknesses })
          } : {}
        };

        // Generate feedback using OpenAI
        const feedbackReport = await analyzeFeedback(analysisParams);

        // Store feedback in session recording
        await sessionRecording.generateFeedback(feedbackReport);

        console.log(`Feedback generated successfully for session ${sessionId}: Overall rating ${feedbackReport.overallRating}/10`);

        // Return success response with feedback data
        res.status(200).json({
          success: true,
          message: 'Feedback generated and stored successfully',
          data: {
            sessionId: sessionId,
            feedback: {
              overallRating: feedbackReport.overallRating,
              overallScore: feedbackReport.overallRating * 10, // Convert to 0-100 scale
              strengths: feedbackReport.strengths,
              weaknesses: feedbackReport.weaknesses,
              recommendations: feedbackReport.recommendations,
              detailedScores: feedbackReport.detailedScores,
              summary: feedbackReport.summary
            },
            feedbackGeneratedAt: sessionRecording.feedbackGeneratedAt,
            processingStatus: sessionRecording.processingStatus
          }
        });

      } catch (feedbackError: any) {
        // Reset processing status on error
        sessionRecording.processingStatus.feedback = 'failed';
        await sessionRecording.save();

        console.error('Feedback generation failed:', {
          error: feedbackError.message,
          sessionId,
          userId: sessionRecording.userId
        });

        // Handle specific OpenAI errors
        if (feedbackError.message.includes('rate limit')) {
          res.status(429).json({
            success: false,
            message: 'Rate limit exceeded. Please try again later.',
            code: 'RATE_LIMIT_EXCEEDED'
          } as IErrorResponse);
          return;
        }

        res.status(500).json({
          success: false,
          message: `Failed to generate feedback: ${feedbackError.message}`,
          code: 'FEEDBACK_GENERATION_ERROR'
        } as IErrorResponse);
      }

    } catch (error: any) {
      console.error('Error in feedback generation endpoint:', {
        error: error.message,
        stack: error.stack,
        sessionId: req.params.id,
        userId: (req.user as any)?._id
      });

      res.status(500).json({
        success: false,
        message: 'An unexpected error occurred while generating feedback',
        code: 'INTERNAL_SERVER_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      } as IErrorResponse);
    }
  }
);

/**
 * GET /api/sessions/:id/feedback
 * 
 * Returns the feedback and score for a completed session. This endpoint retrieves
 * the AI-generated feedback report including strengths, weaknesses, recommendations,
 * and detailed performance scores. Returns 404 if feedback has not yet been generated.
 * 
 * Route Parameters:
 * - id (string): MongoDB ObjectId of the session recording
 * 
 * Response:
 * - 200 OK: Feedback data returned successfully
 * - 400 Bad Request: Invalid session ID format
 * - 403 Forbidden: User doesn't own the session
 * - 404 Not Found: Session not found or feedback not generated
 * - 500 Internal Server Error: Database errors
 * 
 * Security:
 * - Requires JWT authentication
 * - Verifies session ownership through user ID
 * 
 * @example
 * ```bash
 * curl -X GET /api/sessions/60f7b3b3b3b3b3b3b3b3b3b3/feedback \
 *   -H "Authorization: Bearer your-jwt-token"
 * ```
 */
router.get(
  '/:id/feedback',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id: sessionId } = req.params;
      
      // Validate session ID format
      if (!sessionId || !mongoose.Types.ObjectId.isValid(sessionId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid session ID format. Please provide a valid MongoDB ObjectId.',
          code: 'INVALID_SESSION_ID'
        } as IErrorResponse);
        return;
      }

      // Find session recording
      const sessionRecording = await SessionRecording.findById(sessionId);
      if (!sessionRecording) {
        res.status(404).json({
          success: false,
          message: 'Session recording not found',
          code: 'SESSION_NOT_FOUND'
        } as IErrorResponse);
        return;
      }

      // Verify user owns the session
      if (sessionRecording.userId.toString() !== (req.user as any)._id.toString()) {
        res.status(403).json({
          success: false,
          message: 'Access denied. You can only view feedback for your own sessions.',
          code: 'SESSION_ACCESS_DENIED'
        } as IErrorResponse);
        return;
      }

      // Check if feedback has been generated
      if (!sessionRecording.feedback || sessionRecording.processingStatus.feedback !== 'completed') {
        res.status(404).json({
          success: false,
          message: 'Feedback has not yet been generated for this session',
          code: 'FEEDBACK_NOT_FOUND',
          details: {
            sessionId,
            feedbackStatus: sessionRecording.processingStatus.feedback,
            transcriptEntries: sessionRecording.transcript.length
          }
        } as IErrorResponse);
        return;
      }

      // Get the interview for additional context
      const interview = await Interview.findById(sessionRecording.interviewId);
      
      console.log(`Retrieved feedback for session ${sessionId}: Overall score ${sessionRecording.overallScore}/100`);

      // Return feedback data
      res.status(200).json({
        success: true,
        message: 'Feedback retrieved successfully',
        data: {
          sessionId: sessionId,
          interviewId: sessionRecording.interviewId.toString(),
          interviewType: interview?.interviewType,
          interviewDifficulty: interview?.interviewDifficulty,
          overallScore: sessionRecording.overallScore,
          feedback: {
            overallRating: sessionRecording.feedback.overallRating,
            strengths: sessionRecording.feedback.strengths,
            weaknesses: sessionRecording.feedback.weaknesses,
            recommendations: sessionRecording.feedback.recommendations,
            detailedScores: sessionRecording.feedback.detailedScores,
            questionFeedback: sessionRecording.feedback.questionFeedback,
            summary: sessionRecording.feedback.summary
          },
          feedbackGeneratedAt: sessionRecording.feedbackGeneratedAt,
          sessionMetrics: {
            transcriptEntries: sessionRecording.transcript.length,
            sessionDuration: sessionRecording.calculateDuration(),
            sessionStartTime: sessionRecording.sessionStartTime,
            sessionEndTime: sessionRecording.sessionEndTime
          },
          processingStatus: sessionRecording.processingStatus
        }
      });

    } catch (error: any) {
      console.error('Error retrieving session feedback:', {
        error: error.message,
        stack: error.stack,
        sessionId: req.params.id,
        userId: (req.user as any)?._id
      });

      res.status(500).json({
        success: false,
        message: 'An unexpected error occurred while retrieving feedback',
        code: 'INTERNAL_SERVER_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      } as IErrorResponse);
    }
  }
);

// Handle multer upload errors
router.use((error: any, req: AuthenticatedRequest, res: Response, next: any) => {
  if (error) {
    const errorMessage = getUploadErrorMessage(error);
    console.error('Upload middleware error:', {
      error: error.message,
      code: error.code,
               userId: (req.user as any)?._id,
         originalUrl: req.originalUrl
    });

    res.status(400).json({
      success: false,
      message: errorMessage,
      code: error.code || 'UPLOAD_ERROR'
    } as IErrorResponse);
    return;
  }
  
  next();
});

export default router; 