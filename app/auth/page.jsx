'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
    async function checkUser() {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.email) setUserEmail(data.user.email);
    }
    checkUser();
  }, []);

  async function handleLogin(e) {
    e.preventDefault();

    const redirectUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : undefined;

    console.log('Using redirect URL for magic link:', redirectUrl);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectUrl },
    });

    setMessage(error ? error.message : 'Check your email for the magic link to log in.');
  }

  return (
    <div className="max-w-md mx-auto p-6">
      {userEmail ? (
        <p className="mb-4 text-green-600">
          ✅ You are logged in as <strong>{userEmail}</strong>
        </p>
      ) : (
        <p className="mb-4 text-red-600">❌ You are not signed in</p>
      )}

      <h1 className="text-2xl font-bold mb-4">Sign In</h1>
      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 w-full"
          required
        />
        <button type="submit" className="bg-pink-500 text-white px-4 py-2 rounded">
          Send Magic Link
        </button>
      </form>
      {message && <p className="mt-4">{message}</p>}
    </div>
  );
}
