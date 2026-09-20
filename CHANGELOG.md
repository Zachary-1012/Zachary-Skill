# Changelog

## v1.6.1 — Runtime adapter noise hotfix

- Isolate embedded `dailyhot-api` usage at the route-handler layer instead of importing its full Hono Web application, removing the unrelated `./public` static-directory warning from TrendHub production.
- Replace the fragile upstream Douyin temporary-cookie parser with a TrendHub-owned public adapter that treats missing cookies/network restrictions as explicit source availability evidence.
- Add a deterministic runtime-noise contract test.
- Preserve all v1.6 Agent-native protocol contracts and the stable 21-tool facade; v1.6.0 remains immutable rollback.


## v1.6.0 — Agent-native protocol foundation

- Promote MCP Resources from incubated capability to a first-class public contract without changing the stable 21-tool compatibility facade.
- Add canonical namespaces: capability IDs use `trendhub.*`; Resources use `trendhub://*`; legacy tool names remain stable for existing clients.
- Publish Unified Evidence Contract v1 with explicit `data / evidence / source / timestamp / reliability / confidence / limitations / trace` plus compatible truth/lineage fields.
- Publish TrendHub Skill 2.0 as a progressive-disclosure contract with machine-readable workflows, policies, resources and compatibility boundaries.
- Add static Resources for namespace, evidence contract and Skill 2.0, plus templates for platform history, capability descriptors and source access/provenance contracts.
- Upgrade production Remote MCP publication smoke so Official MCP Registry publication requires real `resources/list`, Resource Templates and critical resource reads against the deployed endpoint.
- Adopt current LUMENIS cross-product truth disciplines only: production/runtime evidence outranks documentation, `missing != 0`, release/operating states are separate, and acquisition adapters never become truth owners. LUMENIS business/domain truth is not imported.
- Keep v1.5.3 immutable as the rollback release; MCP Apps and durable async Tasks remain later-stage capabilities and are not represented as operating in v1.6.0.


## v1.5.3 — Evidence truth and capability convergence

- Transfer current LUMENIS evidence/truth principles without importing LUMENIS business truth: explicit NOT_COLLECTED/UNAVAILABLE/STALE/OFFLINE/AUTH_REQUIRED/RATE_LIMITED states never become zero or observed absence.
- Add Capability Registry v2 with one canonical owner/method, evidence lifecycle and use/avoid routing guidance.
- Disambiguate get_trending, analyze_topic, trend_intelligence and professional_intelligence while preserving the 21-tool compatibility contract.
- Add evidence-bound source remediation hints and separate RELEASED from OPERATING in public health.
- Add deterministic truth-contract coverage and remove the stale Professional Intelligence DEV navigation label.


## v1.5.0 — Professional Intelligence and topic radar

- Promote Professional Intelligence v2 to the stable 21-tool contract with a 129-source professional universe and explicit zero-config/API/OAuth/local-session/licensed/planned boundaries.
- Add topic-first discovery: brand, campaign, product, audience issue, industry theme and platform tag inputs can flow through cross-platform overlap, topic clustering and evidence-bound marketing interpretation.
- Add real-time topic phrase cloud, platform evidence explanations and animated Google Trends curve rendering.
- Fix the phone/tablet Web Console layout: navigation wraps instead of clipping, controls and cards adapt to viewport width, tables remain intentionally scrollable, and typography/touch targets respect safe areas.
- Keep v1.4.4 immutable as rollback; v1.4.5 is skipped.

## v1.4.2 — Scheduled trend history

- Add an opt-in snapshot scheduler (`src/runtime/snapshot-scheduler.ts`) that periodically runs the existing `takeSnapshots()` pipeline to accumulate the bounded trend history used by lifecycle intelligence and 24h/72h lead benchmarks.
- The hosted Remote MCP gateway exposes scheduler state on `/health`. Collection is **disabled by default** and enabled only with `TRENTHUB_REMOTE_SNAPSHOT_ENABLED=1` (cadence `TRENTHUB_SNAPSHOT_INTERVAL_MIN`, 15-minute floor; initial delay `TRENTHUB_SNAPSHOT_INITIAL_DELAY_MS`). Collection failures never exit the MCP process and overlapping runs are skipped.
- Local-only mutating routes such as `/api/snapshot` remain private on the public gateway; no visitor `XHS_COOKIE` is ever injected.
- Add a deterministic scheduler test and wire it into the release gate.
- Document cross-platform local scheduled collection (cron on macOS/Linux, Task Scheduler on Windows).
- No change to the 19-tool / 38-source contract.

