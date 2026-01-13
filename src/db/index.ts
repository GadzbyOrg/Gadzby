import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { ENV } from "@/lib/env";

import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const client = globalForDb.conn ?? postgres(ENV.DATABASE_URL);

if (process.env.NODE_ENV !== "production") globalForDb.conn = client;

export const db = drizzle(client, { schema });
