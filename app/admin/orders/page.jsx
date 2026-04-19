'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const ORDER_TABLE = 'orders';

function formatDateTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatMoney(cents, currency = 'usd') {
  if (typeof cents !== 'number') return null;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: (currency || 'usd').toUpperCase(),
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

export default function AdminOrders() {
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [orders, setOrders] = useState([]);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState({});
  const [savingNote, setSavingNote] = useState({});
  const [emailFilter, setEmailFilter] = useState('');
  const [targetOrderId, setTargetOrderId] = useState('');

  const orderRefs = useRef({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      setTargetOrderId(params.get('id') || '');
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setMsg('');

    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user || null;
      setViewer(user);

      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('id, is_admin')
        .eq('id', user.id)
        .maybeSingle();

      const admin = !!prof?.is_admin;
      setIsAdmin(admin);

      if (!admin) {
        setMsg('You must be an admin to view orders.');
        setOrders([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from(ORDER_TABLE)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5000);

      if (error) throw error;

      const rows = data || [];
      setOrders(rows);

      if (targetOrderId) {
        const found = rows.some((r) => String(r.id) === String(targetOrderId));
        if (!found) {
          setMsg('Linked order was not found in the loaded results.');
        }
      }
    } catch (e) {
      setMsg(e.message || 'Failed to load orders');
      setOrders([]);
    }

    setLoading(false);
  }, [targetOrderId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (!targetOrderId || !orders.length) return;

    const el = orderRefs.current[targetOrderId];
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 150);
    }
  }, [targetOrderId, orders]);

  const filteredOrders = useMemo(() => {
    const q = emailFilter.trim().toLowerCase();
    if (!q) return orders;

    return orders.filter((row) =>
      String(row.buyer_email || '').toLowerCase().includes(q)
    );
  }, [orders, emailFilter]);

  async function toggleFulfilled(order, nextValue) {
    setMsg('');
    setSaving((prev) => ({ ...prev, [order.id]: true }));

    const prevOrders = orders;
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, fulfilled: nextValue } : o))
    );

    try {
      const res = await fetch('/api/admin/orders/fulfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, fulfilled: nextValue }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setOrders(prevOrders);
        setMsg(j?.error || 'Failed to save fulfilled status');
      } else {
        setMsg(nextValue ? 'Marked as fulfilled' : 'Marked as unfulfilled');
      }
    } catch (e) {
      setOrders(prevOrders);
      setMsg(e.message || 'Failed to save fulfilled status');
    } finally {
      setSaving((prev) => {
        const { [order.id]: _, ...rest } = prev;
        return rest;
      });
      setTimeout(() => setMsg(''), 1500);
    }
  }

  async function saveComment(orderId, comment) {
    setSavingNote((prev) => ({ ...prev, [orderId]: true }));
    setMsg('');

    try {
      const res = await fetch('/api/admin/orders/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, comment }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setMsg(j?.error || 'Failed to save comment');
      } else {
        setMsg('Comment saved ✓');
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, comment } : o))
        );
      }
    } catch (e) {
      setMsg(e.message || 'Failed to save comment');
    } finally {
      setSavingNote((prev) => {
        const { [orderId]: _, ...rest } = prev;
        return rest;
      });
      setTimeout(() => setMsg(''), 1200);
    }
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

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-2">
        <h1 className="text-2xl font-bold">Admin · Orders</h1>
        <p>{msg || 'You must be an admin to view orders.'}</p>
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
            disabled={loading}
            className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <Link href="/admin" className="underline text-sm">
            ← Back to Admin
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={emailFilter}
          onChange={(e) => setEmailFilter(e.target.value)}
          placeholder="Filter by buyer email…"
          className="border rounded px-3 py-2 flex-1 text-sm"
        />
      </div>

      {targetOrderId && (
        <div className="text-sm rounded border bg-amber-50 p-3">
          Jump target order ID: <span className="font-mono">{targetOrderId}</span>
        </div>
      )}

      {msg && <div className="p-3 border rounded bg-white text-sm">{msg}</div>}

      <div className="text-sm opacity-70">
        Showing {filteredOrders.length} order{filteredOrders.length === 1 ? '' : 's'}
      </div>

      {!filteredOrders.length && (
        <div className="p-4 border rounded bg-white">No orders found.</div>
      )}

      <div className="space-y-3">
        {filteredOrders.map((o) => {
          const items = Array.isArray(o.items) ? o.items : [];
          const currency = (o.currency || 'USD').toUpperCase();
          const busySaveFulfilled = !!saving[o.id];
          const busySaveNote = !!savingNote[o.id];
          const isTarget = String(o.id) === String(targetOrderId);

          return (
            <div
              key={o.id}
              ref={(el) => {
                if (el) orderRefs.current[o.id] = el;
              }}
              className={`border rounded bg-white p-4 transition-all ${
                isTarget ? 'ring-2 ring-pink-500 bg-pink-50' : ''
              }`}
            >
              <div className="flex items-center justify-between text-sm">
                <div className="opacity-80">{formatDateTime(o.created_at)}</div>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {o.status && (
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        o.status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {o.status}
                    </span>
                  )}

                  {o.payment_status && (
                    <span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200">
                      payment: {o.payment_status}
                    </span>
                  )}

                  {isTarget && (
                    <span className="px-2 py-0.5 rounded text-xs bg-pink-600 text-white">
                      Linked order
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
                <div><b>Order ID:</b> <span className="font-mono break-all">{o.id}</span></div>
                <div><b>Buyer:</b> {o.buyer_email || 'unknown'}</div>
                <div><b>Total:</b> {typeof o.amount_total === 'number' ? `${(o.amount_total / 100).toFixed(2)} ${currency}` : '—'}</div>
                {o.buyer_name && <div><b>Name:</b> {o.buyer_name}</div>}
                {o.buyer_address1 && (
                  <div className="opacity-80">
                    <b>Ship to:</b> {o.buyer_address1}
                    {o.buyer_address2 ? `, ${o.buyer_address2}` : ''}, {o.buyer_city}, {o.buyer_state} {o.buyer_postal}, {o.buyer_country || 'US'}
                  </div>
                )}
              </div>

              <ul className="mt-2 list-disc pl-5 text-sm">
                {items.length ? (
                  items.map((it, i) => (
                    <li key={i}>
                      <b>{it?.name || 'Item'}</b>
                      {it?.quantity ? ` — qty ${it.quantity}` : ''}
                      {typeof it?.unit_amount === 'number' ? ` — ${formatMoney(it.unit_amount, it.currency || o.currency || 'usd')}` : ''}
                    </li>
                  ))
                ) : (
                  <li>No items found.</li>
                )}
              </ul>

              <div className="mt-3">
                <label className="block text-xs font-medium mb-1">Notes / Comments</label>
                <textarea
                  className="border rounded w-full px-2 py-1 text-sm"
                  rows={2}
                  defaultValue={o.comment || ''}
                  placeholder="Add a short note about this order (visible to admin only)"
                  onBlur={(e) => saveComment(o.id, e.target.value)}
                />
                {busySaveNote && (
                  <div className="text-xs opacity-60 mt-1">Saving…</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
