// app/api/brand-reps/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function json(status, body) {
  return NextResponse.json(body, { status });
}

// Pick one representative per brand: prefer transparent → shortest name
function chooseRep(list) {
  if (!list?.length) return null;
  const withTransparent = list.filter(x => !!x?.image_url_transparent);
  const pool = withTransparent.length ? withTransparent : list;
  return pool.sort((a, b) => (a?.name || '').length - (b?.name || '').length)[0];
}

export async function GET(req) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url)        return json(500, { ok: false, error: 'Missing NEXT_PUBLIC_SUPABASE_URL' });
    if (!serviceKey) return json(500, { ok: false, error: 'Missing SUPABASE_SERVICE_ROLE_KEY' });

    const supabase = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { searchParams } = new URL(req.url);
    const username = searchParams.get('user') || 'stephanie';
    const email    = searchParams.get('email') || 'stephanieshelbig@gmail.com';

    // 1) Find profile by username, else by email
    let prof = null;
    {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, email')
        .eq('username', username)
        .maybeSingle();
      if (error) return json(500, { ok: false, error: `profiles(username) ${error.message}` });
      if (data?.id) prof = data;
    }
    if (!prof) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, email')
        .eq('email', email)
        .maybeSingle();
      if (error) return json(500, { ok: false, error: `profiles(email) ${error.message}` });
      if (data?.id) prof = data;
    }

    let reps = [];
    let mode = 'user';
    let linkCount = 0;

    // 2) If profile found, try user-linked fragrances
    if (prof?.id) {
      const { data: links, error: lErr } = await supabase
        .from('user_fragrances')
        .select('fragrance_id')
        .eq('user_id', prof.id);

      if (lErr) return json(500, { ok: false, error: `user_fragrances ${lErr.message}` });

      const ids = Array.from(new Set((links || []).map(l => l.fragrance_id).filter(Boolean)));
      linkCount = ids.length;

      if (ids.length) {
        // IMPORTANT: select only columns that certainly exist in your schema
        const { data: frags, error: fErr } = await supabase
          .from('fragrances')
          .select('id, brand, name, image_url, image_url_transparent') // ← no updated_at here
          .in('id', ids);

        if (fErr) return json(500, { ok: false, error: `fragrances(in) ${fErr.message}` });

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
      const { data: fragsAll, error: gErr } = await supabase
        .from('fragrances')
        .select('id, brand, name, image_url, image_url_transparent'); // ← no updated_at here
      if (gErr) return json(500, { ok: false, error: `fragrances(all) ${gErr.message}` });

      const byBrand = new Map();
      for (const f of (fragsAll || [])) {
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

    return json(200, { ok: true, mode, linkCount, brandCount: reps.length, reps });
  } catch (e) {
    return json(500, { ok: false, error: e.message || 'error' });
  }
}
