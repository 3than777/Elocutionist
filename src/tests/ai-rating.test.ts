/**
 * AI Interview Coach Backend - AI Rating Endpoints Tests
 * 
 * This file contains comprehensive tests for the AI rating feature endpoints
 * that were implemented in steps 2-5 of the AI rating feature implementation.
 * These tests verify the complete workflow from transcript collection to
 * AI feedback generation and retrieval.
 * 
 * Test Coverage:
 * - Interview transcript collection (POST /api/chat/end-interview)
 * - AI rating generation (POST /api/chat/generate-rating)
 * - AI rating retrieval (GET /api/chat/rating/:transcriptId)
 * - Error handling and validation
 * - Authentication and authorization
 * 
 * Related Files:
 * - src/routes/chat.routes.ts - AI rating endpoints
 * - src/models/InterviewTranscript.ts - Transcript model
 * - src/services/openai.service.ts - AI feedback analysis
 * 
 * Task: Steps 2-5 - AI Rating Feature Implementation Testing
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import request from 'supertest';
import { Express } from 'express';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '../models/User';
import InterviewTranscript from '../models/InterviewTranscript';
import { generateToken } from '../services/auth.service';

// Mock the OpenAI service to avoid API calls during testing
jest.mock('../services/openai.service', () => ({
  ...jest.requireActual('../services/openai.service'),
  analyzeFeedback: jest.fn().mockResolvedValue({
    overallRating: 8.5,
    strengths: [
      'Excellent use of specific examples',
      'Clear and confident communication',
      'Good understanding of leadership principles'
    ],
    weaknesses: [
      'Could provide more quantitative results',
      'Slight tendency to use filler words'
    ],
    recommendations: [
      {
        area: 'Content Structure',
        suggestion: 'Use the STAR method more consistently',
        priority: 'high',
        examples: ['Situation, Task, Action, Result format']
      }
    ],
    detailedScores: {
      contentRelevance: 85,
      communication: 80,
      confidence: 90,
      structure: 75,
      engagement: 88
    },
    summary: 'Strong interview performance with excellent examples and confident delivery.'
  })
}));

describe('AI Rating Endpoints', () => {
  let mongoServer: MongoMemoryServer;
  let app: Express;
  let authToken: string;
  let testUser: any;

  beforeAll(async () => {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Import app after database connection
    const { default: createApp } = await import('../index');
    app = createApp;

    // Create test user
    testUser = new User({
      email: 'test@example.com',
      password: 'TestPass123!',
      name: 'Test User',
      grade: 12,
      targetMajor: 'Computer Science'
    });
    await testUser.save();

    // Generate auth token
    authToken = generateToken(testUser._id.toString());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    // Clean up transcripts after each test
    await InterviewTranscript.deleteMany({});
  });

  describe('POST /api/chat/end-interview', () => {
    const validTranscriptData = {
      messages: [
        {
          sender: 'ai',
          text: 'Tell me about a time when you demonstrated leadership.',
          timestamp: new Date()
        },
        {
          sender: 'user',
          text: 'In my senior year, I led a team of 5 students to organize our school\'s robotics competition. We had tight deadlines and budget constraints, but I coordinated weekly meetings, delegated tasks based on each member\'s strengths, and maintained open communication with school administration. The event was successful with over 200 participants.',
          timestamp: new Date()
        }
      ],
      interviewContext: {
        difficulty: 'intermediate',
        userProfile: {
          name: 'Test User',
          grade: 12,
          targetMajor: 'Computer Science'
        },
        interviewType: 'behavioral',
        duration: 30
      }
    };

    it('should successfully collect interview transcript', async () => {
      const response = await request(app)
        .post('/api/chat/end-interview')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validTranscriptData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Interview transcript collected successfully');
      expect(response.body.data).toHaveProperty('transcriptId');
      expect(response.body.data.messageCount).toBe(2);
      expect(response.body.data.status).toBe('pending');

      // Verify transcript was saved to database
      const transcript = await InterviewTranscript.findById(response.body.data.transcriptId);
      expect(transcript).toBeTruthy();
      expect(transcript?.messages).toHaveLength(2);
      expect(transcript?.userId.toString()).toBe(testUser._id.toString());
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/chat/end-interview')
        .send(validTranscriptData)
        .expect(401);
    });

    it('should validate messages array is required', async () => {
      const response = await request(app)
        .post('/api/chat/end-interview')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ interviewContext: validTranscriptData.interviewContext })
        .expect(400);

      expect(response.body.error).toBe('Messages array is required and cannot be empty');
    });

    it('should validate interview context is required', async () => {
      const response = await request(app)
        .post('/api/chat/end-interview')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ messages: validTranscriptData.messages })
        .expect(400);

      expect(response.body.error).toBe('Interview context is required');
    });

    it('should validate transcript contains user responses', async () => {
      const response = await request(app)
        .post('/api/chat/end-interview')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          messages: [
            { sender: 'ai', text: 'Question 1', timestamp: new Date() },
            { sender: 'ai', text: 'Question 2', timestamp: new Date() }
          ],
          interviewContext: validTranscriptData.interviewContext
        })
        .expect(400);

      expect(response.body.error).toBe('Transcript must contain user responses');
    });

    it('should validate transcript contains AI questions', async () => {
      const response = await request(app)
        .post('/api/chat/end-interview')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          messages: [
            { sender: 'user', text: 'Response 1', timestamp: new Date() },
            { sender: 'user', text: 'Response 2', timestamp: new Date() }
          ],
          interviewContext: validTranscriptData.interviewContext
        })
        .expect(400);

      expect(response.body.error).toBe('Transcript must contain AI questions');
    });
  });

  describe('POST /api/chat/generate-rating', () => {
    let transcriptId: string;

    beforeEach(async () => {
      // Create a test transcript
      const transcript = new InterviewTranscript({
        userId: testUser._id,
        messages: [
          {
            sender: 'ai',
            text: 'Tell me about a time when you demonstrated leadership.',
            timestamp: new Date()
          },
          {
            sender: 'user',
            text: 'I led a robotics team to organize a successful competition.',
            timestamp: new Date()
          }
        ],
        interviewContext: {
          difficulty: 'intermediate',
          userProfile: {
            name: 'Test User',
            grade: 12,
            targetMajor: 'Computer Science'
          },
          interviewType: 'behavioral',
          duration: 30
        }
      });
      await transcript.save();
      transcriptId = transcript._id.toString();
    });

    it('should successfully generate AI rating', async () => {
      const response = await request(app)
        .post('/api/chat/generate-rating')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ transcriptId })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('AI rating generated successfully');
      expect(response.body.rating).toHaveProperty('overallRating');
      expect(response.body.rating).toHaveProperty('strengths');
      expect(response.body.rating).toHaveProperty('weaknesses');
      expect(response.body.rating).toHaveProperty('recommendations');
      expect(response.body.rating).toHaveProperty('detailedScores');
      expect(response.body.metadata.transcriptId).toBe(transcriptId);

      // Verify rating was saved to database
      const transcript = await InterviewTranscript.findById(transcriptId);
      expect(transcript?.status).toBe('rated');
      expect(transcript?.aiRating).toBeTruthy();
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/chat/generate-rating')
        .send({ transcriptId })
        .expect(401);
    });

    it('should validate transcript ID is required', async () => {
      const response = await request(app)
        .post('/api/chat/generate-rating')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.error).toBe('Transcript ID is required');
    });

    it('should validate transcript ID format', async () => {
      const response = await request(app)
        .post('/api/chat/generate-rating')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ transcriptId: 'invalid-id' })
        .expect(400);

      expect(response.body.error).toBe('Invalid transcript ID format');
    });

    it('should return 404 for non-existent transcript', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .post('/api/chat/generate-rating')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ transcriptId: fakeId })
        .expect(404);

      expect(response.body.error).toBe('Transcript not found');
    });

    it('should deny access to other users transcripts', async () => {
      // Create another user
      const otherUser = new User({
        email: 'other@example.com',
        password: 'TestPass123!',
        name: 'Other User'
      });
      await otherUser.save();

      const otherToken = generateToken(otherUser._id.toString());

      const response = await request(app)
        .post('/api/chat/generate-rating')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ transcriptId })
        .expect(403);

      expect(response.body.error).toBe('Access denied: You can only generate ratings for your own transcripts');
    });

    it('should return existing rating if already generated', async () => {
      // First generation
      await request(app)
        .post('/api/chat/generate-rating')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ transcriptId })
        .expect(200);

      // Second request should return existing rating
      const response = await request(app)
        .post('/api/chat/generate-rating')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ transcriptId })
        .expect(200);

      expect(response.body.message).toBe('Rating already exists');
    });
  });

  describe('GET /api/chat/rating/:transcriptId', () => {
    let transcriptId: string;

    beforeEach(async () => {
      // Create a test transcript with rating
      const transcript = new InterviewTranscript({
        userId: testUser._id,
        messages: [
          {
            sender: 'ai',
            text: 'Tell me about a time when you demonstrated leadership.',
            timestamp: new Date()
          },
          {
            sender: 'user',
            text: 'I led a robotics team to organize a successful competition.',
            timestamp: new Date()
          }
        ],
        interviewContext: {
          difficulty: 'intermediate',
          userProfile: {
            name: 'Test User',
            grade: 12,
            targetMajor: 'Computer Science'
          },
          interviewType: 'behavioral',
          duration: 30
        }
      });
      
      // Generate rating
      await transcript.generateRating();
      transcriptId = transcript._id.toString();
    });

    it('should successfully retrieve AI rating', async () => {
      const response = await request(app)
        .get(`/api/chat/rating/${transcriptId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('AI rating retrieved successfully');
      expect(response.body.rating).toHaveProperty('overallRating');
      expect(response.body.rating).toHaveProperty('strengths');
      expect(response.body.rating).toHaveProperty('weaknesses');
      expect(response.body.metadata.transcriptId).toBe(transcriptId);
    });

    it('should require authentication', async () => {
      await request(app)
        .get(`/api/chat/rating/${transcriptId}`)
        .expect(401);
    });

    it('should validate transcript ID format', async () => {
      const response = await request(app)
        .get('/api/chat/rating/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toBe('Invalid transcript ID format');
    });

    it('should return 404 for non-existent transcript', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .get(`/api/chat/rating/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('Transcript not found');
    });

    it('should deny access to other users ratings', async () => {
      // Create another user
      const otherUser = new User({
        email: 'other2@example.com',
        password: 'TestPass123!',
        name: 'Other User 2'
      });
      await otherUser.save();

      const otherToken = generateToken(otherUser._id.toString());

      const response = await request(app)
        .get(`/api/chat/rating/${transcriptId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);

      expect(response.body.error).toBe('Access denied: You can only access your own ratings');
    });

    it('should return 404 for transcript without rating', async () => {
      // Create transcript without rating
      const transcript = new InterviewTranscript({
        userId: testUser._id,
        messages: [
          {
            sender: 'ai',
            text: 'Question',
            timestamp: new Date()
          },
          {
            sender: 'user',
            text: 'Answer',
            timestamp: new Date()
          }
        ],
        interviewContext: {
          difficulty: 'beginner',
          userProfile: { name: 'Test' },
          interviewType: 'general'
        }
      });
      await transcript.save();

      const response = await request(app)
        .get(`/api/chat/rating/${transcript._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('Rating not found');
      expect(response.body.message).toBe('AI rating has not been generated for this transcript yet');
    });
  });

  describe('InterviewTranscript Model Methods', () => {
    it('should auto-expire transcripts after 24 hours', async () => {
      const transcript = new InterviewTranscript({
        userId: testUser._id,
        messages: [
          { sender: 'ai', text: 'Question', timestamp: new Date() },
          { sender: 'user', text: 'Answer', timestamp: new Date() }
        ],
        interviewContext: {
          difficulty: 'beginner',
          userProfile: { name: 'Test' },
          interviewType: 'general'
        }
      });

      await transcript.save();

      // Check expiration date is set correctly (approximately 24 hours from now)
      const expirationTime = transcript.expiresAt.getTime();
      const expectedTime = Date.now() + (24 * 60 * 60 * 1000);
      const timeDifference = Math.abs(expirationTime - expectedTime);
      
      // Allow 1 minute tolerance for test execution time
      expect(timeDifference).toBeLessThan(60 * 1000);
    });

    it('should generate rating using OpenAI service', async () => {
      const transcript = new InterviewTranscript({
        userId: testUser._id,
        messages: [
          { sender: 'ai', text: 'Question', timestamp: new Date() },
          { sender: 'user', text: 'Answer', timestamp: new Date() }
        ],
        interviewContext: {
          difficulty: 'intermediate',
          userProfile: { name: 'Test', targetMajor: 'Computer Science' },
          interviewType: 'behavioral'
        }
      });

      await transcript.save();
      expect(transcript.status).toBe('pending');

      await transcript.generateRating();

      expect(transcript.status).toBe('rated');
      expect(transcript.aiRating).toBeTruthy();
      expect(transcript.aiRating?.overallRating).toBe(8.5);
      expect(transcript.ratingGeneratedAt).toBeTruthy();
    });
  });
}); 