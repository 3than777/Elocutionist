/**
 * CheckboxInput Component - Apple Design Language
 * 
 * Apple-styled checkbox input with modern visual design:
 * - SF Pro font family
 * - Apple's color palette and spacing
 * - Rounded corners and smooth animations
 * - Accessible design with proper focus states
 */

import React, { useState } from 'react';

export default function CheckboxInput({ label, defaultChecked = false }) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <label style={{ 
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginTop: '16px',
      cursor: 'pointer',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
      fontSize: '15px',
      fontWeight: '400',
      color: 'var(--checkbox-text)',
      letterSpacing: '-0.24px',
      lineHeight: '1.47',
      transition: 'color 0.2s ease'
    }}>
      <div style={{
        position: 'relative',
        width: '20px',
        height: '20px',
        borderRadius: '6px',
        border: checked ? 'none' : '2px solid var(--border-primary)',
        backgroundColor: checked ? 'var(--accent-blue)' : 'transparent',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={e => setChecked(e.target.checked)}
          style={{
            position: 'absolute',
            opacity: 0,
            width: '100%',
            height: '100%',
            margin: 0,
            cursor: 'pointer'
          }}
        />
        {checked && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M10 3L4.5 8.5L2 6"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      {label}
    </label>
  );
}