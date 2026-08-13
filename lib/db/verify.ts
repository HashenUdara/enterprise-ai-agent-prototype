import { config } from "dotenv"
import { asc, count, eq } from "drizzle-orm"

config({ path: ".env.local", quiet: true })

const [{ db }, { customers, mcpLogs, orders, shipments }] = await Promise.all([
  import("@/lib/db"),
  import("@/lib/db/schema"),
])

const [customerCount, orderCount, shipmentCount, logCount, goldenOrders] =
  await Promise.all([
    db.select({ count: count() }).from(customers),
    db.select({ count: count() }).from(orders),
    db.select({ count: count() }).from(shipments),
    db.select({ count: count() }).from(mcpLogs),
    db
      .select({
        orderId: orders.id,
        customerName: customers.name,
        total: orders.total,
        shipmentId: shipments.id,
        shipmentStatus: shipments.status,
        delayDays: shipments.delayDays,
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .innerJoin(shipments, eq(orders.id, shipments.orderId))
      .orderBy(asc(orders.id)),
  ])

console.log(
  JSON.stringify(
    {
      counts: {
        customers: customerCount[0]?.count ?? 0,
        orders: orderCount[0]?.count ?? 0,
        shipments: shipmentCount[0]?.count ?? 0,
        mcpLogs: logCount[0]?.count ?? 0,
      },
      goldenOrders,
    },
    null,
    2
  )
)
