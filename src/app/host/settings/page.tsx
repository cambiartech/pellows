"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthField } from "@/components/auth-field";

export default function HostSettingsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [commissionBps, setCommissionBps] = useState("1000");
  const [termsNote, setTermsNote] = useState("");
  const [verified, setVerified] = useState(false);
  const [apiPrefix, setApiPrefix] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<
    { id: string; kind: string; label: string; isDefault: boolean }[]
  >([]);
  const [staff, setStaff] = useState<
    { id: string; email: string; name: string; role: string }[]
  >([]);
  const [invites, setInvites] = useState<
    { id: string; email: string; role: string }[]
  >([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [payout, setPayout] = useState({
    kind: "BANK" as "BANK" | "CRYPTO_WALLET",
    label: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
    walletAddress: "",
    network: "USDT-TRC20",
  });

  const load = useCallback(async () => {
    const me = await fetch("/api/v1/auth/me");
    if (!me.ok) {
      router.replace("/login");
      return;
    }
    const [terms, payouts, staffRes] = await Promise.all([
      fetch("/api/v1/agency/terms"),
      fetch("/api/v1/agency/payouts"),
      fetch("/api/v1/agency/staff"),
    ]);
    const t = await terms.json();
    if (terms.ok) {
      setCommissionBps(String(t.commissionBps ?? 1000));
      setTermsNote(t.termsNote || "");
      setVerified(Boolean(t.verified));
    }
    const p = await payouts.json();
    if (payouts.ok) setAccounts(p.accounts ?? []);
    const s = await staffRes.json();
    if (staffRes.ok) {
      setStaff(s.staff ?? []);
      setInvites(s.invites ?? []);
    }
    setReady(true);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveTerms() {
    setError(null);
    setMsg(null);
    const res = await fetch("/api/v1/agency/terms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commissionBps: Number(commissionBps),
        termsNote,
      }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Save failed");
    else setMsg("Terms saved.");
  }

  async function addPayout() {
    setError(null);
    setMsg(null);
    const details =
      payout.kind === "BANK"
        ? {
            bankName: payout.bankName,
            accountNumber: payout.accountNumber,
            accountName: payout.accountName,
          }
        : {
            walletAddress: payout.walletAddress,
            network: payout.network,
          };
    const res = await fetch("/api/v1/agency/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: payout.kind,
        label: payout.label || (payout.kind === "BANK" ? "Bank account" : "Crypto wallet"),
        details,
        isDefault: accounts.length === 0,
      }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Save failed");
    else {
      setMsg("Payout method added.");
      await load();
    }
  }

  async function invite() {
    setError(null);
    setInviteLink(null);
    const res = await fetch("/api/v1/agency/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: inviteEmail,
        name: inviteName || undefined,
        role: "OPS",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Invite failed");
      return;
    }
    const url = `${window.location.origin}${data.invite.acceptUrl}`;
    setInviteLink(url);
    setInviteEmail("");
    setInviteName("");
    await load();
  }

  async function rotateKey() {
    setError(null);
    const res = await fetch("/api/v1/agency/listings", { method: "PUT" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Key failed");
      return;
    }
    setNewApiKey(data.apiKey);
    setApiPrefix(data.prefix);
    setMsg("API key created — copy it now.");
  }

  if (!ready) {
    return <div className="px-6 pt-32 text-[var(--muted)]">Loading…</div>;
  }

  return (
    <section className="px-6 pb-24 pt-28 md:px-10 md:pt-32">
      <div className="mx-auto max-w-lg space-y-6">
        <Link href="/host" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
          ← Workspace
        </Link>
        <h1 className="font-display text-heading">Agency settings</h1>
        <p className="text-sm text-[var(--muted)]">
          Payouts, staff, terms, API key.
          {verified ? " · Verified ✓" : " · Not verified yet"}
        </p>

        <div className="space-y-4 rounded-2xl border border-black/10 bg-white/80 p-5">
          <p className="font-semibold text-[var(--ink)]">Commission & terms</p>
          <AuthField
            label="Platform fee (basis points)"
            hint="1000 = 10%"
            value={commissionBps}
            onChange={setCommissionBps}
          />
          <label className="block">
            <span className="auth-label">Terms note</span>
            <textarea
              className="auth-input mt-2"
              rows={3}
              value={termsNote}
              onChange={(e) => setTermsNote(e.target.value)}
            />
          </label>
          <button type="button" onClick={() => void saveTerms()} className="btn-pill btn-primary">
            Save terms
          </button>
        </div>

        <div className="space-y-4 rounded-2xl border border-black/10 bg-white/80 p-5">
          <p className="font-semibold text-[var(--ink)]">Payout methods</p>
          <ul className="space-y-2 text-sm">
            {accounts.map((a) => (
              <li key={a.id} className="text-[var(--muted)]">
                {a.kind} · {a.label}
                {a.isDefault ? " · default" : ""}
              </li>
            ))}
            {!accounts.length && (
              <li className="text-[var(--muted)]">None yet — add bank or crypto.</li>
            )}
          </ul>
          <div className="flex gap-2">
            {(["BANK", "CRYPTO_WALLET"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setPayout((p) => ({ ...p, kind: k }))}
                className={`btn-pill text-[0.8125rem] ${
                  payout.kind === k ? "btn-primary" : "btn-ghost"
                }`}
              >
                {k === "BANK" ? "Bank" : "Crypto"}
              </button>
            ))}
          </div>
          <AuthField
            label="Label"
            placeholder="Primary Naira account"
            value={payout.label}
            onChange={(v) => setPayout((p) => ({ ...p, label: v }))}
          />
          {payout.kind === "BANK" ? (
            <>
              <AuthField
                label="Bank name"
                value={payout.bankName}
                onChange={(v) => setPayout((p) => ({ ...p, bankName: v }))}
              />
              <AuthField
                label="Account number"
                value={payout.accountNumber}
                onChange={(v) => setPayout((p) => ({ ...p, accountNumber: v }))}
              />
              <AuthField
                label="Account name"
                value={payout.accountName}
                onChange={(v) => setPayout((p) => ({ ...p, accountName: v }))}
              />
            </>
          ) : (
            <>
              <AuthField
                label="Wallet address"
                value={payout.walletAddress}
                onChange={(v) => setPayout((p) => ({ ...p, walletAddress: v }))}
              />
              <AuthField
                label="Network"
                value={payout.network}
                onChange={(v) => setPayout((p) => ({ ...p, network: v }))}
              />
            </>
          )}
          <button type="button" onClick={() => void addPayout()} className="btn-pill btn-primary">
            Add payout method
          </button>
        </div>

        <div className="space-y-4 rounded-2xl border border-black/10 bg-white/80 p-5">
          <p className="font-semibold text-[var(--ink)]">Staff</p>
          <ul className="space-y-1 text-sm text-[var(--muted)]">
            {staff.map((s) => (
              <li key={s.id}>
                {s.name} · {s.email} · {s.role}
              </li>
            ))}
          </ul>
          {invites.length > 0 && (
            <p className="text-sm text-[var(--muted)]">
              Pending: {invites.map((i) => i.email).join(", ")}
            </p>
          )}
          <AuthField
            label="Invite email"
            type="email"
            value={inviteEmail}
            onChange={setInviteEmail}
          />
          <AuthField
            label="Name (optional)"
            value={inviteName}
            onChange={setInviteName}
          />
          <button type="button" onClick={() => void invite()} className="btn-pill btn-ghost">
            Create invite link
          </button>
          {inviteLink && (
            <p className="break-all text-sm text-[var(--sea)]">
              Share: {inviteLink}
            </p>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-black/10 bg-white/80 p-5">
          <p className="font-semibold text-[var(--ink)]">Agency API key</p>
          <p className="text-sm text-[var(--muted)]">
            Bearer token for <code>GET/POST /api/v1/agency/listings</code>
            {apiPrefix ? ` · prefix ${apiPrefix}…` : ""}
          </p>
          <button type="button" onClick={() => void rotateKey()} className="btn-pill btn-ghost">
            Generate API key
          </button>
          {newApiKey && (
            <p className="break-all rounded-xl bg-[var(--foam)] px-3 py-2 font-mono text-sm">
              {newApiKey}
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-2xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-sm text-[#b42318]">
            {error}
          </div>
        )}
        {msg && <p className="text-sm font-medium text-[var(--sea)]">{msg}</p>}
      </div>
    </section>
  );
}
