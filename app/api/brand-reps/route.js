// app/api/brand-reps/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // server-side only
);

// choose a representative per brand: prefer transparent → shortest name
function chooseRep(list) {
  if (!list?.length) return null;
  const withTransparent = list.filter(x => !!x?.image_url_transparent);
  const pool = withTransparent.length ? withTransparent : list;
  return pool.sort((a, b) => (a?.name || '').length - (b?.name || '').length)[0];
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('user') || 'stephanie';
    const email = searchParams.get('email') || 'stephanieshelbig@gmail.com';

    // 1) Find profile by username, else by email
    let prof = null;
    {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, email')
        .eq('username', username)
        .maybeSingle();
      if (data?.id) prof = data;
    }
    if (!prof) {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, email')
        .eq('email', email)
        .maybeSingle();
      if (data?.id) prof = data;
    }

    // 2) If we have a profile, try user-linked fragrances; else go global
    let reps = [];
    let mode = 'user';
    let linkCount = 0;

    if (prof?.id) {
      const { data: links } = await supabase
        .from('user_fragrances')
        .select('fragrance_id')
        .eq('user_id', prof.id);

      const ids = Array.from(new Set((links || []).map(l => l.fragrance_id).filter(Boolean)));
      linkCount = ids.length;

      if (ids.length) {
        const { data: frags } = await supabase
          .from('fragrances')
          .select('id, brand, name, image_url, image_url_transparent, updated_at, created_at')
          .in('id', ids);

        const byBrand = new Map();
        for (const f of (frags || [])) {
          const b = (f?.brand || 'Unknown').trim();
          if (!byBrand.has(b)) byBrand.set(b, []);
          byBrand.get(b).push(f);
        }
        reps = Array.from(byBrand.entries())
          .map(([brand, list]) => ({ brand, repFragrance: chooseRep(list) }))
          .filter(x => !!x.repFragrance);
      }
    }

    // 3) Fallback to global if user mode found nothing
    if (!reps.length) {
      mode = 'global';
      const { data: frags } = await supabase
        .from('fragrances')
        .select('id, brand, name, image_url, image_url_transparent, updated_at, created_at');

      const byBrand = new Map();
      for (const f of (frags || [])) {
        const b = (f?.brand || 'Unknown').trim();
        if (!byBrand.has(b)) byBrand.set(b, []);
        byBrand.get(b).push(f);
      }
      reps = Array.from(byBrand.entries())
        .map(([brand, list]) => ({ brand, repFragrance: chooseRep(list) }))
        .filter(x => !!x.repFragrance);
    }

    // 4) Sort A→Z by brand
    reps.sort((a, b) => a.brand.toLowerCase().localeCompare(b.brand.toLowerCase()));

    return NextResponse.json({
      ok: true,
      mode,
      linkCount,
      brandCount: reps.length,
      reps,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || 'error' }, { status: 500 });
  }
}
