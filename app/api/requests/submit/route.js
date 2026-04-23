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

function renderRequestAlertHtml({
  requester_name,
  requester_email,
  brand,
  fragrance_name,
  notes,
}) {
  const safeRequesterName = escapeHtml(requester_name || '—');
  const safeRequesterEmail = escapeHtml(requester_email || '—');
  const safeBrand = escapeHtml(brand);
  const safeFragranceName = escapeHtml(fragrance_name);
  const safeNotes = escapeHtml(notes || '').replace(/\n/g, '<br />') || '—';

  return `
    <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto">
      <h2 style="margin:0 0 12px">New Fragrantique Fragrance Request Submitted</h2>

      <div style="font-size:14px;margin:0 0 8px">
        <b>Name:</b> ${safeRequesterName}
      </div>

      <div style="font-size:14px;margin:0 0 8px">
        <b>Email:</b> ${safeRequesterEmail}
      </div>

      <div style="font-size:14px;margin:0 0 8px">
        <b>Brand:</b> ${safeBrand}
      </div>

      <div style="font-size:14px;margin:0 0 8px">
        <b>Fragrance:</b> ${safeFragranceName}
      </div>

      <h3 style="margin:16px 0 6px">Notes</h3>
      <div style="padding:12px;border:1px solid #eadfce;border-radius:12px;background:#fffaf4;font-size:14px;line-height:1.6">
        ${safeNotes}
      </div>

      <div style="margin-top:20px;font-size:14px">
        <a
          href="https://fragrantique.net/admin/requests"
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

    const requester_name = String(body?.requester_name || '').trim();
    const requester_email = String(body?.requester_email || '').trim();
    const brand = String(body?.brand || '').trim();
    const fragrance_name = String(body?.fragrance_name || '').trim();
    const notes = String(body?.notes || '').trim();

    if (!brand || !fragrance_name) {
      return NextResponse.json(
        { error: 'Brand and fragrance name are required.' },
        { status: 400 }
      );
    }

    const supabase = getAdminSupabase();

    const { error } = await supabase.from('perfume_requests').insert([
      {
        requester_name: requester_name || null,
        requester_email: requester_email || null,
        brand,
        fragrance_name,
        notes: notes || null,
        approved: false,
        upvotes_count: 0,
      },
    ]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    try {
      const emailResult = await sendOrderEmail({
        to: 'stephanie@fragrantique.net',
        subject: 'New Fragrantique Fragrance Request Submitted',
        html: renderRequestAlertHtml({
          requester_name,
          requester_email,
          brand,
          fragrance_name,
          notes,
        }),
      });

      if (emailResult?.ok === false) {
        console.error('Request email failed:', emailResult.error);
      }
    } catch (emailError) {
      console.error('Request alert email failed:', emailError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Something went wrong submitting the request.' },
      { status: 500 }
    );
  }
}
