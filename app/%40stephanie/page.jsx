'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import BoutiqueShelves from '@/components/BoutiqueShelves';
import bgImage from '@/public/Fragrantique_boutiqueBackground.png';

export default function StephanieBoutique() {
  const [fragrances, setFragrances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFragrances() {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', 'stephanie')
        .single();

      if (!profile) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('user_fragrances')
        .select('fragrance:fragrances(*)')
        .eq('user_id', profile.id)
        .order('position', { ascending: true });

      setFragrances(data ? data.map((f) => f.fragrance) : []);
      setLoading(false);
    }
    loadFragrances();
  }, []);

  if (loading) {
    return <div className="p-6">Loading your boutique…</div>;
  }

  return (
    <div className="relative min-h-[70vh]">
      {/* Background image */}
      <Image
        src={bgImage}
        alt="Boutique Background"
        fill
        style={{ objectFit: 'cover' }}
        priority
      />

      {/* Soft overlay so bottles pop */}
      <div className="absolute inset-0 bg-white/50" />

      {/* Shelves overlay (bottles positioned onto shelves) */}
      <BoutiqueShelves fragrances={fragrances} />
    </div>
  );
}
