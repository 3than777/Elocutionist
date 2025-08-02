/**
 * AI Interview Coach Backend - InterviewTranscript Model
 * 
 * This file defines the InterviewTranscript model for temporarily storing
 * interview transcripts for AI rating generation. This model is used specifically
 * for the AI rating feature workflow where transcripts are collected, analyzed,
 * and then cleaned up after feedback generation.
 * 
 * Key Features:
 * - Temporary storage for interview transcripts
 * - AI rating generation status tracking
 * - User ownership and security
 * - Automatic cleanup after processing
 * - Integration with existing SessionRecording model
 * 
 * Lifecycle:
 * 1. Created when user ends interview
 * 2. Transcript data stored temporarily
 * 3. AI rating generated using OpenAI service
 * 4. Rating stored and linked
 * 5. Cleaned up after successful generation
 * 
 * Related Files:
 * - src/models/SessionRecording.ts - Full session storage
 * - src/services/openai.service.ts - AI feedback analysis
 * - src/routes/chat.routes.ts - API endpoints
 * 
 * Task: Step 5 - Transcript Storage Model for AI Rating Feature
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import mongoose, { Document, Schema, Types, Model } from 'mongoose';

/**
 * Interface for message in transcript
 */
export interface ITranscriptMessage {
  sender: 'ai' | 'user';
  text: string;
  timestamp: Date;
}

/**
 * Interface for interview context
 */
export interface IInterviewContext {
  difficulty: string;
  userProfile: {
    name?: string;
    grade?: number;
    targetMajor?: string;
    targetColleges?: string[];
    strengths?: string[];
    weaknesses?: string[];
  };
  interviewType: string;
  duration?: number; // in minutes
}

/**
 * Status enum for transcript processing
 */
export const TRANSCRIPT_STATUS = {
  PENDING: 'pending',
  RATED: 'rated',
  ERROR: 'error',
  EXPIRED: 'expired'
} as const;

export type TranscriptStatus = typeof TRANSCRIPT_STATUS[keyof typeof TRANSCRIPT_STATUS];

/**
 * Interface defining the interview transcript document structure
 */
export interface IInterviewTranscript extends Document {
  // Reference fields
  userId: Types.ObjectId;
  
  // Transcript data
  messages: ITranscriptMessage[];
  
  // Interview context for AI analysis
  interviewContext: IInterviewContext;
  
  // AI rating results
  aiRating?: {
    overallRating: number; // 1-10
    strengths: string[];
    weaknesses: string[];
    recommendations: {
      area: string;
      suggestion: string;
      priority: 'high' | 'medium' | 'low';
      examples?: string[];
    }[];
    detailedScores: {
      contentRelevance: number; // 0-100
      communication: number; // 0-100
      confidence: number; // 0-100
      structure: number; // 0-100
      engagement: number; // 0-100
    };
    summary: string;
  };
  
  // Processing metadata
  status: TranscriptStatus;
  ratingGeneratedAt?: Date;
  errorMessage?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date; // Auto-cleanup after 24 hours
  
  // Instance methods
  generateRating(): Promise<void>;
  getRating(): object | null;
  isExpired(): boolean;
  markAsExpired(): Promise<void>;
}

/**
 * Interface for InterviewTranscript model static methods
 */
interface IInterviewTranscriptModel extends Model<IInterviewTranscript> {
  findByUserId(userId: string | Types.ObjectId): Promise<IInterviewTranscript[]>;
  findPendingTranscripts(): Promise<IInterviewTranscript[]>;
  cleanupExpired(): Promise<number>;
}

/**
 * Mongoose schema definition for the InterviewTranscript model
 */
