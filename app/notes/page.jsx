'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

// ---------- Helpers ----------
const toText = (v) => {
  if (v == null) return '';
  if (Array.isArray(v)) return v.filter(Boolean).join(', ');
  if (typeof v === 'object') {
    try { return JSON.stringify(v).replace(/[{}\[\]"]/g, ' ').replace(/\s+/g, ' ').trim(); }
    catch { return String(v); }
  }
  return String(v);
};
const norm = (s = '') => toText(s).toLowerCase();
const has = (val, sub) => norm(val).includes(sub.toLowerCase());
const bottleUrl = (f) => f.image_url_transparent || f.image_url || '/bottle-placeholder.png';

// Create Supabase client **lazily** to avoid server crash when env vars are missing.
function getSupabaseClient() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return null;
    return createClient(url, anon);
  } catch {
    return null;
  }
}

// ---------- UI ----------
function HeaderNav() {
  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-2xl font-semibold">Fragrantique</Link>
        <nav className="flex items-center gap-6">
          <Link href="/brand-index" className="hover:underline">Brand Index</Link>
          <Link href="/contact" className="hover:underline">Contact Me</Link>
          <Link href="/cart" className="hover:underline">Cart</Link>
        </nav>
      </div>
    </header>
  );
}

function SearchBar({ value, onChange, onReload }) {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-4 flex items-center gap-3">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by brand, fragrance, or accords…"
        className="w-full rounded-xl border px-4 py-2"
      />
      <button onClick={onReload} className="rounded-xl border px-4 py-2 hover:bg-gray-50">
        Reload
      </button>
    </div>
  );
}

function Card({ f }) {
  const img = bottleUrl(f);
  return (
    <div className="rounded-2xl border p-4 shadow-sm bg-white">
      <div className="flex items-start gap-3">
        <div className="w-16 h-20 rounded overflow-hidden border bg-gray-100 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img}
            alt={`${f.brand || ''} ${f.name || ''}`}
            className="w-full h-full object-contain"
            style={{ mixBlendMode: 'multiply' }}
            loading="lazy"
            onError={(e) => {
              const el = e.currentTarget;
              if (!el.dataset.fallback) {
                el.dataset.fallback = '1';
                el.src = '/bottle-placeholder.png';
              }
            }}
          />
        </div>
        <div className="flex-1">
          <div className="text-xs text-gray-500">Brand</div>
          <div className="font-medium">{f.brand || '—'}</div>

          <div className="mt-1 text-xs text-gray-500">Fragrance Name</div>
          <div className="font-medium">{f.name || '—'}</div>

          <div className="mt-3">
            <Link href={`/fragrance/${f.id}`} className="text-sm rounded-lg border px-3 py-1.5 hover:bg-gray-50">
              Info
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Page ----------
export default function NotesPage() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [hint, setHint] = useState(null); // shows env/RLS hints
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    (async () => {
      setLoadError(null);
      setHint(null);

      const sb = getSupabaseClient();
      if (!sb) {
        setHint(
          'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in this environment. ' +
          'Set them in Vercel → Project → Settings → Environment Variables (Preview/Production).'
        );
        setRows([]);
        return;
      }

      try {
        const { data, error } = await sb
          .from('fragrances')
          .select('id, brand, name, accords, image_url, image_url_transparent')
          .order('brand', { ascending: true })
          .order('name', { ascending: true });

        if (error) throw error;
        setRows(data || []);
        if (!data || data.length === 0) {
          setHint('Query returned 0 rows. If this is unexpected, confirm RLS SELECT policy on public.fragrances allows anon read.');
        }
      } catch (err) {
        console.error('fragrances query error', err);
        setLoadError(`Fragrances query failed: ${err?.message || 'unknown error'}`);
        setRows([]);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = norm(q);
    if (!s) return rows;
    return rows.filter((f) =>
      `${norm(f.brand)} ${norm(f.name)} ${norm(f.accords)}`.includes(s)
    );
  }, [rows, q]);

  // Strict bucketing by substrings on `fragrances.accords`
  const grouped = useMemo(() => {
    const buckets = { vanilla: [], florals: [], whiteFlorals: [], fruity: [] };
    const sort = (a, b) =>
      (a.brand || '').localeCompare(b.brand || '') ||
      (a.name || '').localeCompare(b.name || '');

    filtered.forEach((f) => {
      const a = f.accords;
      const isWhite = has(a, 'White Floral');
      const isFloral = has(a, 'Floral') && !isWhite; // "Floral" but not "White Floral"
      const isVanilla = has(a, 'Vanilla');
      const isFruity = has(a, 'Fruity');

      if (isVanilla) buckets.vanilla.push(f);
      if (isFloral) buckets.florals.push(f);
      if (isWhite) buckets.whiteFlorals.push(f);
      if (isFruity) buckets.fruity.push(f);
    });

    Object.values(buckets).forEach((arr) => arr.sort(sort));
    return buckets;
  }, [filtered]);

  const allFourEmpty =
    filtered.length > 0 &&
    !grouped.vanilla.length &&
    !grouped.florals.length &&
    !grouped.whiteFlorals.length &&
    !grouped.fruity.length;

  const Column = ({ title, list }) => (
    <div className="space-y-4">
      <div className="rounded-xl bg-gray-50 border px-4 py-2 text-sm font-semibold">{title}</div>
      {list.length === 0 && <div className="text-xs text-gray-400 px-1">No matches</div>}
      {list.map((f) => <Card key={f.id} f={f} />)}
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <HeaderNav />

      <main className="mx-auto max-w-7xl px-4 pb-20">
        <SearchBar value={q} onChange={setQ} onReload={() => location.reload()} />

        {/* Debug strip */}
        <div className="mx-auto max-w-7xl mt-2 mb-4 rounded-lg border bg-white px-3 py-2 text-xs text-gray-700">
          Loaded <b>{rows.length}</b> fragrances{q ? <> · after search: <b>{filtered.length}</b></> : null}.
          {hint && <div className="mt-1 text-amber-800 bg-amber-50 border rounded px-2 py-1">{hint}</div>}
          {loadError && <div className="mt-1 text-red-700">{loadError}</div>}
        </div>

        {/* 4 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pt-2">
          <Column title="VANILLA / GOURMAND" list={grouped.vanilla} />
          <Column title="FLORALS" list={grouped.florals} />
          <Column title="WHITE FLORALS" list={grouped.whiteFlorals} />
          <Column title="FRUITY" list={grouped.fruity} />
        </div>

        {/* Fallback: show all if none matched any bucket */}
        {allFourEmpty && (
          <div className="mt-10 space-y-4">
            <div className="rounded-xl bg-gray-50 border px-4 py-2 text-sm font-semibold">
              All fragrances (no column matches)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((f) => <Card key={f.id} f={f} />)}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
