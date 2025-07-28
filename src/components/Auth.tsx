
import React from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Auth() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Welcome to Fragrantique</h1>
      <button
        onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
        style={{
          background: '#d4af37',
          color: '#fff',
          padding: '10px 20px',
          borderRadius: '5px',
          border: 'none',
          fontWeight: 'bold',
          fontSize: '16px'
        }}
      >
        Sign in with Google
      </button>
    </div>
  );
}
