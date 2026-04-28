import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export async function POST(request, { params }) {
  try {
    const { id } = params;
    const { added_to_site } = await request.json();

    const supabase = getSupabaseAdminClient();

    const updatePayload = added_to_site
      ? { added_to_site: true, rejected: false }
      : { added_to_site: false };

    const { data, error } = await supabase
      .from('perfume_requests')
      .update(updatePayload)
      .eq('id', id)
      .select('added_to_site, rejected')
      .single();

    if (error) throw error;

    return NextResponse.json({
      added_to_site: data.added_to_site,
      rejected: data.rejected,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
