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
 
export async function GET() {
  try {
    const supabase = getAdminSupabase();

    const { data, error } = await supabase
      .from('perfume_requests')
      .select('id, brand, fragrance_name, notes, upvotes_count, created_at')
      .eq('approved', true)
      .order('upvotes_count', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ requests: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: 'Something went wrong loading requests.' },
      { status: 500 }
    );
  }
}
