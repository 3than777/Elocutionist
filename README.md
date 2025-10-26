# Elocutionist

AI-powered interview coaching platform providing real-time feedback and practice sessions for job and college interview preparation.

## Architecture

Full-stack TypeScript application with React frontend and Express.js backend deployed on Vercel.

- **Frontend**: React 19.1 + Vite (dreamcollege-frontend/)
- **Backend**: Node.js + Express + TypeScript (src/)
- **Database**: MongoDB with Mongoose ODM
- **AI**: OpenAI GPT-4 + Whisper API
- **Authentication**: JWT with bcrypt

## Features

- **AI Interview Simulation**: Dynamic question generation based on user profile
- **Voice Analysis**: Real-time speech pattern analysis and feedback
- **Audio Transcription**: Speech-to-text using OpenAI Whisper
- **Performance Analytics**: Comprehensive scoring and improvement tracking
- **Document Processing**: PDF, DOCX, and image text extraction
- **3D Avatars**: Interactive AI interviewer avatars
- **Session Recording**: Complete interview playback and analysis

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (optional - mock mode available)
- OpenAI API key

### Installation

```bash
# Install dependencies
npm install
cd dreamcollege-frontend && npm install && cd ..

# Environment setup
cp env-template.txt .env
# Edit .env with your OpenAI API key and MongoDB URI

# Start development servers
npm run dev &
cd dreamcollege-frontend && npm run dev
```

Access at http://localhost:5173 (frontend) and http://localhost:3000 (backend)

### Environment Variables

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/ai-interview-coach
JWT_SECRET=your-secret-key
OPENAI_API_KEY=your-openai-api-key
USE_MOCK_DB=false
NODE_ENV=development
```

## Development

```bash
# Backend development
npm run dev

# Frontend development
cd dreamcollege-frontend && npm run dev

# Run tests
npm test
cd dreamcollege-frontend && npm test

# Build for production
npm run build
cd dreamcollege-frontend && npm run build
```

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/interviews` - Create interview session
- `POST /api/sessions/:id/transcribe` - Audio transcription
- `POST /api/sessions/:id/generate-feedback` - AI feedback generation
- `GET /api/interviews` - List user interviews

## Technology Stack

### Backend
- Express.js 5.1, TypeScript 5.8
- MongoDB + Mongoose 8.16
- OpenAI API 5.10, JWT, bcryptjs
- Multer, Sharp, PDF-parse, Tesseract.js

### Frontend
- React 19.1, Vite 7.0
- React Router DOM 7.8, React Spring 10.0
- React Dropzone, React Markdown
- CSS-in-JS (styled-jsx)

## Deployment

Configured for Vercel with automatic builds. The `vercel.json` handles both frontend static serving and backend serverless functions.

## License

ISC