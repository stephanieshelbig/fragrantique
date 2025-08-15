import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

// Client for reading session user (anon OK)
const supabaseClient = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export async function POST(req) {
  try {
    const body = await req.json();
    const { items, successUrl, cancelUrl } = body || {};
    // items: [{ name, quantity, unit_amount, currency, fragrance_id, ... }]

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items' }, { status: 400 });
    }

    const supabase = supabaseClient();
    const { data: session } = await supabase.auth.getSession();
    const user = session?.session?.user || null;

    // Default seller is your admin profile, can be extended later for multi-seller
    // Look up your profile id (cache if you like)
    let seller_user_id = null;
    const { data: prof } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', 'stephanie')
      .maybeSingle();
    if (prof?.id) seller_user_id = prof.id;

    // Build Stripe line_items (using amount directly)
    const line_items = items.map(it => ({
      quantity: it.quantity || 1,
      price_data: {
        currency: (it.currency || 'usd').toLowerCase(),
        unit_amount: it.unit_amount, // in cents
        product_data: {
          name: it.name || 'Fragrance',
          metadata: {
            fragrance_id: String(it.fragrance_id || ''),
          }
        }
      }
    }));

    const sessionArgs = {
      mode: 'payment',
      line_items,
      success_url: successUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url : cancelUrl  || `${process.env.NEXT_PUBLIC_SITE_URL}/checkout/cancelled`,
      customer_email: user?.email || undefined,
      metadata: {
        seller_user_id: seller_user_id || '',
        cart: JSON.stringify(items.slice(0, 50)) // fallback for webhook email
      },
      // Your 5% platform fee could be implemented with Connect; for now you already add fee in price
    };

    const stripeSession = await stripe.checkout.sessions.create(sessionArgs);
    return NextResponse.json({ url: stripeSession.url });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'checkout failed' }, { status: 500 });
  }
}
