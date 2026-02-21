import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  _sqlite: ReturnType<typeof Database> | undefined;
};

if (!globalForDb._sqlite) {
  globalForDb._sqlite = new Database("launchclaw.db");
  globalForDb._sqlite.pragma("journal_mode = WAL");
  globalForDb._sqlite.pragma("foreign_keys = ON");
}

export const db = drizzle(globalForDb._sqlite, { schema });
