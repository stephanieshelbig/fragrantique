import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseSR = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { order_id, comment } = await req.json();
    if (!order_id) {
      return NextResponse.json({ error: 'order_id required' }, { status: 400 });
    }

    const { error } = await supabaseSR
      .from('orders')
      .update({ comment })
      .eq('id', order_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'server error' }, { status: 500 });
  }
}
