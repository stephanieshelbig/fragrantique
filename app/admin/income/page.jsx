'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const ADMIN_EMAILS = ['stephanieshelbig@gmail.com'];
const money = (cents) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(cents || 0) / 100);
const currentMonth = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Phoenix', year: 'numeric', month: '2-digit' }).format(new Date()).replace(/^(\d{4})-(\d{2})$/, '$1-$2');
const columns = [
  ['order_count', 'Orders', (v) => Number(v || 0).toLocaleString()],
  ['subtotal_cents', 'Subtotal', money],
  ['tax_cents', 'Tax', money],
  ['shipping_cents', 'Shipping', money],
  ['total_cents', 'Total Income', money],
  ['label_cost_cents', 'Label Costs', money],
];

export default function AdminIncomePage() {
  const [auth, setAuth] = useState('checking');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [view, setView] = useState('monthly');
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentMonth().slice(0, 4));

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user || !ADMIN_EMAILS.includes((user.email || '').toLowerCase())) {
          if (active) { setAuth('denied'); setLoading(false); }
          return;
        }
        if (active) setAuth('allowed');
        const { data, error: rpcError } = await supabase.rpc('admin_monthly_income');
        if (rpcError) throw rpcError;
        if (active) setRows(data || []);
      } catch (e) {
        if (active) setError(e.message || 'Unable to load income.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const displayed = useMemo(() => {
    if (view === 'monthly') return rows.filter((r) => r.month === month);
    return rows.filter((r) => r.month.startsWith(`${year}-`));
  }, [rows, view, month, year]);

  const totals = useMemo(() => Object.fromEntries(columns.map(([key]) => [key, displayed.reduce((sum, r) => sum + Number(r[key] || 0), 0)])), [displayed]);

  function exportCsv() {
    const headers = ['Month', ...columns.map(([, label]) => label)];
    const lines = [headers, ...displayed.map((r) => [r.month, ...columns.map(([key]) => key === 'order_count' ? Number(r[key] || 0) : (Number(r[key] || 0) / 100).toFixed(2))])];
    const csv = lines.map((line) => line.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `fragrantique-income-${view === 'monthly' ? month : year}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (auth === 'checking') return <main className="min-h-screen bg-[#fcf8f6] p-10 text-[#5f463d]">Checking authorization…</main>;
  if (auth === 'denied') return <main className="min-h-screen bg-[#fcf8f6] p-10 text-[#5f463d]">Access denied. <Link className="underline" href="/">Return home</Link></main>;

  return (
    <main className="min-h-screen bg-[#fcf8f6] px-4 py-10 text-[#5f463d] sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-[28px] border border-[#eadfd9] bg-white p-7 shadow-sm">
          <Link href="/admin" className="text-sm text-[#9a7b6f] hover:underline">← Admin Dashboard</Link>
          <p className="mt-5 text-xs uppercase tracking-[0.28em] text-[#b38b7d]">Fragrantique · Private Administration</p>
          <h1 className="mt-2 font-serif text-4xl">Income Dashboard</h1>
          <p className="mt-3 text-sm text-[#8c6f64]">Paid orders · USD · Months use Arizona time</p>
        </header>

        <section className="rounded-[28px] border border-[#eadfd9] bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-2 text-sm">Report view
              <select value={view} onChange={(e) => setView(e.target.value)} className="rounded-xl border border-[#eadfd9] bg-[#fdf9f7] p-3">
                <option value="monthly">Single month</option><option value="yearly">Full year</option>
              </select>
            </label>
            {view === 'monthly' ? (
              <label className="flex flex-col gap-2 text-sm">Choose month
                <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-xl border border-[#eadfd9] bg-[#fdf9f7] p-3" />
              </label>
            ) : (
              <label className="flex flex-col gap-2 text-sm">Year
                <input type="number" min="2020" max="2100" value={year} onChange={(e) => setYear(e.target.value)} className="w-32 rounded-xl border border-[#eadfd9] bg-[#fdf9f7] p-3" />
              </label>
            )}
            <button onClick={exportCsv} disabled={loading || displayed.length === 0} className="rounded-xl bg-[#5f463d] px-5 py-3 text-sm text-white disabled:opacity-40">Export CSV</button>
          </div>
        </section>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}. Confirm the SQL function was installed.</p>}
        {loading ? <p>Loading income…</p> : <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {columns.map(([key, label, format]) => (
              <div key={key} className="rounded-2xl border border-[#eadfd9] bg-white p-5 shadow-sm">
                <p className="text-sm text-[#8c6f64]">{label}</p>
                <p className="mt-2 break-words font-serif text-2xl sm:text-3xl">{format(totals[key])}</p>
              </div>
            ))}
          </section>
          <section className="overflow-hidden rounded-[28px] border border-[#eadfd9] bg-white p-6 shadow-sm">
            <h2 className="mb-4 font-serif text-2xl">{view === 'monthly' ? 'Monthly Breakdown' : 'Monthly History'}</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead><tr className="border-b border-[#eadfd9] bg-[#fdf9f7]"><th className="p-3">Month</th>{columns.map(([, label]) => <th key={label} className="p-3 text-right">{label}</th>)}</tr></thead>
                <tbody>
                  {displayed.map((r) => <tr key={r.month} className="border-b border-[#f2e8e3]"><td className="p-3">{r.month}</td>{columns.map(([key,, format]) => <td key={key} className="p-3 text-right tabular-nums">{format(r[key])}</td>)}</tr>)}
                  {displayed.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-[#8c6f64]">No paid orders found for this period.</td></tr>}
                </tbody>
                {view === 'yearly' && displayed.length > 0 && <tfoot><tr className="bg-[#f8eef1] font-semibold"><td className="p-3">Year total</td>{columns.map(([key,, format]) => <td key={key} className="p-3 text-right">{format(totals[key])}</td>)}</tr></tfoot>}
              </table>
            </div>
          </section>
          <p className="text-xs text-[#8c6f64]">Total income is the amount charged to customers, including tax and shipping. Label costs are recorded shipping-label expenses, not all business expenses. Refunds are not deducted unless the order status or total is updated in your database.</p>
