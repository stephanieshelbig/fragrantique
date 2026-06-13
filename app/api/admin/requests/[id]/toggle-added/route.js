import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function makeTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-mail.outlook.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || 'stephanie@fragrantique.net',
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

export async function POST(request, { params }) {
  try {
    const id = params?.id;
    const body = await request.json();
    const addedToSite = Boolean(body.added_to_site);

    const { data: current, error: fetchError } = await supabaseAdmin
      .from('perfume_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('perfume_requests')
      .update({
        added_to_site: addedToSite,
        rejected: addedToSite ? false : current.rejected,
      })
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Unable to update request.' },
        { status: 500 }
      );
    }

    let email_sent = false;

    if (addedToSite && current.requester_email) {
      const transporter = makeTransporter();

      await transporter.sendMail({
        from: `"Stephanie at Fragrantique" <stephanie@fragrantique.net>`,
        to: current.requester_email,
        subject: `Your fragrance request was added to Fragrantique!`,
        html: `
          <div style="font-family: Georgia, serif; background:#fbf7f2; padding:28px;">
            <div style="max-width:620px; margin:0 auto; background:#ffffff; border:1px solid #eadfce; border-radius:24px; padding:28px;">
              <p style="font-size:14px; color:#9a8467; letter-spacing:.16em; text-transform:uppercase;">
                Fragrantique Request Update
              </p>

              <h1 style="color:#1f1915; font-size:30px; margin:12px 0;">
                Good news!
              </h1>

              <p style="font-size:16px; line-height:1.7; color:#4b4038;">
                The fragrance you requested has been added to Fragrantique.
              </p>

              <div style="margin:22px 0; padding:18px; border-radius:18px; background:#fffaf4; border:1px solid #eadfce;">
                <p style="margin:0; font-size:15px; color:#4b4038;">
                  <strong>${current.brand || ''}</strong><br />
                  ${current.fragrance_name || ''}
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
    }

    return NextResponse.json({
      added_to_site: updated.added_to_site,
      rejected: updated.rejected,
      email_sent,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Unable to update added badge.' },
      { status: 500 }
    );
  }
}
