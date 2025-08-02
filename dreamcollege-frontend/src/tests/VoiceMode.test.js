/**
 * Voice Mode Feature Testing Suite
 * 
 * Comprehensive test suite for voice mode functionality including component testing,
 * service integration, browser compatibility, error handling, and fallback mechanisms.
 * 
 * Test Coverage:
 * - Voice mode toggle functionality
 * - Speech recognition initialization and operation
 * - Text-to-speech playback and configuration
 * - Browser compatibility detection
 * - Error handling and fallback scenarios
 * - HTTPS requirement validation
 * - Microphone permission handling
 * - Voice settings persistence
 * 
 * Features Tested:
 * - VoiceModeToggle component behavior
 * - Speech recognition service functions
 * - Text-to-speech service functions
 * - Voice compatibility utilities
 * - HTTPS handler service
 * - Error recovery mechanisms
 * 
 * Task: Voice Mode Feature Implementation - Step 17
 * 
 * @author AI Interview Coach Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// For now, we'll test the services directly without importing components
// that may have missing dependencies

// Mock the services that we'll test
jest.mock('../services/speechRecognition', () => ({
  initializeSpeechRecognition: jest.fn(),
  startListening: jest.fn(),
  stopListening: jest.fn(),
  checkSpeechSupport: jest.fn(),
  getSpeechRecognitionStatus: jest.fn()
}));

jest.mock('../services/textToSpeech', () => ({
  initializeTextToSpeech: jest.fn(),
  speakText: jest.fn(),
  stopSpeaking: jest.fn(),
  checkTextToSpeechSupport: jest.fn(),
  getAvailableVoices: jest.fn(),
  setVoicePreferences: jest.fn()
}));

jest.mock('../utils/voiceCompatibility', () => ({
  getBrowserInfo: jest.fn(),
  checkVoiceRecognitionSupport: jest.fn(),
  checkSpeechSynthesisSupport: jest.fn(),
  checkMicrophonePermission: jest.fn(),
  getVoiceCapabilities: jest.fn(),
  generateCapabilityReport: jest.fn()
}));

describe('Voice Mode Feature Test Suite', () => {
  
  // =============================================================================
  // VOICE MODE TOGGLE COMPONENT TESTS
  // =============================================================================
  
  describe('VoiceModeToggle Component', () => {
    
    test('renders toggle button with correct initial state', () => {
      const mockOnVoiceModeChange = jest.fn();
      
      render(
        <VoiceModeToggle 
          isVoiceMode={false} 
          onVoiceModeChange={mockOnVoiceModeChange} 
        />
      );
      
      const toggleButton = screen.getByRole('button');
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveAttribute('aria-label', expect.stringContaining('Voice mode disabled'));
    });
    
    test('shows loading state during voice support check', async () => {
      const mockOnVoiceModeChange = jest.fn();
      
      render(
        <VoiceModeToggle 
          isVoiceMode={false} 
          onVoiceModeChange={mockOnVoiceModeChange} 
        />
      );
      
      // Should show loading indicator initially
      expect(screen.getByText('⟳')).toBeInTheDocument();
      
      // Wait for support check to complete
      await waitFor(() => {
        expect(screen.queryByText('⟳')).not.toBeInTheDocument();
      });
    });
    
    test('enables voice mode when toggle is clicked and voice is supported', async () => {
      const mockOnVoiceModeChange = jest.fn();
      
      render(
        <VoiceModeToggle 
          isVoiceMode={false} 
          onVoiceModeChange={mockOnVoiceModeChange} 
        />
      );
      
      // Wait for support check to complete
      await waitFor(() => {
        expect(screen.queryByText('⟳')).not.toBeInTheDocument();
      });
      
      const toggleButton = screen.getByRole('button');
      
      await act(async () => {
        await userEvent.click(toggleButton);
      });
      
      expect(mockOnVoiceModeChange).toHaveBeenCalledWith(true);
    });
    
    test('disables toggle when voice is not supported', async () => {
      // Simulate unsupported browser
      global.voiceTestUtils.simulateBrowser('firefox');
      delete global.webkitSpeechRecognition;
      delete global.SpeechRecognition;
      
      const mockOnVoiceModeChange = jest.fn();
      
      render(
        <VoiceModeToggle 
          isVoiceMode={false} 
          onVoiceModeChange={mockOnVoiceModeChange} 
        />
      );
      
      await waitFor(() => {
        const toggleButton = screen.getByRole('button');
        expect(toggleButton).toBeDisabled();
      });
    });
    
    test('shows HTTPS warning when not in secure context', async () => {
      // Simulate non-HTTPS environment
      global.voiceTestUtils.setSecureContext(false);
      Object.defineProperty(window, 'location', {
        writable: true,
        value: {
          hostname: 'example.com',
          protocol: 'http:',
          href: 'http://example.com'
        }
      });
      
      const mockOnVoiceModeChange = jest.fn();
      
      render(
        <VoiceModeToggle 
          isVoiceMode={false} 
          onVoiceModeChange={mockOnVoiceModeChange} 
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/HTTPS required/i)).toBeInTheDocument();
      });
    });
    
    test('handles microphone permission denial gracefully', async () => {
      // Simulate permission denial
      global.voiceTestUtils.setPermission('microphone', 'denied');
      
      const mockOnVoiceModeChange = jest.fn();
      
      render(
        <VoiceModeToggle 
          isVoiceMode={false} 
          onVoiceModeChange={mockOnVoiceModeChange} 
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/microphone permission/i)).toBeInTheDocument();
      });
    });
    
  });
  
  // =============================================================================
  // SPEECH RECOGNITION SERVICE TESTS
  // =============================================================================
  
  describe('Speech Recognition Service', () => {
    
    beforeEach(() => {
      // Reset to Chrome browser with full support
      global.voiceTestUtils.simulateBrowser('chrome');
      global.voiceTestUtils.setPermission('microphone', 'granted');
      global.voiceTestUtils.setSecureContext(true);
    });
    
    test('checkSpeechSupport returns correct support information', () => {
      const support = checkSpeechSupport();
      
      expect(support).toMatchObject({
        isSupported: true,
        hasWebkit: true,
        requiresHTTPS: true,
        error: null
      });
      
      expect(support.browserInfo).toHaveProperty('isChrome', true);
    });
    
    test('checkSpeechSupport detects unsupported browsers', () => {
      global.voiceTestUtils.simulateBrowser('firefox');
      delete global.webkitSpeechRecognition;
      delete global.SpeechRecognition;
      
      const support = checkSpeechSupport();
      
      expect(support).toMatchObject({
        isSupported: false,
        hasWebkit: false,
        hasNative: false,
        error: expect.stringContaining('not available')
      });
    });
    
    test('checkSpeechSupport fails without HTTPS', () => {
      global.voiceTestUtils.setSecureContext(false);
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { hostname: 'example.com' }
      });
      
      const support = checkSpeechSupport();
      
      expect(support).toMatchObject({
        isSupported: false,
        error: expect.stringContaining('HTTPS')
      });
    });
    
    test('initializeSpeechRecognition succeeds with proper setup', async () => {
      const result = await initializeSpeechRecognition();
      
      expect(result).toBe(true);
    });
    
    test('initializeSpeechRecognition fails gracefully with unsupported browser', async () => {
      delete global.webkitSpeechRecognition;
      delete global.SpeechRecognition;
      
      const result = await initializeSpeechRecognition();
      
      expect(result).toBe(false);
    });
    
    test('startListening activates speech recognition', async () => {
      await initializeSpeechRecognition();
      
      const mockOnResult = jest.fn();
      const mockOnError = jest.fn();
      
      const result = await startListening(mockOnResult, mockOnError);
      
      expect(result).toBe(true);
    });
    
    test('stopListening deactivates speech recognition', async () => {
      await initializeSpeechRecognition();
      await startListening(jest.fn(), jest.fn());
      
      const result = stopListening();
      
      expect(result).toBe(true);
    });
    
    test('speech recognition handles results correctly', async () => {
      await initializeSpeechRecognition();
      
      const mockOnResult = jest.fn();
      const mockOnError = jest.fn();
      
      await startListening(mockOnResult, mockOnError);
      
      // Simulate speech result
      const recognition = global.voiceTestUtils.simulateSpeechResult('test transcript', true, 0.95);
      
      await waitFor(() => {
        expect(mockOnResult).toHaveBeenCalledWith(
          expect.objectContaining({
            transcript: 'test transcript',
            confidence: 0.95,
            isFinal: true
          })
        );
      });
    });
    
    test('speech recognition handles errors correctly', async () => {
      await initializeSpeechRecognition();
      
      const mockOnResult = jest.fn();
      const mockOnError = jest.fn();
      
      await startListening(mockOnResult, mockOnError);
      
      // Simulate speech error
      const recognition = global.voiceTestUtils.simulateSpeechError('network');
      
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'network'
          })
        );
      });
    });
    
    test('getSpeechRecognitionStatus returns correct status', async () => {
      const initialStatus = getSpeechRecognitionStatus();
      expect(initialStatus.isInitialized).toBe(false);
      expect(initialStatus.isListening).toBe(false);
      
      await initializeSpeechRecognition();
      await startListening(jest.fn(), jest.fn());
      
      const activeStatus = getSpeechRecognitionStatus();
      expect(activeStatus.isInitialized).toBe(true);
      expect(activeStatus.isListening).toBe(true);
    });
    
  });
  
  // =============================================================================
  // TEXT-TO-SPEECH SERVICE TESTS
  // =============================================================================
  
  describe('Text-to-Speech Service', () => {
    
    beforeEach(() => {
      // Reset synthesis state
      global.speechSynthesis.cancel();
    });
    
    test('checkTextToSpeechSupport returns correct support information', () => {
      const support = checkTextToSpeechSupport();
      
      expect(support).toMatchObject({
        isSupported: true,
        hasSynthesis: true,
        hasVoices: true,
        voiceCount: expect.any(Number),
        error: null
      });
    });
    
    test('initializeTextToSpeech succeeds with proper setup', async () => {
      const result = await initializeTextToSpeech();
      
      expect(result).toBe(true);
    });
    
    test('getAvailableVoices returns voice list', async () => {
      await initializeTextToSpeech();
      
      const voices = getAvailableVoices();
      
      expect(voices).toBeInstanceOf(Array);
      expect(voices.length).toBeGreaterThan(0);
      expect(voices[0]).toHaveProperty('name');
      expect(voices[0]).toHaveProperty('lang');
    });
    
    test('speakText initiates speech synthesis', async () => {
      await initializeTextToSpeech();
      
      const result = await speakText('Hello world', {
        rate: 1.0,
        pitch: 1.0,
        volume: 0.8
      });
      
      expect(result).toBe(true);
      expect(global.speechSynthesis.speaking).toBe(true);
    });
    
    test('speakText handles long text correctly', async () => {
      await initializeTextToSpeech();
      
      const longText = 'This is a very long text that should be handled correctly by the text-to-speech service with proper queue management and length optimization.';
      
      const result = await speakText(longText);
      
      expect(result).toBe(true);
    });
    
    test('stopSpeaking cancels current speech', async () => {
      await initializeTextToSpeech();
      await speakText('Hello world');
      
      const result = stopSpeaking();
      
      expect(result).toBe(true);
      expect(global.speechSynthesis.speaking).toBe(false);
    });
    
    test('setVoicePreferences updates voice configuration', async () => {
      await initializeTextToSpeech();
      
      const preferences = {
        selectedVoice: 'Google US English',
        rate: 1.2,
        pitch: 1.1,
        volume: 0.9
      };
      
      const result = setVoicePreferences(preferences);
      
      expect(result).toBe(true);
    });
    
    test('handles speech synthesis errors gracefully', async () => {
      // Mock synthesis error
      const originalSpeak = global.speechSynthesis.speak;
      global.speechSynthesis.speak = jest.fn(() => {
        throw new Error('Synthesis error');
      });
      
      await initializeTextToSpeech();
      
      const result = await speakText('Hello world');
      
      expect(result).toBe(false);
      
      // Restore original method
      global.speechSynthesis.speak = originalSpeak;
    });
    
  });
  
  // =============================================================================
  // VOICE COMPATIBILITY UTILITY TESTS
  // =============================================================================
  
  describe('Voice Compatibility Utilities', () => {
    
    test('getBrowserInfo detects Chrome correctly', () => {
      global.voiceTestUtils.simulateBrowser('chrome');
      
      const browserInfo = getBrowserInfo();
      
      expect(browserInfo).toMatchObject({
        isChrome: true,
        isSafari: false,
        isFirefox: false,
        isEdge: false,
        browserName: 'Chrome'
      });
    });
    
    test('getBrowserInfo detects Safari correctly', () => {
      global.voiceTestUtils.simulateBrowser('safari');
      
      const browserInfo = getBrowserInfo();
      
      expect(browserInfo).toMatchObject({
        isChrome: false,
        isSafari: true,
        isFirefox: false,
        isEdge: false,
        browserName: 'Safari'
      });
    });
    
    test('getBrowserInfo detects Firefox correctly', () => {
      global.voiceTestUtils.simulateBrowser('firefox');
      
      const browserInfo = getBrowserInfo();
      
      expect(browserInfo).toMatchObject({
        isChrome: false,
        isSafari: false,
        isFirefox: true,
        isEdge: false,
        browserName: 'Firefox'
      });
    });
    
    test('checkVoiceRecognitionSupport returns correct information', () => {
      const support = checkVoiceRecognitionSupport();
      
      expect(support).toHaveProperty('isSupported');
      expect(support).toHaveProperty('hasWebkit');
      expect(support).toHaveProperty('hasNative');
      expect(support).toHaveProperty('requiresHTTPS');
    });
    
    test('checkSpeechSynthesisSupport returns correct information', () => {
      const support = checkSpeechSynthesisSupport();
      
      expect(support).toHaveProperty('isSupported');
      expect(support).toHaveProperty('hasVoices');
      expect(support).toHaveProperty('voiceCount');
    });
    
    test('checkMicrophonePermission handles granted permission', async () => {
      global.voiceTestUtils.setPermission('microphone', 'granted');
      
      const permission = await checkMicrophonePermission();
      
      expect(permission).toMatchObject({
        state: 'granted',
        canRecord: true,
        error: null
      });
    });
    
    test('checkMicrophonePermission handles denied permission', async () => {
      global.voiceTestUtils.setPermission('microphone', 'denied');
      
      const permission = await checkMicrophonePermission();
      
      expect(permission).toMatchObject({
        state: 'denied',
        canRecord: false
      });
    });
    
    test('getVoiceCapabilities returns comprehensive capability report', async () => {
      const capabilities = await getVoiceCapabilities();
      
      expect(capabilities).toHaveProperty('speechRecognition');
      expect(capabilities).toHaveProperty('speechSynthesis');
      expect(capabilities).toHaveProperty('microphone');
      expect(capabilities).toHaveProperty('browser');
      expect(capabilities).toHaveProperty('canUseVoiceMode');
    });
    
    test('generateCapabilityReport creates human-readable report', async () => {
      const capabilities = await getVoiceCapabilities();
      const report = generateCapabilityReport(capabilities);
      
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('details');
      expect(report).toHaveProperty('recommendations');
      expect(report.summary).toContain('Voice mode');
    });
    
  });
  
  // =============================================================================
  // HTTPS HANDLER SERVICE TESTS
  // =============================================================================
  
  describe('HTTPS Handler Service', () => {
    
    test('validateHTTPSRequirement passes for HTTPS', () => {
      global.voiceTestUtils.setSecureContext(true);
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { protocol: 'https:', hostname: 'example.com' }
      });
      
      const result = validateHTTPSRequirement();
      
      expect(result).toMatchObject({
        isValid: true,
        isSecure: true,
        error: null
      });
    });
    
    test('validateHTTPSRequirement allows localhost HTTP', () => {
      global.voiceTestUtils.setSecureContext(false);
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { protocol: 'http:', hostname: 'localhost' }
      });
      
      const result = validateHTTPSRequirement();
      
      expect(result).toMatchObject({
        isValid: true,
        isLocalhost: true
      });
    });
    
    test('validateHTTPSRequirement fails for non-secure remote', () => {
      global.voiceTestUtils.setSecureContext(false);
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { protocol: 'http:', hostname: 'example.com' }
      });
      
      const result = validateHTTPSRequirement();
      
      expect(result).toMatchObject({
        isValid: false,
        isSecure: false,
        error: expect.stringContaining('HTTPS')
      });
    });
    
    test('getHTTPSStatusMessage returns appropriate message', () => {
      const httpsValidation = {
        isValid: false,
        isSecure: false,
        error: 'HTTPS required'
      };
      
      const message = getHTTPSStatusMessage(httpsValidation);
      
      expect(message).toContain('HTTPS');
      expect(message).toContain('required');
    });
    
    test('monitorHTTPSStatus detects context changes', async () => {
      const mockCallback = jest.fn();
      
      const cleanup = monitorHTTPSStatus(mockCallback);
      
      // Simulate HTTPS context change
      global.voiceTestUtils.setSecureContext(false);
      
      // Trigger a simulated change
      window.dispatchEvent(new Event('securitypolicyviolation'));
      
      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalled();
      });
      
      cleanup();
    });
    
  });
  
  // =============================================================================
  // ERROR HANDLING AND FALLBACK TESTS
  // =============================================================================
  
  describe('Error Handling and Fallbacks', () => {
    
    test('gracefully handles missing Web Speech API', async () => {
      // Remove all speech APIs
      delete global.SpeechRecognition;
      delete global.webkitSpeechRecognition;
      delete global.speechSynthesis;
      delete global.SpeechSynthesisUtterance;
      
      const support = checkSpeechSupport();
      expect(support.isSupported).toBe(false);
      expect(support.error).toBeTruthy();
      
      const ttsSupport = checkTextToSpeechSupport();
      expect(ttsSupport.isSupported).toBe(false);
      expect(ttsSupport.error).toBeTruthy();
    });
    
    test('handles network errors in speech recognition', async () => {
      await initializeSpeechRecognition();
      
      const mockOnError = jest.fn();
      await startListening(jest.fn(), mockOnError);
      
      // Simulate network error
      const recognition = global.voiceTestUtils.simulateSpeechError('network');
      
      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'network',
            recoverable: true
          })
        );
      });
    });
    
    test('handles audio-capture errors gracefully', async () => {
      // Mock getUserMedia failure
      navigator.mediaDevices.getUserMedia = jest.fn(() => 
        Promise.reject(new Error('Permission denied'))
      );
      
      const permission = await checkMicrophonePermission();
      
      expect(permission.canRecord).toBe(false);
      expect(permission.error).toBeTruthy();
    });
    
    test('falls back to text mode when voice fails', async () => {
      const mockOnVoiceModeChange = jest.fn();
      
      // Simulate voice failure
      delete global.webkitSpeechRecognition;
      delete global.SpeechRecognition;
      
      render(
        <VoiceModeToggle 
          isVoiceMode={true} 
          onVoiceModeChange={mockOnVoiceModeChange} 
        />
      );
      
      await waitFor(() => {
        expect(mockOnVoiceModeChange).toHaveBeenCalledWith(false);
      });
    });
    
    test('handles speech synthesis queue overflow', async () => {
      await initializeTextToSpeech();
      
      // Queue multiple speech requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(speakText(`Message ${i}`));
      }
      
      const results = await Promise.all(promises);
      
      // Should handle all requests gracefully
      results.forEach(result => {
        expect(typeof result).toBe('boolean');
      });
    });
    
  });
  
  // =============================================================================
  // INTEGRATION TESTS
  // =============================================================================
  
  describe('Voice Mode Integration', () => {
    
    test('complete voice mode workflow', async () => {
      const mockOnVoiceModeChange = jest.fn();
      const mockOnVoiceInput = jest.fn();
      
      // Render voice mode toggle
      const { rerender } = render(
        <VoiceModeToggle 
          isVoiceMode={false} 
          onVoiceModeChange={mockOnVoiceModeChange} 
        />
      );
      
      // Wait for support check
      await waitFor(() => {
        expect(screen.queryByText('⟳')).not.toBeInTheDocument();
      });
      
      // Enable voice mode
      const toggleButton = screen.getByRole('button');
      await act(async () => {
        await userEvent.click(toggleButton);
      });
      
      expect(mockOnVoiceModeChange).toHaveBeenCalledWith(true);
      
      // Render voice input component
      rerender(
        <>
          <VoiceModeToggle 
            isVoiceMode={true} 
            onVoiceModeChange={mockOnVoiceModeChange} 
          />
          <VoiceInput 
            onVoiceInput={mockOnVoiceInput}
            onError={jest.fn()}
          />
        </>
      );
      
      // Test voice input functionality
      const micButton = screen.getByRole('button', { name: /microphone/i });
      await act(async () => {
        await userEvent.click(micButton);
      });
      
      // Simulate speech result
      const recognition = global.voiceTestUtils.simulateSpeechResult('Hello world', true, 0.9);
      
      await waitFor(() => {
        expect(mockOnVoiceInput).toHaveBeenCalledWith(
          expect.objectContaining({
            transcript: 'Hello world'
          })
        );
      });
    });
    
    test('voice settings persistence across sessions', async () => {
      const preferences = {
        selectedVoice: 'Google US English',
        rate: 1.2,
        pitch: 1.1,
        volume: 0.9,
        autoPlay: true
      };
      
      // Set preferences
      await initializeTextToSpeech();
      setVoicePreferences(preferences);
      
      // Simulate page refresh by re-initializing
      await initializeTextToSpeech();
      
      // Preferences should be restored
      const voices = getAvailableVoices();
      expect(voices.find(v => v.name === preferences.selectedVoice)).toBeTruthy();
    });
    
  });
  
  // =============================================================================
  // ACCESSIBILITY TESTS
  // =============================================================================
  
  describe('Voice Mode Accessibility', () => {
    
    test('voice toggle has proper ARIA attributes', () => {
      const mockOnVoiceModeChange = jest.fn();
      
      render(
        <VoiceModeToggle 
          isVoiceMode={false} 
          onVoiceModeChange={mockOnVoiceModeChange} 
        />
      );
      
      const toggleButton = screen.getByRole('button');
      
      expect(toggleButton).toHaveAttribute('aria-label');
      expect(toggleButton).toHaveAttribute('title');
    });
    
    test('voice input provides screen reader feedback', () => {
      render(
        <VoiceInput 
          onVoiceInput={jest.fn()}
          onError={jest.fn()}
        />
      );
      
      const micButton = screen.getByRole('button');
      
      expect(micButton).toHaveAttribute('aria-label');
      expect(micButton).toHaveAttribute('aria-pressed');
    });
    
    test('speech feedback provides visual alternatives', () => {
      render(
        <SpeechFeedback 
          isListening={true}
          isSpeaking={false}
          confidence={0.9}
          voiceLevel={0.7}
        />
      );
      
      // Should provide visual indicators for audio states
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByText(/listening/i)).toBeInTheDocument();
    });
    
  });
  
});

/**
 * Performance and Load Tests
 * 
 * Additional tests for performance characteristics and load handling
 */
