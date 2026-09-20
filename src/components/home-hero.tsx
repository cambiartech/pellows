"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";

const ease = [0.22, 1, 0.36, 1] as const;

export function HomeHero() {
  return (
    <section className="relative min-h-[100svh] overflow-hidden">
      {/* Full-bleed stay atmosphere — local asset (remote Unsplash was 404) */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.06 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.8, ease }}
      >
        <Image
          src="/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(8,20,18,0.78)] via-[rgba(8,20,18,0.38)] to-[rgba(8,20,18,0.18)]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(8,20,18,0.5)] via-transparent to-transparent" />
      </motion.div>

      <div className="relative mx-auto flex min-h-[100svh] max-w-[var(--content-max)] flex-col justify-end px-6 pb-16 pt-28 md:px-10 md:pb-20">
        <motion.p
          className="font-display text-display text-[#f3efe6]"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease }}
        >
          Pellows
        </motion.p>

        <motion.h1
          className="mt-5 max-w-xl text-[var(--text-sub)] font-medium leading-snug tracking-[-0.01em] text-[#e8e2d6] md:text-[1.35rem]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.32, ease }}
        >
          From chat to keys — text us on WhatsApp, or let any AI agent book
          your short stay.
        </motion.h1>

        <motion.div
          className="mt-9 flex flex-wrap gap-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.48, ease }}
        >
          <Link
            href="/search"
            className="btn-pill btn-primary bg-[#f3efe6] text-[var(--sea-deep)] hover:bg-white"
          >
            Search stays
          </Link>
          <Link
            href="/join"
            className="btn-pill border border-white/35 text-[#f3efe6] hover:bg-white/10"
          >
            List a property
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

export function HomeSections() {
  const items = [
    {
      title: "Wherever you chat",
      body: "WhatsApp first. Then Slack, iMessage, Gmail agents, ChatGPT, Gemini — same booking brain.",
    },
    {
      title: "Other agents book via us",
      body: "Expose tools so any AI assistant can search, hold, and pay against live Pellows inventory.",
    },
    {
      title: "Payments we own",
      body: "Card, bank rails, and crypto in the conversation. Calendar truth never invents rooms.",
    },
  ];

  return (
    <section className="mx-auto max-w-[var(--content-max)] px-6 py-[var(--section-gap)] md:px-10">
      <motion.p
        className="text-[0.8125rem] font-medium uppercase tracking-[0.14em] text-[var(--muted)]"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        Dimension-style reach · Pellows inventory
      </motion.p>
      <div className="mt-10 grid gap-12 md:grid-cols-3 md:gap-10">
        {items.map((item, i) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.5, delay: i * 0.08, ease }}
          >
            <h2 className="font-display text-[var(--text-h-sm)] font-medium tracking-[-0.02em]">
              {item.title}
            </h2>
            <p className="mt-3 max-w-sm text-[0.9375rem] leading-relaxed text-[var(--muted)]">
              {item.body}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
