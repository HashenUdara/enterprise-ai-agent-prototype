# Enterprise MCP Live Demo Runbook

This runbook is the operational checklist for rehearsals and the live presentation. The demo is ready only when all three scenarios pass from a clean baseline twice in succession.

## 1. Deployment configuration

The Vercel project must contain these environment variables for Production:

```env
DATABASE_URL=<Neon PostgreSQL connection string>
MCP_BEARER_TOKEN=<long shared secret>
MCP_ALLOWED_ORIGINS=localhost,127.0.0.1,enterprise-ai-agent-prototype.vercel.app
```

Redeploy after changing an environment variable. Never paste the bearer token into a prompt, screenshot, terminal recording, or this repository.

The production addresses are:

- Application: `https://enterprise-ai-agent-prototype.vercel.app/`
- MCP endpoint: `https://enterprise-ai-agent-prototype.vercel.app/api/mcp`

## 2. Codex connection check

Codex supports Streamable HTTP MCP servers with bearer tokens. Keep the token in an environment variable and reference that variable from the MCP configuration:

```toml
[mcp_servers.enterprise_demo]
url = "https://enterprise-ai-agent-prototype.vercel.app/api/mcp"
bearer_token_env_var = "ENTERPRISE_MCP_TOKEN"
required = true
tool_timeout_sec = 60
default_tools_approval_mode = "auto"
```

`default_tools_approval_mode = "auto"` is appropriate only for this isolated demo database. After changing the configuration or token environment variable, restart Codex. Use `/mcp` in the Codex terminal UI, or the MCP view in the desktop app, to confirm that `enterprise_demo` is connected and exposes eleven tools.

## 3. Clean-baseline reset

Run this before every complete rehearsal and immediately before the presentation:

```bash
bun run demo:reset
```

This is the only reset path. It must remain a presenter command and must never become an MCP tool.

The command must finish with:

```text
"status": "ready"
"message": "Clean golden demo baseline verified."
```

Then open the deployed dashboard and confirm:

- Customers: 10
- Orders: 21
- Delayed shipments: 8
- Refunds: 3
- Pending approvals: 0
- MCP calls: 0

## 4. Presentation sequence

Keep Codex and the deployed application visible side by side. Let the audience see the tool calls in Codex. After each scenario completes, refresh the relevant application page.

### Scenario 1 — Cross-system investigation

Prompt:

> Find delayed orders belonging to Gold-tier customers and tell me which ones have open tickets.

Expected tool sequence:

1. `crm_search_customers`
2. `erp_search_orders`
3. `logistics_search_shipments`
4. `ticketing_search_tickets`

Expected answer:

- Delayed Gold orders: `ORD-1024`, `ORD-1042`, and `ORD-1060`
- Only `ORD-1024` has the open ticket `TKT-009`

Show the audience:

1. Refresh **MCP Activity** and show the four successful calls.
2. Optionally open **Shipments** and **Tickets** to confirm the underlying records.

Safe repeat: no data changes occur.

Fallback prompt:

> Search CRM for Gold-tier customers. Search their orders, find the delayed shipments for those orders, and then check which delayed orders have open tickets.

### Scenario 2 — Autonomous refund

Prompt:

> Find Silverline Retail's delayed order and process the appropriate refund according to enterprise policy if it is within the autonomous limit.

Expected tool sequence:

1. `crm_search_customers`
2. `erp_search_orders`
3. `logistics_search_shipments`
4. `policy_calculate_refund`
5. `payment_issue_refund`

Expected result:

- `ORD-1050` total: $3,200
- Silver policy: 10%, maximum autonomous refund $500
- Completed refund: $320

Show the audience:

1. Refresh **MCP Activity** and show the policy and payment calls.
2. Refresh **Refunds** and show exactly one $320 refund for `ORD-1050`.

Safe repeat: Codex may report that the order is already refunded; no duplicate refund or approval may be created.

