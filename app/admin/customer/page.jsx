'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const ORDER_TABLE = 'orders'; // <-- change this if your table has a different name

function normalizeEmail(value) {
  return (value || '').trim().toLowerCase();
}

function parseFragranceName(itemName) {
  if (!itemName || typeof itemName !== 'string') return null;

  // Example:
  // "Fragrance du Bois — Tropiques (10mL decant $34)"
  // We want: "Fragrance du Bois — Tropiques"

  let cleaned = itemName.trim();

  // remove trailing parenthetical details
  cleaned = cleaned.replace(/\s*\([^)]*\)\s*$/g, '').trim();

  return cleaned || null;
}

export default function AdminCustomerPage() {
  const [viewer, setViewer] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [booting, setBooting] = useState(true);

  const [email, setEmail] = useState('');
  const [searchedEmail, setSearchedEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const [purchases, setPurchases] = useState([]);
  const [orderCount, setOrderCount] = useState(0);

  useMemo(() => {
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
      setPurchases([]);
      setOrderCount(0);
      setSearchedEmail('');
      return;
    }

    setLoading(true);
    setMsg('');
    setPurchases([]);
    setOrderCount(0);
    setSearchedEmail(normalized);

    try {
      // Pull all matching orders for this customer email
      // If you have more than 1000 orders for one customer, we can paginate later.
      const { data, error } = await supabase
        .from(ORDER_TABLE)
        .select('buyer_email, created_at, items')
        .ilike('buyer_email', normalized)
        .order('created_at', { ascending: false })
        .limit(5000);

      if (error) {
        throw error;
      }

      const rows = data || [];
      setOrderCount(rows.length);

      const unique = new Set();

      for (const row of rows) {
        const items = Array.isArray(row.items) ? row.items : [];

        for (const item of items) {
          const fragrance = parseFragranceName(item?.name);
          if (fragrance) unique.add(fragrance);
        }
      }

      const sorted = Array.from(unique).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' })
      );

      setPurchases(sorted);

      if (!rows.length) {
        setMsg('No orders found for that email address.');
      } else if (!sorted.length) {
        setMsg('Orders found, but no fragrance names could be parsed from the items.');
      } else {
        setMsg(`Found ${sorted.length} unique fragrance${sorted.length === 1 ? '' : 's'} across ${rows.length} order${rows.length === 1 ? '' : 's'}.`);
      }
    } catch (err) {
      setMsg(`Search error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (booting) {
    return <div className="p-6">Loading…</div>;
  }

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
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin · Customer Purchases</h1>
        <Link href="/admin" className="underline text-sm">
          ← Back to Admin
        </Link>
      </div>

      <p className="text-sm opacity-70">
        Search by customer email address to see an alphabetized list of fragrances they have purchased.
      </p>

      <form onSubmit={searchCustomer} className="flex flex-col sm:flex-row gap-3">
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

      {searchedEmail && (
        <div className="rounded border bg-white p-4 space-y-3">
          <div>
            <div className="text-xs uppercase tracking-wide opacity-60">Customer</div>
            <div className="font-medium">{searchedEmail}</div>
          </div>

          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="opacity-60">Orders:</span>{' '}
              <span className="font-medium">{orderCount}</span>
            </div>
            <div>
              <span className="opacity-60">Unique fragrances:</span>{' '}
              <span className="font-medium">{purchases.length}</span>
            </div>
          </div>
        </div>
      )}

      {purchases.length > 0 && (
        <div className="rounded border bg-white p-4">
          <h2 className="font-semibold mb-3">Purchased fragrances</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
            {purchases.map((name) => (
              <div key={name} className="text-sm">
                {name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
