'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

function dollarsToCents(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/[^0-9.]/g, ''));
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}

export default function FragranceDetail({ params }) {
  const id = decodeURIComponent(params.id || '');

  const [loading, setLoading] = useState(true);
  const [frag, setFrag] = useState(null);
  const [decants, setDecants] = useState([]); // optional
  const [qty, setQty] = useState(1);
  const [selectedDecantId, setSelectedDecantId] = useState('');
  const [manualPrice, setManualPrice] = useState(''); // dollars
  const [currency, setCurrency] = useState('usd');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg('');

      // Load fragrance
      const { data: f } = await supabase
        .from('fragrances')
        .select('id, brand, name, image_url, image_url_transparent')
        .eq('id', id)
        .maybeSingle();

      setFrag(f || null);

      // Try to load decants (if table exists)
      try {
        const { data: ds, error } = await supabase
          .from('decants')
          .select('id, size_ml, label, price_cents, price_usd, currency')
          .eq('fragrance_id', id)
          .order('size_ml', { ascending: true });

        if (!error && Array.isArray(ds)) {
          setDecants(
            ds.map((d) => ({
              id: d.id,
              label:
                d.label ||
                (d.size_ml ? `${d.size_ml} ml` : 'Decant'),
              // Prefer price_cents; fallback to price_usd*100
              price_cents:
                typeof d.price_cents === 'number' && d.price_cents > 0
                  ? d.price_cents
                  : dollarsToCents(d.price_usd),
              currency: (d.currency || 'usd').toLowerCase(),
            }))
          );
          if (ds.length) setCurrency((ds[0].currency || 'usd').toLowerCase());
        }
      } catch {
        // Table might not exist; ignore
      }

      setLoading(false);
    })();
  }, [id]);

  const chosenPriceCents = useMemo(() => {
    if (selectedDecantId) {
      const d = decants.find((x) => String(x.id) === String(selectedDecantId));
      if (d?.price_cents) return d.price_cents;
    }
    const manual = dollarsToCents(manualPrice);
    return manual && manual > 0 ? manual : null;
  }, [selectedDecantId, decants, manualPrice]);

  const img = frag?.image_url_transparent || frag?.image_url || '/bottle-placeholder.png';
  const displayName = frag ? `${frag.brand || ''} — ${frag.name || ''}`.trim() : 'Fragrance';

  async function onCheckout() {
    setMsg('');
    const cents = chosenPriceCents;
    if (!cents || cents <= 0) {
      setMsg('Please select a decant or enter a valid price.');
      return;
    }
    const q = Math.max(1, parseInt(qty, 10) || 1);

    const label = selectedDecantId
      ? (() => {
          const d = decants.find((x) => String(x.id) === String(selectedDecantId));
          return d ? ` (${d.label})` : '';
        })()
      : manualPrice
        ? ` (${Number(manualPrice)} ${currency.toUpperCase()})`
        : '';

    const item = {
      name: `${displayName}${label}`,
      quantity: q,
      unit_amount: cents, // <— IMPORTANT: cents
      currency,
      fragrance_id: frag?.id,
    };

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [item] }),
      });
      const j = await res.json();
      if (!res.ok || !j?.url) {
        setMsg(j?.error || 'Checkout failed.');
        return;
      }
      window.location.href = j.url;
    } catch (e) {
      setMsg(e.message || 'Checkout failed.');
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (!frag) {
    return (
      <div className="p-6">
        <div className="mb-3">Fragrance not found.</div>
        <Link href="/brand" className="underline">← Back to Brand index</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <Link href={`/u/stephanie`} className="underline text-sm">← Back to boutique</Link>

      <div className="flex gap-6">
        <div className="relative w-48 h-64">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img}
            alt={frag.name}
            className="absolute inset-0 w-full h-full object-contain"
            style={{ mixBlendMode: 'multiply', filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.18))' }}
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
          <h1 className="text-2xl font-bold">{frag.brand}</h1>
          <div className="text-lg">{frag.name}</div>

          <div className="mt-4 space-y-3">
            {decants.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1">Decant</label>
                <select
                  className="border rounded px-3 py-2 w-full"
                  value={selectedDecantId}
                  onChange={(e) => setSelectedDecantId(e.target.value)}
                >
                  <option value="">— Choose a decant —</option>
                  {decants.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label} — {(d.price_cents / 100).toFixed(2)} {d.currency.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Or enter price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  className="border rounded px-3 py-2 w-full"
                  placeholder="e.g. 24.00"
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  className="border rounded px-3 py-2 w-full"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
              </div>
            </div>

            <div className="text-sm opacity-70">
              Currency: <span className="font-mono">{currency.toUpperCase()}</span>
              {chosenPriceCents ? (
                <> · Total: <b>{((chosenPriceCents * Math.max(1, parseInt(qty,10)||1))/100).toFixed(2)} {currency.toUpperCase()}</b></>
              ) : null}
            </div>

            <button
              onClick={onCheckout}
              className="mt-2 px-4 py-2 rounded bg-black text-white hover:opacity-90"
            >
              Checkout
            </button>

            {msg && <div className="mt-2 text-sm p-2 rounded bg-white border">{msg}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
