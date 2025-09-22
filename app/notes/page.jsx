'use client';

export const dynamic = 'force-dynamic'; // ✅ disable prerendering for this page
export const revalidate = 0;

import { useEffect, useMemo, useState, useTransition } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

const ADMIN_EMAIL = 'stephanieshelbig@gmail.com';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
// createClient tolerates empty strings; we also only use it in effects
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

const norm = (s = '') => (s || '').toString().toLowerCase();

const inCol = {
  VANILLA_GOURMAND: (accords) => {
    const a = norm(accords);
    return a.includes('vanilla') || a.includes('gourmand') || a.includes('tonka');
  },
  FLORALS: (accords) => {
    const a = norm(accords);
    return (
      (a.includes('floral') && !a.includes('white')) ||
      a.includes('rose') ||
      a.includes('violet') ||
      a.includes('lily') ||
      a.includes('peony') ||
      a.includes('iris')
    );
  },
  WHITE_FLORALS: (accords) => {
    const a = norm(accords);
    return (
      a.includes('white floral') ||
      a.includes('jasmine') ||
      a.includes('tuberose') ||
      a.includes('gardenia') ||
      a.includes('orange blossom') ||
      a.includes('neroli')
    );
  },
  FRUITY: (accords) => {
    const a = norm(accords);
    return (
      a.includes('fruity') ||
      a.includes('citrus') ||
      a.includes('apple') ||
      a.includes('berry') ||
      a.includes('peach') ||
      a.includes('pear')
    );
  },
};

function HeaderNav() {
  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-2xl font-semibold">Fragrantique</Link>
        <nav className="flex items-center gap-6">
          <Link href="/brand-index" className="hover:underline">Brand Index</Link>
          <Link href="/contact" className="hover:underline">Contact Me</Link>
          <Link href="/cart" className="hover:underline">Cart</Link>
        </nav>
      </div>
    </header>
  );
}

function SearchBar({ value, onChange, onReload }) {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-6 pb-4 flex items-center gap-3">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search by brand or name or notes"
        className="w-full rounded-xl border px-4 py-2"
      />
      <button onClick={onReload} className="rounded-xl border px-4 py-2 hover:bg-gray-50">
        Reload
      </button>
    </div>
  );
}

