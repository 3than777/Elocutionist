# AI Avatar Interviewer Mode - Comprehensive Implementation Plan

## Executive Summary

This document provides a detailed implementation plan for adding a virtual AI avatar interviewer mode to the Elocutionist platform. The feature will enhance the existing AI interview coaching experience by providing visual presence through an animated 3D avatar that conducts interviews with realistic body language, facial expressions, and natural gestures.

## Table of Contents

1. [Current System Analysis](#current-system-analysis)
2. [Feature Overview](#feature-overview)
3. [Technical Architecture](#technical-architecture)
4. [Implementation Phases](#implementation-phases)
5. [Phase 1: Avatar Framework Integration](#phase-1-avatar-framework-integration)
6. [Phase 2: Avatar Component Development](#phase-2-avatar-component-development)
7. [Phase 3: Animation System](#phase-3-animation-system)
8. [Phase 4: Real-time Synchronization](#phase-4-real-time-synchronization)
9. [Phase 5: UI/UX Integration](#phase-5-uiux-integration)
10. [Phase 6: Performance Optimization](#phase-6-performance-optimization)
11. [Phase 7: Testing & Polish](#phase-7-testing--polish)
12. [Technical Specifications](#technical-specifications)
13. [Timeline & Milestones](#timeline--milestones)
14. [Risk Mitigation](#risk-mitigation)

## Current System Analysis

### Existing Features
- **Voice Mode**: Complete speech-to-text and text-to-speech integration
- **Real-time Chat**: WebSocket-ready chat interface for interviews
- **AI Integration**: OpenAI GPT-4 for dynamic question generation
- **Performance Analytics**: Comprehensive interview analysis and feedback
- **User Authentication**: JWT-based authentication system
- **Responsive UI**: Modern React-based frontend with dark mode support

### Technical Stack
- **Frontend**: React with TypeScript support
- **Backend**: Node.js/Express with MongoDB
- **AI Services**: OpenAI APIs for chat and voice
- **State Management**: React Context API
- **Styling**: CSS with Apple Design System principles

## Feature Overview

### Core Capabilities
1. **3D AI Avatar**: Realistic human-like interviewer with professional appearance
2. **Natural Animations**: Synchronized lip-sync, gestures, and body language
3. **Multiple Avatar Options**: Choice of interviewer personas (gender, ethnicity, age)
4. **Real-time Synchronization**: Avatar movements sync with AI speech
5. **Emotional Intelligence**: Avatar expressions adapt to conversation context
6. **Camera Controls**: Multiple viewing angles and zoom capabilities
7. **Performance Mode**: Low-resource option for older devices

### User Experience Goals
- Create more engaging and realistic interview practice sessions
- Reduce interview anxiety through familiar visual presence
- Improve non-verbal communication practice
- Enhance overall interview preparation effectiveness

## Technical Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Avatar    │  │    Voice     │  │    Interview     │  │
│  │  Renderer   │  │   Services   │  │    Manager       │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Avatar Animation Engine                   │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Three.js  │  │  Animation   │  │     Gesture      │  │
│  │   Renderer  │  │  Controller  │  │    Generator     │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Synchronization Layer                     │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Lip-Sync  │  │   Emotion    │  │     Motion       │  │
│  │   Engine    │  │   Analyzer   │  │   Coordinator    │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API (Node.js)                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Avatar    │  │   Animation  │  │    Performance   │  │
│  │  Settings   │  │   Metadata   │  │    Analytics     │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Component Relationships
```
ChatBox.jsx
    ├── AvatarMode.jsx (NEW)
    │   ├── AvatarRenderer.jsx
    │   ├── AvatarControls.jsx
    │   └── AvatarSettings.jsx
    ├── VoiceModeToggle.jsx (ENHANCE)
    │   └── Add avatar toggle option
    ├── InterviewStage.jsx (NEW)
    │   ├── StageEnvironment.jsx
    │   └── CameraController.jsx
    └── SynchronizationManager.jsx (NEW)
        ├── LipSyncEngine.jsx
        ├── GestureEngine.jsx
        └── EmotionEngine.jsx
```

## Implementation Phases

### Overview
The implementation will be divided into 7 phases, each building upon the previous:

1. **Avatar Framework Integration** (5-7 days)
2. **Avatar Component Development** (7-10 days)
3. **Animation System** (10-14 days)
4. **Real-time Synchronization** (7-10 days)
5. **UI/UX Integration** (5-7 days)
6. **Performance Optimization** (5-7 days)
7. **Testing & Polish** (7-10 days)

**Total Timeline: 46-65 days**

## Phase 1: Avatar Framework Integration

### 1.1 Install Required Dependencies

```bash
# Core 3D rendering library
npm install three @react-three/fiber @react-three/drei

# Avatar system
npm install @readyplayerme/react-avatar-creator
npm install @readyplayerme/visage

# Animation libraries
npm install @use-gesture/react leva
npm install react-spring @react-spring/three

# Performance monitoring
npm install stats.js

# Audio analysis for lip-sync
npm install meyda
```

### 1.2 Create Avatar Service Layer

**File: `dreamcollege-frontend/src/services/avatarService.js`**

```javascript
import * as THREE from 'three';
import { VRM, VRMLoaderPlugin } from '@pixiv/three-vrm';

export class AvatarService {
  constructor() {
    this.avatarCache = new Map();
    this.currentAvatar = null;
    this.loader = new THREE.GLTFLoader();
    this.loader.register((parser) => new VRMLoaderPlugin(parser));
  }

  async loadAvatar(avatarUrl) {
    if (this.avatarCache.has(avatarUrl)) {
      return this.avatarCache.get(avatarUrl);
    }

    try {
      const gltf = await this.loader.loadAsync(avatarUrl);
      const vrm = gltf.userData.vrm;
      
      // Setup avatar
      vrm.scene.traverse((obj) => {
        obj.frustumCulled = false;
      });

      this.avatarCache.set(avatarUrl, vrm);
      return vrm;
    } catch (error) {
      console.error('Failed to load avatar:', error);
      throw error;
    }
  }

  async switchAvatar(avatarUrl) {
    const avatar = await this.loadAvatar(avatarUrl);
    this.currentAvatar = avatar;
    return avatar;
  }

  getDefaultAvatarOptions() {
    return [
      {
        id: 'professional-female-1',
        name: 'Sarah Chen',
        role: 'Senior Admissions Officer',
        url: '/avatars/sarah-chen.glb',
        thumbnail: '/avatars/sarah-chen-thumb.jpg',
        personality: 'warm-professional'
      },
      {
        id: 'professional-male-1',
        name: 'Dr. James Williams',
        role: 'Dean of Admissions',
        url: '/avatars/james-williams.glb',
        thumbnail: '/avatars/james-williams-thumb.jpg',
        personality: 'academic-formal'
      },
      {
        id: 'professional-female-2',
        name: 'Maria Rodriguez',
        role: 'Interview Coordinator',
        url: '/avatars/maria-rodriguez.glb',
        thumbnail: '/avatars/maria-rodriguez-thumb.jpg',
        personality: 'friendly-encouraging'
      }
    ];
  }
}
```

### 1.3 Backend Avatar Configuration Endpoint

**File: `src/routes/avatar.routes.ts`**

```typescript
import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get user's avatar preferences
router.get('/preferences', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const preferences = await AvatarPreference.findOne({ userId });
    
    res.json({
      success: true,
      preferences: preferences || {
        avatarId: 'professional-female-1',
        cameraAngle: 'front',
        environmentTheme: 'modern-office',
        animationQuality: 'high'
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch avatar preferences',
      message: error.message
    });
  }
});

// Save avatar preferences
router.post('/preferences', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { avatarId, cameraAngle, environmentTheme, animationQuality } = req.body;
    
    const preferences = await AvatarPreference.findOneAndUpdate(
      { userId },
      {
        userId,
        avatarId,
        cameraAngle,
        environmentTheme,
        animationQuality,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    
    res.json({
      success: true,
      preferences
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to save avatar preferences',
      message: error.message
    });
  }
});

export default router;
```

## Phase 2: Avatar Component Development

### 2.1 Main Avatar Mode Component

**File: `dreamcollege-frontend/src/components/AvatarMode.jsx`**

```javascript
import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { useTheme } from '../context/ThemeContext';
import AvatarRenderer from './AvatarRenderer';
import AvatarControls from './AvatarControls';
import InterviewStage from './InterviewStage';
import { AvatarService } from '../services/avatarService';

export default function AvatarMode({ 
  isActive, 
  onToggle, 
  isSpeaking, 
  currentText,
  emotionContext,
  user 
}) {
  const { isDark } = useTheme();
  const [selectedAvatar, setSelectedAvatar] = useState('professional-female-1');
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [cameraPosition, setCameraPosition] = useState([0, 1.6, 2.5]);
  const [animationQuality, setAnimationQuality] = useState('high');
  const avatarService = useRef(new AvatarService());

  useEffect(() => {
    if (isActive && user) {
      loadUserPreferences();
    }
  }, [isActive, user]);

  const loadUserPreferences = async () => {
    try {
      const response = await fetch('/api/avatar/preferences', {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedAvatar(data.preferences.avatarId);
        setAnimationQuality(data.preferences.animationQuality);
      }
    } catch (error) {
      console.error('Failed to load avatar preferences:', error);
    }
  };

  const handleAvatarChange = async (avatarId) => {
    setAvatarLoaded(false);
    setSelectedAvatar(avatarId);
    
    // Save preference to backend
    if (user) {
      try {
        await fetch('/api/avatar/preferences', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`
          },
          body: JSON.stringify({ avatarId })
        });
      } catch (error) {
        console.error('Failed to save avatar preference:', error);
      }
    }
  };

  const handleAvatarLoad = () => {
    setAvatarLoaded(true);
  };

  if (!isActive) {
    return null;
  }

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: isDark ? '#1a1a1a' : '#f5f5f7',
      zIndex: 100
    }}>
      {/* 3D Canvas */}
      <Canvas
        camera={{ 
          position: cameraPosition, 
          fov: 45,
          near: 0.1,
          far: 100
        }}
        shadows
        style={{ width: '100%', height: '100%' }}
      >
        {/* Lighting */}
        <ambientLight intensity={isDark ? 0.3 : 0.5} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={isDark ? 0.5 : 0.8}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        
        {/* Environment */}
        <Environment
          preset={isDark ? "night" : "studio"}
          background={false}
        />
        
        {/* Interview Stage */}
        <InterviewStage theme={isDark ? 'dark' : 'light'} />
        
        {/* Avatar */}
        <AvatarRenderer
          avatarId={selectedAvatar}
          isSpeaking={isSpeaking}
          currentText={currentText}
          emotionContext={emotionContext}
          animationQuality={animationQuality}
          onLoad={handleAvatarLoad}
        />
        
        {/* Shadows */}
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.4}
          scale={10}
          blur={2}
          far={4}
        />
        
        {/* Camera Controls */}
        <OrbitControls
          target={[0, 1.2, 0]}
          minDistance={1.5}
          maxDistance={5}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2}
          enablePan={false}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>

      {/* UI Overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none'
      }}>
        {/* Avatar Controls */}
        <AvatarControls
          show={showControls}
          onToggle={() => setShowControls(!showControls)}
          selectedAvatar={selectedAvatar}
          onAvatarChange={handleAvatarChange}
          animationQuality={animationQuality}
          onQualityChange={setAnimationQuality}
          cameraPosition={cameraPosition}
          onCameraChange={setCameraPosition}
        />
        
        {/* Loading Overlay */}
        {!avatarLoaded && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'auto'
          }}>
            <div style={{
              backgroundColor: 'rgba(0,0,0,0.8)',
              borderRadius: '12px',
              padding: '20px 40px',
              color: 'white',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '18px', marginBottom: '10px' }}>
                Loading Avatar...
              </div>
              <div style={{
                width: '200px',
                height: '4px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: '50%',
                  height: '100%',
                  backgroundColor: '#007AFF',
                  animation: 'loading 1.5s ease-in-out infinite'
                }} />
              </div>
            </div>
          </div>
        )}
        
        {/* Exit Button */}
        <button
          onClick={onToggle}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            padding: '10px 20px',
            backgroundColor: 'rgba(142, 142, 147, 0.8)',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            pointerEvents: 'auto',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = 'rgba(142, 142, 147, 1)';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = 'rgba(142, 142, 147, 0.8)';
          }}
        >
          Exit Avatar Mode
        </button>
      </div>

      <style jsx>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
