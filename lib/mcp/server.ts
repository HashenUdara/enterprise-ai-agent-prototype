import { createMcpHandler, McpServer } from "@modelcontextprotocol/server"

import { searchCustomers } from "@/lib/enterprise/crm"
import { searchOrders } from "@/lib/enterprise/erp"
import { searchShipments } from "@/lib/enterprise/logistics"
import { executeLoggedTool } from "@/lib/mcp/logged-tool"
import {
  searchCustomersInputSchema,
  searchCustomersOutputSchema,
  searchOrdersInputSchema,
  searchOrdersOutputSchema,
  searchShipmentsInputSchema,
  searchShipmentsOutputSchema,
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

  return server
}

export const mcpHandler = createMcpHandler(createEnterpriseMcpServer, {
  legacy: "stateless",
})
