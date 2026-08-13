# Enterprise MCP Demo — Updated PRD

## 1. Objective

Build a simple working prototype that demonstrates how an AI agent can connect to simulated enterprise systems through the **Model Context Protocol (MCP)**.

The prototype should prioritize one thing above everything else:

> **Codex must be able to connect to the MCP server smoothly, discover the tools, call them correctly, and read/write enterprise data through those tools.**

The web application exists mainly to make the architecture easy to understand during the presentation.

---

# 2. Final Technology Stack

* **Next.js**
* **TypeScript**
* **shadcn/ui**
* **Drizzle ORM**
* **Neon PostgreSQL**
* **MCP TypeScript SDK**
* **Zod**
* **Vercel**
* **Codex as the MCP client / AI agent**

---

# 3. High-Level Architecture

```text
                 CODEX
        AI Agent / MCP Client
                  │
                  │ MCP
                  │ Streamable HTTP
                  ▼
          Next.js /api/mcp
             MCP Server
                  │
                  ▼
         Enterprise Services
      ┌───────────┼────────────┐
      │           │            │
     CRM         ERP       Logistics
      │           │            │
      ├────── Payments ─────────┤
      │                         │
      └────── Ticketing ────────┘
                  │
                  ▼
             Drizzle ORM
                  │
                  ▼
            Neon Postgres


                  ▲
                  │
          Next.js Frontend
             shadcn/ui
```

Codex must never connect directly to Neon.

The interaction path must remain:

```text
Codex
  ↓
MCP
  ↓
Enterprise Service
  ↓
Drizzle
  ↓
Neon
```

---

# 4. Prototype Scope

The prototype simulates five enterprise systems.

## CRM

Represents Salesforce.

Contains:

* customers
* customer tiers
* customer contact information
* customer status

## ERP

Represents SAP.

Contains:

* customer orders
* order totals
* order status
* shipment references

## Logistics

Represents shipping/carrier systems.

Contains:

* shipments
* tracking numbers
* shipping status
* delay days

## Payments

Represents a payment gateway.

Contains:

* refunds
* refund amounts
* refund statuses

## Ticketing

Represents Jira or ServiceNow.

Contains:

* customer support tickets
* ticket status
* notes

All prototype records are stored in one Neon PostgreSQL database.

The separation between CRM, ERP, Logistics, Payments, and Ticketing is **logical**, not separate physical databases.

---

# 5. Database Requirements

Use **Drizzle ORM** with Neon PostgreSQL.

Required tables:

## customers

```text
id
name
tier
email
status
createdAt
```

## orders

```text
id
customerId
total
status
shipmentId
createdAt
```

## shipments

```text
id
orderId
carrier
trackingNumber
status
delayDays
```

## refundPolicies

```text
id
tier
refundPercentage
maxAutoRefund
```

## refunds

```text
id
orderId
amount
status
createdAt
```

## tickets

```text
id
orderId
customerId
title
status
notes
updatedAt
```

## mcpLogs

```text
id
tool
input
result
status
createdAt
```

## approvals

```text
id
orderId
amount
status
createdAt
resolvedAt
```

---

# 6. Seed Data

The demo must not depend on one hardcoded customer or one hardcoded order.

Seed approximately:

* 10–15 customers
* 20–30 orders
* 20–30 shipments
* 3 customer tiers
* 3 refund policies
* 8–12 support tickets
* several historical refunds

Include different scenarios:

* delivered orders
* delayed orders
* processing orders
* Gold-tier customers
* Silver-tier customers
* Standard-tier customers
* refund-eligible orders
* high-value orders
* orders with open tickets

The objective is to allow Codex to discover records dynamically.

---

# 7. Enterprise Service Layer

Create simple TypeScript service modules.

Suggested structure:

```text
lib/
└── enterprise/
    ├── crm.ts
    ├── erp.ts
    ├── logistics.ts
    ├── payments.ts
    ├── ticketing.ts
    └── policies.ts
```

These services contain the Drizzle queries.

The MCP tools should call these services rather than containing database queries directly.

Example:

```text
MCP Tool
   ↓
erpService.getOrder()
   ↓
Drizzle
   ↓
Neon
```

---

# 8. MCP Server

Create a remote MCP endpoint inside the Next.js application.

Endpoint:

```text
/api/mcp
```

Transport:

> **Streamable HTTP**

The MCP server should be as stateless and simple as possible for smooth deployment and Codex compatibility.

---

# 9. MCP Tool Design Principles

Tool quality is more important than the total number of tools.

Each tool should have:

* a clear action-oriented name
* a short description
* Zod input schemas
* clear field descriptions
* concise structured output
* useful MCP annotations
* actionable error messages

