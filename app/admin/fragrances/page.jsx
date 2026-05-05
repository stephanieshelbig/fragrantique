'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function AdminFragranceList() {
  const [viewer, setViewer] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [owner, setOwner] = useState({ id: null, username: 'stephanie' });

  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [linkedIds, setLinkedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user || null;
      setViewer(user);

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('id, is_admin, username')
        .eq('id', user.id)
        .maybeSingle();

      setIsAdmin(!!prof?.is_admin);

      const { data: ownerProf } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', 'stephanie')
        .maybeSingle();

      if (ownerProf?.id) setOwner(ownerProf);

      await load(ownerProf?.id || null);
    })();
  }, []);

  async function load(ownerId) {
    setLoading(true);
    setMsg('');

    const { data: allFrags, error: allFragsError } = await supabase
      .from('fragrances')
      .select('id, brand, name, image_url, image_url_transparent, fragrantica_url, wikiparfum_url')
      .order('brand', { ascending: true })
      .order('name', { ascending: true })
      .limit(5000);

    if (allFragsError) {
      setMsg(`Load error: ${allFragsError.message}`);
      setRows([]);
      setLinkedIds(new Set());
      setLoading(false);
      return;
    }

    setRows(allFrags || []);

    if (ownerId) {
      const { data: links } = await supabase
        .from('user_fragrances')
        .select('fragrance_id')
        .eq('user_id', ownerId)
        .limit(10000);

      setLinkedIds(new Set((links || []).map((l) => l.fragrance_id)));
    } else {
      setLinkedIds(new Set());
    }

    setLoading(false);
  }

  const filtered = useMemo(() => {
    if (!q) return rows;
    const s = q.toLowerCase();
    return rows.filter(
      (r) =>
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
        <Link href="/admin" className="underline text-sm">
          ← Back to Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin · Fragrances</h1>
        <div className="flex items-center gap-3">
          <Link href="/admin" className="underline text-sm">
            ← Back to Admin
          </Link>
          <Link
            href="/add"
            className="px-3 py-2 rounded bg-pink-600 text-white hover:bg-pink-700 text-sm"
          >
            + Add Fragrance
          </Link>
        </div>
      </div>

      <p className="opacity-70 text-sm">
        Managing catalog for <span className="font-medium">@{owner.username}</span>.
      </p>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by brand or name…"
          className="border rounded px-3 py-2 w-full sm:w-80"
        />
      </div>

      {msg && <div className="p-3 rounded bg-white border text-sm">{msg}</div>}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((f) => {
          const img = f.image_url_transparent || f.image_url || '/bottle-placeholder.png';

          return (
            <div key={f.id} className="border rounded p-3 bg-white flex gap-3">
              <img
                src={img}
                alt={f.name}
                className="w-14 h-20 object-contain"
              />

              <div className="flex-1">
                <div className="text-xs opacity-70">{f.brand}</div>
                <div className="font-medium">{f.name}</div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <Link
                    href={`/fragrance/${f.id}/edit`}
                    className="px-2 py-1 rounded bg-gray-200 text-xs"
                  >
                    Edit
                  </Link>

                  {f.fragrantica_url && (
                    <a
                      href={f.fragrantica_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1 rounded bg-white border text-xs"
                    >
                      Fragrantica ↗
                    </a>
                  )}

                  {f.wikiparfum_url && (
                    <a
                      href={f.wikiparfum_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1 rounded bg-white border text-xs"
                    >
                      Wikiparfum ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!filtered.length && (
        <div className="p-4 border rounded bg-white">No matches.</div>
      )}
    </div>
  );
}
