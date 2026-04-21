'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const ADMIN_EMAILS = ['stephanieshelbig@gmail.com'];

export default function AdminPage() {
  const router = useRouter();

  const [username, setUsername] = useState('stephanie');
  const [msg, setMsg] = useState('');
  const [viewer, setViewer] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let redirectTimer;

    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user || null;

      setViewer(user);

      const email = user?.email?.toLowerCase() || '';
      const admin = ADMIN_EMAILS.includes(email);

      setIsAuthorized(admin);
      setAuthChecked(true);

      if (!admin) {
        redirectTimer = setTimeout(() => {
          router.push('/');
        }, 3000);
      }
    })();

    return () => {
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [router]);

  async function publishFromDb() {
    if (!isAuthorized) return;

    setMsg('Publishing (from DB)…');
    try {
      const res = await fetch('/api/publish-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, mode: 'from-db-private' })
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'publish failed');

      setMsg(`Published ${j.updated || 0} positions to public ✓`);
    } catch (e) {
      setMsg(`Error: ${e.message}`);
    }
  }

  async function publishFromLocal() {
    if (!isAuthorized) return;

    setMsg('Publishing (from browser backup)…');
    try {
      const key = `fragrantique_layout_by_brand_${username}`;
      const map = JSON.parse(localStorage.getItem(key) || '{}');

      const res = await fetch('/api/publish-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, mode: 'from-local', map })
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'publish failed');

      setMsg(`Published ${j.updated || 0} positions from local backup ✓`);
    } catch (e) {
      setMsg(`Error: ${e.message}`);
    }
  }

  if (!authChecked) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <p className="text-sm opacity-75">Checking authorization...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-3">Admin</h1>
        <div className="border rounded p-4 bg-white shadow text-sm">
          Unauthorized user. Redirecting...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-sm opacity-75 mt-1">
          Signed in as: {viewer?.email || 'not signed in'} · Username target:{' '}
          <span className="font-mono">{username}</span>
        </p>
      </div>

      <div className="space-y-3 border rounded p-4">
        <h2 className="font-semibold">Admin pages</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/admin/customer"
            className="px-4 py-3 rounded border bg-white hover:bg-gray-50 transition"
          >
            Customer
          </Link>

          <Link
            href="/admin/fragrances"
            className="px-4 py-3 rounded border bg-white hover:bg-gray-50 transition"
          >
            Fragrances
          </Link>

          <Link
            href="/admin/orders"
            className="px-4 py-3 rounded border bg-white hover:bg-gray-50 transition"
          >
            Orders
          </Link>

          <Link
            href="/admin/reviews"
            className="px-4 py-3 rounded border bg-white hover:bg-gray-50 transition"
          >
            Reviews
          </Link>
        </div>
      </div>

      <div className="space-y-3 border rounded p-4">
        <h2 className="font-semibold">Publish layout</h2>
        <p className="text-sm opacity-80">
          Copy your current arrangement to the public layout so logged-out visitors see it.
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={publishFromDb}
            className="px-3 py-2 rounded bg-black text-white hover:opacity-90"
          >
            Publish layout now (from DB)
          </button>

          <button
            onClick={publishFromLocal}
            className="px-3 py-2 rounded bg-pink-700 text-white hover:opacity-90"
          >
            Publish from browser backup
          </button>
        </div>
      </div>

      {msg && (
        <div className="p-3 rounded bg-white border shadow text-sm">
          {msg}
        </div>
      )}
    </div>
  );
}
