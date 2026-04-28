import type { ReactNode } from 'react';

export const metadata = {
  title: 'Cart • Fragrantique',
};

export default function CartLayout({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto max-w-6xl w-full px-3 py-4">
      {children}
    </main>
  );
}
