import { prisma } from "@/lib/db";

export type AppSettingsRow = {
  id: string;
  useLlm: boolean;
  geminiModel: string | null;
  updatedAt: Date;
};

export async function getAppSettings(): Promise<AppSettingsRow> {
  const row = await prisma.appSettings.upsert({
    where: { id: "default" },
    create: { id: "default", useLlm: true },
    update: {},
  });
  return row;
}

export async function updateAppSettings(patch: {
  useLlm?: boolean;
  geminiModel?: string | null;
}) {
  return prisma.appSettings.upsert({
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
}
