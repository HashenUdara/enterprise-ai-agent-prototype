import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

import * as schema from "@/lib/db/schema"

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not configured. Copy .env.example to .env.local and add your Neon connection string."
    )
  }

  return databaseUrl
}

const sql = neon(getDatabaseUrl())

export const db = drizzle({ client: sql, schema })
