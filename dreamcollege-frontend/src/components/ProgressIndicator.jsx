/**
 * Progress Indicator Component - Step 14 Implementation
 * 
 * Displays progress during AI rating generation with multiple states:
 * - "Analyzing your responses..." (with spinner)
 * - "Generating feedback..." (with progress bar)
 * - "Rating complete!" (with success checkmark)
 * 
 * Features:
 * ✅ Multiple visual states with smooth transitions
 * ✅ Animated progress indicators (spinner, progress bar, checkmark)
 * ✅ Contextual messages for each phase
 * ✅ Professional styling with hover effects
 * ✅ Can be shown in chat area or as overlay
 */

import React, { useState, useEffect } from 'react';

const ProgressIndicator = ({ 
  isVisible = false,
  currentStep = 1,
  totalSteps = 3,
  customMessage = null,
  onComplete = null,
  style = {},
  showOverlay = true
}) => {
  const [progress, setProgress] = useState(0);
  const [animationStep, setAnimationStep] = useState(0);

  // Progress messages for each step
  const stepMessages = [
    {
      icon: '🔍',
      title: 'Analyzing your responses...',
      subtitle: 'Processing interview transcript',
      color: '#007bff'
    },
    {
      icon: '🤖',
      title: 'Generating feedback...',
      subtitle: 'AI is creating personalized insights',
      color: '#28a745'
    },
    {
      icon: '✅',
      title: 'Rating complete!',
      subtitle: 'Your feedback is ready',
      color: '#6f42c1'
    }
  ];

  const currentStepData = stepMessages[Math.min(currentStep - 1, stepMessages.length - 1)];

  // Auto-advance progress bar
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        const targetProgress = (currentStep / totalSteps) * 100;
        const newProgress = Math.min(prev + 2, targetProgress);
        
        if (newProgress >= 100 && onComplete) {
          setTimeout(onComplete, 1000);
        }
        
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isVisible, currentStep, totalSteps, onComplete]);

  // Animation step for visual effects
  useEffect(() => {
    if (!isVisible) return;

    const animInterval = setInterval(() => {
      setAnimationStep(prev => (prev + 1) % 8);
    }, 200);

    return () => clearInterval(animInterval);
  }, [isVisible]);

  if (!isVisible) return null;

  const containerStyle = {
    position: showOverlay ? 'fixed' : 'relative',
    top: showOverlay ? '50%' : 'auto',
    left: showOverlay ? '50%' : 'auto',
    transform: showOverlay ? 'translate(-50%, -50%)' : 'none',
    zIndex: showOverlay ? 1000 : 'auto',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: showOverlay ? '0 10px 40px rgba(0,0,0,0.15)' : '0 4px 20px rgba(0,0,0,0.1)',
    border: '1px solid #e9ecef',
    minWidth: '320px',
    maxWidth: '400px',
    textAlign: 'center',
    ...style
  };

  const overlayStyle = showOverlay ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 999,
    backdropFilter: 'blur(2px)'
  } : null;

  return (
    <>
      {overlayStyle && <div style={overlayStyle}></div>}
      <div style={containerStyle}>
        {/* Step Icon with Animation */}
        <div style={{
          fontSize: '48px',
          marginBottom: '20px',
          transform: currentStep === 3 ? 'scale(1.2)' : 'scale(1)',
          transition: 'transform 0.5s ease',
          filter: currentStep === 3 ? 'drop-shadow(0 0 10px rgba(111, 66, 193, 0.3))' : 'none'
        }}>
          {currentStep === 1 && (
            <div style={{
              display: 'inline-block',
              animation: 'bounce 1.5s infinite'
            }}>
              {currentStepData.icon}
            </div>
          )}
          {currentStep === 2 && (
            <div style={{
              display: 'inline-block',
              animation: 'pulse 1s infinite'
            }}>
              {currentStepData.icon}
            </div>
          )}
          {currentStep === 3 && (
            <div style={{
              display: 'inline-block',
              animation: 'checkmarkPop 0.6s ease'
            }}>
              {currentStepData.icon}
            </div>
          )}
        </div>

        {/* Step Title */}
        <div style={{
          fontSize: '20px',
          fontWeight: '600',
          color: currentStepData.color,
          marginBottom: '8px',
          transition: 'color 0.3s ease'
        }}>
          {customMessage || currentStepData.title}
        </div>

        {/* Step Subtitle */}
        <div style={{
          fontSize: '14px',
          color: '#6c757d',
          marginBottom: '25px',
          lineHeight: '1.4'
        }}>
          {currentStepData.subtitle}
        </div>

        {/* Progress Bar */}
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#e9ecef',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '15px',
          position: 'relative'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${currentStepData.color}, ${currentStepData.color}dd)`,
            borderRadius: '4px',
            transition: 'width 0.3s ease',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Animated shimmer effect */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
              animation: 'shimmer 1.5s infinite'
            }}></div>
          </div>
        </div>

        {/* Progress Text */}
        <div style={{
          fontSize: '12px',
          color: '#6c757d',
          marginBottom: '20px'
        }}>
          Step {currentStep} of {totalSteps} • {Math.round(progress)}% complete
        </div>

        {/* Loading Animation */}
        {currentStep < 3 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '4px',
            marginTop: '10px'
          }}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: currentStepData.color,
                  borderRadius: '50%',
                  opacity: (animationStep + i) % 3 === 0 ? 1 : 0.3,
                  transition: 'opacity 0.2s ease'
                }}
              ></div>
            ))}
          </div>
        )}

        {/* Success Message */}
        {currentStep === 3 && (
          <div style={{
            marginTop: '15px',
            padding: '12px',
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '6px',
            color: '#155724',
            fontSize: '14px',
            fontWeight: '500'
          }}>
            🎉 Check the AI Rating section for your detailed feedback!
          </div>
        )}

        <style jsx>{`
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
          }
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.8; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes checkmarkPop {
            0% { transform: scale(0) rotate(-180deg); opacity: 0; }
            50% { transform: scale(1.3) rotate(-90deg); opacity: 0.8; }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    </>
  );
};

export default ProgressIndicator; 