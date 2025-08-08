import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

const HeaderDropdown = ({ label, items, onItemClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { isDark } = useTheme();

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

  return (
    <div className="header-dropdown" ref={dropdownRef} style={{ position: 'relative' }}>
      {/* Dropdown Button */}
      <button
        onClick={toggleDropdown}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-primary)',
          fontSize: '15px',
          fontWeight: '500',
          cursor: 'pointer',
          padding: '8px 12px',
          borderRadius: '6px',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          backgroundColor: isOpen ? 'var(--background-secondary)' : 'transparent'
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.target.style.backgroundColor = 'var(--background-secondary)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.target.style.backgroundColor = 'transparent';
          }
        }}
      >
        {label}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{
            opacity: 0.6,
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
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
            minWidth: '180px',
            backgroundColor: 'var(--background-primary)',
            border: '1px solid var(--border-primary)',
            borderRadius: '8px',
            boxShadow: isDark ? '0 8px 24px rgba(0, 0, 0, 0.4)' : '0 8px 24px rgba(0, 0, 0, 0.12)',
            zIndex: 1000,
            padding: '8px 0',
            fontSize: '14px'
          }}
        >
          {items.map((item, index) => (
            <button
              key={index}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '400',
                transition: 'background-color 0.2s ease',
                textAlign: 'left'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = 'var(--background-secondary)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
              }}
              onClick={() => {
                setIsOpen(false);
                // Handle item click - can be extended with callbacks
                console.log(`Clicked: ${item}`);
                if (onItemClick) {
                  onItemClick(item);
                }
              }}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default HeaderDropdown;