import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // needs service role to insert for your account
);

// naive “brand from name” splitter if text is like “Alexandria II — Xerjoff”
function splitNameBrand(label) {
  if (!label) return { name: null, brand: null };
  const parts = label.split(' — ');
  if (parts.length === 2) return { name: parts[0].trim(), brand: parts[1].trim() };
  // fallback: “Name Brand” -> try last word as brand, or just keep name
  return { name: label.trim(), brand: null };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { memberId, rows, targetUsername } = body || {};

    if (!Array.isArray(rows) || !rows.length) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
    }

    // find target user (defaults to stephanie)
    let username = targetUsername || 'stephanie';
    const { data: prof, error: pErr } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('username', username)
      .single();

    if (pErr || !prof) {
      return NextResponse.json({ error: `Profile not found for username=${username}` }, { status: 400 });
    }

    const userId = prof.id;

    // (1) Upsert fragrances
    // We’ll de-dupe by (fragrantica_url) if present, else by (name+brand) lowercase.
    const inserted = [];
    for (const r of rows) {
      const name = r.name?.trim() || splitNameBrand(r.label).name;
      const brand = r.brand?.trim() || splitNameBrand(r.label).brand;
      const image_url = r.image || null;
      const fragrantica_url = r.url || null;

      if (!name) continue;

      // Try to find existing by URL
      let { data: existingByUrl } = fragrantica_url
        ? await supabase.from('fragrances')
            .select('id')
            .eq('fragrantica_url', fragrantica_url)
            .maybeSingle()
        : { data: null };

      // Try by name+brand if needed
      if (!existingByUrl) {
        const { data: existingByNB } = await supabase
          .from('fragrances')
          .select('id')
          .ilike('name', name)
          .ilike('brand', brand || '')
          .maybeSingle();
        existingByUrl = existingByNB;
      }

      let fragranceId = existingByUrl?.id;

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

        if (insErr) {
          // just skip this one
          continue;
        }
        fragranceId = ins.id;
      }

      // (2) Link to user shelves if not already linked
      const { data: existsLink } = await supabase
        .from('user_fragrances')
        .select('id')
        .eq('user_id', userId)
        .eq('fragrance_id', fragranceId)
        .maybeSingle();

      if (!existsLink) {
        // Choose next position (append)
        const { data: last } = await supabase
          .from('user_fragrances')
          .select('position')
          .eq('user_id', userId)
          .order('position', { ascending: false })
          .limit(1);

        const nextPos = last?.length ? (last[0].position ?? 0) + 1 : 0;

        // Bottom-shelf, left→center→right fill (rough starter: cycle by nextPos)
        const SHELVES = 7; // 0=top .. 6=bottom
        const bottom = 6;
        const shelf_index = bottom - Math.floor(nextPos / 3); // wrap upward
        const column_key = ['left', 'center', 'right'][nextPos % 3];

        await supabase
          .from('user_fragrances')
          .insert({
            user_id: userId,
            fragrance_id: fragranceId,
            position: nextPos,
            shelf_index: Math.max(0, shelf_index),
            column_key,
          });
      }

      inserted.push(fragranceId);
    }

    return NextResponse.json({ ok: true, count: inserted.length });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Import failed' }, { status: 500 });
  }
}
