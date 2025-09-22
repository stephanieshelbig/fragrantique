'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase'; // match your admin page import

const ADMIN_EMAIL = 'stephanieshelbig@gmail.com';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

// ---------- Helpers ----------
const toText = (val) => {
  if (val == null) return '';
  if (Array.isArray(val)) return val.filter(Boolean).join(', ');
  if (typeof val === 'object') {
    try {
      const flat = JSON.stringify(val);
      return flat.replace(/[{}\[\]"]/g, ' ').replace(/\s+/g, ' ').trim();
    } catch {
      return String(val);
    }
  }
  return String(val);
};

const norm = (s = '') => toText(s).toLowerCase();
const has = (val, sub) => norm(val).includes(sub.toLowerCase());

const getBottleUrl = (f) => {
  // Prefer transparent, then normal URL, then construct from image_path in 'bottles' bucket.
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
        {/* Bottle image */}
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

        {/* Details */}
        <div className="flex-1">
          <div className="text-xs text-gray-500">Brand</div>
          <div className="font-medium">{f.brand || '—'}</div>

          <div className="mt-1 text-xs text-gray-500">Fragrance Name</div>
          <div className="font-medium">{f.name || '—'}</div>

          <div className="mt-3">
            <Link
              href={`/fragrance/${f.id}`}
              className="text-sm rounded-lg border px-3 py-1.5 hover:bg-gray-50"
            >
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
  const [fragrances, setFragrances] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [loadError, setLoadError] = useState(null);
  const searchParams = useSearchParams();

  // Determine admin (optional)
  useEffect(() => {
    (async () => {
      try {
        const qEmail = searchParams?.get('me');
        const { data } = await supabase.auth.getUser();
        const email = (data?.user?.email || qEmail || '').toLowerCase();
        setIsAdmin(email === ADMIN_EMAIL.toLowerCase());
      } catch {
        const qEmail = (searchParams?.get('me') || '').toLowerCase();
        setIsAdmin(qEmail === ADMIN_EMAIL.toLowerCase());
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoadError(null);

    // Pull common fields + the image columns your admin page uses.
    const { data: frags, error } = await supabase
      .from('fragrances')
      .select('id, brand, name, accords, show_on_notes, image_url, image_url_transparent, image_path')
      .order('brand', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('fragrances query error', error);
      setLoadError(`Fragrances query failed: ${error.message || 'unknown error'}`);
      setFragrances([]);
      return;
    }

    setFragrances(frags || []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Search (brand/name/accords)
  const filtered = useMemo(() => {
    const q = norm(query);
    // If show_on_notes is missing/null, treat as visible for everyone.
    const base = fragrances.filter((f) =>
      isAdmin ? true : (f.show_on_notes === undefined || f.show_on_notes === null ? true : !!f.show_on_notes)
    );
    if (!q) return base;
    return base.filter((f) => {
      const hay = `${norm(f.brand)} ${norm(f.name)} ${norm(f.accords)}`;
      return hay.includes(q);
    });
  }, [query, fragrances, isAdmin]);

  // Buckets — a fragrance can appear in multiple columns if accords contain multiple targets
  const grouped = useMemo(() => {
    const buckets = {
      vanilla: [],
      florals: [],
      whiteFlorals: [],
      fruity: [],
      uncategorized: [],
    };

    filtered.forEach((f) => {
      const a = f.accords;
      const isWhiteFloral = has(a, 'White Floral');
      const isFloral = has(a, 'Floral') && !isWhiteFloral; // "Floral" but not "White Floral"
      const isVanilla = has(a, 'Vanilla');
      const isFruity = has(a, 'Fruity');

      if (isVanilla) buckets.vanilla.push(f);
      if (isFloral) buckets.florals.push(f);
      if (isWhiteFloral) buckets.whiteFlorals.push(f);
      if (isFruity) buckets.fruity.push(f);

      if (!isVanilla && !isFloral && !isWhiteFloral && !isFruity) {
        buckets.uncategorized.push(f);
      }
    });

    const sorter = (x, y) =>
      (x.brand || '').localeCompare(y.brand || '') ||
      (x.name || '').localeCompare(y.name || '');
    Object.values(buckets).forEach((arr) => arr.sort(sorter));

    return buckets;
  }, [filtered]);

  const Column = ({ title, list }) => (
    <div className="space-y-4">
      <div className="rounded-xl bg-gray-50 border px-4 py-2 text-sm font-semibold">{title}</div>
      {list.length === 0 && <div className="text-xs text-gray-400 px-1">No matches</div>}
      {list.map((f) => (
        <Card key={f.id} f={f} />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <HeaderNav />
      <main className="mx-auto max-w-7xl px-4 pb-20">
        <SearchBar value={query} onChange={setQuery} onReload={() => startTransition(load)} />

        {loadError && (
          <div className="mx-auto max-w-7xl mt-2 mb-2 rounded-lg border bg-red-50 px-3 py-2 text-xs text-red-800">
            {loadError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pt-2">
          <Column title="VANILLA / GOURMAND" list={grouped.vanilla} />
          <Column title="FLORALS" list={grouped.florals} />
          <Column title="WHITE FLORALS" list={grouped.whiteFlorals} />
          <Column title="FRUITY" list={grouped.fruity} />
        </div>

        {/* Optional: surface uncategorized for you to refine accords */}
        {/* {isAdmin && grouped.uncategorized.length > 0 && ... } */}

        {isPending && <div className="text-sm text-gray-500 mt-6">Refreshing…</div>}
      </main>
    </div>
  );
}
