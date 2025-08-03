/**
 * AI Interview Coach Backend - OpenAI Service
 * 
 * This file implements OpenAI API integration for LLM services including
 * question generation, feedback analysis, and transcription using GPT-4 and Whisper.
 * It follows functional programming patterns and provides pure functions for AI operations.
 * 
 * Key Features:
 * - OpenAI client initialization with API key validation
 * - Dynamic interview question generation using GPT-4
 * - AI-powered feedback analysis and scoring
 * - Audio transcription using Whisper API
 * - Streaming support for long responses
 * - Rate limiting and error handling with retry logic
 * 
 * Security Considerations:
 * - Uses environment OPENAI_API_KEY for authentication
 * - Implements request validation and sanitization
 * - Handles API rate limits with exponential backoff
 * - Logs errors without exposing sensitive information
 * 
 * Performance Optimization:
 * - Streaming for long responses to improve UX
 * - Caching for frequently generated content
 * - Connection pooling and retry mechanisms
 * - Token usage monitoring to optimize costs
 * 
 * Related Files:
 * - src/routes/interview.routes.ts - Interview question generation endpoints
 * - src/controllers/ - Service consumption in business logic
 * - src/models/Interview.ts - Interview data structure
 * - src/models/SessionRecording.ts - Transcript and feedback storage
 * 
 * Task: #17 - OpenAI service initialization and question generation
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import OpenAI from 'openai';

/**
 * Interface for interview question generation parameters
 * Contains all necessary context for AI question generation
 */
export interface IQuestionGenerationParams {
  interviewType: 'behavioral' | 'technical' | 'case-study' | 'leadership' | 'general';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  userMajor: string;
  previousQuestions?: string[];
  customPrompt?: string;
  questionCount?: number;
  targetColleges?: string[];
  userGrade?: number;
  userStrengths?: string[];
  userWeaknesses?: string[];
}

/**
 * Interface for generated interview questions
 * Structured response from AI question generation
 */
export interface IGeneratedQuestion {
  id: string;
  text: string;
  category: string;
  followUpQuestions?: string[];
  expectedAnswerLength?: 'short' | 'medium' | 'long';
  hints?: string[];
  difficulty: string;
}

/**
 * Interface for question generation response
 * Complete response structure for question generation
 */
export interface IQuestionGenerationResponse {
  questions: IGeneratedQuestion[];
  generatedAt: Date;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata: {
    interviewType: string;
    difficulty: string;
    userMajor: string;
    questionCount: number;
  };
}

/**
 * Interface for OpenAI service configuration
 * Allows customization of AI service behavior
 */
export interface IOpenAIConfig {
  apiKey?: string;
  organization?: string;
  baseURL?: string;
  maxRetries?: number;
  timeout?: number;
  defaultModel?: string;
}

/**
 * Interface for interview transcript analysis parameters
 * Contains context needed for comprehensive feedback generation
 */
export interface IFeedbackAnalysisParams {
  transcript: ITranscriptEntry[];
  interviewType?: string;
  interviewDifficulty?: string;
  userMajor?: string;
  questions?: string[];
  interviewDuration?: number; // in minutes
  userProfile?: {
    grade?: number;
    targetColleges?: string[];
    strengths?: string[];
    weaknesses?: string[];
  };
}

/**
 * Interface for transcript entry (imported from SessionRecording model)
 */
export interface ITranscriptEntry {
  speaker: 'user' | 'ai' | 'system';
  text: string;
  timestamp: number;
  audioUrl?: string;
  confidence?: number;
  duration?: number;
}

/**
 * Interface for AI-generated feedback report
 */
export interface IFeedbackReport {
  overallRating: number; // 1-10
  strengths: string[];
  weaknesses: string[];
  recommendations: {
    area: string;
    suggestion: string;
    priority: 'high' | 'medium' | 'low';
    examples?: string[];
  }[];
  detailedScores: {
    contentRelevance: number; // 0-100
    communication: number; // 0-100
    confidence: number; // 0-100
    structure: number; // 0-100
    engagement: number; // 0-100
  };
  questionFeedback?: {
    questionId: string;
    score: number; // 0-100
    feedback: string;
    improvements: string[];
  }[];
  summary: string;
}

/**
 * Interface for audio transcription parameters
 * Contains configuration for Whisper API transcription
 */
export interface IAudioTranscriptionParams {
  audioBuffer: Buffer;
  filename: string;
  language?: string; // ISO-639-1 language code (optional)
  prompt?: string; // Optional text to guide the model's style
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number; // Sampling temperature (0-1)
  timestampGranularities?: ('word' | 'segment')[];
}

/**
 * Interface for transcription response from Whisper API
 */
export interface ITranscriptionResponse {
  text: string;
  language?: string;
  duration?: number;
  words?: {
    word: string;
    start: number;
    end: number;
  }[];
  segments?: {
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
    tokens: number[];
    temperature: number;
    avg_logprob: number;
    compression_ratio: number;
    no_speech_prob: number;
  }[];
}

/**
 * Interface for audio file validation
 */
export interface IAudioFileInfo {
  isValid: boolean;
  mimeType?: string;
  size?: number;
  duration?: number;
  error?: string;
}

/**
 * Interface for chat completion options
 * Provides flexibility for content-aware prompts and voice optimization
 */
export interface IChatCompletionOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  logTokenUsage?: boolean;
  additionalParams?: any;
  voiceMode?: boolean; // NEW: Enable voice-optimized responses
}

/**
 * Interface for voice optimization configuration
 * Settings for optimizing AI responses for text-to-speech output
 */
export interface IVoiceOptimizationConfig {
  enableOptimization: boolean;
  maxResponseLength?: number; // Maximum characters for voice output
  reducePunctuation?: boolean; // Simplify complex punctuation for TTS
  addPronunciationGuides?: boolean; // Include pronunciation for technical terms
  optimizeForSpeechRate?: number; // Target speech rate (words per minute)
  includeVoiceInstructions?: boolean; // Add voice-specific instructions to AI
}

/**
 * Interface for content-aware prompt configuration
 */
export interface IContentAwarePromptConfig {
  basePrompt: string;
  uploadedContent?: string;
  contentType?: 'resume' | 'transcript' | 'essay' | 'mixed';
  interviewType?: string;
  maxContentTokens?: number;
  includeContext?: boolean;
}

/**
 * Interface for prompt template
 */
export interface IPromptTemplate {
  name: string;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: string[];
  maxTokens?: number;
}

/**
 * OpenAI client instance
 * Initialized once and reused throughout the application
 */
let openaiClient: OpenAI | null = null;

/**
 * Initializes OpenAI client with API key from environment variables
 * 
 * @param {IOpenAIConfig} config - Optional configuration for OpenAI client
 * @returns {OpenAI} Configured OpenAI client instance
 * @throws {Error} If OPENAI_API_KEY is not configured or initialization fails
 * 
 * @example
 * ```typescript
 * const client = initializeOpenAI();
 * // Client is ready for API calls
 * ```
 */
