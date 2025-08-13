import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // required to aggregate across tables
);

export async function GET() {
  try {
    // Find Stephanie’s user_id
    const { data: prof, error: pErr } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', 'stephanie')
      .single();
    if (pErr || !prof) {
      return NextResponse.json({ error: 'Admin profile not found' }, { status: 400 });
    }
    const userId = prof.id;

    // Totals
    const [{ count: fragrances }] = await Promise.all([
      supabase.from('fragrances').select('*', { count: 'exact', head: true }),
    ]);

    // Missing image counts
    const { count: missing_src } = await supabase
      .from('fragrances')
      .select('*', { count: 'exact', head: true })
      .or('image_url.is.null,image_url.eq.')
      .not('name', 'is', null);

    const { count: missing_transparent } = await supabase
      .from('fragrances')
      .select('*', { count: 'exact', head: true })
      .or('image_url_transparent.is.null,image_url_transparent.eq.')
      .not('name', 'is', null);

    // Links for Stephanie + occupancy by shelf/row
    const { data: linksAgg, error: linksErr } = await supabase
      .from('user_fragrances')
      .select('shelf_index,row_index', { count: 'exact' })
      .eq('user_id', userId);
    if (linksErr) throw linksErr;

    const links = linksAgg?.length ?? 0;

    // Reduce into a map: shelf -> row -> count
    const byShelfRow = {};
    for (const r of linksAgg || []) {
      const s = (Number.isInteger(r.shelf_index) ? r.shelf_index : null);
      const rw = (Number.isInteger(r.row_index) ? r.row_index : 0);
      if (s == null) continue;
      byShelfRow[s] = byShelfRow[s] || {};
      byShelfRow[s][rw] = (byShelfRow[s][rw] || 0) + 1;
    }

    return NextResponse.json({
      ok: true,
      totals: {
        fragrances: fragrances ?? 0,
        links,
        missing_src: missing_src ?? 0,
        missing_transparent: missing_transparent ?? 0,
      },
      byShelfRow, // { "6": { "0": 12, "1": 9 }, "5": { "0": 7 } ...}
    });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'stats failed' }, { status: 500 });
  }
}
