

'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AddFragrance() {
  const [form, setForm] = useState({
    name: '',
    brand: '',
    image_url: '',
    fragrantica_url: '',
    notes: '',
    accords: '',
    decant_price: '',
    decant_payment_link: '',
  });
  const [message, setMessage] = useState('');
  const [newId, setNewId] = useState(null);

  const update = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  async function submit() {
    setMessage('');

    // 1) Insert fragrance
    const accords = form.accords
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
      .map((name) => ({ name, strength: 50 }));

    const { data: ins, error: insErr } = await supabase
      .from('fragrances')
      .insert({
        name: form.name || null,
        brand: form.brand || null,
        image_url: form.image_url || null,
        fragrantica_url: form.fragrantica_url || null,
        notes: form.notes || null,
        accords: accords.length ? accords : null,
        decant_price: form.decant_price ? Number(form.decant_price) : null,
        decant_payment_link: form.decant_payment_link || null,
      })
      .select('id')
      .single();

    if (insErr) {
      setMessage(`Save error: ${insErr.message}`);
      return;
    }

    setNewId(ins.id);

    // 2) Auto-link to the current user's shelves at the last position
    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes?.user?.id;
    if (!userId) {
      setMessage('Saved. Please log in to add it to your shelves.');
      return;
    }

    // Find next position (append)
    const { data: positions, error: posErr } = await supabase
      .from('user_fragrances')
      .select('position')
      .eq('user_id', userId)
      .order('position', { ascending: false })
      .limit(1);

    if (posErr) {
      setMessage(`Saved, but shelf lookup failed: ${posErr.message}`);
      return;
    }

    const nextPos = positions?.length ? (positions[0].position ?? 0) + 1 : 0;

    const { error: linkErr } = await supabase
      .from('user_fragrances')
      .insert({
        user_id: userId,
        fragrance_id: ins.id,
        position: nextPos,
      });

    if (linkErr) {
      setMessage(`Saved, but couldn’t add to shelves: ${linkErr.message}`);
    } else {
      setMessage('Saved and added to your shelves ✨ You can remove the background to make it float.');
    }
  }

  async function removeBackground() {
    if (!newId) return alert('Save the fragrance first.');
    if (!form.image_url) return alert('Please provide an image URL first.');

    const { data: me } = await supabase.auth.getUser();
    const userId = me?.user?.id;
    if (!userId) return alert('Please sign in first.');

    const res = await fetch('/api/remove-bg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: form.image_url,
        fragranceId: newId,
        userId,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      alert(json.error || 'Failed to remove background');
    } else {
      alert('Transparent PNG saved! Refresh your boutique to see it.');
    }
  }

  return (
    <div className="max-w-xl mx-auto glass-card p-6 space-y-3">
      <h2 className="text-2xl font-semibold mb-2">Add a Fragrance</h2>

      <input className="w-full border rounded-lg px-3 py-2" placeholder="Name" onChange={(e) => update('name', e.target.value)} />
      <input className="w-full border rounded-lg px-3 py-2" placeholder="Brand" onChange={(e) => update('brand', e.target.value)} />
      <input className="w-full border rounded-lg px-3 py-2" placeholder="Image URL" onChange={(e) => update('image_url', e.target.value)} />
      <input className="w-full border rounded-lg px-3 py-2" placeholder="Fragrantica URL" onChange={(e) => update('fragrantica_url', e.target.value)} />
      <textarea className="w-full border rounded-lg px-3 py-2" placeholder="Notes / Comments" onChange={(e) => update('notes', e.target.value)} />
      <input className="w-full border rounded-lg px-3 py-2" placeholder="Accords (comma separated)" onChange={(e) => update('accords', e.target.value)} />

      <div className="grid grid-cols-2 gap-3">
        <input className="border rounded-lg px-3 py-2" placeholder="Decant price (USD)" onChange={(e) => update('decant_price', e.target.value)} />
        <input className="border rounded-lg px-3 py-2" placeholder="Payment link (Stripe, etc.)" onChange={(e) => update('decant_payment_link', e.target.value)} />
      </div>

      <button onClick={submit} className="w-full bg-[var(--gold)] text-white rounded-lg py-2">
        Save (and add to my shelves)
      </button>

      {newId && (
        <button onClick={removeBackground} className="w-full bg-black text-white rounded-lg py-2">
          Remove background (make transparent PNG)
        </button>
      )}

      {message && <p className="text-sm">{message}</p>}
      <p className="text-xs opacity-60">Tip: high-contrast images remove backgrounds best.</p>
    </div>
  );
}
