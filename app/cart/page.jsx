'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const money = (c) => `$${(c/100).toFixed(2)}`;
const CART_KEY = 'fragrantique_cart_v1';

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    // normalize
    return Array.isArray(arr) ? arr.filter(x => x && x.decantId).map(x => ({ decantId: String(x.decantId), qty: Math.max(1, parseInt(x.qty || 1)) })) : [];
  } catch { return []; }
}
function saveCart(items) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch {}
}

export default function CartPage() {
  const [items, setItems] = useState([]);
  const [rows, setRows] = useState([]); // hydrated with decant info
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [msg, setMsg] = useState(null);

  // Load local cart on mount
  useEffect(() => {
    const initial = loadCart();
    setItems(initial);
  }, []);

  // Hydrate from Supabase
  useEffect(() => {
    (async () => {
      setLoading(true);
      if (!items.length) { setRows([]); setLoading(false); return; }
      const ids = items.map(i => i.decantId);

      const { data, error } = await supabase
        .from('decants')
        .select('id, fragrance_id, size_ml, price_cents, quantity, is_active, fragrance:fragrances(id, brand, name)')
        .in('id', ids);

      if (error) {
        setMsg(error.message);
        setRows([]);
        setLoading(false);
        return;
      }

      // join qty from local items
      const mapQty = new Map(items.map(i => [String(i.decantId), i.qty]));
      const merged = (data || []).map(d => ({
        ...d,
        qty: mapQty.get(String(d.id)) || 1
      })).filter(d => !!d);

      setRows(merged);
      setLoading(false);
    })();
  }, [items]);

  const totals = useMemo(() => {
    const subtotal = rows.reduce((acc, r) => acc + (r.price_cents * r.qty), 0);
    const fee = Math.round(subtotal * 0.05);
    const total = subtotal + fee;
    return { subtotal, fee, total };
  }, [rows]);

  function removeItem(id) {
    const next = items.filter(it => String(it.decantId) !== String(id));
    setItems(next); saveCart(next);
  }
  function clearCart() {
    setItems([]); saveCart([]);
  }
  function updateQty(id, qty) {
    const q = Math.max(1, parseInt(qty || 1));
    const next = items.map(it => String(it.decantId) === String(id) ? { ...it, qty: q } : it);
    setItems(next); saveCart(next);
  }

  async function checkout() {
    try {
      setCheckingOut(true);
      setMsg(null);
      if (!items.length) { setMsg('Your cart is empty.'); setCheckingOut(false); return; }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      const resClone = res.clone();
      let payload = null;
      try { payload = await res.json(); }
      catch { alert(await resClone.text() || 'Checkout failed.'); setCheckingOut(false); return; }

      if (!res.ok) { alert(payload?.error || 'Checkout failed.'); setCheckingOut(false); return; }
      if (payload?.url) {
        window.location.href = payload.url;
      } else {
        setMsg('Checkout response missing URL.'); setCheckingOut(false);
      }
    } catch (e) {
      setMsg(e.message || 'Checkout error');
      setCheckingOut(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-4">
      <div className="flex items-center justify-between mb-4">
        <Link href="/" className="text-blue-600 hover:underline text-sm">← Continue shopping</Link>
        <h1 className="text-xl font-semibold">Your Cart</h1>
        <div />
      </div>

      {msg && <div className="mb-3 text-sm text-red-600">{msg}</div>}

      {loading ? (
        <div>Loading cart…</div>
      ) : rows.length === 0 ? (
        <div className="text-sm text-zinc-600">Your cart is empty.</div>
      ) : (
        <>
          <div className="space-y-3 mb-6">
            {rows.map(r => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border bg-white p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {r.fragrance?.brand} {r.fragrance?.name} — {r.size_ml} mL
                  </div>
                  {!r.is_active || r.quantity === 0 ? (
                    <div className="text-[11px] text-red-600">Unavailable</div>
                  ) : (
                    <div className="text-[11px] text-zinc-500">Available</div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-semibold">{money(r.price_cents)}</div>
                  <input
                    type="number"
                    className="w-16 border rounded px-2 py-1 text-sm"
                    min="1"
                    value={items.find(i => String(i.decantId) === String(r.id))?.qty || 1}
                    onChange={(e) => updateQty(r.id, e.target.value)}
                  />
                  <button onClick={() => removeItem(r.id)} className="text-sm text-zinc-600 hover:underline">Remove</button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-start justify-between gap-6">
            <button onClick={clearCart} className="text-sm text-zinc-600 hover:underline">Clear cart</button>
            <div className="ml-auto w-full max-w-sm rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex justify-between text-sm mb-1">
                <span>Subtotal</span>
                <span>{money(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span>Platform fee (5%)</span>
                <span>{money(totals.fee)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold mt-2 pt-2 border-t">
                <span>Total</span>
                <span>{money(totals.total)}</span>
              </div>
              <button
                onClick={checkout}
                disabled={checkingOut || rows.length === 0}
                className="mt-4 w-full px-4 py-2 rounded bg-black text-white text-sm disabled:opacity-40"
              >
                {checkingOut ? 'Redirecting…' : 'Checkout'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
