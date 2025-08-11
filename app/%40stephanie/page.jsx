'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import BoutiqueShelves from '@/components/BoutiqueShelves';

export default function StephanieBoutique() {
  const [fragrances, setFragrances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFragrances() {
      // Find Stephanie's profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', 'stephanie')
        .single();

      if (profileError || !profile) {
        console.error(profileError || 'Profile not found');
        setLoading(false);
        return;
      }

      // Load all bottles on Stephanie's shelves (ordered)
      const { data, error } = await supabase
        .from('user_fragrances')
        .select('fragrance:fragrances(*)')
        .eq('user_id', profile.id)
        .order('position', { ascending: true });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      setFragrances((data || []).map((row) => row.fragrance));
      setLoading(false);
    }

    loadFragrances();
  }, []);

  if (loading) {
    return <div className="p-6">Loading your boutique…</div>;
  }

  return (
    <div className="relative mx-auto max-w-6xl w-full">
      {/* 3:2 ratio box to match 1536x1024 background */}
      <div className="relative w-full" style={{ aspectRatio: '3 / 2' }}>
        {/* Background image lives in /public */}
        <Image
          src="/Fragrantique_boutiqueBackground.png"
          alt="Boutique Background"
          fill
          style={{ objectFit: 'cover' }}
          priority
        />

        {/* Optional soft veil to make bottles pop:
        <div className="absolute inset-0 bg-white/40" />
        */}

        {/* Bottles overlay (free-floating on shelves) */}
        <BoutiqueShelves fragrances={fragrances} />
      </div>
    </div>
  );
}
