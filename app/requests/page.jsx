'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

function RequestCard({ item, onUpvote, votingId }) {
  return (
    <div className="rounded-[32px] border border-[#eadfce] bg-white p-7 shadow-[0_10px_30px_rgba(73,54,30,0.06)] md:p-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center rounded-full border border-[#eadfce] bg-[#fffaf4] px-3 py-1 text-[10px] uppercase tracking-[0.20em] text-[#9a8467]">
            Requested Fragrance
          </div>

          <h2 className="mt-4 font-serif text-2xl leading-tight text-[#1f1915] md:text-3xl">
            {item.brand}
            <span className="block text-[#b99254]">{item.fragrance_name}</span>
          </h2>

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
          className="inline-flex shrink-0 items-center justify-center rounded-full border border-[#d8b56a] bg-[#fff7e8] px-6 py-3 text-sm font-medium text-[#1e1a16] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {votingId === item.id
            ? 'Submitting...'
            : `♡ Upvote (${item.upvotes_count || 0})`}
        </button>
      </div>
    </div>
  );
}

export default function RequestsPage() {
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [brand, setBrand] = useState('');
  const [fragranceName, setFragranceName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      setLoading(true);
      const response = await fetch('/api/requests/list', { cache: 'no-store' });
      const result = await response.json();

      if (response.ok) {
        setRequests(result.requests || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setStatus('');

    const response = await fetch('/api/requests/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requester_name: requesterName.trim(),
        requester_email: requesterEmail.trim(),
        brand: brand.trim(),
        fragrance_name: fragranceName.trim(),
        notes: notes.trim(),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setStatus(result?.error || 'Something went wrong. Please try again.');
      setSubmitting(false);
      return;
    }

    setRequesterName('');
    setRequesterEmail('');
    setBrand('');
    setFragranceName('');
    setNotes('');
    setSubmitting(false);
    setStatus('Thank you! Your request was submitted and is awaiting approval.');
  }

  async function handleUpvote(id) {
    try {
      setVotingId(id);

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
    } catch (error) {
      alert('Something went wrong.');
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
            <span className="block text-[#b99254]">fragrance</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-8 text-[#4b4038] md:text-[17px]">
            If there's a fragrance you want that I don’t have, submit a request here. If it sounds like something I would like, I'll look into it. Others can Upvote the request to show interest.
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
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  maxLength={80}
                  placeholder="Your name (this will be hidden)"
                  className="w-full rounded-2xl border border-[#eadfce] bg-[#fffdfa] px-4 py-3 text-[#2d2621] outline-none transition focus:border-[#d8b56a]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#4b4038]">
                  Your email
                </label>
                <input
                  type="email"
                  value={requesterEmail}
                  onChange={(e) => setRequesterEmail(e.target.value)}
                  maxLength={120}
                  placeholder="Your email (this will be hidden)"
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
                  placeholder="Brand"
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
                  placeholder="Fragrance name"
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
                  rows={6}
                  placeholder="Tell me anything about this fragrance..."
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
            {loading ? (
              <div className="rounded-[32px] border border-[#eadfce] bg-white p-7 shadow-[0_10px_30px_rgba(73,54,30,0.06)]">
                <p className="text-[15px] text-[#4b4038]">Loading requests...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="rounded-[32px] border border-[#eadfce] bg-white p-7 shadow-[0_10px_30px_rgba(73,54,30,0.06)]">
                <p className="text-[15px] text-[#4b4038]">
                  No approved requests yet.
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