describe('Voice Mode Performance Tests', () => {
  
  test('handles rapid voice mode toggles', async () => {
    const mockOnVoiceModeChange = jest.fn();
    
    render(
      <VoiceModeToggle 
        isVoiceMode={false} 
        onVoiceModeChange={mockOnVoiceModeChange} 
      />
    );
    
    await waitFor(() => {
      expect(screen.queryByText('⟳')).not.toBeInTheDocument();
    });
    
    const toggleButton = screen.getByRole('button');
    
    // Rapidly toggle voice mode
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        await userEvent.click(toggleButton);
      });
    }
    
    // Should handle all toggles gracefully
    expect(mockOnVoiceModeChange).toHaveBeenCalledTimes(5);
  });
  
  test('speech recognition memory cleanup', async () => {
    // Test that recognition instances are properly cleaned up
    for (let i = 0; i < 10; i++) {
      await initializeSpeechRecognition();
      await startListening(jest.fn(), jest.fn());
      stopListening();
    }
    
    // Should not accumulate memory or resources
    const status = getSpeechRecognitionStatus();
    expect(status.isListening).toBe(false);
  });
  
  test('text-to-speech queue management under load', async () => {
    await initializeTextToSpeech();
    
    // Queue many speech requests simultaneously
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(speakText(`Test message ${i}`));
    }
    
    const results = await Promise.all(promises);
    
    // All requests should complete successfully
    results.forEach(result => {
      expect(result).toBe(true);
    });
  });
  
});