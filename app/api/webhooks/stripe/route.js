import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripeClient, getWebhookSecret } from '@/lib/stripe';
import { sendOrderEmail, renderOrderHtml, renderCustomerOrderHtml } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const stripe = getStripeClient();

// IMPORTANT: service role for RPC/stock updates (server-only env var)
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
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // ---- 1) Pull items from Stripe line items (preferred) ----
      let itemsFromLineItems = [];
      try {
        // Expand product so we can read product.metadata, too
        const li = await stripe.checkout.sessions.listLineItems(session.id, {
          limit: 100,
          expand: ['data.price.product'],
        });

        itemsFromLineItems = li.data.map((x) => {
          // Try to find option_id on price or product metadata
          const priceMeta = (x.price && x.price.metadata) || {};
          const prodObj = x.price && x.price.product && typeof x.price.product === 'object'
            ? x.price.product
            : null;
          const productMeta = (prodObj && prodObj.metadata) || {};

          const option_id = priceMeta.option_id || productMeta.option_id || null;

          return {
            name: x.description || (prodObj && prodObj.name) || 'Item',
            quantity: x.quantity || 1,
            unit_amount: x.price?.unit_amount ?? null,
            currency: x.currency || session.currency,
            // If you also set fragrance_id in metadata, we’ll pass it through:
            fragrance_id: priceMeta.fragrance_id || productMeta.fragrance_id || null,
            option_id,
          };
        });
      } catch {
        itemsFromLineItems = [];
      }

      // ---- 2) Fallback to your session.metadata.cart (if used) ----
      let itemsFromCart = [];
      try {
        if (session.metadata?.cart) {
          const parsed = JSON.parse(session.metadata.cart);
          if (Array.isArray(parsed)) {
            itemsFromCart = parsed.map((it) => ({
              name: it.name || 'Item',
              quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
              unit_amount: typeof it.unit_amount === 'number' ? it.unit_amount : null,
              currency: (it.currency || session.currency || 'usd'),
              fragrance_id: it.fragrance_id || null,
              option_id: it.option_id || null, // <- preferred source when using cart fallback
            }));
          }
        }
      } catch {
        itemsFromCart = [];
      }

      // Prefer Stripe line items; fallback to the cart array
      const items = itemsFromLineItems.length ? itemsFromLineItems : itemsFromCart;

      // ---- 3) Pull shipping / buyer data (same behavior you had) ----
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

      // ---- 4) Upsert order (same as before) ----
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

      // ---- 5) DECREMENT STOCK for each purchased decant option ----
      // Requires SQL from step 1:
      //   create or replace function public.decrement_decant_quantity(p_option_id uuid, p_qty int) returns void ...
      for (const it of payload.items) {
        const optionId = it.option_id || null;
        const qty = Math.max(0, parseInt(it.quantity, 10) || 0);

        if (optionId && qty > 0) {
          // Null quantities in DB (unlimited) are preserved by the RPC; finite are decremented.
          await supabase.rpc('decrement_decant_quantity', {
            p_option_id: optionId,
            p_qty: qty,
          });
        }
      }

      // ---- 6) Send notification email (admin) ----
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
        html,
      });

      // ---- 7) Send customer confirmation (new) ----
      if (payload.buyer_email) {
        const customerHtml = renderCustomerOrderHtml({
          sessionId: session.id,
          amountTotal: payload.amount_total,
          currency: payload.currency,
          items: payload.items,
          shipping,
        });

        await sendOrderEmail({
          to: payload.buyer_email,
          subject: 'Your Fragrantique order confirmation',
          html: customerHtml,
          replyTo: process.env.SUPPORT_EMAIL || process.env.FROM_EMAIL,
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error('Webhook error:', e);
    return NextResponse.json({ error: e.message || 'handler error' }, { status: 500 });
  }
}
