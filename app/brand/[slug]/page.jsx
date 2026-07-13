'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const BODY_MIST_ID = '27bfb4b1-4f99-4e15-903d-bd641ed442fe';

function cleanDecantName(label = '') {
  return label.replace(/\s*\$[0-9]+(\.[0-9]{1,2})?$/, '').trim();
}

async function fetchAllFragrances(brandParam) {
  const PAGE_SIZE = 1000;
  let from = 0;
  let allRows = [];

  while (true) {
    const { data, error } = await supabase
      .from('fragrances')
      .select(
        'id, brand, name, image_url, image_url_transparent, fragrantica_url'
      )
      .ilike('brand', brandParam)
      .order('name', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    allRows = [...allRows, ...(data || [])];

    if (!data || data.length < PAGE_SIZE) break;

    from += PAGE_SIZE;
  }

  return allRows;
}

async function fetchAllFragrancesFallback(brandParam) {
  const PAGE_SIZE = 1000;
  let from = 0;
  let allRows = [];

  while (true) {
    const { data, error } = await supabase
      .from('fragrances')
      .select(
        'id, brand, name, image_url, image_url_transparent, fragrantica_url'
      )
      .ilike('brand', `%${brandParam}%`)
      .order('name', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;

    allRows = [...allRows, ...(data || [])];

    if (!data || data.length < PAGE_SIZE) break;

    from += PAGE_SIZE;
  }

  return allRows;
}

export default function BrandDetailPage({ params }) {
  const brandParam = decodeURIComponent(params.slug || '');
  const isBodyMistPage = brandParam.toLowerCase() === 'body-mist';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);

      if (isBodyMistPage) {
        const PAGE_SIZE = 1000;
        let from = 0;
        let allDecants = [];

        while (true) {
          const { data, error } = await supabase
            .from('decants')
            .select(`
              id,
              label,
              size_ml,
              price_cents,
              fragrance_id,
              fragrances (
                id,
                brand,
                name,
                image_url,
                image_url_transparent,
                fragrantica_url
              )
            `)
            .eq('fragrance_id', BODY_MIST_ID)
            .range(from, from + PAGE_SIZE - 1);

          if (error) {
            console.error(error);
            break;
          }

          allDecants = [...allDecants, ...(data || [])];

          if (!data || data.length < PAGE_SIZE) break;

          from += PAGE_SIZE;
        }

        const mapped = allDecants.map((d) => ({
          id: d.id,
          brand: 'Body Mist',
          name: cleanDecantName(d.label),
          size_ml: d.size_ml,
          price_cents: d.price_cents,
          fragrance_id: d.fragrance_id,
          image_url: d.fragrances?.image_url,
          image_url_transparent: d.fragrances?.image_url_transparent,
          fragrantica_url: d.fragrances?.fragrantica_url,
        }));

        setItems(mapped);
        setLoading(false);
        return;
      }

      try {
  console.log('BRAND PAGE DIAGNOSTIC');
  console.log('Raw params.slug:', params.slug);
  console.log('Decoded brandParam:', brandParam);

  let data = await fetchAllFragrances(brandParam);

  console.log('Exact brand query count:', data?.length);
  console.table(
    (data || []).map((fragrance) => ({
      id: fragrance.id,
      brand: fragrance.brand,
      name: fragrance.name,
    }))
  );

  if (!data || data.length === 0) {
    console.log('Exact query returned nothing. Running fallback query.');

    data = await fetchAllFragrancesFallback(brandParam);

    console.log('Fallback query count:', data?.length);
    console.table(
      (data || []).map((fragrance) => ({
        id: fragrance.id,
        brand: fragrance.brand,
        name: fragrance.name,
      }))
    );
  }

  setItems(data || []);
} catch (err) {
  console.error('BRAND PAGE QUERY ERROR:', err);
  setItems([]);
}

      setLoading(false);
    })();
  }, [brandParam, isBodyMistPage]);

  const sorted = useMemo(() => {
    return [...(items || [])].sort((a, b) =>
      (a?.name || '').localeCompare(
        b?.name || '',
        undefined,
        { sensitivity: 'base' }
      )
    );
  }, [items]);

  return (
    <div className="mx-auto max-w-6xl w-full px-2">
      <div className="w-full mb-6">
        <Image
          src="/StephaniesBoutiqueHeader.png"
          alt="Stephanie's Boutique Header"
          width={1200}
          height={200}
          style={{
            objectFit: 'contain',
            width: '100%',
            height: 'auto',
          }}
          priority
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl sm:text-2xl font-bold">
          {isBodyMistPage ? 'Body Mist' : brandParam} — {sorted.length} option
          {sorted.length === 1 ? '' : 's'}
        </h1>

        <div className="flex gap-3 text-sm">
          <Link href="/brand" className="underline">
            ← Back to Brand Index
          </Link>

          <Link href="/cart" className="hover:underline">
            Cart
          </Link>
        </div>
      </div>

      {loading && <div>Loading…</div>}

      {!loading && !sorted.length && (
        <div className="p-4 border rounded bg-white">
          No fragrances found for this brand.
        </div>
      )}

      {!loading && !!sorted.length && (
        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {sorted.map((f) => {
            const img =
              f.image_url_transparent ||
              f.image_url ||
              '/bottle-placeholder.png';

            const href = isBodyMistPage
              ? `/fragrance/${BODY_MIST_ID}`
              : `/fragrance/${f.id}`;

            return (
              <li key={f.id} className="group">
                <Link
                  href={href}
                  className="block rounded-lg bg-white border hover:shadow-sm p-3 text-center"
                >
                  <img
                    src={img}
                    alt={f.name}
                    className="mx-auto h-28 object-contain"
                    style={{ mixBlendMode: 'multiply' }}
                    onError={(e) => {
                      const el = e.currentTarget;

                      if (!el.dataset.fallback) {
                        el.dataset.fallback = '1';
                        el.src = '/bottle-placeholder.png';
                      }
                    }}
                  />

                  <div className="mt-2 text-xs opacity-70">
                    {f.brand}
                  </div>

                  <div className="text-sm font-medium">
                    {f.name}
                  </div>

                  {isBodyMistPage && (
                    <div className="mt-1 text-xs opacity-70">
                      {f.size_ml ? `${f.size_ml}ml` : ''}
                      {f.price_cents
                        ? ` · $${(f.price_cents / 100).toFixed(2)}`
                        : ''}
                    </div>
                  )}
                </Link>

                {!isBodyMistPage && f.fragrantica_url && (
                  <a
                    href={f.fragrantica_url}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-[12px] text-center mt-1 text-blue-700 hover:underline"
                  >
                    Fragrantica ↗
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
