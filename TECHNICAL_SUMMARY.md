# Elocutionist - Technical Summary

## Overview

Elocutionist is a full-stack AI-powered interview coaching platform that provides mock interview practice with real-time feedback and analysis. The application consists of a Node.js/Express TypeScript backend API and a React-based frontend built with Vite.

## Architecture

### Frontend
- **Location**: `/dreamcollege-frontend/`
- **Framework**: React 19.1.0
- **Build Tool**: Vite 7.0.4
- **Language**: JavaScript (JSX)
- **State Management**: React Context API
- **Routing**: React Router DOM 7.8.0
- **Styling**: CSS with CSS-in-JS (styled-jsx)
- **Testing**: Jest with React Testing Library

### Backend
- **Location**: `/src/`
- **Framework**: Express.js 5.1.0
- **Language**: TypeScript 5.8.3
- **Runtime**: Node.js
- **Database**: MongoDB with Mongoose ODM 8.16.4
- **Authentication**: JWT (jsonwebtoken 9.0.2) with bcrypt
- **Testing**: Jest with Supertest

## Technology Stack

### Core Technologies

#### Backend
- **TypeScript**: Strict mode enabled with comprehensive type checking
- **Express.js**: Web framework with middleware architecture
- **MongoDB**: Primary database with Mongoose ODM
- **JWT**: Secure authentication with configurable expiration
- **bcryptjs**: Password hashing with salt rounds

#### Frontend
- **React**: Latest version (19.1.0) with hooks
- **Vite**: Fast build tool with HMR
- **React Router**: Client-side routing for SPA
- **React Spring**: Animation library
- **React Dropzone**: File upload handling
- **React Markdown**: Markdown rendering

### AI Integration
- **OpenAI GPT-4**: Question generation and interview analysis
- **OpenAI Whisper API**: Audio transcription
- **Custom Voice Analysis**: Speech pattern analysis

### File Processing
- **Multer**: File upload middleware
- **Sharp**: Image processing
- **PDF-Parse**: PDF document parsing
- **Mammoth**: DOCX to HTML conversion
- **Tesseract.js**: OCR for image text extraction
- **File-Type**: File type detection

## Key Features

### Authentication & User Management
- JWT-based authentication with secure token generation
- User registration with email/password
- Profile management with grade level and target major
- Session persistence with localStorage

### Interview System
- Dynamic question generation based on user profile
- Multiple interview types: behavioral, technical, case-study, general
- Difficulty levels: beginner, intermediate, advanced
- Real-time interview sessions with AI responses

### Audio & Voice Features
- Audio file upload and transcription (mp3, wav, webm, m4a, ogg, flac)
- Speech-to-text using OpenAI Whisper
- Voice input with browser speech recognition
- Text-to-speech for AI responses
- Voice analytics for speech patterns

### Analytics & Feedback
- AI-generated performance ratings
- Comprehensive interview feedback
- Vocal analysis (tone, clarity, pace)
- Session history tracking
- Progress indicators and dashboards

### Media & Content
- Avatar system with 3D models
- Document upload support
- Media hub for resources
- Dark mode support

## Project Structure

```
Elocutionist/
├── src/                    # Backend source code
│   ├── config/            # Database configuration
│   ├── controllers/       # Request handlers
│   ├── middleware/        # Express middleware
│   ├── models/           # Mongoose models
│   ├── routes/           # API routes
│   └── services/         # Business logic
├── dreamcollege-frontend/ # Frontend application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── context/      # React contexts
│   │   ├── hooks/        # Custom hooks
│   │   ├── services/     # API services
│   │   └── utils/        # Utility functions
│   └── public/           # Static assets
├── api/                  # Serverless functions
├── docs/                 # Documentation
└── dist/                 # Build output
```

## API Architecture

### RESTful Endpoints
- `/api/auth/*` - Authentication endpoints
- `/api/interviews/*` - Interview management
- `/api/sessions/*` - Session recording and transcription
- `/api/chat/*` - Real-time chat functionality
- `/api/uploads/*` - File upload handling
- `/api/avatar/*` - Avatar preferences

### Database Models
- **User**: User profiles and authentication
- **Interview**: Interview sessions and questions
- **SessionRecording**: Audio recordings and transcripts
- **InterviewTranscript**: Detailed transcript entries
- **AvatarPreference**: User avatar selections
- **UploadedFile**: File metadata and storage

## Development Features

### TypeScript Configuration
- Strict mode enabled
- No implicit any
- Source maps for debugging
- Declaration files generation

### Testing Infrastructure
- Jest for unit and integration tests
- React Testing Library for component testing
- Supertest for API endpoint testing
- Test coverage reporting

### Build & Development Tools
- **Nodemon**: Auto-restart for backend development
- **ts-node**: Direct TypeScript execution
- **ESLint**: Code quality enforcement
- **Vite HMR**: Hot module replacement for frontend

## Security Features

### Authentication
- JWT tokens with configurable expiration
- Bcrypt password hashing with salt rounds
- Protected API routes with middleware
- User ownership verification

### Data Validation
- Input sanitization
- File type verification
- Size limits on uploads (10MB)
- CORS configuration for cross-origin requests

### Error Handling
- Centralized error middleware
- Comprehensive error responses
- Graceful fallbacks (mock database mode)

## Performance Optimizations

### Backend
- MongoDB connection pooling
- Indexed database fields
- Pagination for large datasets
- Lean queries for list endpoints

### Frontend
- Code splitting with React.lazy
- Optimized bundle sizes with Vite
- Efficient re-renders with React.memo
- Throttled API calls for voice features

## Deployment Configuration

### Environment Variables
- Comprehensive .env configuration
- Environment-specific settings
- Secure secret management
- Mock mode for development

### Platform Support
- Vercel deployment ready (vercel.json)
- Docker-compatible architecture
- Cross-platform development (macOS, Linux, Windows)
- Serverless function support

## Notable Technical Decisions

1. **TypeScript Strict Mode**: Ensures type safety across the backend
2. **MongoDB with Fallback**: Mock database mode for development flexibility
3. **JWT Authentication**: Stateless, scalable authentication
4. **OpenAI Integration**: Leveraging GPT-4 for intelligent responses
5. **Vite over Webpack**: Faster development builds and HMR
6. **Monorepo Structure**: Backend and frontend in single repository
7. **Context over Redux**: Simpler state management for current scale

## External Dependencies

### AI/ML Services
- OpenAI API (GPT-4, Whisper)
- Browser Speech Recognition API
- Web Speech API for TTS

### Cloud Services
- MongoDB Atlas (optional)
- File storage (configurable)
- Deployment platforms (Vercel)

## Future Scalability Considerations

- Microservices architecture ready
- Horizontal scaling capable
- Caching layer ready (Redis compatible)
- Queue system compatible (for async processing)
- CDN ready for static assets
- Multi-language support infrastructure