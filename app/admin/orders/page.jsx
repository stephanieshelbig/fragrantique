'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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

export default function AdminOrdersPage() {
  const searchParams = useSearchParams();
  const targetOrderId = searchParams.get('id') || '';

  const [viewer, setViewer] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [booting, setBooting] = useState(true);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [emailFilter, setEmailFilter] = useState('');

  const orderRefs = useRef({});

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user || null;
      setViewer(user);

      if (!user) {
        setBooting(false);
        return;
      }

      const { data: prof } = await supabase
        .from('profiles')
        .select('id, is_admin')
        .eq('id', user.id)
        .maybeSingle();

      setIsAdmin(!!prof?.is_admin);
      setBooting(false);
    })();
  }, []);

  useEffect(() => {
    if (!booting && viewer && isAdmin) {
      loadOrders();
    }
  }, [booting, viewer, isAdmin]);

  useEffect(() => {
    if (!targetOrderId || !rows.length) return;

    const el = orderRefs.current[targetOrderId];
    if (el) {
      setTimeout(() => {
        el.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }, 150);
    }
  }, [targetOrderId, rows]);

  async function loadOrders() {
    setLoading(true);
    setMsg('');

    try {
      const { data, error } = await supabase
        .from(ORDER_TABLE)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5000);

      if (error) throw error;

      setRows(data || []);

      if (targetOrderId) {
        const found = (data || []).some((r) => String(r.id) === String(targetOrderId));
        if (!found) {
          setMsg('Linked order was not found in the loaded results.');
        }
      }
    } catch (err) {
      setMsg(`Load error: ${err.message}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredRows = useMemo(() => {
    const q = emailFilter.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((row) =>
      String(row.buyer_email || '').toLowerCase().includes(q)
    );
  }, [rows, emailFilter]);

  if (booting) {
    return <div className="p-6">Loading…</div>;
  }

  if (!viewer || !isAdmin) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-3">
        <h1 className="text-2xl font-bold">Admin · Orders</h1>
        <p className="opacity-70">Please sign in as an admin.</p>
        <Link href="/admin" className="underline text-sm">
          ← Back to Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin · Orders</h1>
        <Link href="/admin" className="underline text-sm">
          ← Back to Admin
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={emailFilter}
          onChange={(e) => setEmailFilter(e.target.value)}
          placeholder="Filter by buyer email…"
          className="border rounded px-3 py-2 flex-1"
        />
        <button
          onClick={loadOrders}
          disabled={loading}
          className="px-4 py-2 rounded bg-black text-white hover:opacity-90 disabled:opacity-60"
        >
          {loading ? 'Loading…' : 'Reload'}
        </button>
      </div>

      {targetOrderId && (
        <div className="text-sm rounded border bg-amber-50 p-3">
          Jump target order ID: <span className="font-mono">{targetOrderId}</span>
        </div>
      )}

      {msg && (
        <div className="p-3 rounded bg-white border shadow text-sm">
          {msg}
        </div>
      )}

      <div className="text-sm opacity-70">
        Showing {filteredRows.length} order{filteredRows.length === 1 ? '' : 's'}
      </div>

      <div className="space-y-4">
        {filteredRows.map((order) => {
          const isTarget = String(order.id) === String(targetOrderId);
          const items = Array.isArray(order.items) ? order.items : [];

          return (
            <div
              key={order.id}
              ref={(el) => {
                if (el) orderRefs.current[order.id] = el;
              }}
              className={`rounded border p-4 bg-white space-y-4 transition-all ${
                isTarget ? 'ring-2 ring-pink-500 bg-pink-50' : ''
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs uppercase tracking-wide opacity-60">
                    Order
                  </div>
                  <div className="font-mono text-sm break-all">{order.id}</div>

                  <div className="text-sm">
                    <span className="opacity-60">Buyer:</span>{' '}
                    <span className="font-medium">{order.buyer_email || '—'}</span>
                  </div>

                  <div className="text-sm">
                    <span className="opacity-60">Placed:</span>{' '}
                    <span>{formatDateTime(order.created_at)}</span>
                  </div>

                  {order.amount_total != null && (
                    <div className="text-sm">
                      <span className="opacity-60">Total:</span>{' '}
                      <span className="font-medium">
                        {formatMoney(order.amount_total, order.currency || 'usd')}
                      </span>
                    </div>
                  )}

                  {order.payment_status && (
                    <div className="text-sm">
                      <span className="opacity-60">Payment:</span>{' '}
                      <span>{order.payment_status}</span>
                    </div>
                  )}
                </div>

                {isTarget && (
                  <div className="self-start rounded bg-pink-600 text-white text-xs px-2 py-1">
                    Linked order
                  </div>
                )}
              </div>

              <div>
                <div className="font-medium mb-2">Items</div>

                {items.length ? (
                  <div className="space-y-2">
                    {items.map((item, idx) => (
                      <div
                        key={`${order.id}-${idx}`}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b pb-2 text-sm"
                      >
                        <div>
                          {item?.name || 'Unnamed item'}
                          {item?.quantity ? (
                            <span className="opacity-60"> × {item.quantity}</span>
                          ) : null}
                        </div>

                        <div className="opacity-70 whitespace-nowrap">
                          {typeof item?.unit_amount === 'number'
                            ? formatMoney(item.unit_amount, item.currency || 'usd')
                            : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm opacity-60">No items found.</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!filteredRows.length && !loading && (
        <div className="p-4 border rounded bg-white">No orders found.</div>
      )}
    </div>
  );
}
