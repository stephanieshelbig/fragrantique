import type { ReactNode } from 'react';

export const metadata = {
  title: 'Brand Index • Fragrantique',
};

export default function BrandLayout({ children }: { children: ReactNode }) {
  // No <html> or <body> here, and no <HeaderBar />
  return (
    <main className="mx-auto max-w-6xl w-full px-3 py-4">
      {children}
    </main>
  );
}
