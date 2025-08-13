'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

function Card({ href, title, desc, children }) {
  const core = (
    <div className="block rounded-2xl border p-4 hover:shadow transition">
      <div className="text-lg font-semibold">{title}</div>
      {desc && <div className="text-sm text-gray-600 mt-1">{desc}</div>}
      {children}
    </div>
  );
  return href ? <Link href={href}>{core}</Link> : core;
}

function Stat({ label, value, hint }) {
  return (
    <div className="flex items-baseline justify-between">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-right">
        <div className="text-xl font-semibold">{value}</div>
        {hint && <div className="text-xs text-gray-500">{hint}</div>}
      </div>
    </div>
  );
}

export default function AdminHome() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const SHELVES = [0,1,2,3,4,5,6]; // 0=top … 6=bottom
  const ROWS_PER_SHELF = 2;

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin-stats', { cache: 'no-store' });
        const j = await res.json();
        if (res.ok && j.ok) setStats(j);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-bold">Admin</h1>
        {!loading && stats && (
          <div className="text-sm text-gray-600">
            {stats.totals.fragrances} fragrances · {stats.totals.links} shelf links
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card
          href="/admin/image-fixer"
          title="Image Fixer"
          desc="Paste/Upload image URLs, remove backgrounds, scan for broken links."
        />
        <Card
          href="/admin/clean-images"
          title="Background Remover"
          desc="Batch-create transparent PNGs (remove.bg)."
        />
        <Card
          href="/admin/import-fragrantica"
          title="Import from Fragrantica"
          desc="Bookmarklet importer."
        />
        <Card
          href="/admin/import-paste"
          title="Import (Paste JSON)"
          desc="Paste captured JSON from Fragrantica."
        />
      </div>

      {/* Stats */}
      <Card title="Stats" desc={!loading ? 'Live snapshot' : 'Loading…'}>
        {!stats ? (
          <div className="text-sm text-gray-500 mt-3">Loading…</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4 mt-3">
            <div className="space-y-2">
              <Stat label="Fragrances (total)" value={stats.totals.fragrances} />
              <Stat label="Shelf links (Stephanie)" value={stats.totals.links} />
            </div>
            <div className="space-y-2">
              <Stat label="Missing source image" value={stats.totals.missing_src} hint="image_url empty" />
              <Stat label="Missing transparent" value={stats.totals.missing_transparent} hint="image_url_transparent empty" />
            </div>
          </div>
        )}
      </Card>

      {/* Shelf occupancy */}
      <Card title="Shelf occupancy (Stephanie)" desc="Per shelf & row">
        {!stats ? (
          <div className="text-sm text-gray-500 mt-3">Loading…</div>
        ) : (
          <div className="space-y-4 mt-3">
            {SHELVES.slice().reverse().map((s) => {
              const label = s === 6 ? 'Bottom' : s === 0 ? 'Top' : `Shelf ${s}`;
              const shelfRows = stats.byShelfRow?.[s] || {};
              // compute max row count for simple bar scaling
              const maxCount = Math.max(1, ...Object.values(shelfRows), 1);

              return (
                <div key={s} className="space-y-2">
                  <div className="text-sm font-medium">{label}</div>
                  {Array.from({ length: ROWS_PER_SHELF }, (_, r) => {
                    const c = shelfRows[r] || 0;
                    const pct = Math.min(100, Math.round((c / maxCount) * 100));
                    return (
                      <div key={`${s}-${r}`} className="flex items-center gap-2">
                        <div className="text-xs w-14 text-gray-600">Row {r+1}</div>
                        <div className="flex-1 h-3 bg-gray-100 rounded">
                          <div
                            className="h-3 bg-black rounded"
                            style={{ width: `${pct}%` }}
                            title={`${c} bottles`}
                          />
                        </div>
                        <div className="w-10 text-right text-xs">{c}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
