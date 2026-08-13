import { config } from "dotenv"

config({ path: ".env.local", quiet: true })

const [{ db }, { customers, mcpLogs, orders, shipments }, seedData] =
  await Promise.all([
    import("@/lib/db"),
    import("@/lib/db/schema"),
    import("@/lib/db/seed-data"),
  ])

await db.batch([
  db.delete(mcpLogs),
  db.delete(shipments),
  db.delete(orders),
  db.delete(customers),
  db.insert(customers).values(seedData.seedCustomers),
  db.insert(orders).values(seedData.seedOrders),
  db.insert(shipments).values(seedData.seedShipments),
])

console.log(
  `Seeded ${seedData.seedCustomers.length} customers, ${seedData.seedOrders.length} orders, and ${seedData.seedShipments.length} shipments. MCP activity was cleared.`
)
