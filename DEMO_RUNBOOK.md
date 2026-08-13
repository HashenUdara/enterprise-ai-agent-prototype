# Enterprise MCP Live Demo Runbook

This is the operational script for an 8–10 minute live presentation. The demo is ready only when all five acts pass from a clean baseline twice in succession.

## 1. Deployment configuration

The Vercel project must contain these Production environment variables:

```env
DATABASE_URL=<Neon PostgreSQL connection string>
MCP_BEARER_TOKEN=<long shared secret>
MCP_ALLOWED_ORIGINS=localhost,127.0.0.1,enterprise-ai-agent-prototype.vercel.app
```

Redeploy after changing an environment variable. Never paste the bearer token into a prompt, screenshot, recording, or this repository.

- Application: `https://enterprise-ai-agent-prototype.vercel.app/`
- MCP endpoint: `https://enterprise-ai-agent-prototype.vercel.app/api/mcp`

## 2. Codex connection check

Keep the bearer token in an environment variable and reference it from the MCP configuration:

```toml
[mcp_servers.enterprise_demo]
url = "https://enterprise-ai-agent-prototype.vercel.app/api/mcp"
bearer_token_env_var = "ENTERPRISE_MCP_TOKEN"
required = true
tool_timeout_sec = 60
default_tools_approval_mode = "auto"
```

`default_tools_approval_mode = "auto"` is appropriate only for this isolated demo database. Restart Codex after changing the configuration or token environment variable. Use `/mcp` in the terminal UI, or the MCP view in the desktop app, to confirm that `enterprise_demo` is connected and exposes twelve tools.

## 3. Clean-baseline reset

Run this before each complete rehearsal and immediately before presenting:

```bash
bun run demo:reset
```

This is the only reset path. It must remain a presenter command and must never become an MCP tool.

The command must finish with:

```text
"status": "ready"
"message": "Clean golden demo baseline verified."
```

Confirm the deployed dashboard shows:

- Customers: 10
- Orders: 21
- Delayed shipments: 8
- Refunds: 3
- Pending approvals: 0
- MCP calls: 0

Also confirm:

- `TKT-009` is Open with only `Customer production schedule is at risk.`
- Operations Brief says the clean demo is ready.
- MCP Activity is empty.

## 4. Stage setup

Keep Codex and the deployed application visible side by side. Start on the Dashboard and keep these routes available:

- Northstar case: `/cases/ORD-1024`
- MCP Activity: `/activity`
- Approvals: `/approvals`
- Operations Brief: `/brief`

Let the audience see Codex discover and call tools. Refresh the application only after Codex finishes an act.

## 5. Five-act presentation

### Act 1 — Prioritize the situation

Target time: 90 seconds.

Prompt:

> Review delayed orders for Gold-tier customers. Prioritize documented customer impact over delay length alone, and identify the situation that needs attention first.

Expected composition:

1. `crm_search_customers`
2. `erp_search_orders`
3. `logistics_search_shipments`
4. `ticketing_search_tickets`

Expected answer:

- Delayed Gold orders are `ORD-1024`, `ORD-1042`, and `ORD-1060`.
- Northstar's `ORD-1024` should be handled first because open ticket `TKT-009` documents that its production schedule is at risk.
- Atlas has the longest delay and highest value, but no documented support impact.

Show the audience:

1. Refresh **MCP Activity**.
2. Point out the **Reads** filter and four-system composition.
3. Open the **Northstar Case** from the sidebar.

Safe repeat: this act changes nothing.

Fallback prompt:

> Search Gold-tier customers, their orders, delayed shipments, and linked open tickets. Treat a documented production risk as more urgent than delay length alone.

### Act 2 — Investigate and act operationally

Target time: 90 seconds.

Prompt:

> Investigate Northstar Industries' affected order in detail. Then mark its open support ticket as in progress and append this note: Operations is investigating the delayed shipment with DHL.

Expected composition may include:

1. `crm_get_customer` or `crm_search_customers`
2. `erp_get_order` or `erp_search_orders`
3. `logistics_get_shipment`
4. `ticketing_search_tickets`
5. `ticketing_update_ticket`

Expected result:

- Order `ORD-1024`, shipment `SHP-031`, delayed four days with DHL.
- `TKT-009` changes from `OPEN` to `IN_PROGRESS`.
- The original production-risk note remains.
- The new operational note is appended.

Show the audience:

1. Refresh the **Northstar Case** and show the connected CRM → ERP → Logistics → Ticketing trail.
2. Show the updated ticket and Sri Lankan update time.
3. Refresh **MCP Activity**, choose **Mutations**, and identify `ticketing_update_ticket`.

Important: do not repeat this act during the same rehearsal because ticket updates intentionally append notes.

Fallback prompt:

> Find ticket TKT-009 through Northstar's delayed order. Set it to IN_PROGRESS and append exactly: Operations is investigating the delayed shipment with DHL.

### Act 3 — Exercise bounded autonomy

Target time: 90 seconds.

Prompt:

> Find Silverline Retail's delayed order and process the appropriate refund according to enterprise policy if it is within the autonomous limit.

Expected composition:

1. `crm_search_customers`
2. `erp_search_orders`
3. `logistics_search_shipments`
4. `policy_calculate_refund`
5. `payment_issue_refund`

Expected result:

- `ORD-1050` total: $3,200
- Silver policy: 10%
- Calculation: $3,200 × 10% = $320
- Autonomous limit: $500
- One completed $320 refund

Show the audience:

1. Refresh **Refunds** and show the visible policy equation.
2. Refresh **MCP Activity** and choose **Policy**, then **Mutations**.
3. Repeat only the refund request if demonstrating idempotency; Codex must return the existing refund with `created: false`.