```

### 2.2 Avatar Renderer Component

**File: `dreamcollege-frontend/src/components/AvatarRenderer.jsx`**

```javascript
import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VRMLoaderPlugin, VRM } from '@pixiv/three-vrm';
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
  const mixerRef = useRef();
  const [vrm, setVrm] = useState(null);
  const lipSyncController = useRef();
  const gestureController = useRef();
  const emotionController = useRef();

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
        
        if (avatarRef.current) {
          avatarRef.current.add(vrmData.scene);
        }

        // Initialize controllers
        lipSyncController.current = new LipSyncController(vrmData);
        gestureController.current = new GestureController(vrmData);
        emotionController.current = new EmotionController(vrmData);

        onLoad?.();
      },
      (progress) => {
        console.log('Loading avatar:', (progress.loaded / progress.total) * 100 + '%');
      },
      (error) => {
        console.error('Failed to load avatar:', error);
      }
    );

    return () => {
      // Cleanup
      if (vrm) {
        vrm.scene.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(material => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }
    };
  }, [avatarId, onLoad]);

  // Animation loop
  useFrame((state, delta) => {
    if (!vrm) return;

    // Update VRM
    vrm.update(delta);

    // Idle animation (breathing, blinking)
    const time = state.clock.getElapsedTime();
    
    // Breathing
    if (vrm.humanoid) {
      const breathing = Math.sin(time * 0.5) * 0.02;
      vrm.humanoid.getRawBoneNode('chest').position.y = breathing;
    }

    // Update controllers
    if (lipSyncController.current && isSpeaking) {
      lipSyncController.current.update(delta);
    }

    if (gestureController.current) {
      gestureController.current.update(delta, isSpeaking, currentText);
    }

    if (emotionController.current) {
      emotionController.current.update(delta, emotionContext);
    }

    // Eye tracking (look at camera)
    if (vrm.lookAt) {
      vrm.lookAt.target = state.camera.position;
      vrm.lookAt.autoUpdate = true;
    }
  });

  return (
    <group ref={avatarRef} position={[0, 0, 0]}>
      {/* Avatar will be added here */}
    </group>
  );
}
```

### 2.3 Avatar Controls UI

**File: `dreamcollege-frontend/src/components/AvatarControls.jsx`**

```javascript
import React from 'react';
import { AvatarService } from '../services/avatarService';

