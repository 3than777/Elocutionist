import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

const ProfileDropdown = ({ user, onSignOut }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { toggleTheme, isDark } = useTheme();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleSignOut = () => {
    setIsOpen(false);
    onSignOut();
  };

  // Generate avatar with user's initials
  const getInitials = (name) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Consistent avatar color
  const avatarColor = '#6366f1'; // Using a consistent blue color

  return (
    <div className="profile-dropdown" style={{ display: 'flex', alignItems: 'center', gap: '32px' }} ref={dropdownRef}>
      {/* Theme Toggle Switch */}
      <button
        onClick={toggleTheme}
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        aria-label={`${isDark ? 'Dark' : 'Light'} mode enabled. Switch to ${isDark ? 'light' : 'dark'} mode`}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          padding: '0',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
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
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M4.5 0.2a.6.6 0 0 1 .06.65 5.4 5.4 0 0 0-.66 2.6c0 3.02 2.46 5.46 5.49 5.46.4 0 .78-.04 1.15-.12a.59.59 0 0 1 .61.24.55.55 0 0 1-.02.67A6.26 6.26 0 0 1 6.26 12C2.8 12 0 9.21 0 5.78 0 3.2 1.59.98 3.84.04A.56.56 0 0 1 4.5.2z"
                  fill="#6366f1"
                />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="3" fill="#FFC107"/>
                <path
                  d="M6 1.5v1M6 9.5v1M10.5 6h-1M2.5 6h-1M9.54 2.46l-.71.71M3.17 8.83l-.71.71M9.54 9.54l-.71-.71M3.17 3.17l-.71-.71"
                  stroke="#FFC107"
                  strokeWidth="0.8"
                  strokeLinecap="round"
                />
              </svg>
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

      {/* Profile Button */}
      <div style={{ position: 'relative' }}>
        <button
        className="profile-button"
        onClick={toggleDropdown}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '6px 16px',
          backgroundColor: 'transparent',
          border: '1px solid var(--border-secondary)',
          borderRadius: '24px',
          cursor: 'pointer',
          fontSize: '14px',
          color: 'var(--text-primary)',
          transition: 'all 0.2s ease',
          height: '40px',
          minWidth: '140px'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = 'var(--background-secondary)';
          e.target.style.borderColor = 'var(--border-primary)';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'transparent';
          e.target.style.borderColor = 'var(--border-secondary)';
        }}
      >
        {/* Avatar */}
        <div
          className="profile-avatar"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: '#6366f1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: '600'
          }}
        >
          {getInitials(user?.name || 'User')}
        </div>
        
        {/* User Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontWeight: '500' }}>{user?.name || 'User'}</span>
        </div>

        {/* Dropdown Arrow */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="dropdown-menu"
          style={{
            position: 'absolute',
            top: '44px',
            right: '0',
            minWidth: '320px',
            backgroundColor: 'var(--background-primary)',
            border: '1px solid var(--border-primary)',
            borderRadius: '12px',
            boxShadow: isDark ? '0 8px 24px rgba(0, 0, 0, 0.4)' : '0 8px 24px rgba(0, 0, 0, 0.12)',
            zIndex: 1000,
            padding: '12px 0',
            fontSize: '15px'
          }}
        >
          {/* User Info Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-secondary)',
              marginBottom: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                className="profile-avatar-large"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#6366f1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  fontSize: '18px',
                  fontWeight: '600'
                }}
              >
                {getInitials(user?.name || 'User')}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '16px' }}>
                    {user?.name || 'User'}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {user?.email || 'user@email.com'}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div>
            <button
              className="dropdown-item"
              style={{
                width: '100%',
                padding: '14px 20px',
                backgroundColor: 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '15px',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'var(--background-secondary)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 1a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM4 4a4 4 0 1 1 8 0 4 4 0 0 1-8 0ZM2.5 14a5.5 5.5 0 1 1 11 0 .5.5 0 0 1-1 0 4.5 4.5 0 0 0-9 0 .5.5 0 0 1-1 0Z"
                  fill="currentColor"
                />
              </svg>
              My Profile
            </button>

            <button
              className="dropdown-item"
              style={{
                width: '100%',
                padding: '14px 20px',
                backgroundColor: 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '15px',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'var(--background-secondary)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"
                  fill="currentColor"
                />
                <path
                  d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.292-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.292c.415.764-.42 1.6-1.185 1.184l-.292-.159a1.873 1.873 0 0 0-2.692 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.693-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.292A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"
                  fill="currentColor"
                />
              </svg>
              Settings
            </button>


            <button
              className="dropdown-item"
              style={{
                width: '100%',
                padding: '14px 20px',
                backgroundColor: 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '15px',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'var(--background-secondary)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8.5 1.5L10 5h4.5L11 8.5l1.5 4.5L8 10.5 3.5 13 5 8.5 1.5 5H6L8.5 1.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                />
              </svg>
              Upgrade Plan
            </button>

            <div style={{ height: '1px', backgroundColor: 'var(--border-secondary)', margin: '12px 0' }} />

            <button
              className="dropdown-item"
              onClick={handleSignOut}
              style={{
                width: '100%',
                padding: '14px 20px',
                backgroundColor: 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '15px',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'var(--background-secondary)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-1a.5.5 0 0 1 1 0v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1a.5.5 0 0 1-1 0V2a1 1 0 0 0-1-1H6Z"
                  fill="currentColor"
                />
                <path
                  d="M11.146 7.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1 0 .708l-2 2a.5.5 0 0 1-.708-.708L12.293 8.5H5.5a.5.5 0 0 1 0-1h6.793l-1.147-1.146a.5.5 0 0 1 0-.708Z"
                  fill="currentColor"
                />
              </svg>
              Sign Out
            </button>
          </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileDropdown;