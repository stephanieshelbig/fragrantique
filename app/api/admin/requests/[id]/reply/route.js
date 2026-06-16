import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

function getSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://www.fragrantique.net'
  );
}

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-mail.outlook.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER,
      pass: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD,
    },
  });
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function sendReplyEmail({ requestItem, reply }) {
  const to = String(requestItem.requester_email || '').trim();

  if (!isValidEmail(to)) {
    return {
      email_sent: false,
      email_error: 'No valid requester email address.',
    };
  }

  if (!reply) {
    return {
      email_sent: false,
      email_error: '',
    };
  }

  const brand = requestItem.brand || 'your requested fragrance';
  const fragranceName = requestItem.fragrance_name || '';
  const requesterName = requestItem.requester_name || 'there';
  const siteUrl = getSiteUrl();

  const subject = `Stephanie replied to your Fragrantique request`;

  const html = `
    <div style="margin:0;padding:0;background:#fbf7f2;font-family:Arial,sans-serif;color:#221c18;">
      <div style="max-width:620px;margin:0 auto;padding:32px 18px;">
        <div style="background:#ffffff;border:1px solid #eadfce;border-radius:28px;padding:30px;box-shadow:0 10px 30px rgba(73,54,30,0.06);">
          <div style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#9a8467;margin-bottom:18px;">
            Fragrantique Request Update
          </div>

          <h1 style="font-family:Georgia,serif;font-size:30px;line-height:1.2;margin:0 0 16px;color:#1f1915;">
            Stephanie replied to your request
          </h1>

          <p style="font-size:15px;line-height:1.7;margin:0 0 18px;color:#4b4038;">
            Hi ${escapeHtml(requesterName)},
          </p>

          <p style="font-size:15px;line-height:1.7;margin:0 0 18px;color:#4b4038;">
            You requested:
            <strong>${escapeHtml(brand)} ${escapeHtml(fragranceName)}</strong>
          </p>

          <div style="background:#fffaf4;border:1px solid #eadfce;border-radius:20px;padding:18px;margin:22px 0;">
            <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#9a8467;margin-bottom:10px;">
              Stephanie's reply
            </div>
            <div style="font-size:16px;line-height:1.8;color:#221c18;">
              ${escapeHtml(reply).replaceAll('\n', '<br />')}
            </div>
          </div>

          <p style="font-size:15px;line-height:1.7;margin:0 0 24px;color:#4b4038;">
            You can view fragrance requests on Fragrantique anytime.
          </p>

          <a href="${siteUrl}/requests"
            style="display:inline-block;background:#d8b56a;color:#1e1a16;text-decoration:none;border-radius:999px;padding:13px 22px;font-size:14px;font-weight:bold;">
            View Requests
          </a>

          <p style="font-size:12px;line-height:1.6;margin:28px 0 0;color:#9a8467;">
            Thank you for helping Fragrantique grow.
          </p>
        </div>
      </div>
    </div>
  `;

  const text = `Hi ${requesterName},

Stephanie replied to your Fragrantique request for ${brand} ${fragranceName}:

${reply}

View requests:
${siteUrl}/requests

Thank you for helping Fragrantique grow.`;

  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from:
        process.env.FROM_EMAIL ||
        process.env.SMTP_USER ||
        process.env.EMAIL_USER,
      to,
      subject,
      text,
      html,
    });

    return {
      email_sent: true,
      email_error: '',
    };
  } catch (error) {
    console.error('Reply email failed:', error);

    return {
      email_sent: false,
      email_error: error?.message || 'Email failed to send.',
    };
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    const reply = String(body.reply || '').trim();

    const supabase = getSupabaseAdminClient();

    const { data: existing, error: existingError } = await supabase
      .from('perfume_requests')
      .select(
        'id, brand, fragrance_name, requester_name, requester_email, reply'
      )
      .eq('id', id)
      .single();

    if (existingError) {
      return NextResponse.json(
        { error: existingError.message },
        { status: 500 }
      );
    }

    const oldReply = String(existing?.reply || '').trim();
    const shouldEmail = reply && reply !== oldReply;

    const { data, error } = await supabase
      .from('perfume_requests')
      .update({ reply })
      .eq('id', id)
      .select('reply')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let emailResult = {
      email_sent: false,
      email_error: '',
    };

    if (shouldEmail) {
      emailResult = await sendReplyEmail({
        requestItem: existing,
        reply,
      });
    }

    return NextResponse.json({
      reply: data.reply || '',
      email_sent: emailResult.email_sent,
      email_error: emailResult.email_error,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: 'Unable to save reply.' },
      { status: 500 }
    );
  }
}
