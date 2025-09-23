'use client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

// ---------- utils ----------
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function makeSlug(brand = '', name = '') {
  const joined = `${brand || ''}-${name || ''}`;
  return joined
    .replace(/[^0-9A-Za-z]+/g, '-') // non-alphanumerics -> hyphen
    .replace(/^-+|-+$/g, '');       // trim hyphens
}

function bottleUrl(f) {
  return f?.image_url_transparent || f?.image_url || '/bottle-placeholder.png';
}

// Create client lazily (client-only)
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createClient(url, anon);
}

// ---------- page ----------
export default function FragranceDetail({ params }) {
  const router = useRouter();
  const slugParam = decodeURIComponent(params.slug || '');

  const [frag, setFrag] = useState(null);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [loading, setLoading] = useState(true);

  // Load fragrance by slug (preferred) or by legacy UUID (then redirect)
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      setHint('');

      const sb = getSupabase();
      if (!sb) {
        setError('Missing Supabase env vars.');
        setHint(
          'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel for this environment.'
        );
        setLoading(false);
        return;
      }

      try {
        let f = null;

        if (UUID_RE.test(slugParam)) {
          // legacy URL with id
          const { data, error } = await sb
            .from('fragrances')
            .select(
              'id, brand, name, slug, image_url, image_url_transparent, fragrantica_url, notes'
            )
            .eq('id', slugParam)
            .maybeSingle();
          if (error) throw error;
          f = data || null;

          if (f) {
            const desired = f.slug?.trim()
              ? f.slug
              : makeSlug(f.brand, f.name);

            // redirect to pretty slug if needed
            if (desired && desired !== slugParam) {
              router.replace(`/fragrance/${encodeURIComponent(desired)}`);
            }
          }
        } else {
          // pretty URL with slug (case-insensitive match)
          const { data, error } = await sb
            .from('fragrances')
            .select(
              'id, brand, name, slug, image_url, image_url_transparent, fragrantica_url, notes'
            )
            .ilike('slug', slugParam) // ILIKE without wildcards -> case-insensitive equality
            .maybeSingle();
          if (error) throw error;

          // fallback to exact eq if ilike doesn’t match (rare)
          if (!data) {
            const { data: eqRow, error: eqErr } = await sb
              .from('fragrances')
              .select(
                'id, brand, name, slug, image_url, image_url_transparent, fragrantica_url, notes'
              )
              .eq('slug', slugParam)
              .maybeSingle();
            if (eqErr) throw eqErr;
            f = eqRow || null;
          } else {
            f = data;
          }
        }

        setFrag(f);
        if (!f) setError('Fragrance not found.');
      } catch (e) {
        setError(e?.message || 'Unknown error while loading fragrance.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugParam]);

  if (loading) return <div className="p-6">Loading…</div>;

  if (!frag) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-3">
        <div className="text-lg font-semibold">Fragrance not found</div>
        {error && <div className="text-sm text-red-700">{error}</div>}
        {hint && (
          <div className="text-sm text-amber-800 bg-amber-50 border rounded px-3 py-2">
            {hint}
          </div>
        )}
        <Link href="/brand" className="underline text-sm">
          ← Back to Brand Index
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/brand" className="underline text-sm">
          ← Back to Brand Index
        </Link>
        {frag.fragrantica_url && (
          <a
            href={frag.fragrantica_url}
            target="_blank"
            rel="noreferrer"
            className="text-sm underline"
          >
            View on Fragrantica ↗
          </a>
        )}
      </div>

      <div className="flex gap-6">
        <div className="relative w-44 sm:w-52 md:w-56 aspect-[3/5]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bottleUrl(frag)}
            alt={frag.name}
            className="absolute inset-0 w-full h-full object-contain"
            style={{
              mixBlendMode: 'multiply',
              filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.18))',
            }}
            onError={(e) => {
              const el = e.currentTarget;
              if (!el.dataset.fallback) {
                el.dataset.fallback = '1';
                el.src = '/bottle-placeholder.png';
              }
            }}
          />
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-2xl font-bold leading-tight">{frag.brand}</h1>
            <div className="text-lg">{frag.name}</div>
          </div>

          <div className="p-3 rounded border bg-white">
            <div className="font-medium">Fragrance Notes</div>
            <div
              className={`mt-1 text-sm whitespace-pre-wrap ${
                frag.notes ? '' : 'opacity-60'
              }`}
            >
              {frag.notes || 'No notes provided.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
