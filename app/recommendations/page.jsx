'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// ---- helpers ----
const CATEGORY_LABELS = {
  fruity_floral: 'Fruity/Floral',
  gourmand: 'Gourmand',
  unique: 'Unique',
};
const CATEGORY_KEYS = ['fruity_floral', 'gourmand', 'unique'];

function parseAccordNames(accords) {
  try {
    if (!accords) return [];
    if (typeof accords === 'string') {
      const s = accords.trim();
      if ((s.startsWith('[') && s.endsWith(']')) || (s.startsWith('{') && s.endsWith('}'))) {
        return parseAccordNames(JSON.parse(s));
      }
      return s.split(/[,\|]/).map(x => x.trim()).filter(Boolean);
    }
    if (Array.isArray(accords)) {
      return accords.map(x => (typeof x === 'string' ? x : x?.name)).filter(Boolean);
    }
    if (accords && typeof accords === 'object' && 'name' in accords) {
      return [String(accords.name)];
    }
    return [];
  } catch {
    return [];
  }
}

function Bottle({ src, alt }) {
  const img = src || '/bottle-placeholder.png';
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={img}
      alt={alt || 'Bottle'}
      className="w-full h-full object-contain"
      style={{ mixBlendMode: 'multiply' }}
      onError={(e) => {
        const el = e.currentTarget;
        if (!el.dataset.fallback) {
          el.dataset.fallback = '1';
          el.src = '/bottle-placeholder.png';
        }
      }}
      loading="lazy"
    />
  );
}

