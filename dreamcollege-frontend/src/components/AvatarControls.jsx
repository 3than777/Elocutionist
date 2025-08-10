/**
 * AvatarControls Component
 * 
 * UI controls for avatar selection, quality settings, and camera positioning
 * in the 3D avatar interview system.
 */

import React, { useState, useEffect } from 'react';
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
  const [avatarOptions, setAvatarOptions] = useState([]);

  useEffect(() => {
    const avatarService = new AvatarService();
    const options = avatarService.getDefaultAvatarOptions();
    setAvatarOptions(options);
  }, []);

  const handleCameraPreset = (preset) => {
    switch (preset) {
      case 'front':
        onCameraChange([0, 1.6, 2.5]);
        break;
      case 'side':
        onCameraChange([2.5, 1.6, 0]);
        break;
      case 'dynamic':
        onCameraChange([1.5, 1.8, 2]);
        break;
      default:
        break;
    }
  };

  const handleCameraSliderChange = (axis, value) => {
    const newPosition = [...cameraPosition];
    const axisIndex = { x: 0, y: 1, z: 2 }[axis];
    newPosition[axisIndex] = parseFloat(value);
    onCameraChange(newPosition);
  };

  if (!show) {
    return (
      <button
        onClick={onToggle}
        aria-label="Toggle avatar controls"
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          width: '50px',
          height: '50px',
          borderRadius: '25px',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'auto',
          backdropFilter: 'blur(10px)'
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
        </svg>
      </button>
    );
  }

  return (
    <div 
      data-testid="avatar-controls-container"
      style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        width: '350px',
        maxHeight: '80vh',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '16px',
        padding: '20px',
        overflowY: 'auto',
        pointerEvents: 'auto',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(20px)'
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>
          Avatar Settings
        </h2>
        <button
          onClick={onToggle}
          aria-label="Toggle avatar controls"
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '15px',
            backgroundColor: 'transparent',
            border: '1px solid #ddd',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#666">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      {/* Avatar Selection */}
      <section style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '15px' }}>
          Choose Your Interviewer
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {avatarOptions.map(option => (
            <button
              key={option.id}
              data-testid={`avatar-option-${option.id}`}
              className={selectedAvatar === option.id ? 'selected' : ''}
              onClick={() => onAvatarChange(option.id)}
              aria-label={`Select ${option.name} avatar`}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px',
                borderRadius: '10px',
                border: selectedAvatar === option.id ? '2px solid #007AFF' : '1px solid #ddd',
                backgroundColor: selectedAvatar === option.id ? '#f0f8ff' : 'white',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <img 
                src={option.thumbnail} 
                alt={option.name}
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '25px',
                  objectFit: 'cover',
                  marginRight: '15px'
                }}
              />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>
                  {option.name}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {option.role}
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Quality Settings */}
      <section style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '15px' }}>
          Animation Quality
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { value: 'high', label: 'High', description: 'All features enabled' },
            { value: 'medium', label: 'Medium', description: 'Balanced performance' },
            { value: 'low', label: 'Low', description: 'Best for older devices' }
          ].map(quality => (
            <button
              key={quality.value}
              data-testid={`quality-option-${quality.value}`}
              className={animationQuality === quality.value ? 'selected' : ''}
              onClick={() => onQualityChange(quality.value)}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: animationQuality === quality.value ? '2px solid #007AFF' : '1px solid #ddd',
                backgroundColor: animationQuality === quality.value ? '#f0f8ff' : 'white',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{ fontWeight: '600', fontSize: '14px' }}>
                {quality.label}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {quality.description}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Camera Controls */}
      <section>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '15px' }}>
          Camera Position
        </h3>
        
        {/* Camera Presets */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button
            onClick={() => handleCameraPreset('front')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Front View
          </button>
          <button
            onClick={() => handleCameraPreset('side')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Side View
          </button>
          <button
            onClick={() => handleCameraPreset('dynamic')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid #ddd',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: '13px'
            }}
          >
            Dynamic
          </button>
        </div>

        {/* Manual Camera Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {['x', 'y', 'z'].map((axis, index) => (
            <div key={axis} style={{ display: 'flex', alignItems: 'center' }}>
              <label 
                htmlFor={`camera-${axis}`}
                style={{ 
                  width: '20px', 
                  fontWeight: '600', 
                  fontSize: '14px',
                  textTransform: 'uppercase'
                }}
              >
                {axis}
              </label>
              <input
                id={`camera-${axis}`}
                type="range"
                min="-5"
                max="5"
                step="0.1"
                value={cameraPosition[index]}
                onChange={(e) => handleCameraSliderChange(axis, e.target.value)}
                aria-label={`Camera ${axis.toUpperCase()}`}
                style={{
                  flex: 1,
                  marginLeft: '10px',
                  marginRight: '10px'
                }}
              />
              <span style={{ 
                width: '40px', 
                textAlign: 'right',
                fontSize: '13px',
                color: '#666'
              }}>
                {cameraPosition[index].toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}