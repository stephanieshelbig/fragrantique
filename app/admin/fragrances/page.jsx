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

  async function addOneToShelves(fragranceId) {
    if (!owner.id) return;
    setBusy(true);
    setMsg('Adding to shelves…');

    await supabase
      .from('user_fragrances')
      .insert({ user_id: owner.id, fragrance_id: fragranceId, manual: true });

    await load(owner.id);
    setBusy(false);
    setMsg('Added to shelves ✓');
  }

  async function removeOneFromShelves(fragranceId) {
    if (!owner.id) return;
    setBusy(true);
    setMsg('Removing from shelves…');

    await supabase
      .from('user_fragrances')
      .delete()
      .eq('user_id', owner.id)
      .eq('fragrance_id', fragranceId);

    await load(owner.id);
    setBusy(false);
    setMsg('Removed from shelves ✓');
  }

  async function addAllMissingToShelves() {
    if (!owner.id) return;
    setBusy(true);
    setMsg('Adding ALL missing to shelves…');

    const missing = rows.filter(r => !linkedIds.has(r.id)).map(r => r.id);
    if (!missing.length) {
      setMsg('Everything is already on your shelves.');
      setBusy(false);
      return;
    }

    const chunk = 200;
    let inserted = 0;
    for (let i = 0; i < missing.length; i += chunk) {
      const batch = missing.slice(i, i + chunk).map(fid => ({
        user_id: owner.id, fragrance_id: fid, manual: true
      }));
      await supabase.from('user_fragrances').insert(batch);
      inserted += batch.length;
    }

    await load(owner.id);
    setBusy(false);
    setMsg(`Added ${inserted} items to shelves ✓`);
  }

  async function makeTransparent(fragrance) {
    setBusy(true);
    setMsg('Removing background…');

    try {
      const res = await fetch('/api/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: fragrance.image_url,
          fragranceId: fragrance.id
        })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.success) {
        throw new Error(j?.error || `remove-bg failed`);
      }
      setMsg('Transparent image saved ✓');
    } catch (e) {
      setMsg(`Background remover error: ${e.message}`);
    } finally {
      setBusy(false);
      await load(owner.id);
    }
  }

  async function makeAllMissingTransparent() {
    setBusy(true);
    setMsg('Making transparent for all missing…');

    const targets = rows.filter(r => !r.image_url_transparent && r.image_url);
    let ok = 0, fail = 0;

    for (const f of targets) {
      try {
        const res = await fetch('/api/remove-bg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: f.image_url, fragranceId: f.id })
        });
        const j = await res.json().catch(() => ({}));
        if (res.ok && j?.success) ok++; else fail++;
      } catch {
        fail++;
      }
    }

    setMsg(`Transparent done: ${ok} ok, ${fail} failed`);
    setBusy(false);
    await load(owner.id);
  }

  async function deleteFragrance(fragrance) {
    if (!isAdmin) return;
    const ok = window.confirm(
      `Delete "${fragrance.brand} — ${fragrance.name}" from the catalog?\n` +
      `This will also remove it from your shelves.\n\nThis cannot be undone.`
    );
    if (!ok) return;

    setBusy(true);
    setMsg('Deleting fragrance…');

    try {
      const res = await fetch('/api/admin-delete-fragrance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fragranceId: fragrance.id,
          deleteFromShelves: true,
          deleteStorage: true
        })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        throw new Error(j?.error || 'delete failed');
      }
      setMsg('Fragrance deleted ✓');
      await load(owner.id);
    } catch (e) {
      setMsg(`Delete error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin · Fragrances</h1>
        <Link href="/admin" className="underline text-sm">← Back to Admin</Link>
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
        <button
          onClick={() => load(owner.id)}
          className="px-3 py-2 rounded bg-black text-white hover:opacity-90"
        >
          Reload
        </button>

        <div className="flex-1" />

        {/* Bulk actions */}
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
}'use client';

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

  async function addOneToShelves(fragranceId) {
    if (!owner.id) return;
    setBusy(true);
    setMsg('Adding to shelves…');

    await supabase
      .from('user_fragrances')
      .insert({ user_id: owner.id, fragrance_id: fragranceId, manual: true });

    await load(owner.id);
    setBusy(false);
    setMsg('Added to shelves ✓');
  }

  async function removeOneFromShelves(fragranceId) {
    if (!owner.id) return;
    setBusy(true);
    setMsg('Removing from shelves…');

    await supabase
      .from('user_fragrances')
      .delete()
      .eq('user_id', owner.id)
      .eq('fragrance_id', fragranceId);

    await load(owner.id);
    setBusy(false);
    setMsg('Removed from shelves ✓');
  }

  async function addAllMissingToShelves() {
    if (!owner.id) return;
    setBusy(true);
    setMsg('Adding ALL missing to shelves…');

    const missing = rows.filter(r => !linkedIds.has(r.id)).map(r => r.id);
    if (!missing.length) {
      setMsg('Everything is already on your shelves.');
      setBusy(false);
      return;
    }

    const chunk = 200;
    let inserted = 0;
    for (let i = 0; i < missing.length; i += chunk) {
      const batch = missing.slice(i, i + chunk).map(fid => ({
        user_id: owner.id, fragrance_id: fid, manual: true
      }));
      await supabase.from('user_fragrances').insert(batch);
      inserted += batch.length;
    }

    await load(owner.id);
    setBusy(false);
    setMsg(`Added ${inserted} items to shelves ✓`);
  }

  async function makeTransparent(fragrance) {
    setBusy(true);
    setMsg('Removing background…');

    try {
      const res = await fetch('/api/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: fragrance.image_url,
          fragranceId: fragrance.id
        })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.success) {
        throw new Error(j?.error || `remove-bg failed`);
      }
      setMsg('Transparent image saved ✓');
    } catch (e) {
      setMsg(`Background remover error: ${e.message}`);
    } finally {
      setBusy(false);
      await load(owner.id);
    }
  }

  async function makeAllMissingTransparent() {
    setBusy(true);
    setMsg('Making transparent for all missing…');

    const targets = rows.filter(r => !r.image_url_transparent && r.image_url);
    let ok = 0, fail = 0;

    for (const f of targets) {
      try {
        const res = await fetch('/api/remove-bg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: f.image_url, fragranceId: f.id })
        });
        const j = await res.json().catch(() => ({}));
        if (res.ok && j?.success) ok++; else fail++;
      } catch {
        fail++;
      }
    }

    setMsg(`Transparent done: ${ok} ok, ${fail} failed`);
    setBusy(false);
    await load(owner.id);
  }

  async function deleteFragrance(fragrance) {
    if (!isAdmin) return;
    const ok = window.confirm(
      `Delete "${fragrance.brand} — ${fragrance.name}" from the catalog?\n` +
      `This will also remove it from your shelves.\n\nThis cannot be undone.`
    );
    if (!ok) return;

    setBusy(true);
    setMsg('Deleting fragrance…');

    try {
      const res = await fetch('/api/admin-delete-fragrance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fragranceId: fragrance.id,
          deleteFromShelves: true,
          deleteStorage: true
        })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.ok) {
        throw new Error(j?.error || 'delete failed');
      }
      setMsg('Fragrance deleted ✓');
      await load(owner.id);
    } catch (e) {
      setMsg(`Delete error: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin · Fragrances</h1>
        <Link href="/admin" className="underline text-sm">← Back to Admin</Link>
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
        <button
          onClick={() => load(owner.id)}
          className="px-3 py-2 rounded bg-black text-white hover:opacity-90"
        >
          Reload
        </button>

        <div className="flex-1" />

        {/* Bulk actions */}
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
