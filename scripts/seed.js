import 'dotenv/config';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../src/lib/db/schema.ts';

const url = process.env.VITE_TURSO_CONNECTION_URL;
const authToken = process.env.VITE_TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });
const db = drizzle(client, { schema });

async function seed() {
  try {
    console.log("Seeding initial tournament...");
    
    const tournament = await db.insert(schema.tournaments).values({
      name: "May 9-10 Shindig",
      date: "2026-05-09",
      location: "TVVC Indoor Facility",
      info: "Indoor volleyball tournament. Best 2 out of 3 sets. Sets 1 & 2 to 25, Set 3 to 15. All sets win by 2.",
      isActive: true,
      adminPassword: "admin", // Default password for testing
    }).returning().get();

    console.log("✅ Seeded tournament:", tournament.name);

    const group14u = await db.insert(schema.ageGroups).values({
      tournamentId: tournament.id,
      name: "14u Division",
      displayOrder: 1,
    }).returning().get();

    const group16u = await db.insert(schema.ageGroups).values({
      tournamentId: tournament.id,
      name: "16u Division",
      displayOrder: 2,
    }).returning().get();

    console.log("✅ Seeded age groups: 14u and 16u");

  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    process.exit(0);
  }
}

seed();
