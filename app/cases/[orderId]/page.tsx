import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowRightIcon,
  Building2Icon,
  CircleDollarSignIcon,
  PackageCheckIcon,
  TicketCheckIcon,
} from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { PolicyEquation } from "@/components/policy-equation"
import { RefreshButton } from "@/components/refresh-button"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  formatDate,
  formatDateTime,
  formatMoney,
} from "@/lib/dashboard/formatters"
import { getOrderCase } from "@/lib/dashboard/queries"

export const dynamic = "force-dynamic"

export default async function OrderCasePage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = await params
  const record = await getOrderCase(orderId)

  if (!record) notFound()

  const recommendedRefund = Math.floor(
    (record.orderTotal * record.refundPercentage + 50) / 100
  )
  const requiresApproval = recommendedRefund > record.maxAutoRefund
  const primaryTicket = record.tickets[0]

  return (
    <div className="flex flex-col gap-10">
      <PageHeader
        title={`${record.customerName} case`}
        description={`One connected view of customer, order, shipment, ticketing, policy, and payment state for ${record.orderId}.`}
        action={<RefreshButton />}
      />

      <section className="overflow-hidden rounded-xl bg-[#0a0b0d] text-white">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.15fr_1fr] lg:p-10">
          <div className="flex flex-col justify-between gap-10">
            <div>
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <StatusBadge status={record.shipmentStatus} />
                <span className="font-mono text-sm text-white/70">
                  {record.orderId} · {record.shipmentId}
                </span>
              </div>
              <h2 className="max-w-xl text-3xl font-normal tracking-[-0.03em] text-balance sm:text-4xl">
                {record.delayDays > 0
                  ? `${record.carrier} shipment delayed ${record.delayDays} days.`
                  : `${record.carrier} shipment is ${record.shipmentStatus.toLowerCase().replaceAll("_", " ")}.`}
              </h2>
              <p className="mt-4 max-w-xl text-lg leading-8 text-white/75">
                {primaryTicket
                  ? `${primaryTicket.title}. ${primaryTicket.notes}`
                  : "No support ticket is currently linked to this order."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                render={<Link href="/activity" />}
                nativeButton={false}
                className="bg-white text-black hover:bg-white/85"
              >
                View MCP trail
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
              <Button
                variant="outline"
                render={<Link href="/brief" />}
                nativeButton={false}
                className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                Open operations brief
              </Button>
            </div>
          </div>

          <div className="grid content-start divide-y divide-white/10 rounded-xl bg-[#16181c] px-5 sm:px-6">
            {[
              ["Customer", record.customerName],
              ["Tier", record.customerTier],
              ["Order value", formatMoney(record.orderTotal)],
              ["Tracking", record.trackingNumber],
              ["Order created", formatDate(record.orderCreatedAt)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-6 py-4"
              >
                <span className="text-base text-white/70">{label}</span>
                <span className="text-right font-mono text-sm">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-normal tracking-[-0.02em]">
            Enterprise trail
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The same identifiers connect every simulated system.
          </p>
        </div>
        <div className="grid border-y border-border md:grid-cols-4 md:divide-x md:divide-border">
          {[
            {
              icon: Building2Icon,
              system: "CRM",
              title: record.customerName,
              detail: `${record.customerTier} · ${record.customerStatus}`,
            },
            {
              icon: PackageCheckIcon,
              system: "ERP + Logistics",
              title: record.orderId,
              detail: `${record.shipmentId} · ${record.delayDays} delay days`,
            },
            {
              icon: TicketCheckIcon,
              system: "Ticketing",
              title: primaryTicket?.id ?? "No ticket",
              detail: primaryTicket?.status ?? "No linked issue",
            },
            {
              icon: CircleDollarSignIcon,
              system: "Payments",
              title: record.refundId
                ? `RFD-${String(record.refundId).padStart(4, "0")}`
                : record.approvalId
                  ? `APR-${String(record.approvalId).padStart(4, "0")}`
                  : "No action yet",
              detail:
                record.refundStatus ??
                record.approvalStatus ??
                "Ready for policy",
            },
          ].map((step) => (
            <div
              key={step.system}
              className="flex gap-4 py-6 first:pl-0 md:px-6"
            >
              <step.icon className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">{step.system}</p>
                <p className="mt-1 font-medium">{step.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {step.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Support context</CardTitle>
            <CardDescription>
              Ticket state and appended operational notes, shown in Sri Lanka
              time.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {record.tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No support tickets are linked to this order.
              </p>
            ) : (
              record.tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="grid gap-3 border-t border-border pt-4 first:border-0 first:pt-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">
                        {ticket.id}
                      </p>
                      <p className="mt-1 font-medium">{ticket.title}</p>
                    </div>
                    <StatusBadge status={ticket.status} />
                  </div>
                  <p className="leading-6 text-muted-foreground">
                    {ticket.notes}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    Updated {formatDateTime(ticket.updatedAt)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Policy decision</CardTitle>
            <CardDescription>
              The authoritative tier rule determines autonomy or escalation.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <PolicyEquation
              orderTotal={record.orderTotal}
              refundPercentage={record.refundPercentage}
              refundAmount={recommendedRefund}
              maxAutoRefund={record.maxAutoRefund}
            />
            <div className="border-t border-border pt-4">
              <p className="text-sm leading-6 text-muted-foreground">
                {requiresApproval
                  ? `${formatMoney(recommendedRefund)} exceeds the ${formatMoney(record.maxAutoRefund)} autonomous limit. A person must approve the complete recommended amount.`
                  : `${formatMoney(recommendedRefund)} is within the ${formatMoney(record.maxAutoRefund)} autonomous limit and may be completed by Codex.`}
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl bg-muted p-4">
              <span className="text-sm text-muted-foreground">
                Persisted outcome
              </span>
              <StatusBadge
                status={
                  record.refundStatus ?? record.approvalStatus ?? "NOT_STARTED"
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
