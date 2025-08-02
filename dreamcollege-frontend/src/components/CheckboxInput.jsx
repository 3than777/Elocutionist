import React, { useState } from 'react';

export default function CheckboxInput({ label, defaultChecked = false }) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <label style={{ display: 'block', marginTop: 12 }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => setChecked(e.target.checked)}
      /> {label}
    </label>
  );
}