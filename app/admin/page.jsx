// app/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { isAdminEmail } from '@/lib/isAdmin';

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const userEmail = data?.session?.user?.email ?? null;
      setEmail(userEmail);

      if (isAdminEmail(userEmail)) {
        setAllowed(true);
        setLoading(false);
      } else {
        // Not admin → send away (keeps admin area secret)
        window.location.href = '/';
      }
    })();
  }, []);

  if (loading) return <div className="p-6">Loading…</div>;
  if (!allowed) return null;

  return (
    <main className="min-h-screen bg-[#fdfcf9] p-6">
      <header className="max-w-6xl mx-auto mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-gray-600">
            Signed in as <span className="font-medium">{email}</span>
          </p>
        </div>
        <Link
          href="/u/stephanie"
          className="text-sm underline"
        >
          ← Back to Boutique
        </Link>
      </header>

      <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {/* Orders */}
        <Card
          title="Orders"
          desc="View recent Stripe orders and buyer details."
          actions={[
            { label: 'Open Orders', href: '/admin/orders' },
          ]}
        />

        {/* Image Cleanup */}
        <Card
          title="Image Cleanup"
          desc="Remove white backgrounds and fix missing images."
          actions={[
            { label: 'Open Cleaner', href: '/admin/clean-images' },
          ]}
        />

        {/* Brand Index */}
        <Card
          title="Brand Index"
          desc="Browse all brands and manage brand pages."
          actions={[
            { label: 'Open Brand Index', href: '/brand' },
          ]}
        />

        {/* Fragrance Editor (if you have one) */}
        <Card
          title="Fragrance Editor"
          desc="Add or modify fragrances and metadata."
          actions={[
            { label: 'Open Editor', href: '/admin/fragrances' },
          ]}
        />

        {/* Test Email */}
        <Card
          title="Email Test"
          desc="Send a test email to confirm SMTP works."
          actions={[
            { label: 'Send Test Email', href: '/api/test-email', external: true },
          ]}
        />

        {/* Webhook Debug (only if you use it) */}
        <Card
          title="Stripe Webhook Debug"
          desc="Review webhook delivery or trigger a test."
          actions={[
            { label: 'Stripe Dashboard', href: 'https://dashboard.stripe.com/test/webhooks', external: true },
          ]}
        />
      </section>
    </main>
  );
}

function Card({
  title,
  desc,
  actions,
}: {
  title: string;
  desc: string;
  actions: { label: string; href: string; external?: boolean }[];
}) {
  return (
    <div className="bg-white border rounded-2xl shadow-sm p-5 flex flex-col">
      <div className="mb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-gray-600 mt-1">{desc}</p>
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        {actions.map((a) =>
          a.external ? (
            <a
              key={a.label}
              href={a.href}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50"
            >
              {a.label}
            </a>
          ) : (
            <Link
              key={a.label}
              href={a.href}
              className="px-3 py-2 text-sm rounded-lg border hover:bg-gray-50"
            >
              {a.label}
            </Link>
          )
        )}
      </div>
    </div>
  );
}
