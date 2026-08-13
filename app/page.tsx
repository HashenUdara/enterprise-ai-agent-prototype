import Link from "next/link"
import {
  ActivityIcon,
  ArrowRightIcon,
  BoxesIcon,
  CircleDollarSignIcon,
  ClipboardCheckIcon,
  ContactRoundIcon,
  PackageCheckIcon,
} from "lucide-react"

import { EmptyTable } from "@/components/empty-table"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { TableShell } from "@/components/table-shell"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateTime } from "@/lib/dashboard/formatters"
import { getDashboardData } from "@/lib/dashboard/queries"

export const dynamic = "force-dynamic"

const summaryCards = [
  { key: "customers", label: "Customers", icon: ContactRoundIcon },
  { key: "orders", label: "Orders", icon: BoxesIcon },
  {
    key: "delayedShipments",
    label: "Delayed shipments",
    icon: PackageCheckIcon,
  },
  { key: "refunds", label: "Refunds", icon: CircleDollarSignIcon },
  {
    key: "pendingApprovals",
    label: "Pending approvals",
    icon: ClipboardCheckIcon,
  },
  { key: "mcpCalls", label: "MCP calls", icon: ActivityIcon },
] as const

const systems = ["Codex", "CRM / ERP", "Policy", "Payments"]

export default async function DashboardPage() {
  const { counts, recentActivity } = await getDashboardData()
  const newestCall = recentActivity[0]

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Enterprise operations, made visible."
        description="Follow Codex across enterprise systems, verify persisted outcomes, and step in only when policy requires a human decision."
      />

      <section className="relative isolate overflow-hidden rounded-3xl bg-control px-6 py-8 text-white sm:px-10 sm:py-10 lg:min-h-[360px] lg:px-12 lg:py-12">
        <div className="relative grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div className="flex max-w-md flex-col items-start gap-6">
            <div className="flex items-center gap-2 text-sm text-white/65">
              <span className="size-2 rounded-full bg-success" />
              MCP connection ready
            </div>
            <h2 className="text-4xl font-normal tracking-[-0.035em] text-balance sm:text-5xl">
              One request. Every system in view.
            </h2>
            <p className="max-w-[58ch] text-sm leading-6 text-white/65 sm:text-base">
              The orchestration trail stays visible from discovery through
              policy and payment, with every call persisted for the audience.
            </p>
            <Button
              render={<Link href="/activity" />}
              nativeButton={false}
              size="lg"
            >
              Open MCP activity
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </div>

          <div className="relative min-h-[260px] lg:min-h-[300px]">
            <div className="absolute inset-x-0 top-8 rounded-3xl bg-control-elevated p-5 ring-1 ring-white/10 sm:p-7">
              <div className="mb-8 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Orchestration path</p>
                  <p className="mt-1 text-xs text-white/50">
                    Stateless MCP · persisted audit trail
                  </p>
                </div>
                <span className="font-mono text-xs text-white/50">
                  /api/mcp
                </span>
              </div>
              <div className="grid grid-cols-4 items-start gap-2">
                {systems.map((system, index) => (
                  <div key={system} className="relative flex flex-col gap-3">
                    <div className="flex items-center">
                      <span className="flex size-9 items-center justify-center rounded-full bg-white text-xs font-semibold text-control">
                        {index + 1}
                      </span>
                      {index < systems.length - 1 ? (
                        <span className="orchestration-line h-px flex-1 bg-primary" />
                      ) : null}
                    </div>
                    <span className="text-xs text-white/65 sm:text-sm">
                      {system}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="handoff-card absolute right-2 bottom-0 max-w-[82%] rounded-2xl bg-white p-4 text-control shadow-[0_12px_32px_rgba(0,0,0,0.3)] sm:right-8 sm:max-w-sm sm:p-5">
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Latest call</p>
                  <p className="mt-1 truncate font-mono text-sm font-medium">
                    {newestCall?.tool ?? "Waiting for Codex"}
                  </p>
                </div>
                {newestCall ? (
                  <StatusBadge status={newestCall.status} />
                ) : (
                  <span className="text-xs text-muted-foreground">Ready</span>
                )}
              </div>
              <p className="mt-5 text-xs text-muted-foreground">
                {newestCall
                  ? formatDateTime(newestCall.createdAt)
                  : "Run a scenario to begin the audit trail."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid overflow-hidden rounded-2xl ring-1 ring-border sm:grid-cols-2 xl:grid-cols-8">
        <div className="flex flex-col justify-between gap-8 bg-muted p-5 sm:col-span-2 sm:p-6">
          <p className="text-sm font-medium">Current operating picture</p>
          <p className="max-w-xs text-sm leading-6 text-muted-foreground">
            One compact ledger for the records and exceptions that matter in the
            live demonstration.
          </p>
        </div>
        {summaryCards.map((item) => (
          <div
            key={item.key}
            className="flex min-h-32 flex-col justify-between gap-8 border-t border-border p-5 sm:p-6 xl:border-t-0 xl:border-l"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                {item.label}
              </span>
              <item.icon className="text-muted-foreground" aria-hidden="true" />
            </div>
            <span className="font-mono text-3xl font-medium tracking-tight">
              {counts[item.key]}
            </span>
          </div>
        ))}
      </section>

      <TableShell
        title="Recent MCP activity"
        description="The latest persisted calls. Refresh after a Codex scenario to show the new audit trail."
      >
        {recentActivity.length === 0 ? (
          <EmptyTable
            title="No MCP calls yet"
            description="Run a Codex demo scenario, then refresh this page."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Time (Sri Lanka)</TableHead>
                <TableHead>Tool</TableHead>
                <TableHead>Target</TableHead>
                <TableHead className="pr-4 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentActivity.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="pl-4 font-mono text-xs text-muted-foreground">
                    {formatDateTime(log.createdAt)}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-medium">
                    {log.tool}
                  </TableCell>
                  <TableCell>{log.target ?? "—"}</TableCell>
                  <TableCell className="pr-4 text-right">
                    <StatusBadge status={log.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableShell>
    </div>
  )
}
