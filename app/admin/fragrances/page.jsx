'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function AdminFragranceList() {
  const [viewer, setViewer] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user || null;
      setViewer(user);

      if (!user) {
        setLoading(false);
        return;
      }

      // Check admin
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, is_admin, username')
        .eq('id', user.id)
        .maybeSingle();

      setIsAdmin(!!prof?.is_admin);
      setLoading(false);

      if (!prof?.is_admin) {
        setMsg('You must be an admin to edit fragrances.');
        return;
      }

      await load();
    })();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('fragrances')
      .select('id, brand, name, image_url, image_url_transparent')
      .order('brand', { ascending: true })
      .order('name', { ascending: true })
      .limit(5000);
    if (!error) setRows(data || []);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    if (!q) return rows;
    const s = q.toLowerCase();
    return rows.filter(r =>
      (r.brand || '').toLowerCase().includes(s) ||
      (r.name || '').toLowerCase().includes(s)
    );
  }, [rows, q]);

  if (loading) return <div className="p-6">Loading…</div>;

  if (!viewer || !isAdmin) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-3">
        <h1 className="text-2xl font-bold">Admin · Fragrances</h1>
        <p className="opacity-70">{msg || 'Please sign in as an admin.'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin · Fragrances</h1>
        <Link href="/admin" className="underline text-sm">← Back to Admin</Link>
      </div>

      <div className="flex gap-2 items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by brand or name…"
          className="border rounded px-3 py-2 w-full"
        />
        <button onClick={load} className="px-3 py-2 rounded bg-black text-white hover:opacity-90">
          Reload
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {filtered.map(f => (
          <div key={f.id} className="border rounded p-3 bg-white flex gap-3 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={f.image_url_transparent || f.image_url || '/bottle-placeholder.png'}
              alt={f.name}
              className="w-12 h-16 object-contain"
              onError={(e) => {
                const el = e.currentTarget;
                if (!el.dataset.fallback) {
                  el.dataset.fallback = '1';
                  el.src = '/bottle-placeholder.png';
                }
              }}
            />
            <div className="flex-1">
              <div className="text-sm opacity-80">{f.brand}</div>
              <div className="font-medium">{f.name}</div>
            </div>
            <Link
              href={`/fragrance/${f.id}/edit`}
              className="px-3 py-2 rounded bg-pink-700 text-white text-sm hover:opacity-90"
            >
              Edit
            </Link>
          </div>
        ))}
      </div>

      {!filtered.length && (
        <div className="p-4 border rounded bg-white">No matches.</div>
      )}
    </div>
  );
}
