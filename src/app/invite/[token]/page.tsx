"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AuthField } from "@/components/auth-field";

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/agency/staff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Accept failed");
      router.push("/host");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Accept failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto max-w-md px-6 pb-24 pt-28">
      <p className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[var(--sea)]">
        Staff invite
      </p>
      <h1 className="font-display mt-3 text-heading">Join the agency workspace</h1>
      <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
        <AuthField
          label="Your name"
          required
          value={name}
          onChange={setName}
        />
        <AuthField
          label="Password"
          type="password"
          required
          value={password}
          onChange={setPassword}
        />
        {error && (
          <div className="rounded-2xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-sm text-[#b42318]">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={busy}
          className="btn-pill btn-primary w-full disabled:opacity-50"
        >
          {busy ? "Joining…" : "Accept invite"}
        </button>
      </form>
      <p className="mt-6 text-sm text-[var(--muted)]">
        <Link href="/login" className="text-[var(--sea)]">
          Log in instead
        </Link>
      </p>
    </section>
  );
}
