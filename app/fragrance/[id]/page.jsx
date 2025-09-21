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
function centsToDollars(c) {
  if (c == null) return '';
  return (Number(c) / 100).toFixed(2);
}

export default function FragranceDetail({ params }) {
  const id = decodeURIComponent(params.id || '');

  const [viewer, setViewer] = useState(null);
  const [owner, setOwner] = useState(null);
  const [isOwner, setIsOwner] = useState(false);

  const [frag, setFrag] = useState(null);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState('');
  const [qty, setQty] = useState('1');

  const [newLabel, setNewLabel] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newSize, setNewSize] = useState('');
  const [newCurrency, setNewCurrency] = useState('usd');

  const [msg, setMsg] = useState('');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Viewer
        const { data: { user } } = await supabase.auth.getUser();
        setViewer(user || null);

        // Owner = @stephanie
        const { data: ownerProf } = await supabase
          .from('profiles')
          .select('id, username, is_admin')
          .eq('username', 'stephanie')
          .maybeSingle();
        setOwner(ownerProf || null);
        setIsOwner(!!(user && ownerProf && user.id === ownerProf.id));

        // Fragrance with notes
        const { data: f } = await supabase
          .from('fragrances')
          .select('id, brand, name, image_url, image_url_transparent, fragrantica_url, notes')
          .eq('id', id)
          .maybeSingle();
        setFrag(f || null);

        // Decant options
        const { data: ds, error: de } = await supabase
          .from('decants')
          .select('id, label, price_cents, size_ml, currency, in_stock, quantity')
          .eq('fragrance_id', id)
          .order('size_ml', { ascending: true });
        if (!de && Array.isArray(ds)) {
          const mapped = ds.map((d) => ({
            ...d,
            currency: (d.currency || 'usd').toLowerCase(),
            in_stock: d.in_stock ?? true,
            quantity: (d.quantity ?? null) === null ? null : Number(d.quantity),
          }));
          setOptions(mapped);
          if (!selectedId && mapped.length) setSelectedId(String(mapped[0].id));
        } else {
          setOptions([]);
        }
      } catch {
        setOptions([]);
      }

      setLoading(false);
    })();
  }, [id]);

  const img = frag?.image_url_transparent || frag?.image_url || '/bottle-placeholder.png';
  const displayName = frag ? `${frag.brand || ''} — ${frag.name || ''}`.trim() : 'Fragrance';

  const selectedOpt = useMemo(
    () => options.find((o) => String(o.id) === String(selectedId)),
    [options, selectedId]
  );

  // ---------- CART ----------
  function loadCart() {
    try { return JSON.parse(localStorage.getItem('cart_v1') || '[]'); } catch { return []; }
  }
  function saveCart(arr) {
    localStorage.setItem('cart_v1', JSON.stringify(arr));
  }
  function handleAddToCart() {
    setMsg(''); setAdded(false);
    const opt = selectedOpt || options.find((o) => o.in_stock) || null;
    if (!opt) { setMsg('Please select an option that is in stock.'); return; }
    if (!opt.price_cents || opt.price_cents <= 0) {
      setMsg('This option is not available for purchase right now.'); return;
    }

    // Enforce stock if finite
    if (opt.quantity !== null && typeof opt.quantity === 'number') {
      const desired = Math.max(1, parseInt(qty, 10) || 1);
      if (desired > opt.quantity) {
        setMsg(`Only ${opt.quantity} left for "${opt.label}".`);
        return;
      }
      if (opt.quantity <= 0) {
        setMsg(`"${opt.label}" is out of stock.`);
        return;
      }
    }

    const q = Math.max(1, parseInt(qty, 10) || 1);
    const item = {
      name: `${displayName} (${opt.label})`,
      quantity: q,
      unit_amount: opt.price_cents,
      currency: opt.currency || 'usd',
      fragrance_id: frag?.id,
      option_id: opt.id,
    };
    const cart = loadCart(); cart.push(item); saveCart(cart); setAdded(true);
  }

  // ---------- ADMIN: manage options ----------
  async function saveOption(row) {
    if (!isOwner || !owner?.id || !frag?.id) { setMsg('Not authorized'); return; }
    const up = {
      id: row.id || undefined,
      fragrance_id: frag.id,
      seller_user_id: owner.id,               // <<< IMPORTANT
      label: row.label?.trim() || 'Option',
      price_cents:
        typeof row.price_cents === 'number'
          ? row.price_cents
          : dollarsToCents(row.price_dollars || ''),
      size_ml: row.size_ml ? Number(row.size_ml) : null,
      currency: (row.currency || 'usd').toLowerCase(),
      in_stock: !!row.in_stock,
      quantity:
        row.quantity === '' || row.quantity === null || row.quantity === undefined
          ? null
          : Math.max(0, Number(row.quantity) || 0),
    };
    const { data, error } = await supabase
      .from('decants')
      .upsert(up)
      .select('id, label, price_cents, size_ml, currency, in_stock, quantity')
      .maybeSingle();
    if (error) { setMsg(error.message); return; }
    setOptions((prev) => prev.map((o) => (o.id === row.id ? { ...o, ...data } : o)));
    if (!selectedId) setSelectedId(String(data.id));
    setMsg('Option saved ✓');
  }

  async function addNewOption() {
    if (!isOwner || !owner?.id || !frag?.id) { setMsg('Not authorized'); return; }
    const payload = {
      fragrance_id: frag.id,
      seller_user_id: owner.id,               // <<< IMPORTANT
      label: newLabel?.trim() || 'Option',
      price_cents: dollarsToCents(newPrice),
      size_ml: newSize ? Number(newSize) : null,
      currency: newCurrency.toLowerCase(),
      in_stock: true,
      quantity: null, // null = unlimited
    };
    const { data, error } = await supabase
      .from('decants')
      .insert(payload)
      .select('id, label, price_cents, size_ml, currency, in_stock, quantity')
      .maybeSingle();
    if (error) { setMsg(error.message); return; }
    setOptions((prev) => [...prev, data]);
    setSelectedId(String(data.id));
    setNewLabel(''); setNewPrice(''); setNewSize(''); setNewCurrency('usd');
    setMsg('Option added ✓');
  }

  async function deleteOption(idToDelete) {
    if (!isOwner) return;
    const { error } = await supabase.from('decants').delete().eq('id', idToDelete);
    if (error) { setMsg(error.message); return; }
    setOptions((prev) => prev.filter((o) => o.id !== idToDelete));
    if (String(selectedId) === String(idToDelete)) {
      setSelectedId(options.length ? String(options[0].id) : '');
    }
    setMsg('Deleted option ✓');
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (!frag) {
    return (
      <div className="p-6">
        <div className="text-sm mb-3"><Link href="/explore" className="underline">← Back</Link></div>
        Not found.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="text-sm mb-3"><Link href="/explore" className="underline">← Back</Link></div>

      <div className="grid md:grid-cols-[280px,1fr] gap-6">
        <div className="bg-white border rounded p-4 flex items-center justify-center">
          {/* Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img} alt={displayName} className="max-h-64 object-contain" />
        </div>

        <div className="space-y-4">
          <div>
            <div className="text-2xl font-semibold">{displayName}</div>
            {frag?.fragrantica_url && (
              <a className="text-sm underline opacity-70" href={frag.fragrantica_url} target="_blank">View on Fragrantica →</a>
            )}
          </div>

          {/* BUYER: choose option + qty */}
          <div className="p-4 border rounded space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Decant option</label>
                <select
                  className="border rounded px-3 py-2 w-full"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  {options.map((o) => (
                    <option key={o.id} value={o.id} disabled={!o.in_stock}>
                      {o.label}{!o.in_stock ? ' (out of stock)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-sm">
                {selectedOpt ? (
                  <>
                    <div className="opacity-70">Price</div>
                    <div className="font-medium">
                      ${centsToDollars(selectedOpt.price_cents)} {String(selectedOpt.currency || 'usd').toUpperCase()}
                    </div>
                    {selectedOpt.quantity === null ? (
                      <div className="opacity-60 text-xs mt-1">Unlimited</div>
                    ) : (
                      <div className="opacity-60 text-xs mt-1">{selectedOpt.quantity} left</div>
                    )}
                  </>
                ) : <div className="opacity-60">—</div>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
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

            <button onClick={handleAddToCart} className="mt-1 px-4 py-2 rounded bg-black text-white hover:opacity-90">
              Add to cart
            </button>

            {added && (
              <div className="text-sm p-2 rounded bg-green-50 border border-green-200">
                Added to cart. <Link href="/cart" className="underline">View cart →</Link>
              </div>
            )}

            {msg && <div className="text-sm p-2 rounded bg-white border mt-2">{msg}</div>}
          </div>

          {/* OWNER: manage options */}
          {isOwner && (
            <div className="space-y-4">
              <div className="text-sm opacity-70">Create options like <b>2 mL decant</b>, <b>10 mL decant</b>, or <b>Full Bottle</b>.</div>

              <div className="border rounded divide-y">
                {options.map((o) => (
                  <div key={o.id} className="p-3 grid sm:grid-cols-7 gap-3 items-end">
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
                                ? {
                                    ...x,
                                    quantity:
                                      e.target.value === '' ? null : Math.max(0, Number(e.target.value) || 0),
                                    in_stock:
                                      e.target.value === ''
                                        ? x.in_stock
                                        : (Math.max(0, Number(e.target.value) || 0) > 0) && x.in_stock,
                                  }
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
                <div className="grid sm:grid-cols-6 gap-3 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium mb-1">Label</label>
                    <input
                      className="border rounded px-2 py-1 w-full"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Size (mL)</label>
                    <input
                      type="number"
                      className="border rounded px-2 py-1 w-full"
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
                  <div className="sm:col-span-2 flex sm:justify-end">
                    <button onClick={addNewOption} className="px-3 py-2 rounded bg-black text-white text-xs">
                      Add option
                    </button>
                  </div>
                </div>
              </div>

              {msg && <div className="text-sm p-2 rounded bg-white border">{msg}</div>}

              <div className="text-xs opacity-60">
                Visitors won’t see prices here. They’ll just pick an option and quantity, then add to cart.
              </div>
            </div>
          )}

        </div>
      </div>

      {!isOwner && <div className="text-sm"><Link className="underline" href="/cart">Go to cart →</Link></div>}
    </div>
  );
}
