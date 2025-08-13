import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Robust parser: read brand & name from Fragrantica URL
function parseFromUrl(url) {
  try {
    if (!url) return {};
    const u = new URL(url);
    const m = u.pathname.match(/\/perfume\/([^/]+)\/([^/]+)\.html/i);
    if (!m) return {};
    const brandSlug = m[1];
    const nameSlugWithId = m[2]; // e.g. "Elle-Anniversary-88612"
    // drop trailing numeric id (if present)
    const nameSlug = nameSlugWithId.replace(/-\d+$/, '');
    const brand = decodeURIComponent(brandSlug).replace(/-/g, ' ').trim();
    const name = decodeURIComponent(nameSlug).replace(/-/g, ' ').trim();
    return { brand, name };
  } catch {
    return {};
  }
}

function norm(s) {
  return (s || '').trim().toLowerCase();
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { rows, targetUsername } = body || {};

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
    }

    // find target user (defaults to stephanie)
    const username = targetUsername || 'stephanie';
    const { data: prof, error: pErr } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', username)
      .single();

    if (pErr || !prof) {
      return NextResponse.json({ error: `Profile not found for username=${username}` }, { status: 400 });
    }

    const userId = prof.id;

    let createdFragrances = 0;
    let linkedNew = 0;
    let skippedExistingLink = 0;
    let skippedUnparseable = 0;

    for (const r of rows) {
      // Prefer parsing brand/name from URL; fall back to label if needed
      let { brand, name } = parseFromUrl(r.url);
      if (!name) {
        // try label fallback like "Name — Brand" or "Name Brand"
        const label = (r.label || '').trim();
        if (label.includes(' — ')) {
          const [n, b] = label.split(' — ');
          name = (name || n || '').trim();
          brand = (brand || b || '').trim();
        } else {
          // very weak fallback: keep label as name
          name = name || label;
        }
      }

      // minimal sanity
      if (!name) {
        skippedUnparseable++;
        continue;
      }

      const image_url = r.image || null;
      const fragrantica_url = r.url || null;

      // Try match by URL first
      let fragranceId = null;

      if (fragrantica_url) {
        const { data: byUrl } = await supabase
          .from('fragrances')
          .select('id')
          .eq('fragrantica_url', fragrantica_url)
          .maybeSingle();
        if (byUrl?.id) fragranceId = byUrl.id;
      }

      // Match by normalized name+brand if still not found
      if (!fragranceId) {
        const { data: byNB } = await supabase
          .from('fragrances')
          .select('id, name, brand')
          .limit(50);
        const got = (byNB || []).find(
          (x) => norm(x.name) === norm(name) && norm(x.brand) === norm(brand)
        );
        if (got?.id) fragranceId = got.id;
      }

      // Create if needed
      if (!fragranceId) {
        const { data: ins, error: insErr } = await supabase
          .from('fragrances')
          .insert({
            name,
            brand: brand || null,
            image_url: image_url || null,
            fragrantica_url: fragrantica_url || null,
          })
          .select('id')
          .single();

        if (insErr || !ins?.id) {
          skippedUnparseable++;
          continue;
        }
        fragranceId = ins.id;
        createdFragrances++;
      }

      // Link to user shelves if not already linked
      const { data: existsLink } = await supabase
        .from('user_fragrances')
        .select('id')
        .eq('user_id', userId)
        .eq('fragrance_id', fragranceId)
        .maybeSingle();

      if (existsLink?.id) {
        skippedExistingLink++;
        continue;
      }

      // Choose next position (append)
      const { data: last } = await supabase
        .from('user_fragrances')
        .select('position')
        .eq('user_id', userId)
        .order('position', { ascending: false })
        .limit(1);

      const nextPos = last?.length ? (last[0].position ?? 0) + 1 : 0;

      // Bottom-shelf, left→center→right fill; wrap upward
      const SHELVES = 7; // 0=top .. 6=bottom
      const bottom = 6;
      const shelf_index = Math.max(0, bottom - Math.floor(nextPos / 3));
      const column_key = ['left', 'center', 'right'][nextPos % 3];

      await supabase
        .from('user_fragrances')
        .insert({
          user_id: userId,
          fragrance_id: fragranceId,
          position: nextPos,
          shelf_index,
          column_key,
        });

      linkedNew++;
    }

    return NextResponse.json({
      ok: true,
      createdFragrances,
      linkedNew,
      skippedExistingLink,
      skippedUnparseable,
      received: rows.length,
      message:
        `Received ${rows.length}; added ${createdFragrances} new fragrances; linked ${linkedNew}; ` +
        `skipped ${skippedExistingLink} existing links; ${skippedUnparseable} unparseable.`
    });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Import failed' }, { status: 500 });
  }
}
