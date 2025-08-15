"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const tabs = [
  {
    key: "home",
    href: "/",
    label: "Home",
    icon: (active) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`h-5 w-5 ${active ? "opacity-100" : "opacity-80"}`}
        aria-hidden="true"
      >
        <path d="M12 3 2 12h3v9h6v-6h2v6h6v-9h3L12 3Z" />
      </svg>
    ),
  },
  {
    key: "documents",
    href: "/transactions",
    label: "Docs",
    icon: (active) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`h-5 w-5 ${active ? "opacity-100" : "opacity-80"}`}
        aria-hidden="true"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm1 7V3.5L19.5 9H15ZM8 13h8v2H8v-2Zm0 4h8v2H8v-2Zm0-8h5v2H8V9Z" />
      </svg>
    ),
  },
  {
    key: "profile",
    href: "/profile",
    label: "Profile",
    icon: (active) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`h-5 w-5 ${active ? "opacity-100" : "opacity-70"}`}
        aria-hidden="true"
      >
        <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.33 0-8 2.17-8 5v3h16v-3c0-2.83-3.67-5-8-5Z" />
      </svg>
    ),
  },
  {
    key: "feedback",
    href: "/feedback",
    label: "Feedback",
    icon: (active, feedbackOpen) => (
      <span className={`inline-flex items-center justify-center border ${active || feedbackOpen ? 'border-red-500' : 'border-red-500/70'} p-1 rounded-[4px]`} aria-hidden="true">
        {/* Warning triangle icon */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`h-5 w-5 ${active ? "opacity-100" : "opacity-80"}`}>
          <path d="M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2V8h2v6Z" />
        </svg>
      </span>
    ),
  }
];

function isActive(pathname, href) {
  if (!pathname) return false;
  // consider a tab active if pathname matches or starts with the tab route
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const containerRef = useRef(null);
  const itemRefs = useRef({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const hidden = useMemo(() => {
    // Hide on auth pages and large screens via CSS; this is an extra route-level guard
    if (!pathname) return false;
    const hideOn = ["/login", "/api", "/error"];
    return hideOn.some((p) => pathname.startsWith(p));
  }, [pathname]);

  // Sync icon state with modal via global events
  useEffect(() => {
    if (hidden) return; // Early return inside the effect if hidden
    
    const onOpen = () => setFeedbackOpen(true);
    const onClose = () => setFeedbackOpen(false);
    try {
      window.addEventListener('open-feedback', onOpen);
      window.addEventListener('close-feedback', onClose);
    } catch {}
    return () => {
      try {
        window.removeEventListener('open-feedback', onOpen);
        window.removeEventListener('close-feedback', onClose);
      } catch {}
    };
  }, [hidden]);

  // Compute sliding indicator position on route or feedback state change
  useEffect(() => {
    if (hidden) return;
    const container = containerRef.current;
    if (!container) return;

    const activeKey = feedbackOpen
      ? "feedback"
      : (tabs.find((t) => isActive(pathname, t.href))?.key || tabs[0].key);
    const activeEl = itemRefs.current[activeKey];
    if (!activeEl) return;

    const parentRect = container.getBoundingClientRect();
    const rect = activeEl.getBoundingClientRect();
    setIndicator({ left: rect.left - parentRect.left, width: rect.width });
  }, [pathname, feedbackOpen, hidden]);

  // Keep indicator aligned on resize
  useEffect(() => {
    function handleResize() {
      if (hidden) return;
      const container = containerRef.current;
      if (!container) return;
      const activeKey = feedbackOpen
        ? "feedback"
        : (tabs.find((t) => isActive(pathname, t.href))?.key || tabs[0].key);
      const activeEl = itemRefs.current[activeKey];
      if (!activeEl) return;
      const parentRect = container.getBoundingClientRect();
      const rect = activeEl.getBoundingClientRect();
      setIndicator({ left: rect.left - parentRect.left, width: rect.width });
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pathname, feedbackOpen, hidden]);

  return (
    <nav
      className="md:hidden fixed z-50 left-1/2 -translate-x-1/2"
      style={{
        bottom: `calc(12px + env(safe-area-inset-bottom))`,
      }}
      aria-label="Bottom Navigation"
    >
      <div
        ref={containerRef}
        className="relative flex items-center justify-between gap-2 w-[90vw] max-w-[600px] h-16 px-2 rounded-[3rem] overflow-hidden
                   bg-black/30 text-white backdrop-blur-[15px]
                   border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
      >
        {/* Sliding indicator */}
        <span
          className="absolute top-2 bottom-2 left-0 rounded-2xl bg-white/10 transition-all duration-300 ease-out"
          style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
          aria-hidden="true"
        />
        {tabs.map((tab) => {
          const active = isActive(pathname, tab.href);
          const isFeedback = tab.key === "feedback";
          return (
            <Link
              key={tab.key}
              href={tab.href}
              ref={(el) => { if (el) itemRefs.current[tab.key] = el; }}
              aria-label={tab.label}
              onClick={(e) => {
                if (isFeedback) {
                  e.preventDefault();
                  // Admins go to admin feedback page; users toggle modal
                  if (user?.role === 'admin') {
                    try { if (feedbackOpen) window.dispatchEvent(new Event('close-feedback')); } catch {}
                    router.push('/admin/feedback');
                  } else {
                    try {
                      if (feedbackOpen) {
                        window.dispatchEvent(new Event('close-feedback'));
                      } else {
                        window.dispatchEvent(new Event('open-feedback'));
                      }
                    } catch {}
                  }
                } else if (feedbackOpen) {
                  // Close feedback if open when navigating to other tabs
                  try { window.dispatchEvent(new Event('close-feedback')); } catch {}
                }
              }}
              className="relative z-10 group flex-1 h-12 rounded-xl flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              aria-current={(active || (isFeedback && feedbackOpen)) ? "page" : undefined}
            >
              <div
                className={`flex items-center justify-center gap-0 px-4 py-3 rounded-full transition-colors duration-200
                  ${(active || (isFeedback && feedbackOpen)) ? "text-[var(--colour-bg)]" : "text-white/90 hover:text-white"}`}
              >
                {tab.key === 'feedback' ? tab.icon(active || feedbackOpen, feedbackOpen) : tab.icon(active)}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
