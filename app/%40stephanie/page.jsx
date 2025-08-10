'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import FragranceShelf from '@/components/FragranceShelf';
import Image from 'next/image';
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
    <div className="relative min-h-screen">
      {/* Background */}
      <Image
        src={bgImage}
        alt="Boutique Background"
        fill
        style={{ objectFit: 'cover' }}
        priority
      />
      {/* Overlay to soften background */}
      <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" />

      {/* Content */}
      <div className="relative p-6">
        <FragranceShelf fragrances={fragrances} />
      </div>
    </div>
  );
}
