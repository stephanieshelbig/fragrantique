
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  getCategory,
  getFragranceImage,
  fetchDiscoveryFragrances,
  matchesCategory
} from '@/lib/fragrance-discovery';

const PAGE_SIZE = 24;

export default function DiscoveryCategoryPage() {
  const params = useParams();
  const slug = Array.isArray(params?.category)
    ? params.category[0]
    : params?.category;

  const category = getCategory(slug);

  const [fragrances, setFragrances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(1);

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

  const results = useMemo(() => {
    if (!category) return [];

    const filtered = fragrances.filter((fragrance) => {
      if (!matchesCategory(fragrance, category)) {
        return false;
      }

      const searchable = [
        fragrance.name,
        fragrance.brand
      ].join(' ').toLowerCase();

      return searchable.includes(search.toLowerCase());
    });

    return filtered.sort((a, b) => {
      if (sort === 'brand') {
        return (a.brand || '').localeCompare(b.brand || '');
      }

      if (sort === 'price-low') {
        return (
          (a.decant_price == null ? Infinity : Number(a.decant_price)) -
          (b.decant_price == null ? Infinity : Number(b.decant_price))
        );
      }

      if (sort === 'price-high') {
        return (
          (b.decant_price == null ? -Infinity : Number(b.decant_price)) -
          (a.decant_price == null ? -Infinity : Number(a.decant_price))
        );
      }

      return (a.name || '').localeCompare(b.name || '');
    });
  }, [fragrances, category, search, sort]);

  const totalPages = Math.ceil(results.length / PAGE_SIZE);

  const visible = results.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  function updateSearch(value) {
    setSearch(value);
    setPage(1);
  }

  function updateSort(value) {
    setSort(value);
    setPage(1);
  }

  if (!category) {
    return (
      <main className="min-h-screen bg-[#fcf8f6] px-6 py-20 text-center">
        <h1 className="font-serif text-3xl text-[#5f463d]">
          Category Not Found
        </h1>
        <Link
          href="/discover"
          className="mt-6 inline-block text-[#a97584] underline"
        >
          Explore all scent categories
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#fcf8f6] text-[#5f463d]">
      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        <Link
          href="/discover"
          className="text-sm text-[#a97584] hover:underline"
        >
          ← All Scent Categories
        </Link>

        <header className="mt-8 overflow-hidden rounded-[30px] border border-[#eadfd9] bg-white">
          <div
            className="flex flex-col items-center px-6 py-12 text-center"
            style={{ backgroundColor: category.color }}
          >
            <span className="text-6xl" role="img" aria-label={category.name}>
              {category.emoji}
            </span>

            <p className="mt-6 text-xs uppercase tracking-[0.25em] text-[#8c6f64]">
              Fragrantique Scent Discovery
            </p>

            <h1 className="mt-3 font-serif text-4xl sm:text-5xl">
              {category.name}
            </h1>

            <p className="mt-4 text-[#8c6f64]">
              {category.description}
            </p>

            <p className="mt-5 text-sm text-[#8c6f64]">
              {loading
                ? 'Loading fragrances...'
                : `${results.length} fragrances found`}
            </p>
          </div>
        </header>

        <section className="mt-8">
          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-md">
              <input
                type="search"
                value={search}
                onChange={(e) => updateSearch(e.target.value)}
                placeholder="Search fragrances or brands..."
                className="w-full rounded-full border border-[#eadfd9] bg-white px-5 py-3 text-sm outline-none focus:border-[#c9879a]"
              />
            </div>

            <select
              value={sort}
              onChange={(e) => updateSort(e.target.value)}
              className="rounded-full border border-[#eadfd9] bg-white px-5 py-3 text-sm outline-none focus:border-[#c9879a]"
            >
              <option value="name">Name A–Z</option>
              <option value="brand">Brand A–Z</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>

          {error && (
            <p role="alert" className="mb-6 text-red-700">
              {error}
            </p>
          )}

          {loading ? (
            <p className="py-16 text-center text-[#8c6f64]">
              Finding your perfect fragrances...
            </p>
          ) : (
            <>
              {visible.length === 0 && (
                <p className="py-16 text-center text-[#8c6f64]">
                  No fragrances found. Try another search.
                </p>
              )}

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {visible.map((fragrance) => (
                  <Link
                    key={fragrance.id}
                    href={`/fragrance/${fragrance.id}`}
                    className="group overflow-hidden rounded-2xl border border-[#eadfd9] bg-white p-3 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="flex aspect-square items-center justify-center rounded-xl bg-[#fdf9f7] p-3">
                      <img
                        src={getFragranceImage(fragrance)}
                        alt={fragrance.name || 'Fragrance'}
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/bottle-placeholder.png';
                        }}
                        className="h-full w-full object-contain transition duration-300 group-hover:scale-105"
                      />
                    </div>

                    <div className="px-1 pb-2 pt-4 text-center">
                      <p className="text-xs uppercase tracking-wider text-[#b38b7d]">
                        {fragrance.brand}
                      </p>

                      <h2 className="mt-2 min-h-[44px] font-serif text-base leading-snug">
                        {fragrance.name}
                      </h2>

                      {fragrance.decant_price != null && (
                        <p className="mt-2 text-sm text-[#8c6f64]">
                          From ${Number(fragrance.decant_price).toFixed(2)}
                        </p>
                      )}

                      
<div className="mt-3 flex flex-wrap justify-center gap-1">
  {(Array.isArray(fragrance.accords)
    ? fragrance.accords
    : typeof fragrance.accords === 'string'
      ? (() => {
          try {
            return JSON.parse(fragrance.accords);
          } catch {
            return [];
          }
        })()
      : []
  ).map((accord, index) => {
    const accordName =
      typeof accord === 'string'
        ? accord
        : accord?.name;

    if (!accordName) return null;

    return (
      <span
        key={`${accordName}-${index}`}
        className={`rounded-full px-2 py-1 text-[10px] font-medium ${
          index === 0
            ? 'bg-[#f4dfe6] text-[#79575d]'
            : 'bg-[#f7f1ed] text-[#8c6f64]'
        }`}
      >
        {accordName}
      </span>
    );
  })}
</div>

                    </div>
                  </Link>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-12 flex items-center justify-center gap-5">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => {
                      setPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="rounded-full border border-[#eadfd9] bg-white px-5 py-3 text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <span className="text-sm text-[#8c6f64]">
                    Page {page} of {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => {
                      setPage((p) => Math.min(totalPages, p + 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="rounded-full border border-[#eadfd9] bg-white px-5 py-3 text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <div className="mt-16 border-t border-[#eadfd9] pt-10 text-center">
          <p className="font-serif text-xl italic text-[#8c6f64]">
            Your next favorite fragrance may be just one discovery away.
          </p>

          <Link
            href="/discover"
            className="mt-6 inline-block rounded-full border border-[#d8b9a7] px-7 py-3 text-sm hover:bg-white"
          >
            Explore More Scent Families
          </Link>
        </div>
      </div>
    </main>
  );
}
