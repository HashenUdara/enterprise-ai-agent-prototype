import type { InferInsertModel } from "drizzle-orm"

import { customers, orders, shipments } from "@/lib/db/schema"

type NewCustomer = InferInsertModel<typeof customers>
type NewOrder = InferInsertModel<typeof orders>
type NewShipment = InferInsertModel<typeof shipments>

const createdAt = new Date("2026-08-01T09:00:00.000Z")

export const seedCustomers = [
  {
    id: "CUS-001",
    name: "Northstar Industries",
    tier: "GOLD",
    email: "operations@northstar.example",
    status: "ACTIVE",
    createdAt,
  },
  {
    id: "CUS-002",
    name: "Meridian Health",
    tier: "GOLD",
    email: "supply@meridian-health.example",
    status: "ACTIVE",
    createdAt,
  },
  {
    id: "CUS-004",
    name: "Silverline Retail",
    tier: "SILVER",
    email: "orders@silverline.example",
    status: "ACTIVE",
    createdAt,
  },
  {
    id: "CUS-007",
    name: "Atlas Manufacturing",
    tier: "GOLD",
    email: "procurement@atlas.example",
    status: "ACTIVE",
    createdAt,
  },
] satisfies NewCustomer[]

export const seedOrders = [
  {
    id: "ORD-1024",
    customerId: "CUS-001",
    total: 420_000,
    status: "SHIPPED",
    shipmentId: "SHP-031",
    createdAt,
  },
  {
    id: "ORD-1025",
    customerId: "CUS-001",
    total: 180_000,
    status: "SHIPPED",
    shipmentId: "SHP-032",
    createdAt,
  },
  {
    id: "ORD-1042",
    customerId: "CUS-002",
    total: 250_000,
    status: "SHIPPED",
    shipmentId: "SHP-041",
    createdAt,
  },
  {
    id: "ORD-1050",
    customerId: "CUS-004",
    total: 320_000,
    status: "SHIPPED",
    shipmentId: "SHP-050",
    createdAt,
  },
  {
    id: "ORD-1060",
    customerId: "CUS-007",
    total: 650_000,
    status: "SHIPPED",
    shipmentId: "SHP-060",
    createdAt,
  },
] satisfies NewOrder[]

export const seedShipments = [
  {
    id: "SHP-031",
    orderId: "ORD-1024",
    carrier: "DHL",
    trackingNumber: "DHL-DEMO-00031",
    status: "DELAYED",
    delayDays: 4,
  },
  {
    id: "SHP-032",
    orderId: "ORD-1025",
    carrier: "FedEx",
    trackingNumber: "FDX-DEMO-00032",
    status: "IN_TRANSIT",
    delayDays: 0,
  },
  {
    id: "SHP-041",
    orderId: "ORD-1042",
    carrier: "UPS",
    trackingNumber: "UPS-DEMO-00041",
    status: "DELAYED",
    delayDays: 2,
  },
  {
    id: "SHP-050",
    orderId: "ORD-1050",
    carrier: "DHL",
    trackingNumber: "DHL-DEMO-00050",
    status: "DELAYED",
    delayDays: 3,
  },
  {
    id: "SHP-060",
    orderId: "ORD-1060",
    carrier: "FedEx",
    trackingNumber: "FDX-DEMO-00060",
    status: "DELAYED",
    delayDays: 5,
  },
] satisfies NewShipment[]
