import { createClient } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

let url = import.meta.env.VITE_TURSO_CONNECTION_URL;
const authToken = import.meta.env.VITE_TURSO_AUTH_TOKEN;

// Normalize URL for web client (browser)
if (url) {
  if (url.startsWith("libsql://")) {
    url = url.replace("libsql://", "https://");
  } else if (!url.startsWith("https://") && !url.startsWith("http://")) {
    url = "https://" + url;
  }
}

console.log("DB Config Details:", { 
  hasUrl: !!url,
  urlStart: url ? url.substring(0, 15) + "..." : "none",
  hasToken: !!authToken
});

const client = createClient({
  url: url || "https://invalid-url-check-settings",
  authToken: authToken,
});

export const db = drizzle(client, { schema });
