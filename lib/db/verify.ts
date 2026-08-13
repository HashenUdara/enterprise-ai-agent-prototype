import { config } from "dotenv"
import { asc, count, eq, inArray } from "drizzle-orm"

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
] = await Promise.all([import("@/lib/db"), import("@/lib/db/schema")])

const [
  customerCount,
  orderCount,
  shipmentCount,
  policyCount,
  ticketCount,
  refundCount,
  approvalCount,
  logCount,
  goldenOrders,
  policies,
  goldenTickets,
  scenarioRefunds,
  scenarioApprovals,
] = await Promise.all([
  db.select({ count: count() }).from(customers),
  db.select({ count: count() }).from(orders),
  db.select({ count: count() }).from(shipments),
  db.select({ count: count() }).from(refundPolicies),
  db.select({ count: count() }).from(tickets),
  db.select({ count: count() }).from(refunds),
  db.select({ count: count() }).from(approvals),
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
  db
    .select({
      tier: refundPolicies.tier,
      refundPercentage: refundPolicies.refundPercentage,
      maxAutoRefund: refundPolicies.maxAutoRefund,
    })
    .from(refundPolicies)
    .orderBy(asc(refundPolicies.tier)),
  db
    .select({
      ticketId: tickets.id,
      orderId: tickets.orderId,
      status: tickets.status,
    })
    .from(tickets)
    .where(eq(tickets.orderId, "ORD-1024")),
  db
    .select({ orderId: refunds.orderId, status: refunds.status })
    .from(refunds)
    .where(inArray(refunds.orderId, ["ORD-1050", "ORD-1060"])),
  db
    .select({ orderId: approvals.orderId, status: approvals.status })
    .from(approvals)
    .where(inArray(approvals.orderId, ["ORD-1050", "ORD-1060"])),
])

console.log(
  JSON.stringify(
    {
      counts: {
        customers: customerCount[0]?.count ?? 0,
        orders: orderCount[0]?.count ?? 0,
        shipments: shipmentCount[0]?.count ?? 0,
        refundPolicies: policyCount[0]?.count ?? 0,
        tickets: ticketCount[0]?.count ?? 0,
        refunds: refundCount[0]?.count ?? 0,
        approvals: approvalCount[0]?.count ?? 0,
        mcpLogs: logCount[0]?.count ?? 0,
      },
      goldenOrders,
      policies,
      goldenTickets,
      liveScenarioBaseline: {
        refunds: scenarioRefunds,
        approvals: scenarioApprovals,
      },
    },
    null,
    2
  )
)
