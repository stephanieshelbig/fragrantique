import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendOrderEmail } from '@/lib/email';

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderReviewAlertHtml({ name, rating, text }) {
  const safeName = escapeHtml(name);
  const safeText = escapeHtml(text).replace(/\n/g, '<br />');

  return `
    <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto">
      <h2 style="margin:0 0 12px">New Fragrantique Review Submitted</h2>

      <div style="font-size:14px;margin:0 0 8px">
        <b>Name:</b> ${safeName}
      </div>

      <div style="font-size:14px;margin:0 0 8px">
        <b>Rating:</b> ${rating} / 5
      </div>

      <h3 style="margin:16px 0 6px">Review</h3>
      <div style="padding:12px;border:1px solid #eadfce;border-radius:12px;background:#fffaf4;font-size:14px;line-height:1.6">
        ${safeText}
      </div>

      <div style="margin-top:20px;font-size:14px">
        <a
          href="https://fragrantique.net/admin/reviews"
          style="display:inline-block;padding:10px 16px;border-radius:999px;background:#d8b56a;color:#1e1a16;text-decoration:none;font-weight:600"
        >
          Review & Publish
        </a>
      </div>
    </div>
  `;
}

export async function POST(request) {
  try {
    const body = await request.json();

    const name = String(body?.name || '').trim();
    const text = String(body?.text || '').trim();
    const rating = Number(body?.rating);

    if (!name || !text || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Invalid review submission.' },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabase();

    const { error } = await supabase.from('reviews').insert([
      {
        name,
        text,
        rating,
        approved: false,
      },
    ]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    try {
      const emailResult = await sendOrderEmail({
        to: process.env.GMAIL_USER,
        subject: 'New Fragrantique Review Submitted',
        html: renderReviewAlertHtml({ name, rating, text }),
      });

      if (emailResult?.ok === false) {
        console.error('Review email failed:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Review alert email failed:', emailError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Something went wrong submitting the review.' },
      { status: 500 }
    );
  }
}
