// app/%40stephanie/page.jsx
'use client';
import dynamic from 'next/dynamic';

const UserPage = dynamic(() => import('../u/[username]/page').then(m => m.default), { ssr: false });

export default function StephaniePage() {
  // Reuse the universal page by pretending params
  const params = { username: 'stephanie' };
  return <UserPage params={params} />;
}
