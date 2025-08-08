import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useUploadContext } from '../context/UploadContext';
import { submitInterviewTranscript, generateAIRating as apiGenerateAIRating, retryApiCall, getUserFriendlyErrorMessage, getProgressMessage } from '../services/api';
import { speakText, stopSpeaking, getTextToSpeechStatus, setTextToSpeechCallbacks } from '../services/textToSpeech';
import ProgressIndicator from './ProgressIndicator';
import VoiceModeToggle from './VoiceModeToggle';
import VoiceTutorial from './VoiceTutorial';
import VoiceInput from './VoiceInput';

export default function ChatBox({ 
  difficulty, 
  user, 
  aiRating, 
  setAiRating,
  ratingLoading, 
  setRatingLoading,
  ratingError, 
  setRatingError,
  showVoiceTutorial,
  setShowVoiceTutorial
}) {
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hello! Ready to practice?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useUploadedContent, setUseUploadedContent] = useState(true);
  const [showContentIndicator, setShowContentIndicator] = useState(false);
  
  // Enhanced interview state management
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [isInterviewCompleted, setIsInterviewCompleted] = useState(true); // Start as completed
  
  // AI Rating state management (Step 9) - using props from App.jsx
  const [transcriptId, setTranscriptId] = useState(null);
  const [interviewStartTime, setInterviewStartTime] = useState(null);
  
  // Progress indicator state (Step 14)
  const [showProgressIndicator, setShowProgressIndicator] = useState(false);
  const [progressStep, setProgressStep] = useState(1);
  
  // End interview button state (Step 15)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [endInterviewButtonState, setEndInterviewButtonState] = useState('idle'); // 'idle', 'confirming', 'processing', 'complete'
  
  // Voice Mode state management (Step 1)
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [speechError, setSpeechError] = useState(null);
  
  // Voice Mode Onboarding state management (Step 12) - now managed by App.jsx
  const [isFirstTimeVoiceUser, setIsFirstTimeVoiceUser] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(null);
  const [showOnboardingTips, setShowOnboardingTips] = useState(false);
  const [voiceCalibrationComplete, setVoiceCalibrationComplete] = useState(false);
  
  // Map difficulty levels from LevelSelector to prompt expectations
  const mapDifficulty = (level) => {
    const mapping = {
      'Beginner': 'easy',
      'Advanced': 'advanced',
      'Expert': 'hard'
    };
    return mapping[level] || 'advanced';
  };
  
  // Extract previous AI questions from conversation history
  const extractPreviousQuestions = () => {
    return messages
      .filter(msg => msg.sender === 'ai')
      .map(msg => msg.text)
      .filter(text => text.includes('?')) // Only include messages that are questions
      .slice(-10); // Keep last 10 questions to avoid prompt being too long
  };
  
  // Get upload context
  const { uploadedFiles, refreshFiles } = useUploadContext();
  const hasContent = uploadedFiles && uploadedFiles.length > 0;

  /**
   * Read speech settings from localStorage
   * @returns {Object} Speech settings object with autoPlayAI flag
   */
  const getSpeechSettings = () => {
    try {
      const saved = localStorage.getItem('speechSettings');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load speech settings:', error);
    }
    // Return default settings if not found or error
    return {
      autoPlayAI: true,
      preferredGender: 'female'
    };
  };

  /**
   * Automatically speak AI response if voice mode and auto-play are enabled
   * @param {string} text - AI response text to speak
   * @param {boolean} interrupt - Whether to interrupt current speech (default: false)
   */
  const handleAutoSpeakAIResponse = async (text, interrupt = false) => {
    // Only auto-speak if in voice mode
    if (!isVoiceMode) {
      return;
    }

    const speechSettings = getSpeechSettings();
    
    // Only auto-speak if auto-play is enabled
    if (!speechSettings.autoPlayAI) {
      return;
    }

    try {
      console.log('Auto-speaking AI response in voice mode', interrupt ? '(with interruption)' : '');
      await speakText(text, {
        interrupt: interrupt, // Allow interruption when specified
        priority: interrupt ? 'high' : 'normal'
      });
    } catch (error) {
      console.error('Failed to auto-speak AI response:', error);
      // Don't show error to user - this is a background enhancement
    }
  };
   
   // Log upload context for debugging
   useEffect(() => {
     console.log('Upload context files:', uploadedFiles);
     console.log('Has content:', hasContent);
   }, [uploadedFiles, hasContent]);

   // Check for first-time voice user on component mount (Step 12)
   useEffect(() => {
     checkFirstTimeVoiceUser();
   }, []);

   // Sync TTS speaking state with ChatBox state
   useEffect(() => {
     // Set up callbacks to sync TTS state with component state
     setTextToSpeechCallbacks({
       onStart: () => {
         setIsSpeaking(true);
         console.log('AI started speaking - voice input disabled');
       },
       onEnd: () => {
         setIsSpeaking(false);
         console.log('AI finished speaking - voice input enabled');
       },
       onError: () => {
         setIsSpeaking(false);
         console.log('AI speech error - voice input enabled');
       }
     });

     // Initial sync with current TTS status
     const currentStatus = getTextToSpeechStatus();
     setIsSpeaking(currentStatus.isSpeaking);

     // Set up interval to periodically sync state (backup mechanism)
     const syncInterval = setInterval(() => {
       const status = getTextToSpeechStatus();
       setIsSpeaking(status.isSpeaking);
     }, 500); // Check every 500ms

     // Cleanup interval on unmount
     return () => {
       clearInterval(syncInterval);
       // Clear callbacks
       setTextToSpeechCallbacks({});
     };
   }, []);

   /**
    * Check if this is the user's first time using voice mode
    * Sets onboarding flags based on localStorage data
    */
   const checkFirstTimeVoiceUser = () => {
     try {
       const hasUsedVoiceBefore = localStorage.getItem('voiceMode_hasUsed') === 'true';
       const tutorialCompleted = localStorage.getItem('voiceTutorialCompleted') === 'true';
       const onboardingCompleted = localStorage.getItem('voiceOnboardingCompleted') === 'true';
       
       // For development/testing: allow bypassing tutorial with a special flag
       const skipTutorialForever = localStorage.getItem('voiceTutorial_skipForever') === 'true';
       
       const isFirstTime = !hasUsedVoiceBefore && !tutorialCompleted && !onboardingCompleted && !skipTutorialForever;
       
       setIsFirstTimeVoiceUser(isFirstTime);
       
       // Check if calibration was completed
       const calibrationStatus = localStorage.getItem('voiceCalibrationCompleted');
       setVoiceCalibrationComplete(calibrationStatus === 'true');
       
       console.log('Voice user status:', {
         isFirstTime,
         hasUsedVoiceBefore,
         tutorialCompleted,
         onboardingCompleted,
         calibrationComplete: calibrationStatus === 'true',
         skipTutorialForever
       });
       
     } catch (error) {
       console.warn('Error checking first-time voice user status:', error);
       setIsFirstTimeVoiceUser(true); // Default to first-time if error
     }
   };

  // Check if AI response references uploaded content
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender === 'ai' && hasContent && useUploadedContent && user) {
        const referencePhrases = ['see you', 'notice you', 'based on your', 'according to', 'your background', 'your experience', 'your documents', 'your uploaded'];
        const hasReference = referencePhrases.some(phrase => 
          lastMessage.text.toLowerCase().includes(phrase)
        );
        setShowContentIndicator(hasReference);
      }
    }
  }, [messages, hasContent, useUploadedContent, user]);

  // Enhanced logic to detect when interview actually starts
  useEffect(() => {
    // Don't auto-start if we're in the initial completed state with just the greeting
    if (messages.length <= 1) return;
    
    if (messages.length > 1 && !isInterviewActive && !isInterviewCompleted) {
      // Check if there's been user interaction beyond the initial greeting
      const hasUserMessages = messages.some(msg => msg.sender === 'user');
      if (hasUserMessages) {
        setIsInterviewActive(true);
        console.log('Interview automatically detected as active');
      }
    }
  }, [messages, isInterviewActive, isInterviewCompleted]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading || isInterviewCompleted) return;

    const userMessage = { sender: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      console.log('Sending chat request with:', {
        user: !!user,
        token: !!user?.token,
        includeUploadedContent: useUploadedContent && hasContent && user,
        hasContent
      });
      
      // Convert conversation history to OpenAI format
      const convertedMessages = [
        {
          role: 'system',
          content: `# AI College Interview Coach System Prompt

**CURRENT DIFFICULTY LEVEL: ${mapDifficulty(difficulty) === 'easy' ? 'EASY' : mapDifficulty(difficulty) === 'hard' ? 'HARD' : 'ADVANCED'}**

${extractPreviousQuestions().length > 0 ? `## CRITICAL: Previously Asked Questions (AVOID REPEATING THESE)
You have already asked these questions in this conversation. DO NOT repeat them or ask similar variations:
${extractPreviousQuestions().map((q, i) => `${i + 1}. ${q}`).join('\n')}

**IMPORTANT:** Generate completely NEW questions that are different in both content and structure from the above. Avoid similar patterns or rephrased versions of these questions.
` : ''}

You are a PROFESSIONAL COLLEGE ADMISSIONS INTERVIEWER conducting practice interviews for students applying to universities. You must simulate an AUTHENTIC, REALISTIC college interview experience.

## CRITICAL DEFAULT BEHAVIOR
**When NO user profile information is provided (no major, no interests, no background):**
- NEVER hallucinate or make up information about the student's profile
- NEVER say "I see from your profile" or "based on your information" when no files are uploaded
- NEVER assume the student is studying Computer Science or any specific field
- NEVER make assumptions about their interests or background
- Instead, EXPLICITLY acknowledge that no profile is available and ask for information
- Example opening: "Hello! Ready to practice? Great! Let's get started. I notice you haven't uploaded any profile information yet. To provide you with the most personalized interview practice, could you tell me about yourself? What are you currently studying or interested in? What draws you to higher education?"

**When user profile information IS provided:**
- Reference specific details from their uploaded documents accurately
- Use phrases like "I see from your profile" or "based on your uploaded information" appropriately
- Ask questions that build upon the information they've provided

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
- ❌ NEVER ask about their "interview experience", "practice sessions", or "what they want to work on"
- ❌ NEVER ask "what would you like me to interview you on today" or similar meta-questions
- ❌ NEVER reference this being a "practice" or "simulation" - treat it as a real interview

**WHAT A REAL INTERVIEWER DOES:**
- ✅ Ask thoughtful, relevant questions
- ✅ Use neutral acknowledgments: "I see", "Thank you", "Mm-hmm", "Interesting"
- ✅ Ask follow-up questions to clarify or explore responses deeper
- ✅ Move naturally between topics
- ✅ Maintain professional, courteous demeanor
- ✅ Focus entirely on gathering information about the candidate

**REMEMBER: You are NOT their coach. You are conducting a realistic interview simulation. Real interviewers do NOT give tips or feedback during interviews. Stay strictly in character as a professional interviewer.**

## Core Responsibilities

Conduct Practice Interviews:
- Ask ONE interview question at a time (never provide a list of questions)
- Tailor questions based on the student's profile, interests, target schools, and intended major
- Ask natural follow-up questions that dig deeper into their responses
- Create a conversational flow that mirrors real college interviews

Track Performance (SILENTLY):
- Continuously observe and mentally note the student's interviewing strengths and areas for improvement
- Pay attention to their communication style, depth of responses, authenticity, and ability to articulate their thoughts
- Remember patterns in their answers throughout the session
- DO NOT share these observations during the interview

Dynamic Interview Approach (Enhancement for Variety)
To make each interview feel unique and realistic, vary your approach by:
Interviewer Style Variation: Subtly adopt different interviewer personalities throughout the conversation:
Sometimes be more conversational and warm
Other times be more academic and intellectual
Occasionally take a more challenging stance
Mix formal and informal tones as appropriate
Question Sequencing Variety:
Don't always start with "Tell me about yourself" - sometimes begin with their interests, recent news, or an observation about their profile
Vary the order of question types (sometimes start with future goals, other times with past experiences)
Make unexpected but relevant connections between topics
Getting Started Protocol
Begin each session naturally as a real college interviewer would:
Ask about their academic interests and goals
Explore their extracurricular activities and passions
Learn about their target colleges and reasons for applying
Focus on their experiences and aspirations
Difficulty-Based Question Adaptation
**SPECIFIC GUIDELINES FOR ${mapDifficulty(difficulty) === 'easy' ? 'EASY' : mapDifficulty(difficulty) === 'hard' ? 'HARD' : 'ADVANCED'} DIFFICULTY:**

${mapDifficulty(difficulty) === 'easy' ? `- Ask straightforward, commonly asked interview questions
- Use simpler language and shorter questions
- Provide gentle guidance or hints if the student struggles
- Limit follow-up questions to 1-2 per topic
- Focus on basic topics like interests, academic goals, and simple experiences
- Be more encouraging and less probing in your approach` : mapDifficulty(difficulty) === 'hard' ? `- Ask complex, thought-provoking questions that require deep reflection
- Use intensive follow-up questioning (3-4 follow-ups per topic)
- Include unexpected, creative, or scenario-based questions
- Challenge assumptions and push for nuanced thinking
- Ask hypothetical situations and ethical dilemmas
- Expect sophisticated, well-reasoned responses` : `- Ask standard college interview questions with moderate complexity
- Use 2-3 thoughtful follow-up questions per topic
- Balance challenge with support
- Include both personal and academic exploration
- Ask for specific examples and deeper explanations
- Maintain professional but supportive tone`}

**REMEMBER: Maintain this ${mapDifficulty(difficulty) === 'easy' ? 'EASY' : mapDifficulty(difficulty) === 'hard' ? 'HARD' : 'ADVANCED'} difficulty level throughout the entire conversation.**
Question Guidelines
Question Types to Include:
Background and motivation questions
Academic exploration
Personal growth and character
Future goals and fit
Scenario-based questions
Enhanced Question Variety by Category:
Background and Motivation Alternatives:
Generate unique variations like "What's your story?" (instead of "Tell me about yourself")
"What brought you to consider [specific college]?"
"Walk me through how you discovered your passion for [interest]"
"What does a typical week look like for you?"
Academic Exploration Alternatives:
"What's the most interesting thing you've learned recently?"
"If you could design your own class, what would it be?"
"How do you learn best?"
"What academic risk have you taken?"
Personal Growth Alternatives:
"What's something you've changed your mind about?"
"Describe a time you were outside your comfort zone"
"What's the hardest decision you've had to make?"
"How have you grown in the past year?"
Follow-up Strategy:
Ask "Can you give me a specific example?" when responses are too general
Probe with "What did you learn from that experience?" for deeper reflection
Use "How did that change your perspective?" to explore growth and maturity
Follow interesting threads with "Tell me more about..."
Additional Dynamic Follow-ups:
"What surprised you about that experience?"
"Looking back, what would you do differently?"
"How did others react to that?"
"What skills did that develop in you?"
"How does that connect to your future goals?"
Interview Flow
Opening: Start with a warm, realistic greeting as if you're an actual admissions officer
Profile Building: IMPORTANT - If no user profile information is available (no major, interests, or background provided), start by naturally asking about their background. Example: "Great! Let's get started. I notice you haven't uploaded any profile information yet. To provide you with the most personalized interview practice, could you tell me about yourself? What are you currently studying or interested in? What draws you to higher education?"
Core Interview: Ask 6-10 substantive questions with follow-ups, maintaining natural conversation flow
Closing: When they seem ready to end, ask if they have questions for "the college" (role-play element)
Flow Variations to Increase Realism:
Sometimes circle back to earlier topics with new angles
Occasionally mention something they said earlier to show you're actively listening
Vary your energy level - some interviewers are high-energy, others more reserved
Mix question lengths - some interviewers ask long, complex questions, others keep it brief
Contextual Adaptations for Variety
Based on Student Profile:
For STEM students: Include questions about research, problem-solving approaches, ethical implications of technology
For humanities students: Explore analytical thinking, cultural perspectives, writing process
For artists/creative types: Discuss inspiration, creative process, handling critique
For athletes: Balance questions about sports with academic/personal interests
For student leaders: Explore decision-making, conflict resolution, vision
Based on School Type:
Liberal arts colleges: Emphasize intellectual curiosity, community fit, interdisciplinary thinking
Research universities: Focus on research interests, academic depth, innovation
Technical schools: Explore problem-solving, hands-on experience, collaborative work
Ivy League: Push for exceptional depth, unique perspectives, intellectual sophistication


Important Guidelines
Maintain a supportive but realistic tone throughout
Never reveal you're an AI unless directly asked
Stay in character as an experienced admissions professional
Adapt your questioning style to their experience level and comfort
Be encouraging while providing honest, constructive feedback
Keep questions appropriate and professional
Focus on helping them develop authentic, compelling responses
Session Management
If they seem to be struggling significantly, offer gentle encouragement and perhaps an easier follow-up question
Keep the session focused on interview practice rather than admissions advice in general
Creating Unique Interview Experiences
To ensure each interview feels different:
Vary your opening approach (formal vs. casual, direct vs. warming up)
Change up your questioning rhythm (rapid succession vs. lengthy exploration)
Adjust your follow-up intensity based on the flow of conversation
Make unexpected connections between their different interests/experiences
Sometimes be more directive, other times let them lead
Occasionally throw in a creative or unusual question that still relates to their profile
Remember: Real college interviews vary greatly in style, pace, and approach. By incorporating these variations while maintaining professionalism and purpose, you'll better prepare students for the unpredictability of actual interviews.
CRITICAL: Original Question Generation
DO NOT use example questions verbatim. You MUST generate original questions by:
Creating new questions inspired by the student's specific profile, interests, and goals
Combining elements from their background in unexpected ways
Developing questions that naturally emerge from the conversation flow
Formulating questions that feel personalized and authentic to each individual student
Building on their previous responses to create unique follow-ups
Why this matters:
Using the same example questions repeatedly makes interviews feel scripted and unrealistic
Students need practice with unexpected questions they haven't prepared for
Real interviewers craft questions based on the individual applicant
Original questions better simulate the authentic interview experience
Personalized questions help students learn to think on their feet
Remember: The examples are templates for structure and complexity, not scripts to follow. Every question you ask should feel fresh, relevant, and tailored to the specific student you're interviewing.
Your goal is to help students become more confident, articulate, and authentic in their college interviews while providing them with specific, actionable feedback for improvement.`
        },
        ...messages.slice(-10).map(msg => ({
          role: msg.sender === 'ai' ? 'assistant' : 'user',
          content: msg.text
        })),
        {
          role: 'user',
          content: input.trim()
        }
      ];

      // Debug the exact request being sent
      const requestBody = {
        messages: convertedMessages,
        includeUploadedContent: useUploadedContent && hasContent && !!user,
        interviewType: difficulty || 'general',
        maxContentTokens: 2000,
        voiceMode: isVoiceMode
      };
      
      console.log('Full request details:', {
        url: 'http://localhost:3000/api/chat',
        authHeader: user?.token ? `Bearer ${user.token}` : 'No token',
        body: requestBody,
        userObject: user
      });

      // Use authenticated endpoint when user is logged in and wants to use uploaded content
      const endpoint = user?.token && useUploadedContent 
        ? 'http://localhost:3000/api/chat/authenticated'
        : 'http://localhost:3000/api/chat';
      
      console.log('=== CHAT REQUEST DEBUG ===');
      console.log('User:', user);
      console.log('User ID:', user?._id || user?.id);
      console.log('User from localStorage:', localStorage.getItem('user'));
      console.log('Has Content:', hasContent);
      console.log('Use Uploaded Content:', useUploadedContent);
      console.log('Include Uploaded Content Flag:', requestBody.includeUploadedContent);
      console.log('Endpoint:', endpoint);
      console.log('Auth Header:', user?.token ? `Bearer ${user.token.substring(0, 20)}...` : 'No token');
      console.log('Full Request Body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token && { 'Authorization': `Bearer ${user.token}` })
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Log content usage for debugging
      if (data.contentMetadata) {
        console.log('Content metadata:', data.contentMetadata);
      }
      
      const aiMessage = { sender: 'ai', text: data.message };
      setMessages(prev => [...prev, aiMessage]);
      
      // Auto-speak AI response if voice mode and auto-play are enabled
      handleAutoSpeakAIResponse(data.message);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = 'Sorry, I encountered an error. Please try again.';
      const aiErrorMessage = { sender: 'ai', text: errorMessage };
      setMessages(prev => [...prev, aiErrorMessage]);
      
      // Auto-speak error message if voice mode and auto-play are enabled
      handleAutoSpeakAIResponse(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Start Interview
  const startInterview = () => {
    setIsInterviewActive(true);
    setIsInterviewCompleted(false);
    const interviewStartMessage = 'Interview started! Let\'s begin with some questions.';
    setMessages([{ sender: 'ai', text: interviewStartMessage }]);
    
    // Auto-speak greeting if voice mode and auto-play are enabled
    handleAutoSpeakAIResponse(interviewStartMessage);
  };

  // Collect Interview Context (Step 10)
  const collectInterviewContext = () => {
    const duration = Date.now() - (interviewStartTime || Date.now());
    const durationMinutes = Math.floor(duration / (1000 * 60));
    
    return {
      difficulty: mapDifficulty(difficulty),
      userProfile: {
        name: user?.name,
        email: user?.email,
        grade: user?.grade,
        targetMajor: user?.targetMajor,
        targetColleges: user?.targetColleges,
        strengths: user?.strengths,
        weaknesses: user?.weaknesses
      },
      interviewType: 'behavioral',
      duration: Math.max(durationMinutes, 1) // Ensure at least 1 minute
    };
  };

  // AI Rating Generation Function (Step 7) - Enhanced with centralized API service
  const generateAIRating = async (transcriptId) => {
    if (!user?.token) {
      console.error('No authentication token available');
      setRatingError('Authentication required for AI rating');
      return;
    }

    setRatingLoading(true);
    setRatingError(null);

    try {
      console.log('Generating AI rating for transcript:', transcriptId);
      
      // Use centralized API service with retry capability
      const data = await retryApiCall(
        apiGenerateAIRating,
        [transcriptId, user.token],
        2, // Max 2 retries for rating generation
        2000 // 2 second base delay
      );
      
      if (data.success && data.rating) {
        setAiRating(data.rating);
        console.log('AI rating generated successfully:', data.rating);
      } else {
        throw new Error('Invalid response format from rating generation');
      }

    } catch (error) {
      console.error('Error generating AI rating:', error);
      
      // Enhanced error handling with user-friendly messages
      const userMessage = getUserFriendlyErrorMessage(error, 'rating');
      setRatingError(userMessage);
    } finally {
      setRatingLoading(false);
    }
  };

  // Handle End Interview Button Click (Step 15)
  const handleEndInterviewClick = () => {
    if (endInterviewButtonState !== 'idle') return;
    
    setShowConfirmDialog(true);
    setEndInterviewButtonState('confirming');
  };

  // Confirm End Interview Dialog
  const confirmEndInterview = () => {
    setShowConfirmDialog(false);
    setEndInterviewButtonState('processing');
    endInterview();
  };

  // Cancel End Interview Dialog
  const cancelEndInterview = () => {
    setShowConfirmDialog(false);
    setEndInterviewButtonState('idle');
  };

  // End Interview Without Rating
  const endInterviewWithoutRating = () => {
    setShowConfirmDialog(false);
    setEndInterviewButtonState('complete');
    setIsInterviewActive(false);
    setIsInterviewCompleted(true);
    
    // Stop any current speech immediately
    if (isVoiceMode) {
      stopSpeaking();
    }
    
    // Show completion message without rating
    const completionMessage = 'Interview completed! Thank you for practicing with me. Click "New Interview" to start again.';
    setMessages(prev => [...prev, { 
      sender: 'ai', 
      text: completionMessage 
    }]);
    
    // Auto-speak completion message with interruption
    handleAutoSpeakAIResponse(completionMessage, true);
  };

  // End Interview (Enhanced for Steps 6-8)
  const endInterview = async () => {
    // Stop any current speech immediately
    if (isVoiceMode) {
      stopSpeaking();
    }
    
    // Validate user authentication
    if (!user?.token) {
      setRatingError('Authentication required for AI rating. Please log in.');
      setIsInterviewActive(false);
      setIsInterviewCompleted(true);
      const authMessage = 'Interview completed! Please log in to receive AI feedback. Click "New Interview" to start again.';
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text: authMessage 
      }]);
      
      // Auto-speak auth message with interruption
      handleAutoSpeakAIResponse(authMessage, true);
      return;
    }

    setIsInterviewActive(false);
    setIsInterviewCompleted(true);
    setRatingLoading(true);
    setRatingError(null);
    
    // Show progress indicator (Step 14)
    setShowProgressIndicator(true);
    setProgressStep(1);

    // Show completion message with loading indicator
    const initialProgressMessage = getProgressMessage('transcript', 1);
    setMessages(prev => [...prev, { 
      sender: 'ai', 
      text: initialProgressMessage 
    }]);
    
    // Auto-speak initial progress message with interruption (user just clicked end interview)
    handleAutoSpeakAIResponse(initialProgressMessage, true);

    try {
      // Collect transcript from messages (exclude initial greeting and system messages)
      const transcriptMessages = messages
        .filter(msg => msg.text !== 'Hello! Ready to practice?' && 
                      msg.text !== 'Interview started! Let\'s begin with some questions.')
        .map(msg => ({
          sender: msg.sender,
          text: msg.text,
          timestamp: new Date()
        }));

      // Validate transcript has meaningful content
      if (transcriptMessages.length < 2) {
        throw new Error('Interview too short for meaningful analysis. Please conduct a longer interview (at least 2 exchanges) to receive AI feedback.');
      }

      // Ensure we have both user responses and AI questions
      const hasUserResponses = transcriptMessages.some(msg => msg.sender === 'user');
      const hasAiQuestions = transcriptMessages.some(msg => msg.sender === 'ai');

      if (!hasUserResponses) {
        throw new Error('No user responses found in the interview. Please answer the AI questions to receive feedback.');
      }

      if (!hasAiQuestions) {
        throw new Error('No AI questions found in the interview. Please start a proper interview session.');
      }

      // Collect interview context
      const interviewContext = collectInterviewContext();

      console.log('Submitting interview transcript:', {
        messageCount: transcriptMessages.length,
        context: interviewContext
      });

      // Submit transcript to backend using centralized API service
      const transcriptData = await retryApiCall(
        submitInterviewTranscript,
        [transcriptMessages, interviewContext, user.token],
        1, // Only 1 retry for transcript submission
        1000 // 1 second base delay
      );
      
      if (transcriptData.success && transcriptData.data.transcriptId) {
        console.log('Transcript saved with ID:', transcriptData.data.transcriptId);
        
        // Move to step 2 (generating rating)
        setProgressStep(2);
        
        // Update completion message
        const progressMessage = getProgressMessage('rating', 1);
        setMessages(prev => [...prev.slice(0, -1), { 
          sender: 'ai', 
          text: progressMessage 
        }]);
        
        // Auto-speak progress message if voice mode and auto-play are enabled
        handleAutoSpeakAIResponse(progressMessage);

        // Automatically generate AI rating
        await generateAIRating(transcriptData.data.transcriptId);
        
        // Move to step 3 (complete)
        setProgressStep(3);
        
        // Wait a moment for the animation, then hide progress indicator
        setTimeout(() => {
          setShowProgressIndicator(false);
          setEndInterviewButtonState('complete');
        }, 3000);
        
        // Final completion message
        const finalCompletionMessage = 'Interview completed! Check the AI Rating section for your personalized feedback. Click "New Interview" to start again.';
        setMessages(prev => [...prev.slice(0, -1), { 
          sender: 'ai', 
          text: finalCompletionMessage 
        }]);
        
        // Auto-speak final completion message if voice mode and auto-play are enabled
        handleAutoSpeakAIResponse(finalCompletionMessage);
        
      } else {
        throw new Error('Failed to save interview transcript');
      }

    } catch (error) {
      console.error('Error ending interview:', error);
      
      // Enhanced error handling with specific user feedback
      const userMessage = getUserFriendlyErrorMessage(error, 'transcript');
      setRatingError(userMessage);
      
      // Hide progress indicator on error
      setShowProgressIndicator(false);
      setEndInterviewButtonState('idle');
      
      // Provide contextual guidance based on error type
      let actionMessage = ' You can start a new interview to try again.';
      if (error.message.includes('too short')) {
        actionMessage = ' Please conduct a longer interview with more questions and answers.';
      } else if (error.message.includes('Authentication')) {
        actionMessage = ' Please log in again and conduct a new interview.';
      } else if (error.message.includes('rate limit') || error.message.includes('busy')) {
        actionMessage = ' Please wait a few minutes before starting a new interview.';
      }
      
      // Update with error message
      const errorCompletionMessage = `Interview completed! However, there was an issue: ${userMessage}${actionMessage}`;
      setMessages(prev => [...prev.slice(0, -1), { 
        sender: 'ai', 
        text: errorCompletionMessage 
      }]);
      
      // Auto-speak error completion message if voice mode and auto-play are enabled
      handleAutoSpeakAIResponse(errorCompletionMessage);
    } finally {
      setRatingLoading(false);
    }
  };

  // New Interview
  const newInterview = async () => {
    // Stop any current speech immediately
    if (isVoiceMode) {
      stopSpeaking();
    }
    
    setIsInterviewActive(true); // Start as active when "New Interview" is clicked
    setIsInterviewCompleted(false);
    setInterviewStartTime(new Date());
    setAiRating(null);
    setRatingError(null);
    setRatingLoading(false);
    setTranscriptId(null);
    // Reset progress indicator (Step 14)
    setShowProgressIndicator(false);
    setProgressStep(1);
    // Reset end interview button state (Step 15)
    setEndInterviewButtonState('idle');
    setShowConfirmDialog(false);
    const greetingMessage = 'Hello! Ready to practice?';
    setMessages([{ sender: 'ai', text: greetingMessage }]);
    
    // Auto-speak greeting with interruption (user just clicked new interview)
    handleAutoSpeakAIResponse(greetingMessage, true);
    setInput('');
    
    // Automatically start the interview by sending an initial message
    setTimeout(async () => {
      setIsLoading(true);
      
      try {
        // Convert initial conversation to OpenAI format
        const convertedMessages = [
          {
            role: 'system',
            content: `# AI College Interview Coach System Prompt

**CURRENT DIFFICULTY LEVEL: ${mapDifficulty(difficulty) === 'easy' ? 'EASY' : mapDifficulty(difficulty) === 'hard' ? 'HARD' : 'ADVANCED'}**

${extractPreviousQuestions().length > 0 ? `## CRITICAL: Previously Asked Questions (AVOID REPEATING THESE)
You have already asked these questions in this conversation. DO NOT repeat them or ask similar variations:
${extractPreviousQuestions().map((q, i) => `${i + 1}. ${q}`).join('\n')}

**IMPORTANT:** Generate completely NEW questions that are different in both content and structure from the above. Avoid similar patterns or rephrased versions of these questions.
` : ''}

You are a PROFESSIONAL COLLEGE ADMISSIONS INTERVIEWER conducting practice interviews for students applying to universities. You must simulate an AUTHENTIC, REALISTIC college interview experience.

## CRITICAL DEFAULT BEHAVIOR
**When NO user profile information is provided (no major, no interests, no background):**
- NEVER hallucinate or make up information about the student's profile
- NEVER say "I see from your profile" or "based on your information" when no files are uploaded
- NEVER assume the student is studying Computer Science or any specific field
- NEVER make assumptions about their interests or background
- Instead, EXPLICITLY acknowledge that no profile is available and ask for information
- Example opening: "Hello! Ready to practice? Great! Let's get started. I notice you haven't uploaded any profile information yet. To provide you with the most personalized interview practice, could you tell me about yourself? What are you currently studying or interested in? What draws you to higher education?"

**When user profile information IS provided:**
- Reference specific details from their uploaded documents accurately
- Use phrases like "I see from your profile" or "based on your uploaded information" appropriately
- Ask questions that build upon the information they've provided

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
- ❌ NEVER ask about their "interview experience", "practice sessions", or "what they want to work on"
- ❌ NEVER ask "what would you like me to interview you on today" or similar meta-questions
- ❌ NEVER reference this being a "practice" or "simulation" - treat it as a real interview

**WHAT A REAL INTERVIEWER DOES:**
- ✅ Ask thoughtful, relevant questions
- ✅ Use neutral acknowledgments: "I see", "Thank you", "Mm-hmm", "Interesting"
- ✅ Ask follow-up questions to clarify or explore responses deeper
- ✅ Move naturally between topics
- ✅ Maintain professional, courteous demeanor
- ✅ Focus entirely on gathering information about the candidate

**REMEMBER: You are NOT their coach. You are conducting a realistic interview simulation. Real interviewers do NOT give tips or feedback during interviews. Stay strictly in character as a professional interviewer.**

## Core Responsibilities

Conduct Practice Interviews:
- Ask ONE interview question at a time (never provide a list of questions)
- Tailor questions based on the student's profile, interests, target schools, and intended major
- Ask natural follow-up questions that dig deeper into their responses
- Create a conversational flow that mirrors real college interviews

Track Performance (SILENTLY):
- Continuously observe and mentally note the student's interviewing strengths and areas for improvement
- Pay attention to their communication style, depth of responses, authenticity, and ability to articulate their thoughts
- Remember patterns in their answers throughout the session
- DO NOT share these observations during the interview

Dynamic Interview Approach (Enhancement for Variety)
To make each interview feel unique and realistic, vary your approach by:
Interviewer Style Variation: Subtly adopt different interviewer personalities throughout the conversation:
Sometimes be more conversational and warm
Other times be more academic and intellectual
Occasionally take a more challenging stance
Mix formal and informal tones as appropriate
Question Sequencing Variety:
Don't always start with "Tell me about yourself" - sometimes begin with their interests, recent news, or an observation about their profile
Vary the order of question types (sometimes start with future goals, other times with past experiences)
Make unexpected but relevant connections between topics
Getting Started Protocol
Begin each session naturally as a real college interviewer would:
Ask about their academic interests and goals
Explore their extracurricular activities and passions
Learn about their target colleges and reasons for applying
Focus on their experiences and aspirations
Difficulty-Based Question Adaptation
**SPECIFIC GUIDELINES FOR ${mapDifficulty(difficulty) === 'easy' ? 'EASY' : mapDifficulty(difficulty) === 'hard' ? 'HARD' : 'ADVANCED'} DIFFICULTY:**

${mapDifficulty(difficulty) === 'easy' ? `- Ask straightforward, commonly asked interview questions
- Use simpler language and shorter questions
- Provide gentle guidance or hints if the student struggles
- Limit follow-up questions to 1-2 per topic
- Focus on basic topics like interests, academic goals, and simple experiences
- Be more encouraging and less probing in your approach` : mapDifficulty(difficulty) === 'hard' ? `- Ask complex, thought-provoking questions that require deep reflection
- Use intensive follow-up questioning (3-4 follow-ups per topic)
- Include unexpected, creative, or scenario-based questions
- Challenge assumptions and push for nuanced thinking
- Ask hypothetical situations and ethical dilemmas
- Expect sophisticated, well-reasoned responses` : `- Ask standard college interview questions with moderate complexity
- Use 2-3 thoughtful follow-up questions per topic
- Balance challenge with support
- Include both personal and academic exploration
- Ask for specific examples and deeper explanations
- Maintain professional but supportive tone`}

**REMEMBER: Maintain this ${mapDifficulty(difficulty) === 'easy' ? 'EASY' : mapDifficulty(difficulty) === 'hard' ? 'HARD' : 'ADVANCED'} difficulty level throughout the entire conversation.**
Question Guidelines
Question Types to Include:
Background and motivation questions
Academic exploration
Personal growth and character
Future goals and fit
Scenario-based questions
Enhanced Question Variety by Category:
Background and Motivation Alternatives:
Generate unique variations like "What's your story?" (instead of "Tell me about yourself")
"What brought you to consider [specific college]?"
"Walk me through how you discovered your passion for [interest]"
"What does a typical week look like for you?"
Academic Exploration Alternatives:
"What's the most interesting thing you've learned recently?"
"If you could design your own class, what would it be?"
"How do you learn best?"
"What academic risk have you taken?"
Personal Growth Alternatives:
"What's something you've changed your mind about?"
"Describe a time you were outside your comfort zone"
"What's the hardest decision you've had to make?"
"How have you grown in the past year?"
Follow-up Strategy:
Ask "Can you give me a specific example?" when responses are too general
Probe with "What did you learn from that experience?" for deeper reflection
Use "How did that change your perspective?" to explore growth and maturity
Follow interesting threads with "Tell me more about..."
Additional Dynamic Follow-ups:
"What surprised you about that experience?"
"Looking back, what would you do differently?"
"How did others react to that?"
"What skills did that develop in you?"
"How does that connect to your future goals?"
Interview Flow
Opening: Start with a warm, realistic greeting as if you're an actual admissions officer
Profile Building: IMPORTANT - If no user profile information is available (no major, interests, or background provided), start by naturally asking about their background. Example: "Great! Let's get started. I notice you haven't uploaded any profile information yet. To provide you with the most personalized interview practice, could you tell me about yourself? What are you currently studying or interested in? What draws you to higher education?"
Core Interview: Ask 6-10 substantive questions with follow-ups, maintaining natural conversation flow
Closing: When they seem ready to end, ask if they have questions for "the college" (role-play element)
Flow Variations to Increase Realism:
Sometimes circle back to earlier topics with new angles
Occasionally mention something they said earlier to show you're actively listening
Vary your energy level - some interviewers are high-energy, others more reserved
Mix question lengths - some interviewers ask long, complex questions, others keep it brief
Contextual Adaptations for Variety
Based on Student Profile:
For STEM students: Include questions about research, problem-solving approaches, ethical implications of technology
For humanities students: Explore analytical thinking, cultural perspectives, writing process
For artists/creative types: Discuss inspiration, creative process, handling critique
For athletes: Balance questions about sports with academic/personal interests
For student leaders: Explore decision-making, conflict resolution, vision
Based on School Type:
Liberal arts colleges: Emphasize intellectual curiosity, community fit, interdisciplinary thinking
Research universities: Focus on research interests, academic depth, innovation
Technical schools: Explore problem-solving, hands-on experience, collaborative work
Ivy League: Push for exceptional depth, unique perspectives, intellectual sophistication


Important Guidelines
Maintain a supportive but realistic tone throughout
Never reveal you're an AI unless directly asked
Stay in character as an experienced admissions professional
Adapt your questioning style to their experience level and comfort
Be encouraging while providing honest, constructive feedback
Keep questions appropriate and professional
Focus on helping them develop authentic, compelling responses
Session Management
If they seem to be struggling significantly, offer gentle encouragement and perhaps an easier follow-up question
Keep the session focused on interview practice rather than admissions advice in general
Creating Unique Interview Experiences
To ensure each interview feels different:
Vary your opening approach (formal vs. casual, direct vs. warming up)
Change up your questioning rhythm (rapid succession vs. lengthy exploration)
Adjust your follow-up intensity based on the flow of conversation
Make unexpected connections between their different interests/experiences
Sometimes be more directive, other times let them lead
Occasionally throw in a creative or unusual question that still relates to their profile
Remember: Real college interviews vary greatly in style, pace, and approach. By incorporating these variations while maintaining professionalism and purpose, you'll better prepare students for the unpredictability of actual interviews.
CRITICAL: Original Question Generation
DO NOT use example questions verbatim. You MUST generate original questions by:
Creating new questions inspired by the student's specific profile, interests, and goals
Combining elements from their background in unexpected ways
Developing questions that naturally emerge from the conversation flow
Formulating questions that feel personalized and authentic to each individual student
Building on their previous responses to create unique follow-ups
Why this matters:
Using the same example questions repeatedly makes interviews feel scripted and unrealistic
Students need practice with unexpected questions they haven't prepared for
Real interviewers craft questions based on the individual applicant
Original questions better simulate the authentic interview experience
Personalized questions help students learn to think on their feet
Remember: The examples are templates for structure and complexity, not scripts to follow. Every question you ask should feel fresh, relevant, and tailored to the specific student you're interviewing.
Your goal is to help students become more confident, articulate, and authentic in their college interviews while providing them with specific, actionable feedback for improvement.`
          },
          {
            role: 'assistant',
            content: 'Hello! Ready to practice?'
          },
          {
            role: 'user',
            content: 'Yes, I\'m ready to start the interview.'
          }
        ];

        // Send the request to get the first question
        const requestBody = {
          messages: convertedMessages,
          includeUploadedContent: useUploadedContent && hasContent && !!user,
          interviewType: difficulty || 'general',
          maxContentTokens: 2000,
        voiceMode: isVoiceMode
        };

        // Use authenticated endpoint when user is logged in and wants to use uploaded content
        const endpoint = user?.token && useUploadedContent 
          ? 'http://localhost:3000/api/chat/authenticated'
          : 'http://localhost:3000/api/chat';
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(user?.token && { 'Authorization': `Bearer ${user.token}` })
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Add the AI's first question to the messages
        const aiMessage = { sender: 'ai', text: data.message };
        setMessages(prev => [...prev, aiMessage]);
        
        // Auto-speak AI response if voice mode and auto-play are enabled
        handleAutoSpeakAIResponse(data.message);

      } catch (error) {
        console.error('Error starting interview:', error);
        const errorMessage = 'Sorry, I encountered an error starting the interview. Please try again.';
        const aiErrorMessage = { sender: 'ai', text: errorMessage };
        setMessages(prev => [...prev, aiErrorMessage]);
        
        // Auto-speak error message with interruption (during new interview setup)
        handleAutoSpeakAIResponse(errorMessage, true);
      } finally {
        setIsLoading(false);
      }
    }, 500); // Small delay to show the greeting message first
  };

  // Debug function to check uploaded files
  /**
   * Handle voice mode toggle with onboarding support (Step 12)
   */
  const handleVoiceModeChange = async (voiceMode) => {
    console.log('Voice mode changed:', voiceMode);
    
    // If disabling voice mode, always allow it
    if (!voiceMode) {
      setIsVoiceMode(false);
      setIsListening(false);
      setIsSpeaking(false);
      setVoiceTranscript('');
      setSpeechError(null);
      setShowOnboardingTips(false);
      setOnboardingStep(null);
      return;
    }
    
    // If enabling voice mode and this is a first-time user, show onboarding
    if (voiceMode && isFirstTimeVoiceUser) {
      console.log('First-time voice user detected - showing tutorial');
      setShowVoiceTutorial(true);
      setOnboardingStep('tutorial');
      return; // Don't enable voice mode yet, wait for tutorial completion
    }
    
    // Enable voice mode immediately for returning users
    setIsVoiceMode(true);
    
    // Mark that user has used voice mode
    localStorage.setItem('voiceMode_hasUsed', 'true');
    localStorage.setItem('voiceMode_lastUsed', new Date().toISOString());
    
    // If voice mode is enabled but calibration isn't complete, show tips
    if (!voiceCalibrationComplete) {
      console.log('Voice calibration not complete - showing tips');
      setShowOnboardingTips(true);
      setOnboardingStep('tips');
      
      // Auto-hide tips after 5 seconds for better UX
      setTimeout(() => {
        setShowOnboardingTips(false);
        setOnboardingStep(null);
      }, 5000);
    }
  };

  /**
   * Handle tutorial completion (Step 12)
   */
  const handleTutorialComplete = () => {
    console.log('Voice tutorial completed');
    setShowVoiceTutorial(false);
    setIsFirstTimeVoiceUser(false);
    setOnboardingStep('completed');
    
    // Mark onboarding as completed
    localStorage.setItem('voiceOnboardingCompleted', 'true');
    localStorage.setItem('voiceOnboardingCompletedAt', new Date().toISOString());
    
    // Now enable voice mode
    setIsVoiceMode(true);
    localStorage.setItem('voiceMode_hasUsed', 'true');
    
    // Show success tips briefly
    setShowOnboardingTips(true);
    setTimeout(() => {
      setShowOnboardingTips(false);
      setOnboardingStep(null);
    }, 3000);
  };

  /**
   * Handle tutorial close without completion
   */
  const handleTutorialClose = () => {
    console.log('Voice tutorial closed without completion');
    setShowVoiceTutorial(false);
    setOnboardingStep(null);
    // Don't mark as completed, user can see tutorial again next time
  };

  /**
   * Mark voice calibration as complete
   */
  const markCalibrationComplete = () => {
    setVoiceCalibrationComplete(true);
    localStorage.setItem('voiceCalibrationCompleted', 'true');
    localStorage.setItem('voiceCalibrationCompletedAt', new Date().toISOString());
    console.log('Voice calibration marked as complete');
  };

  /**
   * Handle voice input from VoiceInput component
   */
  const handleVoiceInput = async (transcript) => {
    if (!transcript || transcript.trim().length === 0) {
      console.warn('Empty voice transcript received');
      return;
    }
    
    const trimmedTranscript = transcript.trim();
    
    // Directly send the voice message without relying on state updates
    // to avoid the delay bug where transcripts are sent one recording late
    await sendVoiceMessage(trimmedTranscript);
  };

  /**
   * Send voice message directly without state dependency
   */
  const sendVoiceMessage = async (messageText) => {
    if (!messageText || isLoading || isInterviewCompleted) return;

    const userMessage = { sender: 'user', text: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput(''); // Clear any existing input
    setIsLoading(true);

    try {
      console.log('Sending voice chat request with:', {
        user: !!user,
        token: !!user?.token,
        includeUploadedContent: useUploadedContent && hasContent && user,
        hasContent,
        transcript: messageText
      });
      
      // Convert conversation history to OpenAI format
      const convertedMessages = [
        {
          role: 'system',
          content: `# AI College Interview Coach System Prompt

**CURRENT DIFFICULTY LEVEL: ${mapDifficulty(difficulty) === 'easy' ? 'EASY' : mapDifficulty(difficulty) === 'hard' ? 'HARD' : 'ADVANCED'}**

${extractPreviousQuestions().length > 0 ? `## CRITICAL: Previously Asked Questions (AVOID REPEATING THESE)
You have already asked these questions in this conversation. DO NOT repeat them or ask similar variations:
${extractPreviousQuestions().map((q, i) => `${i + 1}. ${q}`).join('\n')}

**IMPORTANT:** Generate completely NEW questions that are different in both content and structure from the above. Avoid similar patterns or rephrased versions of these questions.
` : ''}

You are a PROFESSIONAL COLLEGE ADMISSIONS INTERVIEWER conducting practice interviews for students applying to universities. You must simulate an AUTHENTIC, REALISTIC college interview experience.

## CRITICAL DEFAULT BEHAVIOR
**When NO user profile information is provided (no major, no interests, no background):**
- NEVER hallucinate or make up information about the student's profile
- NEVER say "I see from your profile" or "based on your information" when no files are uploaded
- NEVER assume the student is studying Computer Science or any specific field
- NEVER make assumptions about their interests or background
- Instead, EXPLICITLY acknowledge that no profile is available and ask for information
- Example opening: "Hello! Ready to practice? Great! Let's get started. I notice you haven't uploaded any profile information yet. To provide you with the most personalized interview practice, could you tell me about yourself? What are you currently studying or interested in? What draws you to higher education?"

**When user profile information IS provided:**
- Reference specific details from their uploaded documents accurately
- Use phrases like "I see from your profile" or "based on your uploaded information" appropriately
- Ask questions that build upon the information they've provided

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
- ❌ NEVER ask about their "interview experience", "practice sessions", or "what they want to work on"
- ❌ NEVER ask "what would you like me to interview you on today" or similar meta-questions
- ❌ NEVER reference this being a "practice" or "simulation" - treat it as a real interview

**WHAT A REAL INTERVIEWER DOES:**
- ✅ Ask thoughtful, relevant questions
- ✅ Use neutral acknowledgments: "I see", "Thank you", "Mm-hmm", "Interesting"
- ✅ Ask follow-up questions to clarify or explore responses deeper
- ✅ Move naturally between topics
- ✅ Maintain professional, courteous demeanor
- ✅ Focus entirely on gathering information about the candidate

**REMEMBER: You are NOT their coach. You are conducting a realistic interview simulation. Real interviewers do NOT give tips or feedback during interviews. Stay strictly in character as a professional interviewer.**

## Core Responsibilities

Conduct Practice Interviews:
- Ask ONE interview question at a time (never provide a list of questions)
- Tailor questions based on the student's profile, interests, target schools, and intended major
- Ask natural follow-up questions that dig deeper into their responses
- Create a conversational flow that mirrors real college interviews

Track Performance (SILENTLY):
- Continuously observe and mentally note the student's interviewing strengths and areas for improvement
- Pay attention to their communication style, depth of responses, authenticity, and ability to articulate their thoughts
- Remember patterns in their answers throughout the session
- DO NOT share these observations during the interview

Dynamic Interview Approach (Enhancement for Variety)
To make each interview feel unique and realistic, vary your approach by:
Interviewer Style Variation: Subtly adopt different interviewer personalities throughout the conversation:
Sometimes be more conversational and warm
Other times be more academic and intellectual
Occasionally take a challenging stance
Mix formal and informal tones as appropriate
Question Sequencing Variety:
Don't always start with "Tell me about yourself" - sometimes begin with their interests, recent news, or an observation about their profile
Vary the order of question types (sometimes start with future goals, other times with past experiences)
Make unexpected but relevant connections between topics
Getting Started Protocol
Begin each session naturally as a real college interviewer would:
Ask about their academic interests and goals
Explore their extracurricular activities and passions
Learn about their target colleges and reasons for applying
Focus on their experiences and aspirations
Difficulty-Based Question Adaptation
Adjust complexity and expectations based on user-selected difficulty:
Beginner: Start with basic questions and provide more guidance
Advanced: Ask sophisticated questions with moderate depth
Expert: Use challenging follow-ups and expect detailed responses
Remember: Let the student ask for a specific difficulty level if they haven't specified one yet.
Custom Question Creation Protocol (Enhanced System)
For every question you ask, create completely original questions using these guidelines:

**ABSOLUTE REQUIREMENTS FOR QUESTION ORIGINALITY:**
- NEVER repeat the same question twice, even across different interview sessions
- AVOID common patterns like "Tell me about a time when..." or "I see from your profile..."
- Create UNIQUE opening phrases for each question - vary your approach dramatically
- If you've asked about challenges, next time ask about successes, innovations, or perspectives
- Use different conceptual frameworks for each topic area
- Draw from current events, emerging trends, or specific contexts relevant to their field

**STRATEGIES FOR GENERATING UNIQUE QUESTIONS:**
- Start with unexpected angles: scenarios, hypotheticals, role reversals
- Connect disparate topics in creative ways
- Reference specific details from their responses to craft personalized follow-ups
- Use time-based variations (past reflections, present analysis, future projections)
- Incorporate thought experiments or "what if" scenarios
- Ask process-oriented questions ("How do you approach...") instead of outcome questions
Key Skills for Question Development:
Drawing insights from the student's previous responses to create connected follow-ups
Developing questions that naturally emerge from the conversation flow
Formulating questions that feel personalized and authentic to each individual student
Building on their previous responses to create unique follow-ups
Why this matters:
Using the same example questions repeatedly makes interviews feel scripted and unrealistic
Students need practice with unexpected questions they haven't prepared for
Real interviewers craft questions based on the individual applicant
Original questions better simulate the authentic interview experience
Personalized questions help students learn to think on their feet
Remember: The examples are templates for structure and complexity, not scripts to follow. Every question you ask should feel fresh, relevant, and tailored to the specific student you're interviewing.
Your goal is to help students become more confident, articulate, and authentic in their college interviews while providing them with specific, actionable feedback for improvement.`
        },
        ...messages.slice(-10).map(msg => ({
          role: msg.sender === 'ai' ? 'assistant' : 'user',
          content: msg.text
        })),
        {
          role: 'user',
          content: messageText
        }
      ];

      // Debug the exact request being sent
      const requestBody = {
        messages: convertedMessages,
        includeUploadedContent: useUploadedContent && hasContent && !!user,
        interviewType: difficulty || 'general',
        maxContentTokens: 2000,
        voiceMode: isVoiceMode
      };
      
      console.log('Full request details:', {
        url: 'http://localhost:3000/api/chat',
        authHeader: user?.token ? `Bearer ${user.token}` : 'No token',
        body: requestBody,
        userObject: user
      });

      // Use authenticated endpoint when user is logged in and wants to use uploaded content
      const endpoint = user?.token && useUploadedContent 
        ? 'http://localhost:3000/api/chat/authenticated'
        : 'http://localhost:3000/api/chat';
      
      console.log('=== CHAT REQUEST DEBUG ===');
      console.log('User:', user);
      console.log('User ID:', user?._id || user?.id);
      console.log('User from localStorage:', localStorage.getItem('user'));
      console.log('Has Content:', hasContent);
      console.log('Use Uploaded Content:', useUploadedContent);
      console.log('Include Uploaded Content Flag:', requestBody.includeUploadedContent);
      console.log('Endpoint:', endpoint);
      console.log('Auth Header:', user?.token ? `Bearer ${user.token.substring(0, 20)}...` : 'No token');
      console.log('Full Request Body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token && { 'Authorization': `Bearer ${user.token}` })
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Log content usage for debugging
      if (data.contentMetadata) {
        console.log('Content metadata:', data.contentMetadata);
      }
      
      const aiMessage = { sender: 'ai', text: data.message };
      setMessages(prev => [...prev, aiMessage]);
      
      // Auto-speak AI response if voice mode and auto-play are enabled
      handleAutoSpeakAIResponse(data.message);

      // Mark voice calibration as complete after successful voice message
      if (!voiceCalibrationComplete) {
        markCalibrationComplete();
      }

    } catch (error) {
      console.error('Error sending voice message:', error);
      const errorMessage = 'Sorry, I encountered an error. Please try again.';
      const aiErrorMessage = { sender: 'ai', text: errorMessage };
      setMessages(prev => [...prev, aiErrorMessage]);
      
      // Auto-speak error message if voice mode and auto-play are enabled
      handleAutoSpeakAIResponse(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle voice input errors
   */
  const handleVoiceError = (error) => {
    console.error('Voice input error:', error);
    setSpeechError(error.message || 'Voice recognition failed');
    
    // Filter out benign errors that shouldn't be shown to user
    const benignErrors = ['aborted', 'no-speech', 'network'];
    const errorType = error.type || error.error || '';
    const errorMessage = error.message || '';
    
    // Don't show system messages for normal speech recognition lifecycle events
    if (benignErrors.includes(errorType) || 
        errorMessage.includes('aborted') ||
        errorMessage.includes('Speech recognition error: aborted')) {
      console.log('Suppressing benign voice error:', errorType, errorMessage);
      return; // Don't show these errors to the user
    }
    
    // Only show error message to user for genuine problems
    setMessages(prev => [...prev, { 
      sender: 'system', 
      text: `⚠️ Voice input error: ${error.message || 'Please try again or switch to text mode.'}` 
    }]);
  };



  /**
   * Get onboarding tips based on current state
   */
  const getOnboardingTips = () => {
    if (onboardingStep === 'completed') {
      return {
        title: "🎉 Voice Mode Ready!",
        message: "Tutorial completed successfully. You can now use voice mode for natural interview practice.",
        type: "success"
      };
    }
    
    if (onboardingStep === 'tips') {
      return {
        title: "💡 Voice Mode Tips",
        message: "Speak clearly and pause briefly after each response. You can always switch back to text mode anytime.",
        type: "info"
      };
    }
    
    return null;
  };

  const checkUploadedFiles = async () => {
    if (!user?.token) {
      console.log('No user token available');
      return;
    }
    
    try {
      const response = await fetch('http://localhost:3000/api/chat/debug-files', {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      
      if (!response.ok) {
        console.error('Failed to fetch debug files:', response.status);
        return;
      }
      
      const data = await response.json();
      console.log('=== UPLOADED FILES DEBUG ===');
      console.log('User ID:', data.userId);
      console.log('File count:', data.fileCount);
      console.log('Files:', data.files);
    } catch (error) {
      console.error('Error checking uploaded files:', error);
    }
  };

  // testVoiceTutorial function moved to App.jsx and passed as prop

  return (
    <div className="chat-container" style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif'
    }}>
      {/* Content Usage Toggle */}
      {(hasContent || user) && (
        <div style={{
          padding: '16px 20px',
          backgroundColor: 'var(--background-tertiary)',
          borderBottom: '1px solid var(--border-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '15px',
          letterSpacing: '-0.24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <div style={{
                position: 'relative',
                width: '20px',
                height: '20px',
                borderRadius: '6px',
                border: useUploadedContent ? 'none' : '2px solid var(--border-primary)',
                backgroundColor: useUploadedContent ? 'var(--accent-blue)' : 'transparent',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <input
                  type="checkbox"
                  checked={useUploadedContent}
                  onChange={(e) => setUseUploadedContent(e.target.checked)}
                  disabled={!user}
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    margin: 0,
                    cursor: 'pointer'
                  }}
                />
                {useUploadedContent && (
                  <div style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>✓</div>
                )}
              </div>
              <span style={{
                fontWeight: '400',
                color: 'var(--text-primary)'
              }}>Use uploaded content</span>
            </label>
            {showContentIndicator && (
              <span style={{
                color: '#34C759',
                fontSize: '13px',
                fontWeight: '600',
                letterSpacing: '-0.08px'
              }}>
                ✓ Content used
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={checkUploadedFiles}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                backgroundColor: 'var(--text-quaternary)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                letterSpacing: '-0.08px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--text-tertiary)';
                e.currentTarget.style.transform = 'scale(0.98)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--text-quaternary)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Debug Files
            </button>


            <button
              onClick={async () => {
                const response = await fetch('http://localhost:3000/api/chat/test-auth', {
                  headers: user?.token ? { 'Authorization': `Bearer ${user.token}` } : {}
                });
                const data = await response.json();
                console.log('Auth test result:', data);
              }}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                backgroundColor: '#34C759',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '600',
                letterSpacing: '-0.08px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#30D158';
                e.currentTarget.style.transform = 'scale(0.98)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#34C759';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Test Auth
            </button>
          </div>
        </div>
      )}

      {/* Voice Mode Toggle */}
      <VoiceModeToggle
        isVoiceMode={isVoiceMode}
        onVoiceModeChange={handleVoiceModeChange}
        disabled={isLoading}
      />

      {/* Voice Mode Tutorial (Step 12) */}
      {showVoiceTutorial && (
        <VoiceTutorial
          isOpen={showVoiceTutorial}
          onClose={handleTutorialClose}
          onComplete={handleTutorialComplete}
          skipTutorial={false}
        />
      )}

      {/* Voice Mode Onboarding Tips (Step 12) */}
      {showOnboardingTips && getOnboardingTips() && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          maxWidth: '300px',
          backgroundColor: getOnboardingTips().type === 'success' ? '#d4edda' : '#d1ecf1',
          border: `1px solid ${getOnboardingTips().type === 'success' ? '#c3e6cb' : '#bee5eb'}`,
          borderRadius: '8px',
          padding: '12px 16px',
          zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          animation: 'slideInRight 0.3s ease-out'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '4px'
          }}>
            <h4 style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: '600',
              color: getOnboardingTips().type === 'success' ? '#155724' : '#0c5460'
            }}>
              {getOnboardingTips().title}
            </h4>
            <button
              onClick={() => setShowOnboardingTips(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '16px',
                cursor: 'pointer',
                color: getOnboardingTips().type === 'success' ? '#155724' : '#0c5460',
                padding: '0',
                marginLeft: '8px'
              }}
              aria-label="Close tip"
            >
              ×
            </button>
          </div>
          <p style={{
            margin: 0,
            fontSize: '13px',
            lineHeight: '1.4',
            color: getOnboardingTips().type === 'success' ? '#155724' : '#0c5460'
          }}>
            {getOnboardingTips().message}
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.sender}`}>
            <ReactMarkdown>{message.text}</ReactMarkdown>
          </div>
        ))}
        {isLoading && (
          <div className="message ai">
            <em>Thinking...</em>
          </div>
        )}
      </div>

      {/* Interview Control Buttons */}
      <div style={{
        position: 'absolute',
        bottom: '70px',
        right: '20px',
        display: 'flex',
        gap: '8px',
        zIndex: 10
      }}>

        {user && isInterviewActive && (
            <button
              onClick={handleEndInterviewClick}
              disabled={endInterviewButtonState === 'processing'}
              style={{
                padding: '12px 20px',
                fontSize: '15px',
                backgroundColor: endInterviewButtonState === 'processing' ? '#8E8E93' : '#34C759',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                cursor: endInterviewButtonState === 'processing' ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                letterSpacing: '-0.24px',
                opacity: endInterviewButtonState === 'processing' ? 0.7 : 1,
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
              onMouseOver={(e) => {
                if (endInterviewButtonState !== 'processing') {
                  e.currentTarget.style.backgroundColor = '#30D158';
                  e.currentTarget.style.transform = 'scale(0.98)';
                }
              }}
              onMouseOut={(e) => {
                if (endInterviewButtonState !== 'processing') {
                  e.currentTarget.style.backgroundColor = '#34C759';
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              {endInterviewButtonState === 'processing' && (
                <div style={{
                  width: '12px',
                  height: '12px',
                  border: '2px solid #ffffff',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}>
                  <style jsx>{`
                    @keyframes spin {
                      0% { transform: rotate(0deg); }
                      100% { transform: rotate(360deg); }
                    }
                  `}</style>
                </div>
              )}
              {endInterviewButtonState === 'idle' && '✅ End Interview'}
              {endInterviewButtonState === 'confirming' && '🤔 Confirm?'}
              {endInterviewButtonState === 'processing' && 'Generating Rating...'}
              {endInterviewButtonState === 'complete' && '✅ Complete!'}
            </button>
          )}

        {isInterviewCompleted && (
          <button
            onClick={user ? newInterview : undefined}
            disabled={!user}
            style={{
              padding: '12px 20px',
              fontSize: '15px',
              backgroundColor: user ? '#007AFF' : '#8E8E93',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              cursor: user ? 'pointer' : 'not-allowed',
              fontWeight: '600',
              letterSpacing: '-0.24px',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              opacity: user ? 1 : 0.7
            }}
            onMouseOver={(e) => {
              if (user) {
                e.currentTarget.style.backgroundColor = '#0051D5';
                e.currentTarget.style.transform = 'scale(0.98)';
              }
            }}
            onMouseOut={(e) => {
              if (user) {
                e.currentTarget.style.backgroundColor = '#007AFF';
                e.currentTarget.style.transform = 'scale(1)';
              }
            }}
          >
            {user ? '🔄 New Interview' : '🔒 Login Required'}
          </button>
        )}
      </div>

      {/* Progress Indicator for AI Rating Generation (Step 14) */}
      <ProgressIndicator
        isVisible={showProgressIndicator}
        currentStep={progressStep}
        totalSteps={3}
        showOverlay={true}
        onComplete={() => {
          console.log('Progress indicator completed');
        }}
      />

      {/* Confirmation Dialog for End Interview (Step 15) */}
      {showConfirmDialog && (
        <>
          {/* Overlay */}
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1001,
            backdropFilter: 'blur(2px)'
          }}></div>
          
          {/* Dialog */}
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1002,
            backgroundColor: 'var(--background-primary)',
            borderRadius: '12px',
            padding: '30px',
            boxShadow: '0 10px 40px var(--shadow-medium)',
            border: '1px solid var(--border-primary)',
            minWidth: '320px',
            maxWidth: '450px',
            textAlign: 'center'
          }}>
            <div style={{
              marginBottom: '15px',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10.5" stroke="var(--text-primary)" strokeWidth="1.5"/>
                <circle cx="12" cy="12" r="6" stroke="var(--text-primary)" strokeWidth="1.5"/>
                <circle cx="12" cy="12" r="2.25" fill="var(--text-primary)"/>
              </svg>
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginBottom: '10px'
            }}>
              End Interview?
            </div>
            <div style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              marginBottom: '25px',
              lineHeight: '1.4'
            }}>
              Choose how you'd like to end this interview session. You can generate AI feedback (requires at least 2-3 exchanges) or simply end without rating.
            </div>
            
            {/* Interview Summary */}
            <div style={{
              backgroundColor: 'var(--background-secondary)',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '25px',
              textAlign: 'left'
            }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                📊 Interview Summary
              </div>
              <div style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '4px'
              }}>
                <span>Messages exchanged:</span>
                <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{messages.length - 1}</span>
              </div>
              <div style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '4px'
              }}>
                <span>Difficulty level:</span>
                <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>{difficulty || 'Not set'}</span>
              </div>
              <div style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>Duration:</span>
                <span style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                  {interviewStartTime ? 
                    `${Math.floor((Date.now() - interviewStartTime.getTime()) / (1000 * 60))} minutes` : 
                    'Unknown'
                  }
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={cancelEndInterview}
                style={{
                  padding: '12px 20px',
                  fontSize: '15px',
                  backgroundColor: '#8E8E93',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  letterSpacing: '-0.24px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#6D6D70';
                  e.target.style.transform = 'scale(0.98)';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = '#8E8E93';
                  e.target.style.transform = 'scale(1)';
                }}
              >
                ❌ Cancel
              </button>
              <button
                onClick={endInterviewWithoutRating}
                style={{
                  padding: '12px 20px',
                  fontSize: '15px',
                  backgroundColor: '#FF9500',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  letterSpacing: '-0.24px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#DB7600';
                  e.target.style.transform = 'scale(0.98)';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = '#FF9500';
                  e.target.style.transform = 'scale(1)';
                }}
              >
                🚪 End Without Rating
              </button>
              <button
                onClick={confirmEndInterview}
                style={{
                  padding: '12px 20px',
                  fontSize: '15px',
                  backgroundColor: '#34C759',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  letterSpacing: '-0.24px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#30D158';
                  e.target.style.transform = 'scale(0.98)';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = '#34C759';
                  e.target.style.transform = 'scale(1)';
                }}
              >
                ✅ Yes, Generate Rating
              </button>
            </div>
          </div>
        </>
      )}

      {/* Input Section - Conditional rendering based on voice mode */}
      <div className="input-row" style={{
        opacity: (isInterviewCompleted) ? 0.5 : 1,
        pointerEvents: (isInterviewCompleted) ? 'none' : 'auto'
      }}>
        {isVoiceMode ? (
          /* Voice Input Interface */
          <VoiceInput
            onVoiceInput={handleVoiceInput}
            onError={handleVoiceError}
            disabled={isLoading || isInterviewCompleted || isSpeaking}
            autoSubmit={false}
            showConfirmation={false}
            placeholder={
              isInterviewCompleted ? "Interview completed" : 
              isSpeaking ? "AI is speaking... Please wait" :
              "Click to speak, click again to stop and send..."
            }
            className="voice-input-chat"
          />
        ) : (
          /* Text Input Interface */
          <>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isInterviewCompleted ? "Interview completed" : 
                "Type your message..."
              }
              disabled={isLoading || isInterviewCompleted}
              style={{
                padding: '12px 16px',
                border: '1px solid var(--border-primary)',
                borderRadius: '20px',
                fontSize: '17px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
                letterSpacing: '-0.41px',
                backgroundColor: isInterviewCompleted ? 'var(--toggle-inactive)' : 'var(--input-background)',
                color: 'var(--text-primary)',
                transition: 'all 0.2s ease',
                outline: 'none',
                flex: 1,
                marginRight: '8px'
              }}
              onFocus={(e) => {
                if (!isInterviewCompleted) {
                  e.currentTarget.style.borderColor = 'var(--accent-blue)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,122,255,0.1)';
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-primary)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <button 
              onClick={sendMessage} 
              disabled={isLoading || !input.trim() || isInterviewCompleted}
              style={{
                padding: '12px 20px',
                backgroundColor: (isLoading || !input.trim() || isInterviewCompleted) ? 'var(--border-primary)' : 'var(--accent-blue)',
                color: (isLoading || !input.trim() || isInterviewCompleted) ? 'var(--text-quaternary)' : 'white',
                border: 'none',
                borderRadius: '20px',
                fontSize: '15px',
                fontWeight: '600',
                letterSpacing: '-0.24px',
                cursor: (isLoading || !input.trim() || isInterviewCompleted) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                minWidth: '70px'
              }}
              onMouseOver={(e) => {
                if (!isLoading && input.trim() && !isInterviewCompleted) {
                  e.currentTarget.style.backgroundColor = 'var(--accent-blue-hover)';
                  e.currentTarget.style.transform = 'scale(0.98)';
                }
              }}
              onMouseOut={(e) => {
                if (!isLoading && input.trim() && !isInterviewCompleted) {
                  e.currentTarget.style.backgroundColor = 'var(--accent-blue)';
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}