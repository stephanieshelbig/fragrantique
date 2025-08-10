'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function parseHash() {
  const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
  const params = new URLSearchParams(hash);
  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
    error_description: params.get('error_description'),
  };
}

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    async function run() {
      const { access_token, refresh_token, error_description } = parseHash();

      if (error_description) {
        console.error('Auth error:', error_description);
        router.replace('/auth');
        return;
      }

      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (!error) {
          router.replace('/%40stephanie');
          return;
        }
      }

      const { data: sess } = await supabase.auth.getSession();
      if (sess.session) {
        router.replace('/%40stephanie');
        return;
      }

      const { data: sub } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN') router.replace('/%40stephanie');
      });

      setTimeout(() => router.replace('/auth'), 4000);

      return () => {
        sub.subscription.unsubscribe();
      };
    }

    run();
  }, [router]);

  return <div className="max-w-md mx-auto p-6">Signing you in…</div>;
}
