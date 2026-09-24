"use client";

import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();
  if (
    pathname === "/chat" ||
    pathname === "/join" ||
    pathname === "/login" ||
    pathname.startsWith("/admin")
  ) {
    return null;
  }

  return (
    <footer className="border-t border-[var(--hairline)] px-6 py-10 text-[0.8125rem] text-[var(--muted)] md:px-10">
      <div className="mx-auto flex max-w-[var(--content-max)] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-display text-base font-medium tracking-[-0.02em] text-[var(--ink)]">
          Pellows
        </span>
        <span>A Realcorp product · Card · bank · crypto — handled by us</span>
      </div>
    </footer>
  );
}
