import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getIp(req) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

function hashIp(ip) {
  return crypto
    .createHash('sha256')
    .update(`${ip}:${process.env.REQUEST_IP_SALT}`)
    .digest('hex');
}

export async function POST(req, { params }) {
  try {
    const requestId = params.id;
    const ipHash = hashIp(getIp(req));

    const { data: existingVote } = await supabase
      .from('perfume_request_votes')
      .select('id')
      .eq('request_id', requestId)
      .eq('ip_hash', ipHash)
      .maybeSingle();

    if (existingVote) {
      return NextResponse.json(
        { error: 'Thanks, but you already upvoted this request.' },
        { status: 400 }
      );
    }

    const { error: voteError } = await supabase
      .from('perfume_request_votes')
      .insert({
        request_id: requestId,
        ip_hash: ipHash,
      });

    if (voteError) {
      console.error(voteError);
      return NextResponse.json(
        { error: 'Unable to save vote.' },
        { status: 500 }
      );
    }

    const { data: row, error: rowError } = await supabase
      .from('perfume_requests')
      .select('upvotes_count')
      .eq('id', requestId)
      .single();

    if (rowError) {
      console.error(rowError);
      return NextResponse.json(
        { error: 'Unable to find request.' },
        { status: 404 }
      );
    }

    const nextCount = (row.upvotes_count || 0) + 1;

    const { error: updateError } = await supabase
      .from('perfume_requests')
      .update({ upvotes_count: nextCount })
      .eq('id', requestId);

    if (updateError) {
      console.error(updateError);
      return NextResponse.json(
        { error: 'Unable to update vote count.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, upvotes_count: nextCount });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: 'Unable to upvote right now.' },
      { status: 500 }
    );
  }
}
