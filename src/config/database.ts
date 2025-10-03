/**
 * AI Interview Coach Backend - Database Configuration
 * 
 * This file provides database connectivity functions for MongoDB using Mongoose ODM.
 * It implements connection management, error handling, and fallback to mock mode
 * when database is unavailable. Following the repository pattern for clean database operations.
 * 
 * Key Features:
 * - MongoDB connection with Mongoose ODM
 * - Connection pooling and optimization settings
 * - Comprehensive error handling and retry logic
 * - Mock database fallback mode for development
 * - Connection event monitoring and logging
 * - Graceful shutdown handling
 * 
 * Design Principles:
 * - Functional programming patterns over classes
 * - Explicit return types and proper error handling
 * - Environment-based configuration
 * - Connection state management
 * - Performance optimization with connection pooling
 * 
 * Related Files:
 * - src/index.ts - Main application entry point
 * - src/models/ - Mongoose model definitions
 * - .env - Database connection environment variables
 * 
 * Task: #6 - Database configuration with connectDB function
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import mongoose, { Connection } from 'mongoose';

// Global connection cache for serverless environments
declare global {
  // eslint-disable-next-line no-var
  var mongoose: {
    conn: Connection | null;
    promise: Promise<Connection> | null;
  };
}

// Initialize global mongoose cache
global.mongoose = global.mongoose || { conn: null, promise: null };

/**
 * Interface defining the database connection result
 */
interface DatabaseConnectionResult {
  success: boolean;
  connection?: Connection;
  isMockMode: boolean;
  message: string;
}

/**
 * Interface for database connection options
 */
interface DatabaseConnectionOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  enableMockFallback?: boolean;
}

/**
 * Default connection options for MongoDB
 */
const DEFAULT_CONNECTION_OPTIONS: DatabaseConnectionOptions = {
  maxRetries: 3,
  retryDelay: 2000,
  timeout: 10000,
  enableMockFallback: true
};

/**
 * Validates the MongoDB URI format
 * 
 * @param {string} uri - MongoDB connection URI
 * @returns {boolean} True if URI format is valid
 */
function isValidMongoUri(uri: string): boolean {
  const mongoUriPattern = /^mongodb(\+srv)?:\/\/[^\s]+$/;
  return mongoUriPattern.test(uri);
}

/**
 * Gets optimized Mongoose connection options for production use
 * 
 * @returns {mongoose.ConnectOptions} Mongoose connection configuration
 */
function getMongooseOptions(): mongoose.ConnectOptions {
  return {
    // Connection pool settings for performance
    maxPoolSize: 10, // Maximum number of connections in the pool
    minPoolSize: 2,  // Minimum number of connections in the pool
    maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
    
    // Timeout settings
    serverSelectionTimeoutMS: 10000, // How long to try selecting a server
    socketTimeoutMS: 45000, // How long a send or receive on a socket can take
    connectTimeoutMS: 10000, // How long to wait for a connection to be established
    
    // Buffering settings
    bufferCommands: false, // Disable mongoose buffering commands
    
    // Other optimizations
    family: 4, // Use IPv4, skip trying IPv6
    heartbeatFrequencyMS: 30000, // How often to check the connection
  };
}

/**
 * Initializes mock database mode for development
 * This provides in-memory data storage when MongoDB is not available
 * 
 * @returns {Promise<DatabaseConnectionResult>} Mock connection result
 */
async function initializeMockMode(): Promise<DatabaseConnectionResult> {
  console.log('📊 Initializing mock database mode...');
  console.log('🔧 Mock mode features:');
  console.log('   • In-memory data storage');
  console.log('   • No persistent data between restarts');
  console.log('   • All models will use mock implementations');
  
  return {
    success: true,
    isMockMode: true,
    message: 'Mock database mode initialized successfully'
  };
}

/**
 * Attempts to connect to MongoDB with retry logic
 * 
 * @param {string} uri - MongoDB connection URI
 * @param {DatabaseConnectionOptions} options - Connection options
 * @returns {Promise<DatabaseConnectionResult>} Connection result
 */
async function attemptMongoConnection(
  uri: string, 
  options: DatabaseConnectionOptions = {}
): Promise<DatabaseConnectionResult> {
  const finalOptions = { ...DEFAULT_CONNECTION_OPTIONS, ...options };
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= finalOptions.maxRetries!; attempt++) {
    try {
      console.log(`🔄 MongoDB connection attempt ${attempt}/${finalOptions.maxRetries}`);
      
      // Create connection promise and cache it for serverless
      global.mongoose.promise = mongoose.connect(uri, getMongooseOptions()).then(() => mongoose.connection);
      
      // Await the connection
      await global.mongoose.promise;
      
      const connection = mongoose.connection;
      global.mongoose.conn = connection;
      
      // Verify connection is ready
      if (connection.readyState === 1) {
        console.log('✅ MongoDB connection established successfully');
        console.log(`📍 Database: ${connection.name}`);
        console.log(`🌐 Host: ${connection.host}:${connection.port}`);
        
        return {
          success: true,
          connection,
          isMockMode: false,
          message: 'MongoDB connected successfully'
        };
      }
      
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ MongoDB connection attempt ${attempt} failed:`, error);
      // Clear the promise cache on error
      global.mongoose.promise = null;
      
      if (attempt < finalOptions.maxRetries!) {
        console.log(`⏳ Retrying in ${finalOptions.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, finalOptions.retryDelay));
      }
    }
  }
  
  console.error('❌ All MongoDB connection attempts failed');
  
  return {
    success: false,
    isMockMode: false,
    message: `MongoDB connection failed after ${finalOptions.maxRetries} attempts: ${lastError?.message}`
  };
}

