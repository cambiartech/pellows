import { prisma } from "@/lib/db";

export type AppSettingsRow = {
  id: string;
  useLlm: boolean;
  geminiModel: string | null;
  updatedAt: Date;
};

/** Warm-instance cache. Avoids a DB write on every WhatsApp turn. */
const CACHE_MS = 15_000;
let cached: { row: AppSettingsRow; at: number } | null = null;

export async function getAppSettings(): Promise<AppSettingsRow> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.row;

  const existing = await prisma.appSettings.findUnique({
    where: { id: "default" },
  });
  const row =
    existing ??
    (await prisma.appSettings.create({
      data: { id: "default", useLlm: true },
    }));
  cached = { row, at: Date.now() };
  return row;
}

export async function updateAppSettings(patch: {
  useLlm?: boolean;
  geminiModel?: string | null;
}) {
  const row = await prisma.appSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      useLlm: patch.useLlm ?? true,
      geminiModel: patch.geminiModel ?? null,
    },
    update: {
      ...(typeof patch.useLlm === "boolean" ? { useLlm: patch.useLlm } : {}),
      ...(patch.geminiModel !== undefined
        ? { geminiModel: patch.geminiModel }
        : {}),
    },
  });
  cached = { row, at: Date.now() };
  return row;
}