Use consistent prefixes to make tools easy for Codex to discover.

Preferred naming style:

```text
crm_...
erp_...
logistics_...
policy_...
payment_...
ticketing_...
```

---

# 10. MCP Tools

## 10.1 crm_search_customers

Purpose:

Search CRM customers by name.

Input:

```text
query
```

Example:

```text
crm_search_customers({
  query: "Northstar"
})
```

Annotations:

```text
readOnlyHint: true
destructiveHint: false
idempotentHint: true
openWorldHint: false
```

---

## 10.2 crm_get_customer

Purpose:

Retrieve a customer from the simulated CRM.

Input:

```text
customerId
```

Returns:

* customer ID
* name
* tier
* email
* status

---

# 10.3 erp_search_orders

Purpose:

Search orders by:

* customer ID
* status

Optional inputs:

```text
customerId
status
```

This allows Codex to answer broader questions such as:

> Find delayed orders belonging to Gold-tier customers.

---

# 10.4 erp_get_order

Purpose:

Retrieve one order.

Input:

```text
orderId
```

Returns:

* order ID
* customer ID
* total
* status
* shipment ID

---

# 10.5 logistics_get_shipment

Purpose:

Retrieve shipping status for an order or shipment.

Input:

```text
orderId
```

Returns:

* carrier
* tracking number
* status
* delay days

---

# 10.6 policy_get_refund_policy

Purpose:

Retrieve refund rules for a customer tier.

Input:

```text
tier
```

Returns:

* refund percentage
* maximum autonomous refund

---

# 10.7 policy_calculate_refund

Purpose:

Calculate the recommended refund based on enterprise data.

Input:

```text
orderId
```

The server should:

1. retrieve the order;
2. retrieve the customer;
3. retrieve the refund policy;
4. calculate the recommended amount.

Return:

```text
orderId
customerTier
orderTotal
refundPercentage
recommendedRefund
maxAutoRefund
```

The AI should not need to manually calculate the financial rule itself.

---

# 10.8 payment_issue_refund

Purpose:

Create an enterprise refund.

Input:

```text
orderId
amount
```

Basic backend rule:

```text
amount <= $1,000
→ create refund

amount > $1,000
→ create approval request
```

If the refund exceeds the limit, return:

```text
status: APPROVAL_REQUIRED
```

If permitted:

```text
status: COMPLETED
```

Annotations should indicate that this is a write operation.

---

# 10.9 ticketing_get_ticket

Purpose:

Retrieve the support ticket associated with an order.

Input:

```text
orderId
```

---

# 10.10 ticketing_update_ticket

Purpose:

Update a support ticket.

Input:

```text
ticketId
status
note
```

This tool modifies enterprise state.

---

# 11. Structured MCP Responses

Where practical, tools should return both:

* human-readable text
* structured content

Example conceptual response:

```json
{
  "orderId": "ORD-1024",
  "customerId": "CUS-004",
  "total": 4200,
  "status": "SHIPPED",
  "shipmentId": "SHP-031"
}
```

Avoid returning huge text blocks.

The goal is to help Codex reason reliably across multiple calls.

---

# 12. MCP Error Handling

Errors should be specific and useful.

Bad:

```text
Something went wrong.
```

Good:

```text
Order ORD-9999 was not found.
Use erp_search_orders to find available orders.
```

Another example:

```text
Refund cannot be executed because the amount exceeds the $1,000 autonomous limit.
An approval request has been created.
```

---

# 13. MCP Logging

Every MCP tool call should create an `mcpLogs` record.

Log:

* tool name
* input
* result summary
* success/failure
* timestamp

Example:

```text
10:42:01
erp_get_order
ORD-1024
SUCCESS

10:42:03
logistics_get_shipment
ORD-1024
SUCCESS

10:42:05
policy_calculate_refund
$420
SUCCESS

10:42:07
payment_issue_refund
$420
SUCCESS
```

This provides enough observability for the assignment demo.

---

# 14. Frontend

Use **shadcn/ui**.

The frontend should remain simple.

Main pages:

```text
Dashboard
Customers
Orders
Shipments
Refunds
Tickets
MCP Activity
Approvals
```

No custom complex design system is needed.

---

# 15. Dashboard

The dashboard should show summary cards.

Example:

```text
Customers
15

Orders
28

Delayed Shipments
6

Refunds
8

Pending Approvals
2

MCP Calls
37
```

Below the cards:

## Recent MCP Activity

Use a shadcn table.

Columns:

* Time
* Tool
* Target
* Status

---

# 16. Customers Page

Use a shadcn data table.

Columns:

* Customer
* Tier
* Email
* Status

---

# 17. Orders Page

Columns:

* Order
* Customer
* Total
* Status

