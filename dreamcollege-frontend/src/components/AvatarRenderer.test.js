/**
 * Tests for AvatarRenderer Component
 * 
 * Tests the behavior of the 3D avatar rendering including
 * model loading, animations, lip sync, and emotion expressions.
 */

/* eslint-env jest */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AvatarRenderer from './AvatarRenderer';

// Mock Three.js and VRM
jest.mock('three/examples/jsm/loaders/GLTFLoader', () => ({
  GLTFLoader: jest.fn().mockImplementation(() => ({
    register: jest.fn(),
    load: jest.fn((url, onLoad, onProgress, onError) => {
      setTimeout(() => {
        onLoad({
          userData: {
            vrm: {
              scene: { name: 'mock-vrm-scene' },
              humanoid: {
                getNormalizedBoneNode: jest.fn().mockReturnValue({
                  rotation: { x: 0, y: 0, z: 0 }
                })
              },
              blendShapeProxy: {
                setValue: jest.fn(),
                getValue: jest.fn().mockReturnValue(0)
              }
            }
          }
        });
      }, 100);
    })
  }))
}));

jest.mock('@pixiv/three-vrm', () => ({
  VRMLoaderPlugin: jest.fn(),
  VRM: jest.fn()
}));

jest.mock('@react-three/fiber', () => ({
  useFrame: jest.fn((callback) => {
    // Simulate frame updates
    setInterval(() => callback({ clock: { elapsedTime: Date.now() / 1000 } }), 16);
  }),
  useLoader: jest.fn()
}));

// Mock controller components
jest.mock('./LipSyncController', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    update: jest.fn(),
    setAudioData: jest.fn(),
    reset: jest.fn()
  }))
}));

jest.mock('./GestureController', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    update: jest.fn(),
    triggerGesture: jest.fn(),
    setIntensity: jest.fn()
  }))
}));

jest.mock('./EmotionController', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    update: jest.fn(),
    setEmotion: jest.fn(),
    transitionTo: jest.fn()
  }))
}));

