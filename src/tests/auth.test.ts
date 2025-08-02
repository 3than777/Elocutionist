/**
 * AI Interview Coach Backend - Authentication Routes Tests
 * 
 * This file implements comprehensive tests for the authentication endpoints including
 * user registration and login functionality. It follows Jest testing best practices
 * with proper setup, teardown, and isolated test scenarios.
 * 
 * Key Test Scenarios:
 * - User registration with valid data
 * - Duplicate email registration error handling
 * - User login with valid credentials
 * - Authentication validation and error handling
 * - JWT token generation and response structure
 * 
 * Test Structure:
 * - beforeAll: Set up test environment and database
 * - beforeEach: Clean database state between tests
 * - afterAll: Clean up test environment
 * - Individual test cases with descriptive names
 * 
 * Related Files:
 * - src/routes/auth.routes.ts - Authentication route handlers
 * - src/services/auth.service.ts - JWT token service
 * - src/models/User.ts - User model with password hashing
 * - src/config/database.ts - Database connection utilities
 * 
 * Task: #30 - Basic auth tests for register and login endpoints
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import request from 'supertest';
import express from 'express';
import { connectDB, disconnectDB } from '../config/database';
import authRoutes from '../routes/auth.routes';
import User from '../models/User';

/**
 * Test application setup with authentication routes
 */
const app = express();

// Configure middleware for testing
app.use(express.json());
app.use('/api/auth', authRoutes);

/**
 * Test user data for consistent testing
 */
const testUser = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  name: 'Test User',
  grade: 12,
  targetMajor: 'Computer Science'
};

const testUser2 = {
  email: 'test2@example.com',
  password: 'AnotherPassword456!',
  name: 'Test User Two',
  grade: 11,
  targetMajor: 'Engineering'
};

/**
 * Authentication Tests Suite
 */
