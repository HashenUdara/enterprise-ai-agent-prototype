import { ActivityLedger } from "@/components/activity-ledger"
import { EmptyTable } from "@/components/empty-table"
import { PageHeader } from "@/components/page-header"
import { RefreshButton } from "@/components/refresh-button"
import { TableShell } from "@/components/table-shell"
import { getMcpActivity } from "@/lib/dashboard/queries"

export const dynamic = "force-dynamic"

export default async function ActivityPage() {
  const activity = (await getMcpActivity()).slice().reverse()
  const serializedActivity = activity.map((log) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
  }))

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
          <ActivityLedger activity={serializedActivity} />
        )}
      </TableShell>
    </div>
  )
}
