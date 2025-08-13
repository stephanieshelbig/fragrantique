'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

function clsx(...xs){return xs.filter(Boolean).join(' ')}

export default function ImageFixer() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [filter, setFilter] = useState('missing_any'); // missing_any | missing_src | missing_transparent | all
  const [status, setStatus] = useState('');
  const [userId, setUserId] = useState(null); // needed for remove-bg
  const fileInputs = useRef({}); // map fragranceId -> input ref

  useEffect(() => {
    (async () => {
      setLoading(true);
      // get admin (stephanie) user id for remove-bg
      const { data: prof } = await supabase.from('profiles').select('id').eq('username','stephanie').single();
      if (prof?.id) setUserId(prof.id);

      // pull ALL relevant fragrances (limit to a sane number first, adjust if needed)
      const { data, error } = await supabase
        .from('fragrances')
        .select('id, name, brand, image_url, image_url_transparent, fragrantica_url, created_at')
        .order('created_at', { ascending: false })
        .limit(2000);

      if (!error && data) setRows(data);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      const missingSrc = !r.image_url || r.image_url.trim()==='';
      const missingT   = !r.image_url_transparent || r.image_url_transparent.trim()==='';
      if (filter === 'missing_any') return missingSrc || missingT;
      if (filter === 'missing_src') return missingSrc;
      if (filter === 'missing_transparent') return missingT;
      return true;
    });
  }, [rows, filter]);

  async function saveUrl(rowId, url) {
    if (!url) { setStatus('Enter an image URL first.'); return; }
    setWorking(true);
    const { error } = await supabase
      .from('fragrances')
      .update({ image_url: url })
      .eq('id', rowId);
    setWorking(false);
    if (error) { setStatus(`❌ Save failed: ${error.message}`); return; }
    setRows(rs => rs.map(r => r.id === rowId ? { ...r, image_url: url } : r));
    setStatus('✅ Saved image URL.');
  }

  async function uploadFile(row) {
    const input = fileInputs.current[row.id];
    if (!input || !input.files || !input.files[0]) { setStatus('Choose a file first.'); return; }
    const file = input.files[0];

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const ts = Date.now();
    const path = `manual/${row.id}-${ts}.${ext}`;

    setWorking(true);
    const { error: upErr } = await supabase
      .storage
      .from('sources')              // <-- make sure you have a public bucket named "sources"
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined
      });

    if (upErr) {
      setWorking(false);
      setStatus(`❌ Upload failed: ${upErr.message}`);
      return;
    }

    const { data: pub } = supabase.storage.from('sources').getPublicUrl(path);
    const publicUrl = pub?.publicUrl;
    if (!publicUrl) {
      setWorking(false);
      setStatus('❌ Could not get public URL after upload.');
      return;
    }

    const { error: updErr } = await supabase
      .from('fragrances')
      .update({ image_url: publicUrl })
      .eq('id', row.id);

    setWorking(false);
    if (updErr) { setStatus(`❌ Save failed: ${updErr.message}`); return; }

    setRows(rs => rs.map(r => r.id === row.id ? { ...r, image_url: publicUrl } : r));
    setStatus('✅ Uploaded & saved image URL.');
    // clear file input
    if (input) input.value = '';
  }

  async function removeBg(row) {
    if (!userId) { setStatus('❌ No admin user id found.'); return; }
    const src = row.image_url;
    if (!src) { setStatus('❌ Set an image_url first.'); return; }

    setWorking(true);
    try {
      const res = await fetch('/api/remove-bg', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          imageUrl: src,
          fragranceId: row.id,
          userId
        })
      });
      const j = await res.json();
      setWorking(false);
      if (!res.ok || !j?.success) {
        setStatus(`❌ remove.bg failed: ${j?.error || res.statusText}`);
        return;
      }
      // API updates the row itself (image_url_transparent), but we mirror it locally:
      setRows(rs => rs.map(r => r.id === row.id ? { ...r, image_url_transparent: j.publicUrl } : r));
      setStatus('✅ Background removed & saved.');
    } catch (e) {
      setWorking(false);
      setStatus(`❌ Error: ${e.message}`);
    }
  }

  async function bulkProcessTransparent() {
    if (!userId) { setStatus('❌ No admin user id found.'); return; }
    const todo = filtered.filter(r => !!r.image_url && !r.image_url_transparent);
    if (!todo.length) { setStatus('No rows need transparent processing.'); return; }

    setWorking(true);
    let ok = 0, fail = 0;
    for (const r of todo) {
      try {
        const res = await fetch('/api/remove-bg', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ imageUrl: r.image_url, fragranceId: r.id, userId })
        });
        const j = await res.json();
        if (res.ok && j?.success) {
          ok++;
          setRows(rs => rs.map(x => x.id === r.id ? { ...x, image_url_transparent: j.publicUrl } : x));
        } else {
          fail++;
        }
      } catch {
        fail++;
      }
    }
    setWorking(false);
    setStatus(`✅ Done: ${ok} converted, ${fail} failed.`);
  }

  function Row({ r }) {
    const hasSrc = !!r.image_url;
    const hasT   = !!r.image_url_transparent;

    return (
      <div className="grid grid-cols-[80px_1fr_auto] gap-3 items-center border-b py-3">
        <div className="w-20 h-20 bg-gray-100 flex items-center justify-center overflow-hidden rounded">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={r.image_url_transparent || r.image_url || '/bottle-placeholder.png'}
            alt=""
            className="object-contain w-full h-full"
            onError={(e)=>{ const img=e.currentTarget; img.src='/bottle-placeholder.png'; }}
          />
        </div>

        <div className="min-w-0">
          <div className="font-medium truncate">{r.brand ? `${r.brand} — ` : ''}{r.name || '(unnamed)'}</div>
          {r.fragrantica_url && (
            <a href={r.fragrantica_url} target="_blank" className="text-xs text-blue-600 underline break-all">
              {r.fragrantica_url}
            </a>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="url"
              placeholder="https://direct-image.jpg (or .png/.webp)"
              className="border rounded px-2 py-1 text-sm w-full sm:w-[360px]"
              defaultValue={r.image_url || ''}
              onKeyDown={(e)=>{
                if (e.key === 'Enter') {
                  e.preventDefault();
                  saveUrl(r.id, e.currentTarget.value.trim());
                }
              }}
            />
            <button
              onClick={(e)=>{
                const input = fileInputs.current[r.id];
                if (input) input.click();
              }}
              className="px-3 py-1 border rounded text-sm"
            >
              Upload file…
            </button>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              ref={el => (fileInputs.current[r.id] = el)}
              onChange={()=>uploadFile(r)}
            />

            <button
              onClick={()=>saveUrl(r.id, (document.activeElement?.value || '').trim())}
              className="px-3 py-1 bg-black text-white rounded text-sm"
              title="Save the URL typed in the input"
            >
              Save URL
            </button>

            <button
              onClick={()=>removeBg(r)}
              disabled={!hasSrc}
              className={clsx(
                'px-3 py-1 rounded text-sm',
                hasSrc ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              )}
              title={hasSrc ? 'Create transparent PNG via remove.bg' : 'Set an image URL first'}
            >
              Remove Background
            </button>

            <span className="text-xs">
              {hasSrc ? '🖼️ src' : '⚠ no src'} · {hasT ? '✅ transparent' : '○ no transparent'}
            </span>
          </div>
        </div>

        <div className="justify-self-end text-right">
          <div className="text-[10px] uppercase tracking-wide text-gray-500">ID</div>
          <div className="text-xs font-mono">{r.id}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Admin · Image Fixer</h1>
      <p className="text-sm text-gray-600 mb-4">
        Paste a direct image URL (jpg/png/webp), upload a file, or run background removal.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select
          value={filter}
          onChange={(e)=>setFilter(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="missing_any">Show: Missing any image</option>
          <option value="missing_src">Show: Missing source URL</option>
          <option value="missing_transparent">Show: Missing transparent</option>
          <option value="all">Show: All loaded</option>
        </select>

        <button
          onClick={bulkProcessTransparent}
          disabled={working}
          className="px-3 py-1 bg-pink-700 text-white rounded text-sm"
          title="Convert all filtered rows that have a source but no transparent image"
        >
          Process All (transparent)
        </button>

        {working && <span className="text-sm opacity-70">Working…</span>}
        {status && <span className="text-sm ml-2">{status}</span>}
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="border rounded">
          {filtered.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No rows match this filter.</div>
          ) : (
            filtered.map(r => <Row key={r.id} r={r} />)
          )}
        </div>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm underline">Setup notes</summary>
        <ul className="list-disc pl-5 text-sm mt-2 space-y-1">
          <li>Create a public storage bucket named <code>sources</code> in Supabase (Settings → Storage).</li>
          <li>Ensure your Vercel env has <code>REMOVE_BG_API_KEY</code> and your API route <code>/api/remove-bg</code> is deployed (we added this earlier).</li>
          <li>If a URL fails with “invalid file type”, replace it with a direct JPG/PNG/WebP link or upload a file.</li>
        </ul>
      </details>
    </div>
  );
}
