import { config } from "dotenv"
import { sql } from "drizzle-orm"

config({ path: ".env.local", quiet: true })

const [
  { db },
  {
    approvals,
    customers,
    mcpLogs,
    orders,
    refundPolicies,
    refunds,
    shipments,
    tickets,
  },
  seedData,
] = await Promise.all([
  import("@/lib/db"),
  import("@/lib/db/schema"),
  import("@/lib/db/seed-data"),
])

await db.batch([
  db.delete(mcpLogs),
  db.delete(approvals),
  db.delete(refunds),
  db.execute(sql`alter sequence approvals_id_seq restart with 1`),
  db.execute(sql`alter sequence refunds_id_seq restart with 1`),
  db.delete(tickets),
  db.delete(refundPolicies),
  db.delete(shipments),
  db.delete(orders),
  db.delete(customers),
  db.insert(customers).values(seedData.seedCustomers),
  db.insert(orders).values(seedData.seedOrders),
  db.insert(shipments).values(seedData.seedShipments),
  db.insert(refundPolicies).values(seedData.seedRefundPolicies),
  db.insert(tickets).values(seedData.seedTickets),
  db.insert(refunds).values(seedData.seedRefunds),
])

console.log(
  `Seeded ${seedData.seedCustomers.length} customers, ${seedData.seedOrders.length} orders, ${seedData.seedShipments.length} shipments, ${seedData.seedRefundPolicies.length} refund policies, ${seedData.seedTickets.length} tickets, and ${seedData.seedRefunds.length} historical refunds. Scenario approvals and MCP activity were cleared.`
)
