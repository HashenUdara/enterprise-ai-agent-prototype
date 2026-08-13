import { createMcpHandler, McpServer } from "@modelcontextprotocol/server"

import { getCustomer, searchCustomers } from "@/lib/enterprise/crm"
import { getOrder, searchOrders } from "@/lib/enterprise/erp"
import { getShipment, searchShipments } from "@/lib/enterprise/logistics"
import { getRefundOutcome, issueRefund } from "@/lib/enterprise/payments"
import { calculateRefund, getRefundPolicy } from "@/lib/enterprise/policies"
import { searchTickets, updateTicket } from "@/lib/enterprise/ticketing"
import { executeLoggedTool } from "@/lib/mcp/logged-tool"
import {
  calculateRefundInputSchema,
  calculateRefundOutputSchema,
  getCustomerInputSchema,
  getCustomerOutputSchema,
  getOrderInputSchema,
  getOrderOutputSchema,
  getRefundPolicyInputSchema,
  getRefundPolicyOutputSchema,
  getRefundOutcomeInputSchema,
  getRefundOutcomeOutputSchema,
  getShipmentInputSchema,
  getShipmentOutputSchema,
  issueRefundInputSchema,
  issueRefundOutputSchema,
  searchCustomersInputSchema,
  searchCustomersOutputSchema,
  searchOrdersInputSchema,
  searchOrdersOutputSchema,
  searchShipmentsInputSchema,
  searchShipmentsOutputSchema,
  searchTicketsInputSchema,
  searchTicketsOutputSchema,
  updateTicketInputSchema,
  updateTicketOutputSchema,
} from "@/lib/mcp/schemas"

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const

const idempotentFinancialWriteAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: false,
} as const

const ticketWriteAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
} as const

function formatMoney(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountMinor / 100)
}

