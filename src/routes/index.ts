/**
 * AI Interview Coach Backend - Routes Index
 * 
 * This file serves as the central export point for all API routes in the application.
 * It follows RESTful API design principles and organizes routes by feature domain.
 * 
 * Route Organization:
 * - /api/auth/* - Authentication and user management routes
 * - /api/interviews/* - Interview session management routes  
 * - /api/sessions/* - Session recording and transcript routes
 * - /api/uploads/* - File upload and document management routes
 * - /api/feedback/* - Feedback generation and retrieval routes
 * 
 * Design Principles:
 * - RESTful conventions (GET, POST, PUT/PATCH, DELETE)
 * - Consistent response format across all endpoints
 * - Proper HTTP status codes (200, 201, 400, 401, 403, 404, 500)
 * - API versioning (/api/v1/)
 * - Request validation middleware integration
 * 
 * Related Files:
 * - src/controllers/ - Business logic handlers
 * - src/middleware/ - Authentication and validation middleware
 * - src/services/ - External API integrations and business services
 * 
 * Task: #3 - Basic folder structure organization, #12 - Auth routes implementation
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

// Authentication routes exports
export { default as authRoutes } from './auth.routes';

// Interview routes exports  
export { default as interviewRoutes } from './interview.routes';

// Session routes exports
export { default as sessionRoutes } from './session.routes';

// Chat routes exports
export { default as chatRoutes } from './chat.routes';

// Upload routes exports
export { default as uploadRoutes } from './upload.routes';

// Future route exports will be added here as they are implemented:
// export { default as feedbackRoutes } from './feedback.routes'; 