"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Single flat list — never mix a mapped Links array with a trailing <a>,
 * or SSR/HMR can hydrate Join into the LLM tools slot (and vice versa).
 */
const NAV: {
  href: string;
  label: string;
  external?: boolean;
  desktopOnly?: boolean;
}[] = [
  { href: "/search", label: "Search" },
  { href: "/chat", label: "Chat" },
  { href: "/host", label: "Host" },
  { href: "/join", label: "Join" },
  {
    href: "/api/v1/llm/tools",
    label: "LLM tools",
    external: true,
    desktopOnly: true,
  },
];

export function SiteHeader() {
  const pathname = usePathname();
  /** Pathname styling only after mount → server HTML matches first client paint */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const onChat = mounted && pathname === "/chat";

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 md:px-6 md:pt-5">
      <div
        className={`pointer-events-auto flex w-full max-w-[var(--content-max)] items-center justify-between gap-4 rounded-[var(--radius-pill)] px-4 py-2.5 md:px-5 ${
          onChat
            ? "border border-[var(--hairline)] bg-[var(--surface)]/95 text-[var(--ink)] backdrop-blur-xl"
            : "surface-frost shadow-[0_1px_0_rgba(255,255,255,0.5)_inset]"
        }`}
      >
        <Link
          href="/"
          className="font-display text-[1.35rem] font-medium tracking-[-0.03em] text-[var(--ink)]"
        >
          Pellows
        </Link>
        <nav className="flex items-center gap-1 md:gap-2" aria-label="Primary">
          {NAV.map((item) => {
            const active = mounted && !item.external && pathname === item.href;
            const className = [
              "rounded-[var(--radius-pill)] px-3 py-1.5 text-[0.8125rem] font-medium tracking-[0.02em] transition-colors",
              item.desktopOnly ? "hidden sm:inline-flex" : "inline-flex",
              item.external
                ? "border border-[var(--hairline)] text-[var(--muted)] hover:border-[var(--hairline-strong)] hover:text-[var(--ink)]"
                : active
                  ? "bg-[var(--ink)] text-[var(--surface)]"
                  : "text-[var(--ink-soft)] hover:bg-black/[0.04]",
            ].join(" ");

            if (item.external) {
              return (
                <a key={item.href} href={item.href} className={className}>
                  {item.label}
                </a>
              );
            }

            return (
              <Link key={item.href} href={item.href} className={className}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
