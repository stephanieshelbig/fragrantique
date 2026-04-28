'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

function getSupabaseBrowserClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export default function AdminRequestsPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [replyDrafts, setReplyDrafts] = useState({});

  useEffect(() => {
    async function boot() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user || user.email !== 'stephanieshelbig@gmail.com') {
        setAuthorized(false);
        setCheckingAuth(false);
        setTimeout(() => router.push('/'), 3000);
        return;
      }

      setAuthorized(true);
      setCheckingAuth(false);
      loadRequests();
    }

    boot();
  }, [router, supabase]);

  async function loadRequests() {
    setLoading(true);
    const res = await fetch('/api/admin/requests/list', { cache: 'no-store' });
    const data = await res.json();
    setRequests(data.requests || []);
    setLoading(false);
  }

  async function handleSaveReply(id) {
    setWorkingId(id);

    const res = await fetch(`/api/admin/requests/${id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: replyDrafts[id] || '' }),
    });

    const data = await res.json();

    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, reply: data.reply } : r))
    );

    setWorkingId('');
  }

  async function handleToggleAdded(id, current) {
    setWorkingId(id);

    const res = await fetch(`/api/admin/requests/${id}/toggle-added`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ added_to_site: !current }),
    });

    const data = await res.json();

    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              added_to_site: data.added_to_site,
              rejected: data.rejected,
            }
          : r
      )
    );

    setWorkingId('');
  }

  async function handleToggleRejected(id, current) {
    setWorkingId(id);

    const res = await fetch(`/api/admin/requests/${id}/toggle-rejected`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejected: !current }),
    });

    const data = await res.json();

    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              rejected: data.rejected,
              added_to_site: data.added_to_site,
            }
          : r
      )
    );

    setWorkingId('');
  }

  if (checkingAuth) return <p className="p-10">Checking...</p>;
  if (!authorized) return <p className="p-10">Unauthorized...</p>;

  return (
    <main className="p-10 space-y-6">
      {requests.map((item) => (
        <div key={item.id} className="border p-6 rounded-xl space-y-4">
          <h2 className="text-xl font-semibold">
            {item.brand} — {item.fragrance_name}
          </h2>

          <p>{item.notes}</p>

          {/* BADGES */}
          <div className="flex gap-2">
            {item.added_to_site && <span>✅ Added</span>}
            {item.rejected && <span>❌ No thanks</span>}
          </div>

          {/* REPLY */}
          <textarea
            value={replyDrafts[item.id] ?? item.reply ?? ''}
            onChange={(e) =>
              setReplyDrafts((p) => ({ ...p, [item.id]: e.target.value }))
            }
            className="w-full border p-2 rounded"
          />

          <div className="flex gap-2">
            <button onClick={() => handleSaveReply(item.id)}>
              Save reply
            </button>

            <button onClick={() => handleToggleAdded(item.id, item.added_to_site)}>
              {item.added_to_site ? '✓ Added' : 'Mark as added'}
            </button>

            <button onClick={() => handleToggleRejected(item.id, item.rejected)}>
              {item.rejected ? 'No thanks ✓' : 'No thanks'}
            </button>
          </div>
        </div>
      ))}
    </main>
  );
}
