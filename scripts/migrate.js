import 'dotenv/config';
import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';

const url = process.env.VITE_TURSO_CONNECTION_URL;
const authToken = process.env.VITE_TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Missing VITE_TURSO_CONNECTION_URL or VITE_TURSO_AUTH_TOKEN in .env");
  process.exit(1);
}

const client = createClient({
  url: url,
  authToken: authToken,
});

async function runMigration() {
  try {
    console.log("Reading migration file...");
    const migrationSql = fs.readFileSync(
      path.join(process.cwd(), 'drizzle', '0000_watery_darkhawk.sql'),
      'utf8'
    );

    // Split by statement-breakpoint
    const statements = migrationSql
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Executing ${statements.length} statements...`);

    for (const statement of statements) {
      await client.execute(statement);
    }

    console.log("✅ Migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    process.exit(0);
  }
}

runMigration();