function createEnterpriseMcpServer() {
  const server = new McpServer({
    name: "enterprise-demo-mcp-server",
    version: "1.0.0",
  })

  server.registerTool(
    "crm_search_customers",
    {
      title: "Search CRM customers",
      description:
        "Search simulated CRM customers by case-insensitive name and/or enterprise tier. Use this first to discover customer IDs before searching orders.",
      inputSchema: searchCustomersInputSchema,
      outputSchema: searchCustomersOutputSchema,
      annotations: readOnlyAnnotations,
    },
    async (input) =>
      executeLoggedTool({
        tool: "crm_search_customers",
        target: input.query ?? input.tier,
        input,
        run: async () => {
          const customers = await searchCustomers(input)
          return { count: customers.length, customers }
        },
        formatText: ({ count, customers }) =>
          count === 0
            ? "No CRM customers matched. Try a broader name query or another tier."
            : `Found ${count} CRM customer${count === 1 ? "" : "s"}: ${customers
                .map(
                  (customer) =>
                    `${customer.name} (${customer.customerId}, ${customer.tier})`
                )
                .join(", ")}.`,
      })
  )

  server.registerTool(
    "crm_get_customer",
    {
      title: "Get CRM customer",
      description:
        "Retrieve one simulated CRM customer by an ID discovered with crm_search_customers. Returns the customer's tier, contact details, and account status.",
      inputSchema: getCustomerInputSchema,
      outputSchema: getCustomerOutputSchema,
      annotations: readOnlyAnnotations,
    },
    async (input) =>
      executeLoggedTool({
        tool: "crm_get_customer",
        target: input.customerId,
        input,
        run: () => getCustomer(input.customerId),
        formatText: (customer) =>
          `${customer.name} (${customer.customerId}) is an ${customer.status.toLowerCase()} ${customer.tier} customer. Contact: ${customer.email}.`,
      })
  )

  server.registerTool(
    "erp_search_orders",
    {
      title: "Search ERP orders",
      description:
        "Search simulated ERP orders by one or more discovered customer IDs and/or order status. Returns totals in integer USD cents and shipment references.",
      inputSchema: searchOrdersInputSchema,
      outputSchema: searchOrdersOutputSchema,
      annotations: readOnlyAnnotations,
    },
    async (input) =>
      executeLoggedTool({
        tool: "erp_search_orders",
        target: input.customerId ?? input.customerIds?.[0] ?? input.status,
        input,
        run: async () => {
          const orders = await searchOrders(input)
          return { count: orders.length, orders }
        },
        formatText: ({ count, orders }) =>
          count === 0
            ? "No ERP orders matched. Verify the customer IDs or try another order status."
            : `Found ${count} ERP order${count === 1 ? "" : "s"}: ${orders
                .map(
                  (order) =>
                    `${order.orderId} (${formatMoney(order.totalAmountMinor, order.currency)}, ${order.status})`
                )
                .join(", ")}.`,
      })
  )

  server.registerTool(
    "erp_get_order",
    {
      title: "Get ERP order",
      description:
        "Retrieve one simulated ERP order by an ID discovered with erp_search_orders. Returns its customer, integer USD total, status, and shipment reference.",
      inputSchema: getOrderInputSchema,
      outputSchema: getOrderOutputSchema,
      annotations: readOnlyAnnotations,
    },
    async (input) =>
      executeLoggedTool({
        tool: "erp_get_order",
        target: input.orderId,
        input,
        run: () => getOrder(input.orderId),
        formatText: (order) =>
          `${order.orderId} belongs to ${order.customerId}, totals ${formatMoney(order.totalAmountMinor, order.currency)}, is ${order.status}, and references shipment ${order.shipmentId}.`,
      })
  )

  server.registerTool(
    "logistics_search_shipments",
    {
      title: "Search logistics shipments",
      description:
        "Search simulated logistics shipments by order IDs, shipment status, and/or minimum delay days. Use order IDs returned by erp_search_orders.",
      inputSchema: searchShipmentsInputSchema,
      outputSchema: searchShipmentsOutputSchema,
      annotations: readOnlyAnnotations,
    },
    async (input) =>
      executeLoggedTool({
        tool: "logistics_search_shipments",
        target: input.orderIds?.[0] ?? input.status,
        input,
        run: async () => {
          const shipments = await searchShipments(input)
          return { count: shipments.length, shipments }
        },
        formatText: ({ count, shipments }) =>
          count === 0
            ? "No logistics shipments matched. Verify the order IDs or adjust the shipment filters."
            : `Found ${count} shipment${count === 1 ? "" : "s"}: ${shipments
                .map(
                  (shipment) =>
                    `${shipment.shipmentId} for ${shipment.orderId} (${shipment.status}, ${shipment.delayDays} delay day${shipment.delayDays === 1 ? "" : "s"})`
                )
                .join(", ")}.`,
      })
  )

  server.registerTool(
    "logistics_get_shipment",
    {
      title: "Get logistics shipment",
      description:
        "Retrieve one simulated shipment by exactly one order ID or shipment ID. Returns carrier, tracking number, status, and delay days.",
      inputSchema: getShipmentInputSchema,
      outputSchema: getShipmentOutputSchema,
      annotations: readOnlyAnnotations,
    },
    async (input) =>
      executeLoggedTool({
        tool: "logistics_get_shipment",
        target: input.orderId ?? input.shipmentId,
        input,
        run: () => getShipment(input),
        formatText: (shipment) =>
          `${shipment.shipmentId} for ${shipment.orderId} is ${shipment.status} with ${shipment.delayDays} delay day${shipment.delayDays === 1 ? "" : "s"}; carrier ${shipment.carrier}, tracking ${shipment.trackingNumber}.`,
      })
  )

  server.registerTool(
    "policy_get_refund_policy",
    {
      title: "Get refund policy",
      description:
        "Retrieve the authoritative simulated refund policy for a customer tier, including its integer percentage and maximum autonomous refund in USD cents.",
      inputSchema: getRefundPolicyInputSchema,
      outputSchema: getRefundPolicyOutputSchema,
      annotations: readOnlyAnnotations,
    },
    async (input) =>
      executeLoggedTool({
        tool: "policy_get_refund_policy",
        target: input.tier,
        input,
        run: () => getRefundPolicy(input.tier),
        formatText: (policy) =>
          `${policy.tier} refunds use ${policy.refundPercentage}% with an autonomous limit of ${formatMoney(policy.maxAutoRefundAmountMinor, policy.currency)}.`,
      })
  )

  server.registerTool(
    "policy_calculate_refund",
    {
      title: "Calculate recommended refund",
      description:
        "Calculate an order's recommended refund from authoritative ERP, CRM, and tier-policy data. Uses integer half-up rounding and reports whether the amount exceeds maxAutoRefund. This tool does not create a refund.",
      inputSchema: calculateRefundInputSchema,
      outputSchema: calculateRefundOutputSchema,
      annotations: readOnlyAnnotations,
    },
    async (input) =>
      executeLoggedTool({
        tool: "policy_calculate_refund",
        target: input.orderId,
        input,
        run: () => calculateRefund(input.orderId),
        formatText: (calculation) =>
          `${calculation.orderId}: ${formatMoney(calculation.orderTotalAmountMinor, calculation.currency)} × ${calculation.refundPercentage}% = ${formatMoney(calculation.recommendedRefundAmountMinor, calculation.currency)}. Autonomous limit: ${formatMoney(calculation.maxAutoRefundAmountMinor, calculation.currency)}; approval ${calculation.requiresApproval ? "is required" : "is not required"}.`,
      })
  )

  server.registerTool(
    "payment_issue_refund",
    {
      title: "Issue policy-controlled refund",
      description:
        "Process a delayed order under authoritative enterprise policy. The server validates eligibility and calculates the amount; callers cannot supply an amount. Creates one completed refund within maxAutoRefund or one pending approval above it. Safe retries return the existing outcome with created=false.",
      inputSchema: issueRefundInputSchema,
      outputSchema: issueRefundOutputSchema,
      annotations: idempotentFinancialWriteAnnotations,
    },
    async (input) =>
      executeLoggedTool({
        tool: "payment_issue_refund",
        target: input.orderId,
        input,
        run: () => issueRefund(input.orderId),
        formatText: (result) =>
          result.status === "COMPLETED"
            ? `${result.created ? "Created" : "Returned existing"} completed refund ${result.refundId} for ${result.orderId}: ${formatMoney(result.amountMinor, result.currency)}.`
            : `${result.created ? "Created" : "Returned existing"} ${result.approvalStatus.toLowerCase()} approval ${result.approvalId} for ${result.orderId}: ${formatMoney(result.amountMinor, result.currency)}. No refund was created.`,
        summarizeResult: (result) => ({
          status: result.status,
          created: result.created,
          orderId: result.orderId,
          amountMinor: result.amountMinor,
          ...(result.status === "COMPLETED"
            ? { refundId: result.refundId }
            : {
                approvalId: result.approvalId,
                approvalStatus: result.approvalStatus,
              }),
        }),
      })
  )

  server.registerTool(
    "payment_get_refund_outcome",
    {
      title: "Get refund outcome",
      description:
        "Verify the persisted payment and human-approval outcome for one order. Use this after a refund attempt or approval decision to confirm final state and rule out duplicate outcomes.",
      inputSchema: getRefundOutcomeInputSchema,
      outputSchema: getRefundOutcomeOutputSchema,
      annotations: readOnlyAnnotations,
    },
    async (input) =>
      executeLoggedTool({
        tool: "payment_get_refund_outcome",
        target: input.orderId,
        input,
        run: () => getRefundOutcome(input.orderId),
        formatText: (outcome) => {
          if (outcome.status === "NOT_STARTED") {
            return `${outcome.orderId} has no refund or approval request.`
          }

          if (outcome.status === "PENDING_APPROVAL") {
            return `${outcome.orderId} has pending approval ${outcome.approval?.approvalId} for ${formatMoney(outcome.approval?.amountMinor ?? 0, outcome.currency)} and no refund.`
          }

          if (outcome.status === "REJECTED") {
            return `${outcome.orderId} has rejected approval ${outcome.approval?.approvalId} and no refund.`
          }

          return `${outcome.orderId} has one completed refund ${outcome.refund?.refundId} for ${formatMoney(outcome.refund?.amountMinor ?? 0, outcome.currency)}${outcome.approval ? ` after approval ${outcome.approval.approvalId}` : " with no approval required"}.`
        },
        summarizeResult: (outcome) => ({
          orderId: outcome.orderId,
          status: outcome.status,
          refundId: outcome.refund?.refundId ?? null,
          approvalId: outcome.approval?.approvalId ?? null,
          approvalStatus: outcome.approval?.status ?? null,
        }),
      })
  )

  server.registerTool(
    "ticketing_search_tickets",
    {
      title: "Search support tickets",
      description:
        "Search simulated support tickets by a bounded list of order IDs and/or ticket status. Use this after finding relevant orders to determine which have open support issues.",
      inputSchema: searchTicketsInputSchema,
      outputSchema: searchTicketsOutputSchema,
      annotations: readOnlyAnnotations,
    },
    async (input) =>
      executeLoggedTool({
        tool: "ticketing_search_tickets",
        target: input.orderIds?.[0] ?? input.status,
        input,
        run: async () => {
          const tickets = await searchTickets(input)
          return { count: tickets.length, tickets }
        },
        formatText: ({ count, tickets }) =>
          count === 0
            ? "No support tickets matched. Verify the order IDs or adjust the ticket status filter."
            : `Found ${count} support ticket${count === 1 ? "" : "s"}: ${tickets
                .map(
                  (ticket) =>
                    `${ticket.ticketId} for ${ticket.orderId} (${ticket.status}: ${ticket.title})`
                )
                .join(", ")}.`,
      })
  )

  server.registerTool(
    "ticketing_update_ticket",
    {
      title: "Update support ticket",
      description:
        "Update one simulated support ticket's status and append a note. Existing notes are preserved. This changes enterprise ticketing state and repeated calls append the note again.",
      inputSchema: updateTicketInputSchema,
      outputSchema: updateTicketOutputSchema,
      annotations: ticketWriteAnnotations,
    },
    async (input) =>
      executeLoggedTool({
        tool: "ticketing_update_ticket",
        target: input.ticketId,
        input,
        run: () => updateTicket(input),
        formatText: (ticket) =>
          `Updated ${ticket.ticketId} to ${ticket.status}. The new note was appended; existing notes were preserved.`,
        summarizeResult: (ticket) => ({
          ticketId: ticket.ticketId,
          orderId: ticket.orderId,
          status: ticket.status,
        }),
      })
  )

  return server
}

export const mcpHandler = createMcpHandler(createEnterpriseMcpServer, {
  legacy: "stateless",
})
