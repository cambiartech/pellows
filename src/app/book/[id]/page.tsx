import { Suspense } from "react";
import BookClient from "./book-client";

export default function BookPage() {
  return (
    <Suspense
      fallback={
        <div className="px-6 pt-32 text-[var(--muted)]">Loading booking…</div>
      }
    >
      <BookClient />
    </Suspense>
  );
}
