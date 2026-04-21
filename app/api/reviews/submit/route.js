import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

async function sendReviewAlertEmail({ name, rating, text }) {
  if (!process.env.RESEND_API_KEY) return;

  const to = process.env.REVIEW_ALERT_TO || 'stephanieshelbig@gmail.com';
  const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  const subject = `New Fragrantique review submitted`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
      <h2 style="margin-bottom: 12px;">New review submitted</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Rating:</strong> ${rating} / 5</p>
      <p><strong>Review:</strong></p>
      <div style="padding: 12px; background: #faf7f2; border: 1px solid #eadfce; border-radius: 12px;">
        ${String(text).replace(/\n/g, '<br />')}
      </div>
      <p style="margin-top: 16px;">
        Review it here: <a href="https://fragrantique.net/admin/reviews">fragrantique.net/admin/reviews</a>
      </p>
    </div>
  `;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
  });
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
      await sendReviewAlertEmail({ name, rating, text });
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
