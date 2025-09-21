'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase'; // ← NEW: to fetch live stock

export default function CartPage() {
  const [items, setItems] = useState([]);
  const [buyer, setBuyer] = useState({
    name: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    postal: '',
    country: 'US',
  });
  const [msg, setMsg] = useState('');

  // NEW: live stock map => { [option_id]: { quantity: number|null, in_stock: boolean } }
  const [stockMap, setStockMap] = useState({});

  useEffect(() => {
    try {
      const arr = JSON.parse(localStorage.getItem('cart_v1') || '[]');
      setItems(Array.isArray(arr) ? arr : []);
    } catch { setItems([]); }
    try {
      const b = JSON.parse(localStorage.getItem('cart_contact_v1') || '{}');
      setBuyer((prev) => ({ ...prev, ...b }));
    } catch {}
  }, []);

  // NEW: fetch live stock whenever the set of option_ids in the cart changes
  useEffect(() => {
    (async () => {
      try {
        const optionIds = Array.from(
          new Set(
            (items || [])
              .map((it) => (it?.option_id ? String(it.option_id) : null))
              .filter(Boolean)
          )
        );
        if (optionIds.length === 0) {
          setStockMap({});
          return;
        }
        const { data, error } = await supabase
          .from('decants')
          .select('id, quantity, in_stock')
          .in('id', optionIds);
        if (error || !Array.isArray(data)) {
          setStockMap({});
          return;
        }
        const map = {};
        for (const row of data) {
          map[String(row.id)] = {
            quantity: row.quantity === null ? null : Number(row.quantity),
            in_stock: !!row.in_stock,
          };
        }
        setStockMap(map);
      } catch {
        setStockMap({});
      }
    })();
  }, [JSON.stringify((items || []).map((it) => it?.option_id || null))]); // derive deps without changing your data flow

  function persist(next) {
    localStorage.setItem('cart_v1', JSON.stringify(next));
    setItems(next);
  }
  function saveBuyer(next) {
    localStorage.setItem('cart_contact_v1', JSON.stringify(next));
    setBuyer(next);
  }

  // NEW: helper — given a line index and desired qty, clamp against stock
  function clampQtyForIndex(i, desired) {
    const line = items[i];
    if (!line) return Math.max(1, parseInt(desired, 10) || 1);

    const optId = line.option_id ? String(line.option_id) : null;
    const qDesired = Math.max(1, parseInt(desired, 10) || 1);

    // no option_id → no stock tracking
    if (!optId) return qDesired;

    const info = stockMap[optId];
    // unknown stock → allow user change; server/webhook still enforces
    if (!info) return qDesired;

    // out of stock → clamp to 0 (we'll remove/complain)
    if (!info.in_stock) return 0;

    // unlimited → allow any positive
    if (info.quantity === null) return qDesired;

    // finite: total across all lines with same option_id must not exceed stock
    const otherTotal = items.reduce((sum, it, idx) => {
      if (idx === i) return sum;
      return String(it.option_id) === optId ? sum + (parseInt(it.quantity, 10) || 0) : sum;
    }, 0);
    const remaining = Math.max(0, Number(info.quantity) - otherTotal);
    return Math.min(qDesired, remaining);
  }

  function updateQty(i, q) {
    setMsg('');
    const clamped = clampQtyForIndex(i, q);
    // If clamp hits 0 (out of stock / no remaining after others), drop the line
    if (clamped <= 0) {
      const next = items.filter((_, idx) => idx !== i);
      persist(next);
      return;
    }
    const next = items.map((it, idx) => (idx === i ? { ...it, quantity: clamped } : it));
    // Friendly message if we reduced the desired quantity
    const desired = Math.max(1, parseInt(q, 10) || 1);
    if (clamped < desired) {
      const line = items[i];
      const info = line?.option_id ? stockMap[String(line.option_id)] : null;
      const left = info?.quantity ?? null;
      if (info && info.in_stock && left !== null) {
        setMsg(`Only ${left} left for "${line.name}".`);
      }
    }
    persist(next);
  }

  function removeItem(i) {
    persist(items.filter((_, idx) => idx !== i));
  }
  function clearCart() {
    persist([]);
  }

  const currency = (items[0]?.currency || 'usd').toUpperCase();
  const subtotalCents = useMemo(
    () => items.reduce((sum, it) => sum + (it.unit_amount * it.quantity), 0),
    [items]
  );
  const SHIPPING_CENTS = 500; // $5.00
  const TAX_RATE = 0.07;      // 7%
  const taxCents = Math.round(subtotalCents * TAX_RATE);
  const totalCents = subtotalCents + SHIPPING_CENTS + taxCents;

  const fmtMoney = (cents) => (cents / 100).toFixed(2);

  function validateBuyer() {
    if (!buyer.name || !buyer.address1 || !buyer.city || !buyer.state || !buyer.postal || !buyer.country) {
      setMsg('Please fill in name, address, city, state, postal code, and country.');
      return false;
    }
    return true;
  }

  // NEW: validate all lines against live stock before checkout
  function validateStock() {
    const problems = [];
    for (const it of items) {
      const qty = parseInt(it.quantity, 10) || 0;
      if (qty <= 0) {
        problems.push(`"${it.name}" has zero quantity.`);
        continue;
      }
      const optId = it.option_id ? String(it.option_id) : null;
      if (!optId) continue; // no tracking

      const info = stockMap[optId];
      if (!info) continue; // unknown → allow (server still enforces)

      if (!info.in_stock) {
        problems.push(`"${it.name}" is out of stock.`);
        continue;
      }
      if (info.quantity !== null && qty > Number(info.quantity)) {
        problems.push(`"${it.name}" exceeds stock. Max available is ${info.quantity}.`);
      }
    }
    return { ok: problems.length === 0, problems };
  }

  async function checkoutStripe() {
    setMsg('');
    if (!items.length) return;
    if (!validateBuyer()) return;

    // NEW: stock validation gate
    const { ok, problems } = validateStock();
    if (!ok) {
      setMsg(problems.join(' '));
      return;
    }

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, buyer }),
      });
      const j = await res.json();
      if (!res.ok || !j?.url) {
        setMsg(j?.error || 'Checkout failed');
        return;
      }
      window.location.href = j.url;
    } catch (e) {
      setMsg(e.message || 'Checkout failed');
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Cart</h1>
        <Link href="/u/stephanie" className="underline text-sm">← Back to boutique</Link>
      </div>

      {!items.length && (
        <div className="p-4 border rounded bg-white">
          Your cart is empty. <Link href="/u/stephanie" className="underline">Browse fragrances →</Link>
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className="space-y-3">
            {items.map((it, i) => {
              const info = it.option_id ? stockMap[String(it.option_id)] : undefined;
              const finite = info ? info.quantity !== null : false;
              const left = info ? info.quantity : null;
              const notInStock = info ? !info.in_stock : false;

              return (
                <div key={i} className="p-3 border rounded bg-white flex items-center gap-3">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{it.name}</div>
                    <div className="text-xs opacity-70">
                      Price: {(it.unit_amount/100).toFixed(2)} {it.currency.toUpperCase()}
                    </div>
                    {/* NEW: subtle stock hints */}
                    {notInStock && (
                      <div className="text-xs text-red-600 mt-1">Out of stock</div>
                    )}
                    {finite && !notInStock && (
                      <div className="text-xs opacity-70 mt-1">{left} left</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      className="border rounded px-2 py-1 w-20"
                      value={it.quantity}
                      onChange={(e) => updateQty(i, e.target.value)}
                    />
                    <button onClick={() => removeItem(i)} className="px-3 py-1.5 rounded border text-xs">Remove</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Shipping details */}
          <div className="p-4 border rounded bg-white space-y-3">
            <div className="font-medium">Shipping details</div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">Full name</label>
                <input className="border rounded px-3 py-2 w-full"
                  value={buyer.name} onChange={(e) => saveBuyer({ ...buyer, name: e.target.value })}/>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">Address line 1</label>
                <input className="border rounded px-3 py-2 w-full"
                  value={buyer.address1} onChange={(e) => saveBuyer({ ...buyer, address1: e.target.value })}/>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium mb-1">Address line 2 (optional)</label>
                <input className="border rounded px-3 py-2 w-full"
                  value={buyer.address2} onChange={(e) => saveBuyer({ ...buyer, address2: e.target.value })}/>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">City</label>
                <input className="border rounded px-3 py-2 w-full"
                  value={buyer.city} onChange={(e) => saveBuyer({ ...buyer, city: e.target.value })}/>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">State/Province</label>
                <input className="border rounded px-3 py-2 w-full"
                  value={buyer.state} onChange={(e) => saveBuyer({ ...buyer, state: e.target.value })}/>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Postal code</label>
                <input className="border rounded px-3 py-2 w-full"
                  value={buyer.postal} onChange={(e) => saveBuyer({ ...buyer, postal: e.target.value })}/>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Country</label>
                <select className="border rounded px-3 py-2 w-full"
                  value={buyer.country} onChange={(e) => saveBuyer({ ...buyer, country: e.target.value })}>
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                  <option value="NL">Netherlands</option>
                  <option value="SE">Sweden</option>
                  <option value="IT">Italy</option>
                  <option value="ES">Spain</option>
                </select>
              </div>
            </div>
          </div>

          {/* Summary with live breakdown */}
          <div className="p-4 border rounded bg-white space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-medium">Order Summary</div>
              <div className="text-sm opacity-70">{items.length} item{items.length > 1 ? 's' : ''}</div>
            </div>

            <div className="text-sm grid grid-cols-2 gap-y-1">
              <div className="opacity-80">Subtotal</div>
              <div className="text-right">{fmtMoney(subtotalCents)} {currency}</div>

              <div className="opacity-80">Shipping</div>
              <div className="text-right">{fmtMoney(SHIPPING_CENTS)} {currency}</div>

              <div className="opacity-80">Sales Tax (7%)</div>
              <div className="text-right">{fmtMoney(taxCents)} {currency}</div>

              <div className="col-span-2 border-t my-2"></div>

              <div className="font-semibold">Total</div>
              <div className="text-right font-semibold">{fmtMoney(totalCents)} {currency}</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button onClick={clearCart} className="px-3 py-2 rounded border text-sm">Clear</button>
              <button onClick={checkoutStripe} className="px-4 py-2 rounded bg-black text-white text-sm">Checkout</button>
            </div>

            <div className="text-xs opacity-70">
              Totals shown here will match the checkout amount (items + $5 shipping + 7% tax).
            </div>
          </div>

          {msg && <div className="p-3 border rounded bg-white">{msg}</div>}
        </>
      )}
    </div>
  );
}
