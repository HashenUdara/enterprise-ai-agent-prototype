import * as z from "zod/v4"

import {
  customerStatus,
  customerTier,
  orderStatus,
  shipmentStatus,
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
  .refine(
    (input) =>
      input.orderIds !== undefined ||
      input.status !== undefined ||
      input.minimumDelayDays !== undefined,
    { message: "Provide orderIds, status, minimumDelayDays, or a combination." }
  )

export const shipmentResultSchema = z.object({
  shipmentId: z.string(),
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
