import { config } from "dotenv"
import * as z from "zod/v4"

import {
  calculateRefundOutputSchema,
  getCustomerOutputSchema,
  getOrderOutputSchema,
  getRefundPolicyOutputSchema,
  getShipmentOutputSchema,
  issueRefundOutputSchema,
  searchCustomersOutputSchema,
  searchOrdersOutputSchema,
  searchShipmentsOutputSchema,
  searchTicketsOutputSchema,
  updateTicketOutputSchema,
} from "@/lib/mcp/schemas"

config({ path: ".env.local", quiet: true })

const token = process.env.MCP_BEARER_TOKEN ?? "local-mcp-verification-token"
process.env.MCP_BEARER_TOKEN = token

const [
  { count, desc, eq },
  { db },
  { approvals, mcpLogs, refunds, tickets },
  { handleMcpPost },
] = await Promise.all([
  import("drizzle-orm"),
  import("@/lib/db"),
  import("@/lib/db/schema"),
  import("@/lib/mcp/http"),
])

const jsonRpcResultSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  result: z.record(z.string(), z.unknown()),
})

function createRequest(body: Record<string, unknown>, bearerToken = token) {
  return new Request("http://localhost:3000/api/mcp", {
    method: "POST",
    headers: {
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${bearerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
}

async function readJsonRpcResponse(response: Response) {
  const body = await response.text()

  if (!response.ok) {
    throw new Error(`MCP request failed with ${response.status}: ${body}`)
  }

  if (response.headers.get("content-type")?.includes("application/json")) {
    return jsonRpcResultSchema.parse(JSON.parse(body))
  }

  const dataLine = body.split("\n").find((line) => line.startsWith("data: "))

  if (!dataLine) {
    throw new Error(
      `MCP response did not contain a JSON or SSE result: ${body}`
    )
  }

  return jsonRpcResultSchema.parse(JSON.parse(dataLine.slice(6)))
}

async function callTool(
  id: number,
  name: string,
  args: Record<string, unknown>
) {
  const response = await handleMcpPost(
    createRequest({
      jsonrpc: "2.0",
      id,
      method: "tools/call",
      params: { name, arguments: args },
    })
  )
  const envelope = await readJsonRpcResponse(response)
  return z.object({ structuredContent: z.unknown() }).parse(envelope.result)
    .structuredContent
}

const unauthorized = await handleMcpPost(
  createRequest({ jsonrpc: "2.0", id: 0, method: "tools/list" }, "wrong-token")
)

if (unauthorized.status !== 401) {
  throw new Error(
    `Expected unauthorized MCP request to return 401, got ${unauthorized.status}.`
  )
}

const rejectedOriginRequest = createRequest({
  jsonrpc: "2.0",
  id: 0,
  method: "tools/list",
})
rejectedOriginRequest.headers.set("Origin", "https://attacker.example")
const rejectedOrigin = await handleMcpPost(rejectedOriginRequest)

if (rejectedOrigin.status !== 403) {
  throw new Error(
    `Expected disallowed Origin to return 403, got ${rejectedOrigin.status}.`
  )
}

const listEnvelope = await readJsonRpcResponse(
  await handleMcpPost(
    createRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" })
  )
)
const listedTools = z
  .object({ tools: z.array(z.object({ name: z.string() })) })
  .parse(listEnvelope.result)
  .tools.map((tool) => tool.name)

const expectedTools = [
  "crm_search_customers",
  "crm_get_customer",
  "erp_search_orders",
  "erp_get_order",
  "logistics_search_shipments",
  "logistics_get_shipment",
  "policy_get_refund_policy",
  "policy_calculate_refund",
  "payment_issue_refund",
  "ticketing_search_tickets",
  "ticketing_update_ticket",
]

if (JSON.stringify(listedTools) !== JSON.stringify(expectedTools)) {
  throw new Error(
    `Expected tools ${JSON.stringify(expectedTools)}, received ${JSON.stringify(listedTools)}.`
  )
}

const customerResult = searchCustomersOutputSchema.parse(
  await callTool(2, "crm_search_customers", { tier: "GOLD" })
)
const customerIds = customerResult.customers.map(
  (customer) => customer.customerId
)
const customerDetail = getCustomerOutputSchema.parse(
  await callTool(3, "crm_get_customer", { customerId: "CUS-001" })
)

const orderResult = searchOrdersOutputSchema.parse(
  await callTool(4, "erp_search_orders", { customerIds })
)
const orderIds = orderResult.orders.map((order) => order.orderId)
const orderDetail = getOrderOutputSchema.parse(
  await callTool(5, "erp_get_order", { orderId: "ORD-1050" })
)

const shipmentResult = searchShipmentsOutputSchema.parse(
  await callTool(6, "logistics_search_shipments", {
    orderIds,
    status: "DELAYED",
  })
)
const delayedOrderIds = shipmentResult.shipments.map(
  (shipment) => shipment.orderId
)
const shipmentDetail = getShipmentOutputSchema.parse(
  await callTool(7, "logistics_get_shipment", { orderId: "ORD-1024" })
)
const ticketResult = searchTicketsOutputSchema.parse(
  await callTool(8, "ticketing_search_tickets", {
    orderIds: delayedOrderIds,
    status: "OPEN",
  })
)
const policy = getRefundPolicyOutputSchema.parse(
  await callTool(9, "policy_get_refund_policy", { tier: "SILVER" })
)
const refundCalculation = calculateRefundOutputSchema.parse(
  await callTool(10, "policy_calculate_refund", { orderId: "ORD-1050" })
)
const createdRefund = issueRefundOutputSchema.parse(
  await callTool(11, "payment_issue_refund", { orderId: "ORD-1050" })
)
const existingRefund = issueRefundOutputSchema.parse(
  await callTool(12, "payment_issue_refund", { orderId: "ORD-1050" })
)
const createdApproval = issueRefundOutputSchema.parse(
  await callTool(13, "payment_issue_refund", { orderId: "ORD-1060" })
)
const existingApproval = issueRefundOutputSchema.parse(
  await callTool(14, "payment_issue_refund", { orderId: "ORD-1060" })
)
const updatedTicket = updateTicketOutputSchema.parse(
  await callTool(15, "ticketing_update_ticket", {
    ticketId: "TKT-009",
    status: "IN_PROGRESS",
    note: "Carrier escalation opened during Phase 6 verification.",
  })
)

const [refundCount, approvalCount, storedTicket] = await Promise.all([
  db.select({ count: count() }).from(refunds),
  db.select({ count: count() }).from(approvals),
  db
    .select({ status: tickets.status, notes: tickets.notes })
    .from(tickets)
    .where(eq(tickets.id, "TKT-009"))
    .limit(1),
])

const { issueRefund } = await import("@/lib/enterprise/payments")
const ineligibleResults = await Promise.allSettled([
  issueRefund("ORD-1025"),
  issueRefund("ORD-1080"),
])

if (ineligibleResults.some((result) => result.status !== "rejected")) {
  throw new Error(
    "Refund service accepted an in-transit shipment or an inactive customer."
  )
}

const recentLogs = await db
  .select({ tool: mcpLogs.tool, status: mcpLogs.status })
  .from(mcpLogs)
  .orderBy(desc(mcpLogs.id))
  .limit(14)

const actual = {
  tools: listedTools,
  customerIds,
  orderIds,
  delayedOrderIds,
  openTicketIds: ticketResult.tickets.map((ticket) => ticket.ticketId),
  detailIds: [
    customerDetail.customerId,
    orderDetail.orderId,
    shipmentDetail.shipmentId,
    policy.policyId,
  ],
  refundCalculation: {
    orderId: refundCalculation.orderId,
    amountMinor: refundCalculation.recommendedRefundAmountMinor,
    maxAutoRefundAmountMinor: refundCalculation.maxAutoRefundAmountMinor,
    requiresApproval: refundCalculation.requiresApproval,
  },
  paymentResults: [
    {
      status: createdRefund.status,
      created: createdRefund.created,
      orderId: createdRefund.orderId,
      amountMinor: createdRefund.amountMinor,
    },
    {
      status: existingRefund.status,
      created: existingRefund.created,
      orderId: existingRefund.orderId,
      amountMinor: existingRefund.amountMinor,
    },
    {
      status: createdApproval.status,
      created: createdApproval.created,
      orderId: createdApproval.orderId,
      amountMinor: createdApproval.amountMinor,
    },
    {
      status: existingApproval.status,
      created: existingApproval.created,
      orderId: existingApproval.orderId,
      amountMinor: existingApproval.amountMinor,
    },
  ],
  persistedWrites: {
    refunds: refundCount[0]?.count ?? 0,
    approvals: approvalCount[0]?.count ?? 0,
    ticketStatus: storedTicket[0]?.status,
    ticketNoteAppended:
      storedTicket[0]?.notes.endsWith(
        "Carrier escalation opened during Phase 6 verification."
      ) ?? false,
    returnedTicketMatches:
      updatedTicket.status === storedTicket[0]?.status &&
      updatedTicket.notes === storedTicket[0]?.notes,
  },
  recentLogs,
}

const expected = {
  tools: expectedTools,
  customerIds: ["CUS-007", "CUS-006", "CUS-002", "CUS-001"],
  orderIds: [
    "ORD-1024",
    "ORD-1025",
    "ORD-1042",
    "ORD-1047",
    "ORD-1048",
    "ORD-1060",
  ],
  delayedOrderIds: ["ORD-1024", "ORD-1042", "ORD-1060"],
  openTicketIds: ["TKT-009"],
  detailIds: ["CUS-001", "ORD-1050", "SHP-031", "POL-SILVER"],
  refundCalculation: {
    orderId: "ORD-1050",
    amountMinor: 32_000,
    maxAutoRefundAmountMinor: 50_000,
    requiresApproval: false,
  },
  paymentResults: [
    {
      status: "COMPLETED",
      created: true,
      orderId: "ORD-1050",
      amountMinor: 32_000,
    },
    {
      status: "COMPLETED",
      created: false,
      orderId: "ORD-1050",
      amountMinor: 32_000,
    },
    {
      status: "APPROVAL_REQUIRED",
      created: true,
      orderId: "ORD-1060",
      amountMinor: 130_000,
    },
    {
      status: "APPROVAL_REQUIRED",
      created: false,
      orderId: "ORD-1060",
      amountMinor: 130_000,
    },
  ],
  persistedWrites: {
    refunds: 4,
    approvals: 1,
    ticketStatus: "IN_PROGRESS",
    ticketNoteAppended: true,
    returnedTicketMatches: true,
  },
  recentLogs: [
    { tool: "ticketing_update_ticket", status: "SUCCESS" },
    { tool: "payment_issue_refund", status: "SUCCESS" },
    { tool: "payment_issue_refund", status: "SUCCESS" },
    { tool: "payment_issue_refund", status: "SUCCESS" },
    { tool: "payment_issue_refund", status: "SUCCESS" },
    { tool: "policy_calculate_refund", status: "SUCCESS" },
    { tool: "policy_get_refund_policy", status: "SUCCESS" },
    { tool: "ticketing_search_tickets", status: "SUCCESS" },
    { tool: "logistics_get_shipment", status: "SUCCESS" },
    { tool: "logistics_search_shipments", status: "SUCCESS" },
    { tool: "erp_get_order", status: "SUCCESS" },
    { tool: "erp_search_orders", status: "SUCCESS" },
    { tool: "crm_get_customer", status: "SUCCESS" },
    { tool: "crm_search_customers", status: "SUCCESS" },
  ],
}

if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error(
    `MCP verification failed. Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}.`
  )
}

console.log(JSON.stringify({ status: "verified", ...actual }, null, 2))
