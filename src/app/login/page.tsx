"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { AuthField } from "@/components/auth-field";

function emailOk(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function LoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const emailError = useMemo(() => {
    if (!(touched.email || attempted)) return null;
    if (!email.trim()) return "Email is required";
    if (!emailOk(email)) return "Enter a valid email";
    return null;
  }, [email, touched.email, attempted]);

  const passwordError = useMemo(() => {
    if (!(touched.password || attempted)) return null;
    if (!password) return "Password is required";
    return null;
  }, [password, touched.password, attempted]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAttempted(true);
    setTouched({ email: true, password: true });
    if (!email.trim() || !emailOk(email) || !password) {
      setFormError("Check email and password");
      return;
    }

    setBusy(true);
    setFormError(null);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.push("/host");
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh w-full flex-col lg:flex-row">
      <section className="flex w-full flex-1 flex-col justify-center px-6 pb-12 pt-24 md:px-12 lg:w-1/2 lg:px-16 lg:pt-20">
        <div className="mx-auto w-full max-w-[26rem]">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[var(--sea)]">
            Agency
          </p>
          <h1 className="font-display mt-2 text-[2.15rem] font-medium leading-[1.05] tracking-[-0.03em] md:text-[2.5rem]">
            Welcome back
          </h1>
          <p className="mt-2 text-[1rem] text-[var(--muted)]">
            Log in to manage units, calendars, and go LIVE.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
            <AuthField
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@agency.com"
              required
              value={email}
              onChange={(v) => {
                setEmail(v);
                setFormError(null);
              }}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              error={emailError}
              ok={(touched.email || attempted) && !emailError && Boolean(email.trim())}
            />
            <AuthField
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(v) => {
                setPassword(v);
                setFormError(null);
              }}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              error={passwordError}
              ok={(touched.password || attempted) && !passwordError && Boolean(password)}
            />

            {formError && (
              <div
                className="rounded-2xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-sm font-medium text-[#b42318]"
                role="alert"
              >
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="btn-pill btn-primary mt-2 w-full disabled:opacity-50"
            >
              {busy ? "Signing in…" : "Log in"}
            </button>
          </form>

          <p className="mt-6 text-sm text-[var(--muted)]">
            New agency?{" "}
            <Link
              href="/join"
              className="font-semibold text-[var(--sea)] underline-offset-4 hover:underline"
            >
              Join Pellows
            </Link>
          </p>
        </div>
      </section>

      <aside className="relative hidden w-1/2 overflow-hidden lg:block">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/hero.jpg)" }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#062e2c] via-[#0b5552]/50 to-[#0b5552]/15" />
        <div className="relative flex h-full min-h-dvh items-end p-10 xl:p-14">
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display max-w-sm text-3xl font-medium leading-tight tracking-[-0.02em] text-[#f3efe6]"
          >
            Your units. Your calendar. Guests book from chat.
          </motion.p>
        </div>
      </aside>
    </div>
  );
}
