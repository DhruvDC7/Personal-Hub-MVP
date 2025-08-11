"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function RouteScrollReset() {
  const pathname = usePathname();

  useEffect(() => {
    // Reset window scroll
    try { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); } catch { window.scrollTo(0, 0); }

    // Reset any marked scrollable containers
    const nodes = document.querySelectorAll('[data-scroll-reset="true"]');
    nodes.forEach((el) => {
      try {
        el.scrollTo({ top: 0, left: 0, behavior: "instant" });
      } catch {
        el.scrollTop = 0;
        el.scrollLeft = 0;
      }
    });
  }, [pathname]);

  return null;
}
