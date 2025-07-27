
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from './auth/useSession';

export default function Home() {
  const navigate = useNavigate();
  const { session, signInWithGoogle, signOut } = useSession();

  const handleClick = () => {
    if (session) {
      const username = session.user.user_metadata.username || "my-boutique";
      navigate(`/${username}`);
    } else {
      signInWithGoogle();
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Georgia" }}>
      <h1 style={{ color: "#D4AF37" }}>Fragrantique Home</h1>
      <p style={{ color: "#888" }}>Welcome to your personal fragrance boutique.</p>
      <button
        onClick={handleClick}
        style={{
          background: "#FADADD",
          border: "none",
          padding: "0.75rem 1.5rem",
          borderRadius: "8px",
          cursor: "pointer",
          fontSize: "1rem",
          color: "#5A3E2B",
          marginTop: "1rem"
        }}
      >
        {session ? "Go to My Boutique" : "Sign In with Google"}
      </button>
      {session && (
        <button
          onClick={signOut}
          style={{
            background: "white",
            border: "1px solid #ccc",
            padding: "0.5rem 1rem",
            marginTop: "1rem",
            display: "block"
          }}
        >
          Log Out
        </button>
      )}
    </div>
  );
}
