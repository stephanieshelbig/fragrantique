'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function AdminOrders() {
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [msg, setMsg] = useState('');
  const [creating, setCreating] = useState({}); // { [orderId]: true }
  const [saving, setSaving] = useState({});     // { [orderId]: true } for fulfilled toggle

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setMsg('');
    try {
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

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        setMsg(error.message || 'Failed to load orders');
        setOrders([]);
      } else {
        setOrders(data || []);
      }
    } catch (e) {
      setMsg(e.message || 'Failed to load orders');
      setOrders([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function createLabel(orderId) {
    setMsg('');
    setCreating(prev => ({ ...prev, [orderId]: true }));
    try {
      const res = await fetch('/api/shipping/create-label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      });
      const j = await res.json();
      if (!res.ok) {
        setMsg(j?.error || 'Failed to create label');
      } else {
        if (j.label_url) window.open(j.label_url, '_blank');
        await loadOrders();
      }
    } catch (e) {
      setMsg(e.message || 'Failed to create label');
    } finally {
      setCreating(prev => {
        const { [orderId]: _, ...rest } = prev;
        return rest;
      });
    }
  }

  async function toggleFulfilled(order, nextValue) {
    setMsg('');
    setSaving(prev => ({ ...prev, [order.id]: true }));

    // optimistic UI
    const prevOrders = orders;
    setOrders(prev =>
      prev.map(o => (o.id === order.id ? { ...o, fulfilled: nextValue } : o))
    );

    try {
      const { error } = await supabase
        .from('orders')
        .update({ fulfilled: nextValue })
        .eq('id', order.id);

      if (error) {
        setOrders(prevOrders);
        setMsg(error.message || 'Failed to save fulfilled status');
      } else {
        setMsg(nextValue ? 'Marked as fulfilled' : 'Marked as unfulfilled');
      }
    } catch (e) {
      setOrders(prevOrders);
      setMsg(e.message || 'Failed to save fulfilled status');
    } finally {
      setSaving(prev => {
        const { [order.id]: _, ...rest } = prev;
        return rest;
      });
      setTimeout(() => setMsg(''), 1500);
    }
  }

  function copyToClipboard(text) {
    try {
      navigator.clipboard.writeText(String(text || ''));
      setMsg('Copied to clipboard');
      setTimeout(() => setMsg(''), 1200);
    } catch {}
  }

  if (loading) return <div className="p-6">Loading…</div>;

  if (!viewer) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-2">
        <h1 className="text-2xl font-bold">Admin · Orders</h1>
        <p>Please sign in.</p>
      </div>
    );
  }

  if (msg && msg.startsWith('You must be an admin')) {
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
        <div className="flex items-center gap-3">
          <button
            onClick={loadOrders}
            className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
          >
            Refresh
          </button>
          <Link href="/admin" className="underline text-sm">← Back to Admin</Link>
        </div>
      </div>

      {msg && (
        <div className="p-3 border rounded bg-white text-sm">{msg}</div>
      )}

      {!orders.length && (
        <div className="p-4 border rounded bg-white">No orders yet.</div>
      )}

      <div className="space-y-3">
        {orders.map(o => {
          const items = Array.isArray(o.items) ? o.items : [];
          const currency = (o.currency || 'USD').toUpperCase();

          const labelUrl = o.shipping_label_url;
          const tracking = o.tracking_number;
          const carrier = o.carrier || '';
          const service = o.service || '';
          const labelCost = typeof o.label_cost_cents === 'number'
            ? (o.label_cost_cents / 100).toFixed(2)
            : null;
          const labelStatus = o.label_status || 'none';

          const canCreate = o.status === 'paid';
          const busyCreate = !!creating[o.id];
          const busySaveFulfilled = !!saving[o.id];

          return (
            <div key={o.id} className="border rounded bg-white p-4">
              <div className="flex items-center justify-between text-sm">
                <div className="opacity-80">{new Date(o.created_at).toLocaleString()}</div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${o.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'}`}>
                    {o.status}
                  </span>
                  {labelStatus && labelStatus !== 'none' && (
                    <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800">
                      label: {labelStatus.toLowerCase()}
                    </span>
                  )}
                  <label className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                    <input
                      type="checkbox"
                      checked={!!o.fulfilled}
                      onChange={(e) => toggleFulfilled(o, e.target.checked)}
                      disabled={busySaveFulfilled}
                    />
                    <span>{busySaveFulfilled ? 'Saving…' : 'Fulfilled'}</span>
                  </label>
                </div>
              </div>

              <div className="mt-1 text-sm flex flex-wrap gap-x-4 gap-y-1">
                <div><b>Buyer:</b> {o.buyer_email || 'unknown'}</div>
                <div><b>Total:</b> {(o.amount_total/100).toFixed(2)} {currency}</div>
                {o.buyer_name && <div><b>Name:</b> {o.buyer_name}</div>}
                {o.buyer_address1 && (
                  <div className="opacity-80">
                    <b>Ship to:</b> {o.buyer_address1}{o.buyer_address2 ? `, ${o.buyer_address2}` : ''}, {o.buyer_city}, {o.buyer_state} {o.buyer_postal}, {o.buyer_country || 'US'}
                  </div>
                )}
              </div>

              <ul className="mt-2 list-disc pl-5 text-sm">
                {items.map((it, i) => (
                  <li key={i}>
                    <b>{it.name || 'Item'}</b> — qty {it.quantity || 1}
                  </li>
                ))}
              </ul>

              <div className="mt-2 text-xs opacity-70">
                Stripe session: {o.stripe_session_id}
              </div>

              <div className="mt-3 p-3 border rounded bg-gray-50 text-sm">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">USPS Label</div>
                  <div className="flex items-center gap-2">
                    {labelUrl ? (
                      <>
                        <a
                          href={labelUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 rounded border bg-white hover:bg-gray-100"
                          title="Open PDF label in a new tab"
                        >
                          View Label
                        </a>
                        <button
                          onClick={() => createLabel(o.id)}
                          className="px-2 py-1 rounded border bg-white hover:bg-gray-100"
                          disabled={busyCreate}
                          title="Purchase a new label (e.g., reprint/replace)"
                        >
                          {busyCreate ? 'Working…' : 'Reprint Label'}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => createLabel(o.id)}
                        className={`px-3 py-1.5 rounded border ${canCreate ? 'bg-white hover:bg-gray-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                        disabled={!canCreate || busyCreate}
                        title={canCreate ? 'Buy USPS label for this order' : 'Label available after payment'}
                      >
                        {busyCreate ? 'Working…' : 'Create USPS Label'}
                      </button>
                    )}
                  </div>
                </div>

                {labelUrl && (
                  <div className="mt-2 grid sm:grid-cols-2 gap-y-1">
                    <div><b>Carrier:</b> {carrier || 'USPS'}</div>
                    <div><b>Service:</b> {service || '—'}</div>
                    <div className="flex items-center gap-2">
                      <span><b>Tracking:</b> {tracking || '—'}</span>
                      {tracking && (
                        <>
                          <button
                            className="px-2 py-0.5 rounded border bg-white hover:bg-gray-100 text-xs"
                            onClick={() => copyToClipboard(tracking)}
                          >
                            Copy
                          </button>
                          <a
                            href={`https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(tracking)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-0.5 rounded border bg-white hover:bg-gray-100 text-xs"
                          >
                            Track
                          </a>
                        </>
                      )}
                    </div>
                    <div>
                      <b>Label Cost:</b>{' '}
                      {labelCost != null ? `$${labelCost} ${currency}` : '—'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
