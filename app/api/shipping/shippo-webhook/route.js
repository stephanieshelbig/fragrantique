import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const body = await req.json();
    // body will include tracking number + new status
    const tracking = body?.tracking_number;
    const status = body?.tracking_status?.status; // e.g. 'TRANSIT', 'DELIVERED'

    if (!tracking) return NextResponse.json({ ok: true });

    await supabase
      .from('orders')
      .update({ label_status: status || 'in_transit' })
      .eq('tracking_number', tracking);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 200 }); // respond 200 so Shippo doesn't retry forever
  }
}
