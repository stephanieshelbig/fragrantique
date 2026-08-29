import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const BUCKET = "fragrance-images";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
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

function getBrowserHeaders(sourceUrl) {
  let referer = "https://www.google.com/";

  try {
    const url = new URL(sourceUrl);

    // Use the image host itself as the default referer.
    referer = `${url.protocol}//${url.host}/`;

    // Fragrantica/fimgs can be picky about server-side requests.
    if (
      url.hostname.includes("fimgs.net") ||
      url.hostname.includes("fragrantica.com")
    ) {
      referer = "https://www.fragrantica.com/";
    }
  } catch {
    // Keep fallback referer.
  }

  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
    Accept:
      "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: referer,
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  };
}

async function downloadImage(sourceUrl, imageNumber) {
  const cleanUrl = sourceUrl.trim();
  const headers = getBrowserHeaders(cleanUrl);

  // First attempt with browser-like headers.
  let response = await fetch(cleanUrl, {
    headers,
    redirect: "follow",
    cache: "no-store",
  });

  // Retry once with simpler headers.
  if (!response.ok) {
    response = await fetch(cleanUrl, {
      headers: {
        "User-Agent": headers["User-Agent"],
        Accept: headers.Accept,
        "Accept-Language": headers["Accept-Language"],
      },
      redirect: "follow",
      cache: "no-store",
    });
  }

  if (!response.ok) {
    throw new Error(
      `Image ${imageNumber} failed to download: ${response.status} ${
        response.statusText || ""
      }`.trim()
    );
  }

  const contentType =
    response.headers.get("content-type")?.split(";")[0]?.trim() ||
    "image/jpeg";

  if (!contentType.startsWith("image/")) {
    throw new Error(
      `Image ${imageNumber} is not an image. Content-Type: ${contentType}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();

  if (!arrayBuffer.byteLength) {
    throw new Error(`Image ${imageNumber} downloaded as an empty file`);
  }

  return {
    buffer: Buffer.from(arrayBuffer),
    contentType,
  };
}

async function mirrorOneImage({
  supabase,
  fragranceId,
  sourceUrl,
  imageNumber,
}) {
  if (!sourceUrl || typeof sourceUrl !== "string") {
    return null;
  }

  const cleanUrl = sourceUrl.trim();

  if (!cleanUrl.startsWith("http")) {
    return null;
  }

  const { buffer, contentType } = await downloadImage(
    cleanUrl,
    imageNumber
  );

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
    throw new Error(
      `Image ${imageNumber} upload failed: ${uploadError.message}`
    );
  }

  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function POST(request) {
  try {
    const { fragranceId } = await request.json();

    if (!fragranceId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing fragranceId",
        },
        {
          status: 400,
        }
      );
    }

    const supabase = getAdminClient();

    const { data: fragrance, error: fetchError } = await supabase
      .from("fragrances")
      .select(
        "id, image_url, image_url_2, image_url_3"
      )
      .eq("id", fragranceId)
      .single();

    if (fetchError || !fragrance) {
      return NextResponse.json(
        {
          ok: false,
          error:
            fetchError?.message ||
            "Fragrance not found",
        },
        {
          status: 404,
        }
      );
    }

    const updates = {};
    const warnings = [];

    const images = [
      {
        sourceUrl: fragrance.image_url,
        imageNumber: 1,
        savedColumn: "image_url_saved",
      },
      {
        sourceUrl: fragrance.image_url_2,
        imageNumber: 2,
        savedColumn: "image_url_2_saved",
      },
      {
        sourceUrl: fragrance.image_url_3,
        imageNumber: 3,
        savedColumn: "image_url_3_saved",
      },
    ];

    for (const image of images) {
      if (!image.sourceUrl) {
        continue;
      }

      try {
        const savedUrl = await mirrorOneImage({
          supabase,
          fragranceId,
          sourceUrl: image.sourceUrl,
          imageNumber: image.imageNumber,
        });

        if (savedUrl) {
          updates[image.savedColumn] = savedUrl;
        }
      } catch (error) {
        console.error(
          `Mirror failed for fragrance ${fragranceId}, image ${image.imageNumber}:`,
          error
        );

        warnings.push(
          error?.message ||
            `Image ${image.imageNumber} failed to save`
        );
      }
    }

    // Save any images that DID succeed, even if another image failed.
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("fragrances")
        .update(updates)
        .eq("id", fragranceId);

      if (updateError) {
        return NextResponse.json(
          {
            ok: false,
            error: updateError.message,
          },
          {
            status: 500,
          }
        );
      }
    }

    const sourceCount = images.filter(
      (image) => image.sourceUrl
    ).length;

    const savedCount = Object.keys(updates).length;

    // If every image failed, return an actual error.
    if (
      sourceCount > 0 &&
      savedCount === 0 &&
      warnings.length > 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: warnings.join(" | "),
          warnings,
          updates,
        },
        {
          status: 502,
        }
      );
    }

    // At least one image succeeded.
    return NextResponse.json({
      ok: true,
      updates,
      warnings,
    });
  } catch (error) {
    console.error(
      "mirror-fragrance-images error:",
      error
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}
