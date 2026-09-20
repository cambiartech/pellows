"use client";

import { useId, useState } from "react";

type Props = {
  label: string;
  hint?: string;
  error?: string | null;
  ok?: boolean;
  type?: string;
  name?: string;
  autoComplete?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  required?: boolean;
};

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A9.8 9.8 0 0112 5c5 0 9.3 3.3 10.7 7a11.3 11.3 0 01-3.1 4.5M6.1 6.1A11.3 11.3 0 001.3 12c1.4 3.7 5.7 7 10.7 7 1.4 0 2.7-.2 3.9-.7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function AuthField({
  label,
  hint,
  error,
  ok,
  type = "text",
  name,
  autoComplete,
  placeholder,
  value,
  onChange,
  onBlur,
  required,
}: Props) {
  const id = useId();
  const isPassword = type === "password";
  const [showPassword, setShowPassword] = useState(false);
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;

  return (
    <div className="group">
      <label htmlFor={id} className="auth-label">
        {label}
        {required ? <span className="text-[var(--sea)]"> *</span> : null}
      </label>
      <div className="relative mt-2">
        <input
          id={id}
          name={name}
          type={inputType}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          onBlur={onBlur}
          onChange={(e) => onChange(e.target.value)}
          className={`auth-input ${
            error ? "auth-input-error" : ok && !isPassword ? "auth-input-ok" : ""
          } ${isPassword ? "auth-input-has-toggle" : ""}`}
        />
        {isPassword ? (
          <button
            type="button"
            tabIndex={0}
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((v) => !v)}
            className="auth-eye"
          >
            <EyeIcon open={showPassword} />
          </button>
        ) : ok && !error ? (
          <span
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--sea)]"
            aria-hidden
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        ) : null}
      </div>
      {error ? (
        <p id={`${id}-err`} className="auth-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="auth-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
