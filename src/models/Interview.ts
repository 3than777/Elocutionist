/**
 * AI Interview Coach Backend - Interview Model
 * 
 * This file defines the Interview model for managing interview sessions.
 * It tracks interview metadata, questions, and session state throughout
 * the interview lifecycle from creation to completion.
 * 
 * Key Features:
 * - TypeScript interfaces for type safety
 * - Reference to User model for ownership
 * - Interview type and difficulty categorization
 * - Dynamic question storage
 * - Session state management
 * - Unique session token generation
 * - Performance indexes
 * 
 * Interview Lifecycle:
 * 1. Created with type and difficulty
 * 2. Questions generated and stored
 * 3. Status changes to 'active' when started
 * 4. Marked 'completed' when finished
 * 5. Can be 'cancelled' if abandoned
 * 
 * Related Files:
 * - src/models/User.ts - User reference
 * - src/models/SessionRecording.ts - Interview recordings
 * - src/services/openai.service.ts - Question generation
 * - src/controllers/interview.controller.ts - Interview logic
 * 
 * Task: #8 - Interview model with session management fields
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import mongoose, { Document, Schema, Types, Model } from 'mongoose';
import crypto from 'crypto';

/**
 * Enum for interview types
 * Using const object with 'as const' assertion per .cursorrules
 */
export const INTERVIEW_TYPES = {
  BEHAVIORAL: 'behavioral',
  TECHNICAL: 'technical',
  SITUATIONAL: 'situational',
  CASE_STUDY: 'case_study',
  MIXED: 'mixed'
} as const;

export type InterviewType = typeof INTERVIEW_TYPES[keyof typeof INTERVIEW_TYPES];

/**
 * Enum for interview difficulty levels
 */
export const INTERVIEW_DIFFICULTY = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
  EXPERT: 'expert'
} as const;

export type InterviewDifficulty = typeof INTERVIEW_DIFFICULTY[keyof typeof INTERVIEW_DIFFICULTY];

/**
 * Enum for interview status
 */
export const INTERVIEW_STATUS = {
  PENDING: 'pending',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
} as const;

export type InterviewStatus = typeof INTERVIEW_STATUS[keyof typeof INTERVIEW_STATUS];

/**
 * Interface for question structure within an interview
 */
export interface IInterviewQuestion {
  id: string;
  text: string;
  category?: string;
  expectedDuration?: number; // Expected answer duration in seconds
  hints?: string[];
  followUps?: string[];
  order: number;
}

/**
 * Interface defining the interview document structure
 */
export interface IInterview extends Document {
  // Reference fields
  userId: Types.ObjectId;
  
  // Interview configuration
  interviewType: InterviewType;
  interviewDifficulty: InterviewDifficulty;
  duration: number; // Duration in minutes
  
  // Question management
  questions: IInterviewQuestion[];
  totalQuestions: number;
  
  // Session management
  sessionToken: string;
  status: InterviewStatus;
  
  // Timing fields
  scheduledFor?: Date;
  startedAt?: Date;
  completedAt?: Date;
  actualDuration?: number; // Actual duration in minutes
  
  // Additional metadata
  customPrompt?: string; // Custom instructions for question generation
  tags?: string[];
  score?: number; // Overall interview score (0-100)
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  generateSessionToken(): string;
  start(): Promise<void>;
  complete(score?: number): Promise<void>;
  cancel(reason?: string): Promise<void>;
  addQuestion(question: Omit<IInterviewQuestion, 'id' | 'order'>): Promise<void>;
  isExpired(): boolean;
}

/**
 * Interface for Interview model static methods
 */
interface IInterviewModel extends Model<IInterview> {
  findByUserId(userId: string | Types.ObjectId): Promise<IInterview[]>;
  findActiveInterviews(): Promise<IInterview[]>;
  findBySessionToken(token: string): Promise<IInterview | null>;
  getInterviewStats(userId: string | Types.ObjectId): Promise<{
    total: number;
    completed: number;
    averageScore: number;
  }>;
}

/**
 * Mongoose schema definition for the Interview model
 */
