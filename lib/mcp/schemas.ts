import * as z from "zod/v4"

import {
  customerStatus,
  customerTier,
  orderStatus,
  shipmentStatus,
  ticketStatus,
} from "@/lib/db/schema"
import { MAX_SEARCH_LIMIT } from "@/lib/enterprise/query-helpers"

const limitSchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_SEARCH_LIMIT)
  .optional()
  .describe(`Maximum records to return, from 1 to ${MAX_SEARCH_LIMIT}.`)

const customerIdSchema = z
  .string()
  .trim()
  .regex(/^CUS-\d+$/, "Use a customer ID such as CUS-001.")

const orderIdSchema = z
  .string()
  .trim()
  .regex(/^ORD-\d+$/, "Use an order ID such as ORD-1024.")

const shipmentIdSchema = z
  .string()
  .trim()
  .regex(/^SHP-\d+$/, "Use a shipment ID such as SHP-031.")

const ticketIdSchema = z
  .string()
  .trim()
  .regex(/^TKT-\d+$/, "Use a ticket ID such as TKT-009.")

export const searchCustomersInputSchema = z
  .object({
    query: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional()
      .describe(
        "Case-insensitive customer name search, for example Northstar."
      ),
    tier: z
      .enum(customerTier.enumValues)
      .optional()
      .describe("Optional enterprise customer tier."),
    limit: limitSchema,
  })
  .strict()
  .refine((input) => input.query !== undefined || input.tier !== undefined, {
    message: "Provide query, tier, or both.",
  })

export const customerResultSchema = z.object({
  customerId: customerIdSchema,
  name: z.string(),
  tier: z.enum(customerTier.enumValues),
  email: z.email(),
  status: z.enum(customerStatus.enumValues),
})

export const searchCustomersOutputSchema = z.object({
  count: z.number().int().nonnegative(),
  customers: z.array(customerResultSchema),
})

export const getCustomerInputSchema = z
  .object({
    customerId: customerIdSchema.describe(
      "CRM customer ID returned by crm_search_customers."
    ),
  })
  .strict()

export const getCustomerOutputSchema = customerResultSchema

export const searchOrdersInputSchema = z
  .object({
    customerId: customerIdSchema
      .optional()
      .describe("One customer ID, for example CUS-001."),
    customerIds: z
      .array(customerIdSchema)
      .min(1)
      .max(MAX_SEARCH_LIMIT)
      .optional()
      .describe("Customer IDs whose orders should be returned."),
    status: z
      .enum(orderStatus.enumValues)
      .optional()
      .describe("Optional ERP order status."),
    limit: limitSchema,
  })
  .strict()
  .refine(
    (input) =>
      input.customerId !== undefined ||
      input.customerIds !== undefined ||
      input.status !== undefined,
    { message: "Provide customerId, customerIds, status, or a combination." }
  )

export const orderResultSchema = z.object({
  orderId: orderIdSchema,
  customerId: customerIdSchema,
  totalAmountMinor: z.number().int().nonnegative(),
  status: z.enum(orderStatus.enumValues),
  shipmentId: z.string(),
  createdAt: z.iso.datetime(),
  currency: z.literal("USD"),
})

export const searchOrdersOutputSchema = z.object({
  count: z.number().int().nonnegative(),
  orders: z.array(orderResultSchema),
})

export const getOrderInputSchema = z
  .object({
    orderId: orderIdSchema.describe(
      "ERP order ID returned by erp_search_orders."
    ),
  })
  .strict()

export const getOrderOutputSchema = orderResultSchema

export const searchShipmentsInputSchema = z
  .object({
    orderIds: z
      .array(orderIdSchema)
      .min(1)
      .max(MAX_SEARCH_LIMIT)
      .optional()
      .describe("Order IDs whose shipments should be returned."),
    status: z
      .enum(shipmentStatus.enumValues)
      .optional()
      .describe("Optional logistics shipment status."),
    minimumDelayDays: z
      .number()
      .int()
      .nonnegative()
      .optional()
      .describe("Return shipments delayed by at least this many days."),
    limit: limitSchema,
  })
  .strict()
  .refine(
    (input) =>
      input.orderIds !== undefined ||
      input.status !== undefined ||
      input.minimumDelayDays !== undefined,
    { message: "Provide orderIds, status, minimumDelayDays, or a combination." }
  )

export const shipmentResultSchema = z.object({
  shipmentId: shipmentIdSchema,
  orderId: orderIdSchema,
  carrier: z.string(),
  trackingNumber: z.string(),
  status: z.enum(shipmentStatus.enumValues),
  delayDays: z.number().int().nonnegative(),
})

