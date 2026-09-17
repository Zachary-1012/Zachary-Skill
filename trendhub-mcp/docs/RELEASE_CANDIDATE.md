# TrendHub Professional Intelligence v2 — Release Candidate

Status: **RELEASED AS v1.5.0; production and Registry verified**.

The approved candidate was merged through the protected `main` path. Stable production is now v1.5.0; immutable v1.4.4 remains the rollback release.

## What “ready to release” means

- product code, Professional Intelligence v2, source universe, brand/entity layer, responsive web, local-first workspace, reporting, alerting and MCP contracts are implemented;
- Node 22 and Node 24 deterministic gates plus Ubuntu/macOS/Windows bootstrap E2E must be green;
- public Remote MCP/Web security smoke must be green;
- release, Registry and public-install workflows use a dynamic MCP tool count instead of assuming 19 tools;
- v1.5.0 is the sole next intended stable version; v1.4.5 is explicitly forbidden;
- main CI, production health, Public Install E2E and Registry preflight all passed in order.

## Promotion

When explicit publication approval is given, and only after the branch is approved for the protected `main` release path:

```bash
cd trendhub-mcp
npm run release:promote -- <next-stable-version>
npm run build
npm run release:preflight
npm run release:gate
```

`release:promote` changes release metadata only. It synchronizes package/lock/manifest/Registry/plugin/runtime versions, promotes the canonical manifest to the 21-tool contract and marks `professional-manifest.json` as `release-ready`.

Before promotion, `npm run release:preflight` is a non-mutating RC check. After the approved metadata promotion, the same command validates the complete v1.5.0 release metadata contract.

After those checks pass, the normal protected `main` path may be used. The existing release automation then creates the tag and GitHub Release only after main CI succeeds. The Registry workflow waits for the public Railway health endpoint to report both the matching version and matching tool count before publishing metadata.

## Rollback boundary

The v1.4.4 tag/release remains immutable. If a later v1.5.0 deployment fails health/MCP checks, stop further publication and restore Railway to the last successful approved deployment, with v1.4.4 available as the immutable rollback target. No release workflow rewrites old tags or releases.

## External constraints that are not faked

Release readiness does not claim proprietary firehose access, proprietary demographic panels, or long-lived real-user adoption/outcome evidence. Those require licensed data or elapsed real-world usage time.
