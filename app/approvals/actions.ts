"use server"

import { revalidatePath } from "next/cache"

import { approveApproval, rejectApproval } from "@/lib/enterprise/approvals"

function refreshApprovalViews() {
  revalidatePath("/")
  revalidatePath("/approvals")
  revalidatePath("/refunds")
}

export async function approveApprovalAction(approvalId: number) {
  await approveApproval(approvalId)
  refreshApprovalViews()
}

export async function rejectApprovalAction(approvalId: number) {
  await rejectApproval(approvalId)
  refreshApprovalViews()
}
