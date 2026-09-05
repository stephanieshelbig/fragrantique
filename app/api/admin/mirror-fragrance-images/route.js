import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BUCKET = "fragrance-images";

/* =========================================================
   SUPABASE ADMIN CLIENT
========================================================= */

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

/* =========================================================
   HELPERS
========================================================= */

function extensionFromContentType(contentType) {
  if (!contentType) return "jpg";

  const type = contentType.toLowerCase();

  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  if (type.includes("avif")) return "avif";
  if (type.includes("jpeg")) return "jpg";
  if (type.includes("jpg")) return "jpg";

  return "jpg";
}

function getReferer(sourceUrl) {
  try {
    const url = new URL(sourceUrl);

    if (
      url.hostname.includes("fimgs.net") ||
      url.hostname.includes("fragrantica.com")
    ) {
      return "https://www.fragrantica.com/";
    }

    return `${url.protocol}//${url.hostname}/`;
  } catch {
    return "https://www.google.com/";
  }
}

function getBrowserHeaders(sourceUrl) {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/152.0.0.0 Safari/537.36",

    Accept:
      "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",

    "Accept-Language": "en-US,en;q=0.9",

    Referer: getReferer(sourceUrl),

    "Sec-Fetch-Dest": "image",
    "Sec-Fetch-Mode": "no-cors",
    "Sec-Fetch-Site": "cross-site",

    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  };
}

/* =========================================================
   FETCH ONE URL
========================================================= */

async function fetchImageAttempt(url, headers = {}) {
  return fetch(url, {
    method: "GET",
    headers,
    redirect: "follow",
    cache: "no-store",
  });
}

/* =========================================================
   DOWNLOAD IMAGE

   We make several attempts because Fragrantica/fimgs and
   some other hosts occasionally reject server-side requests.
========================================================= */

async function downloadImage(sourceUrl, imageNumber) {
  if (!sourceUrl || typeof sourceUrl !== "string") {
    throw new Error(`Image ${imageNumber}: missing source URL`);
  }

  const cleanUrl = sourceUrl.trim();

  if (!/^https?:\/\//i.test(cleanUrl)) {
    throw new Error(
      `Image ${imageNumber}: invalid source URL: ${cleanUrl}`
    );
  }

  const browserHeaders = getBrowserHeaders(cleanUrl);

  const attempts = [
    {
      name: "browser headers",
      headers: browserHeaders,
    },

    {
      name: "fragrance referer",
      headers: {
        "User-Agent": browserHeaders["User-Agent"],
        Accept: browserHeaders.Accept,
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://www.fragrantica.com/",
      },
    },

    {
      name: "simple request",
      headers: {
        "User-Agent": browserHeaders["User-Agent"],
        Accept: "*/*",
      },
    },

    {
      name: "minimal request",
      headers: {},
    },
  ];

  let lastStatus = null;
  let lastStatusText = "";
  let lastContentType = "";

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];

    try {
      const response = await fetchImageAttempt(
        cleanUrl,
        attempt.headers
      );

      lastStatus = response.status;
      lastStatusText = response.statusText || "";
      lastContentType =
        response.headers.get("content-type") || "";

      console.log(
        `[mirror] Image ${imageNumber}, attempt ${i + 1} (${attempt.name}):`,
        response.status,
        lastContentType
      );

      if (!response.ok) {
        continue;
      }

      const contentType =
        response.headers
          .get("content-type")
          ?.split(";")[0]
          ?.trim()
          ?.toLowerCase() || "image/jpeg";

      /*
       Some image servers omit the correct content-type.
       If it says text/html, though, we almost certainly got
       an anti-bot/error page instead of an image.
      */
      if (
        contentType.includes("text/html") ||
        contentType.includes("application/json")
      ) {
        console.warn(
          `[mirror] Image ${imageNumber} returned ${contentType} instead of an image`
        );

        continue;
      }

      const arrayBuffer = await response.arrayBuffer();

      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        console.warn(
          `[mirror] Image ${imageNumber} returned an empty file`
        );

        continue;
      }

      /*
       Prevent obviously tiny HTML/error responses from
       accidentally being saved as fragrance images.
      */
      if (arrayBuffer.byteLength < 100) {
        console.warn(
          `[mirror] Image ${imageNumber} response was suspiciously small: ${arrayBuffer.byteLength} bytes`
        );

        continue;
      }

      let finalContentType = contentType;

      /*
       Some servers return application/octet-stream even
       though the response is actually an image.
      */
      if (
        !finalContentType.startsWith("image/") &&
        finalContentType !== "application/octet-stream"
      ) {
        console.warn(
          `[mirror] Image ${imageNumber} unsupported content type: ${finalContentType}`
        );

        continue;
      }

      if (finalContentType === "application/octet-stream") {
        finalContentType = "image/jpeg";
      }

      return {
        buffer: Buffer.from(arrayBuffer),
        contentType: finalContentType,
      };
    } catch (error) {
      console.warn(
        `[mirror] Image ${imageNumber}, attempt ${i + 1} failed:`,
        error?.message || error
      );
    }
  }

  let explanation = "";

  if (lastStatus === 403) {
    explanation =
      " The source website is blocking server-side image downloads (403 Forbidden).";
  } else if (lastStatus === 429) {
    explanation =
      " The source website is rate-limiting image downloads (429 Too Many Requests).";
  } else if (lastStatus === 404) {
    explanation =
      " The source image no longer exists at that URL.";
  }

  throw new Error(
    `Image ${imageNumber} failed to download` +
      (lastStatus
        ? `: ${lastStatus} ${lastStatusText}`.trim()
        : "") +
      explanation +
      ` URL: ${cleanUrl}`
  );
}

