import { createMcpHandler, McpServer } from "@modelcontextprotocol/server"

import { getCustomer, searchCustomers } from "@/lib/enterprise/crm"
import { getOrder, searchOrders } from "@/lib/enterprise/erp"
import { getShipment, searchShipments } from "@/lib/enterprise/logistics"
import { calculateRefund, getRefundPolicy } from "@/lib/enterprise/policies"
import { searchTickets } from "@/lib/enterprise/ticketing"
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
  getShipmentInputSchema,
  getShipmentOutputSchema,
  searchCustomersInputSchema,
  searchCustomersOutputSchema,
  searchOrdersInputSchema,
  searchOrdersOutputSchema,
  searchShipmentsInputSchema,
  searchShipmentsOutputSchema,
  searchTicketsInputSchema,
  searchTicketsOutputSchema,
} from "@/lib/mcp/schemas"

const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
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

  return server
}

export const mcpHandler = createMcpHandler(createEnterpriseMcpServer, {
  legacy: "stateless",
})
