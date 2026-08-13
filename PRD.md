# Enterprise MCP Demo — Updated PRD

## 1. Objective

Build a simple working prototype that demonstrates how an AI agent can connect to simulated enterprise systems through the **Model Context Protocol (MCP)**.

The prototype should prioritize one thing above everything else:

> **Codex must be able to connect to the MCP server smoothly, discover the tools, call them correctly, and read/write enterprise data through those tools.**

The web application exists mainly to make the architecture easy to understand during the presentation.

## 1.1 Delivery Context

This prototype is built for a **live demonstration only**. There is no separate code-submission requirement.

During the demonstration:

* Codex should visibly show the MCP tools it discovers and calls;
* the presenter may refresh the web application to show newly persisted MCP activity and enterprise data;
* real-time browser updates, polling, WebSockets, and server-sent events are not required;
* reliability and a clear presentation flow are more important than feature breadth or frontend polish.

Before implementation, define a golden demo contract for each of the three presentation scenarios. Each contract must identify:

* the seeded records that make the scenario possible;
* the expected tool-call sequence;
* the expected answer or database mutation;
* the activity records the presenter should see after refreshing the page;
* the expected result if the scenario is accidentally repeated.

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
target
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
reason
createdAt
resolvedAt
```

## Monetary representation

Store and calculate every monetary value using integer minor units, such as cents. This applies to:

* `orders.total`;
* `refundPolicies.maxAutoRefund`;
* `refunds.amount`;
* `approvals.amount`.

For example, `$42.50` is stored as `4250`. Do not use JavaScript floating-point arithmetic for money. Tool responses should include the integer minor-unit value and currency code; human-readable text may format it as dollars.

The prototype uses `USD` for all monetary records.

## Data integrity rules

* `refundPolicies.tier` must be unique.
* Each order has at most one shipment.
* An order may have multiple support tickets.
* `refunds.orderId` must be unique so an order can have at most one refund in this prototype.
* `approvals.orderId` must be unique so an order can have at most one approval request in this prototype, regardless of its final status.
* Approval resolution and refund creation must occur in one database transaction.

## Refund eligibility and calculation

An order is eligible for the prototype refund workflow only when:

* the customer is active;
* the shipment status is `DELAYED` and `delayDays` is greater than zero;
* the order does not already have a refund;
* the order does not already have an approval request.

Calculate the recommended refund from the order total and the customer's tier policy:

```text
recommendedRefund = orderTotal × refundPercentage
```

Represent `refundPercentage` as an integer percentage for the prototype, such as `10` for 10%, and define one consistent integer rounding rule in the policy service. `maxAutoRefund` determines whether the calculated refund is executed automatically or sent for approval; it does not cap or replace the recommended amount.

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
* at least one Gold-tier delayed order with an open ticket for Scenario 1
* at least one policy-eligible refund below that tier's `maxAutoRefund` for Scenario 2
* at least one policy-eligible refund above that tier's `maxAutoRefund` for Scenario 3

The objective is to allow Codex to discover records dynamically.

The named demo records must be deterministic and documented, but the tools must discover them through normal searches. Tool implementations must not contain hardcoded customer or order IDs.

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

The deployed endpoint should require one simple shared bearer token configured as an environment variable. This is sufficient for the live-demo prototype. Tool annotations describe behavior to MCP clients but are not an authorization mechanism.

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
* an output schema where practical

Use consistent prefixes to make tools easy for Codex to discover.

Collection tools should support useful filters so Codex can compose a small number of meaningful cross-system calls instead of making an N+1 sequence of individual record requests. Lists should remain concise and should support a bounded `limit` input where appropriate.

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

Search CRM customers by name and/or tier.

Input:

```text
query (optional)
tier (optional)
limit (optional, bounded)
```

Example:

```text
crm_search_customers({
  query: "Northstar"
})
```

At least one of `query` or `tier` must be provided.

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

## 10.3 erp_search_orders

Purpose:

Search orders by:

* customer ID or customer IDs
* status

Optional inputs:

```text
customerId or customerIds
status
limit
```

This allows Codex to answer broader questions such as:

> Find delayed orders belonging to Gold-tier customers.

At least one filter must be provided. Returned records should be bounded.

---

## 10.4 erp_get_order

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

## 10.5 logistics_get_shipment

Purpose:

Retrieve one shipment by order ID or shipment ID.

Input:

```text
orderId (optional)
shipmentId (optional)
```

Exactly one identifier must be provided.

Returns:

* carrier
* tracking number
* status
* delay days

---

## 10.6 logistics_search_shipments

Purpose:

Search shipments by status, minimum delay days, and/or a bounded list of order IDs.

Optional inputs:

```text
status
minimumDelayDays
orderIds
limit
```

At least one filter must be provided. This tool prevents Codex from having to retrieve every shipment individually during a cross-system query.

---

## 10.7 policy_get_refund_policy

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

## 10.8 policy_calculate_refund

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
currency
requiresApproval
```

