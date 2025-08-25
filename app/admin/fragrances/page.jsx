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
  const [linkedIds, setLinkedIds] = useState(new Set()); // fragrance_ids already on shelves
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      // who am I?
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user || null;
      setViewer(user);

      if (!user) {
        setLoading(false);
        return;
      }

      // am I admin?
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, is_admin, username')
        .eq('id', user.id)
        .maybeSingle();

      setIsAdmin(!!prof?.is_admin);

      // resolve boutique owner (you)
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

    // full catalog
    const { data: allFrags } = await supabase
      .from('fragrances')
      .select('id, brand, name, image_url, image_url_transparent, fragrantica_url')
      .order('brand', { ascending: true })
      .order('name', { ascending: true })
      .limit(5000);

    setRows(allFrags || []);

    // which are already on shelves for owner?
    if (ownerId) {
      const { data: links } = await supabase
        .from('user_fragrances')
        .select('fragrance_id')
        .eq('user_id', ownerId)
        .limit(10000);

      setLinkedIds(new Set((links || []).map(l => l.fragrance_id)));
    } else {
      setLinkedIds(new Set());
    }

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
        <Link href="/admin" className="underline text-sm">← Back to Admin</Link>
      </div>
    );
  }

  async function addOneToShelves(fragranceId) { /* unchanged */ }
  async function removeOneFromShelves(fragranceId) { /* unchanged */ }
  async function addAllMissingToShelves() { /* unchanged */ }
  async function makeTransparent(fragrance) { /* unchanged */ }
  async function makeAllMissingTransparent() { /* unchanged */ }
  async function deleteFragrance(fragrance) { /* unchanged */ }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin · Fragrances</h1>
        <div className="flex gap-3 items-center">
          <Link href="/admin" className="underline text-sm">← Back to Admin</Link>
          {/* NEW Add Fragrance button */}
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

      {/* Search + bulk actions (kept unchanged) */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by brand or name…"
          className="border rounded px-3 py-2 w-full sm:w-80"
        />
        <button
          onClick={() => load(owner.id)}
          className="px-3 py-2 rounded bg-black text-white hover:opacity-90"
        >
          Reload
        </button>

        <div className="flex-1" />

        <button
          disabled={busy}
          onClick={addAllMissingToShelves}
          className="px-3 py-2 rounded bg-blue-600 text-white hover:opacity-90 disabled:opacity-60"
          title="Link every fragrance not yet on your shelves"
        >
          Add all missing to shelves
        </button>
        <button
          disabled={busy}
          onClick={makeAllMissingTransparent}
          className="px-3 py-2 rounded bg-pink-700 text-white hover:opacity-90 disabled:opacity-60"
          title="Run background removal for all without transparent images"
        >
          Make transparent (missing only)
        </button>
      </div>

      {msg && <div className="p-3 rounded bg-white border shadow text-sm">{msg}</div>}

      {/* Cards list stays unchanged */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(f => {
          const onShelves = linkedIds.has(f.id);
          const img = f.image_url_transparent || f.image_url || '/bottle-placeholder.png';
          return (
            <div key={f.id} className="border rounded p-3 bg-white flex gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img}
                alt={f.name}
                className="w-14 h-20 object-contain"
                style={{ mixBlendMode: 'multiply' }}
                onError={(e) => {
                  const el = e.currentTarget;
                  if (!el.dataset.fallback) {
                    el.dataset.fallback = '1';
                    el.src = '/bottle-placeholder.png';
                  }
                }}
              />
              <div className="flex-1">
                <div className="text-xs opacity-70">{f.brand}</div>
                <div className="font-medium">{f.name}</div>

                <div className="mt-2 flex flex-wrap gap-2">
                  <Link
                    href={`/fragrance/${f.id}/edit`}
                    className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-xs"
                  >
                    Edit
                  </Link>

                  {!onShelves ? (
                    <button
                      disabled={busy}
                      onClick={() => addOneToShelves(f.id)}
                      className="px-2 py-1 rounded bg-black text-white text-xs hover:opacity-90 disabled:opacity-60"
                      title="Add this to your shelves"
                    >
                      Add to shelves
                    </button>
                  ) : (
                    <button
                      disabled={busy}
                      onClick={() => removeOneFromShelves(f.id)}
                      className="px-2 py-1 rounded bg-amber-600 text-white text-xs hover:opacity-90 disabled:opacity-60"
                      title="Remove this from your shelves"
                    >
                      Remove from shelves
                    </button>
                  )}

                  <button
                    disabled={busy || !f.image_url}
                    onClick={() => makeTransparent(f)}
                    className="px-2 py-1 rounded bg-pink-700 text-white text-xs hover:opacity-90 disabled:opacity-60"
                    title="Create transparent PNG and save to Storage"
                  >
                    Transparent
                  </button>

                  <button
                    disabled={busy}
                    onClick={() => deleteFragrance(f)}
                    className="px-2 py-1 rounded bg-red-600 text-white text-xs hover:opacity-90 disabled:opacity-60"
                    title="Delete this fragrance from the catalog (admin only)"
                  >
                    Delete fragrance
                  </button>

                  {f.fragrantica_url && (
                    <a
                      href={f.fragrantica_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1 rounded bg-white border text-xs hover:bg-gray-50"
                    >
                      Fragrantica ↗
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
