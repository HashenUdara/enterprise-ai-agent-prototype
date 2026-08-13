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
import { getShipments } from "@/lib/dashboard/queries"

export const dynamic = "force-dynamic"

export default async function ShipmentsPage() {
  const shipments = await getShipments()

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Shipments"
        description="Carrier status and delay data used to identify refund-eligible orders."
      />
      <TableShell
        title={`${shipments.length} shipments`}
        description="Delayed shipments are sorted first for presentation visibility."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Shipment</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Carrier</TableHead>
              <TableHead>Tracking</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-4 text-right">Delay</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shipments.map((shipment) => (
              <TableRow key={shipment.id}>
                <TableCell className="pl-4 font-mono text-xs font-medium">
                  {shipment.id}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-xs font-medium">
                      {shipment.orderId}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {shipment.customerName}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{shipment.carrier}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {shipment.trackingNumber}
                </TableCell>
                <TableCell>
                  <StatusBadge status={shipment.status} />
                </TableCell>
                <TableCell className="pr-4 text-right font-mono font-medium">
                  {shipment.delayDays === 0
                    ? "—"
                    : `${shipment.delayDays} ${shipment.delayDays === 1 ? "day" : "days"}`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableShell>
    </div>
  )
}
