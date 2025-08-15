import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Extract "sources/<path>" from a public Storage URL like
// https://.../storage/v1/object/public/sources/transparent/123.png
function getSourcesPathFromPublicUrl(url) {
  if (!url) return null;
  try {
    const idx = url.indexOf('/object/public/sources/');
    if (idx === -1) return null;
    return url.substring(idx + '/object/public/sources/'.length);
  } catch {
    return null;
  }
}

export async function POST(req) {
  try {
    const { fragranceId, deleteFromShelves = true, deleteStorage = true } = await req.json();

    if (!fragranceId) {
      return NextResponse.json({ ok: false, error: 'fragranceId required' }, { status: 400 });
    }

    // 1) Read current row to capture storage URL
    const { data: f, error: readErr } = await supabase
      .from('fragrances')
      .select('id, image_url_transparent')
      .eq('id', fragranceId)
      .maybeSingle();

    if (readErr) throw readErr;
    if (!f?.id) {
      return NextResponse.json({ ok: false, error: 'fragrance not found' }, { status: 404 });
    }

    // 2) Optionally delete transparent file from Storage (if it lives in "sources" bucket)
    if (deleteStorage && f.image_url_transparent) {
      const path = getSourcesPathFromPublicUrl(f.image_url_transparent);
      if (path) {
        // ignore errors on cleanup
        await supabase.storage.from('sources').remove([path]);
      }
    }

    // 3) Optionally remove shelf links first to avoid FK constraints
    if (deleteFromShelves) {
      await supabase.from('user_fragrances').delete().eq('fragrance_id', fragranceId);
    }

    // 4) Delete the fragrance row
    const { error: delErr } = await supabase.from('fragrances').delete().eq('id', fragranceId);
    if (delErr) throw delErr;

    return NextResponse.json({ ok: true, deleted: 1 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || 'server error' }, { status: 500 });
  }
}
