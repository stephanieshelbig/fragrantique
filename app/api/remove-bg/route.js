// app/api/remove-bg/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---------- Helpers ----------
async function uploadToStorage(fragranceId, pngBuffer) {
  // Upload transparent PNG to a PUBLIC bucket named "sources"
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

async function pollPrediction(id, token) {
  // Poll Replicate prediction until it finishes (or times out)
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

// ---------- Engines ----------
async function removeBg_via_replicate(imageUrl) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return { ok: false, reason: 'no_replicate_token' };

  // Start prediction with a current rembg version hash
  // (If Replicate updates, replace with their latest version hash)
  const start = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // rembg model
      version:
        'cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003',
      input: { image: imageUrl },
    }),
  });

  if (!start.ok) {
    const t = await start.text().catch(() => '');
    return { ok: false, reason: 'replicate_start_error', detail: t };
  }

  const started = await start.json();
  const pred = await pollPrediction(started.id, token);

  // Output is usually a URL (or first element of an array)
  const outUrl = Array.isArray(pred.output) ? pred.output[0] : pred.output;
  if (!outUrl || typeof outUrl !== 'string') {
    return { ok: false, reason: 'replicate_output_invalid' };
  }

  // Fetch PNG bytes
  const resp = await fetch(outUrl);
  if (!resp.ok) return { ok: false, reason: 'replicate_fetch_output_failed' };
  const buf = Buffer.from(await resp.arrayBuffer());
  return { ok: true, png: buf };
}

async function removeBg_via_removebg(imageUrl) {
  const key = process.env.REMOVE_BG_API_KEY;
  if (!key) return { ok: false, reason: 'no_removebg_key' };

  const form = new URLSearchParams();
  form.set('image_url', imageUrl);
  form.set('size', 'auto');
  form.set('format', 'png');

  const res = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': key },
    body: form,
  });

  if (res.ok) {
    const buf = Buffer.from(await res.arrayBuffer());
    return { ok: true, png: buf };
  }

  // Error (JSON or text)
  const text = await res.text().catch(() => '');
  const isCredits =
    text.includes('insufficient_credits') || text.includes('Insufficient credits');
  return {
    ok: false,
    reason: isCredits ? 'insufficient_credits' : 'removebg_api_error',
    detail: text,
  };
}

// ---------- Route ----------
export async function POST(req) {
  try {
    const { imageUrl, fragranceId } = await req.json();
    if (!imageUrl || !fragranceId) {
      return NextResponse.json(
        { success: false, error: 'imageUrl and fragranceId required' },
        { status: 400 }
      );
    }

    // Prefer Replicate first (free/cheaper), then remove.bg as a backup
    let step = await removeBg_via_replicate(imageUrl);

    if (!step.ok) {
      // If Replicate failed (no token, start error, etc.), try remove.bg
      step = await removeBg_via_removebg(imageUrl);
    }

    if (!step.ok) {
      return NextResponse.json(
        { success: false, error: step.reason || 'remove failed', detail: step.detail || null },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage and update DB
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

    return NextResponse.json({ success: true, publicUrl });
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e.message || 'error' },
      { status: 500 }
    );
  }
}
