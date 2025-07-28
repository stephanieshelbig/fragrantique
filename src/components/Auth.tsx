
import React from 'react';

export default function Auth({ supabase }) {
  return (
    <div style={{ padding: '4rem', textAlign: 'center' }}>
      <h1 style={{ color: '#d4af37', fontFamily: 'serif' }}>Welcome to Fragrantique</h1>
      <button
        onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
        style={{
          backgroundColor: '#d4af37',
          color: '#fff',
          padding: '12px 24px',
          border: 'none',
          borderRadius: '5px',
          fontSize: '1rem',
          cursor: 'pointer'
        }}
      >
        Sign in with Google
      </button>
    </div>
  );
}
