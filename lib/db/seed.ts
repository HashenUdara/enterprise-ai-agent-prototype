import { config } from "dotenv"

config({ path: ".env.local", quiet: true })

const [
  { db },
  { customers, mcpLogs, orders, refundPolicies, shipments, tickets },
  seedData,
] = await Promise.all([
  import("@/lib/db"),
  import("@/lib/db/schema"),
  import("@/lib/db/seed-data"),
])

await db.batch([
  db.delete(mcpLogs),
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
])

console.log(
  `Seeded ${seedData.seedCustomers.length} customers, ${seedData.seedOrders.length} orders, ${seedData.seedShipments.length} shipments, ${seedData.seedRefundPolicies.length} refund policies, and ${seedData.seedTickets.length} tickets. MCP activity was cleared.`
)
