'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function CleanImagesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, ok: 0, fail: 0 });

  useEffect(() => {
    (async () => {
      // require login + admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace('/auth');
      const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
      if (!prof?.is_admin) return router.replace('/');

      setIsAdmin(true);

      // load fragrances missing transparent PNG but having an original URL
      const { data, error } = await supabase
        .from('fragrances')
        .select('id,name,brand,image_url,image_url_transparent')
        .is('image_url_transparent', null)
        .not('image_url', 'is', null)
        .order('created_at', { ascending: true });

      if (error) console.error(error);
      setRows(data || []);
      setLoading(false);
    })();
  }, [router]);

  async function runOne(frag) {
    const { data: me } = await supabase.auth.getUser();
    const userId = me?.user?.id;
    const res = await fetch('/api/remove-bg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: frag.image_url,
        fragranceId: frag.id,
        userId,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'remove-bg failed');
    return json;
  }

  async function runAll() {
    setRunning(true);
    const total = rows.length;
    const state = { done: 0, total, ok: 0, fail: 0 };
    setProgress({ ...state });

    for (let i = 0; i < rows.length; i++) {
      const f = rows[i];
      try {
        await runOne(f);
        state.ok += 1;
        setRows((prev) => prev.filter((x) => x.id !== f.id));
      } catch (e) {
        console.error(e);
        state.fail += 1;
      } finally {
        state.done = i + 1;
        setProgress({ ...state });
        await new Promise((r) => setTimeout(r, 850)); // be gentle with API
      }
    }

    setRunning(false);
  }

  if (loading || !isAdmin) return <div className="p-6">Loading…</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Bulk Background Removal</h1>
      <p className="text-sm opacity-80">
        Converts bottle images to transparent PNGs via remove.bg and saves them to Supabase Storage.
      </p>

      <div className="flex items-center gap-3">
        <button
          disabled={running || rows.length === 0}
          onClick={runAll}
          className={`px-4 py-2 rounded text-white ${running ? 'bg-gray-400' : 'bg-black'}`}
        >
          {running ? 'Working…' : `Process All (${rows.length})`}
        </button>
        {running && (
          <div className="text-sm">
            Done {progress.done}/{progress.total} — ✅ {progress.ok}  ❌ {progress.fail}
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="text-green-700">Nothing to process — all set or missing original image URLs.</div>
      ) : (
        <table className="w-full text-sm border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left opacity-70">
              <th className="px-2">Preview</th>
              <th className="px-2">Name</th>
              <th className="px-2">Brand</th>
              <th className="px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => (
              <tr key={f.id} className="bg-white/70">
                <td className="px-2 py-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.image_url} alt={f.name} className="h-16 w-auto object-contain" />
                </td>
                <td className="px-2">{f.name}</td>
                <td className="px-2">{f.brand}</td>
                <td className="px-2">
                  <button
                    disabled={running}
                    onClick={async () => {
                      try {
                        await runOne(f);
                        setRows((prev) => prev.filter((x) => x.id !== f.id));
                      } catch (e) {
                        alert(e.message);
                      }
                    }}
                    className="px-3 py-1 rounded bg-black text-white"
                  >
                    Convert this one
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
