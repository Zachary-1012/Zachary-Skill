# TrendHub Professional Intelligence v2 — Release Candidate

Status: **READY TO RELEASE, NOT PUBLISHED**.

This candidate is intentionally isolated on `dev/professional-intelligence-v2`. Stable production remains v1.4.4 until explicit approval.

## What “ready to release” means

- product code, Professional Intelligence v2, source universe, brand/entity layer, responsive web, local-first workspace, reporting, alerting and MCP contracts are implemented;
- Node 22 and Node 24 deterministic gates plus Ubuntu/macOS/Windows bootstrap E2E must be green;
- public Remote MCP/Web security smoke must be green;
- release, Registry and public-install workflows use a dynamic MCP tool count instead of assuming 19 tools;
- v1.5.0 is the sole next intended stable version; v1.4.5 is explicitly forbidden;
- no merge, tag, GitHub Release, Railway deployment or MCP Registry publication is performed by candidate preparation.

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

On the RC branch, `npm run release:preflight` is a non-mutating RC check. It confirms that the current v1.4.4 runtime/production metadata is untouched and that the v1.5.0 promotion contract is complete.

After those checks pass, the normal protected `main` path may be used. The existing release automation then creates the tag and GitHub Release only after main CI succeeds. The Registry workflow waits for the public Railway health endpoint to report both the matching version and matching tool count before publishing metadata.

## Rollback boundary

The current v1.4.4 tag/release remains immutable. If a later approved deployment fails health/MCP checks, do not publish the new Registry metadata. Restore Railway to the last successful v1.4.4 deployment (or the most recent approved stable deployment), then re-run production health verification. No candidate workflow rewrites old tags or releases.

## External constraints that are not faked

Release readiness does not claim proprietary firehose access, proprietary demographic panels, or long-lived real-user adoption/outcome evidence. Those require licensed data or elapsed real-world usage time.
