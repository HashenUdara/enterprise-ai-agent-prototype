import { config } from "dotenv"
import { defineConfig } from "drizzle-kit"

config({ path: ".env.local", quiet: true })

const databaseUrl = process.env.DATABASE_URL
const databaseCommand = process.argv.some((argument) =>
  ["migrate", "push", "pull", "studio"].includes(argument)
)

if (!databaseUrl && databaseCommand) {
  throw new Error(
    "DATABASE_URL is not configured. Copy .env.example to .env.local and add your Neon connection string."
  )
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dbCredentials: {
    // `generate` does not connect to a database, but Drizzle Kit still validates
    // this field. Commands that connect must receive the real URL via .env.local.
    url:
      databaseUrl ??
      "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
  strict: true,
  verbose: true,
})