The AI should not need to manually calculate the financial rule itself.

---

## 10.9 payment_issue_refund

Purpose:

Create an enterprise refund.

Input:

```text
orderId
```

The server must retrieve the order, customer, and tier policy and calculate the permitted refund itself. Codex does not supply or control the financial amount.

Authoritative backend rule:

```text
recommendedRefund <= policy.maxAutoRefund
→ create refund

recommendedRefund > policy.maxAutoRefund
→ create approval request
```

`refundPolicies.maxAutoRefund` is the single source of truth for autonomous refund thresholds. There is no separate universal `$1,000` limit.

If the refund exceeds the limit, return:

```text
status: APPROVAL_REQUIRED
```

If permitted:

```text
status: COMPLETED
```

The operation must be safe to retry:

* if the order already has a completed refund, return the existing refund and do not create another;
* if the order already has any approval request, return the existing approval and do not create another;
* record whether the result was newly created or already existed.

Annotations:

```text
readOnlyHint: false
destructiveHint: true
idempotentHint: true
openWorldHint: false
```

`idempotentHint` is true because the required server-side duplicate protection makes repeated calls with the same `orderId` return the existing result without an additional financial effect.

---

## 10.10 ticketing_search_tickets

Purpose:

Search support tickets by order IDs and/or status.

Input:

```text
orderIds (optional)
status (optional)
limit (optional, bounded)
```

An order may have multiple tickets, so this tool returns a list. At least one filter must be provided.

---

## 10.11 ticketing_update_ticket

Purpose:

Update a support ticket.

Input:

```text
ticketId
status
note
```

`note` must be appended to the existing notes rather than replacing them. The response should return the updated ticket status and notes.

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
  "total": {
    "amountMinor": 420000,
    "currency": "USD"
  },
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
Refund cannot be executed automatically because the recommended amount of $1,300 exceeds the Gold policy limit of $1,000.
Approval APR-0012 has been created. Open the Approvals page to approve or reject it.
```

---

# 13. MCP Logging

Every MCP tool call should create an `mcpLogs` record.

Log:

* tool name
* primary target ID when one exists
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

This provides enough observability for the live demo. Codex displays its tool calls during the task, while the MCP Activity page provides the persisted, audience-friendly audit trail after a manual refresh.

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

The page does not need real-time updates. During the demonstration, Codex shows tool calls in its task UI. After a scenario finishes, the presenter refreshes this page to show the persisted audit trail.

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

When a recommended refund exceeds the customer's tier-specific `maxAutoRefund`, show:

```text
Pending Approval

Order:
ORD-1056

Refund:
$1,450

Status:
Pending

Reason:
Gold policy autonomous limit of $1,000 exceeded

[Approve]
[Reject]
```

Approve should:

* update approval status;
* create the refund;
* perform both changes in one database transaction;
* return the existing refund without duplication if the action is repeated.

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
crm_search_customers
erp_search_orders
logistics_search_shipments
ticketing_search_tickets
```

The lecturer should see the calls in Codex while the task runs and in MCP Activity after refreshing the page.

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

The refund appears on the frontend after refreshing the page. Repeating the request must return the existing refund rather than create a duplicate.

---

# 25. Presentation Scenario 3 — Human Approval

