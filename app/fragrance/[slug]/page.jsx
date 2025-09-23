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

// Money helpers
function dollarsToCents(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/[^0-9.]/g, ''));
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}
function centsToDollars(c) {
  if (c == null) return '';
  return (Number(c) / 100).toFixed(2);
}
function centsToMoney(cents, currency = 'usd') {
  if (cents == null) return '';
  const amt = Number(cents) / 100;
  const curr = (currency || 'usd').toLowerCase();
  const symbol = curr === 'usd' ? '$' : (curr === 'eur' ? '€' : `${curr.toUpperCase()} `);
  return `${symbol}${amt.toFixed(2)}`;
}

/* ------------ page ------------ */
export default function FragranceDetail({ params }) {
  const router = useRouter();
  // Works for either [id] or [slug] folder names:
  const routeParam = decodeURIComponent(params?.slug ?? params?.id ?? '');

  // auth / ownership
  const [viewer, setViewer] = useState(null);
  const [owner, setOwner] = useState(null);       // @stephanie profile
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // data
  const [frag, setFrag] = useState(null);
  const [options, setOptions] = useState([]);

  // ui state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');

  // buyer UI
  const [selectedId, setSelectedId] = useState('');
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState('');
  const [added, setAdded] = useState(false);

  // admin new option
  const [newLabel, setNewLabel] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newSize, setNewSize] = useState('');
  const [newCurrency, setNewCurrency] = useState('usd');
  const [newQuantity, setNewQuantity] = useState('');

  // --- load everything (auth, owner, fragrance, decants)
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
        setHint('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your Vercel environment.');
        setLoading(false);
        return;
      }

      try {
        // Who am I?
        const { data: auth } = await sb.auth.getUser();
        const user = auth?.user || null;
        setViewer(user);

        // Viewer profile (for is_admin)
        if (user?.id) {
          const { data: prof } = await sb
            .from('profiles')
            .select('id, username, is_admin')
            .eq('id', user.id)
            .maybeSingle();
          setIsAdmin(!!prof?.is_admin);
        } else {
          setIsAdmin(false);
        }

        // Boutique owner (@stephanie)
        const { data: ownerProf } = await sb
          .from('profiles')
          .select('id, username, is_admin')
          .eq('username', 'stephanie')
          .maybeSingle();
        setOwner(ownerProf || null);
        setIsOwner(!!(user && ownerProf && user.id === ownerProf.id));

        // Load fragrance by slug (preferred) or UUID (legacy)
        let f = null;
        if (UUID_RE.test(routeParam)) {
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
          const { data, error } = await sb
            .from('fragrances')
            .select('id, brand, name, slug, image_url, image_url_transparent, fragrantica_url, notes')
            .ilike('slug', routeParam)
            .maybeSingle();
          if (error) throw error;
          f = data || null;

          // Rare fallback exact match
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

        // Load decant options
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
            quantity: d.quantity === null || d.quantity === undefined ? null : Number(d.quantity),
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

  /* ------------ cart helpers (buyer) ------------ */
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

  /* ------------ admin CRUD for decants ------------ */
  const canAdmin = isOwner || isAdmin;

  async function saveOption(row) {
    if (!canAdmin || !frag?.id) { setMsg('Not authorized'); return; }
    const sb = getSupabase(); if (!sb) { setMsg('Missing Supabase env.'); return; }

    const up = {
      id: row.id || undefined,
      fragrance_id: frag.id,
      seller_user_id: owner?.id || null, // if you track ownership
      label: row.label?.trim() || 'Option',
      price_cents: typeof row.price_cents === 'number'
        ? row.price_cents
        : dollarsToCents(row.price_dollars || ''),
      size_ml: row.size_ml ? Number(row.size_ml) : null,
      currency: (row.currency || 'usd').toLowerCase(),
      in_stock: !!row.in_stock,
      quantity: row.quantity === '' || row.quantity == null ? null : Math.max(0, Number(row.quantity) || 0),
    };

    const { data, error } = await sb
      .from('decants')
      .upsert(up)
      .select('id, label, price_cents, size_ml, currency, in_stock, quantity')
      .maybeSingle();

    if (error) { setMsg(error.message); return; }

    setOptions((prev) =>
      prev.map((o) => (o.id === row.id ? { ...o, ...data } : o))
    );
    if (!selectedId) setSelectedId(String(data.id));
    setMsg('Option saved ✓');
  }

  async function addNewOption() {
    if (!canAdmin || !frag?.id) { setMsg('Not authorized'); return; }
    const sb = getSupabase(); if (!sb) { setMsg('Missing Supabase env.'); return; }

    const payload = {
      fragrance_id: frag.id,
      seller_user_id: owner?.id || null,
      label: newLabel?.trim() || 'Option',
      price_cents: dollarsToCents(newPrice),
      size_ml: newSize ? Number(newSize) : null,
      currency: (newCurrency || 'usd').toLowerCase(),
      in_stock: true,
      quantity: newQuantity === '' || newQuantity == null ? null : Math.max(0, Number(newQuantity) || 0),
    };

    const { data, error } = await sb
      .from('decants')
      .insert(payload)
      .select('id, label, price_cents, size_ml, currency, in_stock, quantity')
      .maybeSingle();

    if (error) { setMsg(error.message); return; }

    setOptions((prev) => [...prev, data]);
    setSelectedId(String(data.id));
    setNewLabel(''); setNewPrice(''); setNewSize(''); setNewCurrency('usd'); setNewQuantity('');
    setMsg('Added option ✓');
  }

  async function deleteOption(idToDelete) {
    if (!canAdmin) { setMsg('Not authorized'); return; }
    const sb = getSupabase(); if (!sb) { setMsg('Missing Supabase env.'); return; }

    const { error } = await sb.from('decants').delete().eq('id', idToDelete);
    if (error) { setMsg(error.message); return; }

    setOptions((prev) => prev.filter((o) => o.id !== idToDelete));
    if (String(selectedId) === String(idToDelete)) {
      const next = options.filter((o) => o.id !== idToDelete);
      setSelectedId(next.length ? String(next[0].id) : '');
    }
    setMsg('Deleted option ✓');
  }

  /* ------------ render ------------ */
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

          {/* Purchase panel (buyer) */}
          {!canAdmin && (
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
          )}

          {/* Admin panel */}
          {canAdmin && (
            <div className="p-3 rounded border bg-white space-y-4">
              <div className="font-medium">Manage options</div>

              <div className="border rounded divide-y">
                {options.map((o) => (
                  <div key={o.id} className="p-3 grid sm:grid-cols-8 gap-3 items-end">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium mb-1">Label</label>
                      <input
                        className="border rounded px-2 py-1 w-full"
                        value={o.label || ''}
                        onChange={(e) =>
                          setOptions((prev) => prev.map((x) => x.id === o.id ? { ...x, label: e.target.value } : x))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Size (mL)</label>
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-full"
                        value={o.size_ml ?? ''}
                        onChange={(e) =>
                          setOptions((prev) => prev.map((x) => x.id === o.id ? { ...x, size_ml: e.target.value } : x))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Price (USD)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="border rounded px-2 py-1 w-full"
                        value={centsToDollars(o.price_cents)}
                        onChange={(e) =>
                          setOptions((prev) =>
                            prev.map((x) =>
                              x.id === o.id
                                ? { ...x, price_cents: dollarsToCents(e.target.value) }
                                : x
                            )
                          )
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Currency</label>
                      <select
                        className="border rounded px-2 py-1 w-full"
                        value={o.currency || 'usd'}
                        onChange={(e) =>
                          setOptions((prev) => prev.map((x) => x.id === o.id ? { ...x, currency: e.target.value } : x))
                        }
                      >
                        <option value="usd">USD</option>
                        <option value="eur">EUR</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Quantity</label>
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-full"
                        placeholder="Leave blank for unlimited"
                        value={o.quantity ?? ''}
                        onChange={(e) =>
                          setOptions((prev) =>
                            prev.map((x) =>
                              x.id === o.id
                                ? { ...x, quantity: e.target.value === '' ? null : Math.max(0, Number(e.target.value) || 0) }
                                : x
                            )
                          )
                        }
                      />
                      <div className="text-[11px] mt-1 opacity-70">
                        {o.quantity === null ? 'Unlimited' : `${o.quantity} left`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id={`stock-${o.id}`}
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!o.in_stock}
                        onChange={(e) =>
                          setOptions((prev) =>
                            prev.map((x) => x.id === o.id ? { ...x, in_stock: e.target.checked } : x)
                          )
                        }
                      />
                      <label htmlFor={`stock-${o.id}`} className="text-xs">In stock</label>
                    </div>
                    <div className="flex gap-2 sm:justify-end">
                      <button onClick={() => saveOption(o)} className="px-3 py-1.5 rounded bg-black text-white text-xs">
                        Save
                      </button>
                      <button onClick={() => deleteOption(o.id)} className="px-3 py-1.5 rounded border text-xs">
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {!options.length && <div className="p-3 text-sm opacity-70">No options yet.</div>}
              </div>

              <div className="p-3 border rounded space-y-2">
                <div className="font-medium text-sm">Add a new option</div>
                <div className="grid sm:grid-cols-8 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium mb-1">Label</label>
                    <input
                      className="border rounded px-2 py-1 w-full"
                      placeholder="e.g., 5 mL decant / Full Bottle"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Size (mL)</label>
                    <input
                      type="number"
                      className="border rounded px-2 py-1 w-full"
                      placeholder="e.g., 5 or 100"
                      value={newSize}
                      onChange={(e) => setNewSize(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Price (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="border rounded px-2 py-1 w-full"
                      placeholder="e.g., 24.00"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Currency</label>
                    <select
                      className="border rounded px-2 py-1 w-full"
                      value={newCurrency}
                      onChange={(e) => setNewCurrency(e.target.value)}
                    >
                      <option value="usd">USD</option>
                      <option value="eur">EUR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Quantity</label>
                    <input
                      type="number"
                      className="border rounded px-2 py-1 w-full"
                      placeholder="Leave blank for unlimited"
                      value={newQuantity}
                      onChange={(e) => setNewQuantity(e.target.value === '' ? '' : Math.max(0, Number(e.target.value) || 0))}
                    />
                    <div className="text-[11px] mt-1 opacity-70">
                      {newQuantity === '' ? 'Unlimited' : `${newQuantity} to start`}
                    </div>
                  </div>
                  <div className="sm:col-span-2 flex sm:justify-end">
                    <button onClick={addNewOption} className="px-3 py-2 rounded bg-black text-white text-xs">
                      Add option
                    </button>
                  </div>
                </div>
              </div>

              {msg && <div className="text-sm p-2 rounded bg-white border">{msg}</div>}
              <div className="text-xs opacity-60">
                Visitors see only the purchase panel; this admin section is visible to you (owner/admin) for managing options.
              </div>
            </div>
          )}
        </div>
      </div>

      {!canAdmin && (
        <div className="text-sm">
          <Link className="underline" href="/cart">Go to cart →</Link>
        </div>
      )}
    </div>
  );
}
