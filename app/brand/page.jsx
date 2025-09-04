'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const slugify = (b) =>
  (b || 'unknown')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export default function BrandIndexPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Pull all brands (we'll unique them in JS)
      const { data, error } = await supabase
        .from('fragrances')
        .select('brand')
        .order('brand', { ascending: true })
        .limit(20000);

      if (!error) setRows(data || []);
      else setRows([]);

      setLoading(false);
    })();
  }, []);

  const brands = useMemo(() => {
    const set = new Set();
    for (const r of rows) {
      const b = (r.brand || '').trim();
      if (b) set.add(b);
    }
    const list = Array.from(set);
    list.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return list;
  }, [rows]);

  const filtered = useMemo(() => {
    if (!q) return brands;
    const s = q.toLowerCase();
    return brands.filter(b => b.toLowerCase().includes(s));
  }, [brands, q]);

  return (
    <div className="mx-auto max-w-6xl w-full px-4 py-6 space-y-5">
      {/* NEW: link to all in-stock decants */}
      <div className="p-3 rounded border bg-white flex items-center justify-between">
        <div className="text-sm">
          Looking to shop?{' '}
          <Link href="/decants" className="font-semibold underline">
            Click here to view all available decants
          </Link>
        </div>
        <div className="text-sm">
          <Link href="/cart" className="hover:underline">Cart</Link>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Brand Index</h1>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search brands…"
          className="border rounded px-3 py-2 w-64"
        />
      </div>

      {loading && <div>Loading brands…</div>}

      {!loading && !filtered.length && (
        <div className="p-4 border rounded bg-white">No brands found.</div>
      )}

      {!loading && !!filtered.length && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {filtered.map((b) => (
            <li key={b}>
              <Link
                href={`/brand/${encodeURIComponent(slugify(b))}`}
                className="block rounded border bg-white px-3 py-2 hover:shadow-sm text-sm text-center"
                title={`View ${b}`}
              >
                {b}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
