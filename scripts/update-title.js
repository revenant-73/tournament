import 'dotenv/config';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from '../src/lib/db/schema.ts';
import { eq } from 'drizzle-orm';

const url = process.env.VITE_TURSO_CONNECTION_URL;
const authToken = process.env.VITE_TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });
const db = drizzle(client, { schema });

async function updateTitle() {
  try {
    console.log("Updating tournament title...");
    
    const result = await db.update(schema.tournaments)
      .set({ 
        name: "May 9-10 Shindig",
        date: "2026-05-09",
        info: "Indoor volleyball tournament. Best 2 out of 3 sets. Sets 1 & 2 to 25, Set 3 to 15. All sets win by 2."
      })
      .where(eq(schema.tournaments.isActive, true));

    console.log("✅ Tournament updated to May 9-10 Shindig");

  } catch (error) {
    console.error("❌ Update failed:", error);
  } finally {
    process.exit(0);
  }
}

updateTitle();
