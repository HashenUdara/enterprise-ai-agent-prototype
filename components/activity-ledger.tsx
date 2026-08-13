"use client"

import { useMemo, useState } from "react"

import { EmptyTable } from "@/components/empty-table"
import { StatusBadge } from "@/components/status-badge"
import { Badge } from "@/components/ui/badge"
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

export type ActivityRecord = {
  id: number
  tool: string
  target: string | null
  input: Record<string, unknown>
  result: Record<string, unknown>
  status: "SUCCESS" | "FAILURE"
  createdAt: string
}

type ActivityFilter = "all" | "reads" | "mutations" | "policy" | "approvals"

const filters: { value: ActivityFilter; label: string }[] = [
  { value: "all", label: "All calls" },
  { value: "reads", label: "Reads" },
  { value: "mutations", label: "Mutations" },
  { value: "policy", label: "Policy" },
  { value: "approvals", label: "Approval boundaries" },
]

function isMutation(tool: string) {
  return tool === "payment_issue_refund" || tool === "ticketing_update_ticket"
}

function isApprovalBoundary(log: ActivityRecord) {
  return (
    log.tool === "payment_issue_refund" &&
    (log.result.status === "APPROVAL_REQUIRED" ||
      typeof log.result.approvalStatus === "string")
  )
}

function matchesFilter(log: ActivityRecord, filter: ActivityFilter) {
  if (filter === "all") return true
  if (filter === "mutations") return isMutation(log.tool)
  if (filter === "policy") return log.tool.startsWith("policy_")
  if (filter === "approvals") return isApprovalBoundary(log)

  return !isMutation(log.tool) && !log.tool.startsWith("policy_")
}

function callType(log: ActivityRecord) {
  if (isApprovalBoundary(log)) return "Approval boundary"
  if (isMutation(log.tool)) return "Mutation"
  if (log.tool.startsWith("policy_")) return "Policy"
  return "Read"
}

function formatPayload(value: Record<string, unknown>) {
  return JSON.stringify(
    value,
    (key, nestedValue) => {
      if (
        typeof nestedValue === "string" &&
        /(?:At|_at)$/.test(key) &&
        !Number.isNaN(Date.parse(nestedValue))
      ) {
        return formatDateTime(nestedValue)
      }

      return nestedValue
    },
    2
  )
}

export function ActivityLedger({ activity }: { activity: ActivityRecord[] }) {
  const [filter, setFilter] = useState<ActivityFilter>("all")
  const visibleActivity = useMemo(
    () => activity.filter((log) => matchesFilter(log, filter)),
    [activity, filter]
  )

  return (
    <>
      <div className="flex flex-wrap gap-2 border-b border-border px-4 pb-4">
        {filters.map((item) => {
          const count = activity.filter((log) =>
            matchesFilter(log, item.value)
          ).length

          return (
            <Button
              key={item.value}
              type="button"
              variant={filter === item.value ? "default" : "outline"}
              aria-pressed={filter === item.value}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
              <span className="font-mono text-sm opacity-70">{count}</span>
            </Button>
          )
        })}
      </div>

      {visibleActivity.length === 0 ? (
        <EmptyTable
          title="No calls in this category"
          description="Choose another filter or run the corresponding demo step."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Sequence</TableHead>
              <TableHead>Time (Sri Lanka)</TableHead>
              <TableHead>Tool</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Call details</TableHead>
              <TableHead className="pr-4 text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleActivity.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="pl-4 font-mono text-sm text-muted-foreground">
                  {String(activity.indexOf(log) + 1).padStart(2, "0")}
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {formatDateTime(log.createdAt)}
                </TableCell>
                <TableCell className="font-mono text-sm font-medium">
                  {log.tool}
                </TableCell>
                <TableCell>
                  <Badge variant={isMutation(log.tool) ? "info" : "secondary"}>
                    {callType(log)}
                  </Badge>
                </TableCell>
                <TableCell>{log.target ?? "—"}</TableCell>
                <TableCell>
                  <details className="group max-w-md">
                    <summary className="cursor-pointer text-sm font-medium text-primary underline-offset-4 hover:underline">
                      View input and result
                    </summary>
                    <div className="mt-3 grid gap-3 whitespace-normal">
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                          Input
                        </p>
                        <pre className="max-h-48 overflow-auto rounded-xl bg-muted p-3 font-mono text-xs leading-5">
                          {formatPayload(log.input)}
                        </pre>
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-medium text-muted-foreground">
                          Result
                        </p>
                        <pre className="max-h-56 overflow-auto rounded-xl bg-muted p-3 font-mono text-xs leading-5">
                          {formatPayload(log.result)}
                        </pre>
                      </div>
                    </div>
                  </details>
                </TableCell>
                <TableCell className="pr-4 text-right">
                  <StatusBadge status={log.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </>
  )
}
