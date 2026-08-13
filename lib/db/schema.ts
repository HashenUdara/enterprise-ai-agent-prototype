import { sql } from "drizzle-orm"
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core"

export const customerTier = pgEnum("customer_tier", [
  "GOLD",
  "SILVER",
  "STANDARD",
])

export const customerStatus = pgEnum("customer_status", ["ACTIVE", "INACTIVE"])

export const orderStatus = pgEnum("order_status", [
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
])

export const shipmentStatus = pgEnum("shipment_status", [
  "PENDING",
  "IN_TRANSIT",
  "DELAYED",
  "DELIVERED",
])

export const ticketStatus = pgEnum("ticket_status", [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
])

export const refundStatus = pgEnum("refund_status", ["COMPLETED"])

export const approvalStatus = pgEnum("approval_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
])

export const mcpLogStatus = pgEnum("mcp_log_status", ["SUCCESS", "FAILURE"])

export const customers = pgTable(
  "customers",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    name: text("name").notNull(),
    tier: customerTier("tier").notNull(),
    email: text("email").notNull(),
    status: customerStatus("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("customers_email_unique").on(table.email),
    index("customers_name_idx").on(table.name),
    index("customers_tier_idx").on(table.tier),
  ]
)

export const orders = pgTable(
  "orders",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    customerId: varchar("customer_id", { length: 32 })
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    total: integer("total").notNull(),
    status: orderStatus("status").notNull(),
    // The enforced one-to-one relationship lives on shipments.orderId. Keeping
    // this as an indexed enterprise reference avoids a circular insert dependency.
    shipmentId: varchar("shipment_id", { length: 32 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check("orders_total_nonnegative", sql`${table.total} >= 0`),
    uniqueIndex("orders_shipment_id_unique").on(table.shipmentId),
    index("orders_customer_id_idx").on(table.customerId),
    index("orders_status_idx").on(table.status),
  ]
)

export const shipments = pgTable(
  "shipments",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    orderId: varchar("order_id", { length: 32 })
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    carrier: text("carrier").notNull(),
    trackingNumber: text("tracking_number").notNull(),
    status: shipmentStatus("status").notNull(),
    delayDays: integer("delay_days").default(0).notNull(),
  },
  (table) => [
    check("shipments_delay_days_nonnegative", sql`${table.delayDays} >= 0`),
    uniqueIndex("shipments_order_id_unique").on(table.orderId),
    uniqueIndex("shipments_tracking_number_unique").on(table.trackingNumber),
    index("shipments_status_idx").on(table.status),
  ]
)

export const refundPolicies = pgTable(
  "refund_policies",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    tier: customerTier("tier").notNull(),
    refundPercentage: integer("refund_percentage").notNull(),
    maxAutoRefund: integer("max_auto_refund").notNull(),
  },
  (table) => [
    check(
      "refund_policies_percentage_range",
      sql`${table.refundPercentage} >= 0 and ${table.refundPercentage} <= 100`
    ),
    check(
      "refund_policies_max_auto_refund_nonnegative",
      sql`${table.maxAutoRefund} >= 0`
    ),
    uniqueIndex("refund_policies_tier_unique").on(table.tier),
  ]
)

export const tickets = pgTable(
  "tickets",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    orderId: varchar("order_id", { length: 32 })
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    customerId: varchar("customer_id", { length: 32 })
      .notNull()
      .references(() => customers.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    status: ticketStatus("status").notNull(),
    notes: text("notes").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("tickets_order_id_idx").on(table.orderId),
    index("tickets_customer_id_idx").on(table.customerId),
    index("tickets_status_idx").on(table.status),
  ]
)

export const refunds = pgTable(
  "refunds",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    orderId: varchar("order_id", { length: 32 })
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    amount: integer("amount").notNull(),
    status: refundStatus("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check("refunds_amount_nonnegative", sql`${table.amount} >= 0`),
    uniqueIndex("refunds_order_id_unique").on(table.orderId),
  ]
)

export const approvals = pgTable(
  "approvals",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    orderId: varchar("order_id", { length: 32 })
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    amount: integer("amount").notNull(),
    status: approvalStatus("status").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    check("approvals_amount_nonnegative", sql`${table.amount} >= 0`),
    uniqueIndex("approvals_order_id_unique").on(table.orderId),
    index("approvals_status_idx").on(table.status),
  ]
)

export const mcpLogs = pgTable(
  "mcp_logs",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    tool: text("tool").notNull(),
    target: text("target"),
    input: jsonb("input").$type<Record<string, unknown>>().notNull(),
    result: jsonb("result").$type<Record<string, unknown>>().notNull(),
    status: mcpLogStatus("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("mcp_logs_created_at_idx").on(table.createdAt),
    index("mcp_logs_tool_idx").on(table.tool),
  ]
)

export type Customer = typeof customers.$inferSelect
export type Order = typeof orders.$inferSelect
export type Shipment = typeof shipments.$inferSelect
export type RefundPolicy = typeof refundPolicies.$inferSelect
export type Ticket = typeof tickets.$inferSelect
export type Refund = typeof refunds.$inferSelect
export type Approval = typeof approvals.$inferSelect
export type McpLog = typeof mcpLogs.$inferSelect
