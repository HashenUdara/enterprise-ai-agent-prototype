import { and, asc, eq, inArray } from "drizzle-orm"

import { db } from "@/lib/db"
import { orders, orderStatus } from "@/lib/db/schema"
import {
  EnterpriseValidationError,
  normalizeIds,
  normalizeLimit,
  normalizeOptionalText,
} from "@/lib/enterprise/query-helpers"

export type OrderStatus = (typeof orderStatus.enumValues)[number]

export type SearchOrdersInput = {
  customerId?: string
  customerIds?: string[]
  status?: OrderStatus
  limit?: number
}

export async function searchOrders(input: SearchOrdersInput) {
  const customerId = normalizeOptionalText(input.customerId)
  const customerIds = normalizeIds(
    [customerId, ...(input.customerIds ?? [])],
    "customerIds"
  )

  if (customerIds.length === 0 && !input.status) {
    throw new EnterpriseValidationError(
      "Order search requires a customer ID, customer IDs, or order status."
    )
  }

  return db
    .select({
      orderId: orders.id,
      customerId: orders.customerId,
      totalAmountMinor: orders.total,
      status: orders.status,
      shipmentId: orders.shipmentId,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(
      and(
        customerIds.length > 0
          ? inArray(orders.customerId, customerIds)
          : undefined,
        input.status ? eq(orders.status, input.status) : undefined
      )
    )
    .orderBy(asc(orders.id))
    .limit(normalizeLimit(input.limit))
    .then((rows) =>
      rows.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        currency: "USD" as const,
      }))
    )
}

export async function getOrder(orderId: string) {
  const normalizedOrderId = normalizeOptionalText(orderId)

  if (!normalizedOrderId) {
    throw new EnterpriseValidationError("orderId is required.")
  }

  const [order] = await db
    .select({
      orderId: orders.id,
      customerId: orders.customerId,
      totalAmountMinor: orders.total,
      status: orders.status,
      shipmentId: orders.shipmentId,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.id, normalizedOrderId))
    .limit(1)

  if (!order) {
    throw new EnterpriseValidationError(
      `Order ${normalizedOrderId} was not found. Use erp_search_orders to discover a valid order ID.`
    )
  }

  return {
    ...order,
    createdAt: order.createdAt.toISOString(),
    currency: "USD" as const,
  }
}
