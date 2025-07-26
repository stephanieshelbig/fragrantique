
import React from 'react';

export default function App() {
  const user = {
    username: 'stephanie',
    name: 'Stephanie Helbig',
    bio: 'Welcome to my fragrance boutique.',
    profileImage: 'https://via.placeholder.com/100x100.png?text=👑',
    fragrances: [
      {
        name: 'Chanel No. 5',
        brand: 'Chanel',
        year: 1921,
        image: 'https://fimgs.net/mdimg/perfume/375x500.61.jpg',
        notes: ['aldehydes', 'jasmine', 'rose', 'sandalwood', 'vanilla'],
        accord: 'powdery, floral, woody',
        review: 'The timeless classic. Elegant, powdery, iconic.',
        decant: true,
      }
    ]
  };

  return (
    <div style={{
      background: '#FFFCF9',
      minHeight: '100vh',
      fontFamily: 'Georgia, serif',
      color: '#2C2C2C',
      padding: '2rem',
    }}>
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', color: '#D4AF37' }}>@{user.username}'s Boutique</h1>
        <img src={user.profileImage} alt="Profile" style={{ borderRadius: '50%' }} />
        <p style={{ marginTop: '0.5rem' }}>{user.name}</p>
        <p style={{ fontStyle: 'italic', color: '#555' }}>{user.bio}</p>
      </header>

      <main style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ color: '#D4AF37', marginBottom: '1rem' }}>My Fragrance Shelf</h2>
        {user.fragrances.map((frag, index) => (
          <div key={index} style={{
            display: 'flex',
            gap: '1rem',
            marginBottom: '2rem',
            padding: '1rem',
            background: '#ffffff',
            border: '1px solid #fce4ec',
            borderRadius: '10px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.05)'
          }}>
            <img src={frag.image} alt={frag.name} style={{ height: '120px', borderRadius: '8px' }} />
            <div>
              <h3 style={{ margin: 0 }}>{frag.name} by {frag.brand}</h3>
              <p style={{ fontSize: '0.9rem', color: '#777' }}>Released: {frag.year}</p>
              <p><strong>Notes:</strong> {frag.notes.join(', ')}</p>
              <p><strong>Accord:</strong> {frag.accord}</p>
              <p><em>{frag.review}</em></p>
              {frag.decant && (
                <button style={{
                  backgroundColor: '#FADADD',
                  color: '#2C2C2C',
                  border: '1px solid #D4AF37',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}>Purchase Decant</button>
              )}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
