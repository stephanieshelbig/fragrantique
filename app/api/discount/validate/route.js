// app/api/discount/validate/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // server-only secret
);

export async function POST(req) {
  try {
    const { code, subtotalCents } = await req.json();
    if (!code || typeof subtotalCents !== 'number') {
      return NextResponse.json({ ok: false, error: 'Missing code or subtotal' }, { status: 400 });
    }

    const upper = String(code).trim().toUpperCase();

    const { data, error } = await supabaseAdmin
      .from('discount_codes')
      .select('code, type, value, active, expires_at, min_subtotal_cents')
      .eq('code', upper)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ ok: false, error: 'Invalid code' }, { status: 404 });
    }
    if (!data.active) {
      return NextResponse.json({ ok: false, error: 'Inactive code' }, { status: 400 });
    }
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ ok: false, error: 'Code expired' }, { status: 400 });
    }
    const min = Number(data.min_subtotal_cents || 0);
    if (subtotalCents < min) {
      return NextResponse.json({
        ok: false,
        error: `Minimum subtotal is ${(min/100).toFixed(2)}`
      }, { status: 400 });
    }
    if (!['percent','fixed','free_shipping'].includes(data.type)) {
      return NextResponse.json({ ok: false, error: 'Unsupported code' }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      discount: {
        code: data.code.toUpperCase(),
        type: data.type,
        value: data.value ?? null
      }
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Validation failed' }, { status: 500 });
  }
}
