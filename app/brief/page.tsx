import Link from "next/link"
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  CircleDotIcon,
  ShieldCheckIcon,
} from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { RefreshButton } from "@/components/refresh-button"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatMoney } from "@/lib/dashboard/formatters"
import { getOperationsBrief } from "@/lib/dashboard/queries"

export const dynamic = "force-dynamic"

export default async function OperationsBriefPage() {
  const brief = await getOperationsBrief()
  const complete =
    brief.outcomes.northstarTicketUpdated &&
    brief.outcomes.silverlineRefunded &&
    brief.outcomes.atlasApprovalStatus === "APPROVED" &&
    brief.outcomes.atlasRefunded &&
    brief.outcomes.finalVerificationComplete

  const stories = [
    {
      customer: "Northstar Industries",
      orderId: "ORD-1024",
      action: "Support incident moved into investigation",
      businessStatus: brief.outcomes.northstarTicketUpdated
        ? "IN_PROGRESS"
        : "OPEN",
      complete: brief.outcomes.northstarTicketUpdated,
    },
    {
      customer: "Silverline Retail",
      orderId: "ORD-1050",
      action: "Policy-compliant $320 autonomous refund",
      businessStatus: brief.outcomes.silverlineRefunded
        ? "COMPLETED"
        : "NOT_STARTED",
      complete: brief.outcomes.silverlineRefunded,
    },
    {
      customer: "Atlas Manufacturing",
      orderId: "ORD-1060",
      action: "Human-governed $1,300 refund",
      businessStatus: brief.outcomes.atlasRefunded
        ? "COMPLETED"
        : (brief.outcomes.atlasApprovalStatus ?? "NOT_STARTED"),
      complete: brief.outcomes.atlasRefunded,
    },
  ]

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Operations brief"
        description="A defensible summary of what Codex investigated, changed, escalated, and verified during this demo session."
        action={<RefreshButton />}
      />

      <section className="overflow-hidden rounded-xl bg-[#0a0b0d] text-white">
        <div className="grid gap-10 p-6 sm:p-8 lg:grid-cols-[1.25fr_0.75fr] lg:p-10">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary">
                {complete ? (
                  <CheckCircle2Icon className="size-5" />
                ) : (
                  <CircleDotIcon className="size-5" />
                )}
              </span>
              <StatusBadge status={complete ? "COMPLETED" : "IN_PROGRESS"} />
            </div>
            <h2 className="max-w-3xl text-3xl font-normal tracking-[-0.03em] text-balance sm:text-5xl">
              {complete
                ? "The operational loop is closed—with autonomy, escalation, and auditability intact."
                : brief.activity.length === 0
                  ? "The clean demo is ready. No operational actions have been taken."
                  : "Codex is building the operational picture. Refresh after the next act."}
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/75">
              Every figure below is calculated from persisted enterprise records
              and this session&apos;s MCP audit trail.
            </p>
          </div>
          <div className="grid content-start divide-y divide-white/10 rounded-xl bg-[#16181c] px-5 sm:px-6">
            {[
              ["Systems consulted", brief.metrics.systemsConsulted],
              ["Logged targets", brief.metrics.recordsInvestigated],
              ["Completed actions", brief.metrics.completedActions],
              ["Human escalations", brief.metrics.escalations],
              ["Duplicates prevented", brief.metrics.duplicatePreventions],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-6 py-4"
              >
                <span className="text-base text-white/70">{label}</span>
                <span className="font-mono text-2xl">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-normal tracking-[-0.02em]">
              Session narrative
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Investigation, operational action, autonomous payment, and human
              control in one sequence.
            </p>
          </div>
          <Button
            variant="outline"
            render={<Link href="/activity" />}
            nativeButton={false}
          >
            Inspect all MCP calls
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>

        <div className="divide-y divide-border border-y border-border">
          {stories.map((story, index) => (
            <div
              key={story.orderId}
              className="grid gap-4 py-6 sm:grid-cols-[48px_1fr_auto] sm:items-center"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-secondary font-mono text-xs text-secondary-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/cases/${story.orderId}`}
                    className="font-medium underline-offset-4 hover:text-primary hover:underline"
                  >
                    {story.customer}
                  </Link>
                  <span className="font-mono text-xs text-muted-foreground">
                    {story.orderId}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {story.action}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <span className="text-sm font-medium text-primary">
                  {story.complete ? "Act complete" : "Act pending"}
                </span>
                <StatusBadge status={story.businessStatus} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-normal tracking-[-0.02em]">
            Verified payment outcomes
          </h2>
          <p className="mt-1 text-base text-muted-foreground">
            Concrete persisted identifiers and the Act 5 MCP verification state.
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Customer</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Refund</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Business state</TableHead>
                <TableHead className="pr-4 text-right">
                  MCP verification
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brief.outcomes.financial.map((outcome) => (
                <TableRow key={outcome.orderId}>
                  <TableCell className="pl-4 font-medium">
                    {outcome.customer}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {outcome.orderId}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {outcome.refundId
                      ? `RFD-${String(outcome.refundId).padStart(4, "0")}`
                      : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {outcome.approvalId
                      ? `APR-${String(outcome.approvalId).padStart(4, "0")}`
                      : "—"}
                  </TableCell>
                  <TableCell className="font-mono font-medium">
                    {formatMoney(outcome.amount)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={outcome.status} />
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <StatusBadge
                      status={outcome.verified ? "VERIFIED" : "WAITING"}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl bg-secondary p-6 sm:p-8">
          <ShieldCheckIcon className="size-6 text-primary" />
          <h2 className="mt-8 text-2xl font-normal tracking-[-0.02em]">
            Governance remained visible
          </h2>
          <div className="mt-5 grid gap-3 text-sm">
            <div className="flex justify-between gap-4 border-t border-border pt-3">
              <span className="text-muted-foreground">Read calls</span>
              <span className="font-mono">{brief.metrics.readCalls}</span>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-3">
              <span className="text-muted-foreground">Policy decisions</span>
              <span className="font-mono">{brief.metrics.policyDecisions}</span>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-3">
              <span className="text-muted-foreground">Mutation calls</span>
              <span className="font-mono">{brief.metrics.mutationCalls}</span>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border p-6 sm:p-8">
          <p className="text-sm text-muted-foreground">Systems in evidence</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {brief.metrics.systemNames.length === 0 ? (
              <span className="text-sm text-muted-foreground">
                Systems appear after the first MCP calls.
              </span>
            ) : (
              brief.metrics.systemNames.map((system) => (
                <span
                  key={system}
                  className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium"
                >
                  {system}
                </span>
              ))
            )}
          </div>
          <p className="mt-8 text-sm leading-6 text-muted-foreground">
            Refresh this page after the closing verification prompt. Completed
            outcomes and duplicate prevention are derived from persisted state,
            not generated presentation copy.
          </p>
        </section>
      </div>
    </div>
  )
}
