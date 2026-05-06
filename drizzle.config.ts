import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'libsql',
  dbCredentials: {
    url: process.env.VITE_TURSO_CONNECTION_URL || "",
    authToken: process.env.VITE_TURSO_AUTH_TOKEN,
  },
});
