# Changelog

## v1.4.1 — Multi-registry distribution

- Add isolated public Streamable HTTP MCP gateway for marketplace distribution.
- Add public privacy/terms/health/discovery endpoints while keeping the core loopback-only behind a private bearer token.
- Add Official MCP Registry, Cursor, Smithery/Glama-ready distribution metadata and remote smoke validation.
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
