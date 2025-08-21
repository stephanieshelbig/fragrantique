'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminPage() {
  const [username, setUsername] = useState('stephanie');
  const [msg, setMsg] = useState('');
  const [viewer, setViewer] = useState(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setViewer(data?.user || null);
    })();
  }, []);

  async function publishFromDb() {
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

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Admin</h1>
      <p className="text-sm opacity-75">
        Signed in as: {viewer?.email || 'not signed in'} · Username target: <span className="font-mono">{username}</span>
      </p>

      <div className="space-y-3 border rounded p-4">
        <h2 className="font-semibold">Publish layout</h2>
        <p className="text-sm opacity-80">Copy your current arrangement to the public layout (so logged-out visitors see it).</p>
        <div className="flex gap-2">
          <button onClick={publishFromDb} className="px-3 py-2 rounded bg-black text-white hover:opacity-90">
            Publish layout now (from DB)
          </button>
          <button onClick={publishFromLocal} className="px-3 py-2 rounded bg-pink-700 text-white hover:opacity-90">
            Publish from browser backup
          </button>
        </div>
      </div>

      {msg && <div className="p-3 rounded bg-white border shadow text-sm">{msg}</div>}
    </div>
  );
}