Ask Codex to process an eligible refund where the recommended amount exceeds that customer's tier-specific `maxAutoRefund`.

Expected:

```text
payment_issue_refund

Requested:
$1,300

Policy limit:
$1,000

Result:
APPROVAL_REQUIRED
```

Open the Approvals page.

Approve the request manually.

Show that the refund is then created.

Repeating the approval action or the original Codex request must not create a duplicate refund or approval.

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

## Phase 0 — Lock the Golden Demo Contracts

Document the exact seeded records and expected outcomes for the three presentation scenarios before implementation.

For each scenario, record:

* the natural-language prompt shown to Codex;
* the records Codex should discover;
* the expected tool-call sequence;
* the final answer or database change;
* the MCP Activity rows visible after refresh;
* the safe result of an accidental repeat.

### Success condition

Each live-demo scenario has one deterministic, independently verifiable expected result without requiring hardcoded IDs inside any tool.

---

## Phase 1 — Minimal Data Foundation

The Next.js, TypeScript, Tailwind, and shadcn/ui scaffold already exists. Add Neon and Drizzle, then implement only the schema and deterministic seed data required for the first read-only walking skeleton:

```text
customers
orders
shipments
mcpLogs
```

Establish the monetary representation, constraints, migrations, and repeatable seed command now. Expand the remaining tables after the walking skeleton is proven.

### Success condition

The application can retrieve the first golden-scenario records from Neon through Drizzle, and rerunning the seed process produces a known clean demo state.

---

## Phase 2 — First Enterprise Services

Implement the minimum read-only service functions needed to find the seeded customer, their orders, and relevant shipments. Test these functions directly without MCP.

### Success condition

The service layer can complete the first lookup flow through typed Drizzle queries without exposing database access to the MCP layer.

---

## Phase 3 — Read-Only MCP Walking Skeleton

Create `/api/mcp` using the TypeScript MCP SDK, stateless Streamable HTTP, bearer-token authentication, Zod input schemas, output schemas, structured content, annotations, actionable errors, and MCP logging.

Initially expose only:

```text
crm_search_customers
erp_search_orders
logistics_search_shipments
```

Deploy this walking skeleton early rather than waiting for the complete application.

### Success condition

MCP Inspector can authenticate, discover the three tools, execute the first golden flow, validate the structured outputs, and show useful errors for invalid input or missing records.

---

## Phase 4 — Early Codex Connection

Connect Codex to the deployed MCP endpoint immediately and test increasingly complex prompts:

1. Find customer Northstar.
2. Show Northstar's orders.
3. Identify which of those orders are delayed.

Do not tell Codex which tools to call.

### Success condition

Codex independently discovers and composes the tools, gives the expected answer, and the persisted calls appear in MCP Activity data. This is the first critical go/no-go milestone.

---

## Phase 5 — Complete the Read-Only Domain

Expand the schema, seed data, services, and read-only tools for policies and tickets:

```text
crm_get_customer
erp_get_order
logistics_get_shipment
policy_get_refund_policy
policy_calculate_refund
ticketing_search_tickets
```

Run MCP Inspector checks and the complete cross-system Scenario 1 through Codex.

### Success condition

Codex completes Scenario 1 with a small number of meaningful calls and calculates the correct policy result for representative orders.

---

## Phase 6 — Write Tools and Duplicate Protection

Add:

```text
payment_issue_refund
ticketing_update_ticket
```

The refund service must validate eligibility, calculate the amount on the server, and compare it with the customer's tier-specific `maxAutoRefund`. Add database-backed duplicate protection for refunds and approval requests in any status. Log every call.

### Success condition

Codex can modify Neon-backed enterprise data through MCP, repeated requests do not create duplicates, and Scenario 2 succeeds.

---

## Phase 7 — Approval Transaction

Implement approval and rejection actions. Approval resolution and refund creation must be atomic. Repeating an approval action must return the already-resolved result safely.

### Success condition

Scenario 3 creates one pending approval above the applicable tier limit; manual approval creates exactly one refund, and rejection creates none.

---

## Phase 8 — Presentation Frontend

