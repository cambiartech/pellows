import { Suspense } from "react";
import PayClient from "./pay-client";

export default function PayPage() {
  return (
    <Suspense
      fallback={
        <div className="px-6 pt-32 text-[var(--muted)]">Loading checkout…</div>
      }
    >
      <PayClient />
    </Suspense>
  );
}
