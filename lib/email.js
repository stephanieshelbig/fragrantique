import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);

// Simple order email
export async function sendOrderEmail({ to, from, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY missing; skipping email.');
    return { skipped: true };
  }
  const res = await resend.emails.send({
    from: from || process.env.FROM_EMAIL || 'orders@fragrantique.net',
    to: Array.isArray(to) ? to : [to || process.env.ADMIN_EMAIL],
    subject,
    html
  });
  return res;
}

// Pretty HTML
export function renderOrderHtml({ sessionId, buyerEmail, amountTotal, currency, items }) {
  const money = (amountTotal ?? 0) / 100;
  const list = (items || []).map(
    it => `<li><strong>${escapeHtml(it.name || 'Item')}</strong> — qty ${it.quantity || 1} @ ${fmt(it.unit_amount, currency)}</li>`
  ).join('');
  return `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;">
      <h2>🧾 New order received</h2>
      <p><b>Buyer:</b> ${escapeHtml(buyerEmail || 'unknown')}</p>
      <p><b>Total:</b> ${fmt(amountTotal, currency)} (${escapeHtml((currency || '').toUpperCase())})</p>
      <p><b>Stripe session:</b> ${escapeHtml(sessionId || '')}</p>
      <h3>Items</h3>
      <ul>${list}</ul>
      <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || ''}/admin/orders">View in Admin →</a></p>
    </div>
  `;
}

function fmt(amount, currency) {
  const a = (amount ?? 0) / 100;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: (currency || 'usd').toUpperCase() }).format(a);
  } catch {
    return `$${a.toFixed(2)} ${(currency || 'USD').toUpperCase()}`;
  }
}

function escapeHtml(s='') {
  return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
