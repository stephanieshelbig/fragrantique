'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

/* ------------ utils ------------ */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function makeSlug(brand = '', name = '') {
  const joined = `${brand || ''}-${name || ''}`;
  return joined.replace(/[^0-9A-Za-z]+/g, '-').replace(/^-+|-+$/g, '');
}

function bottleUrl(f) {
  return f?.image_url_transparent || f?.image_url || '/bottle-placeholder.png';
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createClient(url, anon);
}

function centsToMoney(cents, currency = 'usd') {
  if (cents == null) return '';
  const amt = Number(cents) / 100;
  const curr = (currency || 'usd').toLowerCase();
  // Avoid Intl to keep bundle small; simple prefix.
  const symbol = curr === 'usd' ? '$' : (curr === 'eur' ? '€' : `${curr.toUpperCase()} `);
  return `${symbol}${amt.toFixed(2)}`;
}

/* ------------ page ------------ */
export default function FragranceDetail({ params }) {
  const router = useRouter();
  // Works for either [id] or [slug] folder names:
  const routeParam = decodeURIComponent(params?.slug ?? params?.id ?? '');

  const [frag, setFrag] = useState(null);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');

  // Buyer UI state
  const [selectedId, setSelectedId] = useState('');
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState('');
  const [added, setAdded] = useState(false);

  // --- load fragrance by slug or legacy UUID, then load decant options
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      setHint('');
      setAdded(false);
      setMsg('');

      const sb = getSupabase();
      if (!sb) {
        setError('Missing Supabase environment variables.');
        setHint(
          'Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your Vercel environment.'
        );
        setLoading(false);
        return;
      }

      try {
        let f = null;

        if (UUID_RE.test(routeParam)) {
          // Legacy UUID URL
          const { data, error } = await sb
            .from('fragrances')
            .select('id, brand, name, slug, image_url, image_url_transparent, fragrantica_url, notes')
            .eq('id', routeParam)
            .maybeSingle();
          if (error) throw error;
          f = data || null;

          if (f) {
            const desired = f.slug?.trim() ? f.slug : makeSlug(f.brand, f.name);
            if (desired && desired !== routeParam) {
              router.replace(`/fragrance/${encodeURIComponent(desired)}`);
            }
          }
        } else {
          // Pretty slug URL (case-insensitive)
          const { data, error } = await sb
            .from('fragrances')
            .select('id, brand, name, slug, image_url, image_url_transparent, fragrantica_url, notes')
            .ilike('slug', routeParam) // equality but case-insensitive
            .maybeSingle();
          if (error) throw error;

          f = data || null;

          // Rare fallback to exact eq if ilike didn’t match
          if (!f) {
            const { data: eqRow, error: eqErr } = await sb
              .from('fragrances')
              .select('id, brand, name, slug, image_url, image_url_transparent, fragrantica_url, notes')
              .eq('slug', routeParam)
              .maybeSingle();
            if (eqErr) throw eqErr;
            f = eqRow || null;
          }
        }

        setFrag(f);

        // Load decant options for this fragrance
        if (f?.id) {
          const { data: ds, error: de } = await sb
            .from('decants')
            .select('id, label, price_cents, size_ml, currency, in_stock, quantity')
            .eq('fragrance_id', f.id)
            .order('size_ml', { ascending: true });
          if (de) throw de;

          const normalized = (ds || []).map((d) => ({
            id: d.id,
            label: d.label || 'Option',
            price_cents: d.price_cents ?? null,
            size_ml: d.size_ml ?? null,
            currency: (d.currency || 'usd').toLowerCase(),
            in_stock: d.in_stock ?? true,
            quantity: d.quantity === null || d.quantity === undefined ? null : Number(d.quantity)
          }));

          setOptions(normalized);
          if (normalized.length) setSelectedId(String(normalized[0].id));
        } else {
          setOptions([]);
        }

        if (!f) setError('Fragrance not found.');
      } catch (e) {
        setError(e?.message || 'Unknown error while loading fragrance.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeParam]);

  const selectedOpt = useMemo(
    () => options.find((o) => String(o.id) === String(selectedId)),
    [options, selectedId]
  );

  function loadCart() {
    try { return JSON.parse(localStorage.getItem('cart_v1') || '[]'); } catch { return []; }
  }
  function saveCart(arr) { localStorage.setItem('cart_v1', JSON.stringify(arr)); }

  function handleAddToCart() {
    setMsg('');
    setAdded(false);

    const opt = selectedOpt || options.find((o) => o.in_stock) || null;
    if (!opt) { setMsg('Please select an option that is in stock.'); return; }
    if (!opt.price_cents || opt.price_cents <= 0) { setMsg('This option is not available for purchase right now.'); return; }

    const q = Math.max(1, parseInt(qty, 10) || 1);

    // Respect stock quantity if limited
    if (opt.quantity !== null && typeof opt.quantity === 'number') {
      const cart = loadCart();
      const already = cart
        .filter((i) => String(i.option_id) === String(opt.id))
        .reduce((sum, i) => sum + (parseInt(i.quantity, 10) || 0), 0);
      const remaining = Math.max(0, Number(opt.quantity) - already);

      if (remaining <= 0) {
        setMsg(`"${opt.label}" is already at the limit in your cart (${already}/${opt.quantity}).`);
        return;
      }
      if (q > remaining) {
        setMsg(`Only ${remaining} left for "${opt.label}" (you already have ${already} in your cart).`);
        return;
      }
    }

    const item = {
      name: `${frag?.brand || ''} — ${frag?.name || ''} (${opt.label})`,
      quantity: q,
      unit_amount: opt.price_cents,
      currency: opt.currency || 'usd',
      fragrance_id: frag?.id,
      option_id: opt.id,
    };

    const cart = loadCart();
    cart.push(item);
    saveCart(cart);
    setAdded(true);
  }

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
        <Link href="/brand" className="underline text-sm">← Back to Brand Index</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/brand" className="underline text-sm">← Back to Brand Index</Link>
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
            <div className={`mt-1 text-sm whitespace-pre-wrap ${frag.notes ? '' : 'opacity-60'}`}>
              {frag.notes || 'No notes provided.'}
            </div>
          </div>

          {/* Purchase panel */}
          <div className="p-3 rounded border bg-white space-y-3">
            <div className="font-medium">Choose an option</div>

            <div>
              <label className="block text-sm font-medium mb-1">Option</label>
              <select
                className="border rounded px-3 py-2 w-full"
                value={selectedId}
                onChange={(e) => { setSelectedId(e.target.value); setMsg(''); setAdded(false); }}
              >
                {options.length === 0 && <option>— No options —</option>}
                {options.map((o) => (
                  <option key={o.id} value={o.id} disabled={!o.in_stock}>
                    {o.label}
                    {o.size_ml ? ` · ${o.size_ml} mL` : ''}
                    {o.price_cents != null ? ` · ${centsToMoney(o.price_cents, o.currency)}` : ''}
                    {!o.in_stock ? ' (out of stock)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  className="border rounded px-3 py-2 w-full"
                  value={qty}
                  onChange={(e) => { setQty(e.target.value); setMsg(''); setAdded(false); }}
                />
              </div>
              <div className="self-end text-sm text-gray-600">
                {selectedOpt?.quantity === null
                  ? 'Unlimited stock'
                  : `In stock: ${selectedOpt?.quantity}`}
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              className="mt-1 px-4 py-2 rounded bg-black text-white hover:opacity-90 disabled:opacity-60"
              disabled={!selectedOpt || !selectedOpt.in_stock || !selectedOpt.price_cents}
            >
              Add to cart
            </button>

            {added && (
              <div className="text-sm p-2 rounded bg-green-50 border border-green-200">
                Added to cart. <Link href="/cart" className="underline">View cart →</Link>
              </div>
            )}

            {msg && <div className="text-sm p-2 rounded bg-white border mt-2">{msg}</div>}
          </div>
        </div>
      </div>

      <div className="text-sm">
        <Link className="underline" href="/cart">Go to cart →</Link>
      </div>
    </div>
  );
}
