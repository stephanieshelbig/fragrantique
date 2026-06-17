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

function parseFragranceTitle(title = '') {
  const text = String(title);

  const sizeMatch = text.match(/\(([^)]*?decant[^)]*?)\)/i);
  const sizeText = sizeMatch ? sizeMatch[1] : '';

  const sizeOnlyMatch = sizeText.match(/(\d+(?:\.\d+)?\s*mL)/i);
  const size = sizeOnlyMatch ? sizeOnlyMatch[1].replace(/\s+/g, '') : '';

  const cleanName = text
    .replace(/\([^)]*?decant[^)]*?\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    cleanName,
    size,
  };
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

        const rawName =
          item.name ||
          item.fragrance_name ||
          item.title ||
          item.product_name ||
          '';

        const haystack = normalizeText(`${brand} ${rawName}`);

        if (!haystack.includes(q)) continue;

        const parsed = parseFragranceTitle(rawName);

        const quantity = Number(item.quantity || item.qty || 1);

        const rawUnitPrice = Number(
          item.price ||
            item.unit_price ||
            item.decant_price ||
            item.unit_amount ||
            0
        );

        const rawLineTotal =
          Number(
            item.total ||
              item.line_total ||
              item.amount_total ||
              item.subtotal ||
              0
          ) || rawUnitPrice * quantity;

        const unitPrice = rawUnitPrice / 100;
        const lineTotal = rawLineTotal / 100;

        matches.push({
          orderId: order.id,
          date: order.created_at,
          buyer:
            order.buyer_name ||
            item.buyer_name ||
            order.buyer_email ||
            'Unknown',
          buyerEmail: order.buyer_email,
          fragrance: parsed.cleanName || rawName,
          size: item.size || item.size_ml || parsed.size || '',
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
        acc.orders += 1;
        acc.quantity += row.quantity;
        acc.sales += row.lineTotal;
        return acc;
      },
      { orders: 0, quantity: 0, sales: 0 }
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
          Search a fragrance to see every matching decant sale.
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
                <strong># Orders</strong>
                <span>{totals.orders}</span>
              </div>

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
                    <th style={styles.th}>Size</th>
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

                      <td style={styles.td}>{row.fragrance}</td>

                      <td style={styles.td}>{row.size || '—'}</td>

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
                    <td colSpan="4" style={styles.footerTd}>
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
    maxWidth: 1250,
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
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  summaryBox: {
    background: '#fbf7f2',
    border: '1px solid #eadfd4',
    borderRadius: 16,
    padding: '18px 22px',
    minWidth: 200,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  tableWrap: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: 12,
    background: '#f3ede8',
    borderBottom: '2px solid #d8c8b7',
  },
  td: {
    padding: 12,
    borderBottom: '1px solid #eadfd4',
    verticalAlign: 'top',
  },
  footerTd: {
    padding: 14,
    fontWeight: 'bold',
    background: '#f7f2ee',
    borderTop: '2px solid #d8c8b7',
  },
  small: {
    color: '#76685c',
  },
};
