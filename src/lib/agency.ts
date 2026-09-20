export const LAGOS_AREAS = [
  "Lekki",
  "Victoria Island",
  "Ikoyi",
  "Oniru",
  "Yaba",
  "Ikeja",
  "Ajah",
  "Surulere",
  "Other",
] as const;

export const AMENITY_OPTIONS = [
  { id: "wifi", label: "Wi‑Fi" },
  { id: "ac", label: "AC" },
  { id: "generator", label: "Generator" },
  { id: "pool", label: "Pool" },
  { id: "parking", label: "Parking" },
  { id: "security", label: "Security" },
  { id: "kitchen", label: "Kitchen" },
  { id: "workspace", label: "Workspace" },
] as const;

export function slugifyTitle(title: string) {
  return `${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48)}-${Date.now().toString(36)}`;
}
