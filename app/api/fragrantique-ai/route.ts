import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type FragranceRow = {
  id: string | number;
  brand: string | null;
  name: string | null;
  accords: any | null;
  image_url: string | null;
};

function safeTrim(s: any) {
  return typeof s === "string" ? s.trim() : "";
}

function normalizeList(list: any): string[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((x) => safeTrim(x))
    .filter(Boolean)
    .slice(0, 25);
}

function summarizeAccords(accords: any): string {
  if (!accords) return "";
  if (Array.isArray(accords)) {
    return accords
      .map((a) => (typeof a?.name === "string" ? a.name.trim() : ""))
      .filter(Boolean)
      .slice(0, 8)
      .join(", ");
  }
  return "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const likes = normalizeList(body?.likes);
    const dislikes = normalizeList(body?.dislikes);
    const limit = Math.max(1, Math.min(20, Number(body?.limit || 12)));

    if (likes.length === 0 && dislikes.length === 0) {
      return NextResponse.json({ error: "Please provide likes or dislikes." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        {
          error:
            "Missing Supabase server credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables.",
        },
        { status: 500 }
      );
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return NextResponse.json(
        {
          error:
            "Missing OPENAI_API_KEY. Add it in Vercel Environment Variables (or .env.local) to enable Fragrantique AI.",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Pull a reasonable pool. If you have thousands of fragrances, we keep it capped for token safety.
    const { data, error } = await supabase
      .from("fragrances")
      .select("id, brand, name, accords, image_url")
      .order("created_at", { ascending: false })
      .limit(600);

    if (error) {
      return NextResponse.json({ error: `Supabase error: ${error.message}` }, { status: 500 });
    }

    const fragrances: FragranceRow[] = Array.isArray(data) ? (data as any) : [];
    if (fragrances.length === 0) {
      return NextResponse.json({ error: "No fragrances found in your database." }, { status: 404 });
    }

    // Create a compact catalog for the model
    const catalog = fragrances.map((f) => {
      const brand = safeTrim(f.brand) || "Unknown brand";
      const name = safeTrim(f.name) || "Unknown name";
      const accords = summarizeAccords(f.accords);
      return {
        id: f.id,
        brand,
        name,
        accords,
      };
    });

    // We ask for IDs so we can map back to your DB rows.
    const system = `You are Fragrantique AI, a fragrance expert.
You must recommend ONLY from the provided catalog. Return JSON only.`;

    const user = {
      likes,
      dislikes,
      request: `Pick ${limit} fragrances from the catalog that best match the user's likes and avoid their dislikes.
Consider style, notes/accords, and overall vibe. Return a JSON object:
{
  "recommendations": [
    { "id": <id from catalog>, "reason": "short reason (1 sentence)" }
  ]
}
Rules:
- Use only IDs that exist in the catalog.
- Do not recommend duplicates.
- Keep reasons short and helpful.`,
      catalog,
    };

    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(user) },
        ],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text().catch(() => "");
      return NextResponse.json(
        { error: `OpenAI error: ${aiRes.status} ${aiRes.statusText}${t ? ` — ${t}` : ""}` },
        { status: 500 }
      );
    }

    const aiJson = await aiRes.json();
    const content = aiJson?.choices?.[0]?.message?.content;

    let parsed: any = null;
    try {
      parsed = typeof content === "string" ? JSON.parse(content) : content;
    } catch {
      parsed = null;
    }

    const recsRaw: any[] = Array.isArray(parsed?.recommendations) ? parsed.recommendations : [];
    const byId = new Map<string, FragranceRow>();
    for (const f of fragrances) byId.set(String(f.id), f);

    // Build final results in the same order AI returned
    const final = [];
    const used = new Set<string>();

    for (const r of recsRaw) {
      const id = String(r?.id ?? "");
      if (!id || used.has(id)) continue;
      const f = byId.get(id);
      if (!f) continue;

      used.add(id);
      final.push({
        id: f.id,
        brand: f.brand,
        name: f.name,
        image_url: f.image_url,
        accords: f.accords,
        reason: typeof r?.reason === "string" ? r.reason : null,
      });

      if (final.length >= limit) break;
    }

    return NextResponse.json({ recommendations: final });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected server error." }, { status: 500 });
  }
}
