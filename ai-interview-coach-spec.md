# AI Interview Coach - Technical Development Specification

## Core Features

### 1. Realistic Interview Environment
- **AI Avatar**: Dynamic AI interviewer with natural body language and gestures
- **Voice-to-voice interaction**: Natural conversation flow
- **Personalized questions**: Based on user's profile and selected program
- **Real-time responses**: Contextual follow-up questions based on user answers

### 2. Real-Time Feedback and Suggestions
- **Voice Analysis**: Monitor tone, mood, volume, pace, filler words
- **Live transcript**: Real-time transcription of conversation
- **Performance indicators**: Visual feedback on speaking quality
- **Contextual responses**: AI adapts based on user performance

### 3. Personalized AI-Powered Reports
- **Comprehensive feedback**: Strengths and weaknesses analysis
- **Actionable improvements**: Specific tips for each weakness
- **Session recording**: Ability to review past interviews
- **Performance metrics**: Quantitative scoring system

### 4. Improvement Tracking
- **Progress visualization**: Track improvement across sessions
- **Weak point tracking**: Monitor specific areas over time
- **Grading system**: Consistent scoring methodology
- **Historical data**: Compare performance across multiple sessions

## System Architecture

### Overall Architecture
```
Frontend (React/React Native) → Backend API (Node.js/Express) → LLM API (OpenAI/Claude/Llama)
                                           ↓
                                      Database (MongoDB)
```

### Complete System Components

#### Frontend
- **Interview Setup**: User profile, difficulty selection, program selection
- **Live Interview**: Real-time video/audio interface, live transcript
- **AI Rating**: Performance scoring and feedback display
- **Post Review**: Session playback, detailed analytics

#### Backend API Endpoints
1. **Interview Q's API / Serp API**
   - Generate interview questions based on user context
   - Integrate with external question databases

2. **Question Gen. API / TTS / STT API**
   - Text-to-Speech for AI interviewer
   - Speech-to-Text for user responses
   - Dynamic question generation

3. **Vocal Analyzer API**
   - Analyze voice characteristics (tone, pace, volume)
   - Detect filler words and speech patterns
   - Real-time performance metrics

4. **Post Review API**
   - Generate comprehensive feedback reports
   - Store session data
   - Retrieve historical performance

#### LLM Integration
- **Question Generation**: OpenAI/Claude/Llama for contextual questions
- **Response Analysis**: AI-powered feedback generation
- **Text-to-Speech**: OpenAI TTS API/Google Cloud Text-to-Speech
- **Speech-to-Text**: OpenAI Whisper/Azure Speech

## Database Schema (MongoDB)

### Interview Collection
```javascript
{
  _id: ObjectId(),
  userId: ObjectId(), // Reference to users collection
  interviewType: String, // "behavioral", "technical", etc.
  interviewDifficulty: String, // "beginner", "intermediate", "expert"
  duration: Number, // in minutes
  questions: [String], // Array of questions asked
  sessionToken: String, // Unique session identifier
  status: String, // "pending", "active", "completed", "cancelled"
  createdAt: Date,
  updatedAt: Date
}
```

### User Profile Collection
```javascript
{
  _id: ObjectId(),
  email: String,
  name: String,
  grade: Number,
  targetMajor: String,
  targetColleges: [String],
  extracurriculars: [String],
  strengths: [String],
  weaknesses: [String],
  createdAt: Date,
  updatedAt: Date
}
```

### Session Recording Collection
```javascript
{
  _id: ObjectId(),
  interviewId: ObjectId(), // Reference to interview
  userId: ObjectId(),
  transcript: [{
    speaker: String, // "user" or "ai"
    text: String,
    timestamp: Number,
    audioUrl: String // Optional audio recording URL
  }],
  vocalAnalysis: {
    overallScore: Number,
    tone: {
      confidence: Number,
      clarity: Number,
      enthusiasm: Number
    },
    speechPatterns: {
      pace: Number, // words per minute
      fillerWords: [String],
      fillerCount: Number,
      volumeVariation: Number
    }
  },
  createdAt: Date
}
```

### Feedback Report Collection
```javascript
{
  _id: ObjectId(),
  sessionId: ObjectId(),
  userId: ObjectId(),
  overallRating: Number, // 1-10
  strengths: [String],
  weaknesses: [String],
  recommendations: [{
    area: String,
    suggestion: String,
    priority: String // "high", "medium", "low"
  }],
  detailedScores: {
    contentRelevance: Number,
    communication: Number,
    confidence: Number,
    structure: Number
  },
  createdAt: Date
}
```

## API Contract Examples

