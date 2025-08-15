'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

export default function CartPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      const arr = JSON.parse(localStorage.getItem('cart_v1') || '[]');
      setItems(Array.isArray(arr) ? arr : []);
    } catch {
      setItems([]);
    }
  }, []);

  function persist(next) {
    localStorage.setItem('cart_v1', JSON.stringify(next));
    setItems(next);
  }

  function updateQty(i, q) {
    const qty = Math.max(1, parseInt(q, 10) || 1);
    const next = items.map((it, idx) => (idx === i ? { ...it, quantity: qty } : it));
    persist(next);
  }

  function removeItem(i) {
    const next = items.filter((_, idx) => idx !== i);
    persist(next);
  }

  function clearCart() {
    persist([]);
  }

  const currency = (items[0]?.currency || 'usd').toUpperCase();
  const subtotalCents = useMemo(
    () => items.reduce((sum, it) => sum + (it.unit_amount * it.quantity), 0),
    [items]
  );

  async function checkout() {
    if (!items.length) return;
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const j = await res.json();
      if (!res.ok || !j?.url) {
        alert(j?.error || 'Checkout failed');
        return;
      }
      window.location.href = j.url;
    } catch (e) {
      alert(e.message || 'Checkout failed');
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
            {items.map((it, i) => (
              <div key={i} className="p-3 border rounded bg-white flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-medium text-sm">{it.name}</div>
                  <div className="text-xs opacity-70">Price: {(it.unit_amount/100).toFixed(2)} {it.currency.toUpperCase()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    className="border rounded px-2 py-1 w-20"
                    value={it.quantity}
                    onChange={(e) => updateQty(i, e.target.value)}
                  />
                  <button
                    onClick={() => removeItem(i)}
                    className="px-3 py-1.5 rounded border text-xs"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border rounded bg-white flex items-center justify-between">
            <div className="font-medium">
              Subtotal: {(subtotalCents/100).toFixed(2)} {currency}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={clearCart} className="px-3 py-2 rounded border text-sm">
                Clear
              </button>
              <button onClick={checkout} className="px-4 py-2 rounded bg-black text-white text-sm">
                Checkout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
