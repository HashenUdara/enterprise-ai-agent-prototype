import { EmptyTable } from "@/components/empty-table"
import { PageHeader } from "@/components/page-header"
import { PolicyEquation } from "@/components/policy-equation"
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
import { formatDateTime, formatMoney } from "@/lib/dashboard/formatters"
import { getRefunds } from "@/lib/dashboard/queries"

export const dynamic = "force-dynamic"

export default async function RefundsPage() {
  const refunds = await getRefunds()

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Refunds"
        description="Completed payment outcomes created autonomously or after human approval."
        action={<RefreshButton />}
      />
      <TableShell
        title={`${refunds.length} completed refunds`}
        description="Each order can have at most one refund; refresh after a demo action."
      >
        {refunds.length === 0 ? (
          <EmptyTable
            title="No refunds yet"
            description="Complete the autonomous refund scenario or approve a pending request."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Refund</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Policy decision</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-4 text-right">
                  Created (Sri Lanka)
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {refunds.map((refund) => (
                <TableRow key={refund.id}>
                  <TableCell className="pl-4 font-mono text-xs font-medium">
                    RFD-{String(refund.id).padStart(4, "0")}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <Link
                      href={`/cases/${refund.orderId}`}
                      className="underline-offset-4 hover:text-primary hover:underline"
                    >
                      {refund.orderId}
                    </Link>
                  </TableCell>
                  <TableCell>{refund.customerName}</TableCell>
                  <TableCell className="font-mono font-medium">
                    {formatMoney(refund.amount)}
                  </TableCell>
                  <TableCell>
                    <PolicyEquation
                      orderTotal={refund.orderTotal}
                      refundPercentage={refund.refundPercentage}
                      refundAmount={refund.amount}
                      maxAutoRefund={refund.maxAutoRefund}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={refund.status} />
                  </TableCell>
                  <TableCell className="pr-4 text-right text-muted-foreground">
                    {formatDateTime(refund.createdAt)}
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
import Link from "next/link"
