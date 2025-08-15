'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function EditFragrancePage({ params }) {
  const id = decodeURIComponent(params.id || '');

  const [viewer, setViewer] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageTransparent, setImageTransparent] = useState('');
  const [fragranticaUrl, setFragranticaUrl] = useState('');
  const [notes, setNotes] = useState(''); // optional: your schema may have notes or description

  useEffect(() => {
    (async () => {
      // auth
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user || null;
      setViewer(user);

      if (!user) {
        setMsg('Please sign in.');
        setLoading(false);
        return;
      }

      // admin check
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, is_admin')
        .eq('id', user.id)
        .maybeSingle();

      const admin = !!prof?.is_admin;
      setIsAdmin(admin);

      if (!admin) {
        setMsg('You must be an admin to edit fragrances.');
        setLoading(false);
        return;
      }

      // load fragrance
      const { data, error } = await supabase
        .from('fragrances')
        .select('id, brand, name, image_url, image_url_transparent, fragrantica_url, notes')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        setMsg(`Load failed: ${error.message}`);
        setLoading(false);
        return;
      }

      if (!data) {
        setMsg('Fragrance not found.');
        setLoading(false);
        return;
      }

      setBrand(data.brand || '');
      setName(data.name || '');
      setImageUrl(data.image_url || '');
      setImageTransparent(data.image_url_transparent || '');
      setFragranticaUrl(data.fragrantica_url || '');
      setNotes(data.notes || '');
      setLoading(false);
    })();
  }, [id]);

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');

    const payload = {
      brand: brand || null,
      name: name || null,
      image_url: imageUrl || null,
      image_url_transparent: imageTransparent || null,
      fragrantica_url: fragranticaUrl || null,
      notes: notes || null,
    };

    const { error } = await supabase
      .from('fragrances')
      .update(payload)
      .eq('id', id);

    setSaving(false);
    if (error) {
      setMsg(`Save failed: ${error.message}`);
    } else {
      setMsg('Saved ✓');
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (!viewer || !isAdmin) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-3">
        <h1 className="text-2xl font-bold">Edit fragrance</h1>
        <p className="opacity-70">{msg || 'You must be an admin.'}</p>
        <Link href="/admin/fragrances" className="underline text-sm">← Back to Admin · Fragrances</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit fragrance</h1>
        <Link href="/admin/fragrances" className="underline text-sm">← Back to Admin · Fragrances</Link>
      </div>

      <form onSubmit={onSave} className="space-y-4 bg-white border rounded p-4">
        <div>
          <label className="block text-sm font-medium">Brand</label>
          <input
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="border rounded px-3 py-2 w-full"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border rounded px-3 py-2 w-full"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Fragrantica URL</label>
          <input
            value={fragranticaUrl}
            onChange={(e) => setFragranticaUrl(e.target.value)}
            className="border rounded px-3 py-2 w-full"
            placeholder="https://www.fragrantica.com/perfume/..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Image URL</label>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="border rounded px-3 py-2 w-full"
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Transparent Image URL</label>
          <input
            value={imageTransparent}
            onChange={(e) => setImageTransparent(e.target.value)}
            className="border rounded px-3 py-2 w-full"
            placeholder="https://... (PNG preferred)"
          />
          <p className="text-xs opacity-70 mt-1">
            If set, your boutique will prefer this (no background).
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="border rounded px-3 py-2 w-full"
            rows={4}
            placeholder="Your notes or description"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded bg-black text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {msg && <div className="text-sm p-2 rounded bg-white border">{msg}</div>}
        </div>
      </form>
    </div>
  );
}
