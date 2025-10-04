// app/checkout/route.js
import Stripe from 'stripe';

export const dynamic = 'force-dynamic'; // avoid caching issues for POST handlers
export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

/**
 * Resolve a human discount code (e.g., "FALL20") into something Stripe understands.
 * You have THREE common options below. Use ONE and remove the others:
 *
 * A) You already created Promotion Codes in Stripe Dashboard
 *    - Search for an active promotion_code by its "code" value and return its id.
 *
 * B) You mapped your own codes to Stripe COUPON IDs (e.g., in env or DB)
 *    - Return { coupon: 'coupon_...' } directly from your mapping.
 *
 * C) You manage your own percent/amount rules outside Stripe
 *    - Create a one-off Coupon (duration: 'once') on the fly and return it.
 *      (Better: create/store once and reuse, but on-the-fly works if needed.)
 */
async function resolveStripeDiscount(discountCode) {
  if (!discountCode) return null;

  const code = String(discountCode).trim();

  // -------- OPTION A: Use existing Promotion Codes in Stripe --------
  // try {
  //   const promoList = await stripe.promotionCodes.list({
  //     code,
  //     active: true,
  //     limit: 1,
  //   });
  //   const promo = promoList.data[0];
  //   if (promo) return { promotion_code: promo.id };
  // } catch (err) {
  //   console.error('Error looking up promotion code:', err);
  // }

  // -------- OPTION B: Map your own codes to Stripe Coupon IDs --------
  // const COUPON_MAP = {
  //   FALL20: 'coupon_123',     // 20% off coupon created in Stripe
  //   TENOFF: 'coupon_abc',     // $10 off coupon created in Stripe
  // };
  // const couponId = COUPON_MAP[code.toUpperCase()];
  // if (couponId) return { coupon: couponId };

  // -------- OPTION C: Create a one-off Coupon on the fly ------------
  // Replace this with your own validation logic (e.g., check DB).
  // Example: treat codes ending with "20" as 20% off; "TENOFF" as $10 off.
  const fauxValidated = validateCustomCode(code);
  if (fauxValidated?.type === 'percent') {
    const coupon = await stripe.coupons.create({
      percent_off: fauxValidated.value, // e.g., 20 for 20%
      duration: 'once',
      name: code,
    });
    return { coupon: coupon.id };
  } else if (fauxValidated?.type === 'amount') {
    const coupon = await stripe.coupons.create({
      amount_off: fauxValidated.value,  // integer cents
      currency: 'usd',
      duration: 'once',
      name: code,
    });
    return { coupon: coupon.id };
  }

  // If nothing matched, return null so no discount is applied.
  return null;
}

// Dummy validator for OPTION C. Replace with your real logic.
function validateCustomCode(code) {
  const up = code.toUpperCase();
  if (up === 'FALL20') return { type: 'percent', value: 20 };
  if (up === 'TENOFF') return { type: 'amount', value: 1000 }; // $10 in cents
  return null;
}

export async function POST(req) {
  try {
    const body = await req.json();

    // Expected body:
    // {
    //   items: [{ price: 'price_...', quantity: 1 }, ...] OR [{ name, unit_amount, quantity, currency }],
    //   success_url: 'https://your-site/success',
    //   cancel_url: 'https://your-site/cancel',
    //   discountCode: 'FALL20' // optional
    // }

    const {
      items = [],
      success_url,
      cancel_url,
      discountCode,
      customer_email,       // optional: if you collect it beforehand
      customer,             // optional: Stripe customer id
      mode = 'payment',     // default to 'payment'
    } = body || {};

    // Build line_items. Support both price IDs and price_data objects.
    const line_items = items.map((it) => {
      if (it.price) {
        return { price: it.price, quantity: it.quantity ?? 1 };
      }
      // fallback to price_data path
      return {
        quantity: it.quantity ?? 1,
        price_data: {
          currency: it.currency ?? 'usd',
          product_data: { name: it.name ?? 'Item' },
          unit_amount: it.unit_amount, // integer cents
        },
      };
    });

    // Resolve discount into Stripe format
    const discountForStripe = await resolveStripeDiscount(discountCode);

    const sessionParams = {
      mode,
      line_items,
      success_url,
      cancel_url,
      // If you want customers to also enter promotion codes on Stripe page:
      // allow_promotion_codes: true,
      ...(customer ? { customer } : {}),
      ...(customer_email ? { customer_email } : {}),
      ...(discountForStripe ? { discounts: [discountForStripe] } : {}),
      // Keep metadata small to avoid hitting Stripe limits
      // metadata: { order_id: 'abc123' },
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    return new Response(JSON.stringify({ id: session.id, url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Checkout error:', err);
    return new Response(
      JSON.stringify({ error: { message: err.message } }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
