
import React from 'react';

export default function Boutique() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'serif', background: '#fffaf3' }}>
      <header style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        borderBottom: '2px solid #d4af37',
        paddingBottom: '1rem'
      }}>
        <img
          src="https://lh3.googleusercontent.com/a/default-user"
          alt="Profile"
          style={{ width: '60px', height: '60px', borderRadius: '50%' }}
        />
        <h1 style={{ color: '#d4af37' }}>Stephanie Helbig's Boutique</h1>
      </header>
      <section style={{ marginTop: '2rem' }}>
        <p>Your elegant, draggable fragrance shelf will go here...</p>
      </section>
    </div>
  );
}
