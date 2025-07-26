
import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div style={{ padding: "2rem", fontFamily: "Georgia" }}>
      <h1 style={{ color: "#D4AF37" }}>Fragrantique Home</h1>
      <p style={{ color: "#888" }}>Welcome to your personal fragrance boutique.</p>
      <Link to="/@stephanie" style={{ color: "#FADADD" }}>Go to Stephanie's Boutique</Link>
    </div>
  );
}
