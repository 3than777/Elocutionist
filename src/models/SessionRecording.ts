/**
 * AI Interview Coach Backend - SessionRecording Model
 * 
 * This file defines the SessionRecording model for storing interview transcripts,
 * vocal analysis data, and AI-generated feedback. It captures the complete
 * interview session data for playback and performance analysis.
 * 
 * Key Features:
 * - TypeScript interfaces for type safety
 * - Transcript storage with speaker identification
 * - Vocal analysis metrics (tone, pace, filler words)
 * - AI-generated feedback and recommendations
 * - Audio recording references
 * - Performance scoring and analytics
 * 
 * Session Recording Lifecycle:
 * 1. Created when interview starts
 * 2. Transcript entries added in real-time
 * 3. Vocal analysis performed during recording
 * 4. Feedback generated at completion
 * 5. Available for playback and review
 * 
 * Related Files:
 * - src/models/Interview.ts - Parent interview reference
 * - src/models/User.ts - User reference
 * - src/services/openai.service.ts - Transcription and feedback
 * - src/controllers/session.controller.ts - Session management
 * 
 * Task: #9 - SessionRecording model with transcript and feedback storage
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import mongoose, { Document, Schema, Types, Model } from 'mongoose';

/**
 * Enum for speaker types in transcript
 * Using const object with 'as const' assertion per .cursorrules
 */
export const SPEAKER_TYPES = {
  USER: 'user',
  AI: 'ai',
  SYSTEM: 'system'
} as const;

export type SpeakerType = typeof SPEAKER_TYPES[keyof typeof SPEAKER_TYPES];

/**
 * Interface for individual transcript entries
 */
export interface ITranscriptEntry {
  speaker: SpeakerType;
  text: string;
  timestamp: number; // Milliseconds from session start
  audioUrl?: string; // Optional audio chunk URL
  confidence?: number; // Speech recognition confidence (0-1)
  duration?: number; // Speaking duration in milliseconds
}

/**
 * Interface for vocal analysis metrics
 */
export interface IVocalAnalysis {
  overallScore: number; // 0-100
  
  // Tone analysis
  tone: {
    confidence: number; // 0-1
    clarity: number; // 0-1
    enthusiasm: number; // 0-1
    professionalism: number; // 0-1
  };
  
  // Speech patterns
  speechPatterns: {
    pace: number; // Words per minute
    averagePauseDuration: number; // Milliseconds
    volumeVariation: number; // 0-1 (consistency)
    
    // Filler words tracking
    fillerWords: string[];
    fillerCount: number;
    fillerFrequency: number; // Fillers per minute
    
    // Speech issues
    longPauses: number; // Count of pauses > 3 seconds
    interruptions: number;
    trailingOff: number; // Sentences that trail off
  };
  
  // Detailed metrics
  metrics: {
    totalSpeakingTime: number; // Milliseconds
    totalWords: number;
    uniqueWords: number;
    sentenceCount: number;
    averageSentenceLength: number;
  };
}

/**
 * Interface for AI-generated feedback
 */
export interface IFeedbackReport {
  overallRating: number; // 1-10
  
  // Categorized feedback
  strengths: string[];
  weaknesses: string[];
  
  // Detailed recommendations
  recommendations: {
    area: string; // e.g., "Communication", "Content", "Confidence"
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
    examples?: string[]; // Example phrases or approaches
  }[];
  
  // Performance scores by category
  detailedScores: {
    contentRelevance: number; // 0-100
    communication: number; // 0-100
    confidence: number; // 0-100
    structure: number; // 0-100
    engagement: number; // 0-100
  };
  
  // Question-specific feedback
  questionFeedback?: {
    questionId: string;
    score: number; // 0-100
    feedback: string;
    improvements: string[];
  }[];
  
  // Generated summary
  summary: string;
}

/**
 * Interface defining the session recording document structure
 */
export interface ISessionRecording extends Document {
  // References
  interviewId: Types.ObjectId;
  userId: Types.ObjectId;
  
  // Transcript data
  transcript: ITranscriptEntry[];
  transcriptComplete: boolean;
  
  // Vocal analysis
  vocalAnalysis?: IVocalAnalysis;
  analysisComplete: boolean;
  
  // Feedback and scoring
  overallScore?: number; // 0-100
  feedback?: IFeedbackReport;
  feedbackGeneratedAt?: Date;
  
  // Recording metadata
  recordingUrl?: string; // Full session audio/video URL
  recordingDuration?: number; // Total duration in milliseconds
  recordingSize?: number; // File size in bytes
  
