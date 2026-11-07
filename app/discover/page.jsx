
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  DISCOVERY_CATEGORIES,
  fetchDiscoveryFragrances,
  matchesCategory
} from '@/lib/fragrance-discovery';

export default function DiscoverPage() {
  const [fragrances, setFragrances] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const results = await fetchDiscoveryFragrances(
          supabase
        );

        if (active) setFragrances(results);
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to load fragrances.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => {
    return DISCOVERY_CATEGORIES
      .filter((category) =>
        `${category.name} ${category.description}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
      .map((category) => ({
        ...category,
        count: fragrances.filter((fragrance) =>
          matchesCategory(fragrance, category)
        ).length
      }));
  }, [fragrances, search]);

  return (
    <main className="min-h-screen bg-[#fcf8f6] text-[#5f463d]">
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="mb-10 text-center">
          <Link
            href="/"
            className="text-xs uppercase tracking-[0.3em] text-[#b38b7d]"
          >
            Fragrantique
          </Link>

          <p className="mt-8 text-xs uppercase tracking-[0.25em] text-[#b38b7d]">
            Your fragrance journey begins here
          </p>

          <h1 className="mt-4 font-serif text-4xl sm:text-6xl">
            Discover Your Scent
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[#8c6f64]">
            A world of beautiful fragrances awaits.
            Not sure where to begin? Follow your senses
            and explore the scents you already love.
          </p>

          <div className="mx-auto mt-7 h-px w-28 bg-[#d8b9a7]" />
        </div>

        <div className="mx-auto mb-10 max-w-md">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search scent categories..."
            className="w-full rounded-full border border-[#eadfd9] bg-white px-6 py-4 text-sm outline-none focus:border-[#c9879a]"
          />
        </div>

        {error && (
          <p role="alert" className="mb-8 text-center text-red-700">
            {error}
          </p>
        )}

        {loading && (
          <p className="mb-8 text-center text-[#8c6f64]">
            Discovering beautiful fragrances...
          </p>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/discover/${category.slug}`}
              className="group overflow-hidden rounded-[28px] border border-[#eadfd9] bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div
                className="flex h-44 items-center justify-center"
                style={{ backgroundColor: category.color }}
              >
                <span
                  className="text-7xl transition duration-300 group-hover:scale-110"
                  role="img"
                  aria-label={category.name}
                >
                  {category.emoji}
                </span>
              </div>

              <div className="px-6 py-6 text-center">
                <h2 className="font-serif text-2xl">
                  {category.name}
                </h2>

                <p className="mt-2 text-sm text-[#8c6f64]">
                  {category.description}
                </p>

                <p className="mt-4 text-xs uppercase tracking-[0.15em] text-[#b38b7d]">
                  {loading
                    ? 'Loading...'
                    : `${category.count} fragrances`}
                </p>

                <p className="mt-4 text-sm font-medium text-[#a97584]">
                  Explore Collection →
                </p>
              </div>
            </Link>
          ))}
        </div>

        {!loading && categories.length === 0 && (
          <p className="mt-10 text-center text-[#8c6f64]">
            No categories matched your search.
          </p>
        )}

        <div className="mt-16 text-center">
          <p className="font-serif text-xl italic text-[#8c6f64]">
            Every beautiful fragrance begins with curiosity.
          </p>

          <Link
            href="/"
            className="mt-6 inline-block rounded-full border border-[#d8b9a7] px-7 py-3 text-sm transition hover:bg-white"
          >
            Return to Fragrantique
          </Link>
        </div>
      </div>
    </main>
  );
}
