'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminFragrancesPage() {
  const [fragrances, setFragrances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('fragrances')
        .select('id, brand, name, image_url')
        .order('brand', { ascending: true });
      if (!error && data) {
        setFragrances(data);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="p-6">Loading fragrances…</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Fragrances</h1>
        {/* NEW Add Fragrance Link */}
        <Link
          href="/add"
          className="px-4 py-2 rounded bg-pink-600 text-white hover:bg-pink-700"
        >
          + Add Fragrance
        </Link>
      </div>

      {/* Fragrance list */}
      {fragrances.length === 0 ? (
        <div className="text-gray-600">No fragrances found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fragrances.map((f) => (
            <div
              key={f.id}
              className="border rounded p-3 flex gap-3 items-center bg-white shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.image_url || '/bottle-placeholder.png'}
                alt={f.name}
                className="w-12 h-12 object-contain"
              />
              <div>
                <div className="font-medium">{f.name}</div>
                <div className="text-sm text-gray-600">{f.brand}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
