// lib/email.js — Gmail (SMTP) via Nodemailer

import nodemailer from 'nodemailer';

export async function sendOrderEmail({ to, from, subject, html }) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.warn('[email] Missing GMAIL_USER or GMAIL_APP_PASSWORD; skipping email send.');
    return { skipped: true, reason: 'missing_credentials' };
  }

  // Create a reusable transporter (ok to create per send on serverless)
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,            // SSL
    secure: true,
    auth: { user, pass },
  });

  const fromAddr = from || process.env.FROM_EMAIL || user;
  const toList = Array.isArray(to) ? to : [to || process.env.ADMIN_EMAIL || user];

  // Optional: set reply-to to your main address
  const mail = {
    from: fromAddr,
    to: toList.filter(Boolean),
    subject: subject || 'Fragrantique — New order',
    html: html || '<p>New order received.</p>',
    // headers: { 'X-Entity-Ref-ID': String(Date.now()) }, // optional dedup header
  };

  try {
    const info = await transporter.sendMail(mail);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    console.error('[email] send failed:', err?.message || err);
    return { ok: false, error: err?.message || 'send_failed' };
  }
}

// Pretty HTML renderer reused by the webhook
export function renderOrderHtml({ sessionId, buyerEmail, amountTotal, currency, items }) {
  const list = (items || []).map(
    it => `<li><strong>${escapeHtml(it.name || 'Item')}</strong> — qty ${it.quantity || 1} @ ${fmt(it.unit_amount, currency)}</li>`
  ).join('');
  return `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;">
      <h2>🧾 New order received</h2>
      <p><b>Buyer:</b> ${escapeHtml(buyerEmail || 'unknown')}</p>
      <p><b>Total:</b> ${fmt(amountTotal, currency)} ${(currency || 'USD').toUpperCase()}</p>
      <p><b>Stripe session:</b> ${escapeHtml(sessionId || '')}</p>
      <h3>Items</h3>
      <ul>${list}</ul>
      <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/admin/orders">View in Admin →</a></p>
    </div>
  `;
}

// helpers
function fmt(amount, currency) {
  const a = (amount ?? 0) / 100;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: (currency || 'USD').toUpperCase() }).format(a);
  } catch {
    return `$${a.toFixed(2)} ${(currency || 'USD').toUpperCase()}`;
  }
}
function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
