import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeModeToggle() {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 0',
        width: '100%'
      }}>
        <button
          onClick={toggleTheme}
          title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          aria-label={`${isDark ? 'Dark' : 'Light'} mode enabled. Switch to ${isDark ? 'light' : 'dark'} mode`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: 'var(--toggle-inactive)',
            borderRadius: '20px',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            width: '140px',
            height: '40px'
          }}
        >
          <span style={{
            fontSize: '15px',
            fontWeight: !isDark ? '600' : '400',
            color: !isDark ? 'var(--toggle-active)' : 'var(--text-quaternary)',
            letterSpacing: '-0.24px',
            transition: 'all 0.2s ease'
          }}>
            Light
          </span>
        
        {/* Toggle Track */}
        <div style={{
          position: 'relative',
          width: '40px',
          height: '24px',
          backgroundColor: isDark ? 'var(--toggle-active)' : 'var(--toggle-track-inactive)',
          borderRadius: '12px',
          transition: 'background-color 0.3s ease',
          cursor: 'pointer'
        }}>
          {/* Toggle Thumb */}
          <div 
            style={{
              position: 'absolute',
              top: '2px',
              left: isDark ? '18px' : '2px',
              width: '20px',
              height: '20px',
              backgroundColor: '#ffffff',
              borderRadius: '10px',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px var(--shadow-light)',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 2px 6px var(--shadow-medium)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 1px 3px var(--shadow-light)';
            }}
          >
            {isDark ? (
              <div style={{ fontSize: '10px' }}>🌙</div>
            ) : (
              <div style={{ fontSize: '10px' }}>☀️</div>
            )}
          </div>
        </div>
        
          <span style={{
            fontSize: '15px',
            fontWeight: isDark ? '600' : '400',
            color: isDark ? 'var(--toggle-active)' : 'var(--text-quaternary)',
            letterSpacing: '-0.24px',
            transition: 'all 0.2s ease'
          }}>
            Dark
          </span>
        </button>
      </div>

      {/* Theme Status */}
      <div style={{
        padding: '12px 16px',
        backgroundColor: 'var(--success-background)',
        borderRadius: '12px',
        border: `1px solid var(--success-border)`
      }}>
        <div style={{
          fontSize: '13px',
          color: 'var(--success-text)',
          letterSpacing: '-0.08px'
        }}>
          {isDark ? '🌙' : '☀️'} {isDark ? 'Dark' : 'Light'} mode active
        </div>
      </div>
    </div>
  );
}