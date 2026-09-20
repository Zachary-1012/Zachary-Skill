# TrendHub v1.6.1 — Runtime Adapter Hotfix

Status: **release-ready; pending required PR checks, merge, stable release, production deployment verification and Registry publication**.

v1.6.1 is a patch above the immutable v1.6.0 Agent-native Foundation release.

## Hotfix scope

- Stop importing the full `dailyhot-api` Hono application for embedded source collection.
- Load only individual upstream route handlers, preventing its unrelated `./public` static-shell lookup from polluting TrendHub production logs.
- Route Douyin through a TrendHub-owned public adapter with defensive temporary-cookie parsing.
- A missing Douyin temporary cookie now becomes explicit degraded/missing source evidence, never a thrown parser error and never a fabricated empty/zero result.
- Preserve the v1.6 protocol foundation: 21 tools, MCP Resources, Namespace v1, Unified Evidence Contract v1 and Skill 2.0.

## Acceptance

1. Node 22 and Node 24 release gates pass.
2. Windows/macOS/Linux bootstrap E2E pass.
3. Runtime noise contract verifies no embedded `dailyhot-api/dist/app.js` dependency path and a canonical TrendHub Douyin override.
4. Public install E2E succeeds from a fresh clone.
5. Railway production runs v1.6.1 and production logs no longer emit the upstream `serveStatic ./public` or Douyin cookie-parser error.
6. Production Remote MCP still exposes 21 tools, 51 platform adapters and the v1.6 Resources/Templates contract.
7. Official MCP Registry publishes v1.6.1 only after the production protocol contract is verified.

## Rollback

v1.6.0 remains the immediate immutable rollback release. Do not rewrite published tags or assets.
