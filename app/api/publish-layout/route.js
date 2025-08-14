import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  // Service role key (server-side only)
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { username, mode } = await req.json();

    if (!username) {
      return NextResponse.json({ ok: false, error: 'username required' }, { status: 400 });
    }

    // Find profile (owner)
    const { data: prof, error: profErr } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', username)
      .maybeSingle();
    if (profErr) throw profErr;
    if (!prof?.id) {
      return NextResponse.json({ ok: false, error: 'profile not found' }, { status: 404 });
    }

    // Copy all existing rows to public (idempotent)
    if (mode === 'from-db-private') {
      // upsert same coords but set is_public=true
      const { data: rows, error: readErr } = await supabase
        .from('user_brand_positions')
        .select('brand_key, x_pct, y_pct, is_public')
        .eq('user_id', prof.id);

      if (readErr) throw readErr;

      const payload = (rows || []).map(r => ({
        user_id: prof.id,
        brand_key: r.brand_key,
        x_pct: r.x_pct,
        y_pct: r.y_pct,
        is_public: true
      }));

      if (!payload.length) {
        return NextResponse.json({ ok: true, updated: 0, message: 'No positions found for this user.' });
      }

      const { error: upErr } = await supabase
        .from('user_brand_positions')
        .upsert(payload, { onConflict: 'user_id,brand_key' });
      if (upErr) throw upErr;

      return NextResponse.json({ ok: true, updated: payload.length });
    }

    // Optional: publish from local client map (fallback)
    if (mode === 'from-local') {
      const body = await req.json(); // already parsed, but keep reference
      const map = body.map || {};
      const entries = Object.entries(map);
      if (!entries.length) {
        return NextResponse.json({ ok: false, error: 'empty map' }, { status: 400 });
      }
      const payload = entries.map(([brand_key, pos]) => ({
        user_id: prof.id,
        brand_key,
        x_pct: Number(pos?.x_pct ?? 50),
        y_pct: Number(pos?.y_pct ?? 80),
        is_public: true,
      }));

      const { error: upErr } = await supabase
        .from('user_brand_positions')
        .upsert(payload, { onConflict: 'user_id,brand_key' });
      if (upErr) throw upErr;

      return NextResponse.json({ ok: true, updated: payload.length });
    }

    return NextResponse.json({ ok: false, error: 'unknown mode' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || 'server error' }, { status: 500 });
  }
}
