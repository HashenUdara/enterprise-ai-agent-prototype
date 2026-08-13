import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { TableShell } from "@/components/table-shell"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getCustomers } from "@/lib/dashboard/queries"

export const dynamic = "force-dynamic"

export default async function CustomersPage() {
  const customers = await getCustomers()

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title="Customers"
        description="CRM identities, customer tiers, and account status used by the agent during policy decisions."
      />
      <TableShell
        title={`${customers.length} customer records`}
        description="Simulated Salesforce data from the shared enterprise database."
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Customer</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="pr-4 text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="pl-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{customer.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {customer.id}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{customer.tier}</Badge>
                </TableCell>
                <TableCell>{customer.email}</TableCell>
                <TableCell className="pr-4 text-right">
                  <StatusBadge status={customer.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableShell>
    </div>
  )
}