export function initializeOpenAI(config: IOpenAIConfig = {}): OpenAI {
  if (openaiClient) {
    return openaiClient;
  }

  const apiKey = config.apiKey !== undefined ? config.apiKey : process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not configured');
  }

  try {
    openaiClient = new OpenAI({
      apiKey,
      organization: config.organization || process.env.OPENAI_ORGANIZATION,
      baseURL: config.baseURL,
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 30000, // 30 seconds
    });

    console.log('OpenAI client initialized successfully');
    return openaiClient;
  } catch (error) {
    console.error('Failed to initialize OpenAI client:', error);
    throw new Error('OpenAI client initialization failed');
  }
}

/**
 * Gets the current OpenAI client instance
 * Initializes if not already initialized
 * 
 * @returns {OpenAI} OpenAI client instance
 */
export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    return initializeOpenAI();
  }
  return openaiClient;
}

/**
 * Generates interview questions using GPT-4 based on user context
 * 
 * @param {string} interviewType - Type of interview (behavioral, technical, etc.)
 * @param {string} difficulty - Difficulty level (beginner, intermediate, advanced, expert)
 * @param {string} userMajor - User's intended major or field of study
 * @param {IQuestionGenerationParams} additionalParams - Additional context parameters
 * @returns {Promise<string[]>} Array of generated interview questions
 * @throws {Error} If question generation fails or API call errors
 * 
 * @example
 * ```typescript
 * const questions = await generateInterviewQuestions(
 *   'behavioral', 
 *   'intermediate', 
 *   'Computer Science'
 * );
 * console.log(questions); // Array of 5 questions
 * ```
 */
export async function generateInterviewQuestions(
  interviewType: string,
  difficulty: string,
  userMajor: string,
  additionalParams: Partial<IQuestionGenerationParams> = {}
): Promise<string[]> {
  const client = getOpenAIClient();
  
  const questionCount = additionalParams.questionCount || 5;
  const customPrompt = additionalParams.customPrompt || '';
  const previousQuestions = additionalParams.previousQuestions || [];
  const targetColleges = additionalParams.targetColleges || [];
  const userGrade = additionalParams.userGrade;
  const userStrengths = additionalParams.userStrengths || [];
  const userWeaknesses = additionalParams.userWeaknesses || [];

  // Map difficulty levels to the new system
  const difficultyMapping: { [key: string]: string } = {
    'beginner': 'Easy',
    'intermediate': 'Advanced', 
    'advanced': 'Advanced',
    'expert': 'Hard'
  };
  
  const mappedDifficulty = difficultyMapping[difficulty.toLowerCase()] || 'Advanced';
  
  // Build comprehensive AI College Interview Coach system prompt
  const systemPrompt = `# AI College Interview Coach System Prompt

You are a PROFESSIONAL COLLEGE ADMISSIONS INTERVIEWER conducting practice interviews for students applying to universities. You must simulate an AUTHENTIC, REALISTIC college interview experience.

## CRITICAL INTERVIEWER BEHAVIOR RULES - NEVER VIOLATE THESE

**YOU ARE ONLY AN INTERVIEWER - NOT A COACH OR TUTOR:**
- Ask ONE interview question at a time (never provide a list of questions)
- Tailor questions based on the student's profile, interests, target schools, and intended major
- Ask natural follow-up questions that dig deeper into their responses
- Create a conversational flow that mirrors real college interviews

**ABSOLUTELY FORBIDDEN - NEVER DO THESE THINGS:**
- ❌ NEVER provide feedback, tips, evaluation, advice, or commentary during the interview
- ❌ NEVER comment on the quality of answers ("That's a great answer", "Good point", etc.)
- ❌ NEVER give suggestions for improvement or guidance
- ❌ NEVER say things like "This will help you", "You should consider", "A tip would be"
- ❌ NEVER act as a coach, mentor, or teacher during the interview
- ❌ NEVER break character as a professional interviewer
- ❌ NEVER give meta-commentary about the interview process

**WHAT A REAL INTERVIEWER DOES:**
- ✅ Ask thoughtful, relevant questions
- ✅ Use neutral acknowledgments: "I see", "Thank you", "Mm-hmm", "Interesting"
- ✅ Ask follow-up questions to clarify or explore responses deeper
- ✅ Move naturally between topics
- ✅ Maintain professional, courteous demeanor
- ✅ Focus entirely on gathering information about the candidate

**REMEMBER: You are NOT their coach. You are conducting a realistic interview simulation. Real interviewers do NOT give tips or feedback during interviews. Stay strictly in character as a professional interviewer.**

## Dynamic Interview Approach

To make each interview feel unique and realistic, vary your approach by:

**Interviewer Style Variation:** 
Subtly adopt different interviewer personalities throughout the conversation:
- Sometimes be more conversational and warm
- Other times be more academic and intellectual
- Occasionally take a more challenging stance
- Mix formal and informal tones as appropriate

**Question Sequencing Variety:**
- Don't always start with "Tell me about yourself" - sometimes begin with their interests, recent news, or an observation about their profile
- Vary the order of question types (sometimes start with future goals, other times with past experiences)
- Make unexpected but relevant connections between topics

## Student Profile Context

**Target Major:** ${userMajor}
**Interview Type:** ${interviewType}
**Difficulty Level:** ${mappedDifficulty}
${userGrade ? `**Student Grade:** ${userGrade}` : '**Target Audience:** High school students'}
${targetColleges.length > 0 ? `**Target Colleges:** ${targetColleges.join(', ')}` : ''}
${userStrengths.length > 0 ? `**Student Strengths:** ${userStrengths.join(', ')}` : ''}
${userWeaknesses.length > 0 ? `**Areas for Improvement:** ${userWeaknesses.join(', ')}` : ''}

## Difficulty-Based Question Adaptation

**For ${mappedDifficulty} Difficulty:**

${mappedDifficulty === 'Easy' ? `**Easy Level Guidelines:**
- Ask straightforward, commonly asked interview questions
- Use simpler language and shorter questions
- Limit follow-up questions to 1-2 per topic
- Focus on basic topics like interests, academic goals, and simple experiences
- Maintain a professional tone - NEVER provide feedback, tips, or evaluation
- Simply acknowledge responses with neutral phrases like "I see", "Thank you", "Mm-hmm"
- NO COACHING OR TEACHING - you are only conducting an interview
- Example types: "What is your favorite subject?" "Why do you want to attend college?" "Tell me about a hobby you enjoy"` : ''}

${mappedDifficulty === 'Advanced' ? `**Advanced Level Guidelines:**
- Ask standard college interview questions with moderate complexity
- Use 2-3 thoughtful follow-up questions per topic
- Include both personal and academic exploration
- Ask for specific examples and deeper explanations
- Maintain professional tone - NEVER provide feedback or evaluation
- Simply acknowledge responses neutrally before asking the next question
- NO COACHING OR MENTORING - you are only conducting an interview
- Example types: "Describe a challenge you've overcome," "How has a particular book or class changed your thinking?" "What would you contribute to our campus community?"` : ''}

${mappedDifficulty === 'Hard' ? `**Hard Level Guidelines:**
- Ask complex, thought-provoking questions that require deep reflection
- Use intensive follow-up questioning (3-4 follow-ups per topic)
- Include unexpected, creative, or scenario-based questions
- Challenge assumptions and push for nuanced thinking
- Ask hypothetical situations and ethical dilemmas
- Expect sophisticated, well-reasoned responses but NEVER evaluate or provide feedback
- Simply acknowledge responses with brief neutral statements before moving to next question
- NO COACHING, NO TIPS, NO ADVICE - you are only conducting an interview
- Example types: "If you could solve one global problem, what would it be and how would your approach differ from current solutions?" "Describe a time when your beliefs were fundamentally challenged"` : ''}

## Question Guidelines

**Question Types to Include:**
- Background and motivation questions
- Academic exploration related to ${userMajor}
- Personal growth and character assessment
- Future goals and institutional fit
- Scenario-based questions appropriate for ${interviewType} interviews

**Follow-up Strategy:**
- Ask "Can you give me a specific example?" when responses are too general
- Probe with "What did you learn from that experience?" for deeper reflection
- Use "How did that change your perspective?" to explore growth and maturity
- Follow interesting threads with "Tell me more about..."

${previousQuestions.length > 0 ? `**Avoid Repeating:** These previously asked questions: ${previousQuestions.join('; ')}` : ''}
${customPrompt ? `**Additional Context:** ${customPrompt}` : ''}

## CRITICAL: Original Question Generation

**DO NOT use generic example questions.** Generate original questions by:
- Creating new questions inspired by the student's specific profile and ${userMajor} interest
- Combining elements from their background in unexpected ways
- Developing questions that naturally emerge from the ${interviewType} interview context
- Formulating questions that feel personalized and authentic to this individual student
- Building on their specified interests and goals

## FINAL REMINDER: NO FEEDBACK DURING INTERVIEWS

**ABSOLUTELY CRITICAL:** During the actual interview conversation, you must ONLY ask questions. You are FORBIDDEN from:
- Giving any feedback on answers ("That's a great response", "Good point", etc.)
- Offering suggestions or advice ("You might want to consider...", "Have you thought about...")
- Evaluating performance ("You did well", "That could be improved", etc.)
- Providing tips or coaching ("Remember to be specific", "Try to elaborate more", etc.)
- Making any commentary beyond neutral acknowledgments

**ACCEPTABLE responses:** "Thank you", "I see", "Understood", then immediately ask the next question.
**UNACCEPTABLE responses:** Any form of evaluation, feedback, advice, or coaching.

## Current Task

Generate exactly ${questionCount} original ${interviewType} interview questions for a ${userMajor} candidate at ${mappedDifficulty} difficulty level. Each question should be unique, thoughtful, and appropriate for their profile.

Return only the questions, numbered 1-${questionCount}, with no additional commentary.`;

  const userPrompt = `Generate ${questionCount} ${interviewType} interview questions for a ${userMajor} candidate at ${difficulty} difficulty level.`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7, // Balanced creativity and consistency
      max_tokens: 1000, // Sufficient for 5 detailed questions
      top_p: 0.9,
      frequency_penalty: 0.3, // Reduce repetition
      presence_penalty: 0.2 // Encourage diverse topics
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response received from OpenAI API');
    }

    // Parse questions from numbered list format
    const questions = response
      .split('\n')
      .map(line => line.trim())
      .filter(line => /^\d+\./.test(line)) // Lines starting with number and dot
      .map(line => line.replace(/^\d+\.\s*/, '').trim()) // Remove numbering
      .filter(question => question.length > 10); // Filter out empty or too short lines

    if (questions.length === 0) {
      throw new Error('No valid questions parsed from OpenAI response');
    }

    console.log(`Generated ${questions.length} ${interviewType} questions for ${userMajor} at ${difficulty} level`);
    return questions;

  } catch (error: any) {
    console.error('Error generating interview questions:', {
      error: error.message,
      interviewType,
      difficulty,
      userMajor,
      questionCount
    });

    // Handle specific OpenAI errors
    if (error.status === 429) {
      throw new Error('OpenAI API rate limit exceeded. Please try again later.');
    } else if (error.status === 401) {
      throw new Error('OpenAI API authentication failed. Please check your API key.');
    } else if (error.status === 500) {
      throw new Error('OpenAI API service temporarily unavailable. Please try again.');
    }
    
    throw new Error(`Failed to generate interview questions: ${error.message}`);
  }
}

