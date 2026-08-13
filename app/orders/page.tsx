import { PageHeader } from "@/components/page-header"
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
import { formatDate, formatMoney } from "@/lib/dashboard/formatters"
import { getOrders } from "@/lib/dashboard/queries"

export const dynamic = "force-dynamic"

export default async function OrdersPage() {
  const orders = await getOrders()

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Orders"
        description="ERP order records joined to customer identities for quick presentation checks."
      />
      <TableShell
        title={`${orders.length} orders`}
        description="Order totals are rendered from integer minor units in USD."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="pr-4 text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="pl-4 font-mono text-xs font-medium">
                  {order.id}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{order.customerName}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {order.customerId}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(order.createdAt)}
                </TableCell>
                <TableCell className="font-mono font-medium">
                  {formatMoney(order.total)}
                </TableCell>
                <TableCell className="pr-4 text-right">
                  <StatusBadge status={order.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableShell>
    </div>
  )
}
