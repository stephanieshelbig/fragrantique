"use client";

import { useEffect, useState, useRef } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Image from "next/image";
import { Rnd } from "react-rnd";

const supabase = createClientComponentClient();

export default function UserBoutique({ params }) {
  const username = decodeURIComponent(params.username);
  const [brands, setBrands] = useState([]);
  const [positions, setPositions] = useState({});
  const [session, setSession] = useState(null);
  const rootRef = useRef(null);

  // Load session and brand reps
  useEffect(() => {
    const getData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);

      const { data, error } = await supabase
        .from("fragrances")
        .select("id, brand, name, image_url_transparent")
        .order("brand", { ascending: true });

      if (!error && data) {
        // one fragrance per brand
        const grouped = {};
        data.forEach((f) => {
          if (!grouped[f.brand]) grouped[f.brand] = f;
        });
        setBrands(Object.values(grouped));
      }
    };
    getData();
  }, [username]);

  // Save position when dragging
  const savePosition = async (brandKey, xPct, yPct) => {
    setPositions((prev) => ({
      ...prev,
      [brandKey]: { xPct, yPct },
    }));

    await supabase.from("brand_positions").upsert({
      username,
      brand: brandKey,
      x_pct: xPct,
      y_pct: yPct,
    });
  };

  return (
    <div className="relative w-full h-screen bg-[#fdfaf5]">
      <Image
        src="/Fragrantique_boutiqueBackground.png"
        alt="Boutique shelves"
        fill
        priority
        className="object-cover"
      />

      {brands.map((f, i) => {
        const pos = positions[f.brand] || { xPct: 10 + i * 10, yPct: 70 };
        return (
          <Rnd
            key={f.id}
            bounds="parent"
            default={{
              x: `${pos.xPct}%`,
              y: `${pos.yPct}%`,
              width: 100,
              height: "auto",
            }}
            onDragStop={(e, d) => {
              const rect = rootRef.current?.getBoundingClientRect();
              if (rect) {
                const xPct = (d.x / rect.width) * 100;
                const yPct = (d.y / rect.height) * 100;
                savePosition(f.brand, xPct, yPct);
              }
            }}
            enableResizing={false}
          >
            <Image
              src={f.image_url_transparent || f.image_url}
              alt={f.name}
              width={100}
              height={100}
              className="object-contain"
            />
          </Rnd>
        );
      })}
    </div>
  );
}
