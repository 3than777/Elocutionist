/**
 * AI Interview Coach Backend - Authentication Service
 * 
 * This file implements authentication utilities including JWT token generation,
 * password validation, and user authentication logic. It follows functional
 * programming patterns and provides pure functions for authentication operations.
 * 
 * Key Features:
 * - JWT token generation with configurable expiration
 * - Token verification and validation
 * - Secure payload handling with user identification
 * - Error handling for authentication failures
 * - Configurable token expiration times
 * 
 * Security Considerations:
 * - Uses environment JWT_SECRET for token signing
 * - Implements proper token expiration
 * - Validates token structure and content
 * - Returns typed interfaces for type safety
 * 
 * Related Files:
 * - src/models/User.ts - User model with password hashing
 * - src/middleware/auth.ts - Authentication middleware (future)
 * - src/routes/auth.routes.ts - Authentication routes (future)
 * 
 * Task: #10 - JWT token generation service
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import * as jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';

/**
 * Interface for JWT payload structure
 * Contains user identification and token metadata
 */
export interface IJwtPayload {
  userId: string;
  email: string;
  iat?: number; // Issued at timestamp
  exp?: number; // Expiration timestamp
}

/**
 * Interface for token generation result
 * Provides both the token and its expiration information
 */
export interface ITokenResult {
  token: string;
  expiresIn: StringValue | number;
  expiresAt: Date;
}

/**
 * Interface for token verification result
 * Contains decoded payload and validation status
 */
export interface IVerifyResult {
  isValid: boolean;
  payload?: IJwtPayload;
  error?: string;
}

/**
 * Configuration for token generation
 * Allows customization of expiration times
 */
export interface ITokenConfig {
  expiresIn?: StringValue | number; // Default: '24h'
  audience?: string;
  issuer?: string;
}

/**
 * Generates a JWT token with userId payload
 * 
 * @param {string} userId - The user's unique identifier
 * @param {string} email - The user's email address
 * @param {ITokenConfig} config - Optional configuration for token generation
 * @returns {ITokenResult} The generated token with expiration information
 * @throws {Error} If JWT_SECRET is not configured or token generation fails
 * 
 * @example
 * ```typescript
 * const tokenResult = generateToken('user123', 'user@example.com');
 * console.log(tokenResult.token); // JWT token string
 * console.log(tokenResult.expiresAt); // Expiration date
 * ```
 */
export function generateToken(
  userId: string,
  email: string,
  config: ITokenConfig = {}
): ITokenResult {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }

  if (!userId || !email) {
    throw new Error('User ID and email are required for token generation');
  }

  const expiresIn = config.expiresIn || '24h';
  
  const payload: IJwtPayload = {
    userId,
    email
  };

  const tokenOptions: jwt.SignOptions = {
    expiresIn,
    algorithm: 'HS256'
  };

  // Add optional token options
  if (config.audience) {
    tokenOptions.audience = config.audience;
  }
  
  if (config.issuer) {
    tokenOptions.issuer = config.issuer;
  }

  try {
    const token = jwt.sign(payload, jwtSecret, tokenOptions);
    
    // Calculate expiration date
    const decoded = jwt.decode(token) as IJwtPayload;
    const expiresAt = decoded.exp ? new Date(decoded.exp * 1000) : new Date();

    return {
      token,
      expiresIn,
      expiresAt
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Token generation failed: ${errorMessage}`);
  }
}

/**
 * Verifies and decodes a JWT token
 * 
 * @param {string} token - The JWT token to verify
 * @returns {IVerifyResult} Verification result with payload or error
 * 
 * @example
 * ```typescript
 * const result = verifyToken(authToken);
 * if (result.isValid && result.payload) {
 *   console.log('User ID:', result.payload.userId);
 * } else {
 *   console.error('Token invalid:', result.error);
 * }
 * ```
 */
export function verifyToken(token: string): IVerifyResult {
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    return {
      isValid: false,
      error: 'JWT_SECRET environment variable is not configured'
    };
  }

  if (!token) {
    return {
      isValid: false,
      error: 'Token is required for verification'
    };
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as IJwtPayload;
    
    return {
      isValid: true,
      payload: decoded
    };
  } catch (error) {
    let errorMessage = 'Token verification failed';
    
    if (error instanceof jwt.TokenExpiredError) {
      errorMessage = 'Token has expired';
    } else if (error instanceof jwt.JsonWebTokenError) {
      errorMessage = 'Invalid token format or signature';
    } else if (error instanceof jwt.NotBeforeError) {
      errorMessage = 'Token is not yet valid';
    }
    
    return {
      isValid: false,
      error: errorMessage
    };
  }
}

/**
 * Extracts token from Authorization header
 * Supports both "Bearer token" and "token" formats
 * 
 * @param {string | undefined} authHeader - The Authorization header value
 * @returns {string | null} The extracted token or null if not found
 * 
 * @example
 * ```typescript
 * const token = extractTokenFromHeader(req.headers.authorization);
 * if (token) {
 *   const result = verifyToken(token);
 * }
 * ```
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  // Handle "Bearer token" format
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Handle direct token format
  return authHeader;
}

/**
 * Generates a refresh token with longer expiration
 * Used for implementing refresh token strategy
 * 
 * @param {string} userId - The user's unique identifier
 * @param {string} email - The user's email address
 * @returns {ITokenResult} The generated refresh token
 * 
 * @example
 * ```typescript
 * const refreshToken = generateRefreshToken('user123', 'user@example.com');
 * // Store refresh token securely for future access token generation
 * ```
 */
export function generateRefreshToken(userId: string, email: string): ITokenResult {
  return generateToken(userId, email, { 
    expiresIn: '7d' // Refresh tokens last 7 days
  });
}

/**
 * Checks if a token is expired without verifying signature
 * Useful for client-side token expiration checks
 * 
 * @param {string} token - The JWT token to check
 * @returns {boolean} True if token is expired, false otherwise
 * 
 * @example
 * ```typescript
 * if (isTokenExpired(storedToken)) {
 *   // Request new token using refresh token
 * }
 * ```
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as IJwtPayload;
    
    if (!decoded || !decoded.exp) {
      return true; // Consider invalid tokens as expired
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true; // Consider malformed tokens as expired
  }
}

/**
 * Default export object containing all authentication utilities
 * Follows the functional programming pattern while providing a centralized export
 */
export default {
  generateToken,
  verifyToken,
  extractTokenFromHeader,
  generateRefreshToken,
  isTokenExpired
}; 