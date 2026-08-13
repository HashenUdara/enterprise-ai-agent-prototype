import { StatusBadge } from "@/components/status-badge"
import { formatMoney } from "@/lib/dashboard/formatters"

export function PolicyEquation({
  orderTotal,
  refundPercentage,
  refundAmount,
  maxAutoRefund,
}: {
  orderTotal: number
  refundPercentage: number
  refundAmount: number
  maxAutoRefund: number
}) {
  const requiresApproval = refundAmount > maxAutoRefund

  return (
    <div className="flex min-w-56 flex-col gap-2">
      <span className="font-mono text-sm font-medium">
        {formatMoney(orderTotal)} × {refundPercentage}% ={" "}
        {formatMoney(refundAmount)}
      </span>
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        Limit {formatMoney(maxAutoRefund)}
        <StatusBadge
          status={requiresApproval ? "APPROVAL_REQUIRED" : "AUTONOMOUS"}
        />
      </span>
    </div>
  )
}
