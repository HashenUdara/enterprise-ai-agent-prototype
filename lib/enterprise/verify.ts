import { config } from "dotenv"

config({ path: ".env.local", quiet: true })

const [
  { getCustomer, searchCustomers },
  { getOrder, searchOrders },
  { getShipment, searchShipments },
  { calculateRefund, getRefundPolicy },
  { searchTickets },
] = await Promise.all([
  import("@/lib/enterprise/crm"),
  import("@/lib/enterprise/erp"),
  import("@/lib/enterprise/logistics"),
  import("@/lib/enterprise/policies"),
  import("@/lib/enterprise/ticketing"),
])

const goldCustomers = await searchCustomers({ tier: "GOLD" })
const goldCustomerIds = goldCustomers.map((customer) => customer.customerId)
const northstarCustomers = await searchCustomers({ query: "northstar" })
const goldOrders = await searchOrders({ customerIds: goldCustomerIds })
const delayedShipments = await searchShipments({
  orderIds: goldOrders.map((order) => order.orderId),
  status: "DELAYED",
})
const openTickets = await searchTickets({
  orderIds: delayedShipments.map((shipment) => shipment.orderId),
  status: "OPEN",
})
const [northstar, silverlineOrder, northstarShipment, silverPolicy] =
  await Promise.all([
    getCustomer("CUS-001"),
    getOrder("ORD-1050"),
    getShipment({ orderId: "ORD-1024" }),
    getRefundPolicy("SILVER"),
  ])
const [silverlineRefund, atlasRefund] = await Promise.all([
  calculateRefund("ORD-1050"),
  calculateRefund("ORD-1060"),
])

const actual = {
  goldCustomerIds,
  northstarCustomerIds: northstarCustomers.map(
    (customer) => customer.customerId
  ),
  goldOrderIds: goldOrders.map((order) => order.orderId),
  delayedGoldOrderIds: delayedShipments.map((shipment) => shipment.orderId),
  openDelayedGoldTicketIds: openTickets.map((ticket) => ticket.ticketId),
  detailIds: [
    northstar.customerId,
    silverlineOrder.orderId,
    northstarShipment.shipmentId,
    silverPolicy.policyId,
  ],
  refundCalculations: [
    {
      orderId: silverlineRefund.orderId,
      amountMinor: silverlineRefund.recommendedRefundAmountMinor,
      requiresApproval: silverlineRefund.requiresApproval,
    },
    {
      orderId: atlasRefund.orderId,
      amountMinor: atlasRefund.recommendedRefundAmountMinor,
      requiresApproval: atlasRefund.requiresApproval,
    },
  ],
}

const expected = {
  goldCustomerIds: ["CUS-007", "CUS-006", "CUS-002", "CUS-001"],
  northstarCustomerIds: ["CUS-001"],
  goldOrderIds: [
    "ORD-1024",
    "ORD-1025",
    "ORD-1042",
    "ORD-1047",
    "ORD-1048",
    "ORD-1060",
  ],
  delayedGoldOrderIds: ["ORD-1024", "ORD-1042", "ORD-1060"],
  openDelayedGoldTicketIds: ["TKT-009"],
  detailIds: ["CUS-001", "ORD-1050", "SHP-031", "POL-SILVER"],
  refundCalculations: [
    { orderId: "ORD-1050", amountMinor: 32_000, requiresApproval: false },
    { orderId: "ORD-1060", amountMinor: 130_000, requiresApproval: true },
  ],
}

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error(
    `Enterprise service verification failed. Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`
  )
}

const validationChecks = await Promise.allSettled([
  searchCustomers({}),
  searchOrders({}),
  searchShipments({}),
  searchShipments({ minimumDelayDays: -1 }),
  searchTickets({}),
  getShipment({ orderId: "ORD-1024", shipmentId: "SHP-031" }),
  getCustomer("CUS-999"),
  getOrder("ORD-9999"),
])

if (validationChecks.some((result) => result.status !== "rejected")) {
  throw new Error("Enterprise services accepted an invalid unfiltered search.")
}

console.log(JSON.stringify({ status: "verified", ...actual }, null, 2))
