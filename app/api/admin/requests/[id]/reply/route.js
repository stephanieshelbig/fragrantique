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

    const reply = String(body.reply || '').trim();

    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from('perfume_requests')
      .update({ reply })
      .eq('id', id)
      .select('reply')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reply: data.reply || '' });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: 'Unable to save reply.' },
      { status: 500 }
    );
  }
}
