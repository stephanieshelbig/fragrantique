'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

function normalizeText(str = '') {
  return String(str)
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function AdminFragranceSalesPage() {
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  async function runSearch(e) {
    e.preventDefault();

    setError('');
    setRows([]);
    setHasSearched(true);

    const q = normalizeText(search);

    if (!q) {
      setError('Please enter a fragrance name or brand.');
      return;
    }

    setBusy(true);

    const { data, error } = await supabase
      .from('orders')
      .select('id, created_at, buyer_email, buyer_name, items')
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
        const name =
          item.name ||
          item.fragrance_name ||
          item.title ||
          item.product_name ||
          '';

        const haystack = normalizeText(`${brand} ${name}`);

        if (!haystack.includes(q)) continue;

        const quantity = Number(item.quantity || item.qty || 1);

        const unitPrice = Number(
          item.price ||
            item.unit_price ||
            item.decant_price ||
            item.unit_amount ||
            0
        );

        const lineTotal =
          Number(
            item.total ||
              item.line_total ||
              item.amount_total ||
              item.subtotal ||
              0
          ) || unitPrice * quantity;

        matches.push({
          orderId: order.id,
          date: order.created_at,
          buyer:
            order.buyer_name ||
            item.buyer_name ||
            item.customer_name ||
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

  function money(n) {
    return Number(n || 0).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  }

  function dateOnly(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <Link href="/admin" style={styles.back}>
          ← Back to Admin
        </Link>

        <h1 style={styles.title}>Fragrance Sales Search</h1>

        <p style={styles.subtitle}>
          Search a fragrance to see every matching decant sale, quantity sold,
          purchase date, buyer, and total sales.
        </p>

        <form onSubmit={runSearch} style={styles.form}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Example: mind games queenside"
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
              <div style={styles.summaryBox}>
                <strong>Total Quantity Sold</strong>
                <span>{totals.quantity}</span>
              </div>

              <div style={styles.summaryBox}>
                <strong>Total Sales</strong>
                <span>{money(totals.sales)}</span>
              </div>
            </div>

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Fragrance</th>
                    <th style={styles.th}>Buyer</th>
                    <th style={styles.th}>Qty</th>
                    <th style={styles.th}>Price</th>
                    <th style={styles.th}>Line Total</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, i) => (
                    <tr key={`${row.orderId}-${i}`}>
                      <td style={styles.td}>{dateOnly(row.date)}</td>

                      <td style={styles.td}>
                        <strong>{row.brand}</strong>
                        <br />
                        {row.name}
                      </td>

                      <td style={styles.td}>
                        {row.buyer}
                        {row.buyerEmail && row.buyerEmail !== row.buyer && (
                          <>
                            <br />
                            <small style={styles.small}>{row.buyerEmail}</small>
                          </>
                        )}
                      </td>

                      <td style={styles.td}>{row.quantity}</td>
                      <td style={styles.td}>{money(row.unitPrice)}</td>
                      <td style={styles.td}>{money(row.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>

                <tfoot>
                  <tr>
                    <td style={styles.footerTd} colSpan="3">
                      Totals
                    </td>
                    <td style={styles.footerTd}>{totals.quantity}</td>
                    <td style={styles.footerTd}></td>
                    <td style={styles.footerTd}>{money(totals.sales)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}

        {!busy && hasSearched && rows.length === 0 && !error && (
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
    fontSize: 34,
  },
  subtitle: {
    color: '#76685c',
    lineHeight: 1.5,
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
    whiteSpace: 'nowrap',
  },
  error: {
    color: '#a33',
  },
  empty: {
    color: '#76685c',
    marginTop: 18,
  },
  summary: {
    display: 'flex',
    gap: 18,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  summaryBox: {
    background: '#fbf7f2',
    border: '1px solid #eadfd4',
    borderRadius: 16,
    padding: '18px 22px',
    minWidth: 220,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    color: '#2f241c',
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: 'Arial, sans-serif',
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    borderBottom: '2px solid #d8c8b7',
    color: '#2f241c',
    background: '#fbf7f2',
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #eadfd4',
    verticalAlign: 'top',
    color: '#3a3028',
  },
  footerTd: {
    padding: '14px 12px',
    borderTop: '2px solid #d8c8b7',
    fontWeight: 'bold',
    color: '#2f241c',
    background: '#fbf7f2',
  },
  small: {
    color: '#76685c',
  },
};
