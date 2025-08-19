'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

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

  function persist(next) {
    localStorage.setItem('cart_v1', JSON.stringify(next));
    setItems(next);
  }
  function saveBuyer(next) {
    localStorage.setItem('cart_contact_v1', JSON.stringify(next));
    setBuyer(next);
  }

  function updateQty(i, q) {
    const qty = Math.max(1, parseInt(q, 10) || 1);
    const next = items.map((it, idx) => (idx === i ? { ...it, quantity: qty } : it));
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

  async function checkoutStripe() {
    setMsg('');
    if (!items.length) return;
    if (!validateBuyer()) return;
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
            {items.map((it, i) => (
              <div key={i} className="p-3 border rounded bg-white flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-medium text-sm">{it.name}</div>
                  <div className="text-xs opacity-70">
                    Price: {(it.unit_amount/100).toFixed(2)} {it.currency.toUpperCase()}
                  </div>
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
            ))}
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
