
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Auth from './components/Auth';
import Boutique from './components/Boutique';

const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  return session ? <Boutique session={session} /> : <Auth supabase={supabase} />;
}

export default App;
