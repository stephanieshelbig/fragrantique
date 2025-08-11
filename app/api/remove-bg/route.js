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

    // 1) Download source image bytes
    const src = await fetch(imageUrl);
    if (!src.ok) throw new Error('Failed to fetch source image');
    const srcBuffer = Buffer.from(await src.arrayBuffer());

    // 2) Call remove.bg (returns PNG with alpha)
    const rb = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': process.env.REMOVE_BG_API_KEY },
      body: (() => {
        const form = new FormData();
        form.append('image_file', new Blob([srcBuffer]), 'source.jpg');
        form.append('size', 'auto');
        return form;
      })(),
    });

    if (!rb.ok) {
      const t = await rb.text();
      throw new Error(`remove.bg failed: ${t}`);
    }

    const cutout = Buffer.from(await rb.arrayBuffer());

    // 3) Upload PNG to Supabase Storage
    const path = `${userId}/${fragranceId}.png`;
    const { error: upErr } = await supabaseAdmin.storage
      .from('bottles')
      .upload(path, cutout, {
        contentType: 'image/png',
        upsert: true,
      });
    if (upErr) throw upErr;

    // 4) Get public URL
    const { data: pub } = supabaseAdmin.storage.from('bottles').getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    // 5) Save to DB
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
