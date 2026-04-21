'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const ADMIN_EMAILS = ['stephanieshelbig@gmail.com'];

const adminLinks = [
  { href: '/admin/customer', label: 'Customer', desc: 'View and manage customer info' },
  { href: '/admin/fragrances', label: 'Fragrances', desc: 'Manage fragrance listings' },
  { href: '/admin/orders', label: 'Orders', desc: 'Review purchases and shipping details' },
  { href: '/admin/reviews', label: 'Reviews', desc: 'Moderate customer reviews' }
];

export default function AdminPage() {
  const router = useRouter();

  const [username, setUsername] = useState('stephanie');
  const [msg, setMsg] = useState('');
  const [viewer, setViewer] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let redirectTimer;

    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user || null;

      setViewer(user);

      const email = user?.email?.toLowerCase() || '';
      const admin = ADMIN_EMAILS.includes(email);

      setIsAuthorized(admin);
      setAuthChecked(true);

      if (!admin) {
        redirectTimer = setTimeout(() => {
          router.push('/');
        }, 3000);
      }
    })();

    return () => {
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [router]);

  async function publishFromDb() {
    if (!isAuthorized) return;

    setMsg('Publishing (from DB)…');
    try {
      const res = await fetch('/api/publish-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, mode: 'from-db-private' })
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'publish failed');

      setMsg(`Published ${j.updated || 0} positions to public ✓`);
    } catch (e) {
      setMsg(`Error: ${e.message}`);
    }
  }

  async function publishFromLocal() {
    if (!isAuthorized) return;

    setMsg('Publishing (from browser backup)…');
    try {
      const key = `fragrantique_layout_by_brand_${username}`;
      const map = JSON.parse(localStorage.getItem(key) || '{}');

      const res = await fetch('/api/publish-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, mode: 'from-local', map })
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'publish failed');

      setMsg(`Published ${j.updated || 0} positions from local backup ✓`);
    } catch (e) {
      setMsg(`Error: ${e.message}`);
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#fcf8f6] px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl border border-[#eadfd9] bg-white/90 p-8 shadow-sm">
            <p className="text-sm tracking-[0.18em] uppercase text-[#9a7b6f]">
              Checking authorization...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#fcf8f6] px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl border border-[#eadfd9] bg-white/95 p-10 shadow-sm">
            <h1 className="text-3xl font-serif text-[#5f463d]">Admin</h1>
            <div className="mt-5 rounded-2xl border border-[#f0d7dd] bg-[#fff8fa] px-5 py-4 text-[#8b5e6b] shadow-sm">
              Unauthorized user. Redirecting...
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcf8f6] px-6 py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-[28px] border border-[#eadfd9] bg-white/95 p-8 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#b38b7d]">
                Fragrantique
              </p>
              <h1 className="mt-2 text-4xl font-serif text-[#5f463d]">
                Admin Dashboard
              </h1>
              <p className="mt-3 text-sm text-[#8c6f64]">
                Signed in as{' '}
                <span className="font-medium text-[#5f463d]">
                  {viewer?.email || 'not signed in'}
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-[#efe3dc] bg-[#fdf9f7] px-4 py-3 text-sm text-[#8c6f64] shadow-sm">
              Username target:{' '}
              <span className="rounded-md bg-white px-2 py-1 font-mono text-[#5f463d]">
                {username}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-[#eadfd9] bg-white/95 p-8 shadow-sm">
          <div className="mb-5">
            <h2 className="text-2xl font-serif text-[#5f463d]">Admin Pages</h2>
            <p className="mt-2 text-sm text-[#8c6f64]">
              Open any admin section in a new tab.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {adminLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group rounded-3xl border border-[#efe3dc] bg-gradient-to-br from-white to-[#fbf4f1] p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-[#5f463d]">
                      {item.label}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-[#8c6f64]">
                      {item.desc}
                    </p>
                  </div>

                  <div className="rounded-full border border-[#ead8cf] bg-white px-3 py-1 text-sm text-[#9b7b70] transition group-hover:border-[#d8bbb0] group-hover:text-[#5f463d]">
                    ↗
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-[#eadfd9] bg-white/95 p-8 shadow-sm">
          <div className="mb-5">
            <h2 className="text-2xl font-serif text-[#5f463d]">Publish Layout</h2>
            <p className="mt-2 text-sm text-[#8c6f64]">
              Copy your current arrangement to the public layout so logged-out visitors see it.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={publishFromDb}
              className="rounded-2xl bg-[#5f463d] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
            >
              Publish layout now (from DB)
            </button>

            <button
              onClick={publishFromLocal}
              className="rounded-2xl border border-[#e6cfd6] bg-[#c9879a] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
            >
              Publish from browser backup
            </button>
          </div>
        </div>

        {msg && (
          <div className="rounded-2xl border border-[#eadfd9] bg-white px-5 py-4 text-sm text-[#5f463d] shadow-sm">
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}
