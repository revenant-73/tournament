import { createClient } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = import.meta.env.VITE_TURSO_CONNECTION_URL;
const authToken = import.meta.env.VITE_TURSO_AUTH_TOKEN;

console.log("DB Config:", { url: url ? "Set" : "Missing", token: authToken ? "Set" : "Missing" });

if (!url) {
  console.error("VITE_TURSO_CONNECTION_URL is missing. Check your environment variables.");
}

const client = createClient({
  url: url || "http://localhost:8080", // Fallback to avoid crash during init
  authToken: authToken,
});

export const db = drizzle(client, { schema });
