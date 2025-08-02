import React, { useState, useEffect } from 'react';

/**
 * Renders three labels (Expert, Advanced, Beginner),
 * each with a single ★ that you can click to select that level.
 */
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
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
      {levels.map((lvl, i) => (
        <label key={lvl} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <span
            onClick={() => handleClick(i)}
            style={{
              fontSize: '1.25rem',
              marginRight: '4px',
              color: selected === i ? '#f5c000' : '#ccc'
            }}
          >
            ★
          </span>
          {lvl}
        </label>
      ))}
    </div>
  );
}