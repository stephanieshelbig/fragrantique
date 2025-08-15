import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripeClient, getWebhookSecret } from '@/lib/stripe';
import { sendOrderEmail, renderOrderHtml } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const stripe = getStripeClient();

// service-role client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = getWebhookSecret();
  if (!sig) {
    return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
  }

  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // Try to obtain line items
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

      // Fallback to metadata cart
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
        status: 'paid',
      };

      // Upsert order
      const { error: upErr } = await supabase
        .from('orders')
        .upsert(payload, { onConflict: 'stripe_session_id' });
      if (upErr) console.error('[orders upsert] error:', upErr.message);

      // Send email
      const html = renderOrderHtml({
        sessionId: session.id,
        buyerEmail: payload.buyer_email,
        amountTotal: payload.amount_total,
        currency: payload.currency,
        items: payload.items
      });

      let emailOk = false;
      let emailErr = null;
      try {
        const res = await sendOrderEmail({
          to: process.env.ADMIN_EMAIL,
          subject: 'Fragrantique — New order received',
          html
        });
        emailOk = !!(res && (res.ok || res.accepted || res.messageId || res.id || res.skipped));
        // Treat skipped (missing creds) as not sent but not fatal
        if (res?.skipped) {
          emailOk = false;
          emailErr = 'skipped';
        }
      } catch (e) {
        emailOk = false;
        emailErr = e.message || 'send_failed';
      }

      // Persist email status
      const upd = emailOk
        ? { email_sent: true, email_error: null }
        : { email_sent: false, email_error: emailErr || 'unknown' };

      const { error: updErr } = await supabase
        .from('orders')
        .update(upd)
        .eq('stripe_session_id', session.id);
      if (updErr) console.error('[orders email status update] error:', updErr.message);
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error('Webhook error:', e);
    return NextResponse.json({ error: e.message || 'handler error' }, { status: 500 });
  }
}
