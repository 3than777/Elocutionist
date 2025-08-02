/**
 * AI Interview Coach Backend - Authentication Routes
 * 
 * This file implements authentication endpoints including user registration and login.
 * It provides secure user account management with proper validation, error handling,
 * and JWT token generation for accessing protected resources.
 * 
 * Key Features:
 * - User registration with email validation and password hashing
 * - Input validation to prevent malformed requests
 * - Comprehensive error handling with appropriate HTTP status codes
 * - JWT token generation for authenticated sessions
 * - Security measures against common attacks
 * 
 * API Endpoints:
 * - POST /api/auth/register - Create new user account
 * - POST /api/auth/login - Authenticate existing user
 * 
 * Security Features:
 * - Email format validation and uniqueness checking
 * - Password strength requirements
 * - Automatic password hashing via User model
 * - Rate limiting ready (can be integrated)
 * - Input sanitization and validation
 * - Secure error messages without internal details
 * 
 * Request/Response Flow:
 * 1. Validate request body structure and required fields
 * 2. Validate email format and check for existing users
 * 3. Validate password strength requirements
 * 4. Create user with auto-hashed password
 * 5. Generate JWT token for immediate authentication
 * 6. Return success response with token and user data
 * 
 * Related Files:
 * - src/services/auth.service.ts - JWT token generation
 * - src/models/User.ts - User model with password hashing
 * - src/middleware/auth.ts - Authentication middleware
 * 
 * Task: #12 - User registration routes implementation
 * Task: #13 - User login endpoint implementation
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import { Router, Request, Response } from 'express';
import { generateToken } from '../services/auth.service';
import User, { IUser } from '../models/User';
import { Types } from 'mongoose';

/**
 * Interface for user registration request body
 * Defines the expected structure for registration data
 */
interface IRegisterRequest {
  email: string;
  password: string;
  name: string;
  grade?: number;
  targetMajor?: string;
}

/**
 * Interface for successful registration response
 * Provides consistent response structure
 */
interface IRegisterResponse {
  success: boolean;
  message: string;
  token: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    grade?: number;
    targetMajor?: string;
    isEmailVerified: boolean;
    createdAt: string;
  };
}

/**
 * Interface for error response structure
 * Ensures consistent error format across endpoints
 */
interface IErrorResponse {
  error: string;
  message: string;
  details?: string[];
}

/**
 * Interface for user login request body
 * Defines the expected structure for login credentials
 */
interface ILoginRequest {
  email: string;
  password: string;
}

/**
 * Interface for successful login response
 * Provides consistent response structure matching registration
 */
interface ILoginResponse {
  success: boolean;
  message: string;
  token: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    grade?: number;
    targetMajor?: string;
    isEmailVerified: boolean;
    lastLogin: string;
    loginCount: number;
  };
}

/**
 * Create Express router for authentication routes
 */
const router = Router();

/**
 * Validates email format using comprehensive regex pattern
 * 
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email format is valid
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254; // RFC 5321 limit
}

/**
 * Validates password strength requirements
 * 
 * @param {string} password - Password to validate
 * @returns {{ isValid: boolean; errors: string[] }} Validation result with specific errors
 */
function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return { isValid: errors.length === 0, errors };
}

/**
 * Validates name format and requirements
 * 
 * @param {string} name - Name to validate
 * @returns {{ isValid: boolean; errors: string[] }} Validation result
 */
