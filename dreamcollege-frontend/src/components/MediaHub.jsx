import React from 'react';
import { useTheme } from '../context/ThemeContext';

const MediaHub = () => {
  const { isDark } = useTheme();

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--background-primary)',
      color: 'var(--text-primary)',
      transition: 'all 0.3s ease',
      padding: '80px 20px 40px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: '700',
          marginBottom: '60px',
          letterSpacing: '-0.02em'
        }}>
          Media Hub
        </h1>

        <div style={{
          width: '100%',
          maxWidth: '800px',
          margin: '0 auto',
          aspectRatio: '16 / 9',
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'var(--background-secondary)',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid var(--border-primary)',
          padding: '40px'
        }}>
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            style={{ marginBottom: '24px' }}
          >
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"
              fill="var(--text-tertiary)"
            />
          </svg>
          
          <p style={{
            fontSize: '18px',
            color: 'var(--text-secondary)',
            fontWeight: '500'
          }}>
            Video Coming Soon
          </p>
        </div>
      </div>
    </div>
  );
};

export default MediaHub;