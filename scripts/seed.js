import 'dotenv/config';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../src/lib/db/schema.js';

const url = process.env.VITE_TURSO_CONNECTION_URL;
const authToken = process.env.VITE_TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });
const db = drizzle(client, { schema });

async function seed() {
  try {
    console.log("Seeding initial tournament...");
    
    const tournament = await db.insert(schema.tournaments).values({
      name: "May ShinDig",
      date: "2024-06-01",
      location: "Central Park",
      info: "Annual summer kick-off tournament.",
      isActive: true,
      adminPassword: "admin", // Default password for testing
    }).returning().get();

    console.log("✅ Seeded tournament:", tournament.name);

    const group = await db.insert(schema.ageGroups).values({
      tournamentId: tournament.id,
      name: "Men's Open",
      displayOrder: 1,
    }).returning().get();

    console.log("✅ Seeded age group:", group.name);

  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    process.exit(0);
  }
}

seed();
