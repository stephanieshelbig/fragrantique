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

function UnauthorizedRedirect() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = '/';
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-[#fbf7f2] text-[#221c18]">
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <div className="rounded-[28px] border border-[#eadfce] bg-white p-8 shadow-[0_10px_30px_rgba(73,54,30,0.06)]">
          <h1 className="font-serif text-4xl text-[#1f1915]">
            Unauthorized user. Redirecting...
          </h1>
          <p className="mt-4 text-[16px] leading-8 text-[#4b4038]">
            You will be sent back to the home page in 5 seconds.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function AdminReviewsPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState(null);
  const [status, setStatus] = useState('');
  const [replies, setReplies] = useState({});

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
      .select('id, name, rating, text, approved, reply, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      setStatus(`Could not load reviews: ${error.message}`);
      setLoading(false);
      return;
    }

    setReviews(data || []);

    // preload replies into state
    const initialReplies = {};
    (data || []).forEach((r) => {
      initialReplies[r.id] = r.reply || '';
    });
    setReplies(initialReplies);

    setLoading(false);
  }

  async function saveReply(id) {
    setWorkingId(id);
    setStatus('');

    const { error } = await supabase
      .from('reviews')
      .update({ reply: replies[id] })
      .eq('id', id);

    if (error) {
      setStatus(`Could not save reply: ${error.message}`);
      setWorkingId(null);
      return;
    }

    await loadReviews();
    setWorkingId(null);
    setStatus('Reply saved.');
  }

  async function publishReview(id) {
    setWorkingId(id);
    setStatus('');

    const { error } = await supabase
      .from('reviews')
      .update({ approved: true })
      .eq('id', id);

    if (error) {
      setStatus(`Could not publish review: ${error.message}`);
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

    const { error } = await supabase
      .from('reviews')
      .update({ approved: false })
      .eq('id', id);

    if (error) {
      setStatus(`Could not unpublish review: ${error.message}`);
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
    return <div className="p-10 text-center">Checking authorization...</div>;
  }

  if (!isAdmin) {
    return <UnauthorizedRedirect />;
  }

  const ReviewCard = ({ review, isPublished }) => (
    <article className="rounded-[28px] border border-[#eadfce] bg-white p-6 shadow">
      <Stars count={review.rating} />

      <p className="mt-4 text-[15px] leading-7 text-[#3d342d]">
        “{review.text}”
      </p>

      <div className="mt-5 text-sm uppercase tracking-[0.18em] text-[#9a8467]">
        {review.name}
      </div>

      {/* Reply field */}
      <div className="mt-5">
        <textarea
          value={replies[review.id] || ''}
          onChange={(e) =>
            setReplies({ ...replies, [review.id]: e.target.value })
          }
          placeholder="Write a reply..."
          className="w-full rounded-xl border border-[#eadfce] p-3 text-sm"
          rows={2}
        />

        <button
          onClick={() => saveReply(review.id)}
          disabled={workingId === review.id}
          className="mt-2 rounded-full bg-[#d8b56a] px-4 py-2 text-sm"
        >
          {workingId === review.id ? 'Saving...' : 'Save reply'}
        </button>
      </div>

      <div className="mt-5">
        {isPublished ? (
          <button
            onClick={() => unpublishReview(review.id)}
            className="rounded-full border px-5 py-2 text-sm"
          >
            Unpublish
          </button>
        ) : (
          <button
            onClick={() => publishReview(review.id)}
            className="rounded-full bg-[#d8b56a] px-5 py-2 text-sm"
          >
            Publish
          </button>
        )}
      </div>
    </article>
  );

  return (
    <main className="min-h-screen bg-[#fbf7f2] p-10">
      <h1 className="text-3xl mb-10">Admin Reviews</h1>

      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-xl mb-4">Pending</h2>
          {pendingReviews.map((r) => (
            <ReviewCard key={r.id} review={r} isPublished={false} />
          ))}
        </div>

        <div>
          <h2 className="text-xl mb-4">Published</h2>
          {publishedReviews.map((r) => (
            <ReviewCard key={r.id} review={r} isPublished={true} />
          ))}
        </div>
      </div>
    </main>
  );
}
