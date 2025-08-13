"use client";

import { useState, useEffect } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Image from "next/image";
import { Rnd } from "react-rnd";

export default function StephanieBoutique() {
  const supabase = createClientComponentClient();
  const [fragrances, setFragrances] = useState([]);
  const [editing, setEditing] = useState(false);
  const shelfY = 530; // <-- Adjusted to match bottom shelf height in your screenshot
  const startX = 250; // <-- First bottle X position
  const bottleSpacing = 180; // <-- Horizontal space between bottles

  useEffect(() => {
    async function loadFragrances() {
      const { data, error } = await supabase
        .from("user_fragrances")
        .select(`
          id,
          fragrance:fragrances (
            name,
            image_url_transparent
          ),
          x,
          y
        `)
        .eq("user_id", "stephanie"); // Replace with actual user id or logic

      if (error) console.error(error);

      // If coordinates are missing, place bottles horizontally along bottom shelf
      const arranged = data.map((item, index) => ({
        ...item,
        x: item.x ?? startX + index * bottleSpacing,
        y: item.y ?? shelfY
      }));

      setFragrances(arranged);
    }
    loadFragrances();
  }, []);

  async function savePositions() {
    for (const f of fragrances) {
      await supabase
        .from("user_fragrances")
        .update({ x: f.x, y: f.y })
        .eq("id", f.id);
    }
    setEditing(false);
  }

  return (
    <div
      style={{
        backgroundImage: `url('/Fragrantique_boutiqueBackground.png')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        height: "100vh",
        width: "100vw",
        position: "relative"
      }}
    >
      <button
        onClick={() => {
          if (editing) savePositions();
          else setEditing(true);
        }}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          zIndex: 10,
          background: "#fff",
          border: "1px solid #ccc",
          borderRadius: "5px",
          padding: "8px 12px"
        }}
      >
        {editing ? "Save arrangement" : "Arrange shelves"}
      </button>

      {fragrances.map((item, index) => {
        const imageUrl =
          item.fragrance.image_url_transparent ||
          item.fragrance.image_url;

        return (
          <Rnd
            key={item.id}
            size={{ width: 100, height: "auto" }}
            position={{ x: item.x, y: item.y }}
            onDragStop={(e, d) => {
              if (editing) {
                const updated = [...fragrances];
                updated[index] = { ...updated[index], x: d.x, y: d.y };
                setFragrances(updated);
              }
            }}
            disableDragging={!editing}
            enableResizing={false}
          >
            <Image
              src={imageUrl}
              alt={item.fragrance.name}
              width={100}
              height={150}
              style={{ objectFit: "contain" }}
            />
          </Rnd>
        );
      })}
    </div>
  );
}
