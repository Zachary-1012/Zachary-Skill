# TrendHub Professional Intelligence v2 — Release Candidate

Status: **APPROVED FOR RELEASE; publication remains workflow-gated**.

The approved candidate is isolated on `dev/professional-intelligence-v2` until the protected `main` merge. Stable production remains v1.4.4 until the matching v1.5.0 deployment passes health and MCP checks.

## What “ready to release” means

- product code, Professional Intelligence v2, source universe, brand/entity layer, responsive web, local-first workspace, reporting, alerting and MCP contracts are implemented;
- Node 22 and Node 24 deterministic gates plus Ubuntu/macOS/Windows bootstrap E2E must be green;
- public Remote MCP/Web security smoke must be green;
- release, Registry and public-install workflows use a dynamic MCP tool count instead of assuming 19 tools;
- v1.5.0 is the sole next intended stable version; v1.4.5 is explicitly forbidden;
- publication is still blocked unless main CI, production health and the Registry preflight all pass in order.

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

The current v1.4.4 tag/release remains immutable. If a later approved deployment fails health/MCP checks, do not publish the new Registry metadata. Restore Railway to the last successful v1.4.4 deployment (or the most recent approved stable deployment), then re-run production health verification. No candidate workflow rewrites old tags or releases.

## External constraints that are not faked

Release readiness does not claim proprietary firehose access, proprietary demographic panels, or long-lived real-user adoption/outcome evidence. Those require licensed data or elapsed real-world usage time.
