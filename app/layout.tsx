// app/layout.tsx
import './globals.css';
import HeaderBar from '@/components/HeaderBar';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <HeaderBar />
        {children}
      </body>
    </html>
  );
}
