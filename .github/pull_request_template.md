## Scope

- [ ] This PR is limited to the stated capability/fix.
- [ ] No credentials, cookies, private data, user content, or telemetry were added.

## Product truth

- What changed:
- What did **not** change:
- Evidence/data-contract impact:
- Known third-party/source limitations:

## Verification

- [ ] `npm ci --no-audit --no-fund`
- [ ] `npm run build`
- [ ] `npm test`
- [ ] `npm run smoke` → exact expected tool marker
- [ ] Node 22 release gate PASS
- [ ] Node 24 release gate PASS
- [ ] If source behavior changed: Source Health reviewed separately
- [ ] If install/release changed: Public Install E2E reviewed

## Release / rollback

- Version impact: none / patch / minor / major
- CHANGELOG updated: yes / no / not applicable
- Rollback path:

## Evidence discipline

- [ ] Missing/degraded values remain explicit; no fabricated fallback data.
- [ ] Trend/benchmark claims are traceable to deterministic evidence and documented methodology.
