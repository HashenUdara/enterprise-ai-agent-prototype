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

4. Reset and seed the deterministic demo records:

```bash
bun run db:seed
```

5. Read the records back from Neon:

```bash
bun run db:verify
```

`db:seed` is the explicit demo reset command. It clears MCP activity and restores the deterministic customer, order, shipment, refund-policy, and ticket baseline.

Verify the CRM → ERP → Logistics → Ticketing flow and policy calculations against the seeded database:

```bash
bun run enterprise:verify
```

The service modules live under `lib/enterprise`. They own typed enterprise queries, refund calculations, and validation. The MCP layer calls these functions instead of querying Drizzle directly.

## MCP endpoint

The stateless Streamable HTTP endpoint is available at `/api/mcp`. It requires:

```env
MCP_BEARER_TOKEN=replace-with-a-long-random-secret
MCP_ALLOWED_ORIGINS=localhost,127.0.0.1,your-app.vercel.app
```

`MCP_ALLOWED_ORIGINS` contains hostnames, not full URLs. Requests without an `Origin` header are accepted after bearer authentication; requests that provide `Origin` must match this allowlist.

Verify authentication, Origin rejection, tool discovery, structured tool calls, golden results, and database logging without starting the Next.js server:

```bash
bun run mcp:verify
```

The verification calls all nine read-only MCP tools and creates nine MCP Activity records. Run `bun run db:seed` afterward to restore the clean presentation baseline.

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
