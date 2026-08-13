import { and, asc, eq, gte, inArray } from "drizzle-orm"

import { db } from "@/lib/db"
import { shipments, shipmentStatus } from "@/lib/db/schema"
import {
  EnterpriseValidationError,
  normalizeIds,
  normalizeLimit,
  normalizeOptionalText,
} from "@/lib/enterprise/query-helpers"

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
    throw new EnterpriseValidationError(
      "minimumDelayDays must be a non-negative integer."
    )
  }

  if (
    orderIds.length === 0 &&
    !input.status &&
    input.minimumDelayDays === undefined
  ) {
    throw new EnterpriseValidationError(
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

export type GetShipmentInput = {
  orderId?: string
  shipmentId?: string
}

export async function getShipment(input: GetShipmentInput) {
  const orderId = normalizeOptionalText(input.orderId)
  const shipmentId = normalizeOptionalText(input.shipmentId)

  if ((orderId ? 1 : 0) + (shipmentId ? 1 : 0) !== 1) {
    throw new EnterpriseValidationError(
      "Provide exactly one of orderId or shipmentId."
    )
  }

  const [shipment] = await db
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
      orderId
        ? eq(shipments.orderId, orderId)
        : eq(shipments.id, shipmentId as string)
    )
    .limit(1)

  if (!shipment) {
    const target = orderId ?? shipmentId
    throw new EnterpriseValidationError(
      `Shipment for ${target} was not found. Use logistics_search_shipments to discover a valid shipment.`
    )
  }

  return shipment
}
