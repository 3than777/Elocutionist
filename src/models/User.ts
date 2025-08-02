/**
 * AI Interview Coach Backend - User Model
 * 
 * This file defines the User model for authentication and profile management.
 * It implements secure password hashing, email validation, and user profile fields
 * required for the AI Interview Coach system.
 * 
 * Key Features:
 * - TypeScript interfaces for type safety
 * - Mongoose schema with comprehensive validation
 * - Automatic password hashing using bcrypt
 * - Email uniqueness validation
 * - Profile fields for interview personalization
 * - Virtual fields and instance methods
 * - Indexes for performance optimization
 * 
 * Security Features:
 * - Passwords hashed with bcrypt (configurable salt rounds)
 * - Password field excluded from JSON responses
 * - Email validation and normalization
 * - Safe password comparison methods
 * 
 * Related Files:
 * - src/services/auth.service.ts - Authentication logic
 * - src/controllers/auth.controller.ts - Auth endpoints
 * - src/routes/auth.routes.ts - Auth route definitions
 * 
 * Task: #7 - User model with authentication fields and password hashing
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import mongoose, { Document, Schema, Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';

/**
 * Interface defining the user document structure
 * Extends Mongoose Document for type safety
 */
export interface IUser extends Document {
  // Authentication fields
  email: string;
  password: string;
  
  // Profile fields
  name: string;
  grade?: number;
  targetMajor?: string;
  targetColleges?: string[];
  extracurriculars?: string[];
  strengths?: string[];
  weaknesses?: string[];
  
  // System fields
  isActive: boolean;
  isEmailVerified: boolean;
  lastLogin?: Date;
  loginCount: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Instance methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  toSafeObject(): Partial<IUser>;
}

/**
 * Interface for the User model static methods
 */
interface IUserModel extends Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
  findActiveUsers(): Promise<IUser[]>;
}

/**
 * Mongoose schema definition for the User model
 * Implements all fields with proper validation and defaults
 */
const userSchema = new Schema<IUser>(
  {
    // Authentication fields
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function(value: string): boolean {
          // RFC 5322 compliant email regex
          const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
          return emailRegex.test(value);
        },
        message: 'Please provide a valid email address'
      },
      index: true // Index for fast email lookups
    },
    
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false // Exclude password from queries by default
    },
    
    // Profile fields
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    
    grade: {
      type: Number,
      min: [1, 'Grade must be between 1 and 12'],
      max: [12, 'Grade must be between 1 and 12'],
      validate: {
        validator: Number.isInteger,
        message: 'Grade must be a whole number'
      }
    },
    
    targetMajor: {
      type: String,
      trim: true,
      maxlength: [100, 'Target major cannot exceed 100 characters']
    },
    
    targetColleges: {
      type: [String],
      default: [],
      validate: {
        validator: function(colleges: string[]): boolean {
          return colleges.length <= 20; // Limit to 20 colleges
        },
        message: 'Cannot have more than 20 target colleges'
      }
    },
    
    extracurriculars: {
      type: [String],
      default: [],
      validate: {
        validator: function(activities: string[]): boolean {
          return activities.length <= 50; // Limit to 50 activities
        },
        message: 'Cannot have more than 50 extracurricular activities'
      }
    },
    
    strengths: {
      type: [String],
      default: [],
      validate: {
        validator: function(items: string[]): boolean {
          return items.length <= 10;
        },
        message: 'Cannot have more than 10 strengths listed'
      }
    },
    
    weaknesses: {
      type: [String],
      default: [],
      validate: {
        validator: function(items: string[]): boolean {
          return items.length <= 10;
        },
        message: 'Cannot have more than 10 weaknesses listed'
      }
    },
    
    // System fields
    isActive: {
      type: Boolean,
      default: true,
      index: true // Index for filtering active users
    },
    
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    
    lastLogin: {
      type: Date,
      default: null
    },
    
    loginCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    // Schema options
    timestamps: true, // Automatically manage createdAt and updatedAt
    toJSON: {
      transform: function(doc: any, ret: any) {
        // Remove sensitive fields from JSON output
        delete ret.password;
        delete ret.__v;
        return ret;
      }
    }
  }
);

/**
 * Pre-save middleware to hash password before saving
 * Only hashes if password is new or modified
 */
userSchema.pre('save', async function(next) {
  // Only hash password if it's new or modified
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    // Get salt rounds from environment or use default
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
    
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(saltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    
    next();
  } catch (error) {
    next(error as Error);
  }
});

/**
 * Instance method to compare passwords
 * Used for authentication to verify user credentials
 * 
 * @param {string} candidatePassword - Plain text password to compare
 * @returns {Promise<boolean>} True if passwords match
 */
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    // Note: 'this.password' requires selecting password field in query
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
};

/**
 * Instance method to get safe user object without sensitive data
 * Useful for sending user data in API responses
 * 
 * @returns {Partial<IUser>} User object without sensitive fields
 */
userSchema.methods.toSafeObject = function(): Partial<IUser> {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.__v;
  return userObject;
};

/**
 * Static method to find user by email
 * Commonly used in authentication flows
 * 
 * @param {string} email - Email address to search for
 * @returns {Promise<IUser | null>} User document or null
 */
userSchema.statics.findByEmail = async function(email: string): Promise<IUser | null> {
  return this.findOne({ email: email.toLowerCase() });
};

/**
 * Static method to find all active users
 * Useful for admin panels or user listings
 * 
 * @returns {Promise<IUser[]>} Array of active user documents
 */
userSchema.statics.findActiveUsers = async function(): Promise<IUser[]> {
  return this.find({ isActive: true }).sort({ createdAt: -1 });
};

/**
 * Virtual field for full profile completion status
 * Helps track if user has completed their profile
 */
userSchema.virtual('isProfileComplete').get(function() {
  return !!(
    this.name &&
    this.grade &&
    this.targetMajor &&
    (this.targetColleges?.length ?? 0) > 0
  );
});

/**
 * Indexes for performance optimization
 * These improve query performance for common operations
 */
userSchema.index({ email: 1, isActive: 1 }); // Compound index for active user lookups
userSchema.index({ createdAt: -1 }); // For sorting by creation date
userSchema.index({ lastLogin: -1 }); // For sorting by last login

/**
 * Create and export the User model
 * This is the main export used throughout the application
 */
const User = mongoose.model<IUser, IUserModel>('User', userSchema);

export default User; 