  // Session metadata
  sessionStartTime: Date;
  sessionEndTime?: Date;
  isActive: boolean;
  
  // Processing status
  processingStatus: {
    transcription: 'pending' | 'processing' | 'completed' | 'failed';
    analysis: 'pending' | 'processing' | 'completed' | 'failed';
    feedback: 'pending' | 'processing' | 'completed' | 'failed';
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  addTranscriptEntry(entry: Omit<ITranscriptEntry, 'timestamp'>): Promise<void>;
  completeTranscript(): Promise<void>;
  updateVocalAnalysis(analysis: IVocalAnalysis): Promise<void>;
  generateFeedback(feedback: IFeedbackReport): Promise<void>;
  endSession(): Promise<void>;
  getTranscriptText(speaker?: SpeakerType): string;
  calculateDuration(): number;
}

/**
 * Interface for SessionRecording model static methods
 */
interface ISessionRecordingModel extends Model<ISessionRecording> {
  findByInterviewId(interviewId: string | Types.ObjectId): Promise<ISessionRecording | null>;
  findByUserId(userId: string | Types.ObjectId): Promise<ISessionRecording[]>;
  findActiveSession(userId: string | Types.ObjectId): Promise<ISessionRecording | null>;
  getAverageScores(userId: string | Types.ObjectId): Promise<{
    overall: number;
    communication: number;
    confidence: number;
    content: number;
  }>;
}

/**
 * Mongoose schema definition for the SessionRecording model
 */
const sessionRecordingSchema = new Schema<ISessionRecording>(
  {
    // References
    interviewId: {
      type: Schema.Types.ObjectId,
      ref: 'Interview',
      required: [true, 'Interview ID is required'],
      index: true,
      unique: true // One recording per interview
    },
    
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    
    // Transcript data
    transcript: [{
      speaker: {
        type: String,
        required: [true, 'Speaker is required'],
        enum: {
          values: Object.values(SPEAKER_TYPES),
          message: 'Invalid speaker type'
        }
      },
      text: {
        type: String,
        required: [true, 'Transcript text is required'],
        trim: true,
        maxlength: [5000, 'Transcript entry cannot exceed 5000 characters']
      },
      timestamp: {
        type: Number,
        required: [true, 'Timestamp is required'],
        min: [0, 'Timestamp cannot be negative']
      },
      audioUrl: {
        type: String,
        trim: true
      },
      confidence: {
        type: Number,
        min: [0, 'Confidence must be between 0 and 1'],
        max: [1, 'Confidence must be between 0 and 1']
      },
      duration: {
        type: Number,
        min: [0, 'Duration cannot be negative']
      }
    }],
    
    transcriptComplete: {
      type: Boolean,
      default: false
    },
    
    // Vocal analysis
    vocalAnalysis: {
      overallScore: {
        type: Number,
        min: [0, 'Score must be between 0 and 100'],
        max: [100, 'Score must be between 0 and 100']
      },
      
      tone: {
        confidence: { type: Number, min: 0, max: 1 },
        clarity: { type: Number, min: 0, max: 1 },
        enthusiasm: { type: Number, min: 0, max: 1 },
        professionalism: { type: Number, min: 0, max: 1 }
      },
      
      speechPatterns: {
        pace: { type: Number, min: 0 },
        averagePauseDuration: { type: Number, min: 0 },
        volumeVariation: { type: Number, min: 0, max: 1 },
        fillerWords: [String],
        fillerCount: { type: Number, min: 0, default: 0 },
        fillerFrequency: { type: Number, min: 0 },
        longPauses: { type: Number, min: 0, default: 0 },
        interruptions: { type: Number, min: 0, default: 0 },
        trailingOff: { type: Number, min: 0, default: 0 }
      },
      
      metrics: {
        totalSpeakingTime: { type: Number, min: 0 },
        totalWords: { type: Number, min: 0 },
        uniqueWords: { type: Number, min: 0 },
        sentenceCount: { type: Number, min: 0 },
        averageSentenceLength: { type: Number, min: 0 }
      }
    },
    
    analysisComplete: {
      type: Boolean,
      default: false
    },
    
    // Feedback and scoring
    overallScore: {
      type: Number,
      min: [0, 'Score must be between 0 and 100'],
      max: [100, 'Score must be between 0 and 100']
    },
    
    feedback: {
      overallRating: {
        type: Number,
        min: [1, 'Rating must be between 1 and 10'],
        max: [10, 'Rating must be between 1 and 10']
      },
      
      strengths: [{
        type: String,
        maxlength: [500, 'Strength description cannot exceed 500 characters']
      }],
      
      weaknesses: [{
        type: String,
        maxlength: [500, 'Weakness description cannot exceed 500 characters']
      }],
      
      recommendations: [{
        area: {
          type: String,
          required: true,
          maxlength: [100, 'Area cannot exceed 100 characters']
        },
        suggestion: {
          type: String,
          required: true,
          maxlength: [1000, 'Suggestion cannot exceed 1000 characters']
        },
        priority: {
          type: String,
          required: true,
          enum: ['high', 'medium', 'low']
        },
        examples: [{
          type: String,
          maxlength: [500, 'Example cannot exceed 500 characters']
        }]
      }],
      
      detailedScores: {
        contentRelevance: { type: Number, min: 0, max: 100 },
        communication: { type: Number, min: 0, max: 100 },
        confidence: { type: Number, min: 0, max: 100 },
        structure: { type: Number, min: 0, max: 100 },
        engagement: { type: Number, min: 0, max: 100 }
      },
      
      questionFeedback: [{
        questionId: { type: String, required: true },
        score: { type: Number, min: 0, max: 100 },
        feedback: { type: String, maxlength: 1000 },
        improvements: [{ type: String, maxlength: 500 }]
      }],
      
      summary: {
        type: String,
        required: false,
        maxlength: [2000, 'Summary cannot exceed 2000 characters']
      }
    },
    
    feedbackGeneratedAt: {
      type: Date
    },
    
    // Recording metadata
    recordingUrl: {
      type: String,
      trim: true
    },
    
    recordingDuration: {
      type: Number,
      min: [0, 'Duration cannot be negative']
    },
    
    recordingSize: {
      type: Number,
      min: [0, 'Size cannot be negative']
    },
    
    // Session metadata
    sessionStartTime: {
      type: Date,
      required: [true, 'Session start time is required'],
      default: Date.now
    },
    
    sessionEndTime: {
      type: Date,
      validate: {
        validator: function(this: ISessionRecording, value: Date): boolean {
          return !value || value > this.sessionStartTime;
        },
        message: 'Session end time must be after start time'
      }
    },
    
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    
    // Processing status
    processingStatus: {
      transcription: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
      },
      analysis: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
      },
      feedback: {
        type: String,
        enum: ['pending', 'processing', 'completed', 'failed'],
        default: 'pending'
      }
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc: any, ret: any) {
        delete ret.__v;
        return ret;
      }
    }
  }
);

