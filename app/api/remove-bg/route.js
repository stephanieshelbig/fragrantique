
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { imageUrl, fragranceId, userId } = await req.json();
    if (!imageUrl || !fragranceId || !userId) {
      return NextResponse.json({ error: 'Missing imageUrl, fragranceId, or userId' }, { status: 400 });
    }

    const src = await fetch(imageUrl);
    if (!src.ok) throw new Error('Failed to fetch source image');
    const srcBuffer = Buffer.from(await src.arrayBuffer());

    const form = new FormData();
    form.append('image_file', new Blob([srcBuffer], { type: 'image/jpeg' }), 'source.jpg');
    form.append('size', 'auto');

    const rb = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': process.env.REMOVE_BG_API_KEY },
      body: form
    });

    if (!rb.ok) {
      const t = await rb.text();
      throw new Error(`remove.bg failed: ${t}`);
    }

    const cutout = Buffer.from(await rb.arrayBuffer());

    const ts = Date.now();
const path = `${userId}/${fragranceId}-${ts}.png`;
    const { error: upErr } = await supabaseAdmin.storage
      .from('bottles')
      .upload(path, cutout, {
        contentType: 'image/png',
        upsert: true
      });
    if (upErr) throw upErr;

    const { data: pub } = supabaseAdmin.storage.from('bottles').getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    const { error: updErr } = await supabaseAdmin
      .from('fragrances')
      .update({ image_url_transparent: publicUrl })
      .eq('id', fragranceId);
    if (updErr) throw updErr;

    return NextResponse.json({ ok: true, url: publicUrl });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
