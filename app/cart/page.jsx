'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CartPage() {
  const router = useRouter();

  const [items, setItems] = useState([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(null);

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
    } catch {
      setItems([]);
    }

    try {
      const b = JSON.parse(localStorage.getItem('cart_contact_v1') || '{}');
      setBuyer((prev) => ({ ...prev, ...b }));
    } catch {}

    localStorage.removeItem('cart_discount_v1');

    setCartLoaded(true);
  }, []);

  useEffect(() => {
    if (!cartLoaded) return;

    if (items.length === 0) {
      const timer = setTimeout(() => {
        router.replace('/');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [cartLoaded, items, router]);

  function persist(next) {
    localStorage.setItem('cart_v1', JSON.stringify(next));
    setItems(next);
  }

  function saveBuyer(next) {
    localStorage.setItem('cart_contact_v1', JSON.stringify(next));
    setBuyer(next);
  }

  function removeItem(index) {
    const next = items.filter((_, i) => i !== index);
    persist(next);

    const stillHasLostInParis = next.some((it) =>
      (it.name || '').toLowerCase().includes('lost in paris')
    );

    if (!stillHasLostInParis) {
      setAppliedDiscount(null);
      localStorage.removeItem('cart_discount_v1');
    }
  }

  const hasLostInParis = useMemo(() => {
    return items.some((it) =>
      (it.name || '').toLowerCase().includes('lost in paris')
    );
  }, [items]);

  const subtotalCents = useMemo(
    () => items.reduce((sum, it) => sum + it.unit_amount * it.quantity, 0),
    [items]
  );

  const BASE_SHIPPING_CENTS = 600;
  const TAX_RATE = 0.07;

  const discountCents = appliedDiscount?.amountCents || 0;
  const discountedSubtotalCents = Math.max(0, subtotalCents - discountCents);

  const shippingCents = BASE_SHIPPING_CENTS;
  const taxCents = Math.round(discountedSubtotalCents * TAX_RATE);
  const totalCents = discountedSubtotalCents + shippingCents + taxCents;

  const fmt = (c) => (c / 100).toFixed(2);

  function applyDiscountCode() {
    setMsg('');

    const code = discountCode.trim().toUpperCase();

    if (!code) {
      setAppliedDiscount(null);
      localStorage.removeItem('cart_discount_v1');
      setMsg('Please enter a discount code.');
      return;
    }

    if (code !== 'LOSTINPARIS10') {
      setAppliedDiscount(null);
      localStorage.removeItem('cart_discount_v1');
      setMsg('Invalid discount code.');
      return;
    }

    if (!hasLostInParis) {
      setAppliedDiscount(null);
      localStorage.removeItem('cart_discount_v1');
      setMsg('This discount code only works when Roja Lost in Paris is in your cart.');
      return;
    }

    const discount = {
      code,
      amountCents: 1000,
      requiredItem: 'Lost in Paris',
    };

    setAppliedDiscount(discount);
    localStorage.setItem('cart_discount_v1', JSON.stringify(discount));
    setMsg('$10 discount applied to Roja Lost in Paris.');
  }

  function removeDiscount() {
    setAppliedDiscount(null);
    setDiscountCode('');
    localStorage.removeItem('cart_discount_v1');
    setMsg('');
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

      {cartLoaded && !items.length && (
        <div>Your cart is empty. Redirecting to Home...</div>
      )}

      {cartLoaded && items.length > 0 && (
        <>
          {items.map((it, i) => (
            <div
              key={i}
              className="p-3 border rounded bg-white flex justify-between items-center"
            >
              <div>
                <div className="font-medium">{it.name}</div>
                <div className="text-sm">${fmt(it.unit_amount)} ea</div>
              </div>

              <div className="flex items-center gap-3">
                <div>x {it.quantity}</div>

                <button
                  onClick={() => removeItem(i)}
                  className="border rounded px-2 py-1 text-xs hover:bg-gray-50"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <div className="p-4 border rounded bg-white space-y-3">
            <div className="font-semibold">Discount Code</div>

            <div className="flex gap-2">
              <input
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                placeholder="Enter discount code"
                className="flex-1 border rounded px-3 py-2"
              />

              <button
                onClick={applyDiscountCode}
                className="bg-black text-white px-4 py-2 rounded"
              >
                Apply
              </button>
            </div>

            {appliedDiscount && (
              <div className="flex justify-between items-center text-sm text-green-700">
                <span>Applied: {appliedDiscount.code}</span>
                <button
                  onClick={removeDiscount}
                  className="text-xs underline text-red-600"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <div className="p-4 border rounded bg-white space-y-1">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>${fmt(subtotalCents)}</span>
            </div>

            {discountCents > 0 && (
              <div className="flex justify-between text-green-700">
                <span>Discount</span>
                <span>-${fmt(discountCents)}</span>
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

          <button onClick={checkout} className="bg-black text-white px-4 py-2 rounded">
            Checkout
          </button>

          {msg && (
            <div
              className={`text-sm mt-2 ${
                msg.includes('applied') ? 'text-green-700' : 'text-red-600'
              }`}
            >
              {msg}
            </div>
          )}
        </>
      )}
    </div>
  );
}
