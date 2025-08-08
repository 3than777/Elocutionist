/**
 * Voice Mode Tutorial Component
 * 
 * Interactive tutorial component that guides users through voice mode setup and usage.
 * Provides step-by-step onboarding with progress indicators and interactive elements.
 * 
 * Features:
 * - 5-step tutorial process from introduction to customization
 * - Microphone permission request flow
 * - Voice test and calibration functionality
 * - Practice voice input/output session
 * - Settings customization guidance
 * - Skip option for experienced users
 * - Progress tracking and state persistence
 * - Accessibility support with ARIA labels
 * 
 * Tutorial Steps:
 * 1. Introduction to voice mode benefits
 * 2. Microphone permission request
 * 3. Voice test and calibration
 * 4. Practice voice input/output
 * 5. Settings customization guide
 * 
 * Integration:
 * - Can be triggered from VoiceModeToggle on first use
 * - Can be accessed from SettingsPanel
 * - Remembers completion status in localStorage
 * - Graceful fallback handling for unsupported browsers
 */

import React, { useState, useEffect, useRef } from 'react';
import { getVoiceCapabilities, getBrowserRecommendation } from '../utils/voiceCompatibility';
import { validateHTTPSRequirement } from '../services/httpsHandler';
import { initializeSpeechRecognition, startListening, stopListening } from '../services/speechRecognition';
import { initializeTextToSpeech, speakText, speakTextTutorial, stopSpeaking, getAvailableVoices } from '../services/textToSpeech';

