import { count, desc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import {
  approvals,
  customers,
  mcpLogs,
  orders,
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
      amount: refunds.amount,
      status: refunds.status,
      createdAt: refunds.createdAt,
    })
    .from(refunds)
    .innerJoin(orders, eq(refunds.orderId, orders.id))
    .innerJoin(customers, eq(orders.customerId, customers.id))
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
      amount: approvals.amount,
      status: approvals.status,
      reason: approvals.reason,
      createdAt: approvals.createdAt,
      resolvedAt: approvals.resolvedAt,
      refundId: refunds.id,
    })
    .from(approvals)
    .innerJoin(orders, eq(approvals.orderId, orders.id))
    .innerJoin(customers, eq(orders.customerId, customers.id))
    .leftJoin(refunds, eq(approvals.orderId, refunds.orderId))
    .orderBy(desc(approvals.createdAt), desc(approvals.id))
}
