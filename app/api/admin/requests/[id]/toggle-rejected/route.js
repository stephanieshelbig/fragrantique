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
    const body = await request.json();

    const rejected = Boolean(body.rejected);

    const updatePayload = rejected
      ? { rejected: true, added_to_site: false }
      : { rejected: false };

    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from('perfume_requests')
      .update(updatePayload)
      .eq('id', id)
      .select('rejected, added_to_site')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      rejected: data.rejected,
      added_to_site: data.added_to_site,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: 'Unable to update no thanks badge.' },
      { status: 500 }
    );
  }
}
