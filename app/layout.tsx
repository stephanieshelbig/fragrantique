import "./globals.css";
import type { Metadata } from "next";
import dynamic from "next/dynamic";

// Load the navbar *only on the client* to avoid server render errors.
const ShowNavbar = dynamic(() => import("@/components/ShowNavbar"), { ssr: false });

export const metadata: Metadata = {
  title: "Fragrantique",
  description: "Stephanie’s Fragrance Boutique",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#fdfcf9] text-gray-900">
        {/* Navbar appears on all pages except "/" */}
        <ShowNavbar />
        {children}
      </body>
    </html>
  );
}
