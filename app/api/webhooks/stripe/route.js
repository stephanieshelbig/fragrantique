import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripeClient, getWebhookSecret } from '@/lib/stripe';
import { sendOrderEmail, renderOrderHtml } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const stripe = getStripeClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = getWebhookSecret();
  if (!sig) return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });

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

      // Line items (preferred)
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

      // Fallback to metadata cart
      let metaItems = [];
      try { if (session.metadata?.cart) metaItems = JSON.parse(session.metadata.cart); } catch {}

      const items = lineItems.length ? lineItems : metaItems;

      // Shipping/name from Stripe first, else metadata from cart form
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
        status: 'paid',
        buyer_name: shipping.buyer_name,
        shipping_name: shipping.shipping_name,
        shipping_address1: shipping.shipping_address1,
        shipping_address2: shipping.shipping_address2,
        shipping_city: shipping.shipping_city,
        shipping_state: shipping.shipping_state,
        shipping_postal: shipping.shipping_postal,
        shipping_country: shipping.shipping_country,
      };

      await supabase.from('orders').upsert(payload, { onConflict: 'stripe_session_id' });

      const html = renderOrderHtml({
        sessionId: session.id,
        buyerEmail: payload.buyer_email,
        amountTotal: payload.amount_total,
        currency: payload.currency,
        items: payload.items,
        shipping,
      });
      await sendOrderEmail({
        to: process.env.ADMIN_EMAIL,
        subject: 'Fragrantique — New order received',
        html
      });
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error('Webhook error:', e);
    return NextResponse.json({ error: e.message || 'handler error' }, { status: 500 });
  }
}
