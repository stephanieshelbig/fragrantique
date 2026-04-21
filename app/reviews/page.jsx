'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const GOOGLE_REVIEWS_URL =
  process.env.NEXT_PUBLIC_GOOGLE_REVIEWS_URL ||
  'https://share.google/amP8gfM9LruQRZxfM';

const featuredReviews = [
  {
    id: 'placeholder-1',
    name: 'Fragrantique Customer',
    rating: 5,
    text:
      'Beautiful presentation, carefully packed, and such a lovely experience from start to finish. Everything felt thoughtful and boutique.',
  },
  {
    id: 'placeholder-2',
    name: 'anonymous',
    rating: 5,
    text:
      'The decants arrived quickly and were packaged nicely. Very happy!',
  },
  {
    id: 'placeholder-3',
    name: 'Fragrantique Customer',
    rating: 5,
    text:
      'A gorgeous little fragrance experience. Wonderful communication, beautiful selection, and the attention to detail really stands out.',
  },
];

function Stars({ count = 5 }) {
  return (
    <div
      aria-label={`${count} out of 5 stars`}
      className="flex items-center gap-1 text-[15px] tracking-[0.15em] text-[#c9a44c]"
    >
      {Array.from({ length: count }).map((_, i) => (
        <span key={i}>★</span>
      ))}
    </div>
  );
}

function ReviewCard({ review }) {
  return (
    <article className="rounded-[28px] border border-[#eadfce] bg-white p-6 shadow-[0_10px_30px_rgba(73,54,30,0.06)]">
      <Stars count={review.rating} />
      <p className="mt-4 text-[15px] leading-7 text-[#3d342d]">“{review.text}”</p>
      <div className="mt-5 text-sm uppercase tracking-[0.18em] text-[#9a8467]">
        {review.name}
      </div>
    </article>
  );
}

export default function ReviewsPage() {
  const [approvedReviews, setApprovedReviews] = useState([]);

  useEffect(() => {
    let ignore = false;

    async function loadApprovedReviews() {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, name, rating, text, created_at')
        .eq('approved', true)
        .order('created_at', { ascending: false })
        .limit(3);

      if (!ignore && !error) {
        setApprovedReviews(data || []);
      }
    }

    loadApprovedReviews();

    return () => {
      ignore = true;
    };
  }, []);

  const displayedReviews = useMemo(() => {
    const approved = approvedReviews.map((review) => ({
      id: review.id,
      name: review.name,
      rating: review.rating,
      text: review.text,
    }));

    if (approved.length >= 3) return approved.slice(0, 3);

    return [...approved, ...featuredReviews.slice(approved.length, 3)];
  }, [approvedReviews]);

  return (
    <main className="min-h-screen bg-[#fbf7f2] text-[#221c18]">
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-14 md:px-8 md:pb-24 md:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center rounded-full border border-[#eadfce] bg-white/80 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#9a8467]">
            Fragrantique Reviews
          </div>

          <h1 className="mt-6 font-serif text-4xl leading-tight text-[#1f1915] md:text-6xl">
            Kind words from
            <span className="block text-[#b99254]">the boutique</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-8 text-[#4b4038] md:text-[17px]">
            Fragrantique is built around beautiful presentation, thoughtful service,
            and a lovely fragrance experience from the moment your order is placed.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href={GOOGLE_REVIEWS_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-[#d8b56a] bg-[#d8b56a] px-6 py-3 text-sm font-medium text-[#1e1a16] transition hover:brightness-95"
            >
              Read reviews on Google
            </a>

            <Link
              href="/reviews/write-review"
              className="inline-flex items-center justify-center rounded-full border border-[#e7cbd3] bg-[#f5e6eb] px-6 py-3 text-sm font-medium text-[#473934] transition hover:bg-[#f0dde4]"
            >
              Write a review
            </Link>
          </div>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {displayedReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>

        <div className="mt-14 rounded-[32px] border border-[#eadfce] bg-[#fffaf7] px-7 py-10 text-center shadow-[0_10px_30px_rgba(73,54,30,0.05)] md:px-10">
          <div className="mx-auto max-w-2xl">
            <div className="text-[11px] uppercase tracking-[0.22em] text-[#9a8467]">
              Loved your order?
            </div>

            <h2 className="mt-3 font-serif text-3xl leading-tight text-[#1f1915]">
              Share your Fragrantique experience
            </h2>

            <p className="mt-4 text-[15px] leading-7 text-[#4b4038]">
              If your order made your day a little prettier, I’d love your review.
              Your feedback helps other fragrance lovers discover Fragrantique.
            </p>

            <div className="mt-7">
              <Link
                href="/reviews/write-review"
                className="inline-flex items-center justify-center rounded-full border border-[#d8b56a] bg-[#d8b56a] px-7 py-3 text-sm font-medium text-[#1e1a16] transition hover:brightness-95"
              >
                Write a review
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-14 rounded-[32px] border border-[#eadfce] bg-white px-7 py-8 shadow-[0_10px_30px_rgba(73,54,30,0.05)] md:px-10">
          <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#9a8467]">
                Why customers come back
              </div>
              <h2 className="mt-3 font-serif text-3xl leading-tight text-[#1f1915]">
                Elegant packaging, thoughtful service, and beautiful scents
              </h2>
              <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#4b4038]">
                Every Fragrantique order is meant to feel special. This page can grow
                over time with more customer love, featured testimonials, and a direct
                path to your Google reviews.
              </p>
            </div>

            <div className="rounded-[24px] border border-[#f0e6d8] bg-[#fffaf4] p-6">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#9a8467]">
                Explore more
              </div>
              <div className="mt-3 space-y-3">
                <Link
                  href="/"
                  className="block rounded-full border border-[#eadfce] bg-white px-5 py-3 text-sm text-[#2c241f] transition hover:bg-[#fcfaf7]"
                >
                  Visit the boutique
                </Link>
                <Link
                  href="/explore"
                  className="block rounded-full border border-[#eadfce] bg-white px-5 py-3 text-sm text-[#2c241f] transition hover:bg-[#fcfaf7]"
                >
                  Explore fragrances
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
