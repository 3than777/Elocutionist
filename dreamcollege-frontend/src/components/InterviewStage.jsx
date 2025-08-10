/**
 * InterviewStage Component
 * 
 * Creates a 3D environment for the avatar interview including
 * floor, background elements, and theme-based styling.
 */

import React from 'react';
import { Box, Plane } from '@react-three/drei';
import * as THREE from 'three';

export default function InterviewStage({ 
  theme = 'light'
}) {
  // Theme-based color schemes
  const colors = {
    light: {
      floor: '#f0f0f0',
      wall: '#ffffff',
      accent: '#e0e0e0',
      fog: '#f5f5f5'
    },
    dark: {
      floor: '#1a1a1a',
      wall: '#2a2a2a',
      accent: '#3a3a3a',
      fog: '#0a0a0a'
    }
  };

  const currentColors = colors[theme] || colors.light;

  return (
    <group>
      {/* Fog for depth */}
      <fog attach="fog" args={[currentColors.fog, 5, 20]} />

      {/* Floor */}
      <Plane
        args={[20, 20]}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <meshStandardMaterial 
          color={currentColors.floor}
          roughness={0.8}
          metalness={0.1}
        />
      </Plane>

      {/* Back wall */}
      <Plane
        args={[20, 10]}
        position={[0, 5, -8]}
        receiveShadow
      >
        <meshStandardMaterial 
          color={currentColors.wall}
          roughness={0.9}
          metalness={0}
        />
      </Plane>

      {/* Side decorative elements */}
      <Box
        args={[2, 4, 2]}
        position={[-6, 2, -6]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial 
          color={currentColors.accent}
          roughness={0.7}
          metalness={0.2}
        />
      </Box>

      <Box
        args={[1.5, 3, 1.5]}
        position={[6, 1.5, -5]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial 
          color={currentColors.accent}
          roughness={0.7}
          metalness={0.2}
        />
      </Box>

      {/* Desk/Table element */}
      <Box
        args={[3, 0.1, 1.5]}
        position={[0, 1.1, -1]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial 
          color={currentColors.accent}
          roughness={0.4}
          metalness={0.3}
        />
      </Box>

      {/* Desk legs */}
      {[[-1.3, 0.55, -0.5], [1.3, 0.55, -0.5], [-1.3, 0.55, -1.5], [1.3, 0.55, -1.5]].map((pos, i) => (
        <Box
          key={`leg-${i}`}
          args={[0.1, 1.1, 0.1]}
          position={pos}
          castShadow
        >
          <meshStandardMaterial 
            color={currentColors.accent}
            roughness={0.6}
            metalness={0.4}
          />
        </Box>
      ))}

      {/* Subtle wall decorations */}
      <Box
        args={[8, 0.5, 0.1]}
        position={[0, 3, -7.9]}
        receiveShadow
      >
        <meshStandardMaterial 
          color={theme === 'light' ? '#007AFF' : '#0051D5'}
          roughness={0.3}
          metalness={0.5}
        />
      </Box>

      {/* Floor grid pattern (subtle) */}
      <gridHelper 
        args={[20, 20, 
          theme === 'light' ? '#e0e0e0' : '#2a2a2a',
          theme === 'light' ? '#e8e8e8' : '#1f1f1f'
        ]} 
        position={[0, 0.01, 0]}
      />
    </group>
  );
}