## v1.4.1 — Multi-registry distribution

- Add isolated public Streamable HTTP MCP gateway for marketplace distribution.
- Add public privacy/terms/health/discovery endpoints while keeping the core loopback-only behind a private bearer token.
- Add Official MCP Registry, Cursor, Smithery/Glama-ready distribution metadata and remote smoke validation.
- Verify the live Official MCP Registry entry as `active` / latest and the live Glama connector as searchable.
- Add zero-install Remote MCP configuration and a one-click Cursor MCP install path to the public README.
- Split marketplace wording into **published/searchable** versus **compatible/submission-ready**, so review-gated stores are never represented as already listed.
- No change to the 19-tool TrendHub capability contract.

All notable TrendHub changes are recorded here. Versions follow Semantic Versioning and only Stable Releases are considered distributable product versions.

## [1.4.0] - 2026-09-17

### Added
- **Source Reliability** with local-only observations, UP/DEGRADED/DOWN/AUTH_REQUIRED/RATE_LIMITED status, 24h/7d/30d availability, P50/P95 latency, consecutive failures, schema-drift signals, and a transparent reliability score.
- **Trend Intelligence Engine v1** with deterministic lifecycle, velocity, persistence, cross-platform diffusion, source reliability, history sufficiency, and confidence metrics.
- **Lead-time Benchmark v1** comparing TrendHub's earliest local evidence with an externally supplied ground-truth timestamp to measure 24h/72h early detection.
- Batch `npm run benchmark:lead -- --file <cases.json>` runner for company/internal real-world benchmark sets; no synthetic reference timestamps and no automatic upload.
- Bounded 30-day local evidence history for lifecycle and benchmark calculations.
- Voluntary `npm run quality:diagnostic` report. The report is local-only and excludes hostname, username, absolute paths, cookies, query text, content bodies, IP addresses, and account identifiers.
- Rolling six-hour Source Health observations with restored non-sensitive reliability/history/snapshot state and a machine-readable JSON artifact retained for 30 days.
- Root LICENSE, CONTRIBUTING, SECURITY, GOVERNANCE, CODEOWNERS, pull-request template, and generated-release-note categories.

### Changed
- MCP contract expands from 16 to **19 tools**.
- Source Health now checks the complete registered hot-platform set instead of a hand-picked subset and emits machine-readable reliability evidence.
- Scheduled Source Health advances the same bounded evidence history used by lifecycle and lead-time analysis, rather than starting from an empty runner on every schedule.
- Xiaohongshu hot-topic tool routes through the common source dispatcher so its availability is included in Source Reliability.
- Snapshot accumulation now also maintains bounded history without changing the existing latest/previous change-alert semantics.
- `package.json`, `manifest.json`, MCP server version, and npm lockfile root metadata are synchronized at `1.4.0`.

### Privacy
- No automatic telemetry was introduced.
- Reliability data contains operational metadata only; scheduled cached history contains public trend evidence and no user credentials/model prompts.
- Quality diagnostics are generated only when the user explicitly runs the command; nothing is uploaded automatically.
- Batch benchmark reports are local files and are ignored by Git.

### Benchmark semantics
- Lead-time benchmark reference timestamps must come from an external documented ground truth selected independently of TrendHub output.
- TrendHub never manufactures the reference time or claims predictive accuracy from insufficient history.

## [1.3.1] - 2026-09-16

### Fixed
- Exact machine-readable public-install smoke marker.
- Node >=22 runtime wording and lockfile/version consistency.

### Verified
- Public Stable install E2E.
- Node 22/24 release gates.
- Cross-platform Node-free bootstrap on Windows, macOS, and Linux.

## [1.3.0] - 2026-09-16

### Added
- Public Stable release channel, deterministic release gate, HTTP security boundary, public AI install contract, and 16-tool MCP product baseline.
