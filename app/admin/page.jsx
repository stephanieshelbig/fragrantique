'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

function Card({ href, title, desc }) {
  return (
    <Link href={href} className="block rounded-2xl border p-4 hover:shadow transition">
      <div className="text-lg font-semibold">{title}</div>
      <div className="text-sm text-gray-600 mt-1">{desc}</div>
    </Link>
  );
}

export default function AdminHome() {
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    (async () => {
      // lightweight stats for quick overview
      const [{ count: fragrances }, { count: links }] = await Promise.all([
        supabase.from('fragrances').select('*', { count: 'exact', head: true }),
        supabase.from('user_fragrances').select('*', { count: 'exact', head: true }),
      ]);
      setCounts({ fragrances: fragrances ?? 0, links: links ?? 0 });
    })();
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-bold">Admin</h1>
        {counts && (
          <div className="text-sm text-gray-600">
            {counts.fragrances} fragrances · {counts.links} shelf links
          </div>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card
          href="/admin/image-fixer"
          title="Image Fixer"
          desc="Paste/Upload image URLs, remove backgrounds, scan for broken links."
        />
        <Card
          href="/admin/clean-images"
          title="Background Remover"
          desc="Batch create transparent PNGs via remove.bg for missing items."
        />
        <Card
          href="/admin/import-fragrantica"
          title="Import from Fragrantica"
          desc="Bookmarklet-based importer (or console) to pull your Wardrobe."
        />
        <Card
          href="/admin/import-paste"
          title="Import (Paste JSON)"
          desc="Paste JSON captured from Fragrantica to add/update bottles."
        />
      </div>
    </div>
  );
}
