import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const BUCKET = "fragrance-images";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function extensionFromContentType(contentType) {
  if (!contentType) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  return "jpg";
}

async function mirrorOneImage({ supabase, fragranceId, sourceUrl, imageNumber }) {
  if (!sourceUrl || typeof sourceUrl !== "string") return null;

  const cleanUrl = sourceUrl.trim();
  if (!cleanUrl.startsWith("http")) return null;

  const response = await fetch(cleanUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 Fragrantique Image Mirror",
    },
  });

  if (!response.ok) {
    throw new Error(`Image ${imageNumber} failed to download: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/jpeg";

  if (!contentType.startsWith("image/")) {
    throw new Error(`Image ${imageNumber} is not an image. Content-Type: ${contentType}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ext = extensionFromContentType(contentType);

  const path = `fragrances/${fragranceId}/image-${imageNumber}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType,
      upsert: true,
      cacheControl: "31536000",
    });

  if (uploadError) {
    throw new Error(`Image ${imageNumber} upload failed: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return data.publicUrl;
}

export async function POST(request) {
  try {
    const { fragranceId } = await request.json();

    if (!fragranceId) {
      return NextResponse.json(
        { ok: false, error: "Missing fragranceId" },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    const { data: fragrance, error: fetchError } = await supabase
      .from("fragrances")
      .select("id, image_url, image_url_2, image_url_3")
      .eq("id", fragranceId)
      .single();

    if (fetchError || !fragrance) {
      return NextResponse.json(
        { ok: false, error: fetchError?.message || "Fragrance not found" },
        { status: 404 }
      );
    }

    const updates = {};

    const saved1 = await mirrorOneImage({
      supabase,
      fragranceId,
      sourceUrl: fragrance.image_url,
      imageNumber: 1,
    });

    const saved2 = await mirrorOneImage({
      supabase,
      fragranceId,
      sourceUrl: fragrance.image_url_2,
      imageNumber: 2,
    });

    const saved3 = await mirrorOneImage({
      supabase,
      fragranceId,
      sourceUrl: fragrance.image_url_3,
      imageNumber: 3,
    });

    if (saved1) updates.image_url_saved = saved1;
    if (saved2) updates.image_url_2_saved = saved2;
    if (saved3) updates.image_url_3_saved = saved3;

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("fragrances")
        .update(updates)
        .eq("id", fragranceId);

      if (updateError) {
        return NextResponse.json(
          { ok: false, error: updateError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      updates,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
