import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { approvals, refunds } from "@/lib/db/schema"
import { getCustomer } from "@/lib/enterprise/crm"
import { getShipment } from "@/lib/enterprise/logistics"
import { calculateRefund } from "@/lib/enterprise/policies"
import {
  EnterpriseValidationError,
  normalizeOptionalText,
} from "@/lib/enterprise/query-helpers"

async function findExistingRefund(orderId: string) {
  const [refund] = await db
    .select({
      refundId: refunds.id,
      orderId: refunds.orderId,
      amountMinor: refunds.amount,
      refundStatus: refunds.status,
      createdAt: refunds.createdAt,
    })
    .from(refunds)
    .where(eq(refunds.orderId, orderId))
    .limit(1)

  return refund
}

async function findExistingApproval(orderId: string) {
  const [approval] = await db
    .select({
      approvalId: approvals.id,
      orderId: approvals.orderId,
      amountMinor: approvals.amount,
      approvalStatus: approvals.status,
      reason: approvals.reason,
      createdAt: approvals.createdAt,
      resolvedAt: approvals.resolvedAt,
    })
    .from(approvals)
    .where(eq(approvals.orderId, orderId))
    .limit(1)

  return approval
}

function completedRefundResult(
  refund: NonNullable<Awaited<ReturnType<typeof findExistingRefund>>>,
  created: boolean
) {
  return {
    status: "COMPLETED" as const,
    created,
    refundId: refund.refundId,
    orderId: refund.orderId,
    amountMinor: refund.amountMinor,
    refundStatus: refund.refundStatus,
    createdAt: refund.createdAt.toISOString(),
    currency: "USD" as const,
  }
}

function approvalRequiredResult(
  approval: NonNullable<Awaited<ReturnType<typeof findExistingApproval>>>,
  created: boolean
) {
  return {
    status: "APPROVAL_REQUIRED" as const,
    created,
    approvalId: approval.approvalId,
    orderId: approval.orderId,
    amountMinor: approval.amountMinor,
    approvalStatus: approval.approvalStatus,
    reason: approval.reason,
    createdAt: approval.createdAt.toISOString(),
    resolvedAt: approval.resolvedAt?.toISOString() ?? null,
    currency: "USD" as const,
  }
}

export async function issueRefund(orderId: string) {
  const normalizedOrderId = normalizeOptionalText(orderId)

  if (!normalizedOrderId) {
    throw new EnterpriseValidationError("orderId is required.")
  }

  // Retry state is checked before ordinary eligibility so repeated calls return
  // the original financial outcome instead of a misleading eligibility error.
  const [existingRefund, existingApproval] = await Promise.all([
    findExistingRefund(normalizedOrderId),
    findExistingApproval(normalizedOrderId),
  ])

  if (existingRefund) {
    return completedRefundResult(existingRefund, false)
  }

  if (existingApproval) {
    return approvalRequiredResult(existingApproval, false)
  }

  const calculation = await calculateRefund(normalizedOrderId)
  const [customer, shipment] = await Promise.all([
    getCustomer(calculation.customerId),
    getShipment({ orderId: normalizedOrderId }),
  ])

  if (customer.status !== "ACTIVE") {
    throw new EnterpriseValidationError(
      `Order ${normalizedOrderId} is not refund-eligible because customer ${customer.customerId} is ${customer.status}.`
    )
  }

  if (shipment.status !== "DELAYED" || shipment.delayDays <= 0) {
    throw new EnterpriseValidationError(
      `Order ${normalizedOrderId} is not refund-eligible because shipment ${shipment.shipmentId} is ${shipment.status} with ${shipment.delayDays} delay days.`
    )
  }

  if (!calculation.requiresApproval) {
    const [createdRefund] = await db
      .insert(refunds)
      .values({
        orderId: normalizedOrderId,
        amount: calculation.recommendedRefundAmountMinor,
        status: "COMPLETED",
      })
      .onConflictDoNothing({ target: refunds.orderId })
      .returning({
        refundId: refunds.id,
        orderId: refunds.orderId,
        amountMinor: refunds.amount,
        refundStatus: refunds.status,
        createdAt: refunds.createdAt,
      })

    const refund =
      createdRefund ?? (await findExistingRefund(normalizedOrderId))

    if (!refund) {
      throw new Error("Refund insert did not return or persist a result.")
    }

    return completedRefundResult(refund, createdRefund !== undefined)
  }

  const reason = `${calculation.customerTier} recommended refund of ${calculation.recommendedRefundAmountMinor} USD cents exceeds the autonomous limit of ${calculation.maxAutoRefundAmountMinor} USD cents.`
  const [createdApproval] = await db
    .insert(approvals)
    .values({
      orderId: normalizedOrderId,
      amount: calculation.recommendedRefundAmountMinor,
      status: "PENDING",
      reason,
    })
    .onConflictDoNothing({ target: approvals.orderId })
    .returning({
      approvalId: approvals.id,
      orderId: approvals.orderId,
      amountMinor: approvals.amount,
      approvalStatus: approvals.status,
      reason: approvals.reason,
      createdAt: approvals.createdAt,
      resolvedAt: approvals.resolvedAt,
    })

  const approval =
    createdApproval ?? (await findExistingApproval(normalizedOrderId))

  if (!approval) {
    throw new Error("Approval insert did not return or persist a result.")
  }

  return approvalRequiredResult(approval, createdApproval !== undefined)
}