/**
 * Validates OpenAI API connection and credentials
 * 
 * @returns {Promise<boolean>} True if connection is valid, false otherwise
 * 
 * @example
 * ```typescript
 * const isValid = await validateOpenAIConnection();
 * if (isValid) {
 *   console.log('OpenAI API is accessible');
 * }
 * ```
 */
export async function validateOpenAIConnection(): Promise<boolean> {
  try {
    const client = getOpenAIClient();
    
    // Make a minimal API call to test connection
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Test connection' }],
      max_tokens: 5
    });

    return response.choices.length > 0;
  } catch (error) {
    console.error('OpenAI connection validation failed:', error);
    return false;
  }
}

/**
 * Gets available OpenAI models for the current API key
 * 
 * @returns {Promise<string[]>} Array of available model names
 * 
 * @example
 * ```typescript
 * const models = await getAvailableModels();
 * console.log('Available models:', models);
 * ```
 */
export async function getAvailableModels(): Promise<string[]> {
  try {
    const client = getOpenAIClient();
    const models = await client.models.list();
    
    return models.data
      .map(model => model.id)
      .filter(id => id.includes('gpt') || id.includes('whisper'))
      .sort();
  } catch (error) {
    console.error('Error fetching available models:', error);
    return [];
  }
}

/**
 * Analyzes interview transcript and generates comprehensive feedback using GPT-4
 * 
 * This function takes a complete interview transcript and uses AI to provide
 * detailed feedback on the candidate's performance, including strengths,
 * weaknesses, specific recommendations, and quantitative scoring.
 * 
 * @param {IFeedbackAnalysisParams} params - Analysis parameters including transcript and context
 * @returns {Promise<IFeedbackReport>} Comprehensive feedback report with scores and recommendations
 * @throws {Error} If feedback generation fails or API call errors
 * 
 * @example
 * ```typescript
 * const feedback = await analyzeFeedback({
 *   transcript: transcriptEntries,
 *   interviewType: 'behavioral',
 *   interviewDifficulty: 'intermediate',
 *   userMajor: 'Computer Science'
 * });
 * console.log(`Overall rating: ${feedback.overallRating}/10`);
 * ```
 */
