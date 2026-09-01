// app/api/remove-bg/route.js

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---------------------------------------------------------
// Supabase upload
// ---------------------------------------------------------
async function uploadToStorage(fragranceId, pngBuffer) {
  const path = `transparent/${fragranceId}-${Date.now()}.png`;

  const { error: upErr } = await supabase.storage
    .from("sources")
    .upload(path, pngBuffer, {
      contentType: "image/png",
      cacheControl: "31536000",
      upsert: false,
    });

  if (upErr) {
    throw new Error(`upload failed: ${upErr.message}`);
  }

  const { data: pub } = supabase.storage
    .from("sources")
    .getPublicUrl(path);

  if (!pub?.publicUrl) {
    throw new Error("public URL not returned");
  }

  return pub.publicUrl;
}

// ---------------------------------------------------------
// Download the original fragrance image ourselves
//
// This prevents Replicate from needing to directly access
// fimgs.net / Fragrantica CDN URLs that may return 403.
// ---------------------------------------------------------
async function imageUrlToDataUri(imageUrl) {
  if (!imageUrl) {
    throw new Error("image URL is missing");
  }

  let response;

  try {
    response = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",

        Accept:
          "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",

        "Accept-Language": "en-US,en;q=0.9",

        Referer: "https://www.fragrantica.com/",
      },

      redirect: "follow",
      cache: "no-store",
    });
  } catch (error) {
    throw new Error(
      `source image request failed: ${error?.message || error}`
    );
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");

    throw new Error(
      `source image download failed: ${response.status} ${
        response.statusText || ""
      }${text ? ` - ${text.slice(0, 200)}` : ""}`
    );
  }

  const contentTypeHeader =
    response.headers.get("content-type") || "image/jpeg";

  // Strip anything like "; charset=utf-8"
  const contentType = contentTypeHeader.split(";")[0].trim();

  if (!contentType.startsWith("image/")) {
    throw new Error(
      `source URL did not return an image. Content-Type: ${contentType}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();

  if (!arrayBuffer.byteLength) {
    throw new Error("source image was empty");
  }

  const buffer = Buffer.from(arrayBuffer);

  const base64 = buffer.toString("base64");

  return `data:${contentType};base64,${base64}`;
}

// ---------------------------------------------------------
// Replicate helpers
// ---------------------------------------------------------
async function getLatestRembgVersion(token) {
  const response = await fetch(
    "https://api.replicate.com/v1/models/cjwbw/rembg",
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");

    throw new Error(
      `version_lookup_failed:${response.status}:${text}`
    );
  }

  const json = await response.json();

  const versionId = json?.latest_version?.id;

  if (!versionId) {
    throw new Error("version_missing_in_response");
  }

  return versionId;
}

// ---------------------------------------------------------
// Poll Replicate prediction
// ---------------------------------------------------------
async function pollPrediction(id, token) {
  for (let i = 0; i < 60; i++) {
    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => "");

      throw new Error(
        `prediction_poll_http_error:${response.status}:${text}`
      );
    }

    const json = await response.json();

    if (json.status === "succeeded") {
      return json;
    }

    if (
      json.status === "failed" ||
      json.status === "canceled"
    ) {
      throw new Error(
        typeof json.error === "string"
          ? json.error
          : JSON.stringify(json.error || "prediction failed")
      );
    }

    await new Promise((resolve) =>
      setTimeout(resolve, 1500)
    );
  }

  throw new Error("prediction_timeout");
}

// ---------------------------------------------------------
// Remove background with Replicate
// ---------------------------------------------------------
async function removeBgViaReplicate(imageUrl) {
  const token = process.env.REPLICATE_API_TOKEN;

  if (!token) {
    return {
      ok: false,
      reason: "replicate_no_token",
      detail: "REPLICATE_API_TOKEN is not set",
    };
  }

  // -------------------------------------------------------
  // First download the image ourselves.
  // Then convert it into a data URI.
  // -------------------------------------------------------
  let imageDataUri;

  try {
    imageDataUri = await imageUrlToDataUri(imageUrl);
  } catch (error) {
    return {
      ok: false,
      reason: "source_image_download_failed",
      detail: error?.message || String(error),
    };
  }

  // -------------------------------------------------------
  // Get current rembg version
  // -------------------------------------------------------
  let versionId;

  try {
    versionId = await getLatestRembgVersion(token);
  } catch (error) {
    return {
      ok: false,
      reason: "replicate_version_lookup_failed",
      detail: error?.message || String(error),
    };
  }

  // -------------------------------------------------------
  // Start Replicate prediction
  // -------------------------------------------------------
  const start = await fetch(
    "https://api.replicate.com/v1/predictions",
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        version: versionId,

        input: {
          image: imageDataUri,
        },
      }),
    }
  );

  if (!start.ok) {
    const text = await start.text().catch(() => "");

    return {
      ok: false,
      reason: "replicate_start_error",
      status: start.status,
      detail: text || "start failed",
    };
  }

  const started = await start.json();

  if (!started?.id) {
    return {
      ok: false,
      reason: "replicate_prediction_id_missing",
      detail: JSON.stringify(started),
    };
  }

  // -------------------------------------------------------
  // Wait for prediction
  // -------------------------------------------------------
  let prediction;

  try {
    prediction = await pollPrediction(
      started.id,
      token
    );
  } catch (error) {
    return {
      ok: false,
      reason: "replicate_poll_error",
      detail: error?.message || "poll failed",
    };
  }

  // -------------------------------------------------------
  // Get output URL
  // -------------------------------------------------------
  let outUrl = prediction?.output;

  if (Array.isArray(outUrl)) {
    outUrl = outUrl[0];
  }

  if (
    !outUrl ||
    typeof outUrl !== "string"
  ) {
    return {
      ok: false,
      reason: "replicate_output_invalid",
      detail: JSON.stringify(prediction?.output),
    };
  }

  // -------------------------------------------------------
  // Download transparent PNG from Replicate
  // -------------------------------------------------------
  const response = await fetch(outUrl, {
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");

    return {
      ok: false,
      reason: "replicate_fetch_output_failed",
      status: response.status,
      detail: text || "fetch output failed",
    };
  }

  const buffer = Buffer.from(
    await response.arrayBuffer()
  );

  if (!buffer.length) {
    return {
      ok: false,
      reason: "replicate_output_empty",
    };
  }

  return {
    ok: true,
    png: buffer,
    engine: "replicate",
    version: versionId,
  };
}

// ---------------------------------------------------------
// API Route
// ---------------------------------------------------------
export async function POST(req) {
  try {
    const body = await req.json();

    const imageUrl = body?.imageUrl;
    const fragranceId = body?.fragranceId;

    if (!fragranceId) {
      return NextResponse.json(
        {
          success: false,
          error: "fragranceId required",
        },
        {
          status: 400,
        }
      );
    }

    // -----------------------------------------------------
    // Load fragrance
    // -----------------------------------------------------
    const {
      data: frag,
      error: fragranceError,
    } = await supabase
      .from("fragrances")
      .select(
        "id, image_url, image_url_transparent"
      )
      .eq("id", fragranceId)
      .single();

    if (fragranceError || !frag) {
      return NextResponse.json(
        {
          success: false,
          error: "fragrance not found",
          detail:
            fragranceError?.message || null,
        },
        {
          status: 404,
        }
      );
    }

    // -----------------------------------------------------
    // Don't charge Replicate again if already processed
    // -----------------------------------------------------
    if (frag.image_url_transparent) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "already_transparent",
        publicUrl:
          frag.image_url_transparent,
      });
    }

    // Prefer the URL supplied by the admin page.
    // Fall back to fragrances.image_url.
    const src =
      imageUrl ||
      frag.image_url;

    if (!src) {
      return NextResponse.json(
        {
          success: false,
          error:
            "no image_url set for this fragrance",
        },
        {
          status: 400,
        }
      );
    }

    console.log(
      "Removing background:",
      fragranceId,
      src
    );

    // -----------------------------------------------------
    // Run Replicate
    // -----------------------------------------------------
    const result =
      await removeBgViaReplicate(src);

    if (!result.ok) {
      console.error(
        "Background removal failed:",
        result
      );

      return NextResponse.json(
        {
          success: false,
          error:
            result.reason ||
            "replicate_failed",
          status:
            result.status || null,
          detail:
            result.detail || null,
        },
        {
          status: 400,
        }
      );
    }

    // -----------------------------------------------------
    // Upload final PNG to Supabase
    // -----------------------------------------------------
    const publicUrl =
      await uploadToStorage(
        fragranceId,
        result.png
      );

    // -----------------------------------------------------
    // Save transparent image URL
    // -----------------------------------------------------
    const { error: updateError } =
      await supabase
        .from("fragrances")
        .update({
          image_url_transparent:
            publicUrl,
        })
        .eq("id", fragranceId);

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          error: `db update failed: ${updateError.message}`,
        },
        {
          status: 500,
        }
      );
    }

    // -----------------------------------------------------
    // Success
    // -----------------------------------------------------
    return NextResponse.json({
      success: true,
      publicUrl,
      engine: result.engine,
      modelVersion: result.version,
    });
  } catch (error) {
    console.error(
      "remove-bg route error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error?.message || "error",
      },
      {
        status: 500,
      }
    );
  }
}