const interviewTranscriptSchema = new Schema<IInterviewTranscript>(
  {
    // Reference to User
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    
    // Transcript messages
    messages: [{
      sender: {
        type: String,
        required: [true, 'Sender is required'],
        enum: {
          values: ['ai', 'user'],
          message: 'Sender must be either ai or user'
        }
      },
      text: {
        type: String,
        required: [true, 'Message text is required'],
        trim: true,
        maxlength: [5000, 'Message cannot exceed 5000 characters']
      },
      timestamp: {
        type: Date,
        required: [true, 'Timestamp is required'],
        default: Date.now
      }
    }],
    
    // Interview context
    interviewContext: {
      difficulty: {
        type: String,
        required: [true, 'Difficulty is required'],
        trim: true
      },
      userProfile: {
        name: { type: String, trim: true },
        grade: { type: Number, min: 1, max: 12 },
        targetMajor: { type: String, trim: true },
        targetColleges: [{ type: String, trim: true }],
        strengths: [{ type: String, trim: true }],
        weaknesses: [{ type: String, trim: true }]
      },
      interviewType: {
        type: String,
        required: [true, 'Interview type is required'],
        trim: true
      },
      duration: {
        type: Number,
        min: [1, 'Duration must be positive']
      }
    },
    
    // AI rating results
    aiRating: {
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
      
      summary: {
        type: String,
        maxlength: [2000, 'Summary cannot exceed 2000 characters']
      }
    },
    
    // Processing metadata
    status: {
      type: String,
      required: true,
      enum: {
        values: Object.values(TRANSCRIPT_STATUS),
        message: 'Invalid transcript status'
      },
      default: TRANSCRIPT_STATUS.PENDING,
      index: true
    },
    
    ratingGeneratedAt: {
      type: Date
    },
    
    errorMessage: {
      type: String,
      trim: true,
      maxlength: [1000, 'Error message cannot exceed 1000 characters']
    },
    
    // Auto-expire after 24 hours
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
      index: { expireAfterSeconds: 0 } // MongoDB TTL index
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
 * Instance method to generate AI rating
 * Uses the existing OpenAI analyzeFeedback service
 */
interviewTranscriptSchema.methods.generateRating = async function(): Promise<void> {
  // Import here to avoid circular dependency
  const { analyzeFeedback } = await import('../services/openai.service');
  
  try {
    this.status = TRANSCRIPT_STATUS.PENDING;
    await this.save();
    
    // Convert messages to transcript format expected by analyzeFeedback
    const transcript = this.messages.map((msg: ITranscriptMessage) => ({
      speaker: msg.sender,
      text: msg.text,
      timestamp: msg.timestamp.getTime()
    }));
    
    // Generate AI feedback using existing service
    const feedback = await analyzeFeedback({
      transcript,
      interviewType: this.interviewContext.interviewType,
      interviewDifficulty: this.interviewContext.difficulty,
      userMajor: this.interviewContext.userProfile.targetMajor || 'General Studies',
      interviewDuration: this.interviewContext.duration || 30,
      userProfile: this.interviewContext.userProfile
    });
    
    // Store the rating
    this.aiRating = feedback;
    this.status = TRANSCRIPT_STATUS.RATED;
    this.ratingGeneratedAt = new Date();
    this.errorMessage = undefined;
    
    await this.save();
    
  } catch (error: any) {
    console.error('Error generating AI rating:', error);
    this.status = TRANSCRIPT_STATUS.ERROR;
    this.errorMessage = error.message || 'Failed to generate AI rating';
    await this.save();
    throw error;
  }
};

/**
 * Instance method to get the rating
 */
interviewTranscriptSchema.methods.getRating = function(): object | null {
  return this.aiRating || null;
};

/**
 * Instance method to check if transcript is expired
 */
interviewTranscriptSchema.methods.isExpired = function(): boolean {
  return new Date() > this.expiresAt;
};

/**
 * Instance method to mark as expired
 */
interviewTranscriptSchema.methods.markAsExpired = async function(): Promise<void> {
  this.status = TRANSCRIPT_STATUS.EXPIRED;
  await this.save();
};

/**
 * Static method to find transcripts by user ID
 */
interviewTranscriptSchema.statics.findByUserId = async function(
  userId: string | Types.ObjectId
): Promise<IInterviewTranscript[]> {
  return this.find({ userId }).sort({ createdAt: -1 });
};

/**
 * Static method to find pending transcripts for processing
 */
interviewTranscriptSchema.statics.findPendingTranscripts = async function(): Promise<IInterviewTranscript[]> {
  return this.find({ 
    status: TRANSCRIPT_STATUS.PENDING,
    expiresAt: { $gt: new Date() }
  });
};

/**
 * Static method to cleanup expired transcripts
 */
interviewTranscriptSchema.statics.cleanupExpired = async function(): Promise<number> {
  const result = await this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { status: TRANSCRIPT_STATUS.EXPIRED }
    ]
  });
  return result.deletedCount || 0;
};

/**
 * Indexes for performance optimization
 */
interviewTranscriptSchema.index({ userId: 1, createdAt: -1 }); // User's transcripts
interviewTranscriptSchema.index({ status: 1, expiresAt: 1 }); // Processing and cleanup
interviewTranscriptSchema.index({ createdAt: -1 }); // Recent transcripts

/**
 * Create and export the InterviewTranscript model
 */
const InterviewTranscript = mongoose.model<IInterviewTranscript, IInterviewTranscriptModel>(
  'InterviewTranscript', 
  interviewTranscriptSchema
);

export default InterviewTranscript; 