'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthHashHandler() {
  useEffect(() => {
    const run = async () => {
      if (typeof window === 'undefined') return;

      const url = new URL(window.location.href);

      // --- PKCE style (code in querystring) ---
      const code = url.searchParams.get('code');
      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) console.error('exchangeCodeForSession error:', error.message);
        } catch (e) {
          console.error('exchangeCodeForSession threw:', (e as Error).message);
        } finally {
          // remove ?code=... from the URL
          url.searchParams.delete('code');
          window.history.replaceState({}, '', url.pathname + (url.search ? '?' + url.searchParams.toString() : ''));
        }
        return;
      }

      // --- Hash token style (access_token in hash) ---
      if (url.hash && url.hash.includes('access_token=')) {
        const params = new URLSearchParams(url.hash.slice(1));
        const access_token = params.get('access_token') || '';
        const refresh_token = params.get('refresh_token') || '';

        if (access_token && refresh_token) {
          try {
            const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) console.error('setSession error:', error.message);
          } catch (e) {
            console.error('setSession threw:', (e as Error).message);
          } finally {
            // strip the hash from the URL
            window.history.replaceState({}, '', url.pathname + url.search);
          }
        }
      }
    };

    run();
  }, []);

  return null;
}