export default function AvatarControls({
  show,
  onToggle,
  selectedAvatar,
  onAvatarChange,
  animationQuality,
  onQualityChange,
  cameraPosition,
  onCameraChange
}) {
  const avatarService = new AvatarService();
  const avatarOptions = avatarService.getDefaultAvatarOptions();

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          backgroundColor: 'rgba(0, 122, 255, 0.8)',
          border: 'none',
          color: 'white',
          fontSize: '20px',
          cursor: 'pointer',
          pointerEvents: 'auto',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease'
        }}
        aria-label="Avatar settings"
      >
        ⚙️
      </button>

      {/* Controls Panel */}
      {show && (
        <div style={{
          position: 'absolute',
          bottom: '80px',
          left: '20px',
          width: '300px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
          backdropFilter: 'blur(10px)',
          pointerEvents: 'auto'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: '18px',
            fontWeight: '600'
          }}>
            Avatar Settings
          </h3>

          {/* Avatar Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '10px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Select Interviewer
            </label>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px'
            }}>
              {avatarOptions.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => onAvatarChange(avatar.id)}
                  style={{
                    padding: '8px',
                    border: selectedAvatar === avatar.id 
                      ? '2px solid #007AFF' 
                      : '2px solid transparent',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <img 
                    src={avatar.thumbnail} 
                    alt={avatar.name}
                    style={{ 
                      width: '100%', 
                      borderRadius: '4px',
                      marginBottom: '4px'
                    }}
                  />
                  <div style={{ 
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {avatar.name}
                  </div>
                  <div style={{ 
                    fontSize: '10px',
                    color: '#666'
                  }}>
                    {avatar.role}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Animation Quality */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '10px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Animation Quality
            </label>
            <select
              value={animationQuality}
              onChange={(e) => onQualityChange(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            >
              <option value="low">Low (Better Performance)</option>
              <option value="medium">Medium</option>
              <option value="high">High (Best Quality)</option>
            </select>
          </div>

          {/* Camera Presets */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '10px',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              Camera View
            </label>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px'
            }}>
              <button
                onClick={() => onCameraChange([0, 1.6, 2.5])}
                style={{
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #E5E7EB',
                  backgroundColor: 'white',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Front
              </button>
              <button
                onClick={() => onCameraChange([1.5, 1.6, 1.5])}
                style={{
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #E5E7EB',
                  backgroundColor: 'white',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Side
              </button>
              <button
                onClick={() => onCameraChange([0, 1.8, 1.5])}
                style={{
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid #E5E7EB',
                  backgroundColor: 'white',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Close-up
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

## Phase 3: Animation System

### 3.1 Lip Sync Controller

**File: `dreamcollege-frontend/src/components/LipSyncController.jsx`**

```javascript
import Meyda from 'meyda';

export default class LipSyncController {
  constructor(vrm) {
    this.vrm = vrm;
    this.audioContext = null;
    this.analyzer = null;
    this.visemeWeights = {
      'aa': 0,
      'ee': 0,
      'ih': 0,
      'oh': 0,
      'ou': 0
    };
    this.smoothingFactor = 0.7;
  }

  async initialize(audioElement) {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    const source = this.audioContext.createMediaElementSource(audioElement);
    
    if (this.analyzer) {
      this.analyzer.stop();
    }

    this.analyzer = Meyda.createMeydaAnalyzer({
      audioContext: this.audioContext,
      source: source,
      bufferSize: 512,
      featureExtractors: ['rms', 'spectralCentroid', 'mfcc'],
      callback: (features) => {
        this.processAudioFeatures(features);
      }
    });

    this.analyzer.start();
    source.connect(this.audioContext.destination);
  }

  processAudioFeatures(features) {
    if (!features || !this.vrm) return;

    const { rms, spectralCentroid, mfcc } = features;
    
    // Map audio features to viseme weights
    // This is a simplified mapping - real implementation would use
    // more sophisticated phoneme detection
    
    // RMS indicates overall mouth openness
    const mouthOpen = Math.min(rms * 2, 1);
    
    // Spectral centroid helps distinguish vowels
    const normalized = spectralCentroid / 8000;
    
    // Update viseme weights based on audio characteristics
    if (rms > 0.1) {
      if (normalized < 0.3) {
        // Low frequencies - 'oh', 'ou'
        this.visemeWeights.oh = this.smooth(this.visemeWeights.oh, mouthOpen);
        this.visemeWeights.ou = this.smooth(this.visemeWeights.ou, mouthOpen * 0.7);
      } else if (normalized < 0.6) {
        // Mid frequencies - 'aa'
        this.visemeWeights.aa = this.smooth(this.visemeWeights.aa, mouthOpen);
      } else {
        // High frequencies - 'ee', 'ih'
        this.visemeWeights.ee = this.smooth(this.visemeWeights.ee, mouthOpen * 0.8);
        this.visemeWeights.ih = this.smooth(this.visemeWeights.ih, mouthOpen * 0.6);
      }
    } else {
      // Silence - close mouth
      Object.keys(this.visemeWeights).forEach(key => {
        this.visemeWeights[key] = this.smooth(this.visemeWeights[key], 0);
      });
    }

    this.applyVisemes();
  }

  smooth(current, target) {
    return current * this.smoothingFactor + target * (1 - this.smoothingFactor);
  }

  applyVisemes() {
    if (!this.vrm || !this.vrm.blendShapeProxy) return;

    const blendShapeProxy = this.vrm.blendShapeProxy;

    // Map viseme weights to VRM blend shapes
    blendShapeProxy.setValue('aa', this.visemeWeights.aa);
    blendShapeProxy.setValue('ee', this.visemeWeights.ee);
    blendShapeProxy.setValue('ih', this.visemeWeights.ih);
    blendShapeProxy.setValue('oh', this.visemeWeights.oh);
    blendShapeProxy.setValue('ou', this.visemeWeights.ou);
  }

  update(deltaTime) {
    // Additional smoothing or animation logic can go here
  }

  stop() {
    if (this.analyzer) {
      this.analyzer.stop();
      this.analyzer = null;
    }
  }
}
```

### 3.2 Gesture Controller

**File: `dreamcollege-frontend/src/components/GestureController.jsx`**

```javascript
import * as THREE from 'three';

export default class GestureController {
  constructor(vrm) {
    this.vrm = vrm;
    this.gestureLibrary = this.initializeGestureLibrary();
    this.currentGesture = null;
    this.gestureProgress = 0;
    this.gestureSpeed = 1;
    this.idleTimer = 0;
    this.nextGestureTime = 0;
  }

  initializeGestureLibrary() {
    return {
      'thinking': {
        duration: 2,
        keyframes: [
          {
            time: 0,
            pose: {
              rightUpperArm: { rotation: [-0.5, 0, 0.3] },
              rightLowerArm: { rotation: [-1.2, 0, 0] },
              rightHand: { rotation: [0, 0, 0.2] },
              head: { rotation: [0.1, 0.2, 0] }
            }
          },
          {
            time: 1,
            pose: {
              rightUpperArm: { rotation: [-0.6, 0, 0.3] },
              rightLowerArm: { rotation: [-1.3, 0, 0] },
              rightHand: { rotation: [0, 0, 0.3] },
              head: { rotation: [0.15, 0.3, 0.05] }
            }
          }
        ]
      },
      'explaining': {
        duration: 3,
        keyframes: [
          {
            time: 0,
            pose: {
              rightUpperArm: { rotation: [-0.8, 0, 0.2] },
              rightLowerArm: { rotation: [-0.4, 0, 0] },
              rightHand: { rotation: [0, 0, 0] },
              leftUpperArm: { rotation: [-0.8, 0, -0.2] },
              leftLowerArm: { rotation: [-0.4, 0, 0] }
            }
          },
          {
            time: 1.5,
            pose: {
              rightUpperArm: { rotation: [-0.9, 0.3, 0.2] },
              rightLowerArm: { rotation: [-0.5, 0, 0] },
              rightHand: { rotation: [0.2, 0, 0] },
              leftUpperArm: { rotation: [-0.7, -0.3, -0.2] },
              leftLowerArm: { rotation: [-0.3, 0, 0] }
            }
          }
        ]
      },
      'listening': {
        duration: 4,
        keyframes: [
          {
            time: 0,
            pose: {
              head: { rotation: [0.05, 0, 0] },
              rightUpperArm: { rotation: [0.1, 0, 0.1] },
              leftUpperArm: { rotation: [0.1, 0, -0.1] }
            }
          },
          {
            time: 2,
            pose: {
              head: { rotation: [0.1, 0.1, 0.02] },
              rightUpperArm: { rotation: [0.1, 0, 0.15] },
              leftUpperArm: { rotation: [0.1, 0, -0.15] }
            }
          }
        ]
      },
      'welcoming': {
        duration: 2,
        keyframes: [
          {
            time: 0,
            pose: {
              rightUpperArm: { rotation: [-1.0, 0.5, 0.3] },
              rightLowerArm: { rotation: [-0.2, 0, 0] },
              rightHand: { rotation: [0, 0, -0.3] },
              head: { rotation: [0.1, 0, 0] }
            }
          },
          {
            time: 1,
            pose: {
              rightUpperArm: { rotation: [-0.8, 0.3, 0.2] },
              rightLowerArm: { rotation: [-0.3, 0, 0] },
              rightHand: { rotation: [0, 0, -0.2] },
              head: { rotation: [0.05, 0, 0] }
            }
          }
        ]
      }
    };
  }

  selectGestureForText(text) {
    // Simple keyword-based gesture selection
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('think') || lowerText.includes('consider')) {
      return 'thinking';
    } else if (lowerText.includes('explain') || lowerText.includes('tell me')) {
      return 'explaining';
    } else if (lowerText.includes('hello') || lowerText.includes('welcome')) {
      return 'welcoming';
    } else if (lowerText.includes('?')) {
      return 'listening';
    }
    
    // Default to explaining for most speech
    return 'explaining';
  }

  startGesture(gestureName) {
    if (this.gestureLibrary[gestureName]) {
      this.currentGesture = gestureName;
      this.gestureProgress = 0;
    }
  }

  update(deltaTime, isSpeaking, currentText) {
    if (!this.vrm || !this.vrm.humanoid) return;

    // Update idle timer
    this.idleTimer += deltaTime;

    if (isSpeaking && currentText) {
      // Reset idle timer when speaking
      this.idleTimer = 0;

      // Select and start appropriate gesture
      if (!this.currentGesture || this.gestureProgress >= 1) {
        const gesture = this.selectGestureForText(currentText);
        this.startGesture(gesture);
      }
    } else {
      // Idle animations
      if (this.idleTimer > this.nextGestureTime) {
        this.startGesture('listening');
        this.nextGestureTime = 5 + Math.random() * 5; // Random interval
        this.idleTimer = 0;
      }
    }

    // Update current gesture
    if (this.currentGesture) {
      const gesture = this.gestureLibrary[this.currentGesture];
      this.gestureProgress += (deltaTime * this.gestureSpeed) / gesture.duration;

      if (this.gestureProgress >= 1) {
        this.gestureProgress = 0;
        this.currentGesture = null;
      } else {
        this.applyGesture(gesture, this.gestureProgress);
      }
    }

    // Apply subtle idle movements
    this.applyIdleMovements(deltaTime);
  }

  applyGesture(gesture, progress) {
    const humanoid = this.vrm.humanoid;
    
    // Find keyframes to interpolate between
    let fromKeyframe = gesture.keyframes[0];
    let toKeyframe = gesture.keyframes[gesture.keyframes.length - 1];
    
    for (let i = 0; i < gesture.keyframes.length - 1; i++) {
      const kf1 = gesture.keyframes[i];
      const kf2 = gesture.keyframes[i + 1];
      const t1 = kf1.time / gesture.duration;
      const t2 = kf2.time / gesture.duration;
      
      if (progress >= t1 && progress <= t2) {
        fromKeyframe = kf1;
        toKeyframe = kf2;
        
        // Recalculate progress between these keyframes
        progress = (progress - t1) / (t2 - t1);
        break;
      }
    }

    // Apply interpolated pose
    Object.keys(fromKeyframe.pose).forEach(boneName => {
      const bone = humanoid.getBone(boneName);
      if (bone && bone.node) {
        const from = fromKeyframe.pose[boneName];
        const to = toKeyframe.pose[boneName];
        
        if (from.rotation && to.rotation) {
          bone.node.rotation.x = THREE.MathUtils.lerp(from.rotation[0], to.rotation[0], progress);
          bone.node.rotation.y = THREE.MathUtils.lerp(from.rotation[1], to.rotation[1], progress);
          bone.node.rotation.z = THREE.MathUtils.lerp(from.rotation[2], to.rotation[2], progress);
        }
      }
    });
  }

  applyIdleMovements(deltaTime) {
    const humanoid = this.vrm.humanoid;
    const time = performance.now() / 1000;

    // Subtle head movements
    const head = humanoid.getBone('head');
    if (head && head.node) {
      head.node.rotation.x = Math.sin(time * 0.5) * 0.02;
      head.node.rotation.y = Math.cos(time * 0.3) * 0.03;
    }

    // Weight shifting
    const hips = humanoid.getBone('hips');
    if (hips && hips.node) {
      hips.node.position.x = Math.sin(time * 0.2) * 0.01;
      hips.node.rotation.y = Math.sin(time * 0.15) * 0.01;
    }
  }
}
```

### 3.3 Emotion Controller

**File: `dreamcollege-frontend/src/components/EmotionController.jsx`**

```javascript
export default class EmotionController {
  constructor(vrm) {
    this.vrm = vrm;
    this.currentEmotion = 'neutral';
    this.targetEmotions = {
      happy: 0,
      sad: 0,
      angry: 0,
      surprised: 0,
      neutral: 1
    };
    this.currentEmotions = { ...this.targetEmotions };
    this.transitionSpeed = 2;
  }

  analyzeEmotionFromText(text) {
    if (!text) return 'neutral';

    const lowerText = text.toLowerCase();
    
    // Simple emotion detection based on keywords
    if (lowerText.includes('excellent') || lowerText.includes('great') || 
        lowerText.includes('wonderful') || lowerText.includes('impressive')) {
      return 'happy';
    } else if (lowerText.includes('concern') || lowerText.includes('worry') ||
               lowerText.includes('difficult')) {
      return 'concerned';
    } else if (lowerText.includes('interesting') || lowerText.includes('tell me more')) {
      return 'interested';
    }
    
    return 'neutral';
  }

  setEmotion(emotion) {
    // Reset all emotions
    Object.keys(this.targetEmotions).forEach(key => {
      this.targetEmotions[key] = 0;
    });

    // Set target emotion
    switch (emotion) {
      case 'happy':
        this.targetEmotions.happy = 1;
        break;
      case 'concerned':
        this.targetEmotions.sad = 0.3;
        this.targetEmotions.neutral = 0.7;
        break;
      case 'interested':
        this.targetEmotions.surprised = 0.2;
        this.targetEmotions.happy = 0.3;
        this.targetEmotions.neutral = 0.5;
        break;
      default:
        this.targetEmotions.neutral = 1;
    }
  }

  update(deltaTime, emotionContext) {
    if (!this.vrm || !this.vrm.blendShapeProxy) return;

    // Analyze emotion from context
    if (emotionContext && emotionContext.text) {
      const detectedEmotion = this.analyzeEmotionFromText(emotionContext.text);
      this.setEmotion(detectedEmotion);
    }

    // Smooth transition between emotions
    Object.keys(this.currentEmotions).forEach(key => {
      const current = this.currentEmotions[key];
      const target = this.targetEmotions[key];
      const diff = target - current;
      
      this.currentEmotions[key] += diff * deltaTime * this.transitionSpeed;
    });

    // Apply emotions to blend shapes
    this.applyEmotions();
  }

  applyEmotions() {
    const blendShapeProxy = this.vrm.blendShapeProxy;

    // Map emotions to VRM blend shapes
    blendShapeProxy.setValue('happy', this.currentEmotions.happy);
    blendShapeProxy.setValue('sad', this.currentEmotions.sad * 0.5);
    blendShapeProxy.setValue('angry', this.currentEmotions.angry * 0.3);
    blendShapeProxy.setValue('surprised', this.currentEmotions.surprised * 0.4);
    
    // Eyebrow movements based on emotion
    const eyebrowHeight = 
      this.currentEmotions.surprised * 0.2 - 
      this.currentEmotions.sad * 0.1 -
      this.currentEmotions.angry * 0.2;
    
    blendShapeProxy.setValue('browUp_L', Math.max(0, eyebrowHeight));
    blendShapeProxy.setValue('browUp_R', Math.max(0, eyebrowHeight));
    blendShapeProxy.setValue('browDown_L', Math.max(0, -eyebrowHeight));
    blendShapeProxy.setValue('browDown_R', Math.max(0, -eyebrowHeight));
  }
}
```

## Phase 4: Real-time Synchronization

### 4.1 Synchronization Manager

**File: `dreamcollege-frontend/src/components/SynchronizationManager.jsx`**

```javascript
import React, { useEffect, useRef } from 'react';

export default function SynchronizationManager({
  avatarRef,
  isSpeaking,
  currentText,
  audioElement,
  onEmotionDetected
}) {
  const lipSyncRef = useRef();
  const speechAnalyzerRef = useRef();
  const lastTextRef = useRef('');

  useEffect(() => {
    if (!avatarRef.current) return;

    // Initialize synchronization components
    const initializeSync = async () => {
      if (audioElement && isSpeaking) {
        // Initialize lip sync with audio
        if (avatarRef.current.lipSyncController) {
          await avatarRef.current.lipSyncController.initialize(audioElement);
        }

        // Start speech analysis
        startSpeechAnalysis();
      } else {
        // Stop lip sync when not speaking
        if (avatarRef.current.lipSyncController) {
          avatarRef.current.lipSyncController.stop();
        }
      }
    };

    initializeSync();

    return () => {
      // Cleanup
      if (avatarRef.current?.lipSyncController) {
        avatarRef.current.lipSyncController.stop();
      }
    };
  }, [isSpeaking, audioElement, avatarRef]);

  useEffect(() => {
    // Detect text changes for gesture triggering
    if (currentText && currentText !== lastTextRef.current) {
      lastTextRef.current = currentText;
      
      // Analyze text for emotion
      const emotion = analyzeTextEmotion(currentText);
      if (onEmotionDetected) {
        onEmotionDetected(emotion);
      }

      // Trigger appropriate gestures
      if (avatarRef.current?.gestureController) {
        const gesture = selectGestureForText(currentText);
        avatarRef.current.gestureController.startGesture(gesture);
      }
    }
  }, [currentText, avatarRef, onEmotionDetected]);

  const startSpeechAnalysis = () => {
    // Analyze speech patterns for enhanced synchronization
    if (!audioElement) return;

    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaElementSource(audioElement);
    
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const analyze = () => {
      if (!isSpeaking) return;

      analyser.getByteFrequencyData(dataArray);
      
      // Calculate speech intensity
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      const intensity = average / 255;

      // Update avatar based on intensity
      if (avatarRef.current) {
        // Adjust gesture speed based on speech intensity
        if (avatarRef.current.gestureController) {
          avatarRef.current.gestureController.gestureSpeed = 0.5 + intensity * 1.5;
        }

        // Add speech-driven head movements
        if (avatarRef.current.vrm?.humanoid) {
          const head = avatarRef.current.vrm.humanoid.getBone('head');
          if (head && head.node) {
            head.node.rotation.x = Math.sin(Date.now() * 0.001) * 0.02 * intensity;
          }
        }
      }

      requestAnimationFrame(analyze);
    };

    analyze();
    speechAnalyzerRef.current = { audioContext, analyser, source };
  };

  const analyzeTextEmotion = (text) => {
    // Simple emotion detection
    const emotions = {
      happy: ['great', 'excellent', 'wonderful', 'amazing', 'fantastic', 'proud'],
      concerned: ['concern', 'worry', 'difficult', 'challenge', 'problem'],
      interested: ['interesting', 'tell me', 'curious', 'fascinating'],
      encouraging: ['good', 'well done', 'nice', 'progress', 'improvement']
    };

    const lowerText = text.toLowerCase();
    
    for (const [emotion, keywords] of Object.entries(emotions)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return emotion;
      }
    }

    return 'neutral';
  };

  const selectGestureForText = (text) => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('?')) {
      return 'questioning';
    } else if (lowerText.includes('think') || lowerText.includes('consider')) {
      return 'thinking';
    } else if (lowerText.includes('explain') || lowerText.includes('describe')) {
      return 'explaining';
    } else if (lowerText.includes('welcome') || lowerText.includes('hello')) {
      return 'welcoming';
    }
    
    return 'talking';
  };

  return null; // This is a logic-only component
}
```

### 4.2 Enhanced ChatBox Integration

**Update: `dreamcollege-frontend/src/components/ChatBox.jsx`**

Add the following to the ChatBox component:

```javascript
// Add to imports
import AvatarMode from './AvatarMode';
import SynchronizationManager from './SynchronizationManager';

// Add to state
const [isAvatarMode, setIsAvatarMode] = useState(false);
const [avatarEmotionContext, setAvatarEmotionContext] = useState(null);
const audioElementRef = useRef(null);
const avatarRef = useRef(null);

// Add avatar mode toggle handler
const handleAvatarModeToggle = () => {
  setIsAvatarMode(!isAvatarMode);
  
  // Save preference
  if (user) {
    localStorage.setItem('avatarModePreference', (!isAvatarMode).toString());
  }
};

// Update the voice mode section to include avatar toggle
<div style={{
  padding: '16px 20px',
  backgroundColor: 'var(--background-tertiary)',
  borderBottom: '1px solid var(--border-primary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between'
}}>
  <div style={{ display: 'flex', gap: '20px' }}>
    {/* Voice Mode Toggle */}
    <VoiceModeToggle
      isVoiceMode={isVoiceMode}
      onVoiceModeChange={handleVoiceModeChange}
      disabled={isLoading}
    />
    
    {/* Avatar Mode Toggle */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={handleAvatarModeToggle}
        disabled={!user}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          borderRadius: '20px',
          border: 'none',
          backgroundColor: isAvatarMode ? '#007AFF' : '#E5E7EB',
          color: isAvatarMode ? 'white' : '#666',
          fontSize: '14px',
          fontWeight: '500',
          cursor: user ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease',
          opacity: user ? 1 : 0.5
        }}
      >
        <span style={{ fontSize: '16px' }}>👤</span>
        <span>Avatar Mode</span>
      </button>
      {!user && (
        <span style={{ fontSize: '12px', color: '#666' }}>
          (Login required)
        </span>
      )}
    </div>
  </div>
</div>

// Add Avatar Mode component
{isAvatarMode && (
  <>
    <AvatarMode
      isActive={isAvatarMode}
      onToggle={handleAvatarModeToggle}
      isSpeaking={isSpeaking}
      currentText={messages[messages.length - 1]?.sender === 'ai' ? messages[messages.length - 1].text : ''}
      emotionContext={avatarEmotionContext}
      user={user}
      ref={avatarRef}
    />
    
    <SynchronizationManager
      avatarRef={avatarRef}
      isSpeaking={isSpeaking}
      currentText={messages[messages.length - 1]?.sender === 'ai' ? messages[messages.length - 1].text : ''}
      audioElement={audioElementRef.current}
      onEmotionDetected={setAvatarEmotionContext}
    />
  </>
)}

// Update the message display to be hidden when avatar mode is active
<div className="messages" style={{
  display: isAvatarMode ? 'none' : 'block'
}}>
  {/* existing message content */}
</div>

// Update input section to show over avatar mode
<div className="input-row" style={{
  opacity: (isInterviewCompleted) ? 0.5 : 1,
  pointerEvents: (isInterviewCompleted) ? 'none' : 'auto',
  position: isAvatarMode ? 'fixed' : 'relative',
  bottom: isAvatarMode ? '20px' : 'auto',
  left: isAvatarMode ? '20px' : 'auto',
  right: isAvatarMode ? '20px' : 'auto',
  zIndex: isAvatarMode ? 200 : 'auto',
  backgroundColor: isAvatarMode ? 'rgba(255,255,255,0.9)' : 'transparent',
  padding: isAvatarMode ? '20px' : '0',
  borderRadius: isAvatarMode ? '20px' : '0',
  backdropFilter: isAvatarMode ? 'blur(10px)' : 'none'
}}>
  {/* existing input content */}
</div>
```

## Phase 5: UI/UX Integration

### 5.1 Interview Stage Environment

**File: `dreamcollege-frontend/src/components/InterviewStage.jsx`**

```javascript
import React from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function InterviewStage({ theme }) {
  const { scene } = useThree();

  // Configure fog for depth
  React.useEffect(() => {
    scene.fog = new THREE.Fog(
      theme === 'dark' ? '#1a1a1a' : '#f5f5f7',
      5,
      15
    );
  }, [scene, theme]);

  return (
    <group>
      {/* Floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial
          color={theme === 'dark' ? '#2a2a2a' : '#e5e5e7'}
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      {/* Back wall */}
      <mesh
        position={[0, 5, -5]}
        receiveShadow
      >
        <planeGeometry args={[20, 10]} />
        <meshStandardMaterial
          color={theme === 'dark' ? '#333333' : '#f0f0f2'}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Desk */}
      <group position={[0, 0.75, -0.5]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2, 0.05, 1]} />
          <meshStandardMaterial
            color={theme === 'dark' ? '#4a4a4a' : '#8e8e93'}
            roughness={0.3}
            metalness={0.7}
          />
        </mesh>
        
        {/* Desk legs */}
        {[[-0.9, -0.375, -0.4], [0.9, -0.375, -0.4], [-0.9, -0.375, 0.4], [0.9, -0.375, 0.4]].map((pos, i) => (
          <mesh key={i} position={pos} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.75]} />
            <meshStandardMaterial
              color={theme === 'dark' ? '#3a3a3a' : '#6e6e73'}
              roughness={0.5}
              metalness={0.5}
            />
          </mesh>
        ))}
      </group>

      {/* Laptop on desk */}
      <group position={[0.5, 0.78, -0.5]}>
        <mesh castShadow>
          <boxGeometry args={[0.3, 0.02, 0.2]} />
          <meshStandardMaterial
            color="#1a1a1a"
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
        <mesh position={[0, 0.1, -0.1]} rotation={[-0.3, 0, 0]} castShadow>
          <boxGeometry args={[0.3, 0.2, 0.02]} />
          <meshStandardMaterial
            color="#1a1a1a"
            roughness={0.2}
            metalness={0.8}
            emissive="#007AFF"
            emissiveIntensity={0.1}
          />
        </mesh>
      </group>

      {/* Coffee mug */}
      <mesh position={[-0.3, 0.82, -0.5]} castShadow>
        <cylinderGeometry args={[0.04, 0.035, 0.08]} />
        <meshStandardMaterial
          color={theme === 'dark' ? '#f5f5f7' : '#1a1a1a'}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      {/* Window light effect */}
      <mesh position={[5, 3, 0]}>
        <planeGeometry args={[3, 4]} />
        <meshBasicMaterial
          color="#ffffff"
          opacity={theme === 'dark' ? 0.1 : 0.3}
          transparent
        />
      </mesh>

      {/* Ambient details */}
      {theme === 'light' && (
        <pointLight
          position={[5, 3, 0]}
          intensity={0.5}
          color="#fff5e6"
          castShadow
        />
      )}
    </group>
  );
}
```

### 5.2 Avatar Settings Modal

**File: `dreamcollege-frontend/src/components/AvatarSettingsModal.jsx`**

```javascript
import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

export default function AvatarSettingsModal({ isOpen, onClose, user }) {
  const { isDark } = useTheme();
  const [settings, setSettings] = useState({
    avatarId: 'professional-female-1',
    environmentTheme: 'modern-office',
    cameraAngle: 'front',
    animationQuality: 'high',
    autoGestures: true,
    lipSyncSensitivity: 'medium',
    emotionalResponses: true
  });

  useEffect(() => {
    if (isOpen && user) {
      loadSettings();
    }
  }, [isOpen, user]);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/avatar/preferences', {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({ ...prev, ...data.preferences }));
      }
    } catch (error) {
      console.error('Failed to load avatar settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await fetch('/api/avatar/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(settings)
      });
      
      onClose();
    } catch (error) {
      console.error('Failed to save avatar settings:', error);
    }
  };

  if (!isOpen) return null;

  const avatarOptions = [
    { id: 'professional-female-1', name: 'Sarah Chen', description: 'Warm and encouraging' },
    { id: 'professional-male-1', name: 'Dr. James Williams', description: 'Professional and thorough' },
    { id: 'professional-female-2', name: 'Maria Rodriguez', description: 'Friendly and supportive' }
  ];

  const environmentOptions = [
    { id: 'modern-office', name: 'Modern Office', description: 'Clean, professional setting' },
    { id: 'university-room', name: 'University Room', description: 'Academic environment' },
    { id: 'minimal', name: 'Minimal', description: 'Distraction-free space' }
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        backgroundColor: isDark ? '#2a2a2a' : 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        zIndex: 1001,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: `1px solid ${isDark ? '#404040' : '#E5E7EB'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '600',
            color: isDark ? 'white' : '#1F2937'
          }}>
            Avatar Settings
          </h2>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: isDark ? '#404040' : '#F3F4F6',
              color: isDark ? 'white' : '#6B7280',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px'
        }}>
          {/* Avatar Selection */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '16px',
              color: isDark ? 'white' : '#1F2937'
            }}>
              Choose Your Interviewer
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px'
            }}>
              {avatarOptions.map(avatar => (
                <button
                  key={avatar.id}
                  onClick={() => setSettings(prev => ({ ...prev, avatarId: avatar.id }))}
                  style={{
                    padding: '16px',
                    border: settings.avatarId === avatar.id
                      ? '2px solid #007AFF'
                      : `2px solid ${isDark ? '#404040' : '#E5E7EB'}`,
                    borderRadius: '12px',
                    backgroundColor: settings.avatarId === avatar.id
                      ? isDark ? '#1a3a52' : '#E6F2FF'
                      : isDark ? '#333333' : '#F9FAFB',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: isDark ? '#404040' : '#E5E7EB',
                    margin: '0 auto 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '40px'
                  }}>
                    👤
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: isDark ? 'white' : '#1F2937',
                    marginBottom: '4px'
                  }}>
                    {avatar.name}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: isDark ? '#a0a0a0' : '#6B7280'
                  }}>
                    {avatar.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Environment Theme */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '16px',
              color: isDark ? 'white' : '#1F2937'
            }}>
              Interview Environment
            </h3>
            <select
              value={settings.environmentTheme}
              onChange={(e) => setSettings(prev => ({ ...prev, environmentTheme: e.target.value }))}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: `1px solid ${isDark ? '#404040' : '#E5E7EB'}`,
                backgroundColor: isDark ? '#333333' : 'white',
                color: isDark ? 'white' : '#1F2937',
                fontSize: '16px'
              }}
            >
              {environmentOptions.map(env => (
                <option key={env.id} value={env.id}>
                  {env.name} - {env.description}
                </option>
              ))}
            </select>
          </div>

          {/* Performance Settings */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '16px',
              color: isDark ? 'white' : '#1F2937'
            }}>
              Performance
            </h3>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '14px',
                fontWeight: '500',
                color: isDark ? '#e0e0e0' : '#374151'
              }}>
                Animation Quality
              </label>
              <select
                value={settings.animationQuality}
                onChange={(e) => setSettings(prev => ({ ...prev, animationQuality: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${isDark ? '#404040' : '#E5E7EB'}`,
                  backgroundColor: isDark ? '#333333' : 'white',
                  color: isDark ? 'white' : '#1F2937',
                  fontSize: '14px'
                }}
              >
                <option value="low">Low (Better performance)</option>
                <option value="medium">Medium (Balanced)</option>
                <option value="high">High (Best quality)</option>
              </select>
            </div>
          </div>

          {/* Advanced Settings */}
          <div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '16px',
              color: isDark ? 'white' : '#1F2937'
            }}>
              Advanced
            </h3>
            
            {/* Toggle settings */}
            {[
              { key: 'autoGestures', label: 'Automatic Gestures', description: 'AI generates natural hand movements' },
              { key: 'emotionalResponses', label: 'Emotional Responses', description: 'Avatar shows appropriate emotions' }
            ].map(setting => (
              <div key={setting.key} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px 0',
                borderBottom: `1px solid ${isDark ? '#404040' : '#E5E7EB'}`
              }}>
                <div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    color: isDark ? 'white' : '#1F2937',
                    marginBottom: '4px'
                  }}>
                    {setting.label}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: isDark ? '#a0a0a0' : '#6B7280'
                  }}>
                    {setting.description}
                  </div>
                </div>
                <button
                  onClick={() => setSettings(prev => ({ ...prev, [setting.key]: !prev[setting.key] }))}
                  style={{
                    width: '50px',
                    height: '28px',
                    borderRadius: '14px',
                    border: 'none',
                    backgroundColor: settings[setting.key] ? '#34C759' : isDark ? '#404040' : '#E5E7EB',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: '2px',
                    left: settings[setting.key] ? '24px' : '2px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    transition: 'left 0.2s ease'
                  }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '24px',
          borderTop: `1px solid ${isDark ? '#404040' : '#E5E7EB'}`,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: `1px solid ${isDark ? '#404040' : '#E5E7EB'}`,
              backgroundColor: 'transparent',
              color: isDark ? 'white' : '#1F2937',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={saveSettings}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: '#007AFF',
              color: 'white',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Save Settings
          </button>
        </div>
      </div>
    </>
  );
}
```

## Phase 6: Performance Optimization

### 6.1 Performance Monitor

**File: `dreamcollege-frontend/src/components/PerformanceMonitor.jsx`**

```javascript
import { useEffect, useRef } from 'react';
import Stats from 'stats.js';
import { useThree } from '@react-three/fiber';

export default function PerformanceMonitor({ show = false }) {
  const statsRef = useRef();
  const { gl } = useThree();

  useEffect(() => {
    if (!show) return;

    // Initialize Stats.js
    const stats = new Stats();
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb
    
    // Style the stats panel
    stats.dom.style.position = 'absolute';
    stats.dom.style.top = '10px';
    stats.dom.style.left = '10px';
    stats.dom.style.zIndex = '1000';
    
    document.body.appendChild(stats.dom);
    statsRef.current = stats;

    // Monitor performance
    const monitorPerformance = () => {
      // Log performance metrics periodically
      const info = gl.info;
      console.log('WebGL Performance:', {
        memory: info.memory,
        render: info.render,
        programs: info.programs?.length
      });
    };

    const interval = setInterval(monitorPerformance, 5000);

    return () => {
      document.body.removeChild(stats.dom);
      clearInterval(interval);
    };
  }, [show, gl]);

  // Update stats on each frame
  useThree(({ gl }) => {
    if (statsRef.current) {
      statsRef.current.update();
    }
  });

  return null;
}
```

### 6.2 Avatar LOD System

**File: `dreamcollege-frontend/src/utils/avatarLOD.js`**

```javascript
export class AvatarLODSystem {
  constructor() {
    this.qualityLevels = {
      high: {
        meshSimplification: 1.0,
        textureResolution: 2048,
        blendShapeCount: 52,
        boneCount: 'all',
        shadowsEnabled: true
      },
      medium: {
        meshSimplification: 0.7,
        textureResolution: 1024,
        blendShapeCount: 20,
        boneCount: 'essential',
        shadowsEnabled: true
      },
      low: {
        meshSimplification: 0.4,
        textureResolution: 512,
        blendShapeCount: 10,
        boneCount: 'minimal',
        shadowsEnabled: false
      }
    };
  }

  detectOptimalQuality() {
    // Check device capabilities
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!gl) return 'low';

    // Check max texture size
    const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    
    // Check available memory (approximation)
    const memory = performance.memory;
    const availableMemory = memory ? 
      (memory.jsHeapSizeLimit - memory.usedJSHeapSize) / 1048576 : // Convert to MB
      1000; // Default assumption

    // Determine quality based on capabilities
    if (maxTextureSize >= 4096 && availableMemory > 500) {
      return 'high';
    } else if (maxTextureSize >= 2048 && availableMemory > 200) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  applyQualitySettings(vrm, quality) {
    const settings = this.qualityLevels[quality];
    
    if (!vrm || !settings) return;

    // Apply mesh simplification
    if (settings.meshSimplification < 1.0) {
      this.simplifyMeshes(vrm, settings.meshSimplification);
    }

    // Reduce texture resolution
    this.optimizeTextures(vrm, settings.textureResolution);

    // Limit blend shapes
    this.limitBlendShapes(vrm, settings.blendShapeCount);

    // Optimize bones
    this.optimizeBones(vrm, settings.boneCount);
  }

  simplifyMeshes(vrm, factor) {
    vrm.scene.traverse((child) => {
      if (child.isMesh && child.geometry) {
        // Implement mesh simplification
        // This is a placeholder - real implementation would use
        // algorithms like quadric error metrics
        const geometry = child.geometry;
        
        if (factor < 0.7) {
          // For low quality, use simpler geometry
          child.material.wireframe = false;
          child.material.flatShading = true;
        }
      }
    });
  }

  optimizeTextures(vrm, maxResolution) {
    vrm.scene.traverse((child) => {
      if (child.isMesh && child.material) {
        const materials = Array.isArray(child.material) ? 
          child.material : [child.material];
        
        materials.forEach(material => {
          ['map', 'normalMap', 'roughnessMap', 'metalnessMap'].forEach(mapType => {
            if (material[mapType]) {
              const texture = material[mapType];
              
              if (texture.image && (texture.image.width > maxResolution || texture.image.height > maxResolution)) {
                // Downscale texture
                this.downscaleTexture(texture, maxResolution);
              }
            }
          });
        });
      }
    });
  }

  downscaleTexture(texture, maxSize) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const scale = maxSize / Math.max(texture.image.width, texture.image.height);
    canvas.width = texture.image.width * scale;
    canvas.height = texture.image.height * scale;
    
    ctx.drawImage(texture.image, 0, 0, canvas.width, canvas.height);
    
    texture.image = canvas;
    texture.needsUpdate = true;
  }

  limitBlendShapes(vrm, maxCount) {
    if (!vrm.blendShapeProxy) return;

    const allBlendShapes = vrm.blendShapeProxy.getBlendShapeTrackNames();
    
    if (allBlendShapes.length > maxCount) {
      // Prioritize essential blend shapes
      const essentialShapes = [
        'aa', 'ee', 'ih', 'oh', 'ou', // Visemes
        'happy', 'sad', 'angry', 'surprised', // Basic emotions
        'blink', 'blinkLeft', 'blinkRight' // Eye movement
      ];

      // Disable non-essential blend shapes
      allBlendShapes.forEach(shapeName => {
        if (!essentialShapes.includes(shapeName) && 
            essentialShapes.length >= maxCount) {
          vrm.blendShapeProxy.setValue(shapeName, 0);
        }
      });
    }
  }

  optimizeBones(vrm, boneLevel) {
    if (!vrm.humanoid || boneLevel === 'all') return;

    const essentialBones = [
      'head', 'neck', 'spine', 'chest',
      'leftUpperArm', 'rightUpperArm',
      'leftLowerArm', 'rightLowerArm',
      'leftHand', 'rightHand'
    ];

    const minimalBones = [
      'head', 'neck', 'spine',
      'leftUpperArm', 'rightUpperArm'
    ];

    const bonesToKeep = boneLevel === 'essential' ? essentialBones : minimalBones;

    // Disable animations on non-essential bones
    Object.keys(vrm.humanoid.humanBones).forEach(boneName => {
      if (!bonesToKeep.includes(boneName)) {
        const bone = vrm.humanoid.getBone(boneName);
        if (bone && bone.node) {
          // Lock the bone in rest position
          bone.node.rotation.set(0, 0, 0);
          bone.node.position.set(0, 0, 0);
        }
      }
    });
  }
}
```

## Phase 7: Testing & Polish

### 7.1 Avatar Test Suite

**File: `dreamcollege-frontend/src/tests/AvatarMode.test.js`**

```javascript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Canvas } from '@react-three/fiber';
import AvatarMode from '../components/AvatarMode';
import { ThemeProvider } from '../context/ThemeContext';

// Mock Three.js components
jest.mock('@react-three/fiber', () => ({
  ...jest.requireActual('@react-three/fiber'),
  Canvas: ({ children }) => <div data-testid="canvas">{children}</div>,
  useThree: () => ({
    scene: {},
    camera: {},
    gl: { info: { memory: {}, render: {} } }
  }),
  useFrame: jest.fn()
}));

jest.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
  Environment: () => null,
  ContactShadows: () => null
}));

describe('AvatarMode', () => {
  const mockUser = {
    id: 'test-user',
    token: 'test-token',
    name: 'Test User'
  };

  const defaultProps = {
    isActive: true,
    onToggle: jest.fn(),
    isSpeaking: false,
    currentText: '',
    emotionContext: null,
    user: mockUser
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders avatar mode when active', () => {
    render(
      <ThemeProvider>
        <AvatarMode {...defaultProps} />
      </ThemeProvider>
    );

    expect(screen.getByTestId('canvas')).toBeInTheDocument();
    expect(screen.getByText('Exit Avatar Mode')).toBeInTheDocument();
  });

  it('does not render when inactive', () => {
    render(
      <ThemeProvider>
        <AvatarMode {...defaultProps} isActive={false} />
      </ThemeProvider>
    );

    expect(screen.queryByTestId('canvas')).not.toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    render(
      <ThemeProvider>
        <AvatarMode {...defaultProps} />
      </ThemeProvider>
    );

    expect(screen.getByText('Loading Avatar...')).toBeInTheDocument();
  });

  it('calls onToggle when exit button is clicked', () => {
    render(
      <ThemeProvider>
        <AvatarMode {...defaultProps} />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByText('Exit Avatar Mode'));
    expect(defaultProps.onToggle).toHaveBeenCalledTimes(1);
  });

  it('loads user preferences on mount', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          preferences: {
            avatarId: 'professional-male-1',
            animationQuality: 'medium'
          }
        })
      })
    );

    render(
      <ThemeProvider>
        <AvatarMode {...defaultProps} />
      </ThemeProvider>
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/avatar/preferences',
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-token'
          }
        })
      );
    });
  });
});
```

### 7.2 Performance Testing

**File: `dreamcollege-frontend/src/tests/avatarPerformance.test.js`**

```javascript
import { AvatarLODSystem } from '../utils/avatarLOD';

describe('Avatar Performance Optimization', () => {
  let lodSystem;

  beforeEach(() => {
    lodSystem = new AvatarLODSystem();
  });

  describe('Quality Detection', () => {
    it('detects high quality for capable devices', () => {
      // Mock WebGL context with high capabilities
      const mockGL = {
        getParameter: jest.fn((param) => {
          if (param === 0x0D33) return 8192; // MAX_TEXTURE_SIZE
          return null;
        })
      };

      HTMLCanvasElement.prototype.getContext = jest.fn(() => mockGL);
      
      // Mock performance.memory
      Object.defineProperty(performance, 'memory', {
        value: {
          jsHeapSizeLimit: 2147483648, // 2GB
          usedJSHeapSize: 536870912, // 512MB
        },
        configurable: true
      });

      const quality = lodSystem.detectOptimalQuality();
      expect(quality).toBe('high');
    });

    it('detects low quality for limited devices', () => {
      const mockGL = {
        getParameter: jest.fn((param) => {
          if (param === 0x0D33) return 1024; // MAX_TEXTURE_SIZE
          return null;
        })
      };

      HTMLCanvasElement.prototype.getContext = jest.fn(() => mockGL);
      
      Object.defineProperty(performance, 'memory', {
        value: {
          jsHeapSizeLimit: 536870912, // 512MB
          usedJSHeapSize: 402653184, // 384MB
        },
        configurable: true
      });

      const quality = lodSystem.detectOptimalQuality();
      expect(quality).toBe('low');
    });
  });

  describe('Quality Settings', () => {
    it('applies correct settings for each quality level', () => {
      const qualities = ['high', 'medium', 'low'];
      
      qualities.forEach(quality => {
        const settings = lodSystem.qualityLevels[quality];
        expect(settings).toBeDefined();
        expect(settings.meshSimplification).toBeGreaterThan(0);
        expect(settings.meshSimplification).toBeLessThanOrEqual(1);
        expect(settings.textureResolution).toBeGreaterThan(0);
        expect(settings.blendShapeCount).toBeGreaterThan(0);
      });
    });
  });
});
```

### 7.3 Integration Testing

**File: `dreamcollege-frontend/src/tests/avatarIntegration.test.js`**

```javascript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import { ThemeProvider } from '../context/ThemeContext';
import { UploadProvider } from '../context/UploadContext';

// Mock modules
jest.mock('../services/api', () => ({
  ...jest.requireActual('../services/api'),
  submitInterviewTranscript: jest.fn(),
  generateAIRating: jest.fn()
}));

describe('Avatar Mode Integration', () => {
  beforeEach(() => {
    // Mock localStorage
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === 'token') return 'test-token';
      if (key === 'user') return JSON.stringify({ id: 'test-user', token: 'test-token' });
      return null;
    });
  });

  it('integrates avatar mode with voice mode', async () => {
    render(
      <ThemeProvider>
        <UploadProvider>
          <App />
        </UploadProvider>
      </ThemeProvider>
    );

    // Enable voice mode first
    const voiceToggle = screen.getByRole('button', { name: /voice mode/i });
    fireEvent.click(voiceToggle);

    // Enable avatar mode
    const avatarToggle = screen.getByRole('button', { name: /avatar mode/i });
    fireEvent.click(avatarToggle);

    // Verify avatar mode is active
    await waitFor(() => {
      expect(screen.getByText('Exit Avatar Mode')).toBeInTheDocument();
    });
  });

  it('synchronizes avatar with speech', async () => {
    render(
      <ThemeProvider>
        <UploadProvider>
          <App />
        </UploadProvider>
      </ThemeProvider>
    );

    // Enable avatar mode
    const avatarToggle = screen.getByRole('button', { name: /avatar mode/i });
    fireEvent.click(avatarToggle);

    // Simulate speech event
    const mockSpeechEvent = new CustomEvent('speaking', {
      detail: { text: 'Hello, welcome to your interview!' }
    });

    window.dispatchEvent(mockSpeechEvent);

    // Verify avatar responds to speech
    // In real implementation, this would check avatar animation state
    await waitFor(() => {
      expect(screen.getByTestId('canvas')).toBeInTheDocument();
    });
  });
});
```

## Technical Specifications

### Browser Requirements
- **Chrome 90+**: Full support
- **Firefox 88+**: Full support
- **Safari 14+**: Partial support (WebGL 2.0 limitations)
- **Edge 90+**: Full support

### Performance Requirements
- **Minimum FPS**: 30 fps on low-end devices
- **Target FPS**: 60 fps on modern devices
- **Load Time**: < 5 seconds for avatar initialization
- **Memory Usage**: < 500MB for full experience

### WebGL Requirements
- **WebGL Version**: 2.0 preferred, 1.0 fallback
- **Max Texture Size**: 2048x2048 minimum
- **Vertex Count**: < 50,000 for mobile, < 100,000 for desktop

## Timeline & Milestones

### Week 1-2: Foundation
- ✅ Install dependencies
- ✅ Create avatar service layer
- ✅ Set up backend endpoints
- ✅ Basic 3D scene rendering

### Week 3-4: Avatar System
- ✅ Avatar loading and rendering
- ✅ Basic animations
- ✅ UI controls
- ✅ Settings persistence

### Week 5-6: Animation Engine
- ✅ Lip sync implementation
- ✅ Gesture system
- ✅ Emotion controller
- ✅ Idle animations

### Week 7-8: Synchronization
- ✅ Audio synchronization
- ✅ Text-based triggers
- ✅ Real-time updates
- ✅ Performance monitoring

### Week 9: UI Polish
- ✅ Settings modal
- ✅ Environment design
- ✅ Camera controls
- ✅ Visual effects

### Week 10: Optimization
- ✅ LOD system
- ✅ Performance profiling
- ✅ Memory optimization
- ✅ Loading improvements

### Week 11-12: Testing & Launch
- ✅ Unit tests
- ✅ Integration tests
- ✅ Performance tests
- ✅ Bug fixes and polish
- ✅ Documentation
- ✅ Deployment

## Risk Mitigation

### Technical Risks

1. **WebGL Compatibility**
   - **Risk**: Older browsers may not support WebGL 2.0
   - **Mitigation**: Implement WebGL 1.0 fallback

2. **Performance on Mobile**
   - **Risk**: Complex 3D rendering may be slow
   - **Mitigation**: Aggressive LOD system and quality settings

3. **Avatar Loading Times**
   - **Risk**: Large 3D models slow to load
   - **Mitigation**: Progressive loading and caching

4. **Synchronization Accuracy**
   - **Risk**: Lip sync may not match speech perfectly
   - **Mitigation**: Multiple sync algorithms and manual tuning

### UX Risks

1. **Motion Sickness**
   - **Risk**: Camera movements may cause discomfort
   - **Mitigation**: Smooth, limited camera controls

2. **Uncanny Valley**
   - **Risk**: Avatar may seem creepy or unnatural
   - **Mitigation**: Stylized rather than photorealistic avatars

3. **Distraction from Interview**
   - **Risk**: Avatar may distract from interview practice
   - **Mitigation**: Option to minimize or hide avatar

## Conclusion

This comprehensive implementation plan provides a roadmap for adding a professional, engaging AI avatar interviewer mode to the Elocutionist platform. The phased approach ensures steady progress while maintaining system stability. With careful attention to performance optimization and user experience, this feature will significantly enhance the interview practice experience for users.

### Next Steps
1. Review and approve implementation plan
2. Set up development environment
3. Begin Phase 1 implementation
4. Establish testing protocols
5. Create user documentation

### Success Metrics
- User engagement increase of 40%+
- Session duration increase of 25%+
- User satisfaction rating of 4.5+/5
- Performance metrics meeting all targets
- Bug rate < 5 per 1000 sessions