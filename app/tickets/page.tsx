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
import { formatDateTime } from "@/lib/dashboard/formatters"
import { getTickets } from "@/lib/dashboard/queries"

export const dynamic = "force-dynamic"

export default async function TicketsPage() {
  const tickets = await getTickets()

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Tickets"
        description="Support context that helps Codex explain operational impact, not just shipment status."
      />
      <TableShell
        title={`${tickets.length} support tickets`}
        description="Simulated Jira or ServiceNow records linked to customers and orders."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Ticket</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Issue</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="pr-4 text-right">
                Updated (Sri Lanka)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="pl-4 font-mono text-xs font-medium">
                  {ticket.id}
                </TableCell>
                <TableCell>{ticket.customerName}</TableCell>
                <TableCell className="font-mono text-xs">
                  <Link
                    href={`/cases/${ticket.orderId}`}
                    className="underline-offset-4 hover:text-primary hover:underline"
                  >
                    {ticket.orderId}
                  </Link>
                </TableCell>
                <TableCell className="max-w-56 whitespace-normal">
                  {ticket.title}
                </TableCell>
                <TableCell>
                  <StatusBadge status={ticket.status} />
                </TableCell>
                <TableCell className="max-w-80 whitespace-normal text-muted-foreground">
                  {ticket.notes}
                </TableCell>
                <TableCell className="pr-4 text-right text-muted-foreground">
                  {formatDateTime(ticket.updatedAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableShell>
    </div>
  )
}
import Link from "next/link"