function Card({ f, decants, onAdd, isAdmin, onToggle }) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm bg-white">
      <div className="flex items-start gap-3">
        <div className="w-12 h-16 rounded bg-gray-100 border shrink-0" />
        <div className="flex-1">
          <div className="text-xs text-gray-500">Brand</div>
          <div className="font-medium">{f.brand || '—'}</div>

          <div className="mt-1 text-xs text-gray-500">Fragrance Name</div>
          <div className="font-medium">{f.name || '—'}</div>

          <div className="mt-3 flex items-center gap-2">
            <Link href={`/fragrance/${f.id}`} className="text-sm rounded-lg border px-3 py-1.5 hover:bg-gray-50">
              View fragrance
            </Link>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {decants?.length ? (
              decants.map((d) => (
                <button
                  key={d.id}
                  className="text-sm rounded-lg bg-pink-700 hover:bg-pink-800 text-white px-3 py-1.5"
                  onClick={() => onAdd(f, d)}
                  title={`Add ${d.label} to cart`}
                >
                  {d.label}
                </button>
              ))
            ) : (
              <div className="text-xs text-gray-400">No decant options</div>
            )}
          </div>

          {isAdmin && (
            <div className="mt-4">
              <button
                onClick={() => onToggle(f)}
                className="text-xs rounded-md border px-2 py-1 hover:bg-gray-50"
              >
                {f.show_on_notes ? 'Hide from Notes' : 'Show on Notes'}
              </button>
              <div className="mt-1 text-[11px] text-gray-500">Accords: {f.accords || '—'}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NotesPage() {
  const [query, setQuery] = useState('');
  const [fragrances, setFragrances] = useState([]);
  const [decantsByFrag, setDecantsByFrag] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();

  useEffect(() => {
    (async () => {
      try {
        const qEmail = searchParams?.get('me');
        const { data } = await supabase.auth.getUser();
        const email = (data?.user?.email || qEmail || '').toLowerCase();
        setIsAdmin(email === ADMIN_EMAIL.toLowerCase());
      } catch {
        const qEmail = (searchParams?.get('me') || '').toLowerCase();
        setIsAdmin(qEmail === ADMIN_EMAIL.toLowerCase());
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    const selectCols = 'id, brand, name, accords, show_on_notes';
    const { data: frags, error } = await supabase
      .from('fragrances')
      .select(selectCols)
      .order('brand', { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    const visible = (frags || []).filter((f) => (isAdmin ? true : f.show_on_notes));
    const ids = visible.map((f) => f.id);

    // ✅ Avoid Supabase `.in([])` which throws
    let byFrag = {};
    if (ids.length > 0) {
      const { data: decants, error: decErr } = await supabase
        .from('decant_options')
        .select('id, fragrance_id, label, price_cents')
        .in('fragrance_id', ids);

      if (decErr) {
        console.error(decErr);
      } else {
        byFrag = (decants || []).reduce((acc, d) => {
          (acc[d.fragrance_id] ||= []).push(d);
          return acc;
        }, {});
      }
    }

    setFragrances(frags || []);
    setDecantsByFrag(byFrag);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = norm(query);
    const base = fragrances.filter((f) => (isAdmin ? true : f.show_on_notes));
    if (!q) return base;
    return base.filter((f) => `${norm(f.brand)} ${norm(f.name)} ${norm(f.accords)}`.includes(q));
  }, [query, fragrances, isAdmin]);

  const grouped = useMemo(() => {
    const buckets = { vanilla: [], florals: [], whiteFlorals: [], fruity: [] };
    const sorter = (x, y) =>
      (x.brand || '').localeCompare(y.brand || '') ||
      (x.name || '').localeCompare(y.name || '');

    filtered.forEach((f) => {
      const a = f.accords || '';
      if (inCol.WHITE_FLORALS(a)) buckets.whiteFlorals.push(f);
      else if (inCol.VANILLA_GOURMAND(a)) buckets.vanilla.push(f);
      else if (inCol.FRUITY(a)) buckets.fruity.push(f);
      else if (inCol.FLORALS(a)) buckets.florals.push(f);
    });

    buckets.vanilla.sort(sorter);
    buckets.florals.sort(sorter);
    buckets.whiteFlorals.sort(sorter);
    buckets.fruity.sort(sorter);
    return buckets;
  }, [filtered]);

  const addToCart = (frag, decant) => {
    const item = {
      name: `${frag.brand} — ${frag.name} (${decant.label})`,
      quantity: 1,
      unit_amount: decant.price_cents ?? 0,
      currency: 'usd',
      fragrance_id: frag.id,
      decant_option_id: decant.id,
    };

    const keysToTry = ['cartItems', 'fragrantique_cart'];
    let key = keysToTry.find((k) => {
      try { return Array.isArray(JSON.parse(localStorage.getItem(k) || '[]')); }
      catch { return false; }
    }) || 'cartItems';

    const current = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = current.findIndex(
      (x) => x.fragrance_id === item.fragrance_id && x.decant_option_id === item.decant_option_id
    );
    if (idx >= 0) current[idx].quantity += 1;
    else current.push(item);

    localStorage.setItem(key, JSON.stringify(current));
    try { window.dispatchEvent(new CustomEvent('fragrantique:cart:updated')); } catch {}
  };

  const toggleShow = async (f) => {
    if (!isAdmin) return;
    const { error } = await supabase
      .from('fragrances')
      .update({ show_on_notes: !f.show_on_notes })
      .eq('id', f.id);
    if (error) {
      console.error(error);
      alert('Failed to update.');
      return;
    }
    startTransition(() => load());
  };

  const Column = ({ title, list }) => (
    <div className="space-y-4">
      <div className="rounded-xl bg-gray-50 border px-4 py-2 text-sm font-semibold">{title}</div>
      {list.length === 0 && <div className="text-xs text-gray-400 px-1">No matches</div>}
      {list.map((f) => (
        <Card
          key={f.id}
          f={f}
          decants={decantsByFrag[f.id] || []}
          onAdd={addToCart}
          isAdmin={isAdmin}
          onToggle={toggleShow}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      <HeaderNav />
      <main className="mx-auto max-w-7xl px-4 pb-20">
        <SearchBar value={query} onChange={setQuery} onReload={() => startTransition(load)} />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pt-2">
          <Column title="VANILLA / GOURMAND" list={grouped.vanilla} />
          <Column title="FLORALS" list={grouped.florals} />
          <Column title="WHITE FLORALS" list={grouped.whiteFlorals} />
          <Column title="FRUITY" list={grouped.fruity} />
        </div>
        {isPending && <div className="text-sm text-gray-500 mt-6">Refreshing…</div>}
      </main>
    </div>
  );
}