export default function VoiceTutorial({ 
  isOpen, 
  onClose, 
  onComplete,
  skipTutorial = false 
}) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);
  const [canProceed, setCanProceed] = useState(false);
  
  // Voice capability state
  const [voiceCapabilities, setVoiceCapabilities] = useState(null);
  const [microphonePermission, setMicrophonePermission] = useState('prompt');
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [testResult, setTestResult] = useState(null);
  
  // Practice session state
  const [isPracticing, setIsPracticing] = useState(false);
  const [practiceTranscript, setPracticeTranscript] = useState('');
  const [practiceAudioLevel, setPracticeAudioLevel] = useState(0);

  
  // Tutorial persistence
  const [tutorialProgress, setTutorialProgress] = useState({});
  
  // Refs for voice services
  const speechRecognitionRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  const TUTORIAL_STEPS = [
    {
      id: 1,
      title: "Welcome to Voice Mode",
      subtitle: "Experience natural conversation",
      description: "Voice mode allows you to speak your responses and hear AI feedback, creating a more realistic interview experience.",
      icon: "🎤",
      canSkip: true
    },
    {
      id: 2,
      title: "Microphone Permission",
      subtitle: "Enable voice input",
      description: "We need access to your microphone to convert your speech to text. Your voice data stays on your device.",
      icon: "🔐",
      canSkip: false
    },
    {
      id: 3,
      title: "Voice Test",
      subtitle: "Calibrate your setup",
      description: "Let's test your microphone and speakers to ensure optimal voice recognition and playback quality.",
      icon: "🔧",
      canSkip: false
    },
    {
      id: 4,
      title: "Practice Session",
      subtitle: "Try voice interaction",
      description: "Practice speaking with our AI to get comfortable with voice mode before your actual interview.",
      icon: "💬",
      canSkip: true
    },
    {
      id: 5,
      title: "Customize Settings",
      subtitle: "Personalize your experience",
      description: "Adjust voice settings like speech rate, volume, and recognition sensitivity to match your preferences.",
      icon: "⚙️",
      canSkip: true
    }
  ];

  // Initialize tutorial on mount
  useEffect(() => {
    if (isOpen) {
      initializeTutorial();
    }
    
    return () => {
      cleanup();
    };
  }, [isOpen]);

  // Load tutorial progress from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem('voiceTutorialProgress');
    if (savedProgress) {
      try {
        setTutorialProgress(JSON.parse(savedProgress));
      } catch (error) {
        console.warn('Failed to load tutorial progress:', error);
      }
    }
  }, []);

  // Check if tutorial was already completed
  useEffect(() => {
    const isAlreadyCompleted = localStorage.getItem('voiceTutorialCompleted') === 'true';
    if (isAlreadyCompleted && skipTutorial) {
      handleComplete();
    }
  }, [skipTutorial]);

  /**
   * Initialize tutorial and check voice capabilities
   */
  const initializeTutorial = async () => {
    try {
      // Check voice capabilities
      const capabilities = await getVoiceCapabilities();
      setVoiceCapabilities(capabilities);
      
      // Check microphone permission status
      if (navigator.permissions && navigator.permissions.query) {
        const permission = await navigator.permissions.query({ name: 'microphone' });
        setMicrophonePermission(permission.state);
        
        permission.onchange = () => {
          setMicrophonePermission(permission.state);
        };
      }
      
      // Initialize voice services if supported
      if (capabilities.canUseVoiceMode) {
        await initializeSpeechRecognition();
        await initializeTextToSpeech();
      }
      
      setCanProceed(true);
      
    } catch (error) {
      console.error('Tutorial initialization failed:', error);
      setCanProceed(false);
    }
  };

  /**
   * Cleanup function for voice services and animations
   */
  const cleanup = () => {
    if (speechRecognitionRef.current) {
      stopListening();
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    stopSpeaking();
  };

  /**
   * Handle step navigation
   */
  const goToStep = (stepNumber) => {
    if (stepNumber >= 1 && stepNumber <= TUTORIAL_STEPS.length) {
      setCurrentStep(stepNumber);
      saveTutorialProgress(stepNumber);
    }
  };

  const nextStep = () => {
    if (currentStep < TUTORIAL_STEPS.length) {
      goToStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const previousStep = () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  };

  /**
   * Save tutorial progress to localStorage
   */
  const saveTutorialProgress = (step) => {
    const progress = {
      ...tutorialProgress,
      currentStep: step,
      timestamp: new Date().toISOString()
    };
    setTutorialProgress(progress);
    localStorage.setItem('voiceTutorialProgress', JSON.stringify(progress));
  };

  /**
   * Handle tutorial completion
   */
  const handleComplete = () => {
    setIsCompleted(true);
    localStorage.setItem('voiceTutorialCompleted', 'true');
    localStorage.setItem('voiceTutorialCompletedAt', new Date().toISOString());
    
    if (onComplete) {
      onComplete();
    }
  };

  /**
   * Skip tutorial
   */
  const handleSkip = () => {
    localStorage.setItem('voiceTutorialSkipped', 'true');
    localStorage.setItem('voiceTutorialSkippedAt', new Date().toISOString());
    
    // For testing: add option to skip forever
    const skipForever = window.confirm('Skip voice tutorial permanently? (You can still access it from settings later)');
    if (skipForever) {
      localStorage.setItem('voiceTutorial_skipForever', 'true');
      localStorage.setItem('voiceMode_hasUsed', 'true');
    }
    
    if (onClose) {
      onClose();
    }
  };

  /**
   * Request microphone permission
   */
  const requestMicrophonePermission = async () => {
    try {
      setIsTestingVoice(true);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Success - permission granted
      setMicrophonePermission('granted');
      setTestResult({ success: true, message: 'Microphone access granted successfully!' });
      
      // Stop the stream
      stream.getTracks().forEach(track => track.stop());
      
      // Auto-advance to next step after brief delay
      setTimeout(() => {
        nextStep();
      }, 1500);
      
    } catch (error) {
      console.error('Microphone permission denied:', error);
      setMicrophonePermission('denied');
      setTestResult({ 
        success: false, 
        message: 'Microphone access denied. Please check your browser settings.',
        error: error.message
      });
    } finally {
      setIsTestingVoice(false);
    }
  };

  /**
   * Test voice functionality
   */
  const testVoiceFunction = async () => {
    try {
      setIsTestingVoice(true);
      setTestResult(null);
      
      // Test speech synthesis with consistent volume using tutorial-specific function
      await speakTextTutorial("Hello! This is a test of your speakers. Can you hear me clearly?");
      
      // Test speech recognition
      const recognition = await startListening(
        (result) => {
          setPracticeTranscript(result.transcript);
        },
        (error) => {
          console.error('Voice test error:', error);
          setTestResult({ success: false, message: 'Voice recognition test failed', error: error.message });
        }
      );
      
      if (recognition) {
        speechRecognitionRef.current = recognition;
        setupAudioAnalyzer();
        
        setTestResult({ 
          success: true, 
          message: 'Voice test started! Say something to test your microphone.' 
        });
      }
      
    } catch (error) {
      console.error('Voice test failed:', error);
      setTestResult({ 
        success: false, 
        message: 'Voice test failed. Please check your audio settings.',
        error: error.message
      });
    } finally {
      setIsTestingVoice(false);
    }
  };

  /**
   * Setup audio analyzer for visual feedback
   */
  const setupAudioAnalyzer = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateAudioLevel = () => {
        analyserRef.current.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        const normalizedLevel = Math.min(100, (average / 255) * 100);
        
        setPracticeAudioLevel(normalizedLevel);
        
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      
      updateAudioLevel();
      
    } catch (error) {
      console.error('Audio analyzer setup failed:', error);
    }
  };

  /**
   * Start practice session
   */
  const startPracticeSession = async () => {
    try {
      setIsPracticing(true);
      setPracticeTranscript('');
      setPracticeAudioLevel(0);
      
      
      // Give instruction with consistent volume using tutorial-specific function
      await speakTextTutorial("Let's practice! Tell me about yourself in a few sentences. I'll listen and respond.");
      
      // Wait a moment for the speech to finish
      setTimeout(async () => {
        try {
          // Start speech recognition for practice
          const recognition = await startListening(
            (result) => {
              setPracticeTranscript(result.transcript);
              
              // If we have a final result, provide AI response
              if (result.isFinal && result.transcript.trim().length > 10) {
                handlePracticeResponse(result.transcript);
              }
            },
            (error) => {
              console.error('Practice session error:', error);
              setIsPracticing(false);
            }
          );
          
          if (recognition) {
            speechRecognitionRef.current = recognition;
            setupAudioAnalyzer();
          }
          
        } catch (error) {
          console.error('Failed to start speech recognition:', error);
          setIsPracticing(false);
        }
      }, 1000);
      
    } catch (error) {
      console.error('Practice session failed:', error);
      setIsPracticing(false);
    }
  };

  /**
   * Handle practice session AI response
   */
  const handlePracticeResponse = async (userInput) => {
    try {
      // Stop listening while AI responds
      stopListening();
      
      // Generate a simple practice response based on user input
      let aiResponse = "";
      
      if (userInput.toLowerCase().includes("myself") || userInput.toLowerCase().includes("about me")) {
        aiResponse = "Thank you for sharing! That's a great start. In a real interview, I might ask you to elaborate on specific experiences or skills you mentioned. Your voice came through clearly!";
      } else if (userInput.toLowerCase().includes("experience") || userInput.toLowerCase().includes("work")) {
        aiResponse = "Excellent! I can hear the confidence in your voice. In an actual interview, I'd want to know more about the impact you made in that role. Practice complete!";
      } else if (userInput.toLowerCase().includes("skills") || userInput.toLowerCase().includes("good at")) {
        aiResponse = "Great response! Your pronunciation is clear and easy to understand. In a real interview, I might ask for specific examples. Well done with the practice!";
      } else {
        aiResponse = "Thank you for practicing with me! Your voice quality is good and I understood you clearly. In a real interview, I would ask follow-up questions based on your response. Great job!";
      }
      
      // Speak the AI response with consistent volume using tutorial-specific function
      await speakTextTutorial(aiResponse);
      
      // End the practice session after response
      setTimeout(() => {
        setIsPracticing(false);
      }, 500);
      
    } catch (error) {
      console.error('Failed to generate practice response:', error);
      setIsPracticing(false);
    }
  };

  /**
   * Stop practice session
   */
  const stopPracticeSession = () => {
    setIsPracticing(false);
    stopListening();
    stopSpeaking();
    cleanup();
  };

  /**
   * Get current step component
   */
  const getCurrentStepComponent = () => {
    switch (currentStep) {
      case 1:
        return <IntroductionStep />;
      case 2:
        return <PermissionStep />;
      case 3:
        return <VoiceTestStep />;
      case 4:
        return <PracticeStep />;
      case 5:
        return <SettingsStep />;
      default:
        return <IntroductionStep />;
    }
  };

  /**
   * Introduction Step Component
   */
  const IntroductionStep = () => (
    <div className="tutorial-step tutorial-step--intro">
      <div className="tutorial-step__icon">🎤</div>
      <h3>Welcome to Voice Mode</h3>
      <p>
        Voice mode transforms your interview practice with natural conversation. 
        Speak your responses and hear AI feedback, just like a real interview.
      </p>
      
      <div className="tutorial-benefits">
        <div className="tutorial-benefit">
          <span className="tutorial-benefit__icon">🗣️</span>
          <span>Natural speech practice</span>
        </div>
        <div className="tutorial-benefit">
          <span className="tutorial-benefit__icon">👂</span>
          <span>Audio feedback from AI</span>
        </div>
        <div className="tutorial-benefit">
          <span className="tutorial-benefit__icon">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="var(--accent-primary)" strokeWidth="1.5"/>
              <circle cx="8" cy="8" r="4" stroke="var(--accent-primary)" strokeWidth="1.5"/>
              <circle cx="8" cy="8" r="1.5" fill="var(--accent-primary)"/>
            </svg>
          </span>
          <span>Realistic interview experience</span>
        </div>
        <div className="tutorial-benefit">
          <span className="tutorial-benefit__icon">🔒</span>
          <span>Private - voice stays on device</span>
        </div>
      </div>
      
      {voiceCapabilities && !voiceCapabilities.canUseVoiceMode && (
        <div className="tutorial-warning">
          <p>⚠️ Limited voice support detected in your browser.</p>
          <p>{getBrowserRecommendation(voiceCapabilities)}</p>
        </div>
      )}
    </div>
  );

  /**
   * Permission Step Component
   */
  const PermissionStep = () => (
    <div className="tutorial-step tutorial-step--permission">
      <div className="tutorial-step__icon">🔐</div>
      <h3>Microphone Permission</h3>
      <p>
        We need access to your microphone to convert your speech to text. 
        Your voice data is processed locally and never sent to our servers.
      </p>
      
      <div className="tutorial-permission-status">
        <div className={`permission-indicator permission-indicator--${microphonePermission}`}>
          <span className="permission-indicator__icon">
            {microphonePermission === 'granted' ? '✅' : 
             microphonePermission === 'denied' ? '❌' : '❓'}
          </span>
          <span className="permission-indicator__text">
            {microphonePermission === 'granted' ? 'Microphone access granted' :
             microphonePermission === 'denied' ? 'Microphone access denied' :
             'Microphone permission required'}
          </span>
        </div>
      </div>
      
      {microphonePermission !== 'granted' && (
        <button
          className="tutorial-button tutorial-button--primary"
          onClick={requestMicrophonePermission}
          disabled={isTestingVoice}
        >
          {isTestingVoice ? 'Requesting Permission...' : 'Grant Microphone Access'}
        </button>
      )}
      
      {testResult && (
        <div className={`tutorial-result tutorial-result--${testResult.success ? 'success' : 'error'}`}>
          <p>{testResult.message}</p>
          {testResult.error && (
            <details>
              <summary>Technical Details</summary>
              <p>{testResult.error}</p>
            </details>
          )}
        </div>
      )}
    </div>
  );

  /**
   * Voice Test Step Component
   */
  const VoiceTestStep = () => (
    <div className="tutorial-step tutorial-step--test">
      <div className="tutorial-step__icon">🔧</div>
      <h3>Voice Test & Calibration</h3>
      <p>
        Let's test your microphone and speakers to ensure optimal voice quality.
        You'll hear a test message and then speak to test recognition.
      </p>
      
      <div className="tutorial-test-controls">
        <button
          className="tutorial-button tutorial-button--primary"
          onClick={testVoiceFunction}
          disabled={isTestingVoice || microphonePermission !== 'granted'}
        >
          {isTestingVoice ? 'Testing Voice...' : 'Start Voice Test'}
        </button>
        
        {practiceTranscript && (
          <button
            className="tutorial-button tutorial-button--secondary"
            onClick={stopPracticeSession}
          >
            Stop Test
          </button>
        )}
      </div>
      
      {/* Audio Level Visualization */}
      {practiceAudioLevel > 0 && (
        <div className="tutorial-audio-level">
          <div className="audio-level-label">Microphone Level:</div>
          <div className="audio-level-bar">
            <div 
              className="audio-level-fill"
              style={{ width: `${practiceAudioLevel}%` }}
            />
          </div>
          <div className="audio-level-value">{Math.round(practiceAudioLevel)}%</div>
        </div>
      )}
      
      {/* Speech Recognition Results */}
      {practiceTranscript && (
        <div className="tutorial-speech-result">
          <div className="speech-result-label">
            What we heard:
          </div>
          <div className="speech-result-text">"{practiceTranscript}"</div>
        </div>
      )}
      
      {testResult && (
        <div className={`tutorial-result tutorial-result--${testResult.success ? 'success' : 'error'}`}>
          <p>{testResult.message}</p>
        </div>
      )}
    </div>
  );

  /**
   * Practice Step Component
   */
  const PracticeStep = () => (
    <div className="tutorial-step tutorial-step--practice">
      <div className="tutorial-step__icon">💬</div>
      <h3>Practice Voice Interaction</h3>
      <p>
        Try a quick practice round! The AI will ask you a simple question, 
        and you can respond using your voice.
      </p>
      
      <div className="tutorial-practice-controls">
        {!isPracticing ? (
          <button
            className="tutorial-button tutorial-button--primary"
            onClick={startPracticeSession}
            disabled={microphonePermission !== 'granted'}
          >
            Start Practice Session
          </button>
        ) : (
          <button
            className="tutorial-button tutorial-button--secondary"
            onClick={stopPracticeSession}
          >
            End Practice
          </button>
        )}
      </div>
      
      {isPracticing && (
        <div className="tutorial-practice-session">
          <div className="practice-status">
            <div className="practice-status-indicator">
              {practiceAudioLevel > 10 ? '🎤 Listening...' : '🤫 Waiting for speech...'}
            </div>
            {practiceAudioLevel > 0 && (
              <div className="practice-audio-level">
                <div className="audio-level-bar">
                  <div 
                    className="audio-level-fill"
                    style={{ width: `${practiceAudioLevel}%` }}
                  />
                </div>
                <span className="audio-level-text">{Math.round(practiceAudioLevel)}%</span>
              </div>
            )}
          </div>
          
          {practiceTranscript && (
            <div className="practice-transcript">
              <strong>You said:</strong> "{practiceTranscript}"
            </div>
          )}
          
          <div className="practice-instructions">
            <p>💡 <strong>Tip:</strong> Speak clearly about yourself for 10-15 seconds. The AI will respond when you're done!</p>
          </div>
        </div>
      )}
    </div>
  );

  /**
   * Settings Step Component
   */
  const SettingsStep = () => (
    <div className="tutorial-step tutorial-step--settings">
      <div className="tutorial-step__icon">⚙️</div>
      <h3>Customize Voice Settings</h3>
      <p>
        Adjust voice settings to match your preferences. You can always change 
        these later in the Settings panel.
      </p>
      
      <div className="tutorial-settings-preview">
        <div className="setting-item">
          <label>Speech Rate:</label>
          <span>Adjust how fast the AI speaks</span>
        </div>
        <div className="setting-item">
          <label>Speech Volume:</label>
          <span>Control audio playback volume</span>
        </div>
        <div className="setting-item">
          <label>Voice Selection:</label>
          <span>Choose preferred voice</span>
        </div>
        <div className="setting-item">
          <label>Recognition Sensitivity:</label>
          <span>Fine-tune speech recognition</span>
        </div>
      </div>
      
      <div className="tutorial-settings-note">
        <p>
          💡 <strong>Tip:</strong> You can access all voice settings anytime by clicking 
          the settings button in the main interface.
        </p>
      </div>
    </div>
  );

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div className="voice-tutorial-overlay">
      <div className="voice-tutorial">
        {/* Header */}
        <div className="voice-tutorial__header">
          <h2>Voice Mode Tutorial</h2>
          <button 
            className="voice-tutorial__close"
            onClick={onClose}
            aria-label="Close tutorial"
          >
            ×
          </button>
        </div>

        {/* Progress Bar */}
        <div className="voice-tutorial__progress">
          <div className="progress-bar">
            <div 
              className="progress-bar__fill"
              style={{ width: `${(currentStep / TUTORIAL_STEPS.length) * 100}%` }}
            />
          </div>
          <div className="progress-text">
            Step {currentStep} of {TUTORIAL_STEPS.length}
          </div>
        </div>

        {/* Content */}
        <div className="voice-tutorial__content">
          {getCurrentStepComponent()}
        </div>

        {/* Navigation */}
        <div className="voice-tutorial__navigation">
          <div className="nav-left">
            {currentStep > 1 && (
              <button
                className="tutorial-button tutorial-button--secondary"
                onClick={previousStep}
              >
                Previous
              </button>
            )}
          </div>
          
          <div className="nav-center">
            {TUTORIAL_STEPS[currentStep - 1]?.canSkip && (
              <button
                className="tutorial-button tutorial-button--text"
                onClick={handleSkip}
              >
                Skip Tutorial
              </button>
            )}
          </div>
          
          <div className="nav-right">
            <button
              className="tutorial-button tutorial-button--primary"
              onClick={nextStep}
              disabled={
                (currentStep === 2 && microphonePermission !== 'granted') ||
                (currentStep === 3 && !testResult?.success)
              }
            >
              {currentStep === TUTORIAL_STEPS.length ? 'Complete' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}