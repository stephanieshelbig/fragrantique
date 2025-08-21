import { NextResponse } from 'next/server';
import { sendOrderEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function escapeHtml(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function POST(req) {
  try {
    const { name, email, message } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing name, email, or message.' }, { status: 400 });
    }

    const html = `
      <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
        <h2 style="margin:0 0 10px">New website message</h2>
        <div><b>From:</b> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</div>
        <div style="margin:12px 0; white-space:pre-wrap">${escapeHtml(message)}</div>
      </div>
    `;

    // Primary destination
    const primaryTo = 'stephanie@fragrantique.net';
    // Optional CC to your Gmail for diagnostics (set ENV CONTACT_CC to your Gmail or leave empty)
    const cc = process.env.CONTACT_CC ? [process.env.CONTACT_CC] : [];

    const res = await sendOrderEmail({
      to: [primaryTo, ...cc],
      subject: 'Fragrantique — New contact message',
      html,
      replyTo: `${name} <${email}>`,
    });

    if (res?.skipped) {
      return NextResponse.json({
        ok: false,
        error: 'Email not configured (missing Gmail credentials).',
      }, { status: 500 });
    }
    if (!res?.ok) {
      return NextResponse.json({ ok: false, error: res?.error || 'send_failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, accepted: res.accepted || [] });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'send failed' }, { status: 500 });
  }
}
