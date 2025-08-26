import type { ReactNode } from 'react';
import HeaderBar from '@/components/HeaderBar';

export const metadata = {
  title: 'Brand Index • Fragrantique',
};

export default function BrandLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <HeaderBar />
        <main className="mx-auto max-w-6xl w-full px-3 py-4">
          {children}
        </main>
      </body>
    </html>
  );
}
