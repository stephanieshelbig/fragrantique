// app/api/contact/route.js
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

    const to = 'stephanie@fragrantique.net'; // destination for contact messages
    const subject = 'Fragrantique — New contact message';

    const res = await sendOrderEmail({ to, subject, html });

    if (res?.skipped) {
      return NextResponse.json({
        ok: false,
        error: 'Email not configured (missing Gmail credentials).',
      }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'send failed' }, { status: 500 });
  }
}
