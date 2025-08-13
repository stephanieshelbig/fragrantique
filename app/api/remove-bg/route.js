// app/api/remove-bg/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Upload transparent PNG to a PUBLIC "sources" bucket and return its public URL
async function uploadToStorage(fragranceId, pngBuffer) {
  const path = `transparent/${fragranceId}-${Date.now()}.png`;
  const { error: upErr } = await supabase.storage
    .from('sources')
    .upload(path, pngBuffer, {
      contentType: 'image/png',
      cacheControl: '31536000',
      upsert: false,
    });
  if (upErr) throw new Error(`upload failed: ${upErr.message}`);

  const { data: pub } = supabase.storage.from('sources').getPublicUrl(path);
  if (!pub?.publicUrl) throw new Error('public URL not returned');
  return pub.publicUrl;
}

// Poll Replicate prediction
async function pollPrediction(id, token) {
  for (let i = 0; i < 60; i++) {
    const r = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    const j = await r.json();
    if (j.status === 'succeeded') return j;
    if (j.status === 'failed' || j.status === 'canceled') {
      throw new Error(j.error || 'prediction failed');
    }
    await new Promise((res) => setTimeout(res, 1500));
  }
  throw new Error('prediction timeout');
}

// Run background removal via Replicate rembg
async function removeBg_via_replicate(imageUrl) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return {
      ok: false,
      reason: 'replicate_no_token',
      detail: 'REPLICATE_API_TOKEN is not set',
    };
  }

  // Use a current rembg version; if Replicate updates it later, this may need refreshing.
  const version = 'cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003';

  const start = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version,
      input: { image: imageUrl },
    }),
  });

  if (!start.ok) {
    const text = await start.text().catch(() => '');
    return {
      ok: false,
      reason: 'replicate_start_error',
      status: start.status,
      detail: text || 'Replicate start failed',
    };
  }

  const started = await start.json();
  let pred;
  try {
    pred = await pollPrediction(started.id, token);
  } catch (e) {
    return {
      ok: false,
      reason: 'replicate_poll_error',
      detail: e.message || 'poll failed',
    };
  }

  const outUrl = Array.isArray(pred.output) ? pred.output[0] : pred.output;
  if (!outUrl || typeof outUrl !== 'string') {
    return { ok: false, reason: 'replicate_output_invalid' };
  }

  const resp = await fetch(outUrl);
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    return {
      ok: false,
      reason: 'replicate_fetch_output_failed',
      status: resp.status,
      detail: text || 'failed to fetch output',
    };
  }

  const buf = Buffer.from(await resp.arrayBuffer());
  return { ok: true, png: buf, engine: 'replicate', version };
}

export async function POST(req) {
  try {
    const { imageUrl, fragranceId } = await req.json();
    if (!imageUrl || !fragranceId) {
      return NextResponse.json(
        { success: false, error: 'imageUrl and fragranceId required' },
        { status: 400 }
      );
    }

    // Force Replicate only (no remove.bg so we avoid “insufficient credits”)
    const step = await removeBg_via_replicate(imageUrl);

    if (!step.ok) {
      // Pass through a detailed error so you can see exactly what’s wrong
      return NextResponse.json(
        {
          success: false,
          error: step.reason || 'replicate_failed',
          status: step.status || null,
          detail: step.detail || null,
        },
        { status: 400 }
      );
    }

    // Upload to storage and update DB
    const publicUrl = await uploadToStorage(fragranceId, step.png);
    const { error: updErr } = await supabase
      .from('fragrances')
      .update({ image_url_transparent: publicUrl })
      .eq('id', fragranceId);

    if (updErr) {
      return NextResponse.json(
        { success: false, error: `db update failed: ${updErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      publicUrl,
      engine: step.engine,
      modelVersion: step.version,
    });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || 'error' },
      { status: 500 }
    );
  }
}
