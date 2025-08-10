/**
 * Avatar Preference Model
 * 
 * Stores user preferences for 3D avatar configuration including
 * avatar selection, camera settings, environment theme, and animation quality.
 * 
 * Key Features:
 * - TypeScript interfaces for type safety
 * - Mongoose schema with validation
 * - User-specific avatar preferences
 * - Default values for new users
 * - Indexes for performance
 * 
 * Related Files:
 * - src/routes/avatar.routes.ts - Avatar preference endpoints
 * - src/models/User.ts - User model reference
 */

import mongoose, { Document, Schema, Model } from 'mongoose';

/**
 * Interface defining the avatar preference document structure
 */
export interface IAvatarPreference extends Document {
  userId: string;
  avatarId: string;
  cameraAngle: 'front' | 'side' | 'dynamic';
  environmentTheme: string;
  animationQuality: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Avatar preference schema definition
 */
const AvatarPreferenceSchema = new Schema<IAvatarPreference>(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      unique: true,
      index: true
    },
    avatarId: {
      type: String,
      required: [true, 'Avatar ID is required'],
      default: 'professional-female-1'
    },
    cameraAngle: {
      type: String,
      enum: ['front', 'side', 'dynamic'],
      default: 'front'
    },
    environmentTheme: {
      type: String,
      default: 'modern-office'
    },
    animationQuality: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'high'
    }
  },
  {
    timestamps: true,
    collection: 'avatarpreferences'
  }
);

/**
 * Indexes for performance optimization
 */
AvatarPreferenceSchema.index({ userId: 1 });
AvatarPreferenceSchema.index({ updatedAt: -1 });

/**
 * Instance methods
 */
AvatarPreferenceSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

/**
 * Static methods
 */
AvatarPreferenceSchema.statics.getDefaultPreferences = function() {
  return {
    avatarId: 'professional-female-1',
    cameraAngle: 'front',
    environmentTheme: 'modern-office',
    animationQuality: 'high'
  };
};

/**
 * Model creation
 */
const AvatarPreference: Model<IAvatarPreference> = mongoose.model<IAvatarPreference>(
  'AvatarPreference',
  AvatarPreferenceSchema
);

export default AvatarPreference;