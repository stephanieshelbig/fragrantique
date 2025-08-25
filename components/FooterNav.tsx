"use client";

import Image from "next/image";
import Link from "next/link";

export default function FooterNav() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      <div className="relative mx-auto w-full max-w-[800px]"> 
        {/* scaled down from 1200px to 800px max */}
        <Image
          src="/Footer.png"
          alt="Fragrantique Footer Navigation"
          width={800}
          height={200}
          priority
          className="w-full h-auto select-none pointer-events-none"
        />

        {/* Clickable hotspots */}
        <div className="absolute inset-0">
          <Link
            href="/"
            aria-label="Home"
            className="absolute"
            style={{
              left: "10%",
              bottom: "12%",
              width: "15%",
              height: "25%",
            }}
          />
          <Link
            href="/brand"
            aria-label="Brands"
            className="absolute"
            style={{
              left: "32%",
              bottom: "12%",
              width: "18%",
              height: "25%",
            }}
          />
          <Link
            href="/chat"
            aria-label="Contact"
            className="absolute"
            style={{
              left: "55%",
              bottom: "12%",
              width: "18%",
              height: "25%",
            }}
          />
          <Link
            href="/cart"
            aria-label="Cart"
            className="absolute"
            style={{
              left: "78%",
              bottom: "12%",
              width: "14%",
              height: "25%",
            }}
          />
        </div>
      </div>
      {/* Spacer so bottles don’t overlap footer */}
      <div className="h-[80px]" />
    </div>
  );
}