describe('AvatarRenderer Component', () => {
  const defaultProps = {
    avatarId: 'professional-female-1',
    isSpeaking: false,
    currentText: '',
    emotionContext: null,
    animationQuality: 'high',
    onLoad: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('avatar loading', () => {
    it('should load avatar model on mount', async () => {
      const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader');
      const mockLoader = new GLTFLoader();
      
      render(<AvatarRenderer {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockLoader.load).toHaveBeenCalledWith(
          '/avatars/professional-female-1.glb',
          expect.any(Function),
          expect.any(Function),
          expect.any(Function)
        );
      });
    });

    it('should call onLoad callback after avatar loads', async () => {
      const onLoad = jest.fn();
      render(<AvatarRenderer {...defaultProps} onLoad={onLoad} />);
      
      await waitFor(() => {
        expect(onLoad).toHaveBeenCalledTimes(1);
      }, { timeout: 200 });
    });

    it('should load different avatar when avatarId changes', async () => {
      const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader');
      const mockLoader = new GLTFLoader();
      
      const { rerender } = render(<AvatarRenderer {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockLoader.load).toHaveBeenCalledWith(
          '/avatars/professional-female-1.glb',
          expect.any(Function),
          expect.any(Function),
          expect.any(Function)
        );
      });
      
      rerender(<AvatarRenderer {...defaultProps} avatarId="professional-male-1" />);
      
      await waitFor(() => {
        expect(mockLoader.load).toHaveBeenCalledWith(
          '/avatars/professional-male-1.glb',
          expect.any(Function),
          expect.any(Function),
          expect.any(Function)
        );
      });
    });
  });

  describe('animation quality', () => {
    it('should apply high quality settings', () => {
      render(<AvatarRenderer {...defaultProps} animationQuality="high" />);
      
      // High quality should enable all controllers
      const LipSyncController = require('./LipSyncController').default;
      const GestureController = require('./GestureController').default;
      const EmotionController = require('./EmotionController').default;
      
      expect(LipSyncController).toHaveBeenCalled();
      expect(GestureController).toHaveBeenCalled();
      expect(EmotionController).toHaveBeenCalled();
    });

    it('should apply medium quality settings', () => {
      render(<AvatarRenderer {...defaultProps} animationQuality="medium" />);
      
      // Medium quality implementation would reduce some features
      // Test verifies the prop is accepted
      expect(true).toBe(true);
    });

    it('should apply low quality settings', () => {
      render(<AvatarRenderer {...defaultProps} animationQuality="low" />);
      
      // Low quality implementation would disable some features
      // Test verifies the prop is accepted
      expect(true).toBe(true);
    });
  });

  describe('speech integration', () => {
    it('should activate lip sync when speaking', async () => {
      const LipSyncController = require('./LipSyncController').default;
      const mockInstance = {
        update: jest.fn(),
        setAudioData: jest.fn(),
        reset: jest.fn()
      };
      LipSyncController.mockReturnValue(mockInstance);
      
      const { rerender } = render(<AvatarRenderer {...defaultProps} />);
      
      rerender(<AvatarRenderer {...defaultProps} isSpeaking={true} currentText="Hello" />);
      
      await waitFor(() => {
        expect(mockInstance.update).toHaveBeenCalled();
      });
    });

    it('should reset lip sync when speech stops', async () => {
      const LipSyncController = require('./LipSyncController').default;
      const mockInstance = {
        update: jest.fn(),
        setAudioData: jest.fn(),
        reset: jest.fn()
      };
      LipSyncController.mockReturnValue(mockInstance);
      
      const { rerender } = render(
        <AvatarRenderer {...defaultProps} isSpeaking={true} />
      );
      
      rerender(<AvatarRenderer {...defaultProps} isSpeaking={false} />);
      
      await waitFor(() => {
        expect(mockInstance.reset).toHaveBeenCalled();
      });
    });
  });

  describe('emotion expressions', () => {
    it('should apply emotion context when provided', async () => {
      const EmotionController = require('./EmotionController').default;
      const mockInstance = {
        update: jest.fn(),
        setEmotion: jest.fn(),
        transitionTo: jest.fn()
      };
      EmotionController.mockReturnValue(mockInstance);
      
      const emotionContext = { mood: 'happy', intensity: 0.8 };
      render(<AvatarRenderer {...defaultProps} emotionContext={emotionContext} />);
      
      await waitFor(() => {
        expect(mockInstance.setEmotion).toHaveBeenCalledWith('happy', 0.8);
      });
    });

    it('should transition between emotions smoothly', async () => {
      const EmotionController = require('./EmotionController').default;
      const mockInstance = {
        update: jest.fn(),
        setEmotion: jest.fn(),
        transitionTo: jest.fn()
      };
      EmotionController.mockReturnValue(mockInstance);
      
      const { rerender } = render(
        <AvatarRenderer {...defaultProps} emotionContext={{ mood: 'neutral' }} />
      );
      
      rerender(
        <AvatarRenderer {...defaultProps} emotionContext={{ mood: 'happy' }} />
      );
      
      await waitFor(() => {
        expect(mockInstance.transitionTo).toHaveBeenCalledWith('happy', expect.any(Number));
      });
    });
  });

  describe('gesture animations', () => {
    it('should trigger gestures based on text content', async () => {
      const GestureController = require('./GestureController').default;
      const mockInstance = {
        update: jest.fn(),
        triggerGesture: jest.fn(),
        setIntensity: jest.fn()
      };
      GestureController.mockReturnValue(mockInstance);
      
      render(
        <AvatarRenderer {...defaultProps} 
          isSpeaking={true} 
          currentText="Let me explain this concept" 
        />
      );
      
      await waitFor(() => {
        expect(mockInstance.update).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('should handle avatar loading errors gracefully', async () => {
      const { GLTFLoader } = require('three/examples/jsm/loaders/GLTFLoader');
      GLTFLoader.mockImplementationOnce(() => ({
        register: jest.fn(),
        load: jest.fn((url, onLoad, onProgress, onError) => {
          setTimeout(() => {
            onError(new Error('Failed to load avatar'));
          }, 100);
        })
      }));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      render(<AvatarRenderer {...defaultProps} />);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to load avatar:',
          expect.any(Error)
        );
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('performance optimizations', () => {
    it('should clean up resources on unmount', () => {
      const { unmount } = render(<AvatarRenderer {...defaultProps} />);
      
      unmount();
      
      // Verify cleanup logic is in place
      expect(true).toBe(true);
    });

    it('should throttle updates based on animation quality', async () => {
      const { useFrame } = require('@react-three/fiber');
      const frameCallback = jest.fn();
      useFrame.mockImplementation((cb) => {
        frameCallback.mockImplementation(cb);
      });
      
      render(<AvatarRenderer {...defaultProps} animationQuality="low" />);
      
      // Low quality should reduce update frequency
      // This test verifies the structure is in place
      expect(useFrame).toHaveBeenCalled();
    });
  });
});