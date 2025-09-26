import React from 'react';
import { useTheme } from '../context/ThemeContext';

function History() {
  const { isDark } = useTheme();

  return (
    <div style={{
      padding: '40px',
      backgroundColor: isDark ? '#000000' : 'var(--background-primary)',
      minHeight: 'calc(100vh - 48px)',
      color: 'var(--text-primary)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '600',
          marginBottom: '24px',
          color: 'var(--text-primary)'
        }}>
          History
        </h1>
        <div style={{
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'white',
          backdropFilter: isDark ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: isDark ? 'blur(20px)' : 'none',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: isDark ? '0 8px 32px 0 rgba(139, 92, 246, 0.05)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '2px solid #E5E7EB',
          textAlign: 'center',
          color: 'var(--text-secondary)'
        }}>
          <p style={{ fontSize: '16px' }}>
            Your interview history will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}

export default History;