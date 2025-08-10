/**
 * AI Interview Coach Backend - Models Index
 * 
 * This file serves as the central export point for all Mongoose models and schemas.
 * Models define the structure and validation rules for MongoDB collections.
 * Following the repository pattern for clean database operations.
 * 
 * Model Organization:
 * - User - User profiles, authentication, and account management
 * - Interview - Interview sessions, questions, and metadata
 * - SessionRecording - Transcript storage, audio data, and session state
 * - InterviewTranscript - Temporary transcript storage for AI rating generation
 * - FeedbackReport - AI-generated feedback, scores, and recommendations
 * 
 * Database Design Principles:
 * - Clear schemas with proper validation and indexes
 * - Use lean() for read operations when documents won't be modified
 * - Implement proper error handling for database operations
 * - Use transactions for operations that modify multiple documents
 * - Always validate data at both model and API levels
 * - Use projection to limit returned fields and improve performance
 * 
 * Schema Features:
 * - TypeScript interfaces for type safety
 * - Mongoose validation rules and custom validators
 * - Pre-save hooks for data transformation (e.g., password hashing)
 * - Indexes for commonly queried fields
 * - References between related collections
 * 
 * Related Files:
 * - src/config/database.ts - Database connection configuration
 * - src/controllers/ - Model usage in business logic
 * - src/services/ - Repository pattern implementations
 * 
 * Task: #3 - Basic folder structure organization, Step 5 - InterviewTranscript model
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

// Model exports
export { default as User, type IUser } from './User';
export { 
  default as Interview, 
  type IInterview,
  type IInterviewQuestion,
  type InterviewType,
  type InterviewDifficulty,
  type InterviewStatus,
  INTERVIEW_TYPES,
  INTERVIEW_DIFFICULTY,
  INTERVIEW_STATUS
} from './Interview';
export {
  default as SessionRecording,
  type ISessionRecording,
  type ITranscriptEntry,
  type IVocalAnalysis,
  type IFeedbackReport,
  type SpeakerType,
  SPEAKER_TYPES
} from './SessionRecording';
export {
  default as InterviewTranscript,
  type IInterviewTranscript,
  type ITranscriptMessage,
  type IInterviewContext,
  type TranscriptStatus,
  TRANSCRIPT_STATUS
} from './InterviewTranscript';
export {
  default as UploadedFile,
  type IUploadedFile,
  type ProcessingStatus,
  type FileType,
  PROCESSING_STATUS,
  FILE_TYPES
} from './UploadedFile';
export {
  default as AvatarPreference,
  type IAvatarPreference
} from './AvatarPreference'; 