# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is a live-demo presenter showing an audience how Codex can discover and compose MCP tools across simulated enterprise systems. The presenter needs to confirm persisted outcomes quickly after each scenario by refreshing the application.

## Product Purpose

Enterprise AI Agent is a working prototype that demonstrates Codex reading and mutating enterprise data through a remote MCP server. Success means the audience can see the tool activity, the relevant enterprise records, and any refund or approval outcome without needing to inspect the database or source code.

## Positioning

The prototype makes the complete agent-to-enterprise path visible: Codex calls a small, composable MCP toolset; enterprise services apply policy and persistence rules; the web application presents the resulting audit trail and business state.

## Operating Context

The product is presented live from a deployed Next.js application alongside Codex. The presenter runs a five-act deterministic narrative covering prioritization, investigation, an operational ticket update, autonomous refunding, human approval, and final verification. The presenter manually refreshes the relevant page to show persisted MCP activity and enterprise outcomes. Reliability, audience legibility, and quick recovery matter more than real-time behavior or broad feature depth.

## Capabilities and Constraints

- Simulates CRM, ERP, logistics, payments, ticketing, and approval systems backed by one Neon PostgreSQL database.
- Codex accesses enterprise data only through the authenticated Streamable HTTP MCP endpoint.
- The application exposes Dashboard, Customers, Orders, Shipments, Refunds, Tickets, MCP Activity, Approvals, connected order cases, and an Operations Brief.
- Pending approvals can be approved or rejected in the web application; approval and refund creation remain atomic and idempotent.
- Manual refresh is the accepted update mechanism. Polling, WebSockets, and server-sent events are out of scope.
- Monetary values are stored as integer minor units and displayed in USD.
- The prototype is for a live demonstration only; no separate code submission is required.

## Brand Commitments

Use the visual system documented in `DESIGN.md`: an institutional white canvas, a single #0052ff accent, calm display typography, pill-shaped controls, generous spacing, and a deep near-black product-demo surface.

## Evidence on Hand

- `PRD.md` defines the architecture, routes, data fields, golden scenarios, expected mutations, and reset contract.
- `DESIGN.md` defines the binding visual tokens and component character.
- Seed data contains the deterministic customers, orders, shipments, policies, tickets, and baseline refunds used by the presentation.
- The enterprise services and MCP endpoint are implemented and have been exercised against the deployed application.

## Product Principles

- Make the MCP orchestration and its persisted effects easy to understand at a glance.
- Preserve deterministic, repeatable demo behavior.
- Keep business data and status language more prominent than implementation detail.
- Prefer simple server-rendered views and manual refresh over unnecessary real-time infrastructure.
- Make consequential approval actions explicit while preserving backend idempotency.

## Accessibility & Inclusion

The presentation interface must remain keyboard accessible, provide visible focus states, maintain readable contrast, and adapt from a laptop presentation viewport to a narrow mobile viewport.
