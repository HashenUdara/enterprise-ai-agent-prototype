import { and, asc, eq, ilike } from "drizzle-orm"

import { db } from "@/lib/db"
import { customers, customerTier } from "@/lib/db/schema"
import {
  EnterpriseValidationError,
  escapeLikePattern,
  normalizeLimit,
  normalizeOptionalText,
} from "@/lib/enterprise/query-helpers"

export type CustomerTier = (typeof customerTier.enumValues)[number]

export type SearchCustomersInput = {
  query?: string
  tier?: CustomerTier
  limit?: number
}

export async function searchCustomers(input: SearchCustomersInput) {
  const query = normalizeOptionalText(input.query)

  if (!query && !input.tier) {
    throw new EnterpriseValidationError(
      "Customer search requires a name query or tier. Provide query, tier, or both."
    )
  }

  return db
    .select({
      customerId: customers.id,
      name: customers.name,
      tier: customers.tier,
      email: customers.email,
      status: customers.status,
    })
    .from(customers)
    .where(
      and(
        query
          ? ilike(customers.name, `%${escapeLikePattern(query)}%`)
          : undefined,
        input.tier ? eq(customers.tier, input.tier) : undefined
      )
    )
    .orderBy(asc(customers.name), asc(customers.id))
    .limit(normalizeLimit(input.limit))
}

export async function getCustomer(customerId: string) {
  const normalizedCustomerId = normalizeOptionalText(customerId)

  if (!normalizedCustomerId) {
    throw new EnterpriseValidationError("customerId is required.")
  }

  const [customer] = await db
    .select({
      customerId: customers.id,
      name: customers.name,
      tier: customers.tier,
      email: customers.email,
      status: customers.status,
    })
    .from(customers)
    .where(eq(customers.id, normalizedCustomerId))
    .limit(1)

  if (!customer) {
    throw new EnterpriseValidationError(
      `Customer ${normalizedCustomerId} was not found. Use crm_search_customers to discover a valid customer ID.`
    )
  }

  return customer
}
