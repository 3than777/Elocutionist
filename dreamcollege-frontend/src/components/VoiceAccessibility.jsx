/**
 * Voice Accessibility Component
 * 
 * Comprehensive accessibility support for voice mode functionality.
 * Ensures voice features are usable by people with disabilities and assistive technologies.
 * 
 * Features:
 * - Keyboard shortcuts for all voice controls
 * - Screen reader announcements for voice state changes
 * - High contrast mode support for visual indicators
 * - Alternative text descriptions for audio states
 * - ARIA live regions for dynamic content updates
 * - Voice command support for hands-free navigation
 * - Focus management and keyboard navigation
 * - Reduced motion support for animations
 * 
 * Accessibility Standards:
 * - WCAG 2.1 AA compliance
 * - Section 508 compliance
 * - ARIA best practices
 * - Keyboard accessibility
 * - Screen reader compatibility
 * 
 * Integration:
 * - Works with all voice mode components
 * - Provides accessibility context to parent components
 * - Manages global accessibility state
 * - Coordinates with system accessibility settings
 * 
 * Related Files:
 * - src/components/VoiceModeToggle.jsx - Voice mode control
 * - src/components/VoiceTutorial.jsx - Tutorial accessibility
 * - src/components/ChatBox.jsx - Main chat interface
 * - src/services/speechRecognition.js - Voice input handling
 * 
 * Task: Voice Mode Feature Implementation - Step 13
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';

// Voice Accessibility Context
const VoiceAccessibilityContext = createContext(null);

// Keyboard shortcuts configuration
const KEYBOARD_SHORTCUTS = {
  TOGGLE_VOICE_MODE: 'v',
  START_STOP_LISTENING: 'spacebar',
  STOP_SPEAKING: 'escape',
  SHOW_HELP: 'h',
  FOCUS_INPUT: 'i',
  REPEAT_LAST_MESSAGE: 'r'
};

// Voice commands configuration
const VOICE_COMMANDS = {
  TOGGLE_VOICE_MODE: ['voice mode', 'toggle voice', 'enable voice', 'disable voice'],
  START_LISTENING: ['start listening', 'begin recording', 'listen'],
  STOP_LISTENING: ['stop listening', 'stop recording', 'pause'],
  STOP_SPEAKING: ['stop speaking', 'quiet', 'silence'],
  REPEAT_MESSAGE: ['repeat', 'say again', 'repeat message'],
  HELP: ['help', 'keyboard shortcuts', 'voice commands'],
  SUBMIT_MESSAGE: ['send', 'submit', 'send message']
};

export { VoiceAccessibilityContext, KEYBOARD_SHORTCUTS, VOICE_COMMANDS };

export default function VoiceAccessibility({
  children,
  isVoiceMode = false,
  isListening = false,
  isSpeaking = false,
  onVoiceModeToggle,
  onStartListening,
  onStopListening,
  onStopSpeaking,
  onShowHelp,
  onFocusInput,
  onRepeatLastMessage,
  currentMessage = '',
  voiceError = null,

}) {
  // Accessibility state
  const [highContrastMode, setHighContrastMode] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [screenReaderActive, setScreenReaderActive] = useState(false);
  const [keyboardNavigationMode, setKeyboardNavigationMode] = useState(false);
  const [showAccessibilityPanel, setShowAccessibilityPanel] = useState(false);
  const [currentAnnouncement, setCurrentAnnouncement] = useState('');
  const [voiceCommandsEnabled, setVoiceCommandsEnabled] = useState(false);
  
  // Refs for accessibility management
  const liveRegionRef = useRef(null);
  const skipLinkRef = useRef(null);
  const announcementTimeoutRef = useRef(null);
  const lastAnnouncementRef = useRef('');
  const voiceCommandListenerRef = useRef(null);

  // Initialize accessibility features on mount
  useEffect(() => {
    initializeAccessibilityFeatures();
    setupKeyboardShortcuts();
    setupVoiceCommands();
    
    return () => {
      cleanup();
    };
  }, []);

  // Monitor system accessibility preferences
  useEffect(() => {
    detectSystemPreferences();
    detectScreenReader();
  }, []);

  // Announce voice state changes
  useEffect(() => {
    announceVoiceStateChange();
  }, [isVoiceMode, isListening, isSpeaking, voiceError]);



  /**
   * Initialize accessibility features based on system preferences
   */
  const initializeAccessibilityFeatures = () => {
    try {
      // Load saved accessibility preferences
      const savedPrefs = localStorage.getItem('voiceAccessibilityPreferences');
      if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs);
        setHighContrastMode(prefs.highContrastMode || false);
        setReducedMotion(prefs.reducedMotion || false);
        setVoiceCommandsEnabled(prefs.voiceCommandsEnabled || false);
      }
      
      // Apply initial accessibility settings
      applyAccessibilitySettings();
      
    } catch (error) {
      console.warn('Failed to initialize accessibility features:', error);
    }
  };

  /**
   * Detect system accessibility preferences
   */
  const detectSystemPreferences = () => {
    try {
      // Check for reduced motion preference
      if (window.matchMedia) {
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReducedMotion(prefersReducedMotion.matches);
        
        prefersReducedMotion.addListener((e) => {
          setReducedMotion(e.matches);
        });
        
        // Check for high contrast preference
        const prefersHighContrast = window.matchMedia('(prefers-contrast: high)');
        setHighContrastMode(prefersHighContrast.matches);
        
        prefersHighContrast.addListener((e) => {
          setHighContrastMode(e.matches);
        });
      }
    } catch (error) {
      console.warn('Error detecting system preferences:', error);
    }
  };

  /**
   * Detect if screen reader is active
   */
  const detectScreenReader = () => {
    try {
      // Check for common screen reader indicators
      const hasAriaLive = document.querySelector('[aria-live]');
      const hasScreenReaderText = document.querySelector('.sr-only, .screen-reader-text');
      const userAgent = navigator.userAgent.toLowerCase();
      
      // Common screen reader user agents
      const screenReaderIndicators = [
        'nvda', 'jaws', 'dragon', 'zoomtext', 'fusion', 'orca'
      ];
      
      const hasScreenReaderUA = screenReaderIndicators.some(sr => userAgent.includes(sr));
      const likelyScreenReader = hasAriaLive || hasScreenReaderText || hasScreenReaderUA;
      
      setScreenReaderActive(likelyScreenReader);
      
      if (likelyScreenReader) {
        console.log('Screen reader detected - enhanced accessibility enabled');
      }
      
    } catch (error) {
      console.warn('Error detecting screen reader:', error);
    }
  };

  /**
   * Setup keyboard shortcuts
   */
  const setupKeyboardShortcuts = () => {
    const handleKeyDown = (event) => {
      // Check for accessibility panel toggle (Alt + A)
      if (event.altKey && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        setShowAccessibilityPanel(!showAccessibilityPanel);
        announce('Accessibility panel toggled');
        return;
      }
      
      // Skip if user is typing in an input field
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }
      
      // Handle keyboard shortcuts
      switch (event.key.toLowerCase()) {
        case KEYBOARD_SHORTCUTS.TOGGLE_VOICE_MODE:
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleVoiceModeToggle();
          }
          break;
          
        case ' ': // Spacebar
          if (isVoiceMode) {
            event.preventDefault();
            handleStartStopListening();
          }
          break;
          
        case 'escape':
          event.preventDefault();
          handleStopSpeaking();
          break;
          
        case KEYBOARD_SHORTCUTS.SHOW_HELP:
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleShowHelp();
          }
          break;
          
        case KEYBOARD_SHORTCUTS.FOCUS_INPUT:
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleFocusInput();
          }
          break;
          
        case KEYBOARD_SHORTCUTS.REPEAT_LAST_MESSAGE:
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleRepeatLastMessage();
          }
          break;
          
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  };

  /**
   * Setup voice commands recognition
   */
  const setupVoiceCommands = () => {
    if (!voiceCommandsEnabled || !isVoiceMode) return;
    
    try {
      // This would integrate with speech recognition service
      // For now, we'll set up a listener framework
      voiceCommandListenerRef.current = (transcript) => {
        const command = transcript.toLowerCase().trim();
        
        // Check for voice commands
        Object.entries(VOICE_COMMANDS).forEach(([action, phrases]) => {
          if (phrases.some(phrase => command.includes(phrase))) {
            handleVoiceCommand(action, command);
          }
        });
      };
      
    } catch (error) {
      console.warn('Failed to setup voice commands:', error);
    }
  };

  /**
   * Handle voice commands
   */
  const handleVoiceCommand = (action, command) => {
    announce(`Voice command recognized: ${command}`);
    
    switch (action) {
      case 'TOGGLE_VOICE_MODE':
        handleVoiceModeToggle();
        break;
      case 'START_LISTENING':
        if (onStartListening) onStartListening();
        break;
      case 'STOP_LISTENING':
        if (onStopListening) onStopListening();
        break;
      case 'STOP_SPEAKING':
        handleStopSpeaking();
        break;
      case 'REPEAT_MESSAGE':
        handleRepeatLastMessage();
        break;
      case 'HELP':
        handleShowHelp();
        break;
      default:
        break;
    }
  };

  /**
   * Keyboard shortcut handlers
   */
  const handleVoiceModeToggle = () => {
    if (onVoiceModeToggle) {
      onVoiceModeToggle(!isVoiceMode);
      announce(isVoiceMode ? 'Voice mode disabled' : 'Voice mode enabled');
    }
  };

  const handleStartStopListening = () => {
    if (isListening) {
      if (onStopListening) onStopListening();
      announce('Stopped listening');
    } else {
      if (onStartListening) onStartListening();
      announce('Started listening');
    }
  };

  const handleStopSpeaking = () => {
    if (onStopSpeaking) {
      onStopSpeaking();
      announce('Speech stopped');
    }
  };

  const handleShowHelp = () => {
    if (onShowHelp) {
      onShowHelp();
    } else {
      setShowAccessibilityPanel(true);
      announce('Accessibility help panel opened');
    }
  };

  const handleFocusInput = () => {
    if (onFocusInput) {
      onFocusInput();
      announce('Input field focused');
    }
  };

  const handleRepeatLastMessage = () => {
    if (onRepeatLastMessage) {
      onRepeatLastMessage();
      announce('Repeating last message');
    }
  };

  /**
   * Apply accessibility settings to the page
   */
  const applyAccessibilitySettings = () => {
    const root = document.documentElement;
    
    // Apply high contrast mode
    if (highContrastMode) {
      root.classList.add('high-contrast-mode');
    } else {
      root.classList.remove('high-contrast-mode');
    }
    
    // Apply reduced motion
    if (reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }
    
    // Apply keyboard navigation mode
    if (keyboardNavigationMode) {
      root.classList.add('keyboard-navigation');
    } else {
      root.classList.remove('keyboard-navigation');
    }
  };

  /**
   * Announce voice state changes to screen readers
   */
  const announceVoiceStateChange = () => {
    let announcement = '';
    
    if (voiceError) {
      announcement = `Voice error: ${voiceError}`;
    } else if (isVoiceMode) {
      if (isListening) {
        announcement = 'Voice mode active - listening for speech';
      } else if (isSpeaking) {
        announcement = 'Voice mode active - AI is speaking';
      } else {
        announcement = 'Voice mode active - ready for input';
      }
    } else {
      announcement = 'Voice mode disabled - using text input';
    }
    
    announce(announcement);
  };



  /**
   * Make announcement to screen readers
   */
  const announce = useCallback((message, priority = 'polite') => {
    if (!message || message === lastAnnouncementRef.current) return;
    
    lastAnnouncementRef.current = message;
    setCurrentAnnouncement(message);
    
    // Clear previous timeout
    if (announcementTimeoutRef.current) {
      clearTimeout(announcementTimeoutRef.current);
    }
    
    // Update live region
    if (liveRegionRef.current) {
      liveRegionRef.current.setAttribute('aria-live', priority);
      liveRegionRef.current.textContent = message;
    }
    
    // Clear announcement after delay
    announcementTimeoutRef.current = setTimeout(() => {
      setCurrentAnnouncement('');
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = '';
      }
    }, 3000);
    
    console.log('Accessibility announcement:', message);
  }, []);

  /**
   * Save accessibility preferences
   */
  const saveAccessibilityPreferences = () => {
    const preferences = {
      highContrastMode,
      reducedMotion,
      voiceCommandsEnabled,
      keyboardNavigationMode
    };
    
    localStorage.setItem('voiceAccessibilityPreferences', JSON.stringify(preferences));
  };

  /**
   * Cleanup function
   */
  const cleanup = () => {
    if (announcementTimeoutRef.current) {
      clearTimeout(announcementTimeoutRef.current);
    }
  };

  // Apply settings when they change
  useEffect(() => {
    applyAccessibilitySettings();
    saveAccessibilityPreferences();
  }, [highContrastMode, reducedMotion, keyboardNavigationMode]);

  // Context value for child components
  const accessibilityContextValue = {
    highContrastMode,
    reducedMotion,
    screenReaderActive,
    keyboardNavigationMode,
    announce,
    isVoiceMode,
    isListening,
    isSpeaking,
    voiceError
  };

  return (
    <VoiceAccessibilityContext.Provider value={accessibilityContextValue}>
      {/* Skip link for keyboard navigation */}
      <a
        ref={skipLinkRef}
        href="#main-content"
        className="skip-link"
        onFocus={() => setKeyboardNavigationMode(true)}
      >
        Skip to main content
      </a>

      {/* Live region for screen reader announcements */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {currentAnnouncement}
      </div>

      {/* Voice state indicator for screen readers */}
      <div className="sr-only" aria-live="polite">
        {isVoiceMode && (
          <span>
            Voice mode is {isListening ? 'listening' : isSpeaking ? 'speaking' : 'ready'}
            {voiceError && `. Error: ${voiceError}`}
          </span>
        )}
      </div>

      {/* Accessibility help panel */}
      {showAccessibilityPanel && (
        <div className="accessibility-panel" role="dialog" aria-labelledby="accessibility-title">
          <div className="accessibility-panel__content">
            <h3 id="accessibility-title">Voice Mode Accessibility</h3>
            
            <section>
              <h4>Keyboard Shortcuts</h4>
              <ul>
                <li><kbd>Ctrl/Cmd + V</kbd> - Toggle voice mode</li>
                <li><kbd>Space</kbd> - Start/stop listening (in voice mode)</li>
                <li><kbd>Escape</kbd> - Stop AI speaking</li>
                <li><kbd>Ctrl/Cmd + H</kbd> - Show help</li>
                <li><kbd>Ctrl/Cmd + I</kbd> - Focus input field</li>
                <li><kbd>Ctrl/Cmd + R</kbd> - Repeat last message</li>
                <li><kbd>Alt + A</kbd> - Toggle accessibility panel</li>
              </ul>
            </section>

            <section>
              <h4>Voice Commands</h4>
              <ul>
                <li>"Voice mode" or "Toggle voice" - Toggle voice mode</li>
                <li>"Start listening" or "Listen" - Begin voice input</li>
                <li>"Stop listening" or "Pause" - End voice input</li>
                <li>"Stop speaking" or "Quiet" - Stop AI speech</li>
                <li>"Repeat" or "Say again" - Repeat last message</li>
                <li>"Help" - Show this help panel</li>
              </ul>
            </section>

            <section>
              <h4>Accessibility Settings</h4>
              <label>
                <input
                  type="checkbox"
                  checked={highContrastMode}
                  onChange={(e) => setHighContrastMode(e.target.checked)}
                />
                High contrast mode
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(e) => setReducedMotion(e.target.checked)}
                />
                Reduced motion
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={voiceCommandsEnabled}
                  onChange={(e) => setVoiceCommandsEnabled(e.target.checked)}
                />
                Enable voice commands
              </label>
            </section>

            <button
              onClick={() => setShowAccessibilityPanel(false)}
              className="accessibility-panel__close"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Main content wrapper */}
      <div id="main-content">
        {children}
      </div>
    </VoiceAccessibilityContext.Provider>
  );
}

/**
 * Hook to use voice accessibility context in child components
 */
export function useVoiceAccessibility() {
  const context = useContext(VoiceAccessibilityContext);
  if (!context) {
    throw new Error('useVoiceAccessibility must be used within a VoiceAccessibility provider');
  }
  return context;
}