'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import BoutiqueShelves from '@/components/BoutiqueShelves';

export default function StephanieBoutique() {
  const [userId, setUserId] = useState(null);
  const [items, setItems] = useState([]); // [{ linkId, position, fragrance: {...} }]
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // Find Stephanie’s profile
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', 'stephanie')
        .single();
      if (pErr || !profile) {
        setLoading(false);
        return;
      }
      setUserId(profile.id);

      // Load shelves with positions (ordered)
      const { data, error } = await supabase
        .from('user_fragrances')
        .select('id, position, fragrance:fragrances(*)')
        .eq('user_id', profile.id)
        .order('position', { ascending: true });

      if (!error && data) {
        const mapped = data.map((row) => ({
          linkId: row.id,
          position: row.position ?? 0,
          fragrance: row.fragrance,
        }));
        setItems(mapped);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="p-6">Loading your boutique…</div>;

  return (
    <div className="mx-auto max-w-6xl w-full px-2">
      {/* Keep a fixed 3:2 box so shelf % positions stay accurate */}
      <div className="relative w-full" style={{ aspectRatio: '3 / 2' }}>
        {/* Background image */}
        <Image
          src="/Fragrantique_boutiqueBackground.png" // must live in /public
          alt="Boutique Background"
          fill
          style={{ objectFit: 'cover' }}
          priority
        />

        {/* Bottles overlay (drag & drop etc.) */}
        <BoutiqueShelves
          userId={userId}
          items={items}
          onItemsChange={setItems}
        />
      </div>
    </div>
  );
}
