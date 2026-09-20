"use client";

import { useMemo, useState } from "react";

type Block = {
  id?: string;
  startDate: string;
  endDate: string;
  source: string;
  summary: string | null;
};

type Props = {
  listingId: string;
  blocks: Block[];
  onChanged: () => void;
};

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(ymdStr: string, n: number) {
  const d = new Date(`${ymdStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return ymd(d);
}

function monthMatrix(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1));
  const startPad = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(ymd(new Date(Date.UTC(year, month, d))));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isBusy(day: string, blocks: Block[]) {
  return blocks.some((b) => day >= b.startDate && day < b.endDate);
}

export function HostMonthCalendar({ listingId, blocks, onChanged }: Props) {
  const now = new Date();
  const [cursor, setCursor] = useState({
    y: now.getUTCFullYear(),
    m: now.getUTCMonth(),
  });
  const [selectStart, setSelectStart] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cells = useMemo(
    () => monthMatrix(cursor.y, cursor.m),
    [cursor.y, cursor.m],
  );

  const label = new Date(Date.UTC(cursor.y, cursor.m, 1)).toLocaleString(
    undefined,
    { month: "long", year: "numeric", timeZone: "UTC" },
  );

  async function blockRange(start: string, endExclusive: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/calendar/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          startDate: start,
          endDate: endExclusive,
          summary: "Owner / maintenance",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Block failed");
      setSelectStart(null);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Block failed");
    } finally {
      setBusy(false);
    }
  }

  function onDayClick(day: string) {
    if (!selectStart) {
      setSelectStart(day);
      return;
    }
    if (day < selectStart) {
      setSelectStart(day);
      return;
    }
    const end = addDays(day, 1);
    void blockRange(selectStart, end);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="btn-pill btn-ghost text-[0.8125rem]"
          onClick={() =>
            setCursor((c) => {
              const m = c.m - 1;
              return m < 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m };
            })
          }
        >
          ←
        </button>
        <p className="font-display text-lg font-medium">{label}</p>
        <button
          type="button"
          className="btn-pill btn-ghost text-[0.8125rem]"
          onClick={() =>
            setCursor((c) => {
              const m = c.m + 1;
              return m > 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m };
            })
          }
        >
          →
        </button>
      </div>
      <p className="text-[0.75rem] text-[var(--muted)]">
        Tap a start day, then an end day to block owner / maintenance dates.
        {selectStart ? ` Selected start: ${selectStart}` : ""}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-[0.7rem] font-medium text-[var(--muted)]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} className="aspect-square" />;
          const blocked = isBusy(day, blocks);
          const selected = selectStart === day;
          return (
            <button
              key={day}
              type="button"
              disabled={busy}
              onClick={() => onDayClick(day)}
              className={`aspect-square rounded-xl text-[0.8rem] font-medium transition ${
                blocked
                  ? "bg-[#b42318]/15 text-[#b42318]"
                  : selected
                    ? "bg-[var(--sea)] text-white"
                    : "bg-white/80 text-[var(--ink)] hover:bg-[var(--foam)]"
              }`}
            >
              {Number(day.slice(8))}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="text-sm font-medium text-[#b42318]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
