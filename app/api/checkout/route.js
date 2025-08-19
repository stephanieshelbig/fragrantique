import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const { items, buyer } = await req.json();

    if (!items?.length) {
      return NextResponse.json({ error: 'No items in cart' }, { status: 400 });
    }

    // Convert cart items
    const line_items = items.map((it) => ({
      price_data: {
        currency: it.currency || 'usd',
        product_data: { name: it.name },
        unit_amount: it.unit_amount,
      },
      quantity: it.quantity,
    }));

    // Calculate subtotal in cents
    const subtotalCents = items.reduce(
      (sum, it) => sum + it.unit_amount * it.quantity,
      0
    );

    // Add $5 shipping (500 cents)
    line_items.push({
      price_data: {
        currency: 'usd',
        product_data: { name: 'Shipping' },
        unit_amount: 500,
      },
      quantity: 1,
    });

    // Add 7% sales tax (rounded)
    const taxCents = Math.round(subtotalCents * 0.07);
    if (taxCents > 0) {
      line_items.push({
        price_data: {
          currency: 'usd',
          product_data: { name: 'Sales Tax (7%)' },
          unit_amount: taxCents,
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/cart`,
      metadata: {
        buyer_name: buyer?.name || '',
        buyer_address1: buyer?.address1 || '',
        buyer_address2: buyer?.address2 || '',
        buyer_city: buyer?.city || '',
        buyer_state: buyer?.state || '',
        buyer_postal: buyer?.postal || '',
        buyer_country: buyer?.country || '',
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
