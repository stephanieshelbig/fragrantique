'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import HeaderBar from '@/components/HeaderBar';

export default function ShowNavbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  // Keep hiding the header on the homepage, like before.
  // If you want it visible there too, just delete the next two lines.
  if (pathname === '/') return null;

  return <HeaderBar />;
}
