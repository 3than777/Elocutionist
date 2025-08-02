/**
 * AI Interview Coach Backend - Main Entry Point
 * 
 * This file serves as the main entry point for the AI Interview Coach backend API.
 * It initializes the Express server with essential middleware including CORS,
 * JSON parsing, MongoDB connection, and environment variable configuration.
 * 
 * Key Features:
 * - Express.js server setup with TypeScript
 * - CORS middleware for cross-origin requests
 * - Environment variable configuration with dotenv
 * - JSON request body parsing
 * - MongoDB database connection
 * - Basic error handling and logging
 * - Health check endpoint for monitoring
 * 
 * Related Files:
 * - tsconfig.json: TypeScript configuration
 * - .env: Environment variables (not committed)
 * - src/config/database.ts: MongoDB connection configuration (future)
 * 
 * Tasks: #2 - Express.js setup, #5 - MongoDB connection and server setup
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, disconnectDB } from './config/database';
import { authRoutes, interviewRoutes, sessionRoutes, chatRoutes, uploadRoutes } from './routes';
import { errorHandler, notFoundHandler } from './middleware';

// Load environment variables from .env file
dotenv.config();

/**
 * Validates that all required environment variables are present
 * 
 * @throws {Error} If any required environment variable is missing
 * @returns {void}
 */
function validateEnvironmentVariables(): void {
  const requiredEnvVars = ['PORT', 'MONGODB_URI', 'JWT_SECRET', 'OPENAI_API_KEY'];
  const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
}

/**
 * Creates and configures the Express application
 * 
 * @returns {Application} Configured Express application instance
 */
function createApp(): Application {
  const app: Application = express();

  // CORS middleware - allow cross-origin requests
  app.use(cors({
    origin: true, // Allow all origins in development
    credentials: true
  }));

  // JSON parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'AI Interview Coach Backend'
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/interviews', interviewRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/uploads', uploadRoutes);

  // 404 handler for undefined routes (must be before error handler)
  app.use(notFoundHandler);

  // Global error handling middleware (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Starts the Express server on the specified port with database connection
 * 
 * @param {Application} app - Express application instance
 * @returns {Promise<void>}
 */
async function startServer(app: Application): Promise<void> {
  try {
    // Validate environment variables first
    validateEnvironmentVariables();
    
    // Connect to database using centralized configuration
    const dbResult = await connectDB();
    if (!dbResult.success) {
      throw new Error(`Database connection failed: ${dbResult.message}`);
    }
    
    if (dbResult.isMockMode) {
      console.log('⚠️ Running in mock database mode - data will not persist');
    }
    
    const PORT: number = parseInt(process.env.PORT || '3000', 10);
    
    app.listen(PORT, () => {
      console.log('🎉 ===============================================');
      console.log(`✅ AI Interview Coach Backend started successfully`);
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📅 Started at: ${new Date().toISOString()}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log('🎉 ===============================================');
    });
    
  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler for the application
 * Closes database connections and terminates the process cleanly
 * 
 * @returns {Promise<void>}
 */
async function gracefulShutdown(): Promise<void> {
  console.log('\n🛑 Graceful shutdown initiated...');
  
  try {
    await disconnectDB();
  } catch (error) {
    console.error('❌ Error during database shutdown:', error);
  }
  
  console.log('👋 Server shut down complete');
  process.exit(0);
}

// Handle process termination signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Initialize and start the application
const app: Application = createApp();
startServer(app);

export default app; 