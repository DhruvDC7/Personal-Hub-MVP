"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      });
    } catch (_) {
      // no-op in non-browser env
    }
  }, [pathname]);

  return null;
}
