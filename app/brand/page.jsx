'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

function slugifyBrand(b) {
  return (b || 'unknown').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

export default function BrandIndex() {
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    (async () => {
      // pull distinct brands from fragrances
      const { data } = await supabase
        .from('fragrances')
        .select('brand, id')
        .order('brand', { ascending: true });

      const distinct = Array.from(
        new Set((data || []).map(r => (r.brand || 'Unknown').trim()))
      ).sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase()));

      setBrands(distinct);
    })();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Brands</h1>
        <Link href="/%40stephanie" className="underline text-sm opacity-70">← Back to shelves</Link>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        {brands.map((b) => (
          <Link
            key={b}
            href={`/brand/${slugifyBrand(b)}`}
            className="rounded border p-3 hover:shadow transition flex items-center justify-between"
          >
            <span className="font-medium">{b}</span>
            <span className="text-xs opacity-60">View</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
