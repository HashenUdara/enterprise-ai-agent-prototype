import { EmptyTable } from "@/components/empty-table"
import { PageHeader } from "@/components/page-header"
import { RefreshButton } from "@/components/refresh-button"
import { StatusBadge } from "@/components/status-badge"
import { TableShell } from "@/components/table-shell"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateTime } from "@/lib/dashboard/formatters"
import { getMcpActivity } from "@/lib/dashboard/queries"

export const dynamic = "force-dynamic"

function formatPayload(value: Record<string, unknown>) {
  return JSON.stringify(value, null, 2)
}

export default async function ActivityPage() {
  const activity = (await getMcpActivity()).slice().reverse()

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="MCP Activity"
        description="The persisted, audience-facing audit trail for every tool Codex calls during the live scenarios."
        action={<RefreshButton />}
      />

      <div className="flex items-center gap-3 rounded-2xl bg-secondary px-4 py-3 text-sm text-secondary-foreground">
        <span className="size-2 shrink-0 rounded-full bg-success" />
        Calls appear here after the scenario completes and this page is
        refreshed.
      </div>

      <TableShell
        title={`${activity.length} persisted calls`}
        description="Ordered from the first call to the latest so the tool composition reads as a sequence."
      >
        {activity.length === 0 ? (
          <EmptyTable
            title="The audit trail is ready"
            description="Run a Codex scenario, return here, and select Refresh data."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Sequence</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Tool</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Call details</TableHead>
                <TableHead className="pr-4 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activity.map((log, index) => (
                <TableRow key={log.id}>
                  <TableCell className="pl-4 font-mono text-xs text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {formatDateTime(log.createdAt)}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-medium">
                    {log.tool}
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
      </TableShell>
    </div>
  )
}
