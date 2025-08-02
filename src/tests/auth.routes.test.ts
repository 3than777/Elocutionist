/**
 * AI Interview Coach Backend - Authentication Routes Tests
 * 
 * This file contains comprehensive tests for the authentication routes implementation.
 * Tests cover user registration, login, validation, and error handling scenarios.
 * 
 * Test Coverage:
 * - POST /api/auth/register - User registration with various scenarios
 * - POST /api/auth/login - User authentication with various scenarios
 * - Input validation for all fields
 * - Error handling and response formatting
 * 
 * Related Files:
 * - src/routes/auth.routes.ts - Routes being tested
 * - src/models/User.ts - User model
 * - src/services/auth.service.ts - Auth service
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import request from 'supertest';
import app from '../index';
import { connectDB, disconnectDB } from '../config/database';
import User from '../models/User';
import { generateToken } from '../services/auth.service';
import bcrypt from 'bcryptjs';

// Mock the User model for test mode
jest.mock('../models/User', () => {
  const bcrypt = require('bcryptjs');
  
  const mockUsers: any[] = [];
  
  function UserMock(data: any) {
    const instance = {
      _id: new (require('mongoose').Types.ObjectId)(),
      email: data.email,
      password: data.password,
      name: data.name,
      grade: data.grade,
      targetMajor: data.targetMajor,
      isEmailVerified: data.isEmailVerified || false,
      isActive: data.isActive !== undefined ? data.isActive : true,
      resetPasswordToken: data.resetPasswordToken,
      resetPasswordExpires: data.resetPasswordExpires,
      emailVerificationToken: data.emailVerificationToken,
      lastLogin: data.lastLogin || null,
      loginCount: data.loginCount || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: jest.fn(),
      comparePassword: jest.fn(),
      toSafeObject: jest.fn()
    };

    // Setup save method to add to mock collection
    instance.save.mockImplementation(async function(this: any) {
      // Hash password if not already hashed
      if (this.password && !this.password.startsWith('$2')) {
        this.password = await bcrypt.hash(this.password, 12);
      }
      mockUsers.push(this);
      return this;
    });

    // Setup comparePassword method
    instance.comparePassword.mockImplementation(async function(this: any, candidatePassword: string) {
      return await bcrypt.compare(candidatePassword, this.password);
    });

    // Setup toSafeObject method
    instance.toSafeObject.mockImplementation(function(this: any) {
      return {
        id: this._id.toString(),
        email: this.email,
        name: this.name,
        grade: this.grade,
        targetMajor: this.targetMajor,
        isEmailVerified: this.isEmailVerified,
        isActive: this.isActive,
        lastLogin: this.lastLogin,
        loginCount: this.loginCount,
        createdAt: this.createdAt.toISOString(),
        updatedAt: this.updatedAt.toISOString()
      };
    });

    return instance;
  }

  // Create a query builder mock for chaining select()
  function createQueryBuilder(user: any) {
    return {
      select: jest.fn().mockImplementation((fields: string) => {
        if (fields === '+password') {
          // Include password field - user should already have it
          return Promise.resolve(user);
        }
        return Promise.resolve(user);
      })
    };
  }

  // Static methods
  UserMock.findOne = jest.fn().mockImplementation((query: any) => {
    const user = mockUsers.find(u => {
      if (query.email && query.isActive !== undefined) {
        return u.email === query.email && u.isActive === query.isActive;
      }
      if (query.email) return u.email === query.email;
      if (query._id) return u._id.toString() === query._id.toString();
      return false;
    });
    
    if (user) {
      // Setup methods for found user
      user.comparePassword = jest.fn().mockImplementation(async (candidatePassword: string) => {
        return await bcrypt.compare(candidatePassword, user.password);
      });
      user.save = jest.fn().mockImplementation(async function(this: any) {
        this.lastLogin = new Date();
        this.loginCount += 1;
        return this;
      });
      user.toSafeObject = jest.fn().mockImplementation(() => ({
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        grade: user.grade,
        targetMajor: user.targetMajor,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        loginCount: user.loginCount,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      }));
      
      // Return query builder that can chain select()
      return createQueryBuilder(user);
    }
    
    // Return query builder that resolves to null
    return createQueryBuilder(null);
  });

  UserMock.findByEmail = jest.fn().mockImplementation((email: string) => {
    const user = mockUsers.find(u => u.email === email);
    return Promise.resolve(user || null);
  });

  UserMock.deleteMany = jest.fn().mockImplementation(() => {
    mockUsers.length = 0;
    return Promise.resolve({});
  });

  return UserMock;
});

describe('Auth Routes', () => {
  // Setup before all tests
  beforeAll(async () => {
    // Connect to test database (will use mock mode)
    const dbResult = await connectDB();
    console.log('Database connection result:', dbResult.message);
  });

  // Cleanup after all tests
  afterAll(async () => {
    try {
      await disconnectDB();
    } catch (error) {
      console.log('Cleanup completed with mock mode');
    }
  });

  // Setup before each test
  beforeEach(async () => {
    // Clean up any existing test data
    try {
      await User.deleteMany({});
    } catch (error) {
      // Ignore cleanup errors in mock mode
    }
  });

  describe('POST /api/auth/register', () => {
    describe('Success Cases', () => {
      test('should register user with valid data', async () => {
        const userData = {
          email: 'test@example.com',
          password: 'TestPassword123!',
          name: 'Test User',
          grade: 12,
          targetMajor: 'Computer Science'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(201);

        expect(response.body).toMatchObject({
          success: true,
          message: 'User registered successfully. Welcome to AI Interview Coach!',
          token: expect.any(String),
          expiresAt: expect.any(String),
          user: {
            id: expect.any(String),
            email: 'test@example.com',
            name: 'Test User',
            grade: 12,
            targetMajor: 'Computer Science'
          }
        });

        // Verify password is not included in response
        expect(response.body.user.password).toBeUndefined();
      });

      test('should register user with minimal required data', async () => {
        const userData = {
          email: 'minimal@example.com',
          password: 'TestPassword123!',
          name: 'Minimal User'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(201);

        expect(response.body.user).toMatchObject({
          email: 'minimal@example.com',
          name: 'Minimal User'
        });

        expect(response.body.user.grade).toBeUndefined();
        expect(response.body.user.targetMajor).toBeUndefined();
      });
    });

    describe('Validation Tests', () => {
      test('should require email', async () => {
        const userData = {
          password: 'TestPassword123!',
          name: 'Test User'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toContain('email');
      });

      test('should require password', async () => {
        const userData = {
          email: 'test@example.com',
          name: 'Test User'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toContain('password');
      });

      test('should require name', async () => {
        const userData = {
          email: 'test@example.com',
          password: 'TestPassword123!'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toContain('name');
      });

      test('should validate email format', async () => {
        const userData = {
          email: 'invalid-email',
          password: 'TestPassword123!',
          name: 'Test User'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toContain('email format');
      });

      test('should validate password strength', async () => {
        const userData = {
          email: 'test@example.com',
          password: 'weak',
          name: 'Test User'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toContain('Password');
      });

      test('should validate grade range', async () => {
        const userData = {
          email: 'test@example.com',
          password: 'TestPassword123!',
          name: 'Test User',
          grade: 15
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(400);

        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toContain('Grade');
      });

      test('should prevent duplicate email registration', async () => {
        // First registration
        const userData = {
          email: 'duplicate@example.com',
          password: 'TestPassword123!',
          name: 'First User'
        };

        await request(app)
          .post('/api/auth/register')
          .send(userData)
          .expect(201);

        // Second registration with same email
        const duplicateUserData = {
          email: 'duplicate@example.com',
          password: 'DifferentPassword123!',
          name: 'Second User'
        };

        const response = await request(app)
          .post('/api/auth/register')
          .send(duplicateUserData)
          .expect(409);

        expect(response.body.error).toBe('Conflict');
      });
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      const userData = {
        email: 'login@example.com',
        password: 'TestPassword123!',
        name: 'Login User',
        grade: 11,
        targetMajor: 'Engineering'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);
    });

    describe('Success Cases', () => {
      test('should login with valid credentials', async () => {
        const loginData = {
          email: 'login@example.com',
          password: 'TestPassword123!'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(200);

        expect(response.body).toMatchObject({
          success: true,
          message: 'Login successful. Welcome back!',
          token: expect.any(String),
          expiresAt: expect.any(String),
          user: {
            id: expect.any(String),
            email: 'login@example.com',
            name: 'Login User',
            grade: 11,
            targetMajor: 'Engineering'
          }
        });

        // Verify password is not included in response
        expect(response.body.user.password).toBeUndefined();
      });
    });

    describe('Validation Tests', () => {
      test('should require email', async () => {
        const loginData = {
          password: 'TestPassword123!'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(400);

        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toContain('email');
      });

      test('should require password', async () => {
        const loginData = {
          email: 'login@example.com'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(400);

        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toContain('password');
      });

      test('should validate email format', async () => {
        const loginData = {
          email: 'invalid-email',
          password: 'TestPassword123!'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(400);

        expect(response.body.error).toBe('Bad Request');
        expect(response.body.message).toContain('email');
      });

      test('should reject non-existent email', async () => {
        const loginData = {
          email: 'nonexistent@example.com',
          password: 'TestPassword123!'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(401);

        expect(response.body.error).toBe('Unauthorized');
        expect(response.body.message).toContain('email or password');
      });

      test('should reject incorrect password', async () => {
        const loginData = {
          email: 'login@example.com',
          password: 'WrongPassword123!'
        };

        const response = await request(app)
          .post('/api/auth/login')
          .send(loginData)
          .expect(401);

        expect(response.body.error).toBe('Unauthorized');
        expect(response.body.message).toContain('email or password');
      });
    });
  });
}); 