Fallback prompt:

> Search CRM for Silverline Retail. Find its delayed order, calculate the policy refund, and issue it only if it is within the autonomous limit.

### Act 4 — Stop at the human boundary

Target time: 2 minutes.

Prompt:

> Find Atlas Manufacturing's delayed order and process the appropriate refund according to enterprise policy.

Expected composition:

1. `crm_search_customers`
2. `erp_search_orders`
3. `logistics_search_shipments`
4. `policy_calculate_refund`
5. `payment_issue_refund`

Expected result before approval:

- `ORD-1060` total: $6,500
- Gold policy: 20%
- Calculation: $6,500 × 20% = $1,300
- Autonomous limit: $1,000
- Result: `APPROVAL_REQUIRED`
- No Atlas refund exists yet

Show the audience:

1. Refresh **MCP Activity** and choose **Approval boundaries**.
2. Refresh **Approvals** and explain the policy equation.
3. Open **Refunds** and point out that Atlas has no refund.
4. Return to **Approvals**, choose **Approve**, and confirm **Approve refund**.
5. Refresh **Approvals** and **Refunds**. Show one approved request and one completed $1,300 refund.

Safe repeat: the existing approval or refund is returned; nothing new is created.

Fallback prompt:

> Search CRM for Atlas Manufacturing. Find its delayed order, calculate the policy refund, and attempt to issue it. Report clearly when human approval is required.

### Act 5 — Verify and close the loop

Target time: 90 seconds.

Prompt:

> Verify the final payment outcomes for Silverline Retail's and Atlas Manufacturing's delayed orders. Confirm refund amounts, approval status, and whether any duplicate refunds or approvals exist.

Expected composition:

1. Reuse the discovered order IDs from the conversation.
2. `payment_get_refund_outcome` for `ORD-1050`.
3. `payment_get_refund_outcome` for `ORD-1060`.

Expected answer:

- Silverline: one completed $320 refund with no approval.
- Atlas: one approved $1,300 request and one completed $1,300 refund.
- Neither order has a duplicate outcome.

Show the audience:

1. Refresh **Operations Brief**.
2. Show the three completed story outcomes.
3. Show systems consulted, completed actions, human escalations, and duplicates prevented.
4. End on the statement that all figures come from persisted records and MCP logs.

Fallback prompt:

> Use the payment outcome tool for ORD-1050 and ORD-1060. Compare their persisted refunds and approvals and report any duplicate state.

## 6. Optional governance branch — Rejection

Use this only for Q&A or a longer session. It requires its own reset.

1. Run `bun run demo:reset`.
2. Run the Atlas prompt from Act 4.
3. In **Approvals**, reject the pending request.
4. Confirm the request is Rejected and **Refunds** still has only the three historical records.
5. Call `payment_get_refund_outcome` for `ORD-1060`; it must report a rejected approval and no refund.
6. Run `bun run demo:reset` again before returning to the main presentation.

## 7. Recovery table

| Problem                                | Recovery                                                                                                                                                             |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MCP server is missing or disconnected  | Open the Codex MCP view or run `/mcp`. Confirm `enterprise_demo`, the endpoint URL, and the token environment variable. Restart Codex only if configuration changed. |
| `401` or invalid token                 | Confirm local `ENTERPRISE_MCP_TOKEN` matches Vercel's `MCP_BEARER_TOKEN`. Do not print either value. Restart Codex after correcting the environment.                 |
| Tool call times out initially          | Retry once. Warm the dashboard shortly before presenting to reduce Vercel or database cold-start delay.                                                              |
| MCP Activity appears unchanged         | Wait for Codex to finish, then choose **Refresh data**. Confirm Codex used `enterprise_demo`.                                                                        |
| Northstar already says In Progress     | The database is not clean. Run `bun run demo:reset` and restart at Act 1.                                                                                            |
| A refund or approval already exists    | Run `bun run demo:reset`, confirm the dashboard counts, and restart at Act 1.                                                                                        |
| Approval succeeds but refund is absent | Refresh Approvals and Refunds once. If still absent, stop and run `bun run approval:verify` before continuing.                                                       |
| Operations Brief looks incomplete      | Finish the current Codex act, refresh the page, and verify the expected mutation in its source page.                                                                 |
| Prompt causes unnecessary calls        | Use that act's fallback prompt. Do not manually supply database IDs unless recovering the demo.                                                                      |

## 8. Final go/no-go checklist

Complete two consecutive rehearsals. Mark the demo ready only when every item is true:

- [ ] `bun run demo:reset` reports `status: ready` before each rehearsal.
- [ ] The dashboard shows the six clean-baseline counts.
- [ ] Codex connects to `enterprise_demo` and discovers twelve tools.
- [ ] Act 1 prioritizes Northstar using documented production risk.
- [ ] Act 2 changes only `TKT-009`, preserves its original note, and appends the operational note once.
- [ ] Act 3 creates exactly one $320 refund and a retry creates nothing.
- [ ] Act 4 creates exactly one pending $1,300 approval and no premature refund.
- [ ] Approving Atlas creates exactly one completed $1,300 refund.
- [ ] Act 5 verifies both persisted outcomes through MCP.
- [ ] Activity filters correctly separate reads, mutations, policy, and approval-boundary calls.
- [ ] Operations Brief reflects all three story outcomes without invented metrics.
- [ ] All visible times use Sri Lanka time.
- [ ] `bun run demo:reset` restores the exact ticket text, three historical refunds, zero approvals, and zero MCP logs.

On presentation day, run the reset once more, open the Dashboard, Northstar Case, MCP Activity, Approvals, and Operations Brief, confirm Codex is connected, and do not run a write act before the audience arrives.