// ---- page ----
export default function RecommendationsPage() {
  const [viewer, setViewer] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [recs, setRecs] = useState([]); // {id, category, comment, position, fragrance:{...}}
  const [err, setErr] = useState('');

  // admin add/search
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]); // list of fragrances to pick from
  const [newCategory, setNewCategory] = useState('fruity_floral');
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    (async () => {
      setErr('');
      // who am I?
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user || null;
      setViewer(user);

      // am I admin?
      if (user?.id) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .maybeSingle();
        setIsAdmin(!!prof?.is_admin);
      } else {
        setIsAdmin(false);
      }

      await loadRecs();
    })();
  }, []);

  async function loadRecs() {
    setLoading(true);
    setErr('');
    try {
      const { data, error } = await supabase
        .from('recommendations')
        .select(`
          id, category, comment, position,
          fragrance:fragrances(id, brand, name, accords, image_url, image_url_transparent)
        `)
        .order('category', { ascending: true })
        .order('position', { ascending: true })
        .order('id', { ascending: true });

      if (error) throw error;
      setRecs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr(
        (e?.message || '')
          .includes('relation') && (e?.message || '').includes('recommendations')
          ? 'The "recommendations" table was not found. If you are admin, see the note below for SQL to create it.'
          : (e?.message || 'Failed to load recommendations.')
      );
      setRecs([]);
    } finally {
      setLoading(false);
    }
  }

  // group to 3 columns
  const byCat = useMemo(() => {
    const map = { fruity_floral: [], gourmand: [], unique: [] };
    for (const r of recs) {
      const key = (r.category || '').toLowerCase();
      if (key in map) map[key].push(r);
    }
    return map;
  }, [recs]);

  // ---- admin: search fragrances to add ----
  async function doSearch() {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('fragrances')
        .select('id, brand, name, image_url, image_url_transparent, accords')
        .or(`brand.ilike.%${q}%,name.ilike.%${q}%`)
        .order('brand', { ascending: true })
        .order('name', { ascending: true })
        .limit(40);
      if (error) throw error;
      setResults(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function addRec(fragrance) {
    if (!isAdmin) return;

    // compute next position inside the category
    const nextPos =
      Math.max(
        0,
        ...recs
          .filter(r => (r.category || '').toLowerCase() === newCategory)
          .map(r => Number(r.position || 0))
      ) + 1;

    const payload = {
      fragrance_id: fragrance.id,
      category: newCategory,
      comment: newComment || null,
      position: nextPos,
    };

    const { error } = await supabase.from('recommendations').insert(payload);
    if (error) {
      alert(`Add failed: ${error.message}`);
      return;
    }
    setQ('');
    setResults([]);
    setNewComment('');
    await loadRecs();
  }

  async function saveRec(recId, fields) {
    if (!isAdmin) return;
    const { error } = await supabase.from('recommendations').update(fields).eq('id', recId);
    if (error) alert(`Save failed: ${error.message}`);
    await loadRecs();
  }

  async function deleteRec(recId) {
    if (!isAdmin) return;
    const ok = window.confirm('Remove this recommendation?');
    if (!ok) return;
    const { error } = await supabase.from('recommendations').delete().eq('id', recId);
    if (error) alert(`Delete failed: ${error.message}`);
    await loadRecs();
  }

  return (
    <div className="min-h-screen bg-[#fdfcf9]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-2xl font-semibold">Fragrantique</Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/brand" className="hover:underline">Brand Index</Link>
            <Link href="/chat" className="hover:underline">Contact Me</Link>
            <Link href="/cart" className="hover:underline">Cart</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        {/* Lead */}
        <div className="p-3 rounded border bg-white">
          <div className="text-base sm:text-lg">
            <span className="font-semibold">Having trouble deciding?</span>{' '}
            Here are some of my recommendations based on fragrance types.
          </div>
        </div>

        {/* Admin panel */}
        {isAdmin && (
          <div className="p-4 rounded border bg-white space-y-4">
            <div className="font-semibold">Admin — Manage Recommendations</div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1">Search fragrances</label>
                <div className="flex gap-2">
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Type brand or name…"
                    className="border rounded px-3 py-2 w-full"
                    onKeyDown={(e) => { if (e.key === 'Enter') doSearch(); }}
                  />
                  <button
                    onClick={doSearch}
                    className="px-3 py-2 rounded border bg-white hover:bg-gray-50"
                    disabled={searching}
                  >
                    {searching ? 'Searching…' : 'Search'}
                  </button>
                </div>
                {!!results.length && (
                  <div className="mt-2 max-h-48 overflow-auto border rounded">
                    {results.map(f => (
                      <div key={f.id} className="flex items-center justify-between gap-2 px-3 py-2 border-b last:border-b-0">
                        <div className="text-sm">
                          <span className="font-medium">{f.brand}</span>{' '}<span>{f.name}</span>
                        </div>
                        <button
                          onClick={() => addRec(f)}
                          className="text-xs px-2 py-1 rounded bg-black text-white hover:opacity-90"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    className="border rounded px-3 py-2 w-full"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  >
                    <option value="fruity_floral">Fruity/Floral</option>
                    <option value="gourmand">Gourmand</option>
                    <option value="unique">Unique</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Comment (optional)</label>
                  <textarea
                    className="border rounded px-3 py-2 w-full min-h-[80px]"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Why I recommend this one…"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {err && (
          <div className="p-3 rounded border bg-red-50 text-red-700 text-sm">
            {err}
          </div>
        )}

        {/* Columns */}
        <div className="grid gap-6 md:grid-cols-3">
          {CATEGORY_KEYS.map((key) => (
            <div key={key} className="space-y-3">
              <div className="px-3 py-2 rounded bg-black text-white font-semibold">
                {CATEGORY_LABELS[key]}
              </div>

              {byCat[key].length === 0 ? (
                <div className="p-3 rounded border bg-white text-sm opacity-70">No recommendations yet.</div>
              ) : (
                byCat[key].map((r) => {
                  const f = r.fragrance || {};
                  const accords = parseAccordNames(f.accords);
                  const img = f.image_url_transparent || f.image_url || '/bottle-placeholder.png';
                  return (
                    <div key={r.id} className="rounded border bg-white p-3 space-y-3">
                      <div className="grid grid-cols-5 gap-3">
                        <div className="col-span-2">
                          <div className="w-full aspect-[3/4] border rounded bg-gray-50 overflow-hidden">
                            <Bottle src={img} alt={`${f.brand || ''} ${f.name || ''}`} />
                          </div>
                        </div>
                        <div className="col-span-3">
                          <div className="text-xs text-gray-500">Brand</div>
                          <div className="font-medium">{f.brand || '—'}</div>
                          <div className="mt-1 text-xs text-gray-500">Fragrance</div>
                          <div className="font-medium">{f.name || '—'}</div>

                          {!!accords.length && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {accords.map((a, i) => (
                                <span key={i} className="text-[11px] px-2 py-0.5 rounded-full border bg-white">
                                  {a}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* comment (viewer) / editor (admin) */}
                      {!isAdmin ? (
                        <div className="text-sm whitespace-pre-wrap">{r.comment || ''}</div>
                      ) : (
                        <div className="space-y-2">
                          <label className="block text-xs font-medium">Comment</label>
                          <textarea
                            className="border rounded px-2 py-1 w-full min-h-[70px]"
                            value={r.comment || ''}
                            onChange={(e) => {
                              const v = e.target.value;
                              setRecs(prev => prev.map(x => x.id === r.id ? { ...x, comment: v } : x));
                            }}
                          />
                          <div className="flex flex-wrap gap-2">
                            <select
                              className="border rounded px-2 py-1 text-xs"
                              value={r.category || 'fruity_floral'}
                              onChange={(e) => {
                                const v = e.target.value;
                                setRecs(prev => prev.map(x => x.id === r.id ? { ...x, category: v } : x));
                              }}
                            >
                              <option value="fruity_floral">Fruity/Floral</option>
                              <option value="gourmand">Gourmand</option>
                              <option value="unique">Unique</option>
                            </select>

                            <button
                              onClick={() => saveRec(r.id, { comment: r.comment ?? null, category: r.category })}
                              className="px-3 py-1.5 rounded bg-black text-white text-xs hover:opacity-90"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => deleteRec(r.id)}
                              className="px-3 py-1.5 rounded border text-xs hover:bg-gray-50"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}

                      <div>
                        <Link
                          className="text-sm rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                          href={`/fragrance/${encodeURIComponent(f.id || '')}`}
                        >
                          Decant Options
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ))}
        </div>

        {/* Help for admin if table missing */}
        {isAdmin && err.includes('"recommendations" table') && (
          <div className="p-3 rounded border bg-white text-sm">
            <div className="font-semibold mb-1">Setup (run in Supabase SQL editor):</div>
            <pre className="whitespace-pre-wrap text-xs bg-gray-50 p-2 rounded border">
{`create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  fragrance_id uuid not null references public.fragrances(id) on delete cascade,
  category text not null check (category in ('fruity_floral','gourmand','unique')),
  comment text,
  position int not null default 0,
  created_at timestamptz default now()
);
alter table public.recommendations enable row level security;

create policy "recommendations read all"
  on public.recommendations for select
  using (true);

create policy "recommendations admin write"
  on public.recommendations
  for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));`}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}
