import { count, desc, eq, inArray } from "drizzle-orm"

import { db } from "@/lib/db"
import {
  approvals,
  customers,
  mcpLogs,
  orders,
  refundPolicies,
  refunds,
  shipments,
  tickets,
} from "@/lib/db/schema"

export async function getDashboardData() {
  const [
    [customerCount],
    [orderCount],
    [delayedShipmentCount],
    [refundCount],
    [pendingApprovalCount],
    [mcpCallCount],
    recentActivity,
  ] = await Promise.all([
    db.select({ value: count() }).from(customers),
    db.select({ value: count() }).from(orders),
    db
      .select({ value: count() })
      .from(shipments)
      .where(eq(shipments.status, "DELAYED")),
    db.select({ value: count() }).from(refunds),
    db
      .select({ value: count() })
      .from(approvals)
      .where(eq(approvals.status, "PENDING")),
    db.select({ value: count() }).from(mcpLogs),
    getMcpActivity(8),
  ])

  return {
    counts: {
      customers: customerCount.value,
      orders: orderCount.value,
      delayedShipments: delayedShipmentCount.value,
      refunds: refundCount.value,
      pendingApprovals: pendingApprovalCount.value,
      mcpCalls: mcpCallCount.value,
    },
    recentActivity,
  }
}

export function getCustomers() {
  return db.select().from(customers).orderBy(customers.name)
}