Fallback prompt:

> Search CRM for Silverline Retail. Find its delayed order, calculate that order's refund using enterprise policy, and issue the refund if it is within the autonomous limit.

### Scenario 3 — Human approval boundary

Prompt:

> Find Atlas Manufacturing's delayed order and process the appropriate refund according to enterprise policy.

Expected tool sequence:

1. `crm_search_customers`
2. `erp_search_orders`
3. `logistics_search_shipments`
4. `policy_calculate_refund`
5. `payment_issue_refund`

Expected result before approval:

- `ORD-1060` total: $6,500
- Gold policy: 20%, maximum autonomous refund $1,000
- Recommended refund: $1,300
- Result: `APPROVAL_REQUIRED`
- No refund exists for `ORD-1060`

Show the audience:

1. Refresh **MCP Activity** and show the five calls.
2. Refresh **Approvals** and show one pending $1,300 request.
3. Open **Refunds** and point out that `ORD-1060` has no refund yet.
4. Return to **Approvals**, approve the request, and confirm the dialog.
5. Refresh **Approvals** and **Refunds**. Show the approved request and exactly one completed $1,300 refund.

Safe repeat: the existing approval or refund is returned; no duplicate is created.

Fallback prompt:

> Search CRM for Atlas Manufacturing. Find its delayed order, calculate the policy refund, and attempt to issue that refund. Report clearly if human approval is required.

## 5. Recovery table

| Problem                                                  | Recovery                                                                                                                                                             |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MCP server is missing or disconnected                    | Open the Codex MCP view or run `/mcp`. Confirm `enterprise_demo`, the endpoint URL, and the token environment variable. Restart Codex only if configuration changed. |
| `401` or invalid token                                   | Confirm the local `ENTERPRISE_MCP_TOKEN` matches Vercel's `MCP_BEARER_TOKEN`. Do not print either value. Restart Codex after correcting the environment.             |
| Tool call times out on the first attempt                 | Retry once. A Vercel or database cold start can affect the first call; open the dashboard shortly before presenting.                                                 |
| MCP Activity appears unchanged                           | Wait for Codex to finish, then use **Refresh data** or refresh the page. Confirm Codex used `enterprise_demo`, not another server.                                   |
| Scenario returns an existing refund or approval          | The database is not at baseline. Run `bun run demo:reset`, confirm the dashboard counts, and restart from Scenario 1.                                                |
| Approval is present but no refund appears after approval | Refresh **Approvals** and **Refunds** once. If still absent, stop the rehearsal and run the approval verification locally before continuing.                         |
| A prompt leads to unnecessary tool calls                 | Use the scenario's fallback prompt. Do not give Codex database IDs or call tools manually unless explaining recovery to the audience.                                |

## 6. Final go/no-go checklist

Complete two consecutive rehearsals. Mark the demo ready only when every item is true:

- [ ] `bun run demo:reset` reports `status: ready` before each rehearsal.
- [ ] The deployed dashboard loads and shows the six clean-baseline counts.
- [ ] Codex connects to `enterprise_demo` and discovers all eleven tools.
- [ ] Scenario 1 identifies the three delayed Gold orders and only `TKT-009` as open.
- [ ] Scenario 2 creates exactly one completed $320 refund for `ORD-1050`.
- [ ] Repeating Scenario 2 creates nothing new.
- [ ] Scenario 3 creates exactly one pending $1,300 approval for `ORD-1060` and no refund.
- [ ] Approving Scenario 3 creates exactly one completed $1,300 refund.
- [ ] Repeating Scenario 3 and its approval creates nothing new.
- [ ] MCP Activity shows the expected successful calls after manual refresh.
- [ ] `bun run demo:reset` restores the clean baseline after rehearsal.

On presentation day, run the reset once more, open the dashboard and MCP Activity pages, confirm Codex is connected, and do not run a write scenario before the audience arrives.
