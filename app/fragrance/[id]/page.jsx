'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

function dollarsToCents(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/[^0-9.]/g, ''));
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}
function centsToDollars(c) {
  if (c == null) return '';
  return (Number(c) / 100).toFixed(2);
}

export default function FragranceDetail({ params }) {
  const id = decodeURIComponent(params.id || '');

  const [viewer, setViewer] = useState(null);
  const [owner, setOwner] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [frag, setFrag] = useState(null);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  // 🔥 NEW: image carousel state
  const [currentImage, setCurrentImage] = useState(0);
  const [img2, setImg2] = useState('');
  const [img3, setImg3] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user || null;
      setViewer(user);

      if (user?.id) {
        const { data: myProf } = await supabase
          .from('profiles')
          .select('id, is_admin')
          .eq('id', user.id)
          .maybeSingle();
        setIsAdmin(!!myProf?.is_admin);
      }

      const { data: ownerProf } = await supabase
        .from('profiles')
        .select('id, username, is_admin')
        .eq('username', 'stephanie')
        .maybeSingle();

      setOwner(ownerProf || null);
      setIsOwner(!!(user && ownerProf && user.id === ownerProf.id));

      // 🔥 UPDATED: fetch extra image fields
      const { data: f } = await supabase
        .from('fragrances')
        .select(`
          id, brand, name, image_url, image_url_transparent,
          image_url_2, image_url_3,
          fragrantica_url, notes
        `)
        .eq('id', id)
        .maybeSingle();

      setFrag(f || null);
      setImg2(f?.image_url_2 || '');
      setImg3(f?.image_url_3 || '');

      const { data: ds } = await supabase
        .from('decants')
        .select('*')
        .eq('fragrance_id', id);

      setOptions(ds || []);
      setLoading(false);
    })();
  }, [id]);

  const canAdmin = isOwner || isAdmin;

  // 🔥 Build image array dynamically
  const images = [
    frag?.image_url_transparent || frag?.image_url,
    frag?.image_url_2,
    frag?.image_url_3,
  ].filter(Boolean);

  function nextImage() {
    setCurrentImage((prev) => (prev + 1) % images.length);
  }

  function prevImage() {
    setCurrentImage((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    );
  }

  async function saveImages() {
    const { error } = await supabase
      .from('fragrances')
      .update({
        image_url_2: img2 || null,
        image_url_3: img3 || null,
      })
      .eq('id', frag.id);

    if (error) {
      setMsg(error.message);
    } else {
      setMsg('Images saved ✓');
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (!frag) return <div className="p-6">Not found</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">

      <h1 className="text-2xl font-bold">
        {frag.brand} — {frag.name}
      </h1>

      {/* 🔥 IMAGE CAROUSEL */}
      <div className="relative w-56 mx-auto">
        <img
          src={images[currentImage]}
          className="w-full object-contain"
        />

        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-0 top-1/2 -translate-y-1/2 px-2 text-xl"
            >
              ←
            </button>

            <button
              onClick={nextImage}
              className="absolute right-0 top-1/2 -translate-y-1/2 px-2 text-xl"
            >
              →
            </button>
          </>
        )}
      </div>

      {/* 🔥 DOT INDICATORS */}
      <div className="flex justify-center gap-2">
        {images.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full ${
              i === currentImage ? 'bg-black' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      {/* 🔥 ADMIN IMAGE EDIT */}
      {canAdmin && (
        <div className="border p-4 rounded space-y-2">
          <div className="font-medium">Additional Images</div>

          <input
            placeholder="Image URL 2"
            value={img2}
            onChange={(e) => setImg2(e.target.value)}
            className="border w-full px-2 py-1"
          />

          <input
            placeholder="Image URL 3"
            value={img3}
            onChange={(e) => setImg3(e.target.value)}
            className="border w-full px-2 py-1"
          />

          <button
            onClick={saveImages}
            className="px-3 py-1 bg-black text-white rounded"
          >
            Save Images
          </button>

          {msg && <div className="text-sm">{msg}</div>}
        </div>
      )}

      {/* NOTES */}
      <div className="border p-4 rounded">
        {frag.notes || 'No notes'}
      </div>

    </div>
  );
}
