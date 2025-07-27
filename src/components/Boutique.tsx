// Boutique component with drag-and-drop and Google profile header
import React from 'react';

export default function Boutique() {
  return (
    <div>
      <header style={{ background: '#fffaf3', padding: '1rem', borderBottom: '2px solid #d4af37' }}>
        <img src="https://lh3.googleusercontent.com/a/default-user" alt="Profile" style={{ width: 60, borderRadius: '50%' }} />
        <h1 style={{ color: '#d4af37' }}>Stephanie Helbig</h1>
      </header>
      <section>
        {/* Fragrance grid would go here */}
        <p>Drag-and-drop shelf loading...</p>
      </section>
    </div>
  );
}
