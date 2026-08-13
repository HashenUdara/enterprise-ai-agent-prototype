import { and, asc, eq, inArray } from "drizzle-orm"

import { db } from "@/lib/db"
import { tickets, ticketStatus } from "@/lib/db/schema"
import {
  EnterpriseValidationError,
  normalizeIds,
  normalizeLimit,
} from "@/lib/enterprise/query-helpers"

export type TicketStatus = (typeof ticketStatus.enumValues)[number]

export type SearchTicketsInput = {
  orderIds?: string[]
  status?: TicketStatus
  limit?: number
}

export async function searchTickets(input: SearchTicketsInput) {
  const orderIds = normalizeIds(input.orderIds, "orderIds")

  if (orderIds.length === 0 && !input.status) {
    throw new EnterpriseValidationError(
      "Ticket search requires order IDs, ticket status, or both."
    )
  }

  return db
    .select({
      ticketId: tickets.id,
      orderId: tickets.orderId,
      customerId: tickets.customerId,
      title: tickets.title,
      status: tickets.status,
      notes: tickets.notes,
      updatedAt: tickets.updatedAt,
    })
    .from(tickets)
    .where(
      and(
        orderIds.length > 0 ? inArray(tickets.orderId, orderIds) : undefined,
        input.status ? eq(tickets.status, input.status) : undefined
      )
    )
    .orderBy(asc(tickets.orderId), asc(tickets.id))
    .limit(normalizeLimit(input.limit))
    .then((rows) =>
      rows.map((row) => ({
        ...row,
        updatedAt: row.updatedAt.toISOString(),
      }))
    )
}
