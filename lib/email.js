
import nodemailer from 'nodemailer';

const SITE = 'https://fragrantique.net';

export function renderOrderHtml({ sessionId, buyerEmail, amountTotal, currency, items, shipping }) {
  const fmt = (cents, curr='USD') => cents == null ? '—' : `${(cents/100).toFixed(2)} ${String(curr).toUpperCase()}`;
  const safe = (v) => v ? String(v) : '';

  const shipBlock = shipping ? `
    <h3 style="margin:16px 0 6px">Shipping</h3>
    <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.4">
      <div><b>${safe(shipping.shipping_name || shipping.buyer_name)}</b></div>
      <div>${safe(shipping.shipping_address1)}${shipping.shipping_address2 ? ' ' + safe(shipping.shipping_address2) : ''}</div>
      <div>${safe(shipping.shipping_city)}, ${safe(shipping.shipping_state)} ${safe(shipping.shipping_postal)}</div>
      <div>${safe(shipping.shipping_country)}</div>
    </div>
  ` : '';

  return `
  <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
    <h2 style="margin:0 0 12px">Your Fragrantique Order</h2>
    <div style="font-size:14px;color:#555;margin-bottom:8px">Stripe session: ${sessionId}</div>
    ${buyerEmail ? `<div style="font-size:14px;margin-bottom:8px">Buyer email: <b>${buyerEmail}</b></div>` : ''}
    <div style="font-size:16px;margin:10px 0"><b>Total:</b> ${fmt(amountTotal, currency)}</div>

    <h3 style="margin:16px 0 6px">Items</h3>
    <ul style="padding-left:18px;margin:6px 0 16px">
      ${(Array.isArray(items) ? items : []).map(it => `
        <li style="margin:4px 0">
          <b>${safe(it.name || 'Item')}</b> · qty ${it.quantity || 1}
        </li>
      `).join('')}
    </ul>

    ${shipBlock}

    
  </div>
  `;
}

/** Customer-facing confirmation email HTML (adds your thank-you / tracking note). */
export function renderCustomerOrderHtml({ sessionId, amountTotal, currency, items, shipping }) {
  const fmt = (cents, curr='USD') => cents == null ? '—' : `${(cents/100).toFixed(2)} ${String(curr).toUpperCase()}`;
  const safe = (v) => v ? String(v) : '';

  const shipBlock = shipping ? `
    <h3 style="margin:16px 0 6px">Shipping to</h3>
    <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.4">
      <div><b>${safe(shipping.shipping_name || shipping.buyer_name)}</b></div>
      <div>${safe(shipping.shipping_address1)}${shipping.shipping_address2 ? ' ' + safe(shipping.shipping_address2) : ''}</div>
      <div>${safe(shipping.shipping_city)}, ${safe(shipping.shipping_state)} ${safe(shipping.shipping_postal)}</div>
      <div>${safe(shipping.shipping_country)}</div>
    </div>
  ` : '';

  return `
  <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto">
    <h2 style="margin:0 0 12px">Thank you for your order!</h2>
    <p style="margin:0 0 12px;font-size:14px;line-height:1.6">
      Thank you for your order.  I'll send an email confirmation with tracking info once it's complete.
    </p>

    <div style="font-size:13px;color:#555;margin-bottom:8px">Order reference (Stripe session): ${safe(sessionId)}</div>
    <div style="font-size:16px;margin:10px 0"><b>Total:</b> ${fmt(amountTotal, currency)}</div>

    <h3 style="margin:16px 0 6px">Items</h3>
    <ul style="padding-left:18px;margin:6px 0 16px">
      ${(Array.isArray(items) ? items : []).map(it => `
        <li style="margin:4px 0">
          <b>${safe(it.name || 'Item')}</b> · qty ${it.quantity || 1}
        </li>
      `).join('')}
    </ul>

    ${shipBlock}

    <div style="margin-top:20px;font-size:12px;color:#777">
      Explore more at <a href="${SITE}" style="color:inherit">${SITE.replace(/^https?:\/\//,'')}</a>.
    </div>
  </div>
  `;
}

export async function sendOrderEmail({ to, subject, html, replyTo }) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const from = process.env.FROM_EMAIL || `Fragrantique <${user || 'no-reply@fragrantique.net'}>`;

  if (!user || !pass) {
    return { skipped: true, reason: 'missing_gmail_creds' };
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      replyTo, // so you can reply to the visitor directly
    });
    return { ok: true, messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
  } catch (e) {
    return { ok: false, error: e.message || 'send_failed' };
  }
}