function validateName(name: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!name || name.trim().length === 0) {
    errors.push('Name is required');
    return { isValid: false, errors };
  }
  
  const trimmedName = name.trim();
  
  if (trimmedName.length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  
  if (trimmedName.length > 100) {
    errors.push('Name must be less than 100 characters long');
  }
  
  if (!/^[a-zA-Z\s\-'\.]+$/.test(trimmedName)) {
    errors.push('Name can only contain letters, spaces, hyphens, apostrophes, and periods');
  }
  
  return { isValid: errors.length === 0, errors };
}

/**
 * POST /api/auth/register
 * 
 * Creates a new user account with email, password, and name.
 * Validates input data, checks for existing users, creates user with hashed password,
 * and returns JWT token for immediate authentication.
 * 
 * @route POST /api/auth/register
 * @param {Request} req - Express request object with user registration data
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with token and user data or error
 * 
 * @example
 * ```typescript
 * // Request body
 * {
 *   "email": "user@example.com",
 *   "password": "SecurePass123!",
 *   "name": "John Doe",
 *   "grade": 12,
 *   "targetMajor": "Computer Science"
 * }
 * 
 * // Success response
 * {
 *   "success": true,
 *   "message": "User registered successfully",
 *   "token": "eyJhbGciOiJIUzI1NiIs...",
 *   "expiresAt": "2024-01-20T10:00:00.000Z",
 *   "user": {
 *     "id": "user_id_here",
 *     "email": "user@example.com",
 *     "name": "John Doe",
 *     "grade": 12,
 *     "targetMajor": "Computer Science",
 *     "isEmailVerified": false,
 *     "createdAt": "2024-01-19T10:00:00.000Z"
 *   }
 * }
 * ```
 */
async function registerUser(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body exists first
    if (!req.body) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Request body is required'
      } as IErrorResponse);
      return;
    }

    // Extract and validate request body
    const { email, password, name, grade, targetMajor }: IRegisterRequest = req.body;

    // Validate required fields with explicit type checking
    if (!email) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Email is required'
      } as IErrorResponse);
      return;
    }

    if (!password) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Password is required'
      } as IErrorResponse);
      return;
    }

    if (!name) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Name is required'
      } as IErrorResponse);
      return;
    }

    // Validate field types
    if (typeof email !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Email must be a string'
      } as IErrorResponse);
      return;
    }

    if (typeof password !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be a string'
      } as IErrorResponse);
      return;
    }

    if (typeof name !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Name must be a string'
      } as IErrorResponse);
      return;
    }

    // Validate field lengths and content
    if (email.trim().length === 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Email cannot be empty'
      } as IErrorResponse);
      return;
    }

    if (email.trim().length > 254) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Email must be 254 characters or less'
      } as IErrorResponse);
      return;
    }

    if (password.length === 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Password cannot be empty'
      } as IErrorResponse);
      return;
    }

    if (name.trim().length === 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Name cannot be empty'
      } as IErrorResponse);
      return;
    }

    // Validate email format
    if (!isValidEmail(email)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid email format. Please provide a valid email address.'
      } as IErrorResponse);
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Password does not meet security requirements',
        details: passwordValidation.errors
      } as IErrorResponse);
      return;
    }

    // Validate name format
    const nameValidation = validateName(name);
    if (!nameValidation.isValid) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid name format',
        details: nameValidation.errors
      } as IErrorResponse);
      return;
    }

    // Validate optional grade field with type checking
    if (grade !== undefined && grade !== null) {
      if (typeof grade !== 'number') {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Grade must be a number'
        } as IErrorResponse);
        return;
      }

      if (!Number.isInteger(grade)) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Grade must be a whole number'
        } as IErrorResponse);
        return;
      }

      if (grade < 1 || grade > 12) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Grade must be between 1 and 12'
        } as IErrorResponse);
        return;
      }
    }

    // Validate optional targetMajor field
    if (targetMajor !== undefined && targetMajor !== null) {
      if (typeof targetMajor !== 'string') {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Target major must be a string'
        } as IErrorResponse);
        return;
      }

      if (targetMajor.trim().length === 0) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Target major cannot be empty if provided'
        } as IErrorResponse);
        return;
      }

      if (targetMajor.trim().length > 100) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Target major must be 100 characters or less'
        } as IErrorResponse);
        return;
      }
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      res.status(409).json({
        error: 'Conflict',
        message: 'An account with this email address already exists. Please use a different email or try logging in.'
      } as IErrorResponse);
      return;
    }

    // Create new user (password will be hashed automatically by pre-save hook)
    const userData = {
      email: email.toLowerCase().trim(),
      password,
      name: name.trim(),
      ...(grade && { grade }),
      ...(targetMajor && { targetMajor: targetMajor.trim() }),
      isActive: true,
      isEmailVerified: false,
      loginCount: 0
    };

    const newUser = new User(userData);
    const savedUser = await newUser.save();
    
    // Type assertion for _id to resolve TypeScript strict mode
    const userId = (savedUser._id as Types.ObjectId).toString();

    // Generate JWT token for immediate authentication
    const tokenResult = generateToken(userId, savedUser.email);

    // Prepare user data for response (exclude sensitive information)
    const userResponse = {
      id: userId,
      email: savedUser.email,
      name: savedUser.name,
      ...(savedUser.grade && { grade: savedUser.grade }),
      ...(savedUser.targetMajor && { targetMajor: savedUser.targetMajor }),
      isEmailVerified: savedUser.isEmailVerified,
      createdAt: savedUser.createdAt.toISOString()
    };

    // Return success response with token and user data
    res.status(201).json({
      success: true,
      message: 'User registered successfully. Welcome to AI Interview Coach!',
      token: tokenResult.token,
      expiresAt: tokenResult.expiresAt.toISOString(),
      user: userResponse
    } as IRegisterResponse);

  } catch (error) {
    // Log error for debugging (in production, use proper logging service)
    console.error('User registration error:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });

    // Return generic error to client (don't expose internal details)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Registration service temporarily unavailable. Please try again later.'
    } as IErrorResponse);
  }
}

