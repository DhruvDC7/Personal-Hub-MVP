"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
    href: "/documents",
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
      feedbackOpen ? (
        // Close icon when feedback modal is open
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`h-5 w-5 ${active ? "opacity-100" : "opacity-80"}`} aria-hidden="true">
          <path d="M18.3 5.71 12 12.01l-6.29-6.3-1.42 1.42L10.59 13.4l-6.3 6.29 1.42 1.42L12 14.83l6.29 6.29 1.42-1.41-6.3-6.3 6.3-6.29-1.41-1.42Z" />
        </svg>
      ) : (
        // Feedback bubble icon when closed
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`h-5 w-5 ${active ? "opacity-100" : "opacity-80"}`} aria-hidden="true">
          <path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Zm-3 9H7V9h10v2Zm0-4H7V5h10v2Zm-6 8H7v-2h4v2Z" />
        </svg>
      )
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
  const [feedbackOpen, setFeedbackOpen] = useState(false);

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

  return (
    <nav
      className="md:hidden fixed z-50 left-1/2 -translate-x-1/2"
      style={{
        bottom: `calc(12px + env(safe-area-inset-bottom))`,
      }}
      aria-label="Bottom Navigation"
    >
      <div
        className="flex items-center justify-between gap-2 w-[90vw] max-w-[600px] h-16 px-7 rounded-[3rem] overflow-hidden
                   bg-black/30 text-white backdrop-blur-[15px]
                   border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
      >
        {tabs.map((tab) => {
          const active = isActive(pathname, tab.href);
          const isFeedback = tab.key === "feedback";
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-label={tab.label}
              onClick={(e) => {
                if (isFeedback) {
                  e.preventDefault();
                  try {
                    if (feedbackOpen) {
                      window.dispatchEvent(new Event('close-feedback'));
                    } else {
                      window.dispatchEvent(new Event('open-feedback'));
                    }
                  } catch {}
                } else if (feedbackOpen) {
                  // Close feedback if open when navigating to other tabs
                  try { window.dispatchEvent(new Event('close-feedback')); } catch {}
                }
              }}
              className="group flex-1 h-12 rounded-xl flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              aria-current={active ? "page" : undefined}
            >
              <div
                className={`flex items-center justify-center gap-0 p-3 rounded-full transition-all duration-200
                  ${active ? "bg-[var(--colour-primary)] text-[var(--colour-bg)]" : "text-white/90 hover:bg-black/30"}`}
              >
                {tab.key === 'feedback' ? tab.icon(active, feedbackOpen) : tab.icon(active)}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
