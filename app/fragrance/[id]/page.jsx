'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

function dollarsToCents(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/[^0-9.]/g, ''));
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100);
}

function centsToDollars(c) {
  if (c == null) return '';
  return (Number(c) / 100).toFixed(2);
}

export default function FragranceDetail({ params }) {
  const id = decodeURIComponent(params.id || '');

  const [viewer, setViewer] = useState(null);
  const [owner, setOwner] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [frag, setFrag] = useState(null);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  const [currentImage, setCurrentImage] = useState(0);
  const [imageUrl2, setImageUrl2] = useState('');
  const [imageUrl3, setImageUrl3] = useState('');

  // Buyer UI
  const [selectedId, setSelectedId] = useState('');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  // Admin add/edit option
  const [newLabel, setNewLabel] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newSize, setNewSize] = useState('');
  const [newCurrency, setNewCurrency] = useState('usd');
  const [newQuantity, setNewQuantity] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg('');

      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user || null;
      setViewer(user);

      if (user?.id) {
        const { data: myProf } = await supabase
          .from('profiles')
          .select('id, is_admin')
          .eq('id', user.id)
          .maybeSingle();

        setIsAdmin(!!myProf?.is_admin);
      } else {
        setIsAdmin(false);
      }

      const { data: ownerProf } = await supabase
        .from('profiles')
        .select('id, username, is_admin')
        .eq('username', 'stephanie')
        .maybeSingle();

      setOwner(ownerProf || null);
      setIsOwner(!!(user && ownerProf && user.id === ownerProf.id));

      const { data: f } = await supabase
        .from('fragrances')
        .select(
          'id, brand, name, image_url, image_url_transparent, image_url_2, image_url_3, wikiparfum_url, notes'
        )
        .eq('id', id)
        .maybeSingle();

      setFrag(f || null);
      setImageUrl2(f?.image_url_2 || '');
      setImageUrl3(f?.image_url_3 || '');
      setCurrentImage(0);

      try {
        const { data: ds, error: de } = await supabase
          .from('decants')
          .select('id, label, price_cents, size_ml, currency, in_stock, quantity')
          .eq('fragrance_id', id)
          .order('size_ml', { ascending: true });

        if (!de && Array.isArray(ds)) {
          const mapped = ds.map((d) => ({
            ...d,
            currency: (d.currency || 'usd').toLowerCase(),
            in_stock: d.in_stock ?? true,
            quantity: (d.quantity ?? null) === null ? null : Number(d.quantity),
          }));

          setOptions(mapped);
          if (!selectedId && mapped.length) setSelectedId(String(mapped[0].id));
        } else {
          setOptions([]);
        }
      } catch {
        setOptions([]);
      }

      setLoading(false);
    })();
  }, [id]);

  const displayName = frag ? `${frag.brand || ''} — ${frag.name || ''}`.trim() : 'Fragrance';

  const galleryImages = useMemo(() => {
    const main = frag?.image_url_transparent || frag?.image_url || '/bottle-placeholder.png';

    return [
      {
        src: main,
        label: 'Main photo',
      },
      frag?.image_url_2
        ? {
            src: frag.image_url_2,
            label: 'Photo 2',
          }
        : null,
      frag?.image_url_3
        ? {
            src: frag.image_url_3,
            label: 'Photo 3',
          }
        : null,
    ].filter(Boolean);
  }, [frag]);

  const selectedOpt = useMemo(
    () => options.find((o) => String(o.id) === String(selectedId)),
    [options, selectedId]
  );

  const canAdmin = isOwner || isAdmin;

  function goPrevImage() {
    if (!galleryImages.length) return;
    setCurrentImage((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
  }

  function goNextImage() {
    if (!galleryImages.length) return;
    setCurrentImage((prev) => (prev + 1) % galleryImages.length);
  }

  function openImageInNewTab(src) {
    if (!src) return;
    window.open(src, '_blank', 'noopener,noreferrer');
  }

  async function saveExtraImages() {
    if (!canAdmin || !frag?.id) {
      setMsg('Not authorized');
      return;
    }

    const { error } = await supabase
      .from('fragrances')
      .update({
        image_url_2: imageUrl2.trim() || null,
        image_url_3: imageUrl3.trim() || null,
      })
      .eq('id', frag.id);

    if (error) {
      setMsg(error.message);
      return;
    }

    setFrag((prev) =>
      prev
        ? {
            ...prev,
            image_url_2: imageUrl2.trim() || null,
            image_url_3: imageUrl3.trim() || null,
          }
        : prev
    );

    setCurrentImage(0);
    setMsg('Images saved ✓');
  }

  // ---------- CART ----------
  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem('cart_v1') || '[]');
    } catch {
      return [];
    }
  }

  function saveCart(arr) {
    localStorage.setItem('cart_v1', JSON.stringify(arr));
  }

  function handleAddToCart() {
    setMsg('');
    setAdded(false);

    const opt = selectedOpt || options.find((o) => o.in_stock) || null;

    if (!opt) {
      setMsg('Please select an option that is in stock.');
      return;
    }

    if (!opt.price_cents || opt.price_cents <= 0) {
      setMsg('This option is not available for purchase right now.');
      return;
    }

    const q = Math.max(1, parseInt(qty, 10) || 1);

    if (opt.quantity !== null && typeof opt.quantity === 'number') {
      const cart = loadCart();
      const alreadyInCart = cart
        .filter((i) => String(i.option_id) === String(opt.id))
        .reduce((sum, i) => sum + (parseInt(i.quantity, 10) || 0), 0);

      const remaining = Math.max(0, Number(opt.quantity) - alreadyInCart);

      if (remaining <= 0) {
        setMsg(`"${opt.label}" is already at the limit in your cart (${alreadyInCart}/${opt.quantity}).`);
        return;
      }

      if (q > remaining) {
        setMsg(`Only ${remaining} left for "${opt.label}" (you already have ${alreadyInCart} in your cart).`);
        return;
      }
    }

    const item = {
      name: `${displayName} (${opt.label})`,
      quantity: q,
      unit_amount: opt.price_cents,
      currency: opt.currency || 'usd',
      fragrance_id: frag?.id,
      option_id: opt.id,
    };

    const cart = loadCart();
    cart.push(item);
    saveCart(cart);
    setAdded(true);
  }

  // ---------- ADMIN: manage options ----------
  async function saveOption(row) {
    if (!canAdmin || !owner?.id || !frag?.id) {
      setMsg('Not authorized');
      return;
    }

    const up = {
      id: row.id || undefined,
      fragrance_id: frag.id,
      seller_user_id: owner.id,
      label: row.label?.trim() || 'Option',
      price_cents:
        typeof row.price_cents === 'number'
          ? row.price_cents
          : dollarsToCents(row.price_dollars || ''),
      size_ml: row.size_ml ? Number(row.size_ml) : null,
      currency: (row.currency || 'usd').toLowerCase(),
      in_stock: !!row.in_stock,
      quantity:
        row.quantity === '' || row.quantity === null || row.quantity === undefined
          ? null
          : Math.max(0, Number(row.quantity) || 0),
    };

    const { data, error } = await supabase
      .from('decants')
      .upsert(up)
      .select('id, label, price_cents, size_ml, currency, in_stock, quantity')
      .maybeSingle();

    if (error) {
      setMsg(error.message);
      return;
    }

    setOptions((prev) => prev.map((o) => (o.id === row.id ? { ...o, ...data } : o)));
    if (!selectedId) setSelectedId(String(data.id));
    setMsg('Option saved ✓');
  }

  async function addNewOption() {
    if (!canAdmin || !owner?.id || !frag?.id) {
      setMsg('Not authorized');
      return;
    }

    const payload = {
      fragrance_id: frag.id,
      seller_user_id: owner.id,
      label: newLabel?.trim() || 'Option',
      price_cents: dollarsToCents(newPrice),
      size_ml: newSize ? Number(newSize) : null,
      currency: newCurrency.toLowerCase(),
      in_stock: true,
      quantity:
        newQuantity === '' || newQuantity === null || newQuantity === undefined
          ? null
          : Math.max(0, Number(newQuantity) || 0),
    };

    const { data, error } = await supabase
      .from('decants')
      .insert(payload)
      .select('id, label, price_cents, size_ml, currency, in_stock, quantity')
      .maybeSingle();

    if (error) {
      setMsg(error.message);
      return;
    }

    setOptions((prev) => [...prev, data]);
    setSelectedId(String(data.id));
    setNewLabel('');
    setNewPrice('');
    setNewSize('');
    setNewCurrency('usd');
    setNewQuantity('');
    setMsg('Added option ✓');
  }

  async function deleteOption(idToDelete) {
    if (!canAdmin) return;

    const { error } = await supabase.from('decants').delete().eq('id', idToDelete);

    if (error) {
      setMsg(error.message);
      return;
    }

    setOptions((prev) => prev.filter((o) => o.id !== idToDelete));

    if (String(selectedId) === String(idToDelete)) {
      const next = options.filter((o) => o.id !== idToDelete);
      setSelectedId(next.length ? String(next[0].id) : '');
    }

    setMsg('Deleted option ✓');
  }

  if (loading) return <div className="p-6">Loading…</div>;

  if (!frag) {
    return (
      <div className="p-6">
        <div className="mb-3">Fragrance not found.</div>
        <Link href="/brand" className="underline">
          ← Back to Brand index
        </Link>
      </div>
    );
  }

  const activeImage = galleryImages[currentImage]?.src || '/bottle-placeholder.png';

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Local page bar */}
      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {frag.wikiparfum_url && (
            <a
              href={frag.wikiparfum_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[#d6c6a5] bg-gradient-to-r from-white via-[#fffaf2] to-white px-4 py-1.5 text-sm font-medium text-[#7a5c2e] shadow-sm transition hover:-translate-y-[1px] hover:bg-[#fffaf0] hover:shadow"
              title="View fragrance on Wikiparfum in new tab"
            >
              <span className="text-base leading-none">✦</span>
              <span>View on Wikiparfum</span>
              <span className="text-xs opacity-70">↗</span>
            </a>
          )}

          {canAdmin && (
            <Link
              href={`/fragrance/${frag.id}/edit`}
              className="text-sm rounded-full border px-3 py-1.5 hover:bg-gray-50 transition"
              title="Edit this fragrance"
            >
              Edit
            </Link>
          )}
        </div>
      </div>

      {/* Full-width title + notes */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold leading-tight">{frag.brand}</h1>
          <div className="text-lg">{frag.name}</div>
        </div>

        <div className="p-4 rounded border bg-white">
          <div className="font-medium">Fragrance Notes</div>
          <div className={`mt-1 text-sm whitespace-pre-wrap ${frag.notes ? '' : 'opacity-60'}`}>
            {frag.notes || 'No notes provided.'}
          </div>
        </div>
      </div>

      {/* Bottle + purchase panel row */}
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        <div className="w-full md:w-64 mx-auto md:mx-0 space-y-4">
          {/* Luxury Carousel */}
          <div className="relative overflow-hidden rounded-[2rem] border border-[#eadfcb] bg-gradient-to-b from-white via-[#fffaf3] to-[#f7efe2] shadow-[0_18px_45px_rgba(90,64,32,0.14)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),transparent_55%)]" />
            <div className="pointer-events-none absolute left-5 right-5 top-5 h-px bg-gradient-to-r from-transparent via-[#d6c6a5] to-transparent opacity-70" />

            <div className="relative flex aspect-[3/5] items-center justify-center p-7">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={activeImage}
                src={activeImage}
                alt={frag.name}
                onClick={() => openImageInNewTab(activeImage)}
                className="max-h-full max-w-full object-contain transition-all duration-500 ease-out cursor-zoom-in"
                style={{
                  mixBlendMode: 'multiply',
                  filter: 'drop-shadow(0 16px 22px rgba(0,0,0,0.18))',
                }}
                onError={(e) => {
                  const el = e.currentTarget;
                  if (!el.dataset.fallback) {
                    el.dataset.fallback = '1';
                    el.src = '/bottle-placeholder.png';
                  }
                }}
              />

              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goPrevImage}
                    className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-[#d8c69f] bg-white/85 text-[#6f552c] shadow-sm backdrop-blur transition hover:-translate-x-0.5 hover:bg-white"
                    aria-label="Previous fragrance photo"
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    onClick={goNextImage}
                    className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-[#d8c69f] bg-white/85 text-[#6f552c] shadow-sm backdrop-blur transition hover:translate-x-0.5 hover:bg-white"
                    aria-label="Next fragrance photo"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            {galleryImages.length > 1 && (
              <div className="relative flex items-center justify-center gap-2 pb-4">
                {galleryImages.map((img, index) => (
                  <button
                    key={`${img.src}-${index}`}
                    type="button"
                    onClick={() => setCurrentImage(index)}
                    className={`h-2 rounded-full transition-all ${
                      currentImage === index
                        ? 'w-7 bg-[#9b7a3d]'
                        : 'w-2 bg-[#d9c9aa] hover:bg-[#b99b64]'
                    }`}
                    aria-label={`View fragrance photo ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Thumbnail row */}
          {galleryImages.length > 1 && (
            <div className="flex justify-center gap-2">
              {galleryImages.map((img, index) => (
                <button
                  key={`thumb-${img.src}-${index}`}
                  type="button"
                  onClick={() => setCurrentImage(index)}
                  className={`h-14 w-14 overflow-hidden rounded-2xl border bg-white p-1 shadow-sm transition ${
                    currentImage === index
                      ? 'border-[#9b7a3d] ring-2 ring-[#eadfcb]'
                      : 'border-[#eadfcb] hover:border-[#c8ae7a]'
                  }`}
                  title={img.label}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.src}
                    alt={img.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      openImageInNewTab(img.src);
                    }}
                    className="h-full w-full object-contain cursor-zoom-in"
                    style={{ mixBlendMode: 'multiply' }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
