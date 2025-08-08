/**
 * LevelSelector Component - Apple Design Language
 * 
 * Apple-styled difficulty level selector with:
 * - Segmented control design inspired by iOS
 * - SF Pro font family and Apple spacing
 * - Modern color palette and animations
 * - Accessible design with proper focus states
 */

import React, { useState, useEffect } from 'react';

export default function LevelSelector({ onChange }) {
  const levels = ['Expert', 'Advanced', 'Beginner'];
  const [selected, setSelected] = useState(1); // Default to Advanced (index 1)

  // Set default difficulty on component mount
  useEffect(() => {
    onChange?.('Advanced');
  }, [onChange]);

  const handleClick = idx => {
    setSelected(idx);
    onChange?.(levels[idx]);
  };

  return (
    <div style={{
      display: 'flex',
      backgroundColor: 'var(--level-button-background)',
      borderRadius: '12px',
      padding: '4px',
      border: '1px solid var(--border-primary)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif'
    }}>
      {levels.map((lvl, i) => (
        <button
          key={lvl}
          onClick={() => handleClick(i)}
          style={{
            flex: 1,
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: selected === i ? 'var(--background-primary)' : 'transparent',
            color: selected === i ? 'var(--level-button-active)' : 'var(--level-button-text)',
            fontSize: '15px',
            fontWeight: selected === i ? '600' : '400',
            letterSpacing: '-0.24px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: selected === i ? '0 1px 3px var(--shadow-light)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
          onMouseOver={(e) => {
            if (selected !== i) {
              e.currentTarget.style.backgroundColor = 'rgba(0,122,255,0.1)';
            }
          }}
          onMouseOut={(e) => {
            if (selected !== i) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          <div style={{
            width: '12px',
            height: '12px',
            backgroundColor: selected === i ? '#FF9500' : 'var(--level-button-border)',
            clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
            transition: 'background-color 0.2s ease'
          }}></div>
          {lvl}
        </button>
      ))}
    </div>
  );
}