/**
 * AvatarRenderer Component
 * 
 * Handles loading and rendering of 3D avatars with animations,
 * lip sync, gestures, and emotion expressions.
 */

import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin } from '@pixiv/three-vrm';
import LipSyncController from './LipSyncController';
import GestureController from './GestureController';
import EmotionController from './EmotionController';

export default function AvatarRenderer({
  avatarId,
  isSpeaking,
  currentText,
  emotionContext,
  animationQuality,
  onLoad
}) {
  const avatarRef = useRef();
  const [vrm, setVrm] = useState(null);
  const lipSyncController = useRef();
  const gestureController = useRef();
  const emotionController = useRef();
  const lastEmotionRef = useRef(null);

  // Initialize controllers based on quality settings
  useEffect(() => {
    if (animationQuality === 'high' || animationQuality === 'medium') {
      lipSyncController.current = new LipSyncController();
      gestureController.current = new GestureController();
      emotionController.current = new EmotionController();
    } else if (animationQuality === 'low') {
      // Low quality mode - only basic controllers
      emotionController.current = new EmotionController();
    }
  }, [animationQuality]);

  // Load avatar model
  useEffect(() => {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    const avatarPath = `/avatars/${avatarId}.glb`;
    
    loader.load(
      avatarPath,
      (gltf) => {
        const vrmData = gltf.userData.vrm;
        setVrm(vrmData);
        
        if (avatarRef.current && vrmData?.scene) {
          // For Three.js group, check if it has add method
          if (avatarRef.current.add) {
            avatarRef.current.add(vrmData.scene);
          }
        }

        // Initialize controllers with VRM
        if (lipSyncController.current && lipSyncController.current.initialize) {
          lipSyncController.current.initialize(vrmData);
        }
        if (gestureController.current && gestureController.current.initialize) {
          gestureController.current.initialize(vrmData);
        }
        if (emotionController.current && emotionController.current.initialize) {
          emotionController.current.initialize(vrmData);
        }

        if (onLoad) {
          onLoad();
        }
      },
      (progress) => {
        // Progress callback
        const percentComplete = (progress.loaded / progress.total) * 100;
        console.log(`Loading avatar: ${percentComplete.toFixed(0)}%`);
      },
      (error) => {
        console.error('Failed to load avatar:', error);
      }
    );

    // Cleanup
    return () => {
      // vrm cleanup handled by React Three Fiber
    };
  }, [avatarId, onLoad]);

  // Handle speech state changes
  useEffect(() => {
    if (!lipSyncController.current) return;

    if (isSpeaking) {
      lipSyncController.current.setAudioData(currentText);
    } else {
      lipSyncController.current.reset();
    }
  }, [isSpeaking, currentText]);

  // Handle emotion changes
  useEffect(() => {
    if (!emotionController.current || !emotionContext) return;

    const { mood, intensity = 0.5 } = emotionContext;
    
    if (lastEmotionRef.current && lastEmotionRef.current !== mood) {
      emotionController.current.transitionTo(mood, intensity);
    } else {
      emotionController.current.setEmotion(mood, intensity);
    }
    
    lastEmotionRef.current = mood;
  }, [emotionContext]);

  // Animation loop
  useFrame((state) => {
    if (!vrm) return;

    const elapsedTime = state.clock.elapsedTime;

    // Update based on quality settings
    if (animationQuality === 'high') {
      // Update all controllers
      if (lipSyncController.current) {
        lipSyncController.current.update(elapsedTime);
      }
      if (gestureController.current) {
        gestureController.current.update(elapsedTime);
      }
      if (emotionController.current) {
        emotionController.current.update(elapsedTime);
      }
    } else if (animationQuality === 'medium') {
      // Update with reduced frequency
      if (elapsedTime % 2 < 0.016) {
        if (lipSyncController.current) {
          lipSyncController.current.update(elapsedTime);
        }
        if (emotionController.current) {
          emotionController.current.update(elapsedTime);
        }
      }
    } else if (animationQuality === 'low') {
      // Only update emotions
      if (elapsedTime % 3 < 0.016 && emotionController.current) {
        emotionController.current.update(elapsedTime);
      }
    }

    // Idle animation
    if (vrm.humanoid) {
      const head = vrm.humanoid.getNormalizedBoneNode('head');
      if (head) {
        head.rotation.y = Math.sin(elapsedTime * 0.5) * 0.05;
        head.rotation.x = Math.sin(elapsedTime * 0.3) * 0.02;
      }
    }
  });

  return (
    <group ref={avatarRef} position={[0, 0, 0]} />
  );
}