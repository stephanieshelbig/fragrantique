import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// import your existing nodemailer/transporter helper here
// import { transporter } from '@/lib/mailer'  <-- example

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const body = await req.json();

    const requester_name = String(body.requester_name || '').trim();
    const requester_email = String(body.requester_email || '').trim();
    const brand = String(body.brand || '').trim();
    const fragrance_name = String(body.fragrance_name || '').trim();
    const notes = String(body.notes || '').trim();

    if (!brand || !fragrance_name) {
      return NextResponse.json(
        { error: 'Brand and fragrance name are required.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('perfume_requests')
      .insert({
        requester_name: requester_name || null,
        requester_email: requester_email || null,
        brand,
        fragrance_name,
        notes: notes || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: 'Unable to submit request.' },
        { status: 500 }
      );
    }

    // USE THE SAME EMAIL CONFIG YOU ALREADY USE FOR REVIEWS HERE
    // Example:
    /*
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: 'stephanie@fragrantique.net',
      subject: `New fragrance request: ${brand} — ${fragrance_name}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <h2>New Fragrance Request</h2>
          <p><strong>Brand:</strong> ${brand}</p>
          <p><strong>Fragrance:</strong> ${fragrance_name}</p>
          <p><strong>Name:</strong> ${requester_name || '—'}</p>
          <p><strong>Email:</strong> ${requester_email || '—'}</p>
          <p><strong>Notes:</strong> ${notes || '—'}</p>
          <p><a href="https://fragrantique.net/admin/requests">Open admin requests</a></p>
        </div>
      `,
    });
    */

    return NextResponse.json({ ok: true, request: data });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
