# Next.js template

This is a Next.js template with shadcn/ui.

## Database setup

The prototype uses Drizzle ORM with Neon PostgreSQL through the serverless HTTP adapter.

1. Copy `.env.example` to `.env.local`.
2. Replace the placeholder `DATABASE_URL` with a Neon connection string.
3. Apply the checked-in migration:

```bash
bun run db:migrate
```

4. Reset and seed the deterministic walking-skeleton records:

```bash
bun run db:seed
```

5. Read the records back from Neon:

```bash
bun run db:verify
```

`db:seed` is the explicit demo reset command for the current four-table slice. It clears MCP activity and replaces the current customer, order, and shipment records with the golden baseline.

Verify the first CRM → ERP → Logistics enterprise-service flow against the seeded database:

```bash
bun run enterprise:verify
```

The service modules live under `lib/enterprise`. They own typed enterprise queries and validation; the later MCP layer will call these functions instead of querying Drizzle directly.

When the schema changes, generate and review a new SQL migration before applying it:

```bash
bun run db:generate
```

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button"
```
