import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripeClient } from '@/lib/stripe';
import { sendOrderEmail, renderOrderHtml } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const stripe = getStripeClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { session_id } = await req.json();
    if (!session_id) return NextResponse.json({ ok: false, error: 'session_id required' }, { status: 400 });

    const { data: existing } = await supabase
      .from('orders').select('*').eq('stripe_session_id', session_id).maybeSingle();
    if (existing?.id) return NextResponse.json({ ok: true, status: 'exists', order: existing });

    const session = await stripe.checkout.sessions.retrieve(session_id);

    let lineItems = [];
    try {
      const li = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
      lineItems = li.data.map(x => ({
        name: x.description || x.price?.product || 'Item',
        quantity: x.quantity || 1,
        unit_amount: x.price?.unit_amount ?? null,
        currency: x.currency || session.currency,
        fragrance_id: x.price?.metadata?.fragrance_id || null,
      }));
    } catch { lineItems = []; }

    let metaItems = [];
    try { if (session.metadata?.cart) metaItems = JSON.parse(session.metadata.cart); } catch {}
    const items = lineItems.length ? lineItems : metaItems;

    const md = session.metadata || {};
    const cd = session.customer_details || {};
    const ship = session.shipping || {};
    const addr = ship.address || cd.address || null;

    const shipping = {
      buyer_name: cd.name || md.shipping_name || null,
      shipping_name: ship.name || md.shipping_name || null,
      shipping_address1: addr?.line1 || md.shipping_address1 || null,
      shipping_address2: addr?.line2 || md.shipping_address2 || null,
      shipping_city: addr?.city || md.shipping_city || null,
      shipping_state: addr?.state || md.shipping_state || null,
      shipping_postal: addr?.postal_code || md.shipping_postal || null,
      shipping_country: addr?.country || md.shipping_country || null,
    };

    const payload = {
      stripe_session_id: session.id,
      stripe_payment_intent: session.payment_intent || null,
      amount_total: session.amount_total || null,
      currency: session.currency || 'usd',
      buyer_email: cd.email || session.customer_email || null,
      user_id: md.seller_user_id || null,
      items: Array.isArray(items) ? items : [],
      status: session.payment_status === 'paid' ? 'paid' : (session.status || 'pending'),
      buyer_name: shipping.buyer_name,
      shipping_name: shipping.shipping_name,
      shipping_address1: shipping.shipping_address1,
      shipping_address2: shipping.shipping_address2,
      shipping_city: shipping.shipping_city,
      shipping_state: shipping.shipping_state,
      shipping_postal: shipping.shipping_postal,
      shipping_country: shipping.shipping_country,
      email_sent: false,
      email_error: null,
    };

    const { data: upserted, error: upErr } = await supabase
      .from('orders').upsert(payload, { onConflict: 'stripe_session_id' }).select('*').maybeSingle();
    if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

    // Email (best-effort)
    let emailOk = false; let emailErr = null;
    try {
      const html = renderOrderHtml({
        sessionId: session.id,
        buyerEmail: payload.buyer_email,
        amountTotal: payload.amount_total,
        currency: payload.currency,
        items: payload.items,
        shipping,
      });
      const res = await sendOrderEmail({ to: process.env.ADMIN_EMAIL, subject: 'Fragrantique — New order received', html });
      emailOk = !!(res && (res.ok || res.messageId || res.accepted));
    } catch (e) { emailOk = false; emailErr = e.message || 'send_failed'; }

    await supabase.from('orders')
      .update({ email_sent: emailOk, email_error: emailOk ? null : emailErr })
      .eq('stripe_session_id', session.id);

    return NextResponse.json({ ok: true, status: 'created', order: upserted || payload, emailOk, emailErr });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || 'ensure failed' }, { status: 500 });
  }
}
