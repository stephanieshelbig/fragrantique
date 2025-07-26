
import React from 'react';

export default function App() {
  return (
    <div style={{
      background: '#FFFCF9',
      minHeight: '100vh',
      fontFamily: 'Georgia, serif',
      color: '#2C2C2C',
      padding: '2rem',
    }}>
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 'bold',
          color: '#D4AF37'
        }}>
          Fragrantique
        </h1>
        <p style={{ fontSize: '1.2rem' }}>
          Your Personal Fragrance Boutique
        </p>
      </header>

      <main style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <p>Welcome, Stephanie! Your boutique will live here soon.</p>
        <p>Fragrance shelves, decants, reviews, and more — coming up!</p>
      </main>
    </div>
  );
}
