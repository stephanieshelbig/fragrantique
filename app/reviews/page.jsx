'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const GOOGLE_REVIEWS_URL =
  process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL ||
  'https://share.google/amP8gfM9LruQRZxfM';

function Stars({ count = 5 }) {
  return (
    <div className="flex gap-1 text-[#c9a44c]">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i}>★</span>
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [rating, setRating] = useState(5);
  const [loading, setLoading] = useState(false);

  // Load reviews
  useEffect(() => {
    fetchReviews();
  }, []);

  async function fetchReviews() {
    const { data } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    setReviews(data || []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    await supabase.from('reviews').insert([
      {
        name,
        text,
        rating,
      },
    ]);

    setName('');
    setText('');
    setRating(5);
    setLoading(false);

    fetchReviews();
  }

  return (
    <main className="min-h-screen bg-[#fbf7f2] px-6 py-16 text-[#221c18]">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-center font-serif text-5xl mb-6">
          Reviews
        </h1>

        {/* Top Buttons */}
        <div className="flex flex-col items-center gap-4 mb-12">
          <a
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            className="rounded-full bg-[#d8b56a] px-6 py-3"
          >
            Read reviews on Google
          </a>

          <button
            onClick={() =>
              document
                .getElementById('write-review')
                .scrollIntoView({ behavior: 'smooth' })
            }
            className="rounded-full bg-[#f5e6eb] px-6 py-3"
          >
            Write a review
          </button>
        </div>

        {/* Reviews List */}
        <div className="grid gap-6 md:grid-cols-2 mb-16">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="bg-white p-6 rounded-2xl border"
            >
              <Stars count={r.rating} />
              <p className="mt-3">“{r.text}”</p>
              <div className="mt-4 text-sm text-[#9a8467]">
                {r.name}
              </div>
            </div>
          ))}
        </div>

        {/* Write Review Form */}
        <div
          id="write-review"
          className="bg-white p-8 rounded-3xl border"
        >
          <h2 className="text-2xl font-serif mb-6">
            Write a Review
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border p-3 rounded-lg"
            />

            <select
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="w-full border p-3 rounded-lg"
            >
              {[5, 4, 3, 2, 1].map((r) => (
                <option key={r} value={r}>
                  {r} stars
                </option>
              ))}
            </select>

            <textarea
              placeholder="Your review..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              className="w-full border p-3 rounded-lg h-32"
            />

            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-[#d8b56a] px-6 py-3"
            >
              {loading ? 'Submitting...' : 'Submit Review'}
            </button>
          </form>
        </div>

        {/* Bottom Links */}
        <div className="mt-16 text-center">
          <Link href="/">Back to boutique</Link>
        </div>
      </div>
    </main>
  );
}
