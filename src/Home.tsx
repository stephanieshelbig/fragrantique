
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "2rem", fontFamily: "Georgia" }}>
      <h1 style={{ color: "#D4AF37" }}>Fragrantique Home</h1>
      <p style={{ color: "#888" }}>Welcome to your personal fragrance boutique.</p>
      <button
        onClick={() => {
          console.log("clicked");
          navigate('/@stephanie');
        }}
        style={{
          background: "#FADADD",
          border: "none",
          padding: "0.75rem 1.5rem",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "1rem",
          color: "#5A3E2B"
        }}
      >
        Go to Stephanie's Boutique
      </button>
    </div>
  );
}
