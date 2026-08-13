import { Badge } from "@/components/ui/badge"
import { formatStatus } from "@/lib/dashboard/formatters"

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "info"

const statusVariants: Record<string, BadgeVariant> = {
  ACTIVE: "success",
  APPROVED: "success",
  COMPLETED: "success",
  DELIVERED: "success",
  RESOLVED: "success",
  SUCCESS: "success",
  DELAYED: "warning",
  IN_PROGRESS: "warning",
  PENDING: "warning",
  PROCESSING: "warning",
  FAILURE: "destructive",
  INACTIVE: "secondary",
  CANCELLED: "secondary",
  REJECTED: "secondary",
  IN_TRANSIT: "info",
  OPEN: "info",
  SHIPPED: "info",
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={statusVariants[status] ?? "outline"}>
      {formatStatus(status)}
    </Badge>
  )
}