/**
 * Instance method to add a transcript entry
 * Automatically calculates timestamp from session start
 * 
 * @param {Omit<ITranscriptEntry, 'timestamp'>} entry - Transcript entry without timestamp
 * @returns {Promise<void>}
 */
sessionRecordingSchema.methods.addTranscriptEntry = async function(
  entry: Omit<ITranscriptEntry, 'timestamp'>
): Promise<void> {
  const timestamp = Date.now() - this.sessionStartTime.getTime();
  
  this.transcript.push({
    ...entry,
    timestamp
  });
  
  await this.save();
};

/**
 * Instance method to mark transcript as complete
 * 
 * @returns {Promise<void>}
 */
sessionRecordingSchema.methods.completeTranscript = async function(): Promise<void> {
  this.transcriptComplete = true;
  this.processingStatus.transcription = 'completed';
  await this.save();
};

/**
 * Instance method to update vocal analysis
 * 
 * @param {IVocalAnalysis} analysis - Vocal analysis data
 * @returns {Promise<void>}
 */
sessionRecordingSchema.methods.updateVocalAnalysis = async function(
  analysis: IVocalAnalysis
): Promise<void> {
  this.vocalAnalysis = analysis;
  this.analysisComplete = true;
  this.processingStatus.analysis = 'completed';
  
  // Update overall score if not set
  if (!this.overallScore && analysis.overallScore) {
    this.overallScore = analysis.overallScore;
  }
  
  await this.save();
};

/**
 * Instance method to generate and store feedback
 * 
 * @param {IFeedbackReport} feedback - AI-generated feedback
 * @returns {Promise<void>}
 */
sessionRecordingSchema.methods.generateFeedback = async function(
  feedback: IFeedbackReport
): Promise<void> {
  this.feedback = feedback;
  this.feedbackGeneratedAt = new Date();
  this.processingStatus.feedback = 'completed';
  
  // Update overall score from feedback if available
  if (feedback.overallRating) {
    this.overallScore = feedback.overallRating * 10; // Convert 1-10 to 0-100
  }
  
  await this.save();
};

