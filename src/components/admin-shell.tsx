"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const GROUPS = [
  {
    label: "Operate",
    items: [
      { href: "/admin", label: "Overview" },
      { href: "/admin/whatsapp", label: "WhatsApp" },
      { href: "/admin/assistant", label: "Assistant" },
    ],
  },
  {
    label: "Supply",
    items: [
      { href: "/admin/agencies", label: "Agencies" },
      { href: "/admin/integrations", label: "Integrations" },
      { href: "/admin/inventory", label: "Inventory" },
    ],
  },
  {
    label: "Money",
    items: [
      { href: "/admin/bookings", label: "Bookings" },
      { href: "/admin/payments", label: "Payments" },
    ],
  },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = await fetch("/api/v1/admin/session");
      if (cancelled) return;
      if (!session.ok) {
        router.replace("/admin/login");
        return;
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function logout() {
    await fetch("/api/v1/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-[var(--muted)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b border-[var(--hairline)] bg-[var(--surface)] px-4 py-4 md:w-[15.5rem] md:border-b-0 md:border-r md:py-6">
        <div className="flex items-center justify-between gap-3 px-2">
          <Link href="/admin">
            <span className="font-display text-[1.35rem] font-medium tracking-[-0.03em]">
              Pellows
            </span>
            <span className="mt-0.5 block text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--sea)]">
              Admin
            </span>
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
            className="text-sm font-semibold text-[var(--muted)] underline-offset-4 hover:underline md:hidden"
          >
            Log out
          </button>
        </div>

        <nav
          className="mt-4 flex gap-6 overflow-x-auto pb-1 md:mt-8 md:flex-1 md:flex-col md:gap-6 md:overflow-visible md:pb-0"
          aria-label="Admin"
        >
          {GROUPS.map((group) => (
            <div key={group.label} className="shrink-0 md:shrink">
              <p className="px-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                {group.label}
              </p>
              <ul className="mt-1.5 flex gap-1 md:flex-col md:space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    item.href === "/admin"
                      ? pathname === "/admin"
                      : pathname === item.href ||
                        pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`block whitespace-nowrap rounded-[var(--radius-ui)] px-2.5 py-2 text-sm font-medium ${
                          active
                            ? "bg-[var(--sea)] text-[#f3efe6]"
                            : "text-[var(--ink-soft)] hover:bg-black/[0.04]"
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <button
          type="button"
          onClick={() => void logout()}
          className="mt-4 hidden px-2 text-left text-sm font-semibold text-[var(--muted)] underline-offset-4 hover:underline md:block"
        >
          Log out
        </button>
      </aside>

      <div className="min-w-0 flex-1 px-6 py-8 md:px-10 md:py-10">{children}</div>
    </div>
  );
}
