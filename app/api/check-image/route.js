import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ ok: false, error: 'Missing url' }, { status: 400 });
    }
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) {
      return NextResponse.json({ ok: false, error: 'Only http/https allowed' }, { status: 400 });
    }

    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 10000);

    // try HEAD first
    let res;
    try {
      res = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'FragrantiqueBot/1.0 (+https://fragrantique.net)',
          'Accept': '*/*',
        },
      });
    } catch {
      // fallback to GET if HEAD blocked
    }

    if (!res || (!res.ok && res.status >= 400)) {
      // GET fallback with small size (we do not read body; just headers)
      try {
        res = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          signal: controller.signal,
          headers: {
            'User-Agent': 'FragrantiqueBot/1.0 (+https://fragrantique.net)',
            'Accept': 'image/*,*/*;q=0.8',
          },
        });
      } catch (e) {
        clearTimeout(to);
        return NextResponse.json({ ok: false, error: e.message || 'fetch failed' }, { status: 400 });
      }
    }

    clearTimeout(to);

    const ct = res.headers.get('content-type') || '';
    const len = res.headers.get('content-length') || null;

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      contentType: ct,
      contentLength: len,
      finalUrl: res.url,
      isImage: /^image\//i.test(ct),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message || 'error' }, { status: 500 });
  }
}
