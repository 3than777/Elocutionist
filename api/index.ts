import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from '../src/config/database';
import { authRoutes, interviewRoutes, sessionRoutes, chatRoutes, uploadRoutes, avatarRoutes } from '../src/routes';
import { errorHandler, notFoundHandler } from '../src/middleware';

// Load environment variables
dotenv.config();

// Create Express app
const app: Application = express();

// CORS middleware
const corsOptions = {
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// JSON parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Ensure database is connected for health check
    const dbResult = await connectDB();
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'AI Interview Coach Backend',
      database: dbResult.success ? 'connected' : 'disconnected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'AI Interview Coach Backend',
      error: 'Database connection failed'
    });
  }
});

// Ensure database connection before handling requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(503).json({
      error: 'Service Unavailable',
      message: 'Database connection failed. Please try again later.'
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/avatar', avatarRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Export for Vercel
export default app;