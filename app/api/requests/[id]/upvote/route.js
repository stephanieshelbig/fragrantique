import crypto from 'crypto';
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
 
function getIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

function hashIp(ip) {
  return crypto
    .createHash('sha256')
    .update(`${ip}:${process.env.REQUEST_IP_SALT}`)
    .digest('hex');
}

export async function POST(request, { params }) {
  try {
    const requestId = params.id;
    const supabase = getAdminSupabase();

    const ipHash = hashIp(getIp(request));

    const { data: perfumeRequest, error: requestError } = await supabase
      .from('perfume_requests')
      .select('id, approved, upvotes_count')
      .eq('id', requestId)
      .single();

    if (requestError || !perfumeRequest || !perfumeRequest.approved) {
      return NextResponse.json(
        { error: 'Request not found.' },
        { status: 404 }
      );
    }

    const { data: existingVote, error: existingVoteError } = await supabase
      .from('perfume_request_votes')
      .select('id')
      .eq('request_id', requestId)
      .eq('ip_hash', ipHash)
      .maybeSingle();

    if (existingVoteError) {
      return NextResponse.json(
        { error: existingVoteError.message },
        { status: 500 }
      );
    }

    if (existingVote) {
      return NextResponse.json(
        { error: 'You already upvoted this fragrance.' },
        { status: 400 }
      );
    }

    const { error: voteError } = await supabase
      .from('perfume_request_votes')
      .insert([
        {
          request_id: requestId,
          ip_hash: ipHash,
        },
      ]);

    if (voteError) {
      return NextResponse.json({ error: voteError.message }, { status: 500 });
    }

    const nextCount = Number(perfumeRequest.upvotes_count || 0) + 1;

    const { error: updateError } = await supabase
      .from('perfume_requests')
      .update({ upvotes_count: nextCount })
      .eq('id', requestId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      upvotes_count: nextCount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Something went wrong submitting the upvote.' },
      { status: 500 }
    );
  }
}
