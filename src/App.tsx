
import React, { useState } from 'react';

export default function App() {
  const [fragrances, setFragrances] = useState([
    {
      id: 1,
      name: 'Chanel No. 5',
      brand: 'Chanel',
      image: 'https://fimgs.net/mdimg/perfume/375x500.61.jpg'
    },
    {
      id: 2,
      name: 'Delina',
      brand: 'Parfums de Marly',
      image: 'https://fimgs.net/mdimg/perfume/375x500.37511.jpg'
    },
    {
      id: 3,
      name: 'Baccarat Rouge 540',
      brand: 'Maison Francis Kurkdjian',
      image: 'https://fimgs.net/mdimg/perfume/375x500.25167.jpg'
    }
  ]);

  function handleDragStart(e, index) {
    e.dataTransfer.setData('dragIndex', index.toString());
  }

  function handleDrop(e, dropIndex) {
    const dragIndex = parseInt(e.dataTransfer.getData('dragIndex'), 10);
    if (dragIndex === dropIndex) return;
    const updated = [...fragrances];
    const [moved] = updated.splice(dragIndex, 1);
    updated.splice(dropIndex, 0, moved);
    setFragrances(updated);
  }

  return (
    <div style={{
      background: '#FFFCF9',
      fontFamily: 'Georgia, serif',
      color: '#2C2C2C',
      padding: '2rem',
      minHeight: '100vh'
    }}>
      <h1 style={{ textAlign: 'center', color: '#D4AF37' }}>@stephanie's Boutique</h1>
      <p style={{ textAlign: 'center', color: '#555' }}>Drag and drop to rearrange your shelf</p>

      <div style={{
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: '2rem'
      }}>
        {fragrances.map((frag, index) => (
          <div
            key={frag.id}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, index)}
            style={{
              border: '1px solid #fce4ec',
              padding: '1rem',
              borderRadius: '10px',
              width: '200px',
              background: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              textAlign: 'center'
            }}
          >
            <img src={frag.image} alt={frag.name} style={{ width: '100%', borderRadius: '8px' }} />
            <h3 style={{ margin: '0.5rem 0', color: '#D4AF37' }}>{frag.name}</h3>
            <p style={{ fontSize: '0.9rem', color: '#888' }}>{frag.brand}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
