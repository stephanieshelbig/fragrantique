'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Outer wrapper provides the required Suspense boundary
export default function Page() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto p-6">Loading…</div>}>
      <CheckoutSuccessInner />
    </Suspense>
  );
}

function CheckoutSuccessInner() {
  const params = useSearchParams();
  const sid = params.get('session_id') || '';

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [tries, setTries] = useState(0);
  const [msg, setMsg] = useState('');

  // Poll for order since webhook may arrive a bit after redirect
  useEffect(() => {
    let cancelled = false;

    async function fetchOnce() {
      if (!sid) {
        setMsg('Missing Stripe session id.');
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('stripe_session_id', sid)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setMsg(error.message);
        setLoading(false);
        return;
      }

      if (data) {
        setOrder(data);
        setLoading(false);
      } else {
        // Not in DB yet; try again shortly (webhook still processing)
        setTries((t) => t + 1);
      }
    }

    fetchOnce();

    const t = setInterval(() => {
      if (order || tries >= 10) {
        clearInterval(t);
        setLoading(false);
        return;
      }
      fetchOnce();
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sid]);

  const total = useMemo(() => {
    if (!order?.amount_total) return null;
    const curr = (order.currency || 'USD').toUpperCase();
    const val = (order.amount_total / 100).toFixed(2);
    return `${val} ${curr}`;
  }, [order]);

  const items = Array.isArray(order?.items) ? order.items : [];

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Thank you for your order! 🧾</h1>

      {!sid && (
        <div className="p-4 border rounded bg-white">No Stripe session id found in the URL.</div>
      )}

      {loading && sid && (
        <div className="p-4 border rounded bg-white">
          Processing your payment… If this takes more than a few seconds, it’s just waiting for
          Stripe to notify us. This page will auto-refresh.
        </div>
      )}

      {!loading && sid && !order && (
        <div className="p-4 border rounded bg-white">
          We haven’t received the Stripe confirmation yet.
          <div className="mt-2 text-sm opacity-70">Session: {sid}</div>
        </div>
      )}

      {order && (
        <div className="space-y-3 p-4 border rounded bg-white">
          <div className="text-sm opacity-70">
            Order placed: {new Date(order.created_at).toLocaleString()}
          </div>
          <div><b>Total:</b> {total || '—'}</div>
          {order.buyer_email && (
            <div className="text-sm"><b>Receipt email:</b> {order.buyer_email}</div>
          )}
          <div className="mt-2">
            <b>Items</b>
            <ul className="list-disc pl-5 mt-1 text-sm">
              {items.map((it, i) => (
                <li key={i}>
                  <span className="font-medium">{it.name || 'Item'}</span>
                  {' '}· qty {it.quantity || 1}
                </li>
              ))}
            </ul>
          </div>
          <div className="text-xs opacity-60 mt-2 break-all">
            Stripe session: {order.stripe_session_id}
          </div>
        </div>
      )}

      {msg && <div className="p-3 border rounded bg-white">{msg}</div>}

      <div className="pt-2">
        <Link href="/u/stephanie" className="underline">← Back to boutique</Link>
      </div>
    </div>
  );
}
