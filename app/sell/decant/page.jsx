'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function SellDecantPage({ searchParams }) {
  const fragranceId = searchParams?.fragrance || '';
  const [session, setSession] = useState(null);
  const [brandName, setBrandName] = useState('');
  const [size, setSize] = useState(10);
  const [price, setPrice] = useState(1500);
  const [qty, setQty] = useState(1);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
  }, []);

  useEffect(() => {
    (async () => {
      if (!fragranceId) return;
      const { data: f } = await supabase.from('fragrances').select('brand, name').eq('id', fragranceId).maybeSingle();
      if (f) setBrandName(`${f.brand} ${f.name}`);
    })();
  }, [fragranceId]);

  async function save(e) {
    e.preventDefault();
    if (!session?.user?.id) { setMsg('Please sign in.'); return; }
    if (!fragranceId) { setMsg('Missing fragrance.'); return; }
    setSaving(true);
    setMsg(null);
    const { error } = await supabase.from('decants').insert({
      fragrance_id: fragranceId,
      seller_user_id: session.user.id,
      size_ml: Number(size),
      price_cents: Number(price),
      quantity: Number(qty),
      is_active: true
    });
    if (error) setMsg(error.message);
    else setMsg('Decant listed!');
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <Link href="/" className="text-blue-600 hover:underline text-sm">← Back</Link>
      <h1 className="text-2xl font-semibold mt-2 mb-4">List a decant</h1>
      {brandName && <div className="mb-3 text-sm text-zinc-600">For: <span className="font-medium">{brandName}</span></div>}
      {msg && <div className="mb-3 text-sm">{msg}</div>}
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="text-sm block mb-1">Size (mL)</label>
          <input type="number" className="border rounded px-2 py-1 w-full" value={size} onChange={e => setSize(e.target.value)} min="1" step="1" />
        </div>
        <div>
          <label className="text-sm block mb-1">Price (cents)</label>
          <input type="number" className="border rounded px-2 py-1 w-full" value={price} onChange={e => setPrice(e.target.value)} min="0" step="1" />
          <div className="text-[11px] text-zinc-500 mt-1">Shown to buyers as ${(price/100).toFixed(2)}. +5% platform fee at checkout.</div>
        </div>
        <div>
          <label className="text-sm block mb-1">Quantity</label>
          <input type="number" className="border rounded px-2 py-1 w-full" value={qty} onChange={e => setQty(e.target.value)} min="0" step="1" />
        </div>
        <button disabled={saving} className="px-4 py-2 rounded bg-black text-white text-sm disabled:opacity-40">
          {saving ? 'Saving…' : 'List decant'}
        </button>
      </form>
    </div>
  );
}
