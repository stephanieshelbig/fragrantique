'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('stephanieshelbig@gmail.com'); // prefill with your admin email
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // If already logged in, bounce straight to /admin
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        window.location.href = '/admin';
      }
    })();
  }, []);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://fragrantique.net'}`,
        },
      });
      if (error) {
        setStatus(`Login failed: ${error.message}`);
      } else {
        setStatus('Check your email for the magic link.');
      }
    } catch (err: any) {
      setStatus(err?.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#fdfcf9] px-4">
      <div className="w-full max-w-md bg-white border rounded-2xl shadow p-6">
        <h1 className="text-xl font-semibold text-center">Admin Login</h1>
        <p className="text-center text-sm text-gray-600 mt-1">
          Enter your admin email to receive a magic link.
        </p>

        <form onSubmit={sendMagicLink} className="mt-6 space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              className="w-full border rounded-lg px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@your-domain.com"
              required
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-black text-white rounded-xl py-2.5 font-medium hover:opacity-90 disabled:opacity-60"
          >
            {busy ? 'Sending…' : 'Send Magic Link'}
          </button>
        </form>

        {status && (
          <div className="mt-4 text-center text-sm">{status}</div>
        )}
      </div>
    </main>
  );
}
