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

/**
 * POST /api/orders/ensure
 * Body: { session_id: string }
 * Ensures an orders row exists for the given Stripe session_id.
 * Idempotent: upserts order; sends email only if not already sent.
 */
export async function POST(req) {
  try {
    const { session_id } = await req.json();
    if (!session_id) {
      return NextResponse.json({ ok: false, error: 'session_id required' }, { status: 400 });
    }

    // 1) Already in DB?
    const { data: existing } = await supabase
      .from('orders')
      .select('*')
      .eq('stripe_session_id', session_id)
      .maybeSingle();

    if (existing?.id) {
      return NextResponse.json({ ok: true, status: 'exists', order: existing });
    }

    // 2) Fetch session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // 3) Fetch line items (best source of names/prices)
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
    } catch {
      lineItems = [];
    }

    // Fallback to metadata cart if present
    let metaItems = [];
    try {
      if (session.metadata?.cart) metaItems = JSON.parse(session.metadata.cart);
    } catch {}

    const items = lineItems.length ? lineItems : metaItems;

    const payload = {
      stripe_session_id: session.id,
      stripe_payment_intent: session.payment_intent || null,
      amount_total: session.amount_total || null,
      currency: session.currency || 'usd',
      buyer_email: session.customer_details?.email || session.customer_email || null,
      user_id: session.metadata?.seller_user_id || null,
      items: Array.isArray(items) ? items : [],
      status: session.payment_status === 'paid' ? 'paid' : (session.status || 'pending'),
      email_sent: false,
      email_error: null,
    };

    // 4) Upsert order
    const { data: upserted, error: upErr } = await supabase
      .from('orders')
      .upsert(payload, { onConflict: 'stripe_session_id' })
      .select('*')
      .maybeSingle();
    if (upErr) {
      return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });
    }

    // 5) Send email only if not already sent
    let emailOk = false;
    let emailErr = null;
    try {
      const html = renderOrderHtml({
        sessionId: session.id,
        buyerEmail: payload.buyer_email,
        amountTotal: payload.amount_total,
        currency: payload.currency,
        items: payload.items
      });
      const res = await sendOrderEmail({
        to: process.env.ADMIN_EMAIL,
        subject: 'Fragrantique — New order received',
        html
      });
      // consider as sent if nodemailer returned a messageId or accepted list
      emailOk = !!(res && (res.ok || res.accepted || res.messageId));
    } catch (e) {
      emailOk = false;
      emailErr = e.message || 'send_failed';
    }

    if (!emailOk && emailErr === null) emailErr = 'skipped_or_unknown';

    await supabase
      .from('orders')
      .update({ email_sent: emailOk, email_error: emailOk ? null : emailErr })
      .eq('stripe_session_id', session.id);

    return NextResponse.json({ ok: true, status: 'created', order: upserted || payload, emailOk, emailErr });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || 'ensure failed' }, { status: 500 });
  }
}