export function getOrders() {
  return db
    .select({
      id: orders.id,
      customerId: customers.id,
      customerName: customers.name,
      total: orders.total,
      status: orders.status,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .orderBy(desc(orders.createdAt), orders.id)
}

export function getShipments() {
  return db
    .select({
      id: shipments.id,
      orderId: orders.id,
      customerName: customers.name,
      carrier: shipments.carrier,
      trackingNumber: shipments.trackingNumber,
      status: shipments.status,
      delayDays: shipments.delayDays,
    })
    .from(shipments)
    .innerJoin(orders, eq(shipments.orderId, orders.id))
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .orderBy(desc(shipments.delayDays), shipments.id)
}

export function getRefunds() {
  return db
    .select({
      id: refunds.id,
      orderId: orders.id,
      customerName: customers.name,
      customerTier: customers.tier,
      orderTotal: orders.total,
      amount: refunds.amount,
      status: refunds.status,
      createdAt: refunds.createdAt,
      refundPercentage: refundPolicies.refundPercentage,
      maxAutoRefund: refundPolicies.maxAutoRefund,
    })
    .from(refunds)
    .innerJoin(orders, eq(refunds.orderId, orders.id))
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .innerJoin(refundPolicies, eq(customers.tier, refundPolicies.tier))
    .orderBy(desc(refunds.createdAt), desc(refunds.id))
}

export function getTickets() {
  return db
    .select({
      id: tickets.id,
      customerName: customers.name,
      orderId: tickets.orderId,
      title: tickets.title,
      status: tickets.status,
      notes: tickets.notes,
      updatedAt: tickets.updatedAt,
    })
    .from(tickets)
    .innerJoin(customers, eq(tickets.customerId, customers.id))
    .orderBy(desc(tickets.updatedAt), tickets.id)
}

export function getMcpActivity(limit?: number) {
  const query = db
    .select()
    .from(mcpLogs)
    .orderBy(desc(mcpLogs.createdAt), desc(mcpLogs.id))

  return limit ? query.limit(limit) : query
}

export function getApprovals() {
  return db
    .select({
      id: approvals.id,
      orderId: approvals.orderId,
      customerName: customers.name,
      customerTier: customers.tier,
      orderTotal: orders.total,
      amount: approvals.amount,
      status: approvals.status,
      reason: approvals.reason,
      createdAt: approvals.createdAt,
      resolvedAt: approvals.resolvedAt,
      refundId: refunds.id,
      refundPercentage: refundPolicies.refundPercentage,
      maxAutoRefund: refundPolicies.maxAutoRefund,
    })
    .from(approvals)
    .innerJoin(orders, eq(approvals.orderId, orders.id))
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .innerJoin(refundPolicies, eq(customers.tier, refundPolicies.tier))
    .leftJoin(refunds, eq(approvals.orderId, refunds.orderId))
    .orderBy(desc(approvals.createdAt), desc(approvals.id))
}

export async function getOrderCase(orderId: string) {
  const [record] = await db
    .select({
      orderId: orders.id,
      orderStatus: orders.status,
      orderTotal: orders.total,
      orderCreatedAt: orders.createdAt,
      customerId: customers.id,
      customerName: customers.name,
      customerTier: customers.tier,
      customerEmail: customers.email,
      customerStatus: customers.status,
      shipmentId: shipments.id,
      shipmentStatus: shipments.status,
      carrier: shipments.carrier,
      trackingNumber: shipments.trackingNumber,
      delayDays: shipments.delayDays,
      refundPercentage: refundPolicies.refundPercentage,
      maxAutoRefund: refundPolicies.maxAutoRefund,
      refundId: refunds.id,
      refundAmount: refunds.amount,
      refundStatus: refunds.status,
      refundCreatedAt: refunds.createdAt,
      approvalId: approvals.id,
      approvalAmount: approvals.amount,
      approvalStatus: approvals.status,
      approvalReason: approvals.reason,
      approvalCreatedAt: approvals.createdAt,
      approvalResolvedAt: approvals.resolvedAt,
    })
    .from(orders)
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .innerJoin(shipments, eq(orders.id, shipments.orderId))
    .innerJoin(refundPolicies, eq(customers.tier, refundPolicies.tier))
    .leftJoin(refunds, eq(orders.id, refunds.orderId))
    .leftJoin(approvals, eq(orders.id, approvals.orderId))
    .where(eq(orders.id, orderId))
    .limit(1)

  if (!record) return null

  const relatedTickets = await db
    .select({
      id: tickets.id,
      title: tickets.title,
      status: tickets.status,
      notes: tickets.notes,
      updatedAt: tickets.updatedAt,
    })
    .from(tickets)
    .where(eq(tickets.orderId, orderId))
    .orderBy(desc(tickets.updatedAt), tickets.id)

  return { ...record, tickets: relatedTickets }
}

const demoOrderIds = ["ORD-1024", "ORD-1050", "ORD-1060"]

export async function getOperationsBrief() {
  const [activity, cases, scenarioRefunds, scenarioApprovals] =
    await Promise.all([
      getMcpActivity(),
      Promise.all(demoOrderIds.map((orderId) => getOrderCase(orderId))),
      db
        .select({
          id: refunds.id,
          orderId: refunds.orderId,
          amount: refunds.amount,
          status: refunds.status,
        })
        .from(refunds)
        .where(inArray(refunds.orderId, ["ORD-1050", "ORD-1060"])),
      db
        .select({
          id: approvals.id,
          orderId: approvals.orderId,
          amount: approvals.amount,
          status: approvals.status,
        })
        .from(approvals)
        .where(eq(approvals.orderId, "ORD-1060")),
    ])

  const successful = activity.filter((log) => log.status === "SUCCESS")
  const mutationTools = new Set([
    "payment_issue_refund",
    "ticketing_update_ticket",
  ])
  const systemNames: Record<string, string> = {
    crm: "CRM",
    erp: "ERP",
    logistics: "Logistics",
    payment: "Payments",
    policy: "Policy",
    ticketing: "Ticketing",
  }
  const systems = Array.from(
    new Set(
      successful
        .map((log) => systemNames[log.tool.split("_")[0]])
        .filter((system): system is string => Boolean(system))
    )
  )
  const northstar = cases[0]
  const expectedNorthstarNotes =
    "Customer production schedule is at risk.\nOperations is investigating the delayed shipment with DHL."
  const ticketUpdated =
    northstar?.tickets.some(
      (ticket) =>
        ticket.id === "TKT-009" &&
        ticket.status === "IN_PROGRESS" &&
        ticket.notes === expectedNorthstarNotes
    ) ?? false
  const duplicatePreventions = successful.filter(
    (log) => log.tool === "payment_issue_refund" && log.result.created === false
  ).length
  const verifiedOrderIds = new Set(
    successful
      .filter(
        (log) =>
          log.tool === "payment_get_refund_outcome" &&
          log.result.status === "COMPLETED" &&
          typeof log.result.refundId === "number"
      )
      .map((log) => log.target)
  )
  const silverlineRefund = scenarioRefunds.find(
    (refund) =>
      refund.orderId === "ORD-1050" &&
      refund.amount === 32_000 &&
      refund.status === "COMPLETED"
  )
  const atlasRefund = scenarioRefunds.find(
    (refund) =>
      refund.orderId === "ORD-1060" &&
      refund.amount === 130_000 &&
      refund.status === "COMPLETED"
  )
  const atlasApproval = scenarioApprovals.find(
    (approval) =>
      approval.orderId === "ORD-1060" &&
      approval.amount === 130_000 &&
      approval.status === "APPROVED"
  )

  return {
    activity,
    cases: cases.filter((record) => record !== null),
    metrics: {
      systemsConsulted: systems.length,
      systemNames: systems,
      recordsInvestigated: new Set(
        successful.map((log) => log.target).filter(Boolean)
      ).size,
      readCalls: successful.filter(
        (log) => !mutationTools.has(log.tool) && !log.tool.startsWith("policy_")
      ).length,
      policyDecisions: successful.filter((log) =>
        log.tool.startsWith("policy_")
      ).length,
      mutationCalls: successful.filter((log) => mutationTools.has(log.tool))
        .length,
      completedActions: scenarioRefunds.length + (ticketUpdated ? 1 : 0),
      escalations: scenarioApprovals.length,
      duplicatePreventions,
    },
    outcomes: {
      northstarTicketUpdated: ticketUpdated,
      silverlineRefunded: silverlineRefund !== undefined,
      atlasApprovalStatus: scenarioApprovals[0]?.status ?? null,
      atlasRefunded: atlasRefund !== undefined,
      finalVerificationComplete:
        verifiedOrderIds.has("ORD-1050") && verifiedOrderIds.has("ORD-1060"),
      financial: [
        {
          customer: "Silverline Retail",
          orderId: "ORD-1050",
          refundId: silverlineRefund?.id ?? null,
          approvalId: null,
          amount: silverlineRefund?.amount ?? 32_000,
          status: silverlineRefund?.status ?? "NOT_STARTED",
          verified: verifiedOrderIds.has("ORD-1050"),
        },
        {
          customer: "Atlas Manufacturing",
          orderId: "ORD-1060",
          refundId: atlasRefund?.id ?? null,
          approvalId: atlasApproval?.id ?? null,
          amount: atlasRefund?.amount ?? atlasApproval?.amount ?? 130_000,
          status: atlasRefund?.status ?? atlasApproval?.status ?? "NOT_STARTED",
          verified: verifiedOrderIds.has("ORD-1060"),
        },
      ],
    },
  }
}
