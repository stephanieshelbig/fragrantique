"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

export default function ShowNavbar() {
  const pathname = usePathname();
  // Hide navbar only on the homepage
  if (pathname === "/") return null;
  return <Navbar />;
}
