import "./globals.css";
import type { Metadata } from "next";
import ShowNavbar from "@/components/ShowNavbar";
import AuthHashHandler from "@/components/AuthHashHandler"; // ← add this

export const metadata: Metadata = {
  title: "Fragrantique",
  description: "Stephanie’s Fragrance Boutique",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#fdfcf9] text-gray-900">
        <AuthHashHandler />   {/* ← add this */}
        <ShowNavbar />
        {children}
      </body>
    </html>
  );
}
