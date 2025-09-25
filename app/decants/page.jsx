'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// cart key used by /app/cart/page.jsx
const CART_KEY = 'cart_v1';

// Merge an item into cart_v1 (array of items)
function addToCartV1({ name, unit_amount, currency = 'usd', quantity = 1 }) {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    const items = Array.isArray(arr) ? arr : [];

    // Merge by (name + unit_amount + currency)
    const idx = items.findIndex(
      (it) =>
        it &&
        it.name === name &&
        Number(it.unit_amount) === Number(unit_amount) &&
        (it.currency || 'usd') === (currency || 'usd')
    );

    if (idx >= 0) {
      items[idx].quantity = Math.max(1, Number(items[idx].quantity || 1) + Number(quantity || 1));
    } else {
      items.push({
        name,
        unit_amount: Number(unit_amount) || 0,
        currency: (currency || 'usd').toLowerCase(),
        quantity: Number(quantity) || 1,
      });
    }

    localStorage.setItem(CART_KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

// Extract numeric mL from label, e.g. "2mL decant" -> 2
function parseVolumeRank(label = '') {
  const s = String(label).toLowerCase();
  const m = s.match(/([\d.]+)\s*ml/);
  if (m) {
    const vol = parseFloat(m[1]);
    if (!Number.isNaN(vol)) return { volMl: vol, rank: 0 };
  }
  if (/\btravel\b|\bdiscovery\b/.test(s)) return { volMl: null, rank: 3 };
  if (/\bsample\b|\btester\b/.test(s))   return { volMl: null, rank: 4 };
  if (/\bfull\b|\bbottle\b/.test(s))     return { volMl: null, rank: 5 };
  return { volMl: null, rank: 2 };
}

export default function AllDecantsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [justAddedId, setJustAddedId] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('decants')
        .select(`
          id,
          fragrance_id,
          label,
          in_stock,
          price_cents,
          currency,
          fragrance:fragrances(id, brand, name)
        `)
        .eq('in_stock', true)
        .limit(10000);

      if (!error) setRows(data || []);
      else setRows([]);
      setLoading(false);
    })();
  }, []);

  // Sort: Brand → Name → (mL ascending; non-mL after) → Label alpha
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const ab = (a.fragrance?.brand || '').localeCompare(b.fragrance?.brand || '', undefined, { sensitivity: 'base' });
      if (ab !== 0) return ab;

      const an = (a.fragrance?.name || '').localeCompare(b.fragrance?.name || '', undefined, { sensitivity: 'base' });
      if (an !== 0) return an;

      const av = parseVolumeRank(a.label);
      const bv = parseVolumeRank(b.label);

      if (av.rank !== bv.rank) return av.rank - bv.rank;
      if (av.rank === 0 && av.volMl != null && bv.volMl != null) {
        if (av.volMl !== bv.volMl) return av.volMl - bv.volMl;
      }
      return (a.label || '').localeCompare(b.label || '', undefined, { sensitivity: 'base' });
    });
  }, [rows]);

  function handleAdd(dec) {
    const brand = dec.fragrance?.brand || 'Unknown';
    const name = dec.fragrance?.name || 'Unnamed';
    const label = dec.label || '';
    const displayName = `${brand} ${name} ${label}`.trim();

    const ok = addToCartV1({
      name: displayName,
      unit_amount: Number(dec.price_cents) || 0,
      currency: (dec.currency || 'usd').toLowerCase(),
      quantity: 1,
    });

    if (ok) {
      setJustAddedId(dec.id);
      setTimeout(() => setJustAddedId(null), 1200);
    } else {
      alert('Could not add to cart. Please try again.');
    }
  }

  return (
    <div className="mx-auto max-w-5xl w-full px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">All Available Decants</h1>
        {/* Top-right header links (Brand Index, Search, Contact Me, Cart) */}
        <div className="flex gap-4 text-sm">
          <Link href="/brand" className="hover:underline">Brand Index</Link>
          <Link href="/notes" className="hover:underline">Search</Link>
          <Link href="/chat" className="hover:underline">Contact Me</Link>
          <Link href="/cart" className="hover:underline">Cart</Link>
        </div>
      </div>

      {/* Note under the heading */}
      <div className="text-sm opacity-80">
        If you find a lower price, message me and I'll try to match it
      </div>

      {loading && <div>Loading in-stock decants…</div>}

      {!loading && !sorted.length && (
        <div className="p-4 border rounded bg-white">
          No decants are currently marked as in stock.
        </div>
      )}

      {!loading && !!sorted.length && (
        <div className="space-y-2">
          <div className="text-sm opacity-70">
            Showing {sorted.length} item{sorted.length === 1 ? '' : 's'} in stock
          </div>

          <ul className="divide-y rounded border bg-white">
            {sorted.map((d) => {
              const brand = d.fragrance?.brand || 'Unknown';
              const name = d.fragrance?.name || 'Unnamed';
              const label = d.label || '';
              const added = justAddedId === d.id;

              return (
                <li key={d.id} className="flex items-center justify-between px-3 py-2">
                  <div className="text-sm">
                    <span className="font-medium">{brand}</span>{' '}
                    <span className="font-medium">{name}</span>{' '}
                    <span>{label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <Link
                      href={`/fragrance/${d.fragrance_id}`}
                      className="underline hover:no-underline"
                      title="View fragrance details"
                    >
                      View fragrance
                    </Link>
                    <button
                      onClick={() => handleAdd(d)}
                      className={`px-2 py-1 rounded border ${
                        added ? 'bg-green-600 text-white border-green-600' : 'bg-white hover:bg-gray-50'
                      }`}
                      title="Add this item to your cart"
                    >
                      {added ? 'Added!' : 'Add to cart'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
