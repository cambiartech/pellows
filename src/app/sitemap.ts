import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";

const base =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/search`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/join`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/for-agencies`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/chat`, changeFrequency: "weekly", priority: 0.5 },
  ];

  try {
    const listings = await prisma.listing.findMany({
      where: { status: "LIVE" },
      select: { slug: true, updatedAt: true },
      take: 5000,
    });
    const stayRoutes = listings.map((l) => ({
      url: `${base}/stays/${l.slug}`,
      lastModified: l.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
    return [...staticRoutes, ...stayRoutes];
  } catch {
    return staticRoutes;
  }
}
