'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const money = (cents) => `$${(cents / 100).toFixed(2)}`;
const bottleSrc = (f) => f?.image_url_transparent || f?.image_url || '/bottle-placeholder.png';

export default function FragrancePage({ params }) {
  const id = decodeURIComponent(params.id);

  const [session, setSession] = useState(null);
  const [frag, setFrag] = useState(null);
  const [notes, setNotes] = useState([]);
  const [decants, setDecants] = useState([]);
  const [loading, setLoading] = useState(true);

  // add note state
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const sub = supabase.auth.onAuthStateChange((_e, s) => setSession(s?.session || null));
    return () => sub.data.subscription.unsubscribe();
  }, []);

  // Load fragrance, notes, decants
  useEffect(() => {
    (async () => {
      setLoading(true);

      // 1) fragrance
      const { data: f } = await supabase
        .from('fragrances')
        .select('id, brand, name, image_url, image_url_transparent, accords, fragrantica_url')
        .eq('id', id)
        .maybeSingle();
      setFrag(f || null);

      // 2) notes
      const { data: n } = await supabase
        .from('fragrance_notes')
        .select('id, user_id, rating, body, created_at')
        .eq('fragrance_id', id)
        .order('created_at', { ascending: false });
      setNotes(n || []);

      // 3) decants
      const { data: d } = await supabase
        .from('decants')
        .select('id, size_ml, price_cents, quantity, seller_user_id, is_active')
        .eq('fragrance_id', id)
        .eq('is_active', true)
        .order('price_cents', { ascending: true });
      setDecants(d || []);

      setLoading(false);
    })();
  }, [id]);

  const canPost = !!session?.user?.id;

  async function handleAddNote(e) {
    e.preventDefault();
    if (!canPost) return;
    setSubmitting(true);
    setError(null);
    const { error: err, data } = await supabase
      .from('fragrance_notes')
      .insert({
        fragrance_id: id,
        user_id: session.user.id,
        rating,
        body
      })
      .select()
      .maybeSingle();
    if (err) setError(err.message);
    else {
      setBody('');
      setRating(5);
      setNotes(prev => [data, ...prev]);
    }
    setSubmitting(false);
  }

  // Robust client → always handles non-JSON or empty responses gracefully
  async function buyDecant(decantId) {
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decantId, fragranceId: id })
      });

      // Try JSON first; if it fails, read raw text
      let payload = null;
      try {
        payload = await res.json();
      } catch {
        const text = await res.text();
        alert(text || 'Checkout failed (non-JSON response).');
        return;
      }

      if (!res.ok) {
        alert(payload?.error || 'Checkout failed.');
        return;
      }

      if (payload?.url) {
        window.location.href = payload.url;
      } else {
        alert('Checkout response missing URL.');
      }
    } catch (e) {
      alert(e.message || 'Checkout error');
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (!frag) return <div className="p-6">Fragrance not found.</div>;

  return (
    <div className="mx-auto max-w-6xl p-4">
      {/* Header back link */}
      <div className="flex items-center justify-between mb-4">
        <Link href="/" className="text-blue-600 hover:underline text-sm">← Back</Link>
        <div />
        <div />
      </div>

      {/* Hero “social card” */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-100 to-white border shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Left: image */}
          <div className="relative flex items-center justify-center p-6 md:p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-50 via-white to-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bottleSrc(frag)}
              alt={`${frag.brand} ${frag.name}`}
              className="object-contain"
              style={{ height: '280px', width: 'auto', mixBlendMode: 'multiply', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.18))' }}
              onError={(e) => {
                if (!e.currentTarget.dataset.fallback) {
                  e.currentTarget.dataset.fallback = '1';
                  e.currentTarget.src = '/bottle-placeholder.png';
                }
              }}
            />
          </div>
          {/* Right: title + optional accords */}
          <div className="p-6 md:p-8">
            <div className="text-sm uppercase tracking-wider text-zinc-500">{frag.brand}</div>
            <h1 className="text-3xl md:text-4xl font-semibold">{frag.name}</h1>

            {/* Accord bars (optional if you store them as JSON) */}
            {Array.isArray(frag?.accords) && frag.accords.length > 0 && (
              <div className="mt-5 space-y-2">
                {frag.accords.map((a, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-28 text-xs text-zinc-600">{a.name}</div>
                    <div className="flex-1 h-2 rounded-full bg-zinc-200 overflow-hidden">
                      <div className="h-2 bg-black/70" style={{ width: `${Math.max(0, Math.min(100, a.strength || 0))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Fragrantica link if present */}
            {frag?.fragrantica_url && (
              <div className="mt-4">
                <a href={frag.fragrantica_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                  View on Fragrantica →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Decants */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">Decants</h2>
          <Link
            href={`/sell/decant?fragrance=${encodeURIComponent(id)}`}
            className="text-sm text-blue-600 hover:underline"
          >
            List a decant
          </Link>
        </div>

        {decants.length === 0 ? (
          <div className="text-sm text-zinc-600">No decants yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {decants.map(d => (
              <div key={d.id} className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="text-sm">{d.size_ml} mL</div>
                <div className="text-lg font-semibold">{money(d.price_cents)}</div>
                {d.quantity === 0 ? (
                  <div className="mt-3 text-sm text-zinc-500">Out of stock</div>
                ) : (
                  <button
                    onClick={() => buyDecant(d.id)}
                    className="mt-3 px-3 py-2 rounded bg-black text-white text-sm hover:opacity-90"
                  >
                    Buy
                  </button>
                )}
                <div className="mt-2 text-[11px] text-zinc-500">
                  Includes platform fee at checkout.
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Notes */}
      <section className="mb-16">
        <h2 className="text-xl font-semibold mb-3">Notes from users</h2>

        {canPost ? (
          <form onSubmit={handleAddNote} className="mb-6 rounded-xl border bg-white p-4 shadow-sm">
            {error && <div className="mb-2 text-sm text-red-600">{error}</div>}
            <div className="flex items-center gap-3 mb-3">
              <label className="text-sm">Rating</label>
              <select
                value={rating}
                onChange={(e) => setRating(parseInt(e.target.value))}
                className="border rounded px-2 py-1 text-sm"
              >
                {[5,4,3,2,1].map(v => <option key={v} value={v}>{v} ⭐</option>)}
              </select>
            </div>
            <textarea
              className="w-full border rounded p-3 text-sm"
              rows={3}
              placeholder="What do you think about this fragrance?"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="mt-3">
              <button
                disabled={submitting || body.trim().length === 0}
                className="px-4 py-2 rounded bg-black text-white text-sm disabled:opacity-40"
              >
                {submitting ? 'Posting…' : 'Post note'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-4 text-sm text-zinc-600">Sign in to add your note.</div>
        )}

        {notes.length === 0 ? (
          <div className="text-sm text-zinc-600">No notes yet.</div>
        ) : (
          <div className="space-y-4">
            {notes.map(n => (
              <div key={n.id} className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="text-sm mb-1">{'⭐'.repeat(n.rating || 0)}</div>
                <div className="text-sm">{n.body}</div>
                <div className="text-[11px] text-zinc-500 mt-2">
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
