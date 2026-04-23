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

  useEffect(() => {
    let redirectTimer;

    async function boot() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setAuthorized(false);
          setCheckingAuth(false);
          redirectTimer = setTimeout(() => router.push('/'), 3000);
          return;
        }

        const isAdminEmail =
          String(user.email || '').toLowerCase() === 'stephanieshelbig@gmail.com';

        let profileIsAdmin = false;

        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.is_admin === true) {
          profileIsAdmin = true;
        }

        if (!isAdminEmail && !profileIsAdmin) {
          setAuthorized(false);
          setCheckingAuth(false);
          redirectTimer = setTimeout(() => router.push('/'), 3000);
          return;
        }

        setAuthorized(true);
        setCheckingAuth(false);
        await loadRequests();
      } catch (error) {
        console.error(error);
        setAuthorized(false);
        setCheckingAuth(false);
        redirectTimer = setTimeout(() => router.push('/'), 3000);
      }
    }

    boot();

    return () => {
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [router, supabase]);

  async function loadRequests() {
    try {
      setLoading(true);
      setStatusMessage('');

      const response = await fetch('/api/admin/requests/list', {
        cache: 'no-store',
      });

      const result = await response.json();

      if (!response.ok) {
        setStatusMessage(result?.error || 'Unable to load requests.');
        return;
      }

      setRequests(result.requests || []);
    } catch (error) {
      console.error(error);
      setStatusMessage('Unable to load requests.');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id) {
    try {
      setWorkingId(id);
      setStatusMessage('');

      const response = await fetch(`/api/admin/requests/${id}/approve`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        setStatusMessage(result?.error || 'Unable to approve request.');
        return;
      }

      setRequests((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                approved: true,
                status: 'approved',
                approved_at: new Date().toISOString(),
              }
            : item
        )
      );

      setStatusMessage('Request approved.');
    } catch (error) {
      console.error(error);
      setStatusMessage('Unable to approve request.');
    } finally {
      setWorkingId('');
    }
  }

  async function handleUnapprove(id) {
    try {
      setWorkingId(id);
      setStatusMessage('');

      const response = await fetch(`/api/admin/requests/${id}/unapprove`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        setStatusMessage(result?.error || 'Unable to unapprove request.');
        return;
      }

      setRequests((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                approved: false,
                status: 'pending',
                approved_at: null,
              }
            : item
        )
      );

      setStatusMessage('Request unapproved.');
    } catch (error) {
      console.error(error);
      setStatusMessage('Unable to unapprove request.');
    } finally {
      setWorkingId('');
    }
  }

  async function handleDelete(id) {
    const confirmed = window.confirm(
      'Delete this request? This cannot be undone.'
    );
    if (!confirmed) return;

    try {
      setWorkingId(id);
      setStatusMessage('');

      const response = await fetch(`/api/admin/requests/${id}/delete`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        setStatusMessage(result?.error || 'Unable to delete request.');
        return;
      }

      setRequests((prev) => prev.filter((item) => item.id !== id));
      setStatusMessage('Request deleted.');
    } catch (error) {
      console.error(error);
      setStatusMessage('Unable to delete request.');
    } finally {
      setWorkingId('');
    }
  }

  function getBadge(item) {
    const isApproved =
  item.status === 'approved' ||
  item.approved === true ||
  item.approved === 'true' ||
  item.approved === 't' ||
  item.approved === 1;

    if (isApproved) {
      return (
        <div className="inline-flex items-center rounded-full border border-[#d8e7d2] bg-[#f5fbf2] px-3 py-1 text-[10px] uppercase tracking-[0.20em] text-[#658257]">
          Approved
        </div>
      );
    }

    return (
      <div className="inline-flex items-center rounded-full border border-[#eadfce] bg-white px-3 py-1 text-[10px] uppercase tracking-[0.20em] text-[#9a8467]">
        Pending
      </div>
    );
  }

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-[#fbf7f2] text-[#221c18]">
        <section className="mx-auto max-w-5xl px-6 pb-20 pt-14 md:px-8 md:pt-20">
          <div className="rounded-[32px] border border-[#eadfce] bg-white p-8 shadow-[0_10px_30px_rgba(73,54,30,0.06)]">
            <p className="text-[15px] text-[#4b4038]">Checking admin access...</p>
          </div>
        </section>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="min-h-screen bg-[#fbf7f2] text-[#221c18]">
        <section className="mx-auto max-w-3xl px-6 pb-20 pt-20 md:px-8">
          <div className="rounded-[32px] border border-[#eadfce] bg-white p-10 text-center shadow-[0_10px_30px_rgba(73,54,30,0.06)]">
            <div className="inline-flex items-center rounded-full border border-[#eadfce] bg-white/80 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#9a8467]">
              Admin
            </div>

            <h1 className="mt-6 font-serif text-4xl leading-tight text-[#1f1915]">
              Unauthorized user.
              <span className="block text-[#b99254]">Redirecting...</span>
            </h1>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fbf7f2] text-[#221c18]">
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-14 md:px-8 md:pt-20">
        <div className="text-center">
          <div className="inline-flex items-center rounded-full border border-[#eadfce] bg-white/80 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#9a8467]">
            Admin Requests
          </div>

          <h1 className="mt-6 font-serif text-4xl leading-tight text-[#1f1915] md:text-6xl">
            Manage fragrance
            <span className="block text-[#b99254]">requests</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-8 text-[#4b4038] md:text-[17px]">
            View all submitted requests, approve or unapprove them, or delete them.
          </p>
        </div>

        <div className="mt-12 rounded-[32px] border border-[#eadfce] bg-white p-7 shadow-[0_10px_30px_rgba(73,54,30,0.06)] md:p-10">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-serif text-2xl text-[#1f1915]">All requests</h2>
              <p className="mt-1 text-sm text-[#4b4038]">
                {loading
                  ? 'Loading...'
                  : `${requests.length} request${requests.length === 1 ? '' : 's'}`}
              </p>
            </div>

            <button
              type="button"
              onClick={loadRequests}
              className="inline-flex items-center justify-center rounded-full border border-[#eadfce] bg-white px-6 py-3 text-sm font-medium text-[#473934] transition hover:bg-[#fcfaf7]"
            >
              Refresh
            </button>
          </div>

          {statusMessage ? (
            <div className="mb-6 rounded-2xl border border-[#eadfce] bg-[#fffaf4] px-4 py-3 text-sm text-[#4b4038]">
              {statusMessage}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-[24px] border border-[#eadfce] bg-[#fffdfa] p-6">
              <p className="text-[15px] text-[#4b4038]">Loading requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-[24px] border border-[#eadfce] bg-[#fffdfa] p-6">
              <p className="text-[15px] text-[#4b4038]">No requests found.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {requests.map((item) => {
                const isApproved =
                  item.approved === true || item.status === 'approved';

                return (
                  <div
                    key={item.id}
                    className="rounded-[28px] border border-[#eadfce] bg-[#fffdfa] p-6"
                  >
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        {getBadge(item)}

                        <h3 className="mt-4 font-serif text-2xl leading-tight text-[#1f1915]">
                          {item.brand}
                          <span className="block text-[#b99254]">
                            {item.fragrance_name}
                          </span>
                        </h3>

                        <div className="mt-5 grid gap-3 text-sm text-[#4b4038] sm:grid-cols-2">
                          <div>
                            <span className="font-medium text-[#1f1915]">Name: </span>
                            {item.requester_name || '—'}
                          </div>
                          <div>
                            <span className="font-medium text-[#1f1915]">Email: </span>
                            {item.requester_email || '—'}
                          </div>
                          <div>
                            <span className="font-medium text-[#1f1915]">Votes: </span>
                            {item.upvotes_count || 0}
                          </div>
                          <div>
                            <span className="font-medium text-[#1f1915]">Status: </span>
                            {item.status || (isApproved ? 'approved' : 'pending')}
                          </div>
                          <div className="sm:col-span-2">
                            <span className="font-medium text-[#1f1915]">Submitted: </span>
                            {item.created_at
                              ? new Date(item.created_at).toLocaleString()
                              : '—'}
                          </div>
                        </div>

                        <div className="mt-5">
                          <div className="mb-2 text-sm font-medium text-[#1f1915]">
                            Notes
                          </div>
                          <div className="rounded-2xl border border-[#eadfce] bg-white px-4 py-3 text-sm leading-7 text-[#4b4038]">
                            {item.notes || '—'}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
                        {isApproved ? (
                          <button
                            type="button"
                            onClick={() => handleUnapprove(item.id)}
                            disabled={workingId === item.id}
                            className="inline-flex items-center justify-center rounded-full border border-[#eadfce] bg-white px-6 py-3 text-sm font-medium text-[#473934] transition hover:bg-[#fcfaf7] disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {workingId === item.id ? 'Working...' : 'Unapprove'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleApprove(item.id)}
                            disabled={workingId === item.id}
                            className="inline-flex items-center justify-center rounded-full border border-[#d8b56a] bg-[#d8b56a] px-6 py-3 text-sm font-medium text-[#1e1a16] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {workingId === item.id ? 'Working...' : 'Approve'}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          disabled={workingId === item.id}
                          className="inline-flex items-center justify-center rounded-full border border-[#eadfce] bg-white px-6 py-3 text-sm font-medium text-[#473934] transition hover:bg-[#fcfaf7] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
