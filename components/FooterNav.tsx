"use client";

import Image from "next/image";
import Link from "next/link";

/**
 * Responsive, cropped, fixed footer:
 * - Removes top "white" padding area of Footer.png by masking with overflow:hidden
 * - Sits near the bottom with a small offset (BOTTOM_OFFSET)
 * - Clickable hotspots for HOME/BRANDS/CONTACT/CART
 *
 * Tweak CROP_TOP_PCT if you want to hide more/less of the top whitespace.
 * Tweak BOTTOM_OFFSET to move the whole footer up/down from the window edge.
 */

const BOTTOM_OFFSET = 22;     // px: lift the footer a bit to match your red-line
const MAX_WIDTH = 900;        // px: max width of footer on large screens
const CROP_TOP_PCT = 28;      // % of the image height to crop from the top (remove white band)

// Original image aspect (approx). If your Footer.png changed, adjust these.
const IMG_W = 900;
const IMG_H = 230;

// Visible height ratio after cropping (in terms of the original)
const VISIBLE_RATIO = (100 - CROP_TOP_PCT) / 100; // e.g. 72% of the height remains

export default function FooterNav() {
  return (
    <div
      className="fixed left-0 right-0 z-40"
      style={{ bottom: BOTTOM_OFFSET }}
    >
      {/* Responsive width; centered */}
      <div className="mx-auto w-[92vw] sm:w-[88vw] md:w-[84vw] max-w-[900px]">
        {/* Cropping frame: keeps only the lower part of the image visible */}
        <div
          className="relative overflow-hidden"
          // Maintain the visible aspect (width : visibleHeight)
          style={{
            // aspectRatio = (IMG_W) / (IMG_H * VISIBLE_RATIO)
            aspectRatio: `${IMG_W} / ${IMG_H * VISIBLE_RATIO}`,
            boxShadow: "0 -6px 18px rgba(0,0,0,0.08)",
            borderRadius: "8px",
          }}
        >
          {/* The real image, shifted up to hide the white band */}
          <Image
            src="/Footer.png"
            alt="Fragrantique Footer Navigation"
            fill
            sizes="(max-width: 920px) 92vw, 900px"
            priority
            className="object-cover"
            // We emulate the crop by translating the image up by CROP_TOP_PCT
            // Using object-cover + translateY + overflow-hidden on the parent.
            style={{
              transform: `translateY(-${CROP_TOP_PCT}%)`,
            }}
          />

          {/* Clickable hotspots as % of the visible frame */}
          <div className="absolute inset-0">
            {/* HOME */}
            <Link
              href="/"
              aria-label="Home"
              className="absolute"
              style={{
                left: "9.5%",
                bottom: "12%",
                width: "16%",
                height: "25%",
              }}
            />
            {/* BRANDS */}
            <Link
              href="/brand"
              aria-label="Brands"
              className="absolute"
              style={{
                left: "31%",
                bottom: "12%",
                width: "18%",
                height: "25%",
              }}
            />
            {/* CONTACT */}
            <Link
              href="/chat"
              aria-label="Contact"
              className="absolute"
              style={{
                left: "54%",
                bottom: "12%",
                width: "18%",
                height: "25%",
              }}
            />
            {/* CART */}
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
      </div>

      {/* Smaller spacer, since footer is near the bottom already */}
      <div className="h-[40px]" />
    </div>
  );
}
