'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function EditFragrancePage({ params }) {
  const router = useRouter();
  const id = decodeURIComponent(params.id || '');

  const [viewer, setViewer] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageUrlTransparent, setImageUrlTransparent] = useState('');
  const [fragranticaUrl, setFragranticaUrl] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg('');

      // who am I
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user || null;
      setViewer(user);

      // am I admin?
      if (user?.id) {
        const { data: me } = await supabase
          .from('profiles')
          .select('id, is_admin, username')
          .eq('id', user.id)
          .maybeSingle();
        setIsAdmin(!!me?.is_admin);
      }

      // is owner @stephanie?
      const { data: owner } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', 'stephanie')
        .maybeSingle();
      setIsOwner(!!(user && owner && user.id === owner.id));

      // load fragrance
      const { data: f } = await supabase
        .from('fragrances')
        .select('id, brand, name, image_url, image_url_transparent, fragrantica_url, notes')
        .eq('id', id)
        .maybeSingle();

      if (f) {
        setBrand(f.brand || '');
        setName(f.name || '');
        setImageUrl(f.image_url || '');
        setImageUrlTransparent(f.image_url_transparent || '');
        setFragranticaUrl(f.fragrantica_url || '');
        setNotes(f.notes || '');
      } else {
        setMsg('Fragrance not found.');
      }

      setLoading(false);
    })();
  }, [id]);

  const canEdit = isOwner || isAdmin;

  async function handleSave() {
    if (!canEdit) { setMsg('Not authorized.'); return; }
    setSaving(true);
    setMsg('');

    const updates = {
      brand: brand?.trim() || null,
      name: name?.trim() || null,
      image_url: imageUrl?.trim() || null,
      image_url_transparent: imageUrlTransparent?.trim() || null,
      fragrantica_url: fragranticaUrl?.trim() || null,
      notes: notes ?? null,
      // If you maintain a slug, you can recompute/update it here as needed.
    };

    const { error } = await supabase
      .from('fragrances')
      .update(updates)
      .eq('id', id);

    setSaving(false);
    if (error) {
      setMsg(`Save failed: ${error.message}`);
    } else {
      setMsg('Saved ✓');
      // stay on page; or redirect back:
      // router.push(`/fragrance/${encodeURIComponent(id)}`);
    }
  }

  if (loading) return <div className="max-w-3xl mx-auto p-6">Loading…</div>;

  if (!canEdit) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-3">
        <div className="text-lg font-semibold">Not authorized</div>
        <p className="text-sm opacity-70">You must be the owner or an admin to edit fragrances.</p>
        <Link href={`/fragrance/${encodeURIComponent(id)}`} className="underline text-sm">
          ← Back to fragrance
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Edit Fragrance</h1>
        <Link href={`/fragrance/${encodeURIComponent(id)}`} className="underline text-sm">
          ← Back to fragrance
        </Link>
      </div>

      {msg && (
        <div className="p-3 rounded border bg-white text-sm">
          {msg}
        </div>
      )}

      <div className="grid gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Brand</label>
          <input
            className="border rounded px-3 py-2 w-full"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Brand"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            className="border rounded px-3 py-2 w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Fragrance name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Image URL</label>
          <input
            className="border rounded px-3 py-2 w-full"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Transparent Image URL</label>
          <input
            className="border rounded px-3 py-2 w-full"
            value={imageUrlTransparent}
            onChange={(e) => setImageUrlTransparent(e.target.value)}
            placeholder="https://…"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Fragrantica URL</label>
          <input
            className="border rounded px-3 py-2 w-full"
            value={fragranticaUrl}
            onChange={(e) => setFragranticaUrl(e.target.value)}
            placeholder="https://www.fragrantica.com/…"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes (free text)</label>
          <textarea
            className="border rounded px-3 py-2 w-full min-h-[140px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Top / Heart / Base notes or description…"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded bg-black text-white hover:opacity-90 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>

        <Link
          href={`/fragrance/${encodeURIComponent(id)}`}
          className="px-4 py-2 rounded border hover:bg-gray-50"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
