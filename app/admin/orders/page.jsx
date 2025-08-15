'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function AdminOrders() {
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user || null;
      setViewer(user);
      if (!user) { setLoading(false); return; }

      // require admin
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, is_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (!prof?.is_admin) {
        setMsg('You must be an admin to view orders.');
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      setOrders(data || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-6">Loading…</div>;

  if (!viewer) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-2">
        <h1 className="text-2xl font-bold">Admin · Orders</h1>
        <p>Please sign in.</p>
      </div>
    );
  }

  if (msg) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-2">
        <h1 className="text-2xl font-bold">Admin · Orders</h1>
        <p>{msg}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin · Orders</h1>
        <Link href="/admin" className="underline text-sm">← Back to Admin</Link>
      </div>

      {!orders.length && (
        <div className="p-4 border rounded bg-white">No orders yet.</div>
      )}

      <div className="space-y-3">
        {orders.map(o => {
          const items = Array.isArray(o.items) ? o.items : [];
          return (
            <div key={o.id} className="border rounded bg-white p-4">
              <div className="flex items-center justify-between text-sm">
                <div className="opacity-80">{new Date(o.created_at).toLocaleString()}</div>
                <div className={`px-2 py-0.5 rounded text-xs ${o.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                  {o.status}
                </div>
              </div>
              <div className="mt-1 text-sm">
                <b>Buyer:</b> {o.buyer_email || 'unknown'} · <b>Total:</b> {(o.amount_total/100).toFixed(2)} {(o.currency || 'USD').toUpperCase()}
              </div>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {items.map((it, i) => (
                  <li key={i}><b>{it.name || 'Item'}</b> — qty {it.quantity || 1}</li>
                ))}
              </ul>
              <div className="mt-2 text-xs opacity-70">
                Stripe session: {o.stripe_session_id}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
