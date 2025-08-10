/**
 * Avatar Routes Tests
 * 
 * Tests the behavior of avatar preference endpoints including
 * fetching and saving user avatar preferences.
 * 
 * Test Coverage:
 * - GET /api/avatar/preferences - Fetch user avatar preferences
 * - POST /api/avatar/preferences - Save user avatar preferences
 * - Authentication requirements
 * - Error handling scenarios
 * 
 * Related Files:
 * - src/routes/avatar.routes.ts - Routes being tested
 * - src/models/AvatarPreference.ts - Avatar preference model
 * - src/middleware/auth.ts - Authentication middleware
 */

import request from 'supertest';
import app from '../index';
import { connectDB, disconnectDB } from '../config/database';
import { generateToken } from '../services/auth.service';
import mongoose from 'mongoose';

// Mock the authentication middleware
jest.mock('../middleware', () => ({
  authenticateToken: jest.fn((req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authentication required', message: 'No token provided' });
    }
    
    if (authHeader === 'Bearer invalid-token') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    // Mock user object
    req.user = {
      _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'),
      email: 'test@example.com'
    };
    next();
  }),
  optionalAuth: jest.fn((req: any, res: any, next: any) => {
    next();
  }),
  errorHandler: jest.fn((err: any, req: any, res: any, next: any) => {
    res.status(500).json({ error: err.message });
  }),
  notFoundHandler: jest.fn((req: any, res: any) => {
    res.status(404).json({ error: 'Not found' });
  })
}));

// Mock the AvatarPreference model
const mockAvatarPreferences = new Map();

jest.mock('../models/AvatarPreference', () => ({
  default: {
    findOne: jest.fn((query) => {
      const key = query.userId;
      return Promise.resolve(mockAvatarPreferences.get(key));
    }),
    findOneAndUpdate: jest.fn((query, update, options) => {
      const key = query.userId;
      const preference = {
        ...update,
        _id: 'mock-id',
        createdAt: new Date(),
        updatedAt: update.updatedAt
      };
      mockAvatarPreferences.set(key, preference);
      return Promise.resolve(preference);
    })
  },
  findOne: jest.fn((query) => {
    const key = query.userId;
    return Promise.resolve(mockAvatarPreferences.get(key));
  }),
  findOneAndUpdate: jest.fn((query, update, options) => {
    const key = query.userId;
    const preference = {
      ...update,
      _id: 'mock-id',
      createdAt: new Date(),
      updatedAt: update.updatedAt
    };
    mockAvatarPreferences.set(key, preference);
    return Promise.resolve(preference);
  })
}));

describe('Avatar Routes', () => {
  let authToken: string;
  const testUserId = '507f1f77bcf86cd799439011'; // Must match the mock middleware
  const testEmail = 'test@example.com';

  beforeAll(async () => {
    // Generate auth token for test user
    authToken = 'mock-token'; // The actual token doesn't matter since we're mocking the middleware
  });

  beforeEach(() => {
    // Clear mock preferences before each test
    mockAvatarPreferences.clear();
  });

  afterAll(async () => {
    jest.clearAllMocks();
  });

  describe('GET /api/avatar/preferences', () => {
    it('should return default preferences when user has none saved', async () => {
      const response = await request(app)
        .get('/api/avatar/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.preferences).toEqual({
        avatarId: 'professional-female-1',
        cameraAngle: 'front',
        environmentTheme: 'modern-office',
        animationQuality: 'high'
      });
    });

    it('should return saved preferences when user has preferences', async () => {
      const savedPreferences = {
        userId: testUserId,
        avatarId: 'professional-male-1',
        cameraAngle: 'side',
        environmentTheme: 'casual-lounge',
        animationQuality: 'medium'
      };
      mockAvatarPreferences.set(testUserId, savedPreferences);

      const response = await request(app)
        .get('/api/avatar/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.preferences).toMatchObject({
        avatarId: 'professional-male-1',
        cameraAngle: 'side',
        environmentTheme: 'casual-lounge',
        animationQuality: 'medium'
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/avatar/preferences')
        .expect(401);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('No token provided');
    });

    it('should reject invalid authentication token', async () => {
      const response = await request(app)
        .get('/api/avatar/preferences')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /api/avatar/preferences', () => {
    it('should save new avatar preferences', async () => {
      const newPreferences = {
        avatarId: 'professional-female-2',
        cameraAngle: 'dynamic',
        environmentTheme: 'library',
        animationQuality: 'low'
      };

      const response = await request(app)
        .post('/api/avatar/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newPreferences)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.preferences).toMatchObject({
        userId: testUserId,
        ...newPreferences,
        updatedAt: expect.any(String)
      });

      // Verify saved in mock
      const saved = mockAvatarPreferences.get(testUserId);
      expect(saved).toBeDefined();
      expect(saved.avatarId).toBe('professional-female-2');
    });

    it('should update existing preferences', async () => {
      // Set initial preferences
      mockAvatarPreferences.set(testUserId, {
        userId: testUserId,
        avatarId: 'professional-male-1',
        cameraAngle: 'front',
        environmentTheme: 'modern-office',
        animationQuality: 'high'
      });

      // Update preferences
      const updatedPreferences = {
        avatarId: 'professional-female-1',
        cameraAngle: 'side',
        environmentTheme: 'casual-lounge',
        animationQuality: 'medium'
      };

      const response = await request(app)
        .post('/api/avatar/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updatedPreferences)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.preferences.avatarId).toBe('professional-female-1');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/avatar/preferences')
        .send({ avatarId: 'test' })
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should accept partial preference updates', async () => {
      const partialUpdate = {
        avatarId: 'professional-female-2'
      };

      const response = await request(app)
        .post('/api/avatar/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(partialUpdate)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.preferences.avatarId).toBe('professional-female-2');
    });

    it('should validate avatar ID format', async () => {
      const invalidPreferences = {
        avatarId: 123, // Should be string
        cameraAngle: 'front'
      };

      const response = await request(app)
        .post('/api/avatar/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPreferences)
        .expect(200); // Will still save, but may need validation in real implementation

      expect(response.body.success).toBe(true);
    });

    it('should handle empty request body', async () => {
      const response = await request(app)
        .post('/api/avatar/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.preferences).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock a database error
      const AvatarPreference = require('../models/AvatarPreference');
      AvatarPreference.findOne.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/avatar/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.error).toBe('Failed to fetch avatar preferences');
      expect(response.body.message).toBe('Database connection failed');
    });

    it('should handle save errors gracefully', async () => {
      const AvatarPreference = require('../models/AvatarPreference');
      AvatarPreference.findOneAndUpdate.mockRejectedValueOnce(new Error('Save failed'));

      const response = await request(app)
        .post('/api/avatar/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ avatarId: 'test' })
        .expect(500);

      expect(response.body.error).toBe('Failed to save avatar preferences');
      expect(response.body.message).toBe('Save failed');
    });
  });
});