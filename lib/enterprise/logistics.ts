import { and, asc, eq, gte, inArray } from "drizzle-orm"

import { db } from "@/lib/db"
import { shipments, shipmentStatus } from "@/lib/db/schema"
import { normalizeIds, normalizeLimit } from "@/lib/enterprise/query-helpers"

export type ShipmentStatus = (typeof shipmentStatus.enumValues)[number]

export type SearchShipmentsInput = {
  orderIds?: string[]
  status?: ShipmentStatus
  minimumDelayDays?: number
  limit?: number
}

export async function searchShipments(input: SearchShipmentsInput) {
  const orderIds = normalizeIds(input.orderIds, "orderIds")

  if (
    input.minimumDelayDays !== undefined &&
    (!Number.isInteger(input.minimumDelayDays) || input.minimumDelayDays < 0)
  ) {
    throw new Error("minimumDelayDays must be a non-negative integer.")
  }

  if (
    orderIds.length === 0 &&
    !input.status &&
    input.minimumDelayDays === undefined
  ) {
    throw new Error(
      "Shipment search requires order IDs, shipment status, or minimum delay days."
    )
  }

  return db
    .select({
      shipmentId: shipments.id,
      orderId: shipments.orderId,
      carrier: shipments.carrier,
      trackingNumber: shipments.trackingNumber,
      status: shipments.status,
      delayDays: shipments.delayDays,
    })
    .from(shipments)
    .where(
      and(
        orderIds.length > 0 ? inArray(shipments.orderId, orderIds) : undefined,
        input.status ? eq(shipments.status, input.status) : undefined,
        input.minimumDelayDays !== undefined
          ? gte(shipments.delayDays, input.minimumDelayDays)
          : undefined
      )
    )
    .orderBy(asc(shipments.orderId), asc(shipments.id))
    .limit(normalizeLimit(input.limit))
}