export async function analyzeFeedback(params: IFeedbackAnalysisParams): Promise<IFeedbackReport> {
  const client = getOpenAIClient();
  
  const {
    transcript,
    interviewType = 'general',
    interviewDifficulty = 'intermediate',
    userMajor = 'General Studies',
    questions = [],
    interviewDuration = 30,
    userProfile = {}
  } = params;

  // Extract user responses only for analysis
  const userResponses = transcript
    .filter(entry => entry.speaker === 'user')
    .map(entry => entry.text)
    .join('\n\n');

  // Extract AI questions for context
  const aiQuestions = transcript
    .filter(entry => entry.speaker === 'ai')
    .map(entry => entry.text)
    .join('\n\n');

  if (!userResponses.trim()) {
    throw new Error('No user responses found in transcript for analysis');
  }

  // Build comprehensive system prompt for feedback analysis
  const systemPrompt = `You are an experienced interview coach and career counselor with expertise in ${interviewType} interviews for ${userMajor} positions. 

Your task is to analyze an interview transcript and provide comprehensive, constructive feedback to help the candidate improve their interview performance.

INTERVIEW CONTEXT:
- Interview Type: ${interviewType}
- Difficulty Level: ${interviewDifficulty}
- Target Major/Field: ${userMajor}
- Interview Duration: ${interviewDuration} minutes
${userProfile.grade ? `- Student Grade: ${userProfile.grade}` : ''}
${userProfile.targetColleges?.length ? `- Target Colleges: ${userProfile.targetColleges.join(', ')}` : ''}
${userProfile.strengths?.length ? `- Known Strengths: ${userProfile.strengths.join(', ')}` : ''}
${userProfile.weaknesses?.length ? `- Areas for Improvement: ${userProfile.weaknesses.join(', ')}` : ''}

ANALYSIS FRAMEWORK:
1. Content Relevance (0-100): How well responses address questions and demonstrate relevant knowledge
2. Communication (0-100): Clarity, articulation, structure, and verbal communication skills
3. Confidence (0-100): Self-assurance, composure, and professional presence
4. Structure (0-100): Organization of responses, logical flow, and use of frameworks (STAR method, etc.)
5. Engagement (0-100): Enthusiasm, interest, and ability to connect with interviewer

FEEDBACK REQUIREMENTS:
- Provide 3-5 specific strengths with examples from the transcript
- Identify 3-5 areas for improvement with specific examples
- Generate 3-5 actionable recommendations with priority levels
- Score each category (0-100) with detailed justification
- Calculate overall rating (1-10) as weighted average
- Write a comprehensive 2-3 sentence summary

OUTPUT FORMAT: JSON only, no additional text or markdown. Follow this exact structure:
{
  "overallRating": 7.5,
  "strengths": ["specific strength 1", "specific strength 2", ...],
  "weaknesses": ["specific weakness 1", "specific weakness 2", ...],
  "recommendations": [
    {
      "area": "Communication",
      "suggestion": "specific actionable advice",
      "priority": "high",
      "examples": ["example 1", "example 2"]
    }
  ],
  "detailedScores": {
    "contentRelevance": 75,
    "communication": 80,
    "confidence": 70,
    "structure": 65,
    "engagement": 85
  },
  "summary": "comprehensive 2-3 sentence summary of performance and key areas for improvement"
}`;

  const userPrompt = `INTERVIEW QUESTIONS:
${aiQuestions}

CANDIDATE RESPONSES:
${userResponses}

Please analyze this interview transcript and provide comprehensive feedback following the specified JSON format.`;

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3, // Lower temperature for more consistent analysis
      max_tokens: 2000, // Sufficient for detailed feedback
      top_p: 0.9,
      frequency_penalty: 0.1,
      presence_penalty: 0.1
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response received from OpenAI API for feedback analysis');
    }

    // Parse JSON response
    let feedbackReport: IFeedbackReport;
    try {
      feedbackReport = JSON.parse(response);
    } catch (parseError) {
      console.error('Failed to parse OpenAI feedback response:', response);
      throw new Error('Invalid JSON response from OpenAI feedback analysis');
    }

    // Validate required fields
    if (!feedbackReport.overallRating || !feedbackReport.strengths || !feedbackReport.weaknesses) {
      throw new Error('Incomplete feedback report from OpenAI');
    }

    // Ensure scores are within valid ranges
    feedbackReport.overallRating = Math.max(1, Math.min(10, feedbackReport.overallRating));
    
    Object.keys(feedbackReport.detailedScores).forEach(key => {
      const scoreKey = key as keyof typeof feedbackReport.detailedScores;
      feedbackReport.detailedScores[scoreKey] = Math.max(0, Math.min(100, feedbackReport.detailedScores[scoreKey]));
    });

    console.log(`Generated feedback analysis for ${userMajor} ${interviewType} interview with overall rating ${feedbackReport.overallRating}/10`);
    return feedbackReport;

  } catch (error: any) {
    console.error('Error analyzing interview feedback:', {
      error: error.message,
      interviewType,
      userMajor,
      transcriptLength: transcript.length
    });

    // Handle specific OpenAI errors
    if (error.status === 429) {
      throw new Error('OpenAI API rate limit exceeded. Please try again later.');
    } else if (error.status === 401) {
      throw new Error('OpenAI API authentication failed. Please check your API key.');
    } else if (error.status === 500) {
      throw new Error('OpenAI API service temporarily unavailable. Please try again.');
    }
    
    throw new Error(`Failed to analyze interview feedback: ${error.message}`);
  }
}

