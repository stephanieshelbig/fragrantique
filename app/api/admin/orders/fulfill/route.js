// /app/api/admin/orders/fulfill/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Uses service-role to bypass RLS safely (server-only)
const supabaseSR = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { order_id, fulfilled } = await req.json();
    if (!order_id || typeof fulfilled !== 'boolean') {
      return NextResponse.json({ error: 'order_id and fulfilled(boolean) required' }, { status: 400 });
    }

    // (Optional) You can add a simple shared secret check here if you want extra hardening.

    const { error } = await supabaseSR
      .from('orders')
      .update({ fulfilled })
      .eq('id', order_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'server error' }, { status: 500 });
  }
}
