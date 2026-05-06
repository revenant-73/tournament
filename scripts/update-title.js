import 'dotenv/config';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../src/lib/db/schema.js';
import { eq } from 'drizzle-orm';

const url = process.env.VITE_TURSO_CONNECTION_URL;
const authToken = process.env.VITE_TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });
const db = drizzle(client, { schema });

async function updateTitle() {
  try {
    console.log("Updating tournament title...");
    
    const result = await db.update(schema.tournaments)
      .set({ name: "May ShinDig" })
      .where(eq(schema.tournaments.name, "TVVC Grass Doubles"));

    console.log("✅ Tournament title updated to May ShinDig");

  } catch (error) {
    console.error("❌ Update failed:", error);
  } finally {
    process.exit(0);
  }
}

updateTitle();
