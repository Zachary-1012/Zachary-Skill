# Changelog

All notable TrendHub changes are recorded here. Versions follow Semantic Versioning and only Stable Releases are considered distributable product versions.

## [1.4.0] - 2026-09-17

### Added
- **Source Reliability** with local-only observations, UP/DEGRADED/DOWN/AUTH_REQUIRED/RATE_LIMITED status, 24h/7d/30d availability, P50/P95 latency, consecutive failures, schema-drift signals, and a transparent reliability score.
- **Trend Intelligence Engine v1** with deterministic lifecycle, velocity, persistence, cross-platform diffusion, source reliability, history sufficiency, and confidence metrics.
- **Lead-time Benchmark v1** comparing TrendHub's earliest local evidence with an externally supplied ground-truth timestamp to measure 24h/72h early detection.
- Bounded 30-day local evidence history for lifecycle and benchmark calculations.
- Voluntary `npm run quality:diagnostic` report. The report is local-only and excludes hostname, username, absolute paths, cookies, query text, content bodies, IP addresses, and account identifiers.
- Daily Source Health JSON artifact for third-party availability review.
- Root LICENSE, CONTRIBUTING, SECURITY, GOVERNANCE, CODEOWNERS, pull-request template, and generated-release-note categories.

### Changed
- MCP contract expands from 16 to **19 tools**.
- Source Health now checks the complete registered hot-platform set instead of a hand-picked subset and emits machine-readable reliability evidence.
- Xiaohongshu hot-topic tool routes through the common source dispatcher so its availability is included in Source Reliability.
- Snapshot accumulation now also maintains bounded history without changing the existing latest/previous change-alert semantics.

### Privacy
- No automatic telemetry was introduced.
- Reliability data remains local and contains operational metadata only.
- Quality diagnostics are generated only when the user explicitly runs the command; nothing is uploaded automatically.

### Benchmark semantics
- Lead-time benchmark reference timestamps must come from an external documented ground truth. TrendHub never manufactures the reference time or claims predictive accuracy from insufficient history.

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
