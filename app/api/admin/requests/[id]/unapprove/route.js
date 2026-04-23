import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

export async function POST(request, { params }) {
  try {
    const supabase = getAdminSupabase();

    const { data, error } = await supabase
      .from('perfume_requests')
      .update({
        approved: false,
        status: 'pending',
        approved_at: null,
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, request: data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Something went wrong unapproving the request.' },
      { status: 500 }
    );
  }
}
