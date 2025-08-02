/**
 * AI Interview Coach Backend - Authentication Middleware
 * 
 * This file implements JWT-based authentication middleware that validates tokens,
 * finds users, and attaches user context to Express request objects. It provides
 * secure access control for protected routes and API endpoints.
 * 
 * Key Features:
 * - JWT token extraction from Authorization headers
 * - Token verification using the authentication service
 * - User lookup and validation from database
 * - Request context enrichment with user data
 * - Comprehensive error handling with appropriate HTTP status codes
 * 
 * Security Features:
 * - Validates JWT signature and expiration
 * - Checks user existence and active status
 * - Prevents access with invalid or expired tokens
 * - Secure error messages without internal details
 * - Rate limiting ready (can be integrated)
 * 
 * Middleware Flow:
 * 1. Extract token from Authorization header (Bearer format)
 * 2. Verify token signature and decode payload
 * 3. Find user in database using token's userId
 * 4. Validate user exists and is active
 * 5. Attach user object to request for downstream use
 * 6. Continue to next middleware/route handler
 * 
 * Error Scenarios:
 * - Missing Authorization header → 401 Unauthorized
 * - Invalid token format → 401 Unauthorized  
 * - Expired or malformed token → 401 Unauthorized
 * - User not found or inactive → 401 Unauthorized
 * - Database errors → 500 Internal Server Error
 * 
 * Related Files:
 * - src/services/auth.service.ts - JWT token operations
 * - src/models/User.ts - User model and database operations
 * - src/routes/ - Protected route implementations
 * 
 * Task: #11 - Authentication middleware implementation
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../services/auth.service';
import User, { IUser } from '../models/User';
import mongoose from 'mongoose';

/**
 * Extended Express Request interface to include authenticated user
 * This allows TypeScript to recognize the user property on req object
 */
export interface AuthenticatedRequest extends Request {
  user?: IUser & { _id: mongoose.Types.ObjectId };
}

/**
 * Authentication middleware that validates JWT tokens and attaches user to request
 * 
 * This middleware extracts JWT tokens from the Authorization header, verifies them,
 * finds the corresponding user in the database, and attaches the user object to
 * the request for use by downstream middleware and route handlers.
 * 
 * @param {AuthenticatedRequest} req - Express request object (extended with user property)
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function to continue middleware chain
 * @returns {Promise<void>} Continues to next middleware or returns error response
 * 
 * @example
 * ```typescript
 * // Protect a route with authentication
 * router.get('/protected', authenticateToken, (req: AuthenticatedRequest, res) => {
 *   console.log('Authenticated user:', req.user?.email);
 *   res.json({ message: 'Access granted', userId: req.user?._id });
 * });
 * ```
 */
export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required. Please provide a valid Authorization header.'
      });
      return;
    }

    // Verify token using auth service
    const verificationResult = verifyToken(token);

    if (!verificationResult.isValid || !verificationResult.payload) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired access token. Please log in again.'
      });
      return;
    }

    // Find user in database using userId from token payload
    const user = await User.findById(verificationResult.payload.userId).select('-password');

    if (!user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User not found. Please log in again.'
      });
      return;
    }

    // Check if user account is active
    if (!user.isActive) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'User account is inactive. Please contact support.'
      });
      return;
    }

    // Attach user to request object for downstream use
    // Ensure _id is accessible by using the Mongoose document's _id property
    (req as any).user = user;

    // Continue to next middleware/route handler
    next();

  } catch (error) {
    // Log error for debugging (in production, use proper logging service)
    console.error('Authentication middleware error:', {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    });

    // Return generic error to client (don't expose internal details)
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication service temporarily unavailable. Please try again.'
    });
  }
}

/**
 * Optional authentication middleware that doesn't require a token
 * 
 * This middleware attempts to authenticate the user if a token is provided,
 * but doesn't fail if no token is present. Useful for routes that have
 * different behavior for authenticated vs anonymous users.
 * 
 * @param {AuthenticatedRequest} req - Express request object
 * @param {Response} res - Express response object  
 * @param {NextFunction} next - Express next function
 * @returns {Promise<void>} Always continues to next middleware
 * 
 * @example
 * ```typescript
 * // Route that works for both authenticated and anonymous users
 * router.get('/public', optionalAuth, (req: AuthenticatedRequest, res) => {
 *   if (req.user) {
 *     res.json({ message: 'Welcome back', user: req.user.name });
 *   } else {
 *     res.json({ message: 'Welcome guest' });
 *   }
 * });
 * ```
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    console.log(`[OptionalAuth] Header: ${authHeader ? 'Present' : 'Missing'}, Token: ${token ? 'Extracted' : 'None'}`);

    // If no token provided, continue without authentication
    if (!token) {
      console.log('[OptionalAuth] No token, continuing as anonymous');
      next();
      return;
    }

    // Verify token
    const verificationResult = verifyToken(token);
    console.log(`[OptionalAuth] Token verification: ${verificationResult.isValid ? 'Valid' : 'Invalid'}`);

    if (verificationResult.isValid && verificationResult.payload) {
      // Find user if token is valid
      const user = await User.findById(verificationResult.payload.userId).select('-password');
      console.log(`[OptionalAuth] User lookup: ${user ? 'Found' : 'Not found'}, Active: ${user?.isActive}`);
      
      if (user && user.isActive) {
        (req as any).user = user;
        console.log(`[OptionalAuth] User attached to request: ${user._id}`);
      }
    }

    // Continue regardless of authentication result
    next();

  } catch (error) {
    // Log error but don't fail the request
    console.error('Optional authentication error:', error);
    next();
  }
}

/**
 * Middleware to require specific user roles or permissions
 * 
 * This function returns a middleware that checks if the authenticated user
 * has the required permissions. Must be used after authenticateToken.
 * 
 * @param {string[]} allowedRoles - Array of roles that can access the resource
 * @returns {Function} Express middleware function
 * 
 * @example
 * ```typescript
 * // Protect admin-only routes
 * router.delete('/admin/users/:id', 
 *   authenticateToken, 
 *   requireRoles(['admin', 'moderator']), 
 *   deleteUser
 * );
 * ```
 */
export function requireRoles(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required for this resource.'
      });
      return;
    }

    // Note: Role checking logic would go here when roles are implemented
    // For now, all authenticated users are allowed
    // TODO: Implement role-based access control when user roles are added to User model
    
    next();
  };
}

/**
 * Default export containing all authentication middleware functions
 * Follows the functional programming pattern while providing centralized access
 */
export default {
  authenticateToken,
  optionalAuth,
  requireRoles
}; 