/**
 * AI Interview Coach Backend - Step 32 Input Validation Tests
 * 
 * This file contains comprehensive tests for step 32 implementation: 
 * "Add validation for all route inputs using basic if-statements to check required fields. 
 * Return 400 status with clear error messages for missing or invalid fields."
 * 
 * Tests cover all API routes that received enhanced input validation:
 * - Authentication routes (register, login)
 * - Interview routes (create, list, get by ID)
 * - Session routes (create, append transcript)
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import { Application } from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/database';
import { generateToken } from '../services/auth.service';
import User from '../models/User';
import Interview from '../models/Interview';
import SessionRecording from '../models/SessionRecording';

// Import app for testing
function createTestApp(): Application {
  const express = require('express');
  const cors = require('cors');
  
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  
  // Import routes
  const authRoutes = require('../routes/auth.routes').default;
  const interviewRoutes = require('../routes/interview.routes').default;
  const sessionRoutes = require('../routes/session.routes').default;
  
  // Register routes
  app.use('/api/auth', authRoutes);
  app.use('/api/interviews', interviewRoutes);
  app.use('/api/sessions', sessionRoutes);
  
  return app;
}

describe('Step 32: Input Validation Tests', () => {
  let app: Application;
  let validToken: string;
  let testUserId: string;
  let testInterviewId: string;

  beforeAll(async () => {
    // Connect to test database
    await connectDB();
    app = createTestApp();
    
    // Create test user and generate token
    const testUser = new User({
      email: 'step32test@example.com',
      password: 'TestPassword123!',
      name: 'Step 32 Test User',
      grade: 12,
      targetMajor: 'Computer Science'
    });
    
    const savedUser = await testUser.save();
    testUserId = (savedUser._id as mongoose.Types.ObjectId).toString();
    validToken = generateToken(testUserId, savedUser.email).token;
    
    // Create test interview for session tests
    const testInterview = new Interview({
      userId: savedUser._id,
      interviewType: 'behavioral',
      interviewDifficulty: 'intermediate',
      duration: 30,
      questions: [],
      totalQuestions: 0,
      status: 'pending'
    });
    
    const savedInterview = await testInterview.save();
    testInterviewId = (savedInterview._id as mongoose.Types.ObjectId).toString();
  });

  afterAll(async () => {
    // Cleanup test data
    await User.deleteMany({ email: { $regex: /step32test/i } });
    await Interview.deleteMany({ userId: testUserId });
    await SessionRecording.deleteMany({ userId: testUserId });
    await disconnectDB();
  });

  describe('Authentication Route Validation', () => {
    describe('POST /api/auth/register', () => {
      it('should return 400 when request body is missing', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send();

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toBe('Request body is required');
      });

      it('should return 400 when email is missing', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            password: 'TestPassword123!',
            name: 'Test User'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toBe('Email is required');
      });

      it('should return 400 when password is missing', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            name: 'Test User'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toBe('Password is required');
      });

      it('should return 400 when name is missing', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'TestPassword123!'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toBe('Name is required');
      });

      it('should return 400 when email is not a string', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 123,
            password: 'TestPassword123!',
            name: 'Test User'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toBe('Email must be a string');
      });

      it('should return 400 when password is not a string', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 123,
            name: 'Test User'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toBe('Password must be a string');
      });

      it('should return 400 when name is not a string', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'TestPassword123!',
            name: 123
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toBe('Name must be a string');
      });

      it('should return 400 when email is empty', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: '   ',
            password: 'TestPassword123!',
            name: 'Test User'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toBe('Email cannot be empty');
      });

      it('should return 400 when email is too long', async () => {
        const longEmail = 'a'.repeat(250) + '@example.com';
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: longEmail,
            password: 'TestPassword123!',
            name: 'Test User'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toBe('Email must be 254 characters or less');
      });

      it('should return 400 when grade is not a number', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'TestPassword123!',
            name: 'Test User',
            grade: 'twelve'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toBe('Grade must be a number');
      });

      it('should return 400 when grade is not an integer', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'TestPassword123!',
            name: 'Test User',
            grade: 12.5
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toBe('Grade must be a whole number');
      });

      it('should return 400 when grade is out of range', async () => {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: 'test@example.com',
            password: 'TestPassword123!',
            name: 'Test User',
            grade: 15
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toBe('Grade must be between 1 and 12');
      });
    });

    describe('POST /api/auth/login', () => {
      it('should return 400 when request body is missing', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send();

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toBe('Request body is required');
      });

      it('should return 400 when email is missing', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            password: 'TestPassword123!'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toBe('Email is required');
      });

      it('should return 400 when password is missing', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toBe('Password is required');
      });

      it('should return 400 when password is too long', async () => {
        const longPassword = 'a'.repeat(130);
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: longPassword
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toBe('Password must be 128 characters or less');
      });
    });
  });

  describe('Interview Route Validation', () => {
    describe('POST /api/interviews', () => {
      it('should return 400 when request body is missing', async () => {
        const response = await request(app)
          .post('/api/interviews')
          .set('Authorization', `Bearer ${validToken}`)
          .send();

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toBe('Request body is required');
      });

      it('should return 400 when interviewType is missing', async () => {
        const response = await request(app)
          .post('/api/interviews')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            interviewDifficulty: 'intermediate'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toBe('Interview type is required');
      });

      it('should return 400 when interviewDifficulty is missing', async () => {
        const response = await request(app)
          .post('/api/interviews')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            interviewType: 'behavioral'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toBe('Interview difficulty is required');
      });

      it('should return 400 when duration is not a number', async () => {
        const response = await request(app)
          .post('/api/interviews')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            interviewType: 'behavioral',
            interviewDifficulty: 'intermediate',
            duration: 'thirty'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toBe('Duration must be a number');
      });

      it('should return 400 when duration is not an integer', async () => {
        const response = await request(app)
          .post('/api/interviews')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            interviewType: 'behavioral',
            interviewDifficulty: 'intermediate',
            duration: 30.5
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toBe('Duration must be a whole number of minutes');
      });

      it('should return 400 when tags is not an array', async () => {
        const response = await request(app)
          .post('/api/interviews')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            interviewType: 'behavioral',
            interviewDifficulty: 'intermediate',
            tags: 'leadership'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toBe('Tags must be an array');
      });

      it('should return 400 when tags array has too many items', async () => {
        const tooManyTags = Array(15).fill('tag');
        const response = await request(app)
          .post('/api/interviews')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            interviewType: 'behavioral',
            interviewDifficulty: 'intermediate',
            tags: tooManyTags
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toBe('Maximum of 10 tags are allowed');
      });
    });

    describe('GET /api/interviews', () => {
      it('should return 400 when page parameter is invalid', async () => {
        const response = await request(app)
          .get('/api/interviews?page=invalid')
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toBe('Page parameter must be a valid number');
      });

      it('should return 400 when limit parameter is too high', async () => {
        const response = await request(app)
          .get('/api/interviews?limit=150')
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toBe('Limit parameter must be 100 or less');
      });

      it('should return 400 when status filter is invalid', async () => {
        const response = await request(app)
          .get('/api/interviews?status=invalid')
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toBe('Status filter must be one of: pending, active, completed, cancelled');
      });
    });
  });

  describe('Session Route Validation', () => {
    describe('POST /api/sessions', () => {
      it('should return 400 when request body is missing', async () => {
        const response = await request(app)
          .post('/api/sessions')
          .set('Authorization', `Bearer ${validToken}`)
          .send();

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Request body is required');
        expect(response.body.code).toBe('MISSING_REQUEST_BODY');
      });

      it('should return 400 when interviewId is missing', async () => {
        const response = await request(app)
          .post('/api/sessions')
          .set('Authorization', `Bearer ${validToken}`)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Interview ID is required');
        expect(response.body.code).toBe('MISSING_INTERVIEW_ID');
      });

      it('should return 400 when interviewId is not a string', async () => {
        const response = await request(app)
          .post('/api/sessions')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            interviewId: 123
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Interview ID must be a string');
        expect(response.body.code).toBe('INVALID_INTERVIEW_ID_TYPE');
      });

      it('should return 400 when interviewId is empty', async () => {
        const response = await request(app)
          .post('/api/sessions')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            interviewId: '   '
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Interview ID cannot be empty');
        expect(response.body.code).toBe('EMPTY_INTERVIEW_ID');
      });

      it('should return 400 when interviewId is invalid ObjectId format', async () => {
        const response = await request(app)
          .post('/api/sessions')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            interviewId: 'invalid-id'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Invalid or missing interview ID. Please provide a valid MongoDB ObjectId.');
        expect(response.body.code).toBe('INVALID_INTERVIEW_ID');
      });
    });

    describe('POST /api/sessions/:id/transcript', () => {
      let sessionId: string;

      beforeAll(async () => {
        // Create a test session
        const session = new SessionRecording({
          interviewId: testInterviewId,
          userId: testUserId,
          transcript: [],
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
        const savedSession = await session.save();
        sessionId = (savedSession._id as mongoose.Types.ObjectId).toString();
      });

      it('should return 400 when speaker is missing', async () => {
        const response = await request(app)
          .post(`/api/sessions/${sessionId}/transcript`)
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            text: 'Some transcript text'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Speaker field is required');
        expect(response.body.code).toBe('MISSING_SPEAKER');
      });

      it('should return 400 when speaker is not a string', async () => {
        const response = await request(app)
          .post(`/api/sessions/${sessionId}/transcript`)
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            speaker: 123,
            text: 'Some transcript text'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Speaker must be a string');
        expect(response.body.code).toBe('INVALID_SPEAKER_TYPE');
      });

      it('should return 400 when speaker is invalid value', async () => {
        const response = await request(app)
          .post(`/api/sessions/${sessionId}/transcript`)
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            speaker: 'invalid',
            text: 'Some transcript text'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Invalid speaker. Must be one of: user, ai, system');
        expect(response.body.code).toBe('INVALID_SPEAKER');
      });

      it('should return 400 when text is missing', async () => {
        const response = await request(app)
          .post(`/api/sessions/${sessionId}/transcript`)
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            speaker: 'user'
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Text field is required');
        expect(response.body.code).toBe('MISSING_TEXT');
      });

      it('should return 400 when text is too long', async () => {
        const longText = 'a'.repeat(10001);
        const response = await request(app)
          .post(`/api/sessions/${sessionId}/transcript`)
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            speaker: 'user',
            text: longText
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Text must be 10,000 characters or less');
        expect(response.body.code).toBe('TEXT_TOO_LONG');
      });

      it('should return 400 when confidence is invalid', async () => {
        const response = await request(app)
          .post(`/api/sessions/${sessionId}/transcript`)
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            speaker: 'user',
            text: 'Some transcript text',
            confidence: 1.5
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Confidence must be a number between 0 and 1');
        expect(response.body.code).toBe('INVALID_CONFIDENCE');
      });

      it('should return 400 when duration is negative', async () => {
        const response = await request(app)
          .post(`/api/sessions/${sessionId}/transcript`)
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            speaker: 'user',
            text: 'Some transcript text',
            duration: -100
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Duration must be a positive number in milliseconds');
        expect(response.body.code).toBe('INVALID_DURATION');
      });

      it('should return 400 when duration is too long', async () => {
        const response = await request(app)
          .post(`/api/sessions/${sessionId}/transcript`)
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            speaker: 'user',
            text: 'Some transcript text',
            duration: 3600001 // Over 1 hour
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Duration must be 1 hour or less');
        expect(response.body.code).toBe('DURATION_TOO_LONG');
      });
    });
  });

  describe('Authentication Requirements', () => {
    it('should return 401 for protected routes without token', async () => {
      const routes = [
        { method: 'post', path: '/api/interviews' },
        { method: 'get', path: '/api/interviews' },
        { method: 'post', path: '/api/sessions' }
      ];

      for (const route of routes) {
        const response = await (request(app) as any)[route.method](route.path);
        expect(response.status).toBe(401);
      }
    });

    it('should return 401 for protected routes with invalid token', async () => {
      const invalidToken = 'invalid-token';
      const routes = [
        { method: 'post', path: '/api/interviews' },
        { method: 'get', path: '/api/interviews' },
        { method: 'post', path: '/api/sessions' }
      ];

      for (const route of routes) {
        const response = await (request(app) as any)[route.method](route.path)
          .set('Authorization', `Bearer ${invalidToken}`);
        expect(response.status).toBe(401);
      }
    });
  });

  describe('Response Format Consistency', () => {
    it('should return consistent error format for validation errors', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 123,
          password: 'test',
          name: 'Test'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
      expect(response.body.error).toBe('Bad Request');
      expect(typeof response.body.message).toBe('string');
    });

    it('should return consistent error format for session validation errors', async () => {
      const response = await request(app)
        .post('/api/sessions')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
      expect(response.body.success).toBe(false);
      expect(typeof response.body.message).toBe('string');
      expect(typeof response.body.code).toBe('string');
    });
  });
}); 