import type { ReactNode } from 'react';
import HeaderBar from '@/components/HeaderBar';

export const metadata = {
  title: 'Brand Index • Fragrantique',
};

// No <html> or <body> here — only in app/layout.tsx
export default function BrandLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* If HeaderBar is a client component, this is fine. */}
      <HeaderBar />
      <main className="mx-auto max-w-6xl w-full px-3 py-4">
        {children}
      </main>
    </>
  );
}
