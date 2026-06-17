'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function AdminFragranceSalesPage() {
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);

  async function runSearch(e) {
    e.preventDefault();
    setError('');
    setRows([]);

    const q = search.trim().toLowerCase();
    if (!q) {
      setError('Please enter a fragrance name or brand.');
      return;
    }

    setBusy(true);

    const { data, error } = await supabase
      .from('orders')
      .select('id, created_at, buyer_email, buyer_name, buyer_name, items')
      .order('created_at', { ascending: false })
      .limit(5000);

    setBusy(false);

    if (error) {
      setError(error.message);
      return;
    }

    const matches = [];

    for (const order of data || []) {
      const items = Array.isArray(order.items) ? order.items : [];

      for (const item of items) {
        const brand = item.brand || '';
        const name = item.name || item.fragrance_name || item.title || '';
        const haystack = `${brand} ${name}`.toLowerCase();

        if (!haystack.includes(q)) continue;

        const quantity = Number(item.quantity || item.qty || 1);
        const unitPrice =
          Number(item.price || item.unit_price || item.decant_price || 0);

        const lineTotal =
          Number(item.total || item.line_total || item.amount_total || 0) ||
          unitPrice * quantity;

        matches.push({
          orderId: order.id,
          date: order.created_at,
          buyer:
            order.buyer_name ||
            order.buyer_name ||
            item.buyer_name ||
            order.buyer_email ||
            'Unknown',
          buyerEmail: order.buyer_email,
          brand,
          name,
          quantity,
          unitPrice,
          lineTotal,
        });
      }
    }

    setRows(matches);
  }

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.quantity += row.quantity;
        acc.sales += row.lineTotal;
        return acc;
      },
      { quantity: 0, sales: 0 }
    );
  }, [rows]);

  const money = (n) =>
    Number(n || 0).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <Link href="/admin" style={styles.back}>
          ← Back to Admin
        </Link>

        <h1 style={styles.title}>Fragrance Sales Search</h1>
        <p style={styles.subtitle}>
          Search a fragrance to see all matching decant sales.
        </p>

        <form onSubmit={runSearch} style={styles.form}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search fragrance name or brand..."
            style={styles.input}
          />
          <button type="submit" disabled={busy} style={styles.button}>
            {busy ? 'Searching...' : 'Search'}
          </button>
        </form>

        {error && <p style={styles.error}>{error}</p>}

        {rows.length > 0 && (
          <>
            <div style={styles.summary}>
              <div>
                <strong>Total Quantity Sold</strong>
                <span>{totals.quantity}</span>
              </div>
              <div>
                <strong>Total Sales</strong>
                <span>{money(totals.sales)}</span>
              </div>
            </div>

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Fragrance</th>
                    <th>Buyer</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={`${row.orderId}-${i}`}>
                      <td>{new Date(row.date).toLocaleDateString()}</td>
                      <td>
                        <strong>{row.brand}</strong>
                        <br />
                        {row.name}
                      </td>
                      <td>
                        {row.buyer}
                        {row.buyerEmail && row.buyerEmail !== row.buyer && (
                          <>
                            <br />
                            <small>{row.buyerEmail}</small>
                          </>
                        )}
                      </td>
                      <td>{row.quantity}</td>
                      <td>{money(row.unitPrice)}</td>
                      <td>{money(row.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan="3">
                      <strong>Totals</strong>
                    </td>
                    <td>
                      <strong>{totals.quantity}</strong>
                    </td>
                    <td></td>
                    <td>
                      <strong>{money(totals.sales)}</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}

        {!busy && search && rows.length === 0 && !error && (
          <p style={styles.empty}>No decant sales found for that fragrance.</p>
        )}
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#fbf7f2',
    padding: '40px 20px',
    fontFamily: 'Georgia, serif',
  },
  card: {
    maxWidth: 1100,
    margin: '0 auto',
    background: '#fff',
    border: '1px solid #eadfd4',
    borderRadius: 20,
    padding: 28,
    boxShadow: '0 12px 30px rgba(0,0,0,.08)',
  },
  back: {
    color: '#8a6a3f',
    textDecoration: 'none',
  },
  title: {
    marginTop: 18,
    marginBottom: 8,
    color: '#2f241c',
  },
  subtitle: {
    color: '#76685c',
  },
  form: {
    display: 'flex',
    gap: 12,
    margin: '24px 0',
  },
  input: {
    flex: 1,
    padding: '14px 16px',
    borderRadius: 12,
    border: '1px solid #d8c8b7',
    fontSize: 16,
  },
  button: {
    padding: '14px 22px',
    borderRadius: 12,
    border: 'none',
    background: '#b08a57',
    color: '#fff',
    fontSize: 16,
    cursor: 'pointer',
  },
  error: {
    color: '#a33',
  },
  empty: {
    color: '#76685c',
  },
  summary: {
    display: 'flex',
    gap: 18,
    marginBottom: 20,
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
};
