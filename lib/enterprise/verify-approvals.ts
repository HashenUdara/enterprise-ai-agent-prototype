import { config } from "dotenv"
import { count, eq, sql } from "drizzle-orm"

config({ path: ".env.local", quiet: true })

const [
  { db },
  { approvals, refunds },
  { approveApproval, rejectApproval, resolveApproval },
  { issueRefund },
] = await Promise.all([
  import("@/lib/db"),
  import("@/lib/db/schema"),
  import("@/lib/enterprise/approvals"),
  import("@/lib/enterprise/payments"),
])

async function clearAtlasResolution() {
  await db.batch([
    db.delete(refunds).where(eq(refunds.orderId, "ORD-1060")),
    db.delete(approvals).where(eq(approvals.orderId, "ORD-1060")),
    db.execute(sql`alter sequence approvals_id_seq restart with 1`),
  ])
}

await clearAtlasResolution()

const pendingForApproval = await issueRefund("ORD-1060")

if (pendingForApproval.status !== "APPROVAL_REQUIRED") {
  throw new Error("Atlas did not create an approval request.")
}

const approvalId = pendingForApproval.approvalId
const approvalAttempts = await Promise.all(
  Array.from({ length: 8 }, () => approveApproval(approvalId))
)
const approved = approvalAttempts.find((result) => result.changed)
const repeatedApprovals = approvalAttempts.filter((result) => !result.changed)
const rejectedAfterApproval = await rejectApproval(approvalId)
const paymentRetryAfterApproval = await issueRefund("ORD-1060")

if (!approved) {
  throw new Error("No concurrent approval attempt performed the transition.")
}

const [approvedRefundCount, approvedRefund] = await Promise.all([
  db
    .select({ count: count() })
    .from(refunds)
    .where(eq(refunds.orderId, "ORD-1060")),
  db
    .select({ amountMinor: refunds.amount, status: refunds.status })
    .from(refunds)
    .where(eq(refunds.orderId, "ORD-1060"))
    .limit(1),
])

const approvalActual = {
  initial: {
    status: approved.approvalStatus,
    changed: approved.changed,
    refundCreated: approved.refundCreated,
    refundAmountMinor: approved.refund?.amountMinor,
  },
  repeated: repeatedApprovals.map((result) => ({
    status: result.approvalStatus,
    changed: result.changed,
    refundCreated: result.refundCreated,
    refundId: result.refund?.refundId,
  })),
  rejectAfterApproval: {
    status: rejectedAfterApproval.approvalStatus,
    changed: rejectedAfterApproval.changed,
    refundId: rejectedAfterApproval.refund?.refundId,
  },
  paymentRetry: {
    status: paymentRetryAfterApproval.status,
    created: paymentRetryAfterApproval.created,
  },
  refundCount: approvedRefundCount[0]?.count ?? 0,
  refund: approvedRefund[0],
}

if (
  approvalActual.initial.status !== "APPROVED" ||
  !approvalActual.initial.changed ||
  !approvalActual.initial.refundCreated ||
  approvalActual.initial.refundAmountMinor !== 130_000 ||
  approvalActual.refundCount !== 1 ||
  approvalActual.refund?.amountMinor !== 130_000 ||
  approvalActual.refund?.status !== "COMPLETED" ||
  approvalActual.repeated.some(
    (result) =>
      result.status !== "APPROVED" || result.changed || result.refundCreated
  ) ||
  approvalActual.rejectAfterApproval.status !== "APPROVED" ||
  approvalActual.rejectAfterApproval.changed ||
  approvalActual.paymentRetry.status !== "COMPLETED" ||
  approvalActual.paymentRetry.created
) {
  throw new Error(
    `Approval verification failed: ${JSON.stringify(approvalActual)}`
  )
}

await clearAtlasResolution()

const pendingForRejection = await issueRefund("ORD-1060")

if (pendingForRejection.status !== "APPROVAL_REQUIRED") {
  throw new Error("Atlas did not create an approval request for rejection.")
}

const rejected = await rejectApproval(pendingForRejection.approvalId)
const repeatedRejection = await rejectApproval(pendingForRejection.approvalId)
const approvedAfterRejection = await approveApproval(
  pendingForRejection.approvalId
)
const paymentRetryAfterRejection = await issueRefund("ORD-1060")
const rejectedRefundCount = await db
  .select({ count: count() })
  .from(refunds)
  .where(eq(refunds.orderId, "ORD-1060"))

const rejectionActual = {
  initial: {
    status: rejected.approvalStatus,
    changed: rejected.changed,
    refund: rejected.refund,
  },
  repeated: {
    status: repeatedRejection.approvalStatus,
    changed: repeatedRejection.changed,
  },
  approveAfterRejection: {
    status: approvedAfterRejection.approvalStatus,
    changed: approvedAfterRejection.changed,
    refund: approvedAfterRejection.refund,
  },
  paymentRetry: {
    status: paymentRetryAfterRejection.status,
    created: paymentRetryAfterRejection.created,
    approvalStatus:
      paymentRetryAfterRejection.status === "APPROVAL_REQUIRED"
        ? paymentRetryAfterRejection.approvalStatus
        : undefined,
  },
  refundCount: rejectedRefundCount[0]?.count ?? 0,
}

if (
  rejectionActual.initial.status !== "REJECTED" ||
  !rejectionActual.initial.changed ||
  rejectionActual.initial.refund !== null ||
  rejectionActual.repeated.status !== "REJECTED" ||
  rejectionActual.repeated.changed ||
  rejectionActual.approveAfterRejection.status !== "REJECTED" ||
  rejectionActual.approveAfterRejection.changed ||
  rejectionActual.approveAfterRejection.refund !== null ||
  rejectionActual.paymentRetry.status !== "APPROVAL_REQUIRED" ||
  rejectionActual.paymentRetry.created ||
  rejectionActual.paymentRetry.approvalStatus !== "REJECTED" ||
  rejectionActual.refundCount !== 0
) {
  throw new Error(
    `Rejection verification failed: ${JSON.stringify(rejectionActual)}`
  )
}

const missingApproval = await Promise.allSettled([
  resolveApproval(999_999, "APPROVE"),
  resolveApproval(0, "REJECT"),
  resolveApproval(1, "INVALID" as "APPROVE"),
])

if (missingApproval.some((result) => result.status !== "rejected")) {
  throw new Error("Approval service accepted an invalid approval ID.")
}

console.log(
  JSON.stringify(
    {
      status: "verified",
      approval: approvalActual,
      rejection: rejectionActual,
    },
    null,
    2
  )
)
