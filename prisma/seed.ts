import "dotenv/config";
import { config as loadEnv } from "dotenv";
import { seedDemoInventory } from "../src/lib/seed-demo";

loadEnv({ path: ".env.local" });

async function main() {
  const result = await seedDemoInventory();
  console.log(
    `Seeded ${result.listings} listings (host ${result.hostEmail} / ${result.hostPassword})`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
