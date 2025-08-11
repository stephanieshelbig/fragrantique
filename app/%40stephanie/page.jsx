'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import BoutiqueShelves from '@/components/BoutiqueShelves';

export default function StephanieBoutique() {
  const [fragrances, setFragrances] = useState([]);
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

      // Get bottles on her shelves (ordered)
      const { data, error } = await supabase
        .from('user_fragrances')
        .select('fragrance:fragrances(*)')
        .eq('user_id', profile.id)
        .order('position', { ascending: true });

      if (!error && data) {
        setFragrances(data.map((r) => r.fragrance));
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="p-6">Loading your boutique…</div>;

  return (
    <div className="mx-auto max-w-6xl w-full px-2">
      {/* Debug badge - remove later */}
      <div className="absolute left-2 top-2 z-20 bg-black/60 text-white text-xs px-2 py-1 rounded">
        static %40stephanie page
      </div>

      {/* Keep a fixed aspect ratio so shelf positions stay accurate */}
      <div className="relative w-full" style={{ aspectRatio: '3 / 2' }}>
        {/* Background image */}
        <Image
          src="/Fragrantique_boutiqueBackground.png"
          alt="Boutique Background"
          fill
          style={{ objectFit: 'cover' }}
          priority
        />

        {/* Bottles overlay pinned to shelf positions */}
        <BoutiqueShelves fragrances={fragrances} />
      </div>
    </div>
  );
}