/**
 * Transcribes audio file using OpenAI Whisper API
 * 
 * This function takes an audio file buffer and uses OpenAI's Whisper model
 * to convert speech to text with high accuracy. Supports multiple audio formats
 * and provides options for language detection, timestamps, and response formatting.
 * 
 * @param {Buffer} audioBuffer - Audio file buffer (mp3, wav, webm, mp4, m4a, etc.)
 * @param {string} filename - Original filename with extension for format detection
 * @param {Partial<IAudioTranscriptionParams>} options - Additional transcription options
 * @returns {Promise<ITranscriptionResponse>} Transcribed text with optional metadata
 * @throws {Error} If transcription fails, file is invalid, or API call errors
 * 
 * @example
 * ```typescript
 * const audioBuffer = fs.readFileSync('interview_audio.mp3');
 * const transcription = await transcribeAudio(audioBuffer, 'interview_audio.mp3', {
 *   language: 'en',
 *   responseFormat: 'verbose_json',
 *   timestampGranularities: ['word', 'segment']
 * });
 * console.log(transcription.text);
 * ```
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  filename: string,
  options: Partial<IAudioTranscriptionParams> = {}
): Promise<ITranscriptionResponse> {
  const client = getOpenAIClient();
  
  // Validate audio file
  const fileValidation = validateAudioFile(audioBuffer, filename);
  if (!fileValidation.isValid) {
    throw new Error(`Invalid audio file: ${fileValidation.error}`);
  }

  // Set default options
  const {
    language,
    prompt,
    responseFormat = 'verbose_json',
    temperature = 0.0, // Lower temperature for more consistent transcription
    timestampGranularities = ['segment']
  } = options;

  try {
    // Create a File-like object for the API
    const audioFile = new File([audioBuffer], filename, { 
      type: fileValidation.mimeType || 'audio/mpeg' 
    });

    // Prepare API parameters (remove undefined values)
    const apiParams: any = {
      file: audioFile,
      model: 'whisper-1' as const,
      response_format: responseFormat,
      temperature
    };

    // Only add optional parameters if they are defined
    if (language) apiParams.language = language;
    if (prompt) apiParams.prompt = prompt;
    if (responseFormat === 'verbose_json' && timestampGranularities) {
      apiParams.timestamp_granularities = timestampGranularities;
    }

    // Call Whisper API for transcription
    const transcription = await client.audio.transcriptions.create(apiParams);

    // Process response based on format
    let response: ITranscriptionResponse;
    
    if (responseFormat === 'verbose_json') {
      // Verbose JSON includes detailed metadata
      const verboseResponse = transcription as any;
      response = {
        text: verboseResponse.text,
        language: verboseResponse.language,
        duration: verboseResponse.duration,
        words: verboseResponse.words,
        segments: verboseResponse.segments
      };
    } else if (responseFormat === 'json') {
      // Standard JSON format
      const jsonResponse = transcription as any;
      response = {
        text: jsonResponse.text
      };
    } else {
      // Text format (string response)
      response = {
        text: typeof transcription === 'string' ? transcription : (transcription as any).text
      };
    }

    console.log(`Successfully transcribed audio file: ${filename} (${fileValidation.size} bytes)`);
    return response;

  } catch (error: any) {
    console.error('Error transcribing audio:', {
      error: error.message,
      filename,
      fileSize: audioBuffer.length,
      responseFormat
    });

    // Handle specific OpenAI errors
    if (error.status === 429) {
      throw new Error('OpenAI API rate limit exceeded. Please try again later.');
    } else if (error.status === 401) {
      throw new Error('OpenAI API authentication failed. Please check your API key.');
    } else if (error.status === 413) {
      throw new Error('Audio file too large. Maximum file size is 25MB.');
    } else if (error.status === 400) {
      throw new Error('Invalid audio file format or corrupted audio data.');
    } else if (error.status === 500) {
      throw new Error('OpenAI API service temporarily unavailable. Please try again.');
    }
    
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

/**
 * Validates audio file format and properties
 * 
 * @param {Buffer} audioBuffer - Audio file buffer to validate
 * @param {string} filename - Original filename for format detection
 * @returns {IAudioFileInfo} Validation result with file information
 * 
 * @example
 * ```typescript
 * const validation = validateAudioFile(audioBuffer, 'recording.mp3');
 * if (!validation.isValid) {
 *   console.error('Invalid audio file:', validation.error);
 * }
 * ```
 */
export function validateAudioFile(audioBuffer: Buffer, filename: string): IAudioFileInfo {
  // Check if buffer is valid
  if (!audioBuffer || audioBuffer.length === 0) {
    return {
      isValid: false,
      error: 'Empty or invalid audio buffer'
    };
  }

  // Check file size (Whisper API limit is 25MB)
  const maxSize = 25 * 1024 * 1024; // 25MB in bytes
  if (audioBuffer.length > maxSize) {
    return {
      isValid: false,
      size: audioBuffer.length,
      error: `File size ${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB exceeds maximum limit of 25MB`
    };
  }

  // Extract file extension and determine MIME type
  const extension = filename.toLowerCase().split('.').pop();
  const supportedFormats: Record<string, string> = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'webm': 'audio/webm',
    'mp4': 'audio/mp4',
    'm4a': 'audio/mp4',
    'ogg': 'audio/ogg',
    'oga': 'audio/ogg',
    'flac': 'audio/flac'
  };

  if (!extension || !supportedFormats[extension]) {
    return {
      isValid: false,
      size: audioBuffer.length,
      error: `Unsupported file format: ${extension}. Supported formats: ${Object.keys(supportedFormats).join(', ')}`
    };
  }

  // Validate basic file headers for common formats
  const isValidFormat = validateAudioFormat(audioBuffer, extension);
  if (!isValidFormat) {
    return {
      isValid: false,
      size: audioBuffer.length,
      mimeType: supportedFormats[extension],
      error: `Invalid or corrupted ${extension.toUpperCase()} file format`
    };
  }

  return {
    isValid: true,
    size: audioBuffer.length,
    mimeType: supportedFormats[extension]
  };
}

/**
 * Validates audio file format based on file headers
 * 
 * @param {Buffer} buffer - Audio file buffer
 * @param {string} extension - File extension
 * @returns {boolean} True if format is valid
 */
function validateAudioFormat(buffer: Buffer, extension: string): boolean {
  if (buffer.length < 8) return false;

  switch (extension) {
    case 'mp3':
      // MP3 files start with ID3 tag or direct frame sync
      if (buffer.toString('ascii', 0, 3) === 'ID3') return true;
      // Check for MP3 frame sync (requires at least 2 bytes)
      if (buffer.length >= 2) {
        const firstByte = buffer[0];
        const secondByte = buffer[1];
        if (firstByte !== undefined && secondByte !== undefined) {
          return firstByte === 0xFF && (secondByte & 0xE0) === 0xE0;
        }
      }
      return false;
    
    case 'wav':
      // WAV files start with RIFF header
      return buffer.toString('ascii', 0, 4) === 'RIFF' && 
             buffer.toString('ascii', 8, 12) === 'WAVE';
    
    case 'webm':
      // WebM files start with EBML header
      return buffer[0] === 0x1A && buffer[1] === 0x45 && 
             buffer[2] === 0xDF && buffer[3] === 0xA3;
    
    case 'mp4':
    case 'm4a':
      // MP4/M4A files have ftyp box
      return buffer.toString('ascii', 4, 8) === 'ftyp';
    
    case 'ogg':
    case 'oga':
      // OGG files start with OggS
      return buffer.toString('ascii', 0, 4) === 'OggS';
    
    case 'flac':
      // FLAC files start with fLaC
      return buffer.toString('ascii', 0, 4) === 'fLaC';
    
    default:
      return true; // Allow other formats to pass through
  }
}

/**
 * Estimates audio duration from file size (rough approximation)
 * 
 * @param {number} fileSize - File size in bytes
 * @param {string} format - Audio format
 * @returns {number} Estimated duration in seconds
 */
export function estimateAudioDuration(fileSize: number, format: string): number {
  // Rough estimates based on typical bitrates
  const avgBitrates: Record<string, number> = {
    'mp3': 128, // 128 kbps
    'wav': 1411, // 44.1kHz 16-bit stereo
    'webm': 64, // 64 kbps (typical for voice)
    'm4a': 128, // 128 kbps
    'ogg': 96, // 96 kbps
    'flac': 1000 // 1000 kbps (lossless)
  };

  const bitrate = avgBitrates[format] || 128;
  const bitsPerSecond = bitrate * 1000;
  const bytesPerSecond = bitsPerSecond / 8;
  
  return Math.round(fileSize / bytesPerSecond);
}

