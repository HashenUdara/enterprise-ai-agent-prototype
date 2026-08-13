import { and, asc, eq, ilike } from "drizzle-orm"

import { db } from "@/lib/db"
import { customers, customerTier } from "@/lib/db/schema"
import {
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
    throw new Error(
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
