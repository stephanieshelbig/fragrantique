'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// Same normalization helpers used on the boutique page
const brandKey = (b) =>
  (b || 'unknown')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const STOPWORDS = new Set([
  'paris','london','milan','new','york','nyc','roma','rome',
  'perfume','perfumes','parfum','parfums','fragrance','fragrances',
  'inc','ltd','llc','co','company','laboratories','laboratory','lab','labs',
  'edition','editions','house','maison','atelier','collection','collections'
]);
function canonicalBrandKey(b) {
  const strict = brandKey(b);
  const parts = strict.split('-').filter(Boolean);
  const kept = parts.filter(p => !STOPWORDS.has(p));
  const canon = kept.join('-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  return canon || strict;
}

export default function BrandIndex() {
  const [authReady, setAuthReady] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [owner, setOwner] = useState({ id: null, username: 'stephanie' }); // default to your boutique
  const [links, setLinks] = useState([]);

  useEffect(() => {
    (async () => {
      await supabase.auth.getSession();
      const { data: session } = await supabase.auth.getUser();
      setViewer(session?.user || null);
      setAuthReady(true);

      // Resolve the default owner (stephanie)
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', 'stephanie')
        .maybeSingle();

      if (!prof?.id) {
        setOwner({ id: null, username: 'stephanie' });
        setLoading(false);
        return;
      }
      setOwner(prof);

      // Pull all user_fragrances for the owner (public SELECT should be allowed by your RLS)
      const { data: rows } = await supabase
        .from('user_fragrances')
        .select('fragrance:fragrances(id, brand, name)')
        .eq('user_id', prof.id);

      const items = (rows || [])
        .map(r => r.fragrance)
        .filter(Boolean);

      setLinks(items);
      setLoading(false);
    })();
  }, []);

  const brands = useMemo(() => {
    const map = new Map(); // canon -> { display, strict, count }
    for (const f of links) {
      const disp = f.brand || 'Unknown';
      const strict = brandKey(disp);
      const canon  = canonicalBrandKey(disp);
      if (!map.has(canon)) map.set(canon, { display: disp, strict, count: 0 });
      map.get(canon).count += 1;
    }
    // Sort by display name
    return Array.from(map.entries())
      .sort((a, b) => a[1].display.toLowerCase().localeCompare(b[1].display.toLowerCase()));
  }, [links]);

  if (!authReady || loading) {
    return <div className="max-w-5xl mx-auto p-6">Loading brand index…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Brand index</h1>
      <p className="opacity-70 text-sm">
        Showing brands from <span className="font-medium">@{owner.username}</span>’s boutique.
      </p>

      {!brands.length && (
        <div className="p-4 border rounded bg-white">No brands yet.</div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {brands.map(([canon, meta]) => {
          const href = `/u/${encodeURIComponent(owner.username)}/brand/${meta.strict}`;
          return (
            <Link
              key={canon}
              href={href}
              className="px-3 py-2 rounded bg-black text-white hover:opacity-90 text-sm"
            >
              {meta.display} <span className="opacity-70">({meta.count})</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
