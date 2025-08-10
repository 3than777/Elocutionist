/**
 * Avatar Routes
 * 
 * API endpoints for managing user avatar preferences including
 * fetching and saving 3D avatar configuration settings.
 * 
 * Endpoints:
 * - GET /api/avatar/preferences - Get user's avatar preferences
 * - POST /api/avatar/preferences - Save/update avatar preferences
 * 
 * All endpoints require authentication via JWT token.
 */

import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware';
import AvatarPreference from '../models/AvatarPreference';

const router = Router();

/**
 * Get user's avatar preferences
 * Returns saved preferences or default values for new users
 */
router.get('/preferences', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?._id.toString();
    const preferences = await AvatarPreference.findOne({ userId });
    
    res.json({
      success: true,
      preferences: preferences || {
        avatarId: 'professional-female-1',
        cameraAngle: 'front',
        environmentTheme: 'modern-office',
        animationQuality: 'high'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch avatar preferences',
      message: error.message
    });
  }
});

/**
 * Save or update avatar preferences
 * Accepts partial updates - only provided fields are updated
 */
router.post('/preferences', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?._id.toString();
    const { avatarId, cameraAngle, environmentTheme, animationQuality } = req.body;
    
    const preferences = await AvatarPreference.findOneAndUpdate(
      { userId },
      {
        userId,
        avatarId,
        cameraAngle,
        environmentTheme,
        animationQuality,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    
    res.json({
      success: true,
      preferences
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to save avatar preferences',
      message: error.message
    });
  }
});

export default router;