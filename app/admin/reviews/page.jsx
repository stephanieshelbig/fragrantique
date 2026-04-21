'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'stephanieshelbig@gmail.com';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function Stars({ count = 5 }) {
  return (
    <div className="flex items-center gap-1 text-[15px] tracking-[0.15em] text-[#c9a44c]">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i}>★</span>
      ))}
    </div>
  );
}

export default function AdminReviewsPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    setAuthLoading(true);

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user || user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      setIsAdmin(false);
      setAuthLoading(false);
      setLoading(false);
      return;
    }

    setIsAdmin(true);
    setAuthLoading(false);
    await loadReviews();
  }

  async function loadReviews() {
    setLoading(true);
    setStatus('');

    const { data, error } = await supabase
      .from('reviews')
      .select('id, name, rating, text, approved, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      setStatus(`Could not load reviews: ${error.message}`);
      setLoading(false);
      return;
    }

    setReviews(data || []);
    setLoading(false);
  }

  async function publishReview(id) {
    setWorkingId(id);
    setStatus('');

    const { data, error } = await supabase
      .from('reviews')
      .update({ approved: true })
      .eq('id', id)
      .select('id, approved')
      .single();

    if (error) {
      setStatus(`Could not publish review: ${error.message}`);
      setWorkingId(null);
      return;
    }

    if (!data || data.approved !== true) {
      setStatus('Publish did not go through in the database.');
      setWorkingId(null);
      return;
    }

    await loadReviews();
    setWorkingId(null);
    setStatus('Review published.');
  }

  async function unpublishReview(id) {
    setWorkingId(id);
    setStatus('');

    const { data, error } = await supabase
      .from('reviews')
      .update({ approved: false })
      .eq('id', id)
      .select('id, approved')
      .single();

    if (error) {
      setStatus(`Could not unpublish review: ${error.message}`);
      setWorkingId(null);
      return;
    }

    if (!data || data.approved !== false) {
      setStatus('Unpublish did not go through in the database.');
      setWorkingId(null);
      return;
    }

    await loadReviews();
    setWorkingId(null);
    setStatus('Review unpublished.');
  }

  const pendingReviews = useMemo(
    () => reviews.filter((review) => !review.approved),
    [reviews]
  );

  const publishedReviews = useMemo(
    () => reviews.filter((review) => review.approved),
    [reviews]
  );

  if (authLoading) {
    return (
      <main className="min-h-screen bg-[#fbf7f2] text-[#221c18]">
        <section className="mx-auto max-w-3xl px-6 py-20 text-center">
          <div className="rounded-[28px] border border-[#eadfce] bg-white p-8 shadow-[0_10px_30px_rgba(73,54,30,0.06)]">
            Checking authorization...
          </div>
        </section>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-[#fbf7f2] text-[#221c18]">
        <section className="mx-auto max-w-3xl px-6 py-20 text-center">
          <div className="rounded-[28px] border border-[#eadfce] bg-white p-8 shadow-[0_10px_30px_rgba(73,54,30,0.06)]">
            <h1 className="font-serif text-4xl text-[#1f1915]">Unauthorized</h1>
            <p className="mt-4 text-[16px] leading-8 text-[#4b4038]">
              You do not have access to this page.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fbf7f2] text-[#221c18]">
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-14 md:px-8 md:pb-24 md:pt-20">
        <div className="max-w-3xl">
          <div className="inline-flex items-center rounded-full border border-[#eadfce] bg-white/80 px-4 py-2 text-[11px] uppercase tracking-[0.22em] text-[#9a8467]">
            Admin Reviews
          </div>

          <h1 className="mt-6 font-serif text-4xl leading-tight text-[#1f1915] md:text-5xl">
            Review moderation
          </h1>

          <p className="mt-4 max-w-2xl text-[16px] leading-8 text-[#4b4038]">
            Publish customer-submitted reviews to make them appear on the public
            reviews page.
          </p>

          {status ? (
            <div className="mt-6 rounded-2xl border border-[#eadfce] bg-white px-4 py-3 text-sm text-[#4b4038]">
              {status}
            </div>
          ) : null}
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="font-serif text-3xl text-[#1f1915]">Pending reviews</h2>
            <div className="mt-6 space-y-6">
              {loading ? (
                <div className="rounded-[28px] border border-[#eadfce] bg-white p-6">
                  Loading...
                </div>
              ) : pendingReviews.length === 0 ? (
                <div className="rounded-[28px] border border-[#eadfce] bg-white p-6 text-[#4b4038]">
                  No pending reviews.
                </div>
              ) : (
                pendingReviews.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-[28px] border border-[#eadfce] bg-white p-6 shadow-[0_10px_30px_rgba(73,54,30,0.06)]"
                  >
                    <Stars count={review.rating} />
                    <p className="mt-4 text-[15px] leading-7 text-[#3d342d]">
                      “{review.text}”
                    </p>
                    <div className="mt-5 text-sm uppercase tracking-[0.18em] text-[#9a8467]">
                      {review.name}
                    </div>
                    <div className="mt-5">
                      <button
                        onClick={() => publishReview(review.id)}
                        disabled={workingId === review.id}
                        className="inline-flex items-center justify-center rounded-full border border-[#d8b56a] bg-[#d8b56a] px-5 py-2.5 text-sm font-medium text-[#1e1a16] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {workingId === review.id ? 'Publishing...' : 'Publish to site'}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div>
            <h2 className="font-serif text-3xl text-[#1f1915]">Published reviews</h2>
            <div className="mt-6 space-y-6">
              {loading ? (
                <div className="rounded-[28px] border border-[#eadfce] bg-white p-6">
                  Loading...
                </div>
              ) : publishedReviews.length === 0 ? (
                <div className="rounded-[28px] border border-[#eadfce] bg-white p-6 text-[#4b4038]">
                  No published reviews yet.
                </div>
              ) : (
                publishedReviews.map((review) => (
                  <article
                    key={review.id}
                    className="rounded-[28px] border border-[#eadfce] bg-white p-6 shadow-[0_10px_30px_rgba(73,54,30,0.06)]"
                  >
                    <Stars count={review.rating} />
                    <p className="mt-4 text-[15px] leading-7 text-[#3d342d]">
                      “{review.text}”
                    </p>
                    <div className="mt-5 text-sm uppercase tracking-[0.18em] text-[#9a8467]">
                      {review.name}
                    </div>
                    <div className="mt-5">
                      <button
                        onClick={() => unpublishReview(review.id)}
                        disabled={workingId === review.id}
                        className="inline-flex items-center justify-center rounded-full border border-[#eadfce] bg-white px-5 py-2.5 text-sm font-medium text-[#473934] transition hover:bg-[#fcfaf7] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {workingId === review.id ? 'Updating...' : 'Unpublish'}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
