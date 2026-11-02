import React from 'react';
import { isMockMode } from '../mocks/config';

/** Shown on every screen of the portfolio demo. */
export default function DemoBanner() {
  if (!isMockMode()) return null;
  return (
    <div
      role="note"
      style={{
        background: '#1e3a8a',
        color: '#ffffff',
        fontSize: '13px',
        lineHeight: 1.5,
        padding: '8px 16px',
        textAlign: 'center',
      }}
    >
      <strong>Demo with sample data.</strong> Try anything: changes stay in this browser tab and reset when you refresh.
    </div>
  );
}
