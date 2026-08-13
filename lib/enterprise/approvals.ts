import { sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { EnterpriseValidationError } from "@/lib/enterprise/query-helpers"

export type ApprovalDecision = "APPROVE" | "REJECT"

type ApprovalResolutionRow = {
  approvalId: number
  orderId: string
  amountMinor: number
  approvalStatus: "PENDING" | "APPROVED" | "REJECTED"
  reason: string
  createdAt: Date | string
  resolvedAt: Date | string | null
  refundId: number | null
  refundStatus: "COMPLETED" | null
  refundCreatedAt: Date | string | null
  changed: boolean
  refundCreated: boolean
}

function normalizeApprovalId(approvalId: number) {
  if (!Number.isInteger(approvalId) || approvalId < 1) {
    throw new EnterpriseValidationError(
      "approvalId must be a positive integer."
    )
  }

  return approvalId
}

function toIsoString(value: Date | string) {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString()
}

function formatResolution(row: ApprovalResolutionRow) {
  return {
    approvalId: row.approvalId,
    orderId: row.orderId,
    amountMinor: row.amountMinor,
    approvalStatus: row.approvalStatus,
    reason: row.reason,
    createdAt: toIsoString(row.createdAt),
    resolvedAt: row.resolvedAt ? toIsoString(row.resolvedAt) : null,
    refund:
      row.refundId === null ||
      row.refundStatus === null ||
      row.refundCreatedAt === null
        ? null
        : {
            refundId: row.refundId,
            status: row.refundStatus,
            createdAt: toIsoString(row.refundCreatedAt),
            amountMinor: row.amountMinor,
            currency: "USD" as const,
          },
    changed: row.changed,
    refundCreated: row.refundCreated,
    currency: "USD" as const,
  }
}

async function executeApproval(approvalId: number) {
  // One PostgreSQL statement makes the PENDING -> APPROVED transition and the
  // corresponding refund insert atomic. Concurrent or repeated calls can only
  // transition once and return the already-persisted final state thereafter.
  const result = await db.execute<ApprovalResolutionRow>(sql`
    with transitioned as (
      update approvals
      set status = 'APPROVED', resolved_at = now()
      where id = ${approvalId} and status = 'PENDING'
      returning id, order_id, amount, status, resolved_at
    ),
    created_refund as (
      insert into refunds (order_id, amount, status)
      select order_id, amount, 'COMPLETED'
      from transitioned
      on conflict (order_id) do nothing
      returning id, order_id, amount, status, created_at
    )
    select
      approval.id as "approvalId",
      approval.order_id as "orderId",
      approval.amount as "amountMinor",
      case
        when exists(select 1 from transitioned) then 'APPROVED'::approval_status
        else approval.status
      end as "approvalStatus",
      approval.reason,
      approval.created_at as "createdAt",
      coalesce(
        (select resolved_at from transitioned),
        approval.resolved_at
      ) as "resolvedAt",
      coalesce((select id from created_refund), refund.id) as "refundId",
      coalesce((select status from created_refund), refund.status) as "refundStatus",
      coalesce(
        (select created_at from created_refund),
        refund.created_at
      ) as "refundCreatedAt",
      exists(select 1 from transitioned) as changed,
      exists(select 1 from created_refund) as "refundCreated"
    from approvals approval
    left join refunds refund on refund.order_id = approval.order_id
    where approval.id = ${approvalId}
  `)

  return result.rows[0]
}

async function executeRejection(approvalId: number) {
  const result = await db.execute<ApprovalResolutionRow>(sql`
    with transitioned as (
      update approvals
      set status = 'REJECTED', resolved_at = now()
      where id = ${approvalId} and status = 'PENDING'
      returning id, status, resolved_at
    )
    select
      approval.id as "approvalId",
      approval.order_id as "orderId",
      approval.amount as "amountMinor",
      case
        when exists(select 1 from transitioned) then 'REJECTED'::approval_status
        else approval.status
      end as "approvalStatus",
      approval.reason,
      approval.created_at as "createdAt",
      coalesce(
        (select resolved_at from transitioned),
        approval.resolved_at
      ) as "resolvedAt",
      refund.id as "refundId",
      refund.status as "refundStatus",
      refund.created_at as "refundCreatedAt",
      exists(select 1 from transitioned) as changed,
      false as "refundCreated"
    from approvals approval
    left join refunds refund on refund.order_id = approval.order_id
    where approval.id = ${approvalId}
  `)

  return result.rows[0]
}

export async function resolveApproval(
  approvalId: number,
  decision: ApprovalDecision
) {
  const normalizedApprovalId = normalizeApprovalId(approvalId)

  if (decision !== "APPROVE" && decision !== "REJECT") {
    throw new EnterpriseValidationError("decision must be APPROVE or REJECT.")
  }

  const row =
    decision === "APPROVE"
      ? await executeApproval(normalizedApprovalId)
      : await executeRejection(normalizedApprovalId)

  if (!row) {
    throw new EnterpriseValidationError(
      `Approval ${normalizedApprovalId} was not found.`
    )
  }

  return formatResolution(row)
}

export function approveApproval(approvalId: number) {
  return resolveApproval(approvalId, "APPROVE")
}

export function rejectApproval(approvalId: number) {
  return resolveApproval(approvalId, "REJECT")
}