/* =========================================================
   SAVE ONE IMAGE TO SUPABASE
========================================================= */

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

  const path =
    `fragrances/${fragranceId}/` +
    `image-${imageNumber}.${ext}`;

  console.log(
    `[mirror] Uploading image ${imageNumber} to ${path}`
  );

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

  if (!data?.publicUrl) {
    throw new Error(
      `Image ${imageNumber} uploaded but public URL could not be created`
    );
  }

  return data.publicUrl;
}

/* =========================================================
   API ROUTE
========================================================= */

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    const fragranceId = body?.fragranceId;

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

    /* -----------------------------------------------------
       GET FRAGRANCE
    ----------------------------------------------------- */

    const {
      data: fragrance,
      error: fetchError,
    } = await supabase
      .from("fragrances")
      .select(
        [
          "id",
          "brand",
          "name",
          "image_url",
          "image_url_2",
          "image_url_3",
          "image_url_saved",
          "image_url_2_saved",
          "image_url_3_saved",
        ].join(",")
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

    console.log(
      `[mirror] Saving images for ${fragrance.brand || ""} — ${
        fragrance.name || ""
      } (${fragranceId})`
    );

    /* -----------------------------------------------------
       BUILD IMAGE LIST
    ----------------------------------------------------- */

    const images = [
      {
        sourceUrl: fragrance.image_url,
        existingSavedUrl: fragrance.image_url_saved,
        imageNumber: 1,
        savedColumn: "image_url_saved",
      },

      {
        sourceUrl: fragrance.image_url_2,
        existingSavedUrl: fragrance.image_url_2_saved,
        imageNumber: 2,
        savedColumn: "image_url_2_saved",
      },

      {
        sourceUrl: fragrance.image_url_3,
        existingSavedUrl: fragrance.image_url_3_saved,
        imageNumber: 3,
        savedColumn: "image_url_3_saved",
      },
    ];

    const updates = {};
    const warnings = [];
    const results = [];

    /* -----------------------------------------------------
       SAVE EACH IMAGE
    ----------------------------------------------------- */

    for (const image of images) {
      if (!image.sourceUrl) {
        results.push({
          imageNumber: image.imageNumber,
          status: "no-source",
        });

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

          results.push({
            imageNumber: image.imageNumber,
            status: "saved",
            url: savedUrl,
          });
        }
      } catch (error) {
        const message =
          error?.message ||
          `Image ${image.imageNumber} failed to save`;

        console.error(
          `[mirror] Fragrance ${fragranceId}, image ${image.imageNumber}:`,
          error
        );

        warnings.push(message);

        results.push({
          imageNumber: image.imageNumber,
          status: "failed",
          error: message,
        });
      }
    }

    /* -----------------------------------------------------
       UPDATE DATABASE WITH EVERYTHING THAT SUCCEEDED
    ----------------------------------------------------- */

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("fragrances")
        .update(updates)
        .eq("id", fragranceId);

      if (updateError) {
        return NextResponse.json(
          {
            ok: false,
            error:
              `Images uploaded, but database update failed: ` +
              updateError.message,
            updates,
            warnings,
            results,
          },
          {
            status: 500,
          }
        );
      }
    }

    const sourceCount = images.filter(
      (image) => !!image.sourceUrl
    ).length;

    const savedCount = Object.keys(updates).length;

    /* -----------------------------------------------------
       NO SOURCE IMAGES
    ----------------------------------------------------- */

    if (sourceCount === 0) {
      return NextResponse.json({
        ok: true,
        updates: {},
        warnings: [],
        results,
        message: "No source image URLs were found.",
      });
    }

    /* -----------------------------------------------------
       EVERYTHING FAILED
    ----------------------------------------------------- */

    if (savedCount === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            warnings.length > 0
              ? warnings.join(" | ")
              : "No images could be saved.",
          warnings,
          updates,
          results,
        },
        {
          status: 502,
        }
      );
    }

    /* -----------------------------------------------------
       SUCCESS / PARTIAL SUCCESS
    ----------------------------------------------------- */

    return NextResponse.json({
      ok: true,
      updates,
      warnings,
      results,
      message:
        warnings.length > 0
          ? `${savedCount} image(s) saved. ${warnings.length} image(s) failed.`
          : `${savedCount} image(s) saved successfully.`,
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
          "Unknown mirror-fragrance-images error",
      },
      {
        status: 500,
      }
    );
  }
}