export const searchShipmentsOutputSchema = z.object({
  count: z.number().int().nonnegative(),
  shipments: z.array(shipmentResultSchema),
})

export const getShipmentInputSchema = z
  .object({
    orderId: orderIdSchema
      .optional()
      .describe("Order ID whose shipment should be retrieved."),
    shipmentId: shipmentIdSchema
      .optional()
      .describe("Shipment ID to retrieve."),
  })
  .strict()
  .refine(
    (input) =>
      (input.orderId === undefined ? 0 : 1) +
        (input.shipmentId === undefined ? 0 : 1) ===
      1,
    { message: "Provide exactly one of orderId or shipmentId." }
  )

export const getShipmentOutputSchema = shipmentResultSchema

export const getRefundPolicyInputSchema = z
  .object({
    tier: z
      .enum(customerTier.enumValues)
      .describe("Customer tier returned by a CRM tool."),
  })
  .strict()

export const refundPolicyResultSchema = z.object({
  policyId: z.string(),
  tier: z.enum(customerTier.enumValues),
  refundPercentage: z.number().int().min(0).max(100),
  maxAutoRefundAmountMinor: z.number().int().nonnegative(),
  currency: z.literal("USD"),
})

export const getRefundPolicyOutputSchema = refundPolicyResultSchema

export const calculateRefundInputSchema = z
  .object({
    orderId: orderIdSchema.describe(
      "Order whose recommended refund should be calculated."
    ),
  })
  .strict()

export const calculateRefundOutputSchema = z.object({
  orderId: orderIdSchema,
  customerId: customerIdSchema,
  customerTier: z.enum(customerTier.enumValues),
  orderTotalAmountMinor: z.number().int().nonnegative(),
  refundPercentage: z.number().int().min(0).max(100),
  recommendedRefundAmountMinor: z.number().int().nonnegative(),
  maxAutoRefundAmountMinor: z.number().int().nonnegative(),
  currency: z.literal("USD"),
  requiresApproval: z.boolean(),
})

export const searchTicketsInputSchema = z
  .object({
    orderIds: z
      .array(orderIdSchema)
      .min(1)
      .max(MAX_SEARCH_LIMIT)
      .optional()
      .describe("Order IDs whose support tickets should be returned."),
    status: z
      .enum(ticketStatus.enumValues)
      .optional()
      .describe("Optional support ticket status."),
    limit: limitSchema,
  })
  .strict()
  .refine(
    (input) => input.orderIds !== undefined || input.status !== undefined,
    { message: "Provide orderIds, status, or both." }
  )

export const ticketResultSchema = z.object({
  ticketId: ticketIdSchema,
  orderId: orderIdSchema,
  customerId: customerIdSchema,
  title: z.string(),
  status: z.enum(ticketStatus.enumValues),
  notes: z.string(),
  updatedAt: z.iso.datetime(),
})

export const searchTicketsOutputSchema = z.object({
  count: z.number().int().nonnegative(),
  tickets: z.array(ticketResultSchema),
})

export const issueRefundInputSchema = z
  .object({
    orderId: orderIdSchema.describe(
      "Refund-eligible delayed order. The server calculates and controls the amount."
    ),
  })
  .strict()

const paymentResultBaseSchema = z.object({
  created: z.boolean(),
  orderId: orderIdSchema,
  amountMinor: z.number().int().nonnegative(),
  createdAt: z.iso.datetime(),
  currency: z.literal("USD"),
})

export const issueRefundOutputSchema = z.discriminatedUnion("status", [
  paymentResultBaseSchema.extend({
    status: z.literal("COMPLETED"),
    refundId: z.number().int().positive(),
    refundStatus: z.literal("COMPLETED"),
  }),
  paymentResultBaseSchema.extend({
    status: z.literal("APPROVAL_REQUIRED"),
    approvalId: z.number().int().positive(),
    approvalStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]),
    reason: z.string(),
    resolvedAt: z.iso.datetime().nullable(),
  }),
])

export const updateTicketInputSchema = z
  .object({
    ticketId: ticketIdSchema.describe(
      "Support ticket ID returned by ticketing_search_tickets."
    ),
    status: z
      .enum(ticketStatus.enumValues)
      .describe("New support ticket status."),
    note: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .describe("Note to append without replacing existing ticket notes."),
  })
  .strict()

export const updateTicketOutputSchema = ticketResultSchema
