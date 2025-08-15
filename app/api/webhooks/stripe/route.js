import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { sendOrderEmail, renderOrderHtml } from '@/lib/email';

// Ensure Node.js runtime (recommended for Stripe webhooks)
export const runtime = 'nodejs';
// Optional: make sure this route is always dynamic
export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

// Service role client (server-only)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  // Stripe signature from headers
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 });
  }

  // IMPORTANT: raw body (no JSON parsing). App Router gives raw text via req.text()
  const rawBody = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        // Prefer line items from Stripe
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

        // Fallback to metadata cart (set in /api/checkout)
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
          user_id: session.metadata?.seller_user_id || null, // your admin profile id passed from /api/checkout
          items: Array.isArray(items) ? items : [],
          status: 'paid'
        };

        // Upsert by session id (idempotent)
        await supabase.from('orders').upsert(payload, { onConflict: 'stripe_session_id' });

        // Email the admin
        const html = renderOrderHtml({
          sessionId: session.id,
          buyerEmail: payload.buyer_email,
          amountTotal: payload.amount_total,
          currency: payload.currency,
          items: payload.items
        });
        await sendOrderEmail({
          to: process.env.ADMIN_EMAIL,
          subject: 'Fragrantique — New order received',
          html
        });

        break;
      }

      default:
        // Ignore other events for now
        break;
    }

    // Stripe expects a 2xx quickly
    return NextResponse.json({ received: true });
  } catch (e) {
    // Log server error but respond 200 so Stripe doesn't retry infinitely (you can choose 500 if you want retries)
    console.error('Webhook error:', e);
    return NextResponse.json({ error: e.message || 'handler error' }, { status: 500 });
  }
}