describe('Authentication Routes', () => {
  
  /**
   * Set up test environment before all tests
   */
  beforeAll(async () => {
    // Set test environment variables if not already set
    if (!process.env.JWT_SECRET) {
      process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
    }
    
    if (!process.env.MONGODB_URI) {
      process.env.MONGODB_URI = 'mongodb://localhost:27017/ai-interview-coach-test';
    }

    // Connect to test database
    await connectDB();
  });

  /**
   * Clean up database state before each test
   */
  beforeEach(async () => {
    // Clear all users to ensure test isolation
    await User.deleteMany({});
  });

  /**
   * Clean up test environment after all tests
   */
  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({});
    
    // Disconnect from database
    await disconnectDB();
  });

  /**
   * User Registration Tests
   */
  describe('POST /api/auth/register', () => {
    
    /**
     * Test successful user registration
     */
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      // Verify response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('expiresAt');
      expect(response.body).toHaveProperty('user');

      // Verify user data in response
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).toHaveProperty('name', testUser.name);
      expect(response.body.user).toHaveProperty('grade', testUser.grade);
      expect(response.body.user).toHaveProperty('targetMajor', testUser.targetMajor);
      expect(response.body.user).toHaveProperty('isEmailVerified', false);
      expect(response.body.user).toHaveProperty('createdAt');

      // Verify password is not included in response
      expect(response.body.user).not.toHaveProperty('password');

      // Verify JWT token is a valid string
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.length).toBeGreaterThan(0);

      // Verify user was created in database
      const createdUser = await User.findOne({ email: testUser.email });
      expect(createdUser).toBeTruthy();
      expect(createdUser?.name).toBe(testUser.name);
      expect(createdUser?.email).toBe(testUser.email);
    });

    /**
     * Test duplicate email registration error
     */
    it('should return error for duplicate email registration', async () => {
      // First registration - should succeed
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      // Second registration with same email - should fail
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(409);

      // Verify error response structure
      expect(response.body).toHaveProperty('error', 'Conflict');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('already exists');

      // Verify no duplicate user was created
      const userCount = await User.countDocuments({ email: testUser.email });
      expect(userCount).toBe(1);
    });

    /**
     * Test registration with missing required fields
     */
    it('should return error for missing required fields', async () => {
      const incompleteUser = {
        email: 'incomplete@example.com'
        // Missing password and name
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteUser)
        .expect(400);

      // Verify error response
      expect(response.body).toHaveProperty('error', 'Bad Request');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('required fields');

      // Verify no user was created
      const userCount = await User.countDocuments({ email: incompleteUser.email });
      expect(userCount).toBe(0);
    });

    /**
     * Test registration with invalid email format
     */
    it('should return error for invalid email format', async () => {
      const invalidEmailUser = {
        ...testUser,
        email: 'invalid-email-format'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidEmailUser)
        .expect(400);

      // Verify error response
      expect(response.body).toHaveProperty('error', 'Bad Request');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid email format');

      // Verify no user was created
      const userCount = await User.countDocuments({});
      expect(userCount).toBe(0);
    });

    /**
     * Test registration with weak password
     */
    it('should return error for weak password', async () => {
      const weakPasswordUser = {
        ...testUser,
        password: 'weak'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(weakPasswordUser)
        .expect(400);

      // Verify error response
      expect(response.body).toHaveProperty('error', 'Bad Request');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('security requirements');
      expect(response.body).toHaveProperty('details');
      expect(Array.isArray(response.body.details)).toBe(true);

      // Verify no user was created
      const userCount = await User.countDocuments({});
      expect(userCount).toBe(0);
    });
  });

  /**
   * User Login Tests
   */
  describe('POST /api/auth/login', () => {
    
    /**
     * Set up test user before login tests
     */
    beforeEach(async () => {
      // Create a test user for login tests
      await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);
    });

    /**
     * Test successful login with valid credentials
     */
    it('should login user with valid credentials', async () => {
      const loginCredentials = {
        email: testUser.email,
        password: testUser.password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginCredentials)
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('expiresAt');
      expect(response.body).toHaveProperty('user');

      // Verify user data in response
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).toHaveProperty('name', testUser.name);
      expect(response.body.user).toHaveProperty('lastLogin');
      expect(response.body.user).toHaveProperty('loginCount');

      // Verify password is not included in response
      expect(response.body.user).not.toHaveProperty('password');

      // Verify JWT token is a valid string
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.length).toBeGreaterThan(0);

      // Verify login count was incremented
      expect(response.body.user.loginCount).toBeGreaterThan(0);
    });

    /**
     * Test login with invalid email
     */
    it('should return error for invalid email', async () => {
      const invalidCredentials = {
        email: 'nonexistent@example.com',
        password: testUser.password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidCredentials)
        .expect(401);

      // Verify error response
      expect(response.body).toHaveProperty('error', 'Unauthorized');
      expect(response.body).toHaveProperty('message', 'Invalid email or password');

      // Verify no token is returned
      expect(response.body).not.toHaveProperty('token');
    });

    /**
     * Test login with invalid password
     */
    it('should return error for invalid password', async () => {
      const invalidCredentials = {
        email: testUser.email,
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidCredentials)
        .expect(401);

      // Verify error response
      expect(response.body).toHaveProperty('error', 'Unauthorized');
      expect(response.body).toHaveProperty('message', 'Invalid email or password');

      // Verify no token is returned
      expect(response.body).not.toHaveProperty('token');
    });

    /**
     * Test login with missing credentials
     */
    it('should return error for missing credentials', async () => {
      const incompleteCredentials = {
        email: testUser.email
        // Missing password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(incompleteCredentials)
        .expect(400);

      // Verify error response
      expect(response.body).toHaveProperty('error', 'Bad Request');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('required fields');

      // Verify no token is returned
      expect(response.body).not.toHaveProperty('token');
    });

    /**
     * Test login with malformed email
     */
    it('should return error for malformed email', async () => {
      const malformedCredentials = {
        email: 'not-an-email',
        password: testUser.password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(malformedCredentials)
        .expect(400);

      // Verify error response
      expect(response.body).toHaveProperty('error', 'Bad Request');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Invalid email format');

      // Verify no token is returned
      expect(response.body).not.toHaveProperty('token');
    });
  });

  /**
   * Integration Tests
   */
  describe('Authentication Integration', () => {
    
    /**
     * Test complete registration and login flow
     */
    it('should allow registration followed by immediate login', async () => {
      // Step 1: Register a new user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(testUser2)
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.token).toBeTruthy();

      // Step 2: Login with the same credentials
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser2.email,
          password: testUser2.password
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.token).toBeTruthy();

      // Both tokens should be valid strings but may be different
      expect(typeof registerResponse.body.token).toBe('string');
      expect(typeof loginResponse.body.token).toBe('string');

      // User data should be consistent
      expect(registerResponse.body.user.email).toBe(loginResponse.body.user.email);
      expect(registerResponse.body.user.name).toBe(loginResponse.body.user.name);
      
      // Login count should be incremented after login
      expect(loginResponse.body.user.loginCount).toBeGreaterThan(0);
    });
  });
}); 