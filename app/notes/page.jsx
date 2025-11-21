'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

// ---------- Helpers ----------
const bottleUrl = (f) =>
  f?.image_url_transparent || f?.image_url || '/bottle-placeholder.png';

// Parse `accords` into an array of lowercased names
function parseAccordNames(accords) {
  try {
    if (typeof accords === 'string') {
      const s = accords.trim();
      if ((s.startsWith('[') && s.endsWith(']')) || (s.startsWith('{') && s.endsWith('}'))) {
        return parseAccordNames(JSON.parse(s));
      }
      return s.split(/[,\|]/).map((x) => x.trim().toLowerCase()).filter(Boolean);
    }
    if (Array.isArray(accords)) {
      return accords
        .map((x) => (typeof x === 'string' ? x : x?.name))
        .filter(Boolean)
        .map((n) => String(n).toLowerCase().trim());
    }
    if (accords && typeof accords === 'object' && 'name' in accords) {
      return [String(accords.name).toLowerCase().trim()];
    }
    return [];
  } catch {
    return [];
  }
}

// ---------- UI ----------
function HeaderNav() {
  return (
    <header className="sticky top-0 z-10 border-b bg-[#182A39]/90 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">

        {/* Left side: Enlarged Logo */}
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/FragrantiqueLogo.png"
            alt="Fragrantique Logo"
            className="h-48 w-auto"
          />
        </div>

        {/* Right side: Text */}
        <Link href="/" className="text-2xl font-semibold text-[#F2D2A4]">
          Fragrantique
        </Link>
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
        placeholder="Search by brand, fragrance, notes, or accords…"
        className="w-full rounded-xl border px-4 py-2 bg-white text-black"
      />
      <button
        onClick={onReload}
        className="rounded-xl border px-3 py-2 bg-white text-black hover:bg-gray-100"
      >
        Reload
      </button>
    </div>
  );
}

function Card({ f }) {
  const img = bottleUrl(f);
  const href = `/fragrance/${encodeURIComponent(f.id)}`;

  return (
    <div className="rounded-2xl border p-3 shadow-sm bg-white">
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
          <div className="text-xs text-gray-600">Brand</div>
          <div className="font-medium text-black">{f.brand || '—'}</div>

          <div className="mt-1 text-xs text-gray-600">Fragrance Name</div>
          <div className="font-medium text-black">{f.name || '—'}</div>

          <div className="mt-3">
            <Link
              href={href}
              className="text-sm rounded-lg border px-3 py-1.5 bg-white hover:bg-gray-100 text-black"
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
  const [q, setQ] = useState('');
  const [rows, setRows] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    (async () => {
      setLoadError('');

      const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      if (!base || !anon) {
        setLoadError('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set.');
        return;
      }

      const url =
        `${base}/rest/v1/fragrances` +
        `?select=id,brand,name,slug,accords,notes,image_url,image_url_transparent` +
        `&order=brand.asc&order=name.asc`;

      try {
        const res = await fetch(url, {
          headers: { apikey: anon, Authorization: `Bearer ${anon}` },
          cache: 'no-store',
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`);
        }
        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Fragrances fetch error:', err);
        setLoadError(err?.message || 'Unknown error fetching fragrances.');
        setRows([]);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = (q || '').toLowerCase();
    if (!s) return rows;
    return rows.filter((f) => {
      const acc = parseAccordNames(f.accords).join(' ');
      const notesText = (f.notes ?? '').toString().toLowerCase();
      return (
        (f.brand || '').toLowerCase().includes(s) ||
        (f.name || '').toLowerCase().includes(s) ||
        acc.includes(s) ||
        notesText.includes(s)
      );
    });
  }, [rows, q]);

  return (
    <div className="min-h-screen bg-[#182A39] text-white">
      <HeaderNav />

      <main className="mx-auto max-w-7xl px-4 pb-20">
        <SearchBar value={q} onChange={setQ} onReload={() => location.reload()} />

        {loadError && (
          <div className="mx-auto max-w-7xl mt-2 mb-4 rounded-lg border bg-red-200 px-3 py-2 text-xs text-red-900">
            {loadError}
          </div>
        )}

        <div className="mx-auto max-w-7xl mt-2 mb-4 flex items-center justify-between text-sm text-white/70">
          <div>
            {filtered.length} result{filtered.length === 1 ? '' : 's'}
          </div>
          <div>MOBILE USERS - TURN YOUR DEVICE TO VIEW IN LANDSCAPE MODE</div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-4 border rounded bg-white text-black text-sm opacity-80">
            No matches. Try searching by brand, fragrance name, notes, or accord keywords.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5 pt-2">
            {filtered.map((f) => (
              <Card key={f.id} f={f} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
