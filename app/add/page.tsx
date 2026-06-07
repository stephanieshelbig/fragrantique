'use client';

import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export default function AddFragrance() {
  const [form, setForm] = useState({
    name: '',
    brand: '',
    image_url: 'https://fimgs.net/mdimg/perfume-thumbs/375x500.XXXXX.2x.jpg',
    image_url_2: 'https://fimgs.net/mdimg/perfume-social-cards/en-p_c_XXXXX.jpeg',
    image_url_3: 'https://www.fragrantique.net/DecantSizing.png',
    image_url_4: '',
    fragrantica_url: '',
    wikiparfum_url: 'https://www.wikiperfume.com/en/fragrances/fragrance-name',
    notes: '',
    accords: '',
    decant_price: '',
    decant_payment_link: '',
  });

  const [msg, setMsg] = useState<string | null>(null);

  const update = (k: string, v: string) =>
    setForm((prev) => ({
      ...prev,
      [k]: v,
    }));

  async function submit() {
    setMsg(null);

    const accords = form.accords
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
      .map((a) => ({
        name: a,
        strength: 50,
      }));

    const { error } = await supabase.from('fragrances').insert({
      name: form.name || null,
      brand: form.brand || null,

      image_url: form.image_url || null,
      image_url_2: form.image_url_2 || null,
      image_url_3: form.image_url_3 || null,
      image_url_4: form.image_url_4 || null,

      fragrantica_url: form.fragrantica_url || null,
      wikiparfum_url: form.wikiparfum_url || null,

      notes: form.notes || null,
      accords: accords.length ? accords : null,

      decant_price: form.decant_price
        ? Number(form.decant_price)
        : null,

      decant_payment_link:
        form.decant_payment_link || null,
    });

    if (error) {
      setMsg(error.message);
    } else {
      setMsg('Added! Find it in your boutique shelves.');

      setForm({
        name: '',
        brand: '',
        image_url:
          'https://fimgs.net/mdimg/perfume-thumbs/375x500.XXXXX.2x.jpg',
        image_url_2:
          'https://fimgs.net/mdimg/perfume-social-cards/en-p_c_XXXXX.jpeg',
        image_url_3: 'https://www.fragrantique.net/DecantSizing.png',
        image_url_4: '',
        fragrantica_url: '',
        wikiparfum_url:
          'https://www.wikiperfume.com/en/fragrances/fragrance-name',
        notes: '',
        accords: '',
        decant_price: '',
        decant_payment_link: '',
      });
    }
  }

  return (
    <div className="max-w-xl mx-auto glass-card p-6 space-y-3">
      <h2 className="text-2xl font-semibold mb-2">
        Add a Fragrance
      </h2>

      <input
        className="w-full border rounded-lg px-3 py-2"
        placeholder="Name"
        value={form.name}
        onChange={(e) => update('name', e.target.value)}
      />

      <input
        className="w-full border rounded-lg px-3 py-2"
        placeholder="Brand"
        value={form.brand}
        onChange={(e) => update('brand', e.target.value)}
      />

      <input
        className="w-full border rounded-lg px-3 py-2"
        placeholder="Image URL"
        value={form.image_url}
        onChange={(e) => update('image_url', e.target.value)}
      />

      <input
        className="w-full border rounded-lg px-3 py-2"
        placeholder="Image URL 2 (Fragrance Card)"
        value={form.image_url_2}
        onChange={(e) => update('image_url_2', e.target.value)}
      />

      <input
        className="w-full border rounded-lg px-3 py-2"
        placeholder="Image URL 3"
        value={form.image_url_3}
        onChange={(e) => update('image_url_3', e.target.value)}
      />

      <input
        className="w-full border rounded-lg px-3 py-2"
        placeholder="Image URL 4"
        value={form.image_url_4}
        onChange={(e) => update('image_url_4', e.target.value)}
      />

      <input
        className="w-full border rounded-lg px-3 py-2"
        placeholder="Fragrantica URL"
        value={form.fragrantica_url}
        onChange={(e) => update('fragrantica_url', e.target.value)}
      />

      <input
        className="w-full border rounded-lg px-3 py-2"
        placeholder="Wikiparfum URL"
        value={form.wikiparfum_url}
        onChange={(e) => update('wikiparfum_url', e.target.value)}
      />

      <textarea
        className="w-full border rounded-lg px-3 py-2"
        placeholder="Notes / Comments"
        value={form.notes}
        onChange={(e) => update('notes', e.target.value)}
      />

      <input
        className="w-full border rounded-lg px-3 py-2"
        placeholder="Accords (comma separated, e.g. Citrus, Woody, Floral)"
        value={form.accords}
        onChange={(e) => update('accords', e.target.value)}
      />

      <div className="grid grid-cols-2 gap-3">
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Decant price (USD)"
          value={form.decant_price}
          onChange={(e) => update('decant_price', e.target.value)}
        />

        <input
          className="border rounded-lg px-3 py-2"
          placeholder="Payment link (Stripe, etc.)"
          value={form.decant_payment_link}
          onChange={(e) => update(
            'decant_payment_link',
            e.target.value
          )}
        />
      </div>

      <button
        onClick={submit}
        className="w-full bg-[var(--gold)] text-white rounded-lg py-2"
      >
        Save
      </button>

      {msg && (
        <p className="text-sm">
          {msg}
        </p>
      )}

      <p className="text-xs opacity-60">
        Tip: Paste your Wikiparfum link so visitors can learn more there.
      </p>
    </div>
  );
}
