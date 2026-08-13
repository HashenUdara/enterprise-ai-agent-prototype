import { and, asc, eq, inArray, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { tickets, ticketStatus } from "@/lib/db/schema"
import {
  EnterpriseValidationError,
  normalizeIds,
  normalizeLimit,
  normalizeOptionalText,
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

export type UpdateTicketInput = {
  ticketId: string
  status: TicketStatus
  note: string
}

export async function updateTicket(input: UpdateTicketInput) {
  const ticketId = normalizeOptionalText(input.ticketId)
  const note = normalizeOptionalText(input.note)

  if (!ticketId) {
    throw new EnterpriseValidationError("ticketId is required.")
  }

  if (!note) {
    throw new EnterpriseValidationError("note is required.")
  }

  const [ticket] = await db
    .update(tickets)
    .set({
      status: input.status,
      notes: sql`${tickets.notes} || E'\n' || ${note}`,
      updatedAt: new Date(),
    })
    .where(eq(tickets.id, ticketId))
    .returning({
      ticketId: tickets.id,
      orderId: tickets.orderId,
      customerId: tickets.customerId,
      title: tickets.title,
      status: tickets.status,
      notes: tickets.notes,
      updatedAt: tickets.updatedAt,
    })

  if (!ticket) {
    throw new EnterpriseValidationError(
      `Ticket ${ticketId} was not found. Use ticketing_search_tickets to discover a valid ticket ID.`
    )
  }

  return { ...ticket, updatedAt: ticket.updatedAt.toISOString() }
}
