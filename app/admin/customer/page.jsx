'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const ORDER_TABLE = 'orders';

function normalizeEmail(value) {
  return (value || '').trim().toLowerCase();
}

function parseFragranceName(itemName) {
  if (!itemName || typeof itemName !== 'string') return null;

  let cleaned = itemName.trim();
  cleaned = cleaned.replace(/\s*\([^)]*\)\s*$/g, '').trim();

  return cleaned || null;
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function AdminCustomerPage() {
  const [viewer, setViewer] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [booting, setBooting] = useState(true);

  const [email, setEmail] = useState('');
  const [searchedEmail, setSearchedEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const [results, setResults] = useState([]);
  const [orderCount, setOrderCount] = useState(0);

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

  async function searchCustomer(e) {
    e?.preventDefault?.();

    const normalized = normalizeEmail(email);
    if (!normalized) {
      setMsg('Please enter an email address.');
      setResults([]);
      setOrderCount(0);
      setSearchedEmail('');
      return;
    }

    setLoading(true);
    setMsg('');
    setResults([]);
    setOrderCount(0);
    setSearchedEmail(normalized);

    try {
      const { data, error } = await supabase
        .from(ORDER_TABLE)
        .select('buyer_email, created_at, items')
        .ilike('buyer_email', normalized)
        .order('created_at', { ascending: false })
        .limit(5000);

      if (error) throw error;

      const rows = data || [];
      setOrderCount(rows.length);

      const allPurchases = [];

      for (const row of rows) {
        const items = Array.isArray(row.items) ? row.items : [];

        for (const item of items) {
          const fragrance = parseFragranceName(item?.name);
          if (fragrance) {
            allPurchases.push({
              name: fragrance,
              date: row.created_at,
            });
          }
        }
      }

      // Sort alphabetically, then by date (newest first for same fragrance)
      allPurchases.sort((a, b) => {
        const nameCompare = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        if (nameCompare !== 0) return nameCompare;
        return new Date(b.date) - new Date(a.date);
      });

      setResults(allPurchases);

      if (!rows.length) {
        setMsg('No orders found for that email address.');
      } else {
        setMsg(`Found ${allPurchases.length} total purchases across ${rows.length} orders.`);
      }
    } catch (err) {
      setMsg(`Search error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (booting) return <div className="p-6">Loading…</div>;

  if (!viewer || !isAdmin) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-3">
        <h1 className="text-2xl font-bold">Admin · Customer Purchases</h1>
        <p className="opacity-70">Please sign in as an admin.</p>
        <Link href="/admin" className="underline text-sm">
          ← Back to Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin · Customer Purchases</h1>
        <Link href="/admin" className="underline text-sm">
          ← Back to Admin
        </Link>
      </div>

      <form onSubmit={searchCustomer} className="flex gap-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="customer@example.com"
          className="border rounded px-3 py-2 flex-1"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded bg-black text-white hover:opacity-90 disabled:opacity-60"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {msg && (
        <div className="p-3 rounded bg-white border shadow text-sm">
          {msg}
        </div>
      )}

      {results.length > 0 && (
        <div className="rounded border bg-white p-4">
          <h2 className="font-semibold mb-3">Purchased fragrances</h2>

          {/* ONE COLUMN LIST */}
          <div className="space-y-2">
            {results.map((item, idx) => (
              <div
                key={idx}
                className="flex justify-between border-b pb-1 text-sm"
              >
                <span>{item.name}</span>
                <span className="opacity-60">{formatDate(item.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
