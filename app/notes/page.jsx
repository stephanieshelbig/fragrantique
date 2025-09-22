'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase'; // same as your admin page
import { useSearchParams } from 'next/navigation';

// ---------- Helpers ----------
const toText = (val) => {
  if (val == null) return '';
  if (Array.isArray(val)) return val.filter(Boolean).join(', ');
  if (typeof val === 'object') {
    try {
      const flat = JSON.stringify(val);
      return flat.replace(/[{}\[\]"]/g, ' ').replace(/\s+/g, ' ').trim();
    } catch { return String(val); }
  }
  return String(val);
};

const norm = (s = '') => toText(s).toLowerCase();
const has = (val, sub) => norm(val).includes(sub.toLowerCase());

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

const getBottleUrl = (f) => {
  // Prefer transparent -> normal -> path in 'bottles' bucket -> placeholder
  if (f.image_url_transparent) return f.image_url_transparent;
  if (f.image_url) return f.image_url;
  if (f.image_path && SUPABASE_URL) {
    return `${SUPABASE_URL}/storage/v1/object/public/bottles/${f.image_path}`;
  }
  return '/bottle-placeholder.png';
};

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
        placeholder="Search by brand or name or notes"
        className="w-full rounded-xl border px-4 py-2"
      />
      <button onClick={onReload} className="rounded-xl border px-4 py-2 hover:bg-gray-50">
        Reload
      </button>
    </div>
  );
}

function Card({ f }) {
  const img = getBottleUrl(f);
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
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();

  useEffect(() => {
    (async () => {
      setLoadError(null);
      // Pull same fields your admin page uses + accords + image_path for bottles bucket
      const { data, error } = await supabase
        .from('fragrances')
        .select('id, brand, name, accords, image_url, image_url_transparent, image_path')
        .order('brand', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        setLoadError(`Fragrances query failed: ${error.message || 'unknown error'}`);
        setRows([]);
        return;
      }
      setRows(data || []);
    })();
  }, []);

  // Search by brand/name/accords
  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q) return rows;
    return rows.filter((f) => `${norm(f.brand)} ${norm(f.name)} ${norm(f.accords)}`.includes(q));
  }, [rows, query]);

  // Buckets — a fragrance may appear in multiple if accords contain several targets
  const grouped = useMemo(() => {
    const buckets = { vanilla: [], florals: [], whiteFlorals: [], fruity: [] };

    filtered.forEach((f) => {
      const a = f.accords;
      const isWhiteFloral = has(a, 'White Floral');
      const isFloral = has(a, 'Floral') && !isWhiteFloral; // don't double-count white floral here
      const isVanilla = has(a, 'Vanilla');
      const isFruity = has(a, 'Fruity');

      if (isVanilla) buckets.vanilla.push(f);
      if (isFloral) buckets.florals.push(f);
      if (isWhiteFloral) buckets.whiteFlorals.push(f);
      if (isFruity) buckets.fruity.push(f);
    });

    const sorter = (x, y) =>
      (x.brand || '').localeCompare(y.brand || '') ||
      (x.name || '').localeCompare(y.name || '');

    Object.values(buckets).forEach((arr) => arr.sort(sorter));
    return buckets;
  }, [filtered]);

  const allFourEmpty =
    filtered.length > 0 &&
    grouped.vanilla.length === 0 &&
    grouped.florals.length === 0 &&
    grouped.whiteFlorals.length === 0 &&
    grouped.fruity.length === 0;

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
        <SearchBar value={query} onChange={setQuery} onReload={() => startTransition(() => location.reload())} />

        {loadError && (
          <div className="mx-auto max-w-7xl mt-2 mb-4 rounded-lg border bg-red-50 px-3 py-2 text-sm text-red-800">
            {loadError}
          </div>
        )}

        {!loadError && rows.length === 0 && (
          <div className="mx-auto max-w-7xl mt-2 mb-4 rounded-lg border bg-amber-50 px-3 py-2 text-sm text-amber-900">
            No fragrances returned from the database. If this is production, double-check:
            <ul className="list-disc ml-5">
              <li><code>public.fragrances</code> has a SELECT policy (RLS) allowing anon read.</li>
              <li><code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> are set in Vercel for this environment.</li>
            </ul>
          </div>
        )}

        {/* 4 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pt-2">
          <Column title="VANILLA / GOURMAND" list={grouped.vanilla} />
          <Column title="FLORALS" list={grouped.florals} />
          <Column title="WHITE FLORALS" list={grouped.whiteFlorals} />
          <Column title="FRUITY" list={grouped.fruity} />
        </div>

        {/* Fallback: show everything if none matched any column */}
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

        {isPending && <div className="text-sm text-gray-500 mt-6">Refreshing…</div>}
      </main>
    </div>
  );
}