const interviewSchema = new Schema<IInterview>(
  {
    // Reference to User
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    
    // Interview configuration
    interviewType: {
      type: String,
      required: [true, 'Interview type is required'],
      enum: {
        values: Object.values(INTERVIEW_TYPES),
        message: 'Invalid interview type'
      },
      default: INTERVIEW_TYPES.BEHAVIORAL
    },
    
    interviewDifficulty: {
      type: String,
      required: [true, 'Interview difficulty is required'],
      enum: {
        values: Object.values(INTERVIEW_DIFFICULTY),
        message: 'Invalid difficulty level'
      },
      default: INTERVIEW_DIFFICULTY.INTERMEDIATE
    },
    
    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [5, 'Duration must be at least 5 minutes'],
      max: [120, 'Duration cannot exceed 120 minutes'],
      default: 30
    },
    
    // Question management
    questions: [{
      id: {
        type: String,
        required: true,
        default: () => crypto.randomUUID()
      },
      text: {
        type: String,
        required: [true, 'Question text is required'],
        trim: true,
        maxlength: [1000, 'Question cannot exceed 1000 characters']
      },
      category: {
        type: String,
        trim: true,
        maxlength: [50, 'Category cannot exceed 50 characters']
      },
      expectedDuration: {
        type: Number,
        min: [30, 'Expected duration must be at least 30 seconds'],
        max: [600, 'Expected duration cannot exceed 10 minutes']
      },
      hints: [{
        type: String,
        maxlength: [500, 'Hint cannot exceed 500 characters']
      }],
      followUps: [{
        type: String,
        maxlength: [500, 'Follow-up question cannot exceed 500 characters']
      }],
      order: {
        type: Number,
        required: true,
        min: 0
      }
    }],
    
    totalQuestions: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // Session management
    sessionToken: {
      type: String,
      unique: true,
      sparse: true // Allow null values but ensure uniqueness when present
    },
    
    status: {
      type: String,
      required: true,
      enum: {
        values: Object.values(INTERVIEW_STATUS),
        message: 'Invalid interview status'
      },
      default: INTERVIEW_STATUS.PENDING,
      index: true
    },
    
    // Timing fields
    scheduledFor: {
      type: Date,
      validate: {
        validator: function(value: Date): boolean {
          // Scheduled time must be in the future (for new interviews)
          return !this.isNew || value > new Date();
        },
        message: 'Scheduled time must be in the future'
      }
    },
    
    startedAt: {
      type: Date,
      default: null
    },
    
    completedAt: {
      type: Date,
      default: null,
      validate: {
        validator: function(this: IInterview, value: Date): boolean {
          // Completed time must be after started time
          return !value || !this.startedAt || value > this.startedAt;
        },
        message: 'Completion time must be after start time'
      }
    },
    
    actualDuration: {
      type: Number,
      min: [0, 'Actual duration cannot be negative']
    },
    
    // Additional metadata
    customPrompt: {
      type: String,
      trim: true,
      maxlength: [1000, 'Custom prompt cannot exceed 1000 characters']
    },
    
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [30, 'Tag cannot exceed 30 characters']
    }],
    
    score: {
      type: Number,
      min: [0, 'Score must be between 0 and 100'],
      max: [100, 'Score must be between 0 and 100']
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc: any, ret: any) {
        // Clean up the returned object
        delete ret.__v;
        return ret;
      }
    }
  }
);

/**
 * Pre-save middleware to update totalQuestions
 */
interviewSchema.pre('save', function(next) {
  // Update total questions count
  this.totalQuestions = this.questions.length;
  
  // Generate session token if not present
  if (!this.sessionToken && this.isNew) {
    this.sessionToken = this.generateSessionToken();
  }
  
  next();
});

/**
 * Instance method to generate unique session token
 * 
 * @returns {string} Unique session token
 */
interviewSchema.methods.generateSessionToken = function(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = crypto.randomBytes(16).toString('hex');
  return `session_${timestamp}_${randomStr}`;
};

/**
 * Instance method to start an interview
 * Changes status to active and records start time
 * 
 * @returns {Promise<void>}
 */
interviewSchema.methods.start = async function(): Promise<void> {
  if (this.status !== INTERVIEW_STATUS.PENDING) {
    throw new Error('Interview can only be started from pending status');
  }
  
  this.status = INTERVIEW_STATUS.ACTIVE;
  this.startedAt = new Date();
  
  // Generate session token if not already present
  if (!this.sessionToken) {
    this.sessionToken = this.generateSessionToken();
  }
  
  await this.save();
};

/**
 * Instance method to complete an interview
 * 
 * @param {number} score - Optional interview score
 * @returns {Promise<void>}
 */