### POST /api/interview
**Request:**
```json
{
  "profileId": "abc123",
  "interviewType": "behavioral",
  "interviewDifficulty": "medium",
  "duration": 30,
  "customPrompt": "Focus on leadership questions" // Optional
}
```

**Response:**
```json
{
  "interviewId": "xyz789",
  "questions": [...],
  "sessionToken": "session123"
}
```

### POST /api/speech-analysis
**Request:**
```json
{
  "sessionToken": "session123",
  "audioData": "base64_encoded_audio",
  "timestamp": 1234567890
}
```

**Response:**
```json
{
  "transcript": "User response text...",
  "analysis": {
    "pace": 145,
    "fillerWords": ["um", "uh"],
    "confidence": 0.75,
    "clarity": 0.82
  }
}
```

### GET /api/feedback/{sessionId}
**Response:**
```json
{
  "overallRating": 7.5,
  "strengths": [
    "Good eye contact maintained",
    "Clear articulation of ideas"
  ],
  "weaknesses": [
    "Excessive use of filler words",
    "Responses lack specific examples"
  ],
  "recommendations": [
    {
      "area": "Content Structure",
      "suggestion": "Use STAR method for behavioral questions",
      "priority": "high"
    }
  ]
}
```

## Tech Stack

### Frontend
- **Web**: React with TypeScript
- **Mobile**: React Native
- **UI Framework**: Tailwind CSS (Web), React Native Elements (Mobile)
- **State Management**: Redux Toolkit or Zustand
- **Real-time Communication**: Socket.io or WebRTC
- **Video/Audio**: WebRTC for browser, React Native WebRTC

### Backend
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Language**: TypeScript
- **API Documentation**: Swagger UI
- **Authentication**: JWT with refresh tokens
- **File Storage**: AWS S3 or Google Cloud Storage

### Database
- **Primary**: MongoDB with Mongoose ODM
- **Caching**: Redis for session management
- **Search**: Elasticsearch for question database (optional)

### AI/ML Services
- **LLM**: OpenAI GPT-4 API or Claude API
- **Speech-to-Text**: OpenAI Whisper API
- **Text-to-Speech**: Google Cloud TTS or AWS Polly
- **Voice Analysis**: Custom model or Hume AI API

### DevOps & Tools
- **Version Control**: GitHub
- **Branch Strategy**: GitFlow (main, develop, feature branches)
- **CI/CD**: GitHub Actions
- **Hosting**: AWS EC2/Lambda or Google Cloud Run
- **Monitoring**: Sentry for error tracking
- **Development IDE**: Cursor (AI-Powered)

## Implementation Priority

### Phase 1 - MVP (Weeks 1-2)
1. Basic authentication and user profiles
2. Simple interview flow with pre-set questions
3. Basic speech-to-text transcription
4. Simple feedback report generation

### Phase 2 - Core Features (Weeks 3-4)
1. AI-powered dynamic question generation
2. Real-time voice analysis
3. Live feedback during interview
4. Session recording and playback

### Phase 3 - Advanced Features (Weeks 5-6)
1. AI Avatar implementation
2. Advanced analytics and progress tracking
3. Custom interview scenarios
4. Integration with DreamCollege.ai

## Key Implementation Notes

### Voice Analysis Implementation
```javascript
// Example voice analysis using Web Audio API
const analyzeVoice = (audioStream) => {
  const audioContext = new AudioContext();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(audioStream);
  
  source.connect(analyser);
  
  // Analyze frequency data for voice characteristics
  const frequencyData = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(frequencyData);
  
  return {
    volume: calculateVolume(frequencyData),
    pitch: calculatePitch(frequencyData),
    clarity: calculateClarity(frequencyData)
  };
};
```

### LLM Prompt Structure (Iceberg Model)
```javascript
const generateInterviewQuestion = async (context) => {
  const prompt = `
    [FRAMING]
    You are an experienced college admissions interviewer conducting a ${context.interviewType} interview.
    
    [REFERENCE]
    Student Profile:
    - Grade: ${context.grade}
    - Major Interest: ${context.major}
    - Difficulty: ${context.difficulty}
    
    [FORMAT]
    Generate one interview question that:
    1. Is appropriate for the student's level
    2. Relates to their intended major
    3. Encourages detailed responses
    
    [REQUEST]
    Generate the next interview question based on the conversation so far.
  `;
  
  return await callLLMAPI(prompt);
};
```

## Security Considerations
- Implement rate limiting on all API endpoints
- Sanitize all user inputs
- Use HTTPS for all communications
- Implement proper CORS policies
- Store sensitive data encrypted
- Regular security audits

## Performance Requirements
- Response time: <200ms for API calls
- Speech recognition latency: <500ms
- Support for concurrent users: 1000+
- Audio quality: 16kHz minimum
- Database query optimization for large datasets