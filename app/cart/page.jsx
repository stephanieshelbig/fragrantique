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

  // Discount state (if you already have discount logic)
  const [discountInput, setDiscountInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);
  const [discountMsg, setDiscountMsg] = useState('');

  useEffect(() => {
    try {
      const arr = JSON.parse(localStorage.getItem('cart_v1') || '[]');
      setItems(Array.isArray(arr) ? arr : []);
    } catch {}
    try {
      const b = JSON.parse(localStorage.getItem('cart_contact_v1') || '{}');
      setBuyer((prev) => ({ ...prev, ...b }));
    } catch {}
    try {
      const d = JSON.parse(localStorage.getItem('cart_discount_v1') || 'null');
      if (d && d.code) setAppliedDiscount(d);
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
  function saveDiscount(next) {
    if (next) localStorage.setItem('cart_discount_v1', JSON.stringify(next));
    else localStorage.removeItem('cart_discount_v1');
    setAppliedDiscount(next);
  }

  // 🔹 NEW — remove item helper
  function removeItem(index) {
    const next = items.filter((_, i) => i !== index);
    persist(next);
  }

  const subtotalCents = useMemo(
    () => items.reduce((sum, it) => sum + (it.unit_amount * it.quantity), 0),
    [items]
  );

  const BASE_SHIPPING_CENTS = 500;
  const TAX_RATE = 0.07;

  const discountCents = useMemo(() => {
    if (!appliedDiscount) return 0;
    if (appliedDiscount.type === 'percent') {
      return Math.floor((subtotalCents * (appliedDiscount.value || 0)) / 100);
    }
    if (appliedDiscount.type === 'fixed') {
      return Math.min(appliedDiscount.value || 0, subtotalCents);
    }
    return 0;
  }, [appliedDiscount, subtotalCents]);

  const discountedSubtotal = Math.max(0, subtotalCents - discountCents);
  const shippingCents = appliedDiscount?.type === 'free_shipping' ? 0 : BASE_SHIPPING_CENTS;
  const taxCents = Math.round(discountedSubtotal * TAX_RATE);
  const totalCents = discountedSubtotal + shippingCents + taxCents;

  const fmt = (c) => (c / 100).toFixed(2);

  async function applyDiscount() {
    setDiscountMsg('');
    if (!discountInput.trim()) {
      setDiscountMsg('Enter a code.');
      return;
    }
    try {
      const res = await fetch('/api/discount/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: discountInput.trim(), subtotalCents }),
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) {
        setDiscountMsg(j?.error || 'Invalid code.');
        return;
      }
      saveDiscount(j.discount);
      setDiscountMsg('Discount applied.');
    } catch {
      setDiscountMsg('Could not validate code.');
    }
  }

  function removeDiscount() {
    saveDiscount(null);
    setDiscountMsg('');
    setDiscountInput('');
  }

  async function checkout() {
    setMsg('');
    if (!items.length) return;
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, buyer, discount: appliedDiscount }),
      });
      const j = await res.json();
      if (!res.ok || !j?.url) {
        setMsg(j?.error || 'Checkout failed');
        return;
      }
      window.location = j.url;
    } catch (e) {
      setMsg(e.message || 'Checkout failed');
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      <h1 className="text-2xl font-bold mb-4">Your Cart</h1>

      {!items.length && <div>Your cart is empty.</div>}

      {items.length > 0 && (
        <>
          {items.map((it, i) => (
            <div key={i} className="p-3 border rounded bg-white flex justify-between items-center">
              <div>
                <div className="font-medium">{it.name}</div>
                <div className="text-sm">${fmt(it.unit_amount)} ea</div>
              </div>

              <div className="flex items-center gap-3">
                <div>x {it.quantity}</div>
                {/* 🔹 NEW remove button */}
                <button
                  onClick={() => removeItem(i)}
                  className="border rounded px-2 py-1 text-xs hover:bg-gray-50"
                  aria-label={`Remove ${it.name}`}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          {/* Discount */}
          <div className="p-4 border rounded bg-white space-y-2">
            <div className="font-medium">Discount</div>
            {!appliedDiscount ? (
              <div className="flex gap-2">
                <input
                  className="border rounded px-3 py-2 flex-1"
                  placeholder="Enter code"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                />
                <button onClick={applyDiscount} className="border rounded px-3 py-2">
                  Apply
                </button>
              </div>
            ) : (
              <div className="flex justify-between">
                <div>
                  <b>{appliedDiscount.code}</b>{' '}
                  {appliedDiscount.type === 'percent' && `(${appliedDiscount.value}% off)`}
                  {appliedDiscount.type === 'fixed' && `($${fmt(appliedDiscount.value)} off)`}
                  {appliedDiscount.type === 'free_shipping' && `— Free shipping`}
                </div>
                <button onClick={removeDiscount} className="border px-2 text-xs">
                  Remove
                </button>
              </div>
            )}
            {discountMsg && <div className="text-xs opacity-70">{discountMsg}</div>}
          </div>

          {/* Totals */}
          <div className="p-4 border rounded bg-white space-y-1">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${fmt(subtotalCents)}</span>
            </div>
            {appliedDiscount && (
              <div className="flex justify-between">
                <span>Discount</span>
                <span>- ${fmt(discountCents)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>${fmt(shippingCents)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span>${fmt(taxCents)}</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-1">
              <span>Total</span>
              <span>${fmt(totalCents)}</span>
            </div>
          </div>

          <button
            onClick={checkout}
            className="bg-black text-white px-4 py-2 rounded"
          >
            Checkout
          </button>

          {msg && <div className="text-red-600 text-sm mt-2">{msg}</div>}
        </>
      )}
    </div>
  );
}
