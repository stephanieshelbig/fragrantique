
import React from 'react';
import { useParams } from 'react-router-dom';

export default function Boutique() {
  const { username } = useParams();

  return (
    <div style={{ padding: "2rem", fontFamily: "Georgia" }}>
      <h1 style={{ color: "#D4AF37" }}>@{username}'s Boutique</h1>
      <p style={{ color: "#888" }}>Fragrances coming soon...</p>
    </div>
  );
}