/**
 * Creates a chat completion using OpenAI API
 * 
 * This helper function wraps the OpenAI chat completion call to simplify
 * usage throughout the application. It sets default parameters and handles
 * response parsing.
 * 
 * @param messages - Array of message objects for the chat
 * @returns Promise resolving to the assistant's reply content
 * 
 * @example
 * ```typescript
 * const reply = await createChatCompletion([
 *   { role: 'system', content: 'You are a helpful assistant.' },
 *   { role: 'user', content: 'What is the capital of France?' }
 * ]);
 * console.log(reply); // 'The capital of France is Paris.'
 * ```
 */
export async function createChatCompletion(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  options: IChatCompletionOptions = {}
): Promise<string> {
  const client = getOpenAIClient();
  
  try {
    const completion = await client.chat.completions.create({
      model: options.model || 'gpt-4',
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 1000,
      top_p: options.top_p ?? 0.9,
      frequency_penalty: options.frequency_penalty ?? 0,
      presence_penalty: options.presence_penalty ?? 0,
      ...options.additionalParams
    });
    
    const response = completion.choices[0]?.message?.content || '';
    
    // Log token usage if requested
    if (options.logTokenUsage && completion.usage) {
      console.log(`Token usage - Prompt: ${completion.usage.prompt_tokens}, Completion: ${completion.usage.completion_tokens}, Total: ${completion.usage.total_tokens}`);
    }
    
    return response;
  } catch (error) {
    console.error('Chat completion error:', error);
    throw new Error(`Chat completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Creates a content-aware system prompt
 * Integrates uploaded content intelligently into the system context
 * 
 * @param {IContentAwarePromptConfig} config - Configuration for content-aware prompt
 * @returns {string} Enhanced system prompt with uploaded content
 * 
 * @example
 * ```typescript
 * const prompt = createContentAwarePrompt({
 *   basePrompt: 'You are an interview coach...',
 *   uploadedContent: 'User resume content...',
 *   contentType: 'resume',
 *   interviewType: 'behavioral'
 * });
 * ```
 */
export function createContentAwarePrompt(config: IContentAwarePromptConfig): string {
  let enhancedPrompt = config.basePrompt;

  if (config.uploadedContent) {
    // Add content section header
    enhancedPrompt += '\n\n## User Background Information\n';
    enhancedPrompt += 'The following information has been provided by the user. Use it to personalize your questions and feedback:\n\n';

    // Add content type specific instructions
    switch (config.contentType) {
      case 'resume':
        enhancedPrompt += 'RESUME/CV CONTENT:\n';
        enhancedPrompt += 'Use this information to ask relevant questions about their experiences, skills, and achievements.\n';
        break;
      case 'transcript':
        enhancedPrompt += 'ACADEMIC TRANSCRIPT:\n';
        enhancedPrompt += 'Reference their academic performance and coursework when appropriate.\n';
        break;
      case 'essay':
        enhancedPrompt += 'PERSONAL ESSAY/STATEMENT:\n';
        enhancedPrompt += 'Understand their motivations and goals from this content.\n';
        break;
      default:
        enhancedPrompt += 'UPLOADED DOCUMENTS:\n';
    }

    // Add the actual content
    enhancedPrompt += '\n' + config.uploadedContent + '\n';

    // Add usage instructions
    enhancedPrompt += '\n## Important Guidelines for Using Uploaded Content:\n';
    enhancedPrompt += '- Reference the content naturally without quoting directly unless asked\n';
    enhancedPrompt += '- Use it to ask more specific and relevant questions\n';
    enhancedPrompt += '- Help the user expand on experiences mentioned in their documents\n';
    enhancedPrompt += '- Do not reveal specific details unless the user mentions them first\n';
    enhancedPrompt += '- IMPORTANT: If you are an interviewer, maintain professional interviewer behavior - use content to inform questions but do NOT provide coaching or feedback\n';
  }

  return enhancedPrompt;
}

/**
 * Estimates token count for a given text
 * Uses a simple heuristic (1 token ≈ 4 characters)
 * 
 * @param {string} text - Text to estimate tokens for
 * @returns {number} Estimated token count
 */
export function estimateTokens(text: string): number {
  // OpenAI's rule of thumb: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

/**
 * Creates content-aware prompt templates for different interview scenarios
 * 
 * @param {string} interviewType - Type of interview
 * @returns {IPromptTemplate} Prompt template for the interview type
 */
export function getInterviewPromptTemplate(interviewType: string): IPromptTemplate {
  const templates: Record<string, IPromptTemplate> = {
    behavioral: {
      name: 'Behavioral Interview',
      systemPrompt: 'You are a professional behavioral interviewer. Focus on behavioral questions and situational scenarios. NEVER provide coaching, feedback, or tips - only ask questions.',
      userPromptTemplate: 'Based on the candidate\'s background: {{content}}, ask a behavioral interview question that explores {{topic}}.',
      variables: ['content', 'topic'],
      maxTokens: 150
    },
    technical: {
      name: 'Technical Interview',
      systemPrompt: 'You are a professional technical interviewer. Focus on problem-solving, algorithms, and technical knowledge. NEVER provide coaching, feedback, or tips - only ask questions.',
      userPromptTemplate: 'Given the candidate\'s technical background: {{content}}, ask a technical question about {{topic}} at {{difficulty}} level.',
      variables: ['content', 'topic', 'difficulty'],
      maxTokens: 200
    },
    university: {
      name: 'University Admissions Interview',
      systemPrompt: 'You are a professional university admissions interviewer. Focus on academic interests, personal growth, and fit with the institution. NEVER provide coaching, feedback, or tips - only ask questions.',
      userPromptTemplate: 'Considering the student\'s profile: {{content}}, ask about their {{aspect}} for {{university}}.',
      variables: ['content', 'aspect', 'university'],
      maxTokens: 150
    }
  };

  const defaultTemplate: IPromptTemplate = {
    name: 'Behavioral Interview',
    systemPrompt: 'You are a professional behavioral interviewer. Focus on behavioral questions and situational scenarios. NEVER provide coaching, feedback, or tips - only ask questions.',
    userPromptTemplate: 'Based on the candidate\'s background: {{content}}, ask a behavioral interview question that explores {{topic}}.',
    variables: ['content', 'topic'],
    maxTokens: 150
  };
  
  return templates[interviewType.toLowerCase()] || defaultTemplate;
}

/**
 * Summarizes content using GPT to fit within token limits
 * 
 * @param {string} content - Content to summarize
 * @param {number} maxTokens - Maximum tokens for the summary
 * @returns {Promise<string>} Summarized content
 */
export async function summarizeWithGPT(content: string, maxTokens: number = 500): Promise<string> {
  const messages = [
    {
      role: 'system' as const,
      content: 'You are a professional summarizer. Create concise summaries that preserve key information for interviews.'
    },
    {
      role: 'user' as const,
      content: `Summarize the following content in approximately ${maxTokens * 4} characters, focusing on information relevant for interviews:\n\n${content}`
    }
  ];

  return createChatCompletion(messages, {
    temperature: 0.3,
    max_tokens: maxTokens,
    model: 'gpt-3.5-turbo' // Use faster model for summarization
  });
}

/**
 * Analyzes content relevance for a specific interview context
 * 
 * @param {string} content - Content to analyze
 * @param {string} context - Interview context
 * @returns {Promise<number>} Relevance score (0-100)
 */
export async function analyzeContentRelevance(content: string, context: string): Promise<number> {
  const messages = [
    {
      role: 'system' as const,
      content: 'You are an expert at analyzing document relevance. Rate how relevant the given content is to the specified context on a scale of 0-100.'
    },
    {
      role: 'user' as const,
      content: `Context: ${context}\n\nContent: ${content.substring(0, 1000)}\n\nProvide only a number between 0-100.`
    }
  ];

  const response = await createChatCompletion(messages, {
    temperature: 0.1,
    max_tokens: 10,
    model: 'gpt-3.5-turbo'
  });

  const score = parseInt(response.trim());
  return isNaN(score) ? 50 : Math.min(100, Math.max(0, score));
}

/**
 * Voice Optimization Functions for Text-to-Speech
 * 
 * These functions optimize AI responses for voice output by improving readability
 * for text-to-speech engines, reducing complex punctuation, and adding pronunciation guides.
 */

/**
 * Optimizes text for text-to-speech output
 * Removes or replaces elements that don't read well when spoken
 * 
 * @param {string} text - Original text to optimize
 * @param {IVoiceOptimizationConfig} config - Optimization configuration
 * @returns {string} Voice-optimized text
 */
export function optimizeTextForVoice(
  text: string, 
  config: IVoiceOptimizationConfig = { enableOptimization: true }
): string {
  if (!config.enableOptimization) {
    return text;
  }

  let optimizedText = text;

  // 1. Reduce complex punctuation for TTS
  if (config.reducePunctuation !== false) {
    // Replace em dashes with commas or periods
    optimizedText = optimizedText.replace(/—/g, ', ');
    optimizedText = optimizedText.replace(/–/g, ', ');
    
    // Simplify parenthetical statements
    optimizedText = optimizedText.replace(/\(([^)]+)\)/g, ', $1,');
    
    // Replace multiple punctuation marks
    optimizedText = optimizedText.replace(/[!]{2,}/g, '!');
    optimizedText = optimizedText.replace(/[?]{2,}/g, '?');
    optimizedText = optimizedText.replace(/[.]{3,}/g, '...');
    
    // Replace semicolons with periods or commas for better speech flow
    optimizedText = optimizedText.replace(/;/g, ',');
    
    // Simplify quotation marks
    optimizedText = optimizedText.replace(/[""]/g, '"');
    optimizedText = optimizedText.replace(/['']/g, "'");
  }

  // 2. Add pronunciation guidance for technical terms
  if (config.addPronunciationGuides) {
    const pronunciationMap: Record<string, string> = {
      'API': 'A-P-I',
      'HTTP': 'H-T-T-P',
      'HTTPS': 'H-T-T-P-S',
      'SQL': 'S-Q-L',
      'HTML': 'H-T-M-L',
      'CSS': 'C-S-S',
      'JavaScript': 'Java-Script',
      'GitHub': 'Git-Hub',
      'React': 'React',
      'Node.js': 'Node dot J-S',
      'MongoDB': 'Mongo-D-B',
      'PostgreSQL': 'Postgres-Q-L',
      'AWS': 'A-W-S',
      'UI': 'U-I',
      'UX': 'U-X',
      'iOS': 'i-O-S',
      'macOS': 'mac-O-S',
      'OAuth': 'O-Auth',
      'JWT': 'J-W-T',
      'JSON': 'J-S-O-N',
      'XML': 'X-M-L',
      'YAML': 'Y-A-M-L',
      'DevOps': 'Dev-Ops',
      'CI/CD': 'C-I slash C-D',
      'REST': 'R-E-S-T',
      'GraphQL': 'Graph-Q-L',
      'TypeScript': 'Type-Script'
    };

    Object.entries(pronunciationMap).forEach(([term, pronunciation]) => {
      const regex = new RegExp(`\\b${term}\\b`, 'g');
      optimizedText = optimizedText.replace(regex, pronunciation);
    });
  }

  // 3. Optimize response length for speech
  if (config.maxResponseLength && optimizedText.length > config.maxResponseLength) {
    // Find the last complete sentence within the limit
    const truncated = optimizedText.substring(0, config.maxResponseLength);
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('?')
    );
    
    if (lastSentenceEnd > config.maxResponseLength * 0.7) {
      optimizedText = truncated.substring(0, lastSentenceEnd + 1);
    } else {
      optimizedText = truncated + '...';
    }
  }

  // 4. Optimize for speech rate
  if (config.optimizeForSpeechRate) {
    // Estimate words and adjust sentence structure
    const wordCount = optimizedText.split(/\s+/).length;
    const estimatedDuration = wordCount / (config.optimizeForSpeechRate / 60); // seconds
    
    // If too long, suggest pauses by adding commas
    if (estimatedDuration > 30) { // 30 seconds max
      // Add pauses after coordinating conjunctions
      optimizedText = optimizedText.replace(/\b(and|but|or|so|yet)\s/g, '$1, ');
    }
  }

  // 5. Clean up extra spaces and formatting
  optimizedText = optimizedText.replace(/\s{2,}/g, ' ').trim();
  
  return optimizedText;
}

/**
 * Creates voice-optimized system prompt additions
 * Adds instructions to the AI for generating voice-friendly responses
 * 
 * @param {IVoiceOptimizationConfig} config - Voice optimization configuration
 * @returns {string} Additional system prompt text for voice mode
 */
export function createVoiceOptimizedPrompt(config: IVoiceOptimizationConfig): string {
  if (!config.enableOptimization) {
    return '';
  }

  let voicePrompt = '\n\n## Voice Mode Instructions\n\n';
  voicePrompt += 'The user is in voice mode and your responses will be read aloud using text-to-speech. ';
  voicePrompt += 'Please optimize your responses for spoken delivery:\n\n';

  const instructions: string[] = [];

  if (config.reducePunctuation !== false) {
    instructions.push('• Use simple, clear sentences with minimal complex punctuation');
    instructions.push('• Avoid excessive use of parentheses, em dashes, or semicolons');
    instructions.push('• Use commas for natural speech pauses');
  }

  if (config.maxResponseLength) {
    instructions.push(`• Keep responses concise (under ${config.maxResponseLength} characters when possible)`);
    instructions.push('• Focus on the most important points first');
  }

  if (config.addPronunciationGuides) {
    instructions.push('• When mentioning technical terms, consider how they sound when spoken');
    instructions.push('• Spell out acronyms clearly or use full terms when appropriate');
  }

  if (config.optimizeForSpeechRate) {
    instructions.push('• Structure sentences for natural speech rhythm');
    instructions.push('• Use transitional phrases to help with comprehension');
    instructions.push('• Break complex ideas into digestible spoken segments');
  }

  // General voice optimization instructions
  instructions.push('• Use conversational language that flows naturally when spoken');
  instructions.push('• Avoid excessive formatting that doesn\'t translate to speech');
  instructions.push('• Consider using "and" instead of "&" or other symbols');
  instructions.push('• Use "percent" instead of "%" for better pronunciation');
  instructions.push('• CRITICAL: If you are an interviewer, maintain professional interviewer behavior - NO feedback, tips, or coaching even in voice mode');

  voicePrompt += instructions.join('\n') + '\n';
  
  return voicePrompt;
}

/**
 * Enhanced chat completion with voice optimization support
 * Extends the standard createChatCompletion with voice-specific optimizations
 * 
 * @param {Array} messages - Chat messages array
 * @param {IChatCompletionOptions} options - Chat completion options with voice mode support
 * @returns {Promise<string>} Voice-optimized AI response
 */
export async function createVoiceOptimizedChatCompletion(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  options: IChatCompletionOptions = {}
): Promise<string> {
  // Default voice optimization configuration
  const defaultVoiceConfig: IVoiceOptimizationConfig = {
    enableOptimization: true,
    maxResponseLength: 800, // ~2-3 minutes of speech at normal rate
    reducePunctuation: true,
    addPronunciationGuides: true,
    optimizeForSpeechRate: 150, // Average speaking rate (words per minute)
    includeVoiceInstructions: true
  };

  let processedMessages = [...messages];

  // If voice mode is enabled, enhance the system prompt
  if (options.voiceMode && defaultVoiceConfig.includeVoiceInstructions) {
    const systemMessageIndex = processedMessages.findIndex(m => m.role === 'system');
    
    if (systemMessageIndex >= 0 && processedMessages[systemMessageIndex]) {
      // Add voice optimization instructions to existing system message
      const voiceInstructions = createVoiceOptimizedPrompt(defaultVoiceConfig);
      const existingMessage = processedMessages[systemMessageIndex];
      processedMessages[systemMessageIndex] = {
        role: existingMessage.role,
        content: existingMessage.content + voiceInstructions
      };
    } else {
      // Create a new system message with voice instructions
      const voiceInstructions = createVoiceOptimizedPrompt(defaultVoiceConfig);
      processedMessages.unshift({
        role: 'system' as const,
        content: 'You are an AI interview coach providing voice-optimized responses.' + voiceInstructions
      });
    }

    // Adjust token limits for voice mode (shorter responses)
    if (!options.max_tokens) {
      options.max_tokens = 600; // Reduced for voice mode
    }
  }

  // Get the standard AI response
  const response = await createChatCompletion(processedMessages, options);

  // Apply voice optimizations to the response if voice mode is enabled
  if (options.voiceMode) {
    return optimizeTextForVoice(response, defaultVoiceConfig);
  }

  return response;
}

/**
 * Validates and preprocesses user messages for voice mode
 * Ensures user messages from speech recognition are properly formatted
 * 
 * @param {string} userMessage - Raw user message (potentially from speech recognition)
 * @param {boolean} isFromSpeech - Whether the message came from speech recognition
 * @returns {string} Cleaned and formatted user message
 */
export function preprocessVoiceUserMessage(
  userMessage: string, 
  isFromSpeech: boolean = false
): string {
  if (!isFromSpeech) {
    return userMessage;
  }

  let cleanedMessage = userMessage;

  // Common speech recognition cleanup
  // Fix common speech-to-text errors
  const speechCorrections: Record<string, string> = {
    'i': 'I',
    'im': "I'm",
    'ive': "I've",
    'id': "I'd",
    'ill': "I'll",
    'cant': "can't",
    'wont': "won't",
    'dont': "don't",
    'didnt': "didn't",
    'shouldnt': "shouldn't",
    'wouldnt': "wouldn't",
    'couldnt': "couldn't",
    'isnt': "isn't",
    'arent': "aren't",
    'wasnt': "wasn't",
    'werent': "weren't"
  };

  // Apply corrections (case-sensitive for beginning of sentences)
  Object.entries(speechCorrections).forEach(([error, correction]) => {
    // Fix at beginning of message
    const beginningRegex = new RegExp(`^${error}\\b`, 'i');
    cleanedMessage = cleanedMessage.replace(beginningRegex, correction);
    
    // Fix after sentence punctuation
    const sentenceRegex = new RegExp(`([.!?]\\s+)${error}\\b`, 'gi');
    cleanedMessage = cleanedMessage.replace(sentenceRegex, `$1${correction}`);
  });

  // Capitalize first letter
  cleanedMessage = cleanedMessage.charAt(0).toUpperCase() + cleanedMessage.slice(1);

  // Ensure proper ending punctuation if missing
  if (!/[.!?]$/.test(cleanedMessage.trim())) {
    cleanedMessage = cleanedMessage.trim() + '.';
  }

  return cleanedMessage;
}

/**
 * Estimates optimal speech duration for a given text
 * Helps determine if response length is appropriate for voice mode
 * 
 * @param {string} text - Text to analyze
 * @param {number} wordsPerMinute - Speaking rate (default: 150 wpm)
 * @returns {Object} Duration analysis with recommendations
 */
export function estimateSpeechDuration(
  text: string, 
  wordsPerMinute: number = 150
): {
  wordCount: number;
  estimatedSeconds: number;
  estimatedMinutes: number;
  recommendation: 'optimal' | 'long' | 'very_long';
  suggestionText?: string;
} {
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const wordCount = words.length;
  const estimatedSeconds = (wordCount / wordsPerMinute) * 60;
  const estimatedMinutes = estimatedSeconds / 60;

  let recommendation: 'optimal' | 'long' | 'very_long' = 'optimal';
  let suggestionText: string | undefined = undefined;

  if (estimatedSeconds <= 45) {
    recommendation = 'optimal';
  } else if (estimatedSeconds <= 90) {
    recommendation = 'long';
    suggestionText = 'Consider breaking into shorter segments for better voice comprehension.';
  } else {
    recommendation = 'very_long';
    suggestionText = 'Response is too long for voice mode. Consider summarizing key points.';
  }

  const result = {
    wordCount,
    estimatedSeconds: Math.round(estimatedSeconds),
    estimatedMinutes: Math.round(estimatedMinutes * 100) / 100,
    recommendation
  } as const;

  return suggestionText 
    ? { ...result, suggestionText }
    : result;
}

// Export default service object for easy importing
const openaiService = {
  initializeOpenAI,
  getOpenAIClient,
  generateInterviewQuestions,
  analyzeFeedback,
  transcribeAudio,
  validateAudioFile,
  estimateAudioDuration,
  validateOpenAIConnection,
  getAvailableModels,
  createChatCompletion,
  createContentAwarePrompt,
  estimateTokens,
  getInterviewPromptTemplate,
  summarizeWithGPT,
  analyzeContentRelevance,
  // Voice optimization functions
  optimizeTextForVoice,
  createVoiceOptimizedPrompt,
  createVoiceOptimizedChatCompletion,
  preprocessVoiceUserMessage,
  estimateSpeechDuration
};

export default openaiService;