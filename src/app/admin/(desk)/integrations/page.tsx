import type { ReactNode } from "react";
import Link from "next/link";

function Block({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8 rounded-[var(--radius-panel)] border border-[var(--hairline)] bg-[var(--surface)] p-6 md:p-8">
      <h2 className="font-display text-xl font-medium tracking-[-0.02em]">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-[var(--ink-soft)]">
        {children}
      </div>
    </section>
  );
}

export default function AdminIntegrationsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-[2.25rem] font-medium tracking-[-0.03em]">
        Integrations
      </h1>
      <p className="mt-1 text-[var(--muted)]">
        How rooms get onto Pellows, and what keeps them current. Guests only
        search the copy we already stored.
      </p>

      <Block title="Realcorp">
        <p>
          A tenant is listed only if that workspace turns Pellows on. Everyone
          else stays invisible. There is no key that opens every workspace.
        </p>
        <p className="font-semibold text-[var(--ink)]">In Realcorp</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Shortlets → Channels → Pellows → turn on.</li>
          <li>Copy the tenant id and the connection token from that screen.</li>
          <li>Turning it off revokes the token. Their live rooms pause on the next sync.</li>
        </ol>
        <p className="font-semibold text-[var(--ink)]">In Pellows</p>
        <p>
          The agency logs in and opens{" "}
          <Link href="/host/import" className="font-semibold text-[var(--sea)] underline-offset-4 hover:underline">
            Import → Realcorp
          </Link>
          . They paste the tenant id and token, choose the Realcorp rate or a
          markup, then press Save and sync.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>The first pull is drafts. Those rooms are not in guest search.</li>
          <li>Go LIVE once on a room from that workspace.</li>
          <li>
            After that, a new apartment they post publishes on its own, with the
            markup already saved. Nobody syncs each new flat.
          </li>
          <li>A price, photo, or busy date updates the copy we have.</li>
          <li>An archived apartment drops out of search.</li>
        </ul>
        <p>
          Their notification writes the change within seconds. Our catch-up
          pulls anything that notification missed. Neither runs inside a guest
          message. Save and sync is the first connection, or a full pull when
          you want one now.
        </p>
      </Block>

      <Block title="If Realcorp fails">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-semibold text-[var(--ink)]">Waiting on the API address.</span>{" "}
            The tenant id is saved. Set <code>REALCORP_API_BASE</code> and sync again.
          </li>
          <li>
            <span className="font-semibold text-[var(--ink)]">No connection token.</span>{" "}
            That workspace has not turned Pellows on.
          </li>
          <li>
            <span className="font-semibold text-[var(--ink)]">Refused. Listings paused.</span>{" "}
            The token was revoked. They turn Pellows on again and paste a new one.
          </li>
          <li>
            <span className="font-semibold text-[var(--ink)]">Synced, guests cannot see them.</span>{" "}
            The rooms are still drafts. Go LIVE.
          </li>
        </ul>
      </Block>

      <Block title="Airbnb and Booking.com">
        <p>
          Not a live feed. We do not scrape them. On Import, paste the listing
          URL for a draft, then the iCal link so busy dates and the name on the
          calendar stay on the room. Go LIVE when it looks right. A new listing
          on Airbnb does not appear until someone imports it.
        </p>
      </Block>

      <Block title="CSV and manual">
        <p>
          CSV bulk creates drafts from a spreadsheet. Manual is one apartment
          typed in. Neither keeps updating itself. Go LIVE when the room is ready.
        </p>
      </Block>

      <Block title="What ops sets">
        <p>Agencies never see these. They are server settings.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <code>REALCORP_API_BASE</code> — where we pull units.
          </li>
          <li>
            <code>REALCORP_CLIENT_ID</code> and <code>REALCORP_CLIENT_SECRET</code>{" "}
            — proves the caller is Pellows. Cannot list rooms.
          </li>
          <li>
            <code>REALCORP_WEBHOOK_SECRET</code> — checks{" "}
            <code>POST /api/webhooks/realcorp</code>. Until it is set, their
            notifications are refused.
          </li>
          <li>
            <code>CRON_SECRET</code> — protects{" "}
            <code>GET /api/cron/realcorp-sync</code> and the iCal catch-up. Run
            the Realcorp one every few minutes.
          </li>
        </ul>
        <p>
          The engineering contract to send Realcorp is{" "}
          <code>docs/REALCORP_INTEGRATION.md</code>. This page is the operating
          copy. The same steps are in <code>docs/INTEGRATIONS.md</code>.
        </p>
      </Block>
    </div>
  );
}
