import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Upload helper: puts a PNG into Supabase Storage and returns its public URL
async function uploadToStorage(fragranceId, pngBuffer) {
  const path = `transparent/${fragranceId}-${Date.now()}.png`;
  const { error: upErr } = await supabase.storage
    .from('sources') // public bucket “sources” required
    .upload(path, pngBuffer, {
      contentType: 'image/png',
      cacheControl: '31536000',
      upsert: false,
    });
  if (upErr) throw new Error(`upload failed: ${upErr.message}`);

  const { data: pub } = supabase.storage.from('sources').getPublicUrl(path);
  return pub?.publicUrl;
}

async function removeBg_via_removebg(imageUrl) {
  const key = process.env.REMOVE_BG_API_KEY;
  if (!key) return { ok: false, reason: 'no_key' };

  const form = new URLSearchParams();
  form.set('image_url', imageUrl);
  form.set('size', 'auto');
  form.set('format', 'png');

  const res = await fetch('https://api.remove.bg/v1.0/removebg', {
    method: 'POST',
    headers: { 'X-Api-Key': key },
    body: form,
  });

  // Success → binary PNG
  if (res.ok) {
    const buf = Buffer.from(await res.arrayBuffer());
    return { ok: true, png: buf };
  }

  // Error → JSON
  let detail = '';
  try { detail = await res.text(); } catch {}
  const isCredits = detail.includes('insufficient_credits');
  return { ok: false, reason: isCredits ? 'insufficient_credits' : 'api_error', detail };
}

// Replicate polling helper
async function pollPrediction(id, token) {
  for (let i = 0; i < 60; i++) {
    const r = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    const j = await r.json();
    if (j.status === 'succeeded') return j;
    if (j.status === 'failed' || j.status === 'canceled') throw new Error(j.error || 'prediction failed');
    await new Promise(res => setTimeout(res, 1500));
  }
  throw new Error('prediction timeout');
}

async function removeBg_via_replicate(imageUrl) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return { ok: false, reason: 'no_replicate_token' };

  // Using replicate rembg model (version can change; this works with latest)
  const start = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      // Public rembg model
      // You can pin to a specific version; latest route uses 'model' + 'version' or 'owner/model:version'
      // This shorthand works for stable rembg runners:
      version: 'cjwbw/rembg:33c1b8da1c7b9cf9c0db0b9f8b7c6b0f9f3e962b1f7b8b9b2a0c1e3f1d2c4b5a', // example pinned; replace if Replicate updates
      input: { image: imageUrl }
    })
  });

  if (!start.ok) {
    const t = await start.text();
    return { ok: false, reason: 'replicate_start_error', detail: t };
  }

  const started = await start.json();
  const pred = await pollPrediction(started.id, token);

  // Output is usually a URL or an array of URLs; normalize to a single URL
  const out = Array.isArray(pred.output) ? pred.output[0] : pred.output;
  if (!out || typeof out !== 'string') {
    return { ok: false, reason: 'replicate_output_invalid' };
  }

  // Fetch the PNG data
  const resp = await fetch(out);
  if (!resp.ok) return { ok: false, reason: 'replicate_fetch_output_failed' };
  const buf = Buffer.from(await resp.arrayBuffer());
  return { ok: true, png: buf };
}

export async function POST(req) {
  try {
    const { imageUrl, fragranceId } = await req.json();
    if (!imageUrl || !fragranceId) {
      return NextResponse.json({ success: false, error: 'imageUrl and fragranceId required' }, { status: 400 });
    }

    // 1) Try remove.bg first
    let step = await removeBg_via_removebg(imageUrl);

    // 2) If credits exhausted (or key missing), fall back to Replicate
    if (!step.ok && (step.reason === 'insufficient_credits' || step.reason === 'no_key')) {
      step = await removeBg_via_replicate(imageUrl);
    }

    if (!step.ok) {
      return NextResponse.json({ success: false, error: step.reason || 'remove failed', detail: step.detail || null }, { status: 400 });
    }

    // 3) Upload PNG to Supabase Storage and update the fragrance
    const publicUrl = await uploadToStorage(fragranceId, step.png);
    await supabase
      .from('fragrances')
      .update({ image_url_transparent: publicUrl })
      .eq('id', fragranceId);

    return NextResponse.json({ success: true, publicUrl });
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message || 'error' }, { status: 500 });
  }
}
