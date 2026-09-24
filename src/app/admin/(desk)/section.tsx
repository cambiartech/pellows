export function AdminSection({
  title,
  lede,
  body,
}: {
  title: string;
  lede: string;
  body: string;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-[2.25rem] font-medium tracking-[-0.03em]">
        {title}
      </h1>
      <p className="mt-1 text-[var(--muted)]">{lede}</p>
      <section className="mt-8 rounded-[var(--radius-panel)] border border-[var(--hairline)] bg-[var(--surface)] p-6 md:p-8">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[var(--sea)]">
          Next
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">{body}</p>
      </section>
    </div>
  );
}
