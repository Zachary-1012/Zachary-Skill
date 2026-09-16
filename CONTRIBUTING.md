# Contributing to Zachary-Skill

TrendHub is publicly usable but the upstream repository is intentionally maintained by the owner and explicitly invited collaborators.

## Who can change the upstream repository

Only `@Zachary-1012` and collaborators invited by the owner may create upstream change branches/PRs under the repository's current policy. Public users can clone and use the project; upstream write access is not granted automatically.

## Required change flow

1. Create a feature/fix branch from the current `main` HEAD.
2. Keep changes narrowly scoped and preserve Evidence-first semantics.
3. Run `npm ci --no-audit --no-fund` in `trendhub-mcp`.
4. Run `npm run build`.
5. Run `npm test`.
6. Run `npm run smoke` and require the exact marker `SMOKE OK tools=19`.
7. For source changes, run `npm run source:health` separately. Do not use third-party outages as release-gate failures.
8. Open a PR to `main`; never bypass required Node 22/24 checks.
9. Merge only when the protected-branch gate is green and the branch is up to date.

## Non-negotiable product rules

- Missing data stays `null`, `missing`, or `degraded`; never fabricate values to make a source look healthy.
- Cross-platform hot values are not treated as directly comparable absolute quantities.
- Trend lifecycle/confidence values must be traceable to deterministic evidence and methodology.
- `benchmark_trend_lead` requires an external ground-truth reference timestamp; TrendHub does not invent a benchmark reference.
- No model API key, cookie, credential, user content, hostname, username, IP address, or private path may be committed.
- No automatic third-party telemetry may be added. Diagnostics must remain explicit opt-in and local-first unless a future governance decision changes this.
- Non-loopback HTTP access must remain protected by `TRENTHUB_HTTP_TOKEN`.

## Versioning

- Patch (`x.y.Z`): bug fixes with no tool-contract expansion.
- Minor (`x.Y.0`): backward-compatible new tools/capabilities or substantial analysis methodology upgrades.
- Major (`X.0.0`): breaking MCP/tool/data contracts.

Every distributable version must update `CHANGELOG.md` and pass Stable Release + Public Install E2E.
