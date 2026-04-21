'use client';

import Link from 'next/link';
import { useState } from 'react';

function StarPicker({ rating, setRating }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => setRating(value)}
          className={`text-3xl transition ${
            value <= rating ? 'text-[#c9a44c]' : 'text-[#d8cfc1]'
          }`}
          aria-label={`Set rating to ${value} star${value === 1 ? '' : 's'}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function WriteReviewPage() {
  const [name, setName] = useState('');
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setStatus('');

    const cleanName = name.trim();
    const cleanText = text.trim();

    if (!cleanName || !cleanText) {
      setStatus('Please complete your name and review.');
      setSubmitting(false);
      return;
    }

    const response = await fetch('/api/reviews/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: cleanName,
        rating,
        text: cleanText,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      setStatus(result?.error || 'Something went wrong. Please try again.');
      setSubmitting(false);
      return;
    }

    setName('');
    setRating(5);
    setText('');
    setSubmitting(false);
    setStatus('Thank you! Your review was submitted and is awaiting approval.');
  }

  return (
    <main className="min-h-screen bg-[#fbf7f2] text-[#221c18]">
      <section className="mx-auto max-w-3xl px-6 pb-20 pt-14 md:px-8 md:pt-20">
        <div className="text-center">
          <div className="inline-flex items-center rounded-full border border-[#eadfce] bg-white/80 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#9a8467]">
            Write a Review
          </div>

          <h1 className="mt-6 font-serif text-4xl leading-tight text-[#1f1915] md:text-6xl">
            Share your
            <span className="block text-[#b99254]">Fragrantique experience</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-8 text-[#4b4038] md:text-[17px]">
            I’d love to hear what you thought. Once submitted, your review will be
            checked by admin before it appears on the site.
          </p>
        </div>

        <div className="mt-12 rounded-[32px] border border-[#eadfce] bg-white p-7 shadow-[0_10px_30px_rgba(73,54,30,0.06)] md:p-10">
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
                placeholder="Your name"
                className="w-full rounded-2xl border border-[#eadfce] bg-[#fffdfa] px-4 py-3 text-[#2d2621] outline-none transition focus:border-[#d8b56a]"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#4b4038]">
                Your rating
              </label>
              <StarPicker rating={rating} setRating={setRating} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#4b4038]">
                Your review
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={1200}
                rows={6}
                placeholder="Tell us about your order, packaging, service, or favorite fragrance..."
                className="w-full rounded-2xl border border-[#eadfce] bg-[#fffdfa] px-4 py-3 text-[#2d2621] outline-none transition focus:border-[#d8b56a]"
                required
              />
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-full border border-[#d8b56a] bg-[#d8b56a] px-7 py-3 text-sm font-medium text-[#1e1a16] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? 'Submitting...' : 'Submit review'}
              </button>

              <Link
                href="/reviews"
                className="inline-flex items-center justify-center rounded-full border border-[#eadfce] bg-white px-7 py-3 text-sm font-medium text-[#473934] transition hover:bg-[#fcfaf7]"
              >
                Back to reviews
              </Link>
            </div>

            {status ? (
              <div className="rounded-2xl border border-[#eadfce] bg-[#fffaf4] px-4 py-3 text-sm text-[#4b4038]">
                {status}
              </div>
            ) : null}
          </form>
        </div>
      </section>
    </main>
  );
}
