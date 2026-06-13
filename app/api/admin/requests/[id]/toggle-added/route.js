import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request, { params }) {
  const id = params.id;

  try {
    const { added_to_site } = await request.json();
    const nextAdded = Boolean(added_to_site);

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('perfume_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('perfume_requests')
      .update({
        added_to_site: nextAdded,
        rejected: nextAdded ? false : existing.rejected,
      })
      .eq('id', id)
      .select('added_to_site, rejected')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    let email_sent = false;
    let email_error = '';

    if (nextAdded && existing.requester_email) {
      try {
        const transporter = nodemailer.createTransport({
          host: 'smtp-mail.outlook.com',
          port: 587,
          secure: false,
          auth: {
            user: 'stephanie@fragrantique.net',
            pass: process.env.SMTP_PASSWORD,
          },
        });

        await transporter.sendMail({
          from: `"Stephanie at Fragrantique" <stephanie@fragrantique.net>`,
          to: existing.requester_email,
          subject: 'Your fragrance request was added to Fragrantique!',
          html: `
            <div style="font-family: Georgia, serif; background:#fbf7f2; padding:28px;">
              <div style="max-width:620px; margin:0 auto; background:#fff; border:1px solid #eadfce; border-radius:24px; padding:28px;">
                <h1 style="color:#1f1915;">Good news!</h1>
                <p style="font-size:16px; line-height:1.7; color:#4b4038;">
                  The fragrance you requested has been added to Fragrantique.
                </p>
                <div style="margin:22px 0; padding:18px; border-radius:18px; background:#fffaf4; border:1px solid #eadfce;">
                  <p style="margin:0; font-size:15px; color:#4b4038;">
                    <strong>${existing.brand || ''}</strong><br />
                    ${existing.fragrance_name || ''}
                  </p>
                </div>
                <p style="font-size:16px; line-height:1.7; color:#4b4038;">
                  Thank you so much for the suggestion!
                </p>
                <p style="font-size:16px; line-height:1.7; color:#4b4038;">
                  — Stephanie<br />
                  Fragrantique.net
                </p>
              </div>
            </div>
          `,
        });

        email_sent = true;
      } catch (emailError) {
        console.error('Added request email failed:', emailError);
        email_error = emailError?.message || 'Email failed to send.';
      }
    }

    return NextResponse.json({
      added_to_site: updated.added_to_site,
      rejected: updated.rejected,
      email_sent,
      email_error,
    });
  } catch (error) {
    console.error('toggle-added error:', error);
    return NextResponse.json(
      { error: error?.message || 'Unable to update added badge.' },
      { status: 500 }
    );
  }
}
