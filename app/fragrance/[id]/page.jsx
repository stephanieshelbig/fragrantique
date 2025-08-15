'use client';

import { useEffect, useMemo, useState } from 'react';
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

  const [viewer, setViewer] = useState(null);
  const [owner, setOwner] = useState(null); // @stephanie profile
  const [frag, setFrag] = useState(null);
  const [decants, setDecants] = useState([]);
  const [ownerNote, setOwnerNote] = useState(''); // stephanie's note (from user_fragrances.note)
  const [editingNote, setEditingNote] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const [qty, setQty] = useState(1);
  const [selectedDecantId, setSelectedDecantId] = useState('');
  const [manualPrice, setManualPrice] = useState(''); // dollars
  const [currency, setCurrency] = useState('usd');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  // Load viewer + owner profile + fragrance + decants + owner note
  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg('');

      // Who am I?
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user || null;
      setViewer(user);

      // Boutique owner (Stephanie)
      const { data: ownerProf } = await supabase
        .from('profiles')
        .select('id, username, is_admin')
        .eq('username', 'stephanie')
        .maybeSingle();

      setOwner(ownerProf || null);

      // Fragrance
      const { data: f } = await supabase
        .from('fragrances')
        .select('id, brand, name, image_url, image_url_transparent, fragrantica_url')
        .eq('id', id)
        .maybeSingle();

      setFrag(f || null);

      // Decants (optional table)
      try {
        const { data: ds, error: de } = await supabase
          .from('decants')
          .select('id, size_ml, label, price_cents, price_usd, currency, in_stock')
          .eq('fragrance_id', id)
          .order('size_ml', { ascending: true });
        if (!de && Array.isArray(ds)) {
          const mapped = ds.map((d) => ({
            id: d.id,
            label: d.label || (d.size_ml ? `${d.size_ml} ml` : 'Decant'),
            price_cents:
              typeof d.price_cents === 'number' && d.price_cents > 0
                ? d.price_cents
                : dollarsToCents(d.price_usd),
            currency: (d.currency || 'usd').toLowerCase(),
            in_stock: d.in_stock ?? true,
          }));
          setDecants(mapped);
          if (mapped.length) setCurrency(mapped[0].currency);
        }
      } catch {
        // table might not exist; ignore
      }

      // Owner note: read from user_fragrances.note for @stephanie
      if (ownerProf?.id) {
        try {
          const { data: link, error: le } = await supabase
            .from('user_fragrances')
            .select('note')
            .eq('user_id', ownerProf.id)
            .eq('fragrance_id', id)
            .maybeSingle();
          if (!le && link?.note != null) setOwnerNote(link.note || '');
        } catch {
          // ignore
        }
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

  const isOwner =
    viewer?.id && owner?.id && String(viewer.id) === String(owner.id);

  async function saveNote() {
    if (!isOwner || !owner?.id || !frag?.id) return;
    setSavingNote(true);
    setMsg('');
    try {
      // Ensure a shelf link row exists for owner+fragrance, then update note
      // 1) upsert link (in case fragrance isn't on shelves yet)
      await supabase
        .from('user_fragrances')
        .upsert(
          { user_id: owner.id, fragrance_id: frag.id, note: ownerNote, manual: true },
          { onConflict: 'user_id,fragrance_id' }
        );

      setEditingNote(false);
      setMsg('Comment saved ✓');
    } catch (e) {
      setMsg(e.message || 'Failed to save comment');
    } finally {
      setSavingNote(false);
    }
  }

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
      unit_amount: cents, // cents for Stripe
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
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/u/stephanie" className="underline text-sm">← Back to boutique</Link>
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
        {/* Bottle */}
        <div className="relative w-44 sm:w-52 md:w-56 aspect-[3/5]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={img}
            alt={frag.name}
            className="absolute inset-0 w-full h-full object-contain"
            style={{ mixBlendMode: 'multiply', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.18))' }}
            onError={(e) => {
              const el = e.currentTarget;
              if (!el.dataset.fallback) {
                el.dataset.fallback = '1';
                el.src = '/bottle-placeholder.png';
              }
            }}
          />
        </div>

        {/* Details */}
        <div className="flex-1 space-y-4">
          <div>
            <h1 className="text-2xl font-bold leading-tight">{frag.brand}</h1>
            <div className="text-lg">{frag.name}</div>
          </div>

          {/* Owner comment (from Stephanie) */}
          <div className="p-3 rounded border bg-white">
            <div className="flex items-center justify-between">
              <div className="font-medium">Owner’s notes</div>
              {isOwner && !editingNote && (
                <button
                  onClick={() => setEditingNote(true)}
                  className="text-xs underline"
                >
                  Edit
                </button>
              )}
            </div>

            {!editingNote && (
              <div className={`mt-1 text-sm ${ownerNote ? '' : 'opacity-60'}`}>
                {ownerNote || 'No notes yet.'}
              </div>
            )}

            {editingNote && isOwner && (
              <div className="mt-2 space-y-2">
                <textarea
                  className="w-full border rounded p-2 text-sm"
                  rows={4}
                  value={ownerNote}
                  onChange={(e) => setOwnerNote(e.target.value)}
                  placeholder="What do you think about this fragrance?"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveNote}
                    disabled={savingNote}
                    className="px-3 py-1.5 rounded bg-black text-white text-sm disabled:opacity-60"
                  >
                    {savingNote ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditingNote(false)}
                    className="px-3 py-1.5 rounded border text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Decants / price */}
          <div className="p-3 rounded border bg-white space-y-3">
            <div className="font-medium">Buy a decant</div>

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
                    <option key={d.id} value={d.id} disabled={!d.in_stock}>
                      {d.label} — {(d.price_cents / 100).toFixed(2)} {d.currency.toUpperCase()}
                      {!d.in_stock ? ' (out of stock)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Or enter price
                </label>
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
                <>
                  {' '}· Total:{' '}
                  <b>
                    {(
                      (chosenPriceCents * Math.max(1, parseInt(qty, 10) || 1)) /
                      100
                    ).toFixed(2)}{' '}
                    {currency.toUpperCase()}
                  </b>
                </>
              ) : null}
            </div>

            <button
              onClick={onCheckout}
              className="mt-1 px-4 py-2 rounded bg-black text-white hover:opacity-90"
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
