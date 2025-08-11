import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { imageUrl, fragranceId, userId } = await req.json();

    if (!imageUrl || !fragranceId || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: imageUrl, fragranceId, userId' },
        { status: 400 }
      );
    }

    // Fetch the original file
    const src = await fetch(imageUrl, { redirect: 'follow' });
    if (!src.ok) {
      return NextResponse.json(
        { error: `Failed to fetch source image. HTTP ${src.status}` },
        { status: 400 }
      );
    }

    const contentType = src.headers.get('content-type') || '';
    if (!/image\/(jpeg|jpg|png|webp)/i.test(contentType)) {
      return NextResponse.json(
        { error: `Source URL is not an image. Got content-type: ${contentType}` },
        { status: 400 }
      );
    }

    // Get the raw buffer of the original image
    const buffer = Buffer.from(await src.arrayBuffer());

    // Call Remove.bg API
    const removeBgRes = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': process.env.REMOVE_BG_API_KEY,
      },
      body: (() => {
        const formData = new FormData();
        formData.append('image_file', new Blob([buffer]), 'image.jpg');
        formData.append('size', 'auto');
        return formData;
      })(),
    });

    if (!removeBgRes.ok) {
      const errText = await removeBgRes.text();
      return NextResponse.json(
        { error: `remove.bg failed: ${errText}` },
        { status: 400 }
      );
    }

    const outBuffer = Buffer.from(await removeBgRes.arrayBuffer());

    // Save the transparent PNG to Supabase Storage with a unique filename
    const ts = Date.now();
    const path = `${userId}/${fragranceId}-${ts}.png`;
    const { error: uploadError } = await supabase.storage
      .from('bottles')
      .upload(path, outBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Supabase upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Build public URL
    const { data: publicUrlData } = supabase.storage
      .from('bottles')
      .getPublicUrl(path);

    const publicUrl = publicUrlData.publicUrl;

    // Update the fragrance record
    const { error: updateError } = await supabase
      .from('fragrances')
      .update({ image_url_transparent: publicUrl })
      .eq('id', fragranceId);

    if (updateError) {
      return NextResponse.json(
        { error: `Database update failed: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, publicUrl });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}
