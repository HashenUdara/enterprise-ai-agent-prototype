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

function assertEqual(label: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${label} is not at the clean demo baseline. Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`
    )
  }
}

const [
  customerCount,
  orderCount,
  shipmentCount,
  policyCount,
  ticketCount,
  refundCount,
  approvalCount,
  logCount,
  policies,
  goldenCustomers,
  goldenOrders,
  goldenTickets,
  scenarioRefunds,
  scenarioApprovals,
] = await Promise.all([
  db.select({ value: count() }).from(customers),
  db.select({ value: count() }).from(orders),
  db.select({ value: count() }).from(shipments),
  db.select({ value: count() }).from(refundPolicies),
  db.select({ value: count() }).from(tickets),
  db.select({ value: count() }).from(refunds),
  db.select({ value: count() }).from(approvals),
  db.select({ value: count() }).from(mcpLogs),
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
      id: customers.id,
      name: customers.name,
      tier: customers.tier,
      status: customers.status,
    })
    .from(customers)
    .where(inArray(customers.id, ["CUS-001", "CUS-002", "CUS-004", "CUS-007"]))
    .orderBy(asc(customers.id)),
  db
    .select({
      orderId: orders.id,
      customerId: orders.customerId,
      total: orders.total,
      shipmentId: shipments.id,
      shipmentStatus: shipments.status,
      delayDays: shipments.delayDays,
    })
    .from(orders)
    .innerJoin(shipments, eq(orders.id, shipments.orderId))
    .where(
      inArray(orders.id, [
        "ORD-1024",
        "ORD-1025",
        "ORD-1042",
        "ORD-1050",
        "ORD-1060",
      ])
    )
    .orderBy(asc(orders.id)),
  db
    .select({
      id: tickets.id,
      orderId: tickets.orderId,
      customerId: tickets.customerId,
      title: tickets.title,
      status: tickets.status,
      notes: tickets.notes,
    })
    .from(tickets)
    .where(inArray(tickets.id, ["TKT-009", "TKT-010"]))
    .orderBy(asc(tickets.id)),
  db
    .select({ orderId: refunds.orderId })
    .from(refunds)
    .where(inArray(refunds.orderId, ["ORD-1050", "ORD-1060"])),
  db
    .select({ orderId: approvals.orderId })
    .from(approvals)
    .where(inArray(approvals.orderId, ["ORD-1050", "ORD-1060"])),
])

const counts = {
  customers: customerCount[0]?.value ?? 0,
  orders: orderCount[0]?.value ?? 0,
  shipments: shipmentCount[0]?.value ?? 0,
  refundPolicies: policyCount[0]?.value ?? 0,
  tickets: ticketCount[0]?.value ?? 0,
  refunds: refundCount[0]?.value ?? 0,
  approvals: approvalCount[0]?.value ?? 0,
  mcpLogs: logCount[0]?.value ?? 0,
}

assertEqual("Table counts", counts, {
  customers: 10,
  orders: 21,
  shipments: 21,
  refundPolicies: 3,
  tickets: 8,
  refunds: 3,
  approvals: 0,
  mcpLogs: 0,
})

assertEqual("Refund policies", policies, [
  { tier: "GOLD", refundPercentage: 20, maxAutoRefund: 100_000 },
  { tier: "SILVER", refundPercentage: 10, maxAutoRefund: 50_000 },
  { tier: "STANDARD", refundPercentage: 5, maxAutoRefund: 25_000 },
])

assertEqual("Golden customers", goldenCustomers, [
  {
    id: "CUS-001",
    name: "Northstar Industries",
    tier: "GOLD",
    status: "ACTIVE",
  },
  {
    id: "CUS-002",
    name: "Meridian Health",
    tier: "GOLD",
    status: "ACTIVE",
  },
  {
    id: "CUS-004",
    name: "Silverline Retail",
    tier: "SILVER",
    status: "ACTIVE",
  },
  {
    id: "CUS-007",
    name: "Atlas Manufacturing",
    tier: "GOLD",
    status: "ACTIVE",
  },
])

assertEqual("Golden orders and shipments", goldenOrders, [
  {
    orderId: "ORD-1024",
    customerId: "CUS-001",
    total: 420_000,
    shipmentId: "SHP-031",
    shipmentStatus: "DELAYED",
    delayDays: 4,
  },
  {
    orderId: "ORD-1025",
    customerId: "CUS-001",
    total: 180_000,
    shipmentId: "SHP-032",
    shipmentStatus: "IN_TRANSIT",
    delayDays: 0,
  },
  {
    orderId: "ORD-1042",
    customerId: "CUS-002",
    total: 250_000,
    shipmentId: "SHP-041",
    shipmentStatus: "DELAYED",
    delayDays: 2,
  },
  {
    orderId: "ORD-1050",
    customerId: "CUS-004",
    total: 320_000,
    shipmentId: "SHP-050",
    shipmentStatus: "DELAYED",
    delayDays: 3,
  },
  {
    orderId: "ORD-1060",
    customerId: "CUS-007",
    total: 650_000,
    shipmentId: "SHP-060",
    shipmentStatus: "DELAYED",
    delayDays: 5,
  },
])

assertEqual("Golden tickets", goldenTickets, [
  {
    id: "TKT-009",
    orderId: "ORD-1024",
    customerId: "CUS-001",
    title: "Production parts delayed",
    status: "OPEN",
    notes: "Customer production schedule is at risk.",
  },
  {
    id: "TKT-010",
    orderId: "ORD-1042",
    customerId: "CUS-002",
    title: "Cold-chain delay follow-up",
    status: "RESOLVED",
    notes: "Replacement delivery plan was confirmed.",
  },
])

assertEqual("Scenario refunds", scenarioRefunds, [])
assertEqual("Scenario approvals", scenarioApprovals, [])

console.log(
  JSON.stringify(
    {
      status: "ready",
      message: "Clean golden demo baseline verified.",
      counts,
    },
    null,
    2
  )
)