---

# 18. Shipments Page

Columns:

* Shipment
* Order
* Carrier
* Status
* Delay Days

---

# 19. Refunds Page

Columns:

* Refund
* Order
* Amount
* Status
* Created

---

# 20. Tickets Page

Columns:

* Ticket
* Customer
* Order
* Status
* Notes

---

# 21. MCP Activity Page

This is one of the most important presentation pages.

Display all MCP calls in chronological order.

Example:

```text
MCP Activity

erp_search_orders
SUCCESS
11:42:01

crm_get_customer
SUCCESS
11:42:02

logistics_get_shipment
SUCCESS
11:42:03

policy_get_refund_policy
SUCCESS
11:42:04

policy_calculate_refund
$580
11:42:05

payment_issue_refund
COMPLETED
11:42:06
```

Use shadcn components:

* Table
* Badge
* Card
* Dialog or Sheet for details

---

# 22. Approval Page

When a refund exceeds $1,000, show:

```text
Pending Approval

Order:
ORD-1056

Refund:
$1,450

Status:
Pending

Reason:
Autonomous refund limit exceeded

[Approve]
[Reject]
```

Approve should:

* update approval status;
* create the refund.

Reject should:

* mark the approval rejected;
* not create the refund.

No advanced approval workflow is required.

---

# 23. Presentation Scenario 1 — Read Across Systems

Ask Codex:

> Find delayed orders belonging to Gold-tier customers and tell me which ones have open tickets.

This should require multiple MCP calls.

Expected tools may include:

```text
erp_search_orders
crm_get_customer
logistics_get_shipment
ticketing_get_ticket
```

The lecturer should see those calls appear in MCP Activity.

---

# 24. Presentation Scenario 2 — Autonomous Action

Ask Codex:

> Find an eligible delayed order and process the appropriate refund according to enterprise policy if it is within the autonomous limit.

Expected flow:

```text
Search orders
      ↓
Get customer
      ↓
Get shipment
      ↓
Get policy
      ↓
Calculate refund
      ↓
Issue refund
```

The refund appears on the frontend.

---

# 25. Presentation Scenario 3 — Human Approval

Ask Codex to process an eligible refund where the amount exceeds $1,000.

Expected:

```text
payment_issue_refund

Requested:
$1,300

Result:
APPROVAL_REQUIRED
```

Open the Approvals page.

Approve the request manually.

Show that the refund is then created.

This demonstrates human-in-the-loop governance without adding unnecessary complexity.

---

# 26. Project Structure

```text
app/
├── page.tsx
│
├── customers/
│   └── page.tsx
│
├── orders/
│   └── page.tsx
│
├── shipments/
│   └── page.tsx
│
├── refunds/
│   └── page.tsx
│
├── tickets/
│   └── page.tsx
│
├── activity/
│   └── page.tsx
│
├── approvals/
│   └── page.tsx
│
└── api/
    └── mcp/
        └── route.ts

components/
├── app-sidebar.tsx
├── metric-card.tsx
├── data-table.tsx
└── mcp-log-table.tsx

lib/
├── db/
│   ├── index.ts
│   ├── schema.ts
│   └── seed.ts
│
├── enterprise/
│   ├── crm.ts
│   ├── erp.ts
│   ├── logistics.ts
│   ├── payments.ts
│   ├── policies.ts
│   └── ticketing.ts
│
└── mcp/
    ├── server.ts
    └── tools.ts
```

---

# 27. Development Plan

## Phase 1 — Project Setup

Set up:

* Next.js
* TypeScript
* Tailwind
* shadcn/ui
* Neon
* Drizzle

Create the database schema.

Run migrations.

Seed mock data.

### Success condition

The application can successfully read mock enterprise data from Neon using Drizzle.

---

# Phase 2 — Basic Frontend

Build:

* sidebar
* dashboard
* customers
* orders
* shipments
* refunds
* tickets

Use shadcn/ui tables and cards.

Do not spend significant time on visual polish.

### Success condition

All mock enterprise data can be inspected through the frontend.

---

# Phase 3 — Enterprise Services

Build:

```text
crm.ts
erp.ts
logistics.ts
payments.ts
policies.ts
ticketing.ts
```

Test these service functions directly.

### Success condition

The application can search and update enterprise data without MCP.

---

# Phase 4 — Read-Only MCP Server

Create the remote MCP endpoint:

```text
/api/mcp
```

Use:

* TypeScript MCP SDK
* Streamable HTTP
* Zod schemas
* structured responses
* tool annotations

Initially expose only:

```text
crm_search_customers
crm_get_customer

erp_search_orders
erp_get_order

logistics_get_shipment

policy_get_refund_policy
policy_calculate_refund

ticketing_get_ticket
```

