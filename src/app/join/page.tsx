"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { AuthField } from "@/components/auth-field";

type Form = {
  businessName: string;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  password: string;
};

type Touched = Partial<Record<keyof Form, boolean>>;

const STEPS = [
  { title: "Your agency", sub: "Guests will see this name on search and chat." },
  { title: "How we reach you", sub: "Email + phone for bookings and payouts." },
  { title: "Secure your account", sub: "One password — then you’re in the workspace." },
] as const;

function emailOk(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function phoneOk(v: string) {
  return v.replace(/\D/g, "").length >= 10;
}

function validateField(key: keyof Form, form: Form): string | null {
  const v = form[key].trim();
  switch (key) {
    case "businessName":
      if (!v) return "Enter your agency or business name";
      if (v.length < 2) return "Name looks too short";
      return null;
    case "name":
      if (!v) return "Enter your name";
      if (v.length < 2) return "Name looks too short";
      return null;
    case "email":
      if (!v) return "Email is required";
      if (!emailOk(v)) return "Enter a valid email";
      return null;
    case "phone":
      if (!v) return "Phone is required";
      if (!phoneOk(v)) return "Enter a valid phone (at least 10 digits)";
      return null;
    case "whatsapp":
      if (v && !phoneOk(v)) return "WhatsApp number looks invalid";
      return null;
    case "password":
      if (!v) return "Create a password";
      if (v.length < 6) return "At least 6 characters";
      return null;
    default:
      return null;
  }
}

function passwordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

export default function JoinPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState<Touched>({});
  const [form, setForm] = useState<Form>({
    businessName: "",
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    password: "",
  });

  const errors = useMemo(() => {
    const e: Partial<Record<keyof Form, string | null>> = {};
    (Object.keys(form) as (keyof Form)[]).forEach((k) => {
      e[k] = validateField(k, form);
    });
    return e;
  }, [form]);

  const strength = passwordStrength(form.password);

  function set(key: keyof Form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setFormError(null);
  }

  function blur(key: keyof Form) {
    setTouched((t) => ({ ...t, [key]: true }));
  }

  function showErr(key: keyof Form) {
    return touched[key] || attempted ? errors[key] : null;
  }

  function isOk(key: keyof Form) {
    return (touched[key] || attempted) && !errors[key] && Boolean(form[key].trim());
  }

  function stepKeys(): (keyof Form)[] {
    if (step === 0) return ["businessName", "name"];
    if (step === 1) return ["email", "phone", "whatsapp"];
    return ["password"];
  }

  function next() {
    const keys = stepKeys();
    setAttempted(true);
    setTouched((t) => {
      const n = { ...t };
      keys.forEach((k) => {
        n[k] = true;
      });
      return n;
    });
    if (keys.some((k) => validateField(k, form))) return;
    setAttempted(false);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function submit() {
    setAttempted(true);
    setTouched({
      businessName: true,
      name: true,
      email: true,
      phone: true,
      whatsapp: true,
      password: true,
    });
    if ((Object.keys(form) as (keyof Form)[]).some((k) => validateField(k, form))) {
      setFormError("Fix the highlighted fields to continue");
      return;
    }

    setBusy(true);
    setFormError(null);
    try {
      const res = await fetch("/api/v1/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          whatsapp: form.whatsapp.trim() || form.phone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Signup failed");
      router.push("/host");
      router.refresh();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh w-full flex-col lg:flex-row">
      <section className="flex w-full flex-1 flex-col justify-center px-6 pb-12 pt-24 md:px-12 lg:w-1/2 lg:px-16 lg:pt-20">
        <div className="mx-auto w-full max-w-[26rem]">
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.16em] text-[var(--sea)]">
            For agencies
          </p>
          <h1 className="font-display mt-2 text-[2.15rem] font-medium leading-[1.05] tracking-[-0.03em] text-[var(--ink)] md:text-[2.5rem]">
            Set up your Pellows listing
          </h1>
          <p className="mt-2 text-[1rem] leading-snug text-[var(--muted)]">
            {STEPS[step].sub}
          </p>

          <div className="mt-6 flex gap-2" aria-label="Progress">
            {STEPS.map((s, i) => (
              <div
                key={s.title}
                className="auth-step-dot"
                data-active={i === step}
                data-done={i < step}
              />
            ))}
          </div>
          <p className="mt-2 text-[0.8125rem] font-medium text-[var(--ink-soft)]">
            Step {step + 1} of {STEPS.length} · {STEPS[step].title}
          </p>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="mt-6 space-y-4"
            >
              {step === 0 && (
                <>
                  <AuthField
                    label="Agency / business name"
                    placeholder="e.g. Lekki Nest Stays"
                    autoComplete="organization"
                    required
                    value={form.businessName}
                    onChange={(v) => set("businessName", v)}
                    onBlur={() => blur("businessName")}
                    error={showErr("businessName")}
                    ok={isOk("businessName")}
                  />
                  <AuthField
                    label="Your name"
                    placeholder="Who we’re talking to"
                    autoComplete="name"
                    required
                    value={form.name}
                    onChange={(v) => set("name", v)}
                    onBlur={() => blur("name")}
                    error={showErr("name")}
                    ok={isOk("name")}
                  />
                </>
              )}

              {step === 1 && (
                <>
                  <AuthField
                    label="Work email"
                    type="email"
                    placeholder="you@agency.com"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={(v) => set("email", v)}
                    onBlur={() => blur("email")}
                    error={showErr("email")}
                    ok={isOk("email")}
                  />
                  <AuthField
                    label="Phone"
                    type="tel"
                    placeholder="+234 …"
                    autoComplete="tel"
                    required
                    hint="Guests may call for check-in details"
                    value={form.phone}
                    onChange={(v) => set("phone", v)}
                    onBlur={() => blur("phone")}
                    error={showErr("phone")}
                    ok={isOk("phone")}
                  />
                  <AuthField
                    label="WhatsApp"
                    type="tel"
                    placeholder="Same as phone if blank"
                    hint="Optional — defaults to phone"
                    value={form.whatsapp}
                    onChange={(v) => set("whatsapp", v)}
                    onBlur={() => blur("whatsapp")}
                    error={showErr("whatsapp")}
                    ok={Boolean(form.whatsapp.trim()) && isOk("whatsapp")}
                  />
                </>
              )}

              {step === 2 && (
                <>
                  <AuthField
                    label="Password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    required
                    value={form.password}
                    onChange={(v) => set("password", v)}
                    onBlur={() => blur("password")}
                    error={showErr("password")}
                    ok={isOk("password")}
                  />
                  <div className="space-y-2">
                    <div className="flex gap-1.5">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="h-1.5 flex-1 rounded-full transition-colors"
                          style={{
                            background:
                              i < strength
                                ? strength <= 1
                                  ? "#b42318"
                                  : strength === 2
                                    ? "#b54708"
                                    : "var(--sea)"
                                : "rgba(22,20,18,0.1)",
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-[0.75rem] text-[var(--muted)]">
                      {form.password.length === 0
                        ? "Strength will show as you type"
                        : strength <= 1
                          ? "Weak — add length"
                          : strength === 2
                            ? "Okay — mix letters and numbers"
                            : strength === 3
                              ? "Good"
                              : "Strong"}
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {formError && (
            <div
              className="mt-4 rounded-2xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-sm font-medium text-[#b42318]"
              role="alert"
            >
              {formError}
            </div>
          )}

          <div className="mt-6 flex items-center gap-3">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setAttempted(false);
                  setStep((s) => s - 1);
                }}
                className="btn-pill btn-ghost"
              >
                Back
              </button>
            ) : null}
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={next}
                className="btn-pill btn-primary flex-1"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void submit()}
                className="btn-pill btn-primary flex-1 disabled:opacity-50"
              >
                {busy ? "Creating account…" : "Create agency account"}
              </button>
            )}
          </div>

          <p className="mt-6 text-sm text-[var(--muted)]">
            Already joined?{" "}
            <Link
              href="/login"
              className="font-semibold text-[var(--sea)] underline-offset-4 hover:underline"
            >
              Log in
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
        <div className="absolute inset-0 bg-gradient-to-t from-[#062e2c] via-[#0b5552]/55 to-[#0b5552]/20" />
        <div className="relative flex h-full min-h-dvh items-end p-10 xl:p-14">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.45 }}
            className="max-w-md text-[#f3efe6]"
          >
            <p className="font-display text-3xl font-medium leading-tight tracking-[-0.02em] xl:text-4xl">
              Go live in minutes. Guests find you on search, WhatsApp, and AI
              agents.
            </p>
            <ul className="mt-7 space-y-3 text-[0.95rem] text-[#f3efe6]/88">
              {[
                "Import from Airbnb / Booking or add manually",
                "Calendar sync via iCal — no double bookings",
                "Pay in-app: card, bank, or crypto",
              ].map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--dawn)]" />
                  {line}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </aside>
    </div>
  );
}
