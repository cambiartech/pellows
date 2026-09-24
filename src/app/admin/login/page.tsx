"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { AuthField } from "@/components/auth-field";

export default function AdminLoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh w-full items-center justify-center px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[24rem]"
      >
        <p className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[var(--sea)]">
          Platform
        </p>
        <h1 className="font-display mt-2 text-[2.15rem] font-medium leading-[1.05] tracking-[-0.03em]">
          Admin
        </h1>
        <p className="mt-2 text-[1rem] text-[var(--muted)]">
          Toggle LLM and inspect agent health without editing Netlify env.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
          <AuthField
            label="Email"
            type="email"
            autoComplete="username"
            placeholder="admin@pellows.stay"
            required
            value={email}
            onChange={(v) => {
              setEmail(v);
              setError(null);
            }}
          />
          <AuthField
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(v) => {
              setPassword(v);
              setError(null);
            }}
          />

          {error && (
            <div
              className="rounded-2xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-sm font-medium text-[#b42318]"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !password || !email.trim()}
            className="btn-pill btn-primary mt-2 w-full disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Continue"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