interviewSchema.methods.complete = async function(score?: number): Promise<void> {
  if (this.status !== INTERVIEW_STATUS.ACTIVE) {
    throw new Error('Only active interviews can be completed');
  }
  
  this.status = INTERVIEW_STATUS.COMPLETED;
  this.completedAt = new Date();
  
  // Calculate actual duration
  if (this.startedAt) {
    const durationMs = this.completedAt.getTime() - this.startedAt.getTime();
    this.actualDuration = Math.round(durationMs / 60000); // Convert to minutes
  }
  
  if (score !== undefined) {
    this.score = score;
  }
  
  await this.save();
};

/**
 * Instance method to cancel an interview
 * 
 * @param {string} reason - Optional cancellation reason
 * @returns {Promise<void>}
 */
interviewSchema.methods.cancel = async function(reason?: string): Promise<void> {
  if (this.status === INTERVIEW_STATUS.COMPLETED) {
    throw new Error('Completed interviews cannot be cancelled');
  }
  
  this.status = INTERVIEW_STATUS.CANCELLED;
  
  // Store cancellation reason in tags if provided
  if (reason) {
    this.tags = this.tags || [];
    this.tags.push(`cancelled:${reason}`);
  }
  
  await this.save();
};

/**
 * Instance method to add a question to the interview
 * 
 * @param {Omit<IInterviewQuestion, 'id' | 'order'>} question - Question to add
 * @returns {Promise<void>}
 */
interviewSchema.methods.addQuestion = async function(
  question: Omit<IInterviewQuestion, 'id' | 'order'>
): Promise<void> {
  const newQuestion: IInterviewQuestion = {
    ...question,
    id: crypto.randomUUID(),
    order: this.questions.length
  };
  
  this.questions.push(newQuestion);
  await this.save();
};

/**
 * Instance method to check if interview has expired
 * Interviews expire 24 hours after creation if not started
 * 
 * @returns {boolean} True if expired
 */
interviewSchema.methods.isExpired = function(): boolean {
  if (this.status !== INTERVIEW_STATUS.PENDING) {
    return false;
  }
  
  const expirationTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  const age = Date.now() - this.createdAt.getTime();
  
  return age > expirationTime;
};

/**
 * Static method to find interviews by user ID
 * 
 * @param {string | Types.ObjectId} userId - User ID to search for
 * @returns {Promise<IInterview[]>} Array of user's interviews
 */
interviewSchema.statics.findByUserId = async function(
  userId: string | Types.ObjectId
): Promise<IInterview[]> {
  return this.find({ userId }).sort({ createdAt: -1 });
};

/**
 * Static method to find all active interviews
 * 
 * @returns {Promise<IInterview[]>} Array of active interviews
 */
interviewSchema.statics.findActiveInterviews = async function(): Promise<IInterview[]> {
  return this.find({ status: INTERVIEW_STATUS.ACTIVE }).sort({ startedAt: -1 });
};

/**
 * Static method to find interview by session token
 * 
 * @param {string} token - Session token to search for
 * @returns {Promise<IInterview | null>} Interview or null
 */
interviewSchema.statics.findBySessionToken = async function(
  token: string
): Promise<IInterview | null> {
  return this.findOne({ sessionToken: token });
};

/**
 * Static method to get interview statistics for a user
 * 
 * @param {string | Types.ObjectId} userId - User ID
 * @returns {Promise<object>} Statistics object
 */
interviewSchema.statics.getInterviewStats = async function(
  userId: string | Types.ObjectId
): Promise<{ total: number; completed: number; averageScore: number }> {
  const stats = await this.aggregate([
    { $match: { userId: new Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', INTERVIEW_STATUS.COMPLETED] }, 1, 0] }
        },
        totalScore: {
          $sum: { $cond: [{ $eq: ['$status', INTERVIEW_STATUS.COMPLETED] }, '$score', 0] }
        }
      }
    }
  ]);
  
  if (stats.length === 0) {
    return { total: 0, completed: 0, averageScore: 0 };
  }
  
  const { total, completed, totalScore } = stats[0];
  const averageScore = completed > 0 ? totalScore / completed : 0;
  
  return { total, completed, averageScore };
};

/**
 * Indexes for performance optimization
 */
interviewSchema.index({ userId: 1, status: 1 }); // User's interviews by status
interviewSchema.index({ status: 1, createdAt: -1 }); // Recent interviews by status
interviewSchema.index({ sessionToken: 1 }); // Fast token lookup
interviewSchema.index({ createdAt: -1 }); // Recent interviews

/**
 * Create and export the Interview model
 */
const Interview = mongoose.model<IInterview, IInterviewModel>('Interview', interviewSchema);

export default Interview; 