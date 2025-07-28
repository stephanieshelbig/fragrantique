
import React from 'react';

export default function Boutique({ session }) {
  const user = session.user;
  return (
    <div style={{ background: '#fffaf3', minHeight: '100vh', padding: '2rem' }}>
      <header style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        borderBottom: '2px solid #d4af37',
        paddingBottom: '1rem'
      }}>
        <img src={user.user_metadata.avatar_url} alt="Avatar" style={{ width: '60px', borderRadius: '50%' }} />
        <h1 style={{ color: '#d4af37' }}>{user.user_metadata.full_name}'s Boutique</h1>
      </header>
      <section style={{ marginTop: '2rem' }}>
        <p>This will be your drag-and-drop fragrance shelf.</p>
      </section>
    </div>
  );
}
