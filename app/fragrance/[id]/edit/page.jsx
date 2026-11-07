
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const emptyAccord = () => ({
  name: '',
  strength: 50
});

function parseAccords(value) {
  try {
    const parsed =
      typeof value === 'string'
        ? JSON.parse(value)
        : value;

    if (!Array.isArray(parsed)) return [];

    return parsed.map((accord) => ({
      name:
        typeof accord === 'string'
          ? accord
          : String(accord?.name || ''),
      strength:
        typeof accord === 'object' &&
        accord !== null &&
        accord.strength != null
          ? accord.strength
          : 50
    }));
  } catch {
    return [];
  }
}

export default function EditFragrancePage() {
  const params = useParams();
  const id = Array.isArray(params?.id)
    ? params.id[0]
    : params?.id;

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
  const [wikiparfumUrl, setWikiparfumUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [accords, setAccords] = useState([]);

  useEffect(() => {
    if (!id) return;

    let active = true;

    async function load() {
      setLoading(true);
      setMsg('');

      try {
        const { data: auth, error: authError } =
          await supabase.auth.getUser();

        if (authError) throw authError;

        const user = auth?.user || null;

        let admin = false;
        let owner = false;

        if (user?.id) {
          const { data: me, error: profileError } =
            await supabase
              .from('profiles')
              .select('id, is_admin, username')
              .eq('id', user.id)
              .maybeSingle();

          if (profileError) throw profileError;

          admin = !!me?.is_admin;

          const { data: ownerProfile, error: ownerError } =
            await supabase
              .from('profiles')
              .select('id')
              .eq('username', 'stephanie')
              .maybeSingle();

          if (ownerError) throw ownerError;

          owner = !!(
            ownerProfile &&
            user.id === ownerProfile.id
          );
        }

        if (!active) return;

        setIsAdmin(admin);
        setIsOwner(owner);

        if (!admin && !owner) {
          setLoading(false);
          return;
        }

        const { data: f, error: fragranceError } =
          await supabase
            .from('fragrances')
            .select(
              'id, brand, name, image_url, image_url_transparent, fragrantica_url, wikiparfum_url, notes, accords'
            )
            .eq('id', id)
            .maybeSingle();

        if (fragranceError) throw fragranceError;

        if (!active) return;

        if (!f) {
          setMsg('Fragrance not found.');
        } else {
          setBrand(f.brand || '');
          setName(f.name || '');
          setImageUrl(f.image_url || '');
          setImageUrlTransparent(
            f.image_url_transparent || ''
          );
          setFragranticaUrl(f.fragrantica_url || '');
          setWikiparfumUrl(f.wikiparfum_url || '');
          setNotes(f.notes || '');
          setAccords(parseAccords(f.accords));
        }
      } catch (error) {
        if (active) {
          setMsg(
            `Unable to load fragrance: ${error.message}`
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [id]);

  const canEdit = isOwner || isAdmin;

  function updateAccord(index, field, value) {
    setAccords((previous) =>
      previous.map((accord, i) =>
        i === index
          ? { ...accord, [field]: value }
          : accord
      )
    );
  }

  function addAccord() {
    setAccords((previous) => [
      ...previous,
      emptyAccord()
    ]);
  }

  function removeAccord(index) {
    setAccords((previous) =>
      previous.filter((_, i) => i !== index)
    );
  }

  function moveAccord(index, direction) {
    setAccords((previous) => {
      const target = index + direction;

      if (target < 0 || target >= previous.length) {
        return previous;
      }

      const next = [...previous];

      [next[index], next[target]] = [
        next[target],
        next[index]
      ];

      return next;
    });
  }

  async function handleSave() {
    if (!canEdit) {
      setMsg('Not authorized.');
      return;
    }

    const cleanedAccords = [];

    for (const accord of accords) {
      const accordName = String(accord.name || '').trim();

      if (!accordName) {
        setMsg(
          'Please enter a name for every accord, or remove empty accords.'
        );
        return;
      }

      const strength = Number(accord.strength);

      if (
        accord.strength === '' ||
        !Number.isFinite(strength) ||
        strength < 0 ||
        strength > 100
      ) {
        setMsg(
          'Accord strengths must be numbers between 0 and 100.'
        );
        return;
      }

      cleanedAccords.push({
        name: accordName,
        strength
      });
    }

    setSaving(true);
    setMsg('');

    const updates = {
      brand: brand.trim() || null,
      name: name.trim() || null,
      image_url: imageUrl.trim() || null,
      image_url_transparent:
        imageUrlTransparent.trim() || null,
      fragrantica_url: fragranticaUrl.trim() || null,
      wikiparfum_url: wikiparfumUrl.trim() || null,
      notes: notes ?? null,
      accords: cleanedAccords
    };

    try {
      const { data, error } = await supabase
        .from('fragrances')
        .update(updates)
        .eq('id', id)
        .select('id, accords');

      if (error) throw error;

      if (!data?.length) {
        throw new Error(
          'No fragrance was updated. Check your Supabase permissions.'
        );
      }

      setAccords(parseAccords(data[0].accords));
      setMsg('Fragrance and accords saved successfully ✓');
    } catch (error) {
      setMsg(`Save failed: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        Loading fragrance...
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="mx-auto max-w-3xl space-y-3 p-6">
        <h1 className="text-lg font-semibold">
          Not authorized
        </h1>
        <p className="text-sm opacity-70">
          You must be the owner or an admin to edit fragrances.
        </p>
        <Link
          href={`/fragrance/${encodeURIComponent(id || '')}`}
          className="text-sm underline"
        >
          ← Back to fragrance
        </Link>
      </div>
    );
  }

  const inputClass =
    'w-full rounded-lg border border-[#eadfd9] bg-white px-3 py-2 outline-none focus:border-[#c9879a]';

  return (
    <main className="min-h-screen bg-[#fcf8f6] px-4 py-8 text-[#5f463d]">
      <div className="mx-auto max-w-3xl space-y-6">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-serif text-3xl">
            Edit Fragrance
          </h1>

          <Link
            href={`/fragrance/${encodeURIComponent(id || '')}`}
            className="text-sm text-[#a97584] underline"
          >
            ← Back to fragrance
          </Link>
        </div>

        {msg && (
          <div
            role="status"
            className="rounded-xl border border-[#eadfd9] bg-white p-4 text-sm"
          >
            {msg}
          </div>
        )}

        <div className="space-y-5 rounded-2xl border border-[#eadfd9] bg-white p-5 shadow-sm">

          <div>
            <label className="mb-1 block text-sm font-medium">
              Brand
            </label>
            <input
              className={inputClass}
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Brand"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Name
            </label>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Fragrance name"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Image URL
            </label>
            <input
              className={inputClass}
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Transparent Image URL
            </label>
            <input
              className={inputClass}
              value={imageUrlTransparent}
              onChange={(e) =>
                setImageUrlTransparent(e.target.value)
              }
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Fragrantica URL
            </label>
            <input
              className={inputClass}
              value={fragranticaUrl}
              onChange={(e) =>
                setFragranticaUrl(e.target.value)
              }
              placeholder="https://www.fragrantica.com/..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Wikiparfum URL
            </label>
            <input
              className={inputClass}
              value={wikiparfumUrl}
              onChange={(e) =>
                setWikiparfumUrl(e.target.value)
              }
              placeholder="https://www.wikiperfume.com/..."
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Notes (free text)
            </label>
            <textarea
              className={`${inputClass} min-h-[140px]`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Top / Heart / Base notes or description..."
            />
          </div>
        </div>

        <section className="rounded-2xl border border-[#eadfd9] bg-white p-5 shadow-sm">
          <div className="mb-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[#b38b7d]">
              Fragrantique Discovery
            </p>

            <h2 className="mt-2 font-serif text-2xl">
              Fragrance Accords
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#8c6f64]">
              Edit accord names and strengths, or rearrange
              them using the arrows. The first accord is
              the primary accord used for Discover Your Scent.
            </p>
          </div>

          <div className="space-y-3">
            {accords.length === 0 && (
              <div className="rounded-xl border border-dashed border-[#eadfd9] p-6 text-center text-sm text-[#8c6f64]">
                No accords yet. Add your first accord below.
              </div>
            )}

            {accords.map((accord, index) => (
              <div
                key={index}
                className={`rounded-xl border p-4 ${
                  index === 0
                    ? 'border-[#c9879a] bg-[#fff7fa]'
                    : 'border-[#eadfd9] bg-[#fdfaf8]'
                }`}
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold">
                    {index === 0
                      ? '★ Primary Accord'
                      : `Accord ${index + 1}`}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => moveAccord(index, -1)}
                      disabled={index === 0}
                      aria-label="Move accord up"
                      className="rounded-lg border bg-white px-3 py-2 text-sm disabled:opacity-30"
                    >
                      ↑
                    </button>

                    <button
                      type="button"
                      onClick={() => moveAccord(index, 1)}
                      disabled={index === accords.length - 1}
                      aria-label="Move accord down"
                      className="rounded-lg border bg-white px-3 py-2 text-sm disabled:opacity-30"
                    >
                      ↓
                    </button>

                    <button
                      type="button"
                      onClick={() => removeAccord(index)}
                      aria-label="Remove accord"
                      className="rounded-lg border border-[#e6cfd6] bg-white px-3 py-2 text-sm text-[#a75d73]"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium">
                      Accord Name
                    </label>
                    <input
                      className={inputClass}
                      value={accord.name}
                      onChange={(e) =>
                        updateAccord(
                          index,
                          'name',
                          e.target.value
                        )
                      }
                      placeholder="e.g. Vanilla"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium">
                      Strength (0–100)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      className={inputClass}
                      value={accord.strength}
                      onChange={(e) =>
                        updateAccord(
                          index,
                          'strength',
                          e.target.value
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addAccord}
            className="mt-5 w-full rounded-xl border border-dashed border-[#c9879a] bg-[#fff8fa] px-5 py-3 text-sm font-medium text-[#a97584] transition hover:bg-[#fceef3]"
          >
            + Add Accord
          </button>
        </section>

        <div className="flex flex-wrap items-center gap-3 pb-10">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-[#5f463d] px-7 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Fragrance'}
          </button>

          <Link
            href={`/fragrance/${encodeURIComponent(id || '')}`}
            className="rounded-xl border border-[#eadfd9] bg-white px-7 py-3 text-sm hover:bg-[#fdf9f7]"
          >
            Cancel
          </Link>
        </div>
      </div>
    </main>
  );
}