/**
 * Instance method to end the session
 * 
 * @returns {Promise<void>}
 */
sessionRecordingSchema.methods.endSession = async function(): Promise<void> {
  this.sessionEndTime = new Date();
  this.isActive = false;
  
  // Calculate recording duration if not set
  if (!this.recordingDuration && this.sessionStartTime) {
    this.recordingDuration = this.sessionEndTime.getTime() - this.sessionStartTime.getTime();
  }
  
  await this.save();
};

/**
 * Instance method to get transcript text
 * 
 * @param {SpeakerType} speaker - Optional filter by speaker
 * @returns {string} Concatenated transcript text
 */
sessionRecordingSchema.methods.getTranscriptText = function(speaker?: SpeakerType): string {
  const entries = speaker 
    ? this.transcript.filter((entry: ITranscriptEntry) => entry.speaker === speaker)
    : this.transcript;
  
  return entries.map((entry: ITranscriptEntry) => entry.text).join(' ');
};

/**
 * Instance method to calculate session duration
 * 
 * @returns {number} Duration in milliseconds
 */
sessionRecordingSchema.methods.calculateDuration = function(): number {
  if (this.recordingDuration) {
    return this.recordingDuration;
  }
  
  if (this.sessionEndTime && this.sessionStartTime) {
    return this.sessionEndTime.getTime() - this.sessionStartTime.getTime();
  }
  
  if (this.sessionStartTime) {
    return Date.now() - this.sessionStartTime.getTime();
  }
  
  return 0;
};

/**
 * Static method to find recording by interview ID
 * 
 * @param {string | Types.ObjectId} interviewId - Interview ID
 * @returns {Promise<ISessionRecording | null>} Session recording or null
 */
sessionRecordingSchema.statics.findByInterviewId = async function(
  interviewId: string | Types.ObjectId
): Promise<ISessionRecording | null> {
  return this.findOne({ interviewId });
};

/**
 * Static method to find recordings by user ID
 * 
 * @param {string | Types.ObjectId} userId - User ID
 * @returns {Promise<ISessionRecording[]>} Array of recordings
 */
sessionRecordingSchema.statics.findByUserId = async function(
  userId: string | Types.ObjectId
): Promise<ISessionRecording[]> {
  return this.find({ userId }).sort({ createdAt: -1 });
};

/**
 * Static method to find active session for a user
 * 
 * @param {string | Types.ObjectId} userId - User ID
 * @returns {Promise<ISessionRecording | null>} Active session or null
 */
sessionRecordingSchema.statics.findActiveSession = async function(
  userId: string | Types.ObjectId
): Promise<ISessionRecording | null> {
  return this.findOne({ userId, isActive: true });
};

/**
 * Static method to get average scores for a user
 * 
 * @param {string | Types.ObjectId} userId - User ID
 * @returns {Promise<object>} Average scores
 */
sessionRecordingSchema.statics.getAverageScores = async function(
  userId: string | Types.ObjectId
): Promise<{ overall: number; communication: number; confidence: number; content: number }> {
  const scores = await this.aggregate([
    { $match: { 
      userId: new Types.ObjectId(userId),
      'feedback.detailedScores': { $exists: true }
    }},
    {
      $group: {
        _id: null,
        overall: { $avg: '$overallScore' },
        communication: { $avg: '$feedback.detailedScores.communication' },
        confidence: { $avg: '$feedback.detailedScores.confidence' },
        content: { $avg: '$feedback.detailedScores.contentRelevance' }
      }
    }
  ]);
  
  if (scores.length === 0) {
    return { overall: 0, communication: 0, confidence: 0, content: 0 };
  }
  
  return scores[0];
};

/**
 * Indexes for performance optimization
 */
sessionRecordingSchema.index({ userId: 1, createdAt: -1 }); // User's recordings
sessionRecordingSchema.index({ interviewId: 1 }); // Unique lookup
sessionRecordingSchema.index({ userId: 1, isActive: 1 }); // Active session lookup
sessionRecordingSchema.index({ createdAt: -1 }); // Recent recordings

/**
 * Create and export the SessionRecording model
 */
const SessionRecording = mongoose.model<ISessionRecording, ISessionRecordingModel>(
  'SessionRecording', 
  sessionRecordingSchema
);

export default SessionRecording; 