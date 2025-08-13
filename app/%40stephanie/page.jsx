"use client";
import { useState, useEffect, useRef } from "react";

export default function StephanieBoutique() {
  const [fragrances, setFragrances] = useState([]);
  const shelfY = 540; // adjust so bottles sit on bottom shelf in your screenshot
  const shelfSpacing = 120; // horizontal spacing between bottles
  const isDragging = useRef(false);
  const dragItem = useRef(null);
  const offset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // fetch fragrances from Supabase or your data source
    async function loadFragrances() {
      const res = await fetch("/api/get-fragrances");
      const data = await res.json();
      // Give each fragrance a starting position on the bottom shelf
      const positioned = data.map((f, i) => ({
        ...f,
        x: 300 + i * shelfSpacing,
        y: shelfY,
      }));
      setFragrances(positioned);
    }
    loadFragrances();
  }, []);

  const onMouseDown = (e, index) => {
    isDragging.current = true;
    dragItem.current = index;
    offset.current = {
      x: e.clientX - fragrances[index].x,
      y: e.clientY - fragrances[index].y,
    };
  };

  const onMouseMove = (e) => {
    if (!isDragging.current) return;
    const newFragrances = [...fragrances];
    newFragrances[dragItem.current] = {
      ...newFragrances[dragItem.current],
      x: e.clientX - offset.current.x,
      y: e.clientY - offset.current.y,
    };
    setFragrances(newFragrances);
  };

  const onMouseUp = () => {
    isDragging.current = false;
    dragItem.current = null;
  };

  return (
    <div
      style={{
        backgroundImage: "url('/background.jpg')", // replace with your background
        backgroundSize: "cover",
        backgroundPosition: "center",
        width: "100%",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
    >
      {fragrances.map((f, i) => (
        <img
          key={f.id}
          src={f.image_url_transparent || f.image_url}
          style={{
            position: "absolute",
            left: f.x,
            top: f.y,
            width: "80px",
            cursor: "grab",
            userSelect: "none",
          }}
          onMouseDown={(e) => onMouseDown(e, i)}
        />
      ))}
    </div>
  );
}
