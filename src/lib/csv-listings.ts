export type CsvListingRow = {
  title: string;
  description: string;
  neighbourhood?: string;
  city: string;
  country: string;
  currency: string;
  basePrice: number;
  cleaningFee: number;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  amenities: string[];
  status: "DRAFT" | "LIVE" | "PAUSED";
};

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function normalizeHeader(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, "");
}

export function parseListingsCsv(raw: string): {
  rows: CsvListingRow[];
  errors: string[];
} {
  const text = raw.replace(/^\uFEFF/, "").trim();
  if (!text) return { rows: [], errors: ["CSV is empty"] };

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { rows: [], errors: ["CSV needs a header row and at least one listing"] };
  }

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  const idx = (name: string) => headers.indexOf(name);

  const required = ["title", "baseprice"] as const;
  for (const r of required) {
    if (idx(r) < 0) {
      return {
        rows: [],
        errors: [`Missing required column: ${r === "baseprice" ? "basePrice" : r}`],
      };
    }
  }

  const rows: CsvListingRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const get = (name: string, fallback = "") => {
      const j = idx(name);
      return j >= 0 ? (cols[j] ?? "").trim() : fallback;
    };

    const title = get("title");
    const basePrice = Number(get("baseprice"));
    if (!title || title.length < 3) {
      errors.push(`Row ${i + 1}: title required (min 3 chars)`);
      continue;
    }
    if (!(basePrice > 0)) {
      errors.push(`Row ${i + 1}: basePrice must be a positive number (major units, e.g. 250000)`);
      continue;
    }

    const statusRaw = get("status", "DRAFT").toUpperCase();
    const status =
      statusRaw === "LIVE" || statusRaw === "PAUSED" ? statusRaw : "DRAFT";

    const amenitiesRaw = get("amenities");
    const amenities = amenitiesRaw
      ? amenitiesRaw.split(/[|;,]/).map((a) => a.trim()).filter(Boolean)
      : [];

    rows.push({
      title,
      description:
        get("description") ||
        `${title} — imported via CSV. Edit details before going LIVE.`,
      neighbourhood: get("neighbourhood") || undefined,
      city: get("city", "Lagos") || "Lagos",
      country: get("country", "Nigeria") || "Nigeria",
      currency: (get("currency", "NGN") || "NGN").toUpperCase().slice(0, 3),
      basePrice,
      cleaningFee: Math.max(0, Number(get("cleaningfee", "0")) || 0),
      bedrooms: Math.max(0, Math.round(Number(get("bedrooms", "1")) || 1)),
      bathrooms: Math.max(0, Number(get("bathrooms", "1")) || 1),
      maxGuests: Math.max(1, Math.round(Number(get("maxguests", "2")) || 2)),
      amenities,
      status,
    });
  }

  return { rows, errors };
}
