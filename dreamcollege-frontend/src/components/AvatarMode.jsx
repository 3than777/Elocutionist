/**
 * AvatarMode Component
 * 
 * Main container for the 3D avatar interview system. Manages the 3D scene,
 * avatar loading, user preferences, and UI controls.
 */

import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import { useTheme } from '../context/ThemeContext';
import AvatarRenderer from './AvatarRenderer';
import AvatarControls from './AvatarControls';
import InterviewStage from './InterviewStage';

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

  useEffect(() => {
    const loadPrefs = async () => {
      if (isActive && user) {
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
      }
    };
    
    loadPrefs();
  }, [isActive, user]);


  const handleAvatarChange = async (avatarId) => {
    setAvatarLoaded(false);
    setSelectedAvatar(avatarId);
    
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
        <ambientLight intensity={isDark ? 0.3 : 0.5} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={isDark ? 0.5 : 0.8}
          castShadow
          shadow-mapSize={[2048, 2048]}
        />
        
        <Environment
          preset={isDark ? "night" : "studio"}
          background={false}
        />
        
        <InterviewStage theme={isDark ? 'dark' : 'light'} />
        
        <AvatarRenderer
          avatarId={selectedAvatar}
          isSpeaking={isSpeaking}
          currentText={currentText}
          emotionContext={emotionContext}
          animationQuality={animationQuality}
          onLoad={handleAvatarLoad}
        />
        
        <ContactShadows
          position={[0, 0, 0]}
          opacity={0.4}
          scale={10}
          blur={2}
          far={4}
        />
        
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

      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none'
      }}>
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

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}