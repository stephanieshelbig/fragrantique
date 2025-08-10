'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import FragranceShelf from '@/components/FragranceShelf';

export default function StephanieBoutique() {
  const [fragrances, setFragrances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFragrances() {
      // Get Stephanie's user ID
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

      // Get all fragrances linked to Stephanie
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

      // Extract fragrance objects
      const fragranceList = data.map((f) => f.fragrance);
      setFragrances(fragranceList);
      setLoading(false);
    }

    loadFragrances();
  }, []);

  if (loading) {
    return <div className="p-6">Loading your boutique…</div>;
  }

  return (
    <div className="p-6">
      <FragranceShelf fragrances={fragrances} />
    </div>
  );
}
