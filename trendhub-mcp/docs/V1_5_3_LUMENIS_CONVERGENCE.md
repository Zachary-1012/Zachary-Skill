# TrendHub v1.5.3 — LUMENIS Evidence/Truth Convergence

Status: release implementation record.

This release was derived from the current `Zachary-1012/LUMENIS-codex-Clean-OS` mainline architecture/contracts, not old chat memory. Product-neutral principles transferred:
- source/runtime truth outranks documentation claims;
- missing, unavailable, stale, offline, auth-required and rate-limited are distinct and never silently become zero;
- Evidence preserves source identity/time/lineage and analysis cannot overwrite source truth;
- one capability has one canonical owner/method;
- capability maturity is PLANNED → IMPLEMENTED → INTEGRATED → TESTED → VERIFIED → RELEASED → OPERATING;
- CI/release evidence is not the same as live operation;
- operational recommendations come only from observed evidence;
- RELEASED and OPERATING are separate states.

## v1.5.3 implementation
1. `trendhub-truth-state-v1`: only fresh usable observations can establish topic PRESENT/ABSENT.
2. Capability Registry v2: canonical owner/method, use/avoid guidance, effect class, evidence requirements and lifecycle.
3. Routing disambiguation across `get_trending`, `analyze_topic`, `trend_intelligence`, `professional_intelligence`, without renaming/removing the 21 public tools.
4. Professional Intelligence exposes per-source and overall Evidence Truth State while preserving existing compatibility fields.
5. Source Reliability emits remediation hints only from observed auth/rate-limit/schema/network/upstream/latency evidence.
6. Public `/health` reports `releaseState` and `operatingState` separately.
7. Stable Web navigation no longer labels Professional Intelligence as DEV; assets are cache-busted for v1.5.3.

## Deliberately not copied
LUMENIS CTH/BMP business truth, Production Core/database, credentials, customer data, Flutter App architecture and cross-product writers remain outside TrendHub.

## Release evidence required
Node 22/24 gates; deterministic/professional/truth tests; 21-tool MCP smoke; Linux/macOS/Windows bootstrap; Public Install E2E; Railway `/health` = v1.5.3/21 tools/51 runtime sources; Official MCP Registry v1.5.3 active + isLatest=true.