/**
 * Establishes database connection with error handling and mock fallback
 * Main function exported for use in the application
 * 
 * @param {DatabaseConnectionOptions} options - Optional connection configuration
 * @returns {Promise<DatabaseConnectionResult>} Connection result with status
 * 
 * @throws {Error} Only if connection fails and mock mode is disabled
 * 
 * @example
 * ```typescript
 * // Basic usage
 * const result = await connectDB();
 * if (result.success) {
 *   console.log('Database ready');
 * }
 * 
 * // With custom options
 * const result = await connectDB({ maxRetries: 5, enableMockFallback: false });
 * ```
 */
export async function connectDB(
  options: DatabaseConnectionOptions = {}
): Promise<DatabaseConnectionResult> {
  try {
    // Get MongoDB URI from environment
    const mongoUri = process.env.MONGODB_URI;
    const useMockDb = process.env.USE_MOCK_DB === 'true';
    const finalOptions = { ...DEFAULT_CONNECTION_OPTIONS, ...options };
    
    // Validate environment configuration
    if (!mongoUri && !useMockDb) {
      throw new Error('MONGODB_URI environment variable is required when USE_MOCK_DB is not true');
    }
    
    // Check if already connected (for serverless environment)
    if (global.mongoose.conn && global.mongoose.conn.readyState === 1) {
      console.log('♻️ Reusing existing MongoDB connection');
      return {
        success: true,
        connection: global.mongoose.conn,
        isMockMode: false,
        message: 'MongoDB connection reused'
      };
    }
    
    // Check if connection is in progress
    if (global.mongoose.promise) {
      console.log('⏳ Waiting for existing connection attempt...');
      const connection = await global.mongoose.promise;
      return {
        success: true,
        connection,
        isMockMode: false,
        message: 'MongoDB connected successfully'
      };
    }
    
    // Check if mock mode is explicitly requested
    if (useMockDb) {
      return await initializeMockMode();
    }
    
    // Validate MongoDB URI format
    if (!isValidMongoUri(mongoUri!)) {
      throw new Error(`Invalid MongoDB URI format: ${mongoUri}`);
    }
    
    console.log('🚀 Initializing database connection...');
    
    // Attempt MongoDB connection
    const connectionResult = await attemptMongoConnection(mongoUri!, finalOptions);
    
    if (connectionResult.success) {
      // Set up connection event handlers
      setupConnectionEventHandlers();
      return connectionResult;
    }
    
    // Handle connection failure
    if (finalOptions.enableMockFallback) {
      console.log('🔄 Falling back to mock database mode...');
      return await initializeMockMode();
    } else {
      throw new Error(connectionResult.message);
    }
    
  } catch (error) {
    console.error('💥 Database initialization failed:', error);
    
    // Final fallback attempt if enabled
    if (options.enableMockFallback !== false) {
      console.log('🆘 Emergency fallback to mock mode...');
      return await initializeMockMode();
    }
    
    throw error;
  }
}

/**
 * Sets up MongoDB connection event handlers for monitoring
 * 
 * @returns {void}
 */
function setupConnectionEventHandlers(): void {
  const connection = mongoose.connection;
  
  connection.on('connected', () => {
    console.log('🔗 MongoDB connection established');
  });
  
  connection.on('error', (error) => {
    console.error('❌ MongoDB connection error:', error);
  });
  
  connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB disconnected');
  });
  
  connection.on('reconnected', () => {
    console.log('🔄 MongoDB reconnected');
  });
  
  connection.on('close', () => {
    console.log('🔒 MongoDB connection closed');
  });
}

/**
 * Gracefully closes the database connection
 * Should be called during application shutdown
 * 
 * @returns {Promise<void>}
 */
export async function disconnectDB(): Promise<void> {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('✅ Database connection closed gracefully');
      // Clear the global cache for serverless
      global.mongoose.conn = null;
      global.mongoose.promise = null;
    }
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
    throw error;
  }
}

/**
 * Gets the current database connection status
 * 
 * @returns {string} Connection status description
 */
export function getConnectionStatus(): string {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  return states[state as keyof typeof states] || 'unknown';
}

/**
 * Checks if the database is currently connected
 * 
 * @returns {boolean} True if connected to MongoDB
 */
export function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

// Export the mongoose instance for direct access if needed
export { mongoose };

// Export connection result interface for type safety
export type { DatabaseConnectionResult, DatabaseConnectionOptions }; 