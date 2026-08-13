import { config } from "dotenv"

config({ path: ".env.local", quiet: true })

const [{ searchCustomers }, { searchOrders }, { searchShipments }] =
  await Promise.all([
    import("@/lib/enterprise/crm"),
    import("@/lib/enterprise/erp"),
    import("@/lib/enterprise/logistics"),
  ])

const goldCustomers = await searchCustomers({ tier: "GOLD" })
const goldCustomerIds = goldCustomers.map((customer) => customer.customerId)
const northstarCustomers = await searchCustomers({ query: "northstar" })
const goldOrders = await searchOrders({ customerIds: goldCustomerIds })
const delayedShipments = await searchShipments({
  orderIds: goldOrders.map((order) => order.orderId),
  status: "DELAYED",
})

const actual = {
  goldCustomerIds,
  northstarCustomerIds: northstarCustomers.map(
    (customer) => customer.customerId
  ),
  goldOrderIds: goldOrders.map((order) => order.orderId),
  delayedGoldOrderIds: delayedShipments.map((shipment) => shipment.orderId),
}

const expected = {
  goldCustomerIds: ["CUS-007", "CUS-002", "CUS-001"],
  northstarCustomerIds: ["CUS-001"],
  goldOrderIds: ["ORD-1024", "ORD-1025", "ORD-1042", "ORD-1060"],
  delayedGoldOrderIds: ["ORD-1024", "ORD-1042", "ORD-1060"],
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
])

if (validationChecks.some((result) => result.status !== "rejected")) {
  throw new Error("Enterprise services accepted an invalid unfiltered search.")
}

console.log(JSON.stringify({ status: "verified", ...actual }, null, 2))
