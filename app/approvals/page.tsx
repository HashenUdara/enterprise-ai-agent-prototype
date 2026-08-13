import { ApprovalActions } from "@/components/approval-actions"
import { EmptyTable } from "@/components/empty-table"
import { PageHeader } from "@/components/page-header"
import { RefreshButton } from "@/components/refresh-button"
import { StatusBadge } from "@/components/status-badge"
import { TableShell } from "@/components/table-shell"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateTime, formatMoney } from "@/lib/dashboard/formatters"
import { getApprovals } from "@/lib/dashboard/queries"

export const dynamic = "force-dynamic"

export default async function ApprovalsPage() {
  const approvals = await getApprovals()
  const pending = approvals.filter((approval) => approval.status === "PENDING")
  const resolved = approvals.filter((approval) => approval.status !== "PENDING")

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Approvals"
        description="Human review for policy-compliant refunds above a customer tier’s autonomous limit."
        action={<RefreshButton />}
      />

      <section className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-medium">Needs a decision</h2>
            <p className="text-sm text-muted-foreground">
              Approval creates one refund atomically; rejection creates none.
            </p>
          </div>
          <span className="font-mono text-sm text-muted-foreground">
            {pending.length} pending
          </span>
        </div>

        {pending.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyTable
                title="No pending approvals"
                description="Run the Atlas Manufacturing refund scenario, then refresh this page."
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {pending.map((approval) => (
              <Card key={approval.id}>
                <CardHeader>
                  <div>
                    <CardDescription>
                      Approval APR-{String(approval.id).padStart(4, "0")}
                    </CardDescription>
                    <CardTitle className="mt-2 text-2xl font-normal tracking-[-0.02em]">
                      {formatMoney(approval.amount)} for {approval.orderId}
                    </CardTitle>
                  </div>
                  <CardAction>
                    <StatusBadge status={approval.status} />
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                  <div className="grid grid-cols-2 gap-4 rounded-2xl bg-muted p-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Customer</p>
                      <p className="mt-1 font-medium">
                        {approval.customerName}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Requested (Sri Lanka)
                      </p>
                      <p className="mt-1 font-mono text-sm">
                        {formatDateTime(approval.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Policy reason
                    </p>
                    <p className="mt-2 leading-6">{approval.reason}</p>
                  </div>
                </CardContent>
                <CardFooter className="justify-end">
                  <ApprovalActions
                    approvalId={approval.id}
                    orderId={approval.orderId}
                    amount={approval.amount}
                  />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>

      <TableShell
        title="Decision history"
        description="Resolved requests remain visible with their final refund outcome."
      >
        {resolved.length === 0 ? (
          <EmptyTable
            title="No decisions recorded"
            description="Approved or rejected requests will be retained here."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Approval</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Refund</TableHead>
                <TableHead className="pr-4 text-right">
                  Resolved (Sri Lanka)
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resolved.map((approval) => (
                <TableRow key={approval.id}>
                  <TableCell className="pl-4 font-mono text-xs font-medium">
                    APR-{String(approval.id).padStart(4, "0")}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {approval.orderId}
                  </TableCell>
                  <TableCell>{approval.customerName}</TableCell>
                  <TableCell className="font-mono font-medium">
                    {formatMoney(approval.amount)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={approval.status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {approval.refundId
                      ? `RFD-${String(approval.refundId).padStart(4, "0")}`
                      : "—"}
                  </TableCell>
                  <TableCell className="pr-4 text-right text-muted-foreground">
                    {approval.resolvedAt
                      ? formatDateTime(approval.resolvedAt)
                      : "—"}
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