/**
 * Register the POST /api/auth/register route
 */
router.post('/register', registerUser);

/**
 * POST /api/auth/login
 * 
 * Authenticates an existing user with email and password.
 * Validates credentials, compares password with bcrypt, updates login tracking,
 * and returns JWT token for authenticated session.
 * 
 * @route POST /api/auth/login
 * @param {Request} req - Express request object with user login credentials
 * @param {Response} res - Express response object
 * @returns {Promise<void>} JSON response with token and user data or error
 * 
 * @example
 * ```typescript
 * // Request body
 * {
 *   "email": "user@example.com",
 *   "password": "SecurePass123!"
 * }
 * 
 * // Success response
 * {
 *   "success": true,
 *   "message": "Login successful",
 *   "token": "eyJhbGciOiJIUzI1NiIs...",
 *   "expiresAt": "2024-01-20T10:00:00.000Z",
 *   "user": {
 *     "id": "user_id_here",
 *     "email": "user@example.com",
 *     "name": "John Doe",
 *     "grade": 12,
 *     "targetMajor": "Computer Science",
 *     "isEmailVerified": false,
 *     "lastLogin": "2024-01-19T10:00:00.000Z",
 *     "loginCount": 5
 *   }
 * }
 * 
 * // Error response
 * {
 *   "error": "Unauthorized",
 *   "message": "Invalid email or password"
 * }
 * ```
 */
async function loginUser(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body exists first
    if (!req.body) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Request body is required'
      } as IErrorResponse);
      return;
    }

    // Extract and validate request body
    const { email, password }: ILoginRequest = req.body;

    // Validate required fields
    if (!email) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Email is required'
      } as IErrorResponse);
      return;
    }

    if (!password) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Password is required'
      } as IErrorResponse);
      return;
    }

    // Validate field types
    if (typeof email !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Email must be a string'
      } as IErrorResponse);
      return;
    }

    if (typeof password !== 'string') {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be a string'
      } as IErrorResponse);
      return;
    }

    // Validate field lengths and content
    if (email.trim().length === 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Email cannot be empty'
      } as IErrorResponse);
      return;
    }

    if (email.trim().length > 254) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Email must be 254 characters or less'
      } as IErrorResponse);
      return;
    }

    if (password.length === 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Password cannot be empty'
      } as IErrorResponse);
      return;
    }

    if (password.length > 128) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Password must be 128 characters or less'
      } as IErrorResponse);
      return;
    }

    // Validate email format
    if (!isValidEmail(email)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid email format. Please provide a valid email address.'
      } as IErrorResponse);
      return;
    }

    // Find user by email and include password field for comparison
    // Note: Password is excluded by default, so we must explicitly select it
    const user = await User.findOne({ 
      email: email.toLowerCase().trim(),
      isActive: true 
    }).select('+password');

    // Check if user exists and is active
    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      } as IErrorResponse);
      return;
    }

    // Compare password using the model's comparePassword method
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      } as IErrorResponse);
      return;
    }

    // Update login tracking
    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    const updatedUser = await user.save();

    // Type assertion for _id to resolve TypeScript strict mode
    const userId = (updatedUser._id as Types.ObjectId).toString();

    // Generate JWT token for authenticated session
    const tokenResult = generateToken(userId, updatedUser.email);

    // Prepare user data for response (exclude sensitive information)
    const userResponse = {
      id: userId,
      email: updatedUser.email,
      name: updatedUser.name,
      ...(updatedUser.grade && { grade: updatedUser.grade }),
      ...(updatedUser.targetMajor && { targetMajor: updatedUser.targetMajor }),
      isEmailVerified: updatedUser.isEmailVerified,
      lastLogin: updatedUser.lastLogin?.toISOString() || new Date().toISOString(),
      loginCount: updatedUser.loginCount
    };

    // Return success response with token and user data
    res.status(200).json({
      success: true,
      message: 'Login successful. Welcome back!',
      token: tokenResult.token,
      expiresAt: tokenResult.expiresAt.toISOString(),
      user: userResponse
    } as ILoginResponse);

  } catch (error) {
    // Log error for debugging (in production, use proper logging service)
    console.error('User login error:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      email: req.body?.email // Log email for debugging (sanitize in production)
    });

    // Return generic error to client (don't expose internal details)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication service temporarily unavailable. Please try again later.'
    } as IErrorResponse);
  }
}

/**
 * Register the POST /api/auth/login route
 */
router.post('/login', loginUser);

/**
 * Default export for the authentication router
 * Contains all authentication-related routes
 */
export default router; 