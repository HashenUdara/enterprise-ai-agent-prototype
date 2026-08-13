import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { customerTier, refundPolicies } from "@/lib/db/schema"
import { getCustomer } from "@/lib/enterprise/crm"
import { getOrder } from "@/lib/enterprise/erp"
import { EnterpriseValidationError } from "@/lib/enterprise/query-helpers"

export type CustomerTier = (typeof customerTier.enumValues)[number]

export async function getRefundPolicy(tier: CustomerTier) {
  const [policy] = await db
    .select({
      policyId: refundPolicies.id,
      tier: refundPolicies.tier,
      refundPercentage: refundPolicies.refundPercentage,
      maxAutoRefundAmountMinor: refundPolicies.maxAutoRefund,
    })
    .from(refundPolicies)
    .where(eq(refundPolicies.tier, tier))
    .limit(1)

  if (!policy) {
    throw new EnterpriseValidationError(
      `No refund policy exists for ${tier}. Configure the tier policy before calculating a refund.`
    )
  }

  return { ...policy, currency: "USD" as const }
}

export function calculatePercentageAmount(
  amountMinor: number,
  percentage: number
) {
  // All values are non-negative integers. Adding 50 before division implements
  // deterministic half-up rounding to the nearest minor unit.
  return Math.floor((amountMinor * percentage + 50) / 100)
}

export async function calculateRefund(orderId: string) {
  const order = await getOrder(orderId)
  const customer = await getCustomer(order.customerId)
  const policy = await getRefundPolicy(customer.tier)
  const recommendedRefundAmountMinor = calculatePercentageAmount(
    order.totalAmountMinor,
    policy.refundPercentage
  )

  return {
    orderId: order.orderId,
    customerId: customer.customerId,
    customerTier: customer.tier,
    orderTotalAmountMinor: order.totalAmountMinor,
    refundPercentage: policy.refundPercentage,
    recommendedRefundAmountMinor,
    maxAutoRefundAmountMinor: policy.maxAutoRefundAmountMinor,
    currency: "USD" as const,
    requiresApproval:
      recommendedRefundAmountMinor > policy.maxAutoRefundAmountMinor,
  }
}