### Success condition

An MCP client can discover and execute all read-only tools.

---

# Phase 5 — MCP Inspector Testing

Before connecting Codex, test the MCP server using MCP Inspector.

Verify:

* tool discovery;
* schemas;
* tool descriptions;
* successful calls;
* structured output;
* error messages.

### Success condition

Every MCP tool works reliably in MCP Inspector.

---

# Phase 6 — Codex Connection

Connect Codex to the deployed MCP server.

Test increasingly complex requests.

### Test 1

> Find customer Northstar.

### Test 2

> Show Northstar's orders.

### Test 3

> Which of their orders are delayed?

### Test 4

> Find delayed Gold-tier customer orders and calculate the refund allowed by policy.

### Success condition

Codex chooses the appropriate MCP tools without being explicitly told which tools to use.

This is the highest-priority success criterion for the demo.

---

# Phase 7 — Write Tools

Add:

```text
payment_issue_refund
ticketing_update_ticket
```

Implement only one important control:

```text
refund <= $1,000
→ execute

refund > $1,000
→ approval required
```

Log every call.

### Success condition

Codex can modify Neon-backed enterprise data through MCP.

---

# Phase 8 — MCP Activity + Approvals

Build:

* MCP Activity page
* Approvals page

Every MCP invocation should appear in the activity view.

High-value refunds should appear in Approvals.

### Success condition

The web frontend visibly reflects Codex activity.

---

# Phase 9 — Vercel Deployment

Deploy:

```text
Next.js
MCP endpoint
Frontend
```

Connect production environment variables:

* Neon database URL
* other required secrets

Verify the remote MCP endpoint from the deployed Vercel URL.

### Success condition

Codex can connect to the Vercel-hosted MCP server.

---

# Phase 10 — Presentation Testing

Test these three scenarios repeatedly:

1. Multi-system data lookup.
2. Successful refund below $1,000.
3. Refund above $1,000 requiring human approval.

Do not add new features unless one of these workflows is already reliable.

---

# 28. AI Coding Agent Instructions

When using an AI coding agent, give it one phase at a time.

Use this recurring instruction:

> Maintain a clean separation between the MCP layer, enterprise service functions, Drizzle database access, and frontend. Codex must access enterprise data only through MCP tools. Use TypeScript, Zod, Drizzle ORM, Neon PostgreSQL, and shadcn/ui. Prioritize reliable MCP behavior over additional frontend features.

After every phase, require the coding agent to:

1. list the files changed;
2. run the TypeScript checks;
3. run the build;
4. fix errors before moving forward.

---

# 29. Out of Scope

Do not build:

* real Salesforce integration;
* real SAP integration;
* real payment gateway integration;
* real Jira integration;
* complex authentication;
* enterprise SSO;
* complex RBAC;
* multi-agent orchestration;
* vector databases;
* RAG;
* model training;
* complex prompt-injection detection;
* production SIEM;
* WebSockets unless genuinely needed.

The objective is a clear and reliable MCP demonstration.

---

# 30. Definition of Done

* [ ] Next.js application is working.
* [ ] shadcn/ui is configured.
* [ ] Neon database is connected.
* [ ] Drizzle ORM is configured.
* [ ] Database schema is migrated.
* [ ] Mock enterprise data is seeded.
* [ ] Enterprise data pages work.
* [ ] `/api/mcp` is a working MCP endpoint.
* [ ] MCP uses Streamable HTTP.
* [ ] Tools use Zod input schemas.
* [ ] Tools use clear enterprise-prefixed names.
* [ ] Read tools work in MCP Inspector.
* [ ] Codex connects to the deployed MCP server.
* [ ] Codex discovers MCP tools.
* [ ] Codex successfully composes multiple MCP calls.
* [ ] Refund tool writes to Neon.
* [ ] Ticket update tool writes to Neon.
* [ ] Every MCP tool call is logged.
* [ ] MCP Activity page displays calls.
* [ ] Refunds above $1,000 generate approval requests.
* [ ] Approval can be approved or rejected.
* [ ] Application is deployed to Vercel.
* [ ] Three presentation scenarios work reliably.

## Final Priority Order

If time becomes limited, prioritize work in this exact order:

```text
1. Neon + Drizzle
        ↓
2. Enterprise Services
        ↓
3. MCP Server
        ↓
4. MCP Inspector
        ↓
5. Codex Connection
        ↓
6. MCP Write Operations
        ↓
7. MCP Activity
        ↓
8. Approval Demo
        ↓
9. Frontend Polish
```

**The prototype is successful if Codex can reliably use the MCP server to discover, read, and modify the simulated enterprise environment while the frontend clearly shows what happened.**
