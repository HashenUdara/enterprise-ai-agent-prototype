"use client"

import { CheckIcon, XIcon } from "lucide-react"

import {
  approveApprovalAction,
  rejectApprovalAction,
} from "@/app/approvals/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { formatMoney } from "@/lib/dashboard/formatters"

export function ApprovalActions({
  approvalId,
  orderId,
  amount,
}: {
  approvalId: number
  orderId: string
  amount: number
}) {
  const approveAction = approveApprovalAction.bind(null, approvalId)
  const rejectAction = rejectApprovalAction.bind(null, approvalId)

  return (
    <div className="flex items-center justify-end gap-2">
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button variant="outline" size="sm">
              <XIcon data-icon="inline-start" />
              Reject
            </Button>
          }
        />
        <AlertDialogContent size="sm">
          <form action={rejectAction} className="flex flex-col gap-4">
            <AlertDialogHeader>
              <AlertDialogTitle>Reject this refund?</AlertDialogTitle>
              <AlertDialogDescription>
                {orderId} will remain without a refund. Repeating the decision
                will return the same rejected state.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Keep pending</AlertDialogCancel>
              <AlertDialogAction type="submit" variant="destructive">
                Reject refund
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button size="sm">
              <CheckIcon data-icon="inline-start" />
              Approve
            </Button>
          }
        />
        <AlertDialogContent size="sm">
          <form action={approveAction} className="flex flex-col gap-4">
            <AlertDialogHeader>
              <AlertDialogTitle>
                Approve {formatMoney(amount)}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This approves the request for {orderId} and atomically creates
                one completed refund.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Keep pending</AlertDialogCancel>
              <AlertDialogAction type="submit">
                Approve refund
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
