
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import BoutiqueShelves from '@/components/BoutiqueShelves';

export default function StephanieBoutique() {
  const [fragrances, setFragrances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', 'stephanie')
        .single();
      if (profileErr || !profileData) {
        console.error(profileErr || 'No profile');
        setLoading(false);
        return;
      }

      const { data: fragData, error: fragErr } = await supabase
        .from('user_fragrances')
        .select('fragrance:fragrances(*)')
        .eq('user_id', profileData.id)
        .order('position', { ascending: true });

      if (fragErr) {
        console.error(fragErr);
      } else {
        setFragrances(fragData.map(f => f.fragrance));
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="relative w-full h-full" style={{
      backgroundImage: 'url(/Fragrantique_boutiqueBackground.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      minHeight: '100vh',
      overflow: 'hidden'
    }}>
      {!loading && <BoutiqueShelves fragrances={fragrances} />}
    </div>
  );
}
