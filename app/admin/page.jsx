'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single();
        if (!error && data?.is_admin) setIsAdmin(true);
      }
      setLoading(false);
    }
    checkAdmin();
  }, []);

  if (loading) return <div className="p-6">Loading…</div>;
  if (!isAdmin) return <div className="p-6">Unauthorized</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <p>This is where admin tools will go.</p>
    </div>
  );
}