Build the simple shadcn/ui application around the proven backend:

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

Prioritize MCP Activity and Approvals first. Manual page refresh is the accepted update mechanism. Do not add real-time infrastructure or spend significant time on visual polish.

### Success condition

After each Codex scenario, refreshing the relevant page clearly shows the calls, refund, or approval state to the audience.

---

## Phase 9 — Deployment and Presentation Hardening

Deploy the complete Next.js application and MCP endpoint to Vercel. Configure the Neon database URL, MCP bearer token, and other required environment variables.

Reset to the deterministic seed state, then rehearse all three scenarios repeatedly:

1. Multi-system data lookup.
2. Successful refund within the applicable tier's autonomous limit.
3. Refund above the applicable tier's autonomous limit requiring human approval.

Prepare a short reset procedure and fallback prompts for the live demonstration. Do not add new features unless all three workflows are already reliable.

### Success condition

Codex can connect to the deployed endpoint and all three golden scenarios succeed from a clean seed state in repeated rehearsals.

---

# 28. AI Coding Agent Instructions

When using an AI coding agent, give it one phase at a time.

Use this recurring instruction:

> Maintain a clean separation between the MCP layer, enterprise service functions, Drizzle database access, and frontend. Codex must access enterprise data only through MCP tools. Use TypeScript, Zod, Drizzle ORM, Neon PostgreSQL, and shadcn/ui. Treat each tier's `maxAutoRefund` as authoritative, calculate refunds on the server, and make repeated write requests safe. Prioritize reliable MCP behavior and the current golden demo contract over additional frontend features.

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
* WebSockets, polling, or server-sent events for frontend activity updates;
* frontend features that do not make one of the three live-demo scenarios clearer or more reliable.

The objective is a clear and reliable MCP demonstration.

---

# 30. Definition of Done

* [ ] Next.js application is working.
* [ ] shadcn/ui is configured.
* [ ] Neon database is connected.
* [ ] Drizzle ORM is configured.
* [ ] Database schema is migrated.
* [ ] Mock enterprise data is seeded.
* [ ] Golden demo records and expected results are documented.
* [ ] Seed data can be reset to a deterministic clean demo state.
* [ ] Enterprise data pages work.
* [ ] `/api/mcp` is a working MCP endpoint.
* [ ] MCP uses Streamable HTTP.
* [ ] The deployed MCP endpoint requires the configured bearer token.
* [ ] Tools use Zod input schemas.
* [ ] Tools provide structured content and output schemas where practical.
* [ ] Tools use clear enterprise-prefixed names.
* [ ] Read tools work in MCP Inspector.
* [ ] Codex connects to the deployed MCP server.
* [ ] Codex discovers MCP tools.
* [ ] Codex successfully composes multiple MCP calls.
* [ ] Refund tool writes to Neon.
* [ ] Refund amounts are calculated and validated on the server.
* [ ] Monetary values use integer minor units.
* [ ] Repeated refund and approval actions do not create duplicates.
* [ ] Ticket update tool writes to Neon.
* [ ] Every MCP tool call is logged.
* [ ] MCP Activity page displays calls after a manual refresh.
* [ ] Refunds above the applicable tier's `maxAutoRefund` generate approval requests.
* [ ] Approval can be approved or rejected.
* [ ] Approval and refund creation occur in one transaction.
* [ ] Application is deployed to Vercel.
* [ ] Three presentation scenarios work reliably.

## Final Priority Order

If time becomes limited, prioritize work in this exact order:

```text
1. Golden demo contracts
        ↓
2. Minimal Neon + Drizzle data foundation
        ↓
3. First enterprise services
        ↓
4. Read-only MCP walking skeleton
        ↓
5. MCP Inspector
        ↓
6. Early Codex connection
        ↓
7. Complete read tools
        ↓
8. MCP write operations + approval safety
        ↓
9. MCP Activity + Approvals UI
        ↓
10. Remaining presentation frontend
```

**The prototype is successful if Codex can reliably use the MCP server to discover, read, and modify the simulated enterprise environment while the frontend clearly shows what happened.**
