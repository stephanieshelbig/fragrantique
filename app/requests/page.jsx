'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

function RequestCard({ item, onUpvote, votingId }) {
  return (
    <div className="rounded-[28px] border border-[#eadfce] bg-white p-6 shadow-[0_10px_30px_rgba(73,54,30,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#9a8467]">
            Fragrance Request
          </p>

          <h3 className="mt-2 font-serif text-2xl leading-tight text-[#1f1915]">
            {item.brand}
            <span className="block text-[#b99254]">{item.fragrance_name}</span>
          </h3>

          {item.notes ? (
            <p className="mt-4 text-[15px] leading-7 text-[#4b4038]">
              {item.notes}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onUpvote(item.id)}
          disabled={votingId === item.id}
          className="shrink-0 rounded-full border border-[#d8b56a] bg-[#fffaf2] px-5 py-2.5 text-sm font-medium text-[#473934] transition hover:bg-[#fdf4df] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {votingId === item.id ? 'Voting...' : `♡ Upvote (${item.upvotes_count || 0})`}
        </button>
      </div>
    </div>
  );
}

export default function RequestsPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [brand, setBrand] = useState('');
  const [fragranceName, setFragranceName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [votingId, setVotingId] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoadingRequests(true);

    try {
      const res = await fetch('/api/requests/list', { cache: 'no-store' });
      const json = await res.json();
      if (res.ok) setRequests(json.requests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRequests(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setStatus('');

    const payload = {
      requester_name: name.trim(),
      requester_email: email.trim(),
      brand: brand.trim(),
      fragrance_name: fragranceName.trim(),
      notes: notes.trim(),
    };

    if (!payload.brand || !payload.fragrance_name) {
      setStatus('Please complete the brand and fragrance name.');
      setSubmitting(false);
      return;
    }

    const response = await fetch('/api/requests/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      setStatus(result?.error || 'Something went wrong. Please try again.');
      setSubmitting(false);
      return;
    }

    setName('');
    setEmail('');
    setBrand('');
    setFragranceName('');
    setNotes('');
    setSubmitting(false);
    setStatus('Thank you! Your request was submitted and is awaiting approval.');
  }

  async function handleUpvote(id) {
    setVotingId(id);

    try {
      const response = await fetch(`/api/requests/${id}/upvote`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result?.error || 'Unable to upvote right now.');
        return;
      }

      setRequests((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, upvotes_count: result.upvotes_count }
            : item
        )
      );
    } finally {
      setVotingId('');
    }
  }

  return (
    <main className="min-h-screen bg-[#fbf7f2] text-[#221c18]">
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-14 md:px-8 md:pt-20">
        <div className="text-center">
          <div className="inline-flex items-center rounded-full border border-[#eadfce] bg-white/80 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#9a8467]">
            Fragrance Requests
          </div>

          <h1 className="mt-6 font-serif text-4xl leading-tight text-[#1f1915] md:text-6xl">
            Request a
            <span className="block text-[#b99254]">future Fragrantique scent</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-8 text-[#4b4038] md:text-[17px]">
            Looking for a fragrance I don’t currently have? Submit a request below.
            Once approved, it will appear here and others can upvote it too.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[420px_minmax(0,1fr)]">
          <div className="rounded-[32px] border border-[#eadfce] bg-white p-7 shadow-[0_10px_30px_rgba(73,54,30,0.06)] md:p-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#4b4038]">
                  Your name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  placeholder="Your name (optional)"
                  className="w-full rounded-2xl border border-[#eadfce] bg-[#fffdfa] px-4 py-3 text-[#2d2621] outline-none transition focus:border-[#d8b56a]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#4b4038]">
                  Your email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={120}
                  placeholder="Your email (optional)"
                  className="w-full rounded-2xl border border-[#eadfce] bg-[#fffdfa] px-4 py-3 text-[#2d2621] outline-none transition focus:border-[#d8b56a]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#4b4038]">
                  Brand
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  maxLength={120}
                  placeholder="Ex: Guerlain"
                  className="w-full rounded-2xl border border-[#eadfce] bg-[#fffdfa] px-4 py-3 text-[#2d2621] outline-none transition focus:border-[#d8b56a]"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#4b4038]">
                  Fragrance name
                </label>
                <input
                  type="text"
                  value={fragranceName}
                  onChange={(e) => setFragranceName(e.target.value)}
                  maxLength={160}
                  placeholder="Ex: Angelique Noire"
                  className="w-full rounded-2xl border border-[#eadfce] bg-[#fffdfa] px-4 py-3 text-[#2d2621] outline-none transition focus:border-[#d8b56a]"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#4b4038]">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={1200}
                  rows={5}
                  placeholder="Anything you’d like me to know..."
                  className="w-full rounded-2xl border border-[#eadfce] bg-[#fffdfa] px-4 py-3 text-[#2d2621] outline-none transition focus:border-[#d8b56a]"
                />
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-full border border-[#d8b56a] bg-[#d8b56a] px-7 py-3 text-sm font-medium text-[#1e1a16] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? 'Submitting...' : 'Submit request'}
                </button>

                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-full border border-[#eadfce] bg-white px-7 py-3 text-sm font-medium text-[#473934] transition hover:bg-[#fcfaf7]"
                >
                  Back home
                </Link>
              </div>

              {status ? (
                <div className="rounded-2xl border border-[#eadfce] bg-[#fffaf4] px-4 py-3 text-sm text-[#4b4038]">
                  {status}
                </div>
              ) : null}
            </form>
          </div>

          <div className="space-y-5">
            {loadingRequests ? (
              <div className="rounded-[28px] border border-[#eadfce] bg-white p-6 shadow-[0_10px_30px_rgba(73,54,30,0.06)]">
                <p className="text-[#4b4038]">Loading requests...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="rounded-[28px] border border-[#eadfce] bg-white p-6 shadow-[0_10px_30px_rgba(73,54,30,0.06)]">
                <p className="text-[#4b4038]">
                  No approved requests yet. Be the first to submit one.
                </p>
              </div>
            ) : (
              requests.map((item) => (
                <RequestCard
                  key={item.id}
                  item={item}
                  onUpvote={handleUpvote}
                  votingId={votingId}
                />
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
