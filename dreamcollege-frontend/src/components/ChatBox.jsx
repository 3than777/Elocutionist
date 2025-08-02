import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useUploadContext } from '../context/UploadContext';
import { submitInterviewTranscript, generateAIRating as apiGenerateAIRating, retryApiCall, getUserFriendlyErrorMessage, getProgressMessage } from '../services/api';
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
  setRatingError
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
  
  // Voice Mode Onboarding state management (Step 12)
  const [showVoiceTutorial, setShowVoiceTutorial] = useState(false);
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
  
  // Get upload context
  const { uploadedFiles, refreshFiles } = useUploadContext();
  const hasContent = uploadedFiles && uploadedFiles.length > 0;
   
   // Log upload context for debugging
   useEffect(() => {
     console.log('Upload context files:', uploadedFiles);
     console.log('Has content:', hasContent);
   }, [uploadedFiles, hasContent]);

   // Check for first-time voice user on component mount (Step 12)
   useEffect(() => {
     checkFirstTimeVoiceUser();
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
          content: `AI College Interview Coach System Prompt
You are an expert college interview coach with extensive experience helping students prepare for admissions interviews at top universities. Your role is to conduct realistic practice interviews that help students improve their interviewing skills through personalized questions and constructive feedback.
Your Core Responsibilities
Conduct Practice Interviews:
Ask ONE interview question at a time (never provide a list of questions)
Tailor questions based on the student's profile, interests, target schools, and intended major
Ask natural follow-up questions that dig deeper into their responses
Create a conversational flow that mirrors real college interviews
Track Performance:
Continuously observe and mentally note the student's interviewing strengths and areas for improvement
Pay attention to their communication style, depth of responses, authenticity, and ability to articulate their thoughts
Remember patterns in their answers throughout the session

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
Begin each session by gathering the student's profile information:
Target colleges/universities they're applying to
Intended major or academic interests
Key extracurricular activities, hobbies, or passions
Any specific areas they want to practice (e.g., discussing weaknesses, explaining academic choices)
Previous interview experience level
Difficulty level preference (Easy, Advanced, or Hard)
Difficulty-Based Question Adaptation
If Difficulty: ${mapDifficulty(difficulty) === 'easy' ? 'Easy' : mapDifficulty(difficulty) === 'hard' ? 'Hard' : 'Advanced'}
${mapDifficulty(difficulty) === 'easy' ? `Ask straightforward, commonly asked interview questions
Use simpler language and shorter questions
Provide gentle guidance or hints if the student struggles
Limit follow-up questions to 1-2 per topic
Focus on basic topics like interests, academic goals, and simple experiences
Be more encouraging and less probing in your approach` : mapDifficulty(difficulty) === 'hard' ? `Ask complex, thought-provoking questions that require deep reflection
Use intensive follow-up questioning (3-4 follow-ups per topic)
Include unexpected, creative, or scenario-based questions
Challenge assumptions and push for nuanced thinking
Ask hypothetical situations and ethical dilemmas
Expect sophisticated, well-reasoned responses` : `Ask standard college interview questions with moderate complexity
Use 2-3 thoughtful follow-up questions per topic
Balance challenge with support
Include both personal and academic exploration
Ask for specific examples and deeper explanations
Maintain professional but supportive tone`}
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
Profile Building: Gather their information naturally through conversation, not as a formal questionnaire
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
        maxContentTokens: 2000
      };
      
      console.log('Full request details:', {
        url: 'http://localhost:3000/api/chat',
        authHeader: user?.token ? `Bearer ${user.token}` : 'No token',
        body: requestBody,
        userObject: user
      });

      const response = await fetch('http://localhost:3000/api/chat', {
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
      
      setMessages(prev => [...prev, { sender: 'ai', text: data.message }]);

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text: 'Sorry, I encountered an error. Please try again.' 
      }]);
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
    setMessages([{ sender: 'ai', text: 'Interview started! Let\'s begin with some questions.' }]);
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

  // End Interview (Enhanced for Steps 6-8)
  const endInterview = async () => {
    // Validate user authentication
    if (!user?.token) {
      setRatingError('Authentication required for AI rating. Please log in.');
      setIsInterviewActive(false);
      setIsInterviewCompleted(true);
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text: 'Interview completed! Please log in to receive AI feedback. Click "New Interview" to start again.' 
      }]);
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
    setMessages(prev => [...prev, { 
      sender: 'ai', 
      text: getProgressMessage('transcript', 1) 
    }]);

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
        setMessages(prev => [...prev.slice(0, -1), { 
          sender: 'ai', 
          text: getProgressMessage('rating', 1) 
        }]);

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
        setMessages(prev => [...prev.slice(0, -1), { 
          sender: 'ai', 
          text: 'Interview completed! Check the AI Rating section for your personalized feedback. Click "New Interview" to start again.' 
        }]);
        
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
      setMessages(prev => [...prev.slice(0, -1), { 
        sender: 'ai', 
        text: `Interview completed! However, there was an issue: ${userMessage}${actionMessage}` 
      }]);
    } finally {
      setRatingLoading(false);
    }
  };

  // New Interview
  const newInterview = async () => {
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
    setMessages([{ sender: 'ai', text: 'Hello! Ready to practice?' }]);
    setInput('');
    
    // Automatically start the interview by sending an initial message
    setTimeout(async () => {
      setIsLoading(true);
      
      try {
        // Convert initial conversation to OpenAI format
        const convertedMessages = [
          {
            role: 'system',
            content: `AI College Interview Coach System Prompt
You are an expert college interview coach with extensive experience helping students prepare for admissions interviews at top universities. Your role is to conduct realistic practice interviews that help students improve their interviewing skills through personalized questions and constructive feedback.
Your Core Responsibilities
Conduct Practice Interviews:
Ask ONE interview question at a time (never provide a list of questions)
Tailor questions based on the student's profile, interests, target schools, and intended major
Ask natural follow-up questions that dig deeper into their responses
Create a conversational flow that mirrors real college interviews
Track Performance:
Continuously observe and mentally note the student's interviewing strengths and areas for improvement
Pay attention to their communication style, depth of responses, authenticity, and ability to articulate their thoughts
Remember patterns in their answers throughout the session

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
Begin each session by gathering the student's profile information:
Target colleges/universities they're applying to
Intended major or academic interests
Key extracurricular activities, hobbies, or passions
Any specific areas they want to practice (e.g., discussing weaknesses, explaining academic choices)
Previous interview experience level
Difficulty level preference (Easy, Advanced, or Hard)
Difficulty-Based Question Adaptation
If Difficulty: ${mapDifficulty(difficulty) === 'easy' ? 'Easy' : mapDifficulty(difficulty) === 'hard' ? 'Hard' : 'Advanced'}
${mapDifficulty(difficulty) === 'easy' ? `Ask straightforward, commonly asked interview questions
Use simpler language and shorter questions
Provide gentle guidance or hints if the student struggles
Limit follow-up questions to 1-2 per topic
Focus on basic topics like interests, academic goals, and simple experiences
Be more encouraging and less probing in your approach` : mapDifficulty(difficulty) === 'hard' ? `Ask complex, thought-provoking questions that require deep reflection
Use intensive follow-up questioning (3-4 follow-ups per topic)
Include unexpected, creative, or scenario-based questions
Challenge assumptions and push for nuanced thinking
Ask hypothetical situations and ethical dilemmas
Expect sophisticated, well-reasoned responses` : `Ask standard college interview questions with moderate complexity
Use 2-3 thoughtful follow-up questions per topic
Balance challenge with support
Include both personal and academic exploration
Ask for specific examples and deeper explanations
Maintain professional but supportive tone`}
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
Profile Building: Gather their information naturally through conversation, not as a formal questionnaire
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
          maxContentTokens: 2000
        };

        const response = await fetch('http://localhost:3000/api/chat', {
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
        setMessages(prev => [...prev, { sender: 'ai', text: data.message }]);

      } catch (error) {
        console.error('Error starting interview:', error);
        setMessages(prev => [...prev, { 
          sender: 'ai', 
          text: 'Sorry, I encountered an error starting the interview. Please try again.' 
        }]);
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
          content: `AI College Interview Coach System Prompt
You are an expert college interview coach with extensive experience helping students prepare for admissions interviews at top universities. Your role is to conduct realistic practice interviews that help students improve their interviewing skills through personalized questions and constructive feedback.
Your Core Responsibilities
Conduct Practice Interviews:
Ask ONE interview question at a time (never provide a list of questions)
Tailor questions based on the student's profile, interests, target schools, and intended major
Ask natural follow-up questions that dig deeper into their responses
Create a conversational flow that mirrors real college interviews
Track Performance:
Continuously observe and mentally note the student's interviewing strengths and areas for improvement
Pay attention to their communication style, depth of responses, authenticity, and ability to articulate their thoughts
Remember patterns in their answers throughout the session

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
Begin each session by gathering the student's profile information:
Target colleges/universities they're applying to
Intended major or academic interests
Key extracurricular activities, hobbies, or passions
Any specific areas they want to practice (e.g., discussing weaknesses, explaining academic choices)
Previous interview experience level
Difficulty level preference (Easy, Advanced, or Hard)
Difficulty-Based Question Adaptation
Adjust complexity and expectations based on user-selected difficulty:
Beginner: Start with basic questions and provide more guidance
Advanced: Ask sophisticated questions with moderate depth
Expert: Use challenging follow-ups and expect detailed responses
Remember: Let the student ask for a specific difficulty level if they haven't specified one yet.
Custom Question Creation Protocol (Enhanced System)
For every question you ask, create completely original questions using these guidelines:
NEVER copy example questions exactly as written - always create variations
Use the example questions only as inspiration for structure and topic areas
Personalize every question based on the student's specific interests, background, and goals
Integrate details from their previous responses to create connected, flowing conversations
Base questions on current events, recent developments, or real-world applications relevant to their field
Create hypothetical scenarios that connect to their experiences and interests
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
        maxContentTokens: 2000
      };
      
      console.log('Full request details:', {
        url: 'http://localhost:3000/api/chat',
        authHeader: user?.token ? `Bearer ${user.token}` : 'No token',
        body: requestBody,
        userObject: user
      });

      const response = await fetch('http://localhost:3000/api/chat', {
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
      
      setMessages(prev => [...prev, { sender: 'ai', text: data.message }]);

      // Mark voice calibration as complete after successful voice message
      if (!voiceCalibrationComplete) {
        markCalibrationComplete();
      }

    } catch (error) {
      console.error('Error sending voice message:', error);
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        text: 'Sorry, I encountered an error. Please try again.' 
      }]);
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
    
    // Show error message to user
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

  return (
    <div className="chat-container">
      {/* Content Usage Toggle */}
      {(hasContent || user) && (
        <div style={{
          padding: '10px',
          backgroundColor: '#f0f8ff',
          borderBottom: '1px solid #ddd',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={useUploadedContent}
                onChange={(e) => setUseUploadedContent(e.target.checked)}
                disabled={!user}
              />
              Use uploaded content
            </label>
            {showContentIndicator && (
              <span style={{
                color: '#28a745',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                ✓ Content used
              </span>
            )}
          </div>
          <button
            onClick={checkUploadedFiles}
            style={{
              padding: '5px 10px',
              fontSize: '12px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '5px'
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
              padding: '5px 10px',
              fontSize: '12px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Test Auth
          </button>
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
      {user && (
        <div style={{
          position: 'absolute',
          bottom: '70px',
          right: '20px',
          display: 'flex',
          gap: '8px',
          zIndex: 10
        }}>

          {isInterviewActive && (
            <button
              onClick={handleEndInterviewClick}
              disabled={endInterviewButtonState === 'processing'}
              style={{
                padding: '10px 18px',
                fontSize: '14px',
                backgroundColor: endInterviewButtonState === 'processing' ? '#6c757d' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: endInterviewButtonState === 'processing' ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                opacity: endInterviewButtonState === 'processing' ? 0.7 : 1,
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                position: 'relative',
                overflow: 'hidden'
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
              onClick={newInterview}
              style={{
                padding: '10px 18px',
                fontSize: '14px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              🔄 New Interview
            </button>
          )}
        </div>
      )}

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
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '30px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            border: '1px solid #e9ecef',
            minWidth: '320px',
            maxWidth: '450px',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '24px',
              marginBottom: '15px'
            }}>
              🎯
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#495057',
              marginBottom: '10px'
            }}>
              End Interview & Generate AI Rating?
            </div>
            <div style={{
              fontSize: '14px',
              color: '#6c757d',
              marginBottom: '25px',
              lineHeight: '1.4'
            }}>
              This will analyze your responses and generate personalized feedback. The process may take a few moments.
            </div>
            
            {/* Interview Summary */}
            <div style={{
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '25px',
              textAlign: 'left'
            }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#495057',
                marginBottom: '8px'
              }}>
                📊 Interview Summary
              </div>
              <div style={{
                fontSize: '13px',
                color: '#6c757d',
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '4px'
              }}>
                <span>Messages exchanged:</span>
                <span style={{ fontWeight: '500' }}>{messages.length - 1}</span>
              </div>
              <div style={{
                fontSize: '13px',
                color: '#6c757d',
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '4px'
              }}>
                <span>Difficulty level:</span>
                <span style={{ fontWeight: '500' }}>{difficulty || 'Not set'}</span>
              </div>
              <div style={{
                fontSize: '13px',
                color: '#6c757d',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>Duration:</span>
                <span style={{ fontWeight: '500' }}>
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
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={cancelEndInterview}
                style={{
                  padding: '12px 20px',
                  fontSize: '14px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#545b62'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#6c757d'}
              >
                ❌ Cancel
              </button>
              <button
                onClick={confirmEndInterview}
                style={{
                  padding: '12px 20px',
                  fontSize: '14px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#218838'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#28a745'}
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
            disabled={isLoading || isInterviewCompleted}
            autoSubmit={false}
            showConfirmation={false}
            placeholder={
              isInterviewCompleted ? "Interview completed" : 
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
            />
            <button 
              onClick={sendMessage} 
              disabled={isLoading || !input.trim() || isInterviewCompleted}
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}