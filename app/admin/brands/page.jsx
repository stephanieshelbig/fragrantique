'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
function rowKey(b){ return (b.brand || 'Unknown').trim(); }

export default function BrandOrderAdmin() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      // gather distinct brands from your data so you can rank them
      const { data: brandsFromFrags } = await supabase
        .from('fragrances')
        .select('brand')
        .not('brand','is', null);

      const distinct = Array.from(new Set((brandsFromFrags||[]).map(b => rowKey(b)))).sort((a,b)=>a.localeCompare(b));
      const { data: existing } = await supabase.from('brand_sort').select('brand, sort_order');
      const map = new Map((existing||[]).map(r => [rowKey(r), r.sort_order]));
      const merged = distinct.map(b => ({ brand: b, sort_order: map.has(b) ? map.get(b) : 999999 }));
      merged.sort((a,b) => a.sort_order - b.sort_order || a.brand.localeCompare(b.brand));
      setRows(merged);
      setLoading(false);
    })();
  }, []);

  function move(idx, dir){
    const j = idx + dir;
    if (j < 0 || j >= rows.length) return;
    const copy = rows.slice();
    const t = copy[idx]; copy[idx] = copy[j]; copy[j] = t;
    // reindex sort_order
    copy.forEach((r,i)=> r.sort_order = i+1);
    setRows(copy);
  }

  async function saveAll(){
    setStatus('Saving…');
    const upserts = rows.map(r => ({
      brand: rowKey(r),
      sort_order: r.sort_order ?? 999999
    }));
    const { error } = await supabase.from('brand_sort').upsert(upserts);
    setStatus(error ? `❌ ${error.message}` : '✅ Saved');
  }

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin · Brand Order</h1>
        <a className="text-sm underline opacity-70" href="/admin">← Back</a>
      </div>

      <p className="text-sm text-gray-600">
        Drag with buttons to reorder. Lower number = appears first in “Group by Brand”.
      </p>

      <div className="border rounded divide-y">
        {rows.map((r, i) => (
          <div key={r.brand} className="flex items-center justify-between p-2">
            <div className="flex items-center gap-3">
              <div className="w-10 text-right text-xs text-gray-500">{r.sort_order}</div>
              <div className="font-medium">{r.brand}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={()=>move(i,-1)} className="px-2 py-1 border rounded">↑</button>
              <button onClick={()=>move(i, 1)} className="px-2 py-1 border rounded">↓</button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={saveAll} className="px-3 py-1 bg-black text-white rounded">Save</button>
        {status && <span className="text-sm">{status}</span>}
      </div>
    </div>
  );
}
