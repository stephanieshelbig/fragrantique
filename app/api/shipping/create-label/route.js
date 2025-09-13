import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { shippoFetch } from '@/lib/shippo';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Convert your ounces/inches to Shippo parcel if you want to make it dynamic
function getDefaultParcel() {
  // Example: 8oz, 6x4x2 in
  return {
    distance_unit: 'in',
    mass_unit: 'oz',
    height: '2',
    width: '4',
    length: '6',
    weight: '8',
  };
}

function fromAddress() {
  return {
    name: process.env.FROM_NAME || 'Fragrantique',
    street1: process.env.FROM_STREET1 || '123 Main St',
    street2: process.env.FROM_STREET2 || '',
    city: process.env.FROM_CITY || 'Phoenix',
    state: process.env.FROM_STATE || 'AZ',
    zip: process.env.FROM_ZIP || '85001',
    country: process.env.FROM_COUNTRY || 'US',
    email: process.env.FROM_EMAIL || 'stephanie@fragrantique.net',
  };
}

export async function POST(req) {
  try {
    const { order_id, parcel } = await req.json();
    if (!order_id) {
      return NextResponse.json({ error: 'order_id required' }, { status: 400 });
    }

    // Load order + buyer shipping info (you already store this in orders from checkout)
    const { data: order, error: ordErr } = await supabase
      .from('orders')
      .select('id, buyer_name, buyer_address1, buyer_address2, buyer_city, buyer_state, buyer_postal, buyer_country, currency')
      .eq('id', order_id)
      .maybeSingle();

    if (ordErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const to = {
      name: order.buyer_name,
      street1: order.buyer_address1,
      street2: order.buyer_address2 || '',
      city: order.buyer_city,
      state: order.buyer_state,
      zip: order.buyer_postal,
      country: order.buyer_country || 'US',
      // optional: email/phone for notifications
    };

    const shipment = await shippoFetch('/shipments/', {
      method: 'POST',
      body: JSON.stringify({
        address_from: fromAddress(),
        address_to: to,
        parcels: [parcel || getDefaultParcel()],
        extra: { // optional signature/insurance later
        },
        // You can force USPS by purchasing only USPS rates below
      }),
    });

    // Pick cheapest USPS rate
    const rates = shipment.rates || [];
    const uspsRates = rates.filter(r => (r.provider || '').toUpperCase().includes('USPS'));
    const candidate = (uspsRates.length ? uspsRates : rates).sort(
      (a, b) => Number(a.amount) - Number(b.amount)
    )[0];

    if (!candidate) {
      return NextResponse.json({ error: 'No rates available' }, { status: 400 });
    }

    // Buy the label
    const transaction = await shippoFetch('/transactions/', {
      method: 'POST',
      body: JSON.stringify({
        rate: candidate.object_id,
        label_file_type: 'PDF',
        async: false,
      }),
    });

    if (transaction.status !== 'SUCCESS') {
      return NextResponse.json({ error: 'Label purchase failed', detail: transaction.messages }, { status: 400 });
    }

    // Save to DB
    const { error: updErr } = await supabase
      .from('orders')
      .update({
        shipping_label_url: transaction.label_url,
        tracking_number: transaction.tracking_number,
        carrier: candidate.provider,
        service: candidate.servicelevel && candidate.servicelevel.name ? candidate.servicelevel.name : candidate.servicelevel_name || null,
        label_cost_cents: Math.round(Number(candidate.amount) * 100),
        label_status: 'purchased',
      })
      .eq('id', order.id);

    if (updErr) {
      return NextResponse.json({ error: 'Saved label but failed to update order' }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      label_url: transaction.label_url,
      tracking: transaction.tracking_number,
      rate: candidate.amount,
      currency: candidate.currency || 'USD',
    });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'error' }, { status: 500 });
  }
}
