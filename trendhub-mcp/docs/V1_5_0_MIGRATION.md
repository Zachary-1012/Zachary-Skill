# TrendHub v1.5.0 Migration Guide

Status: published migration guidance; no automatic data migration is run by the release.

## Data

The existing local history store remains readable. Node 22+ uses the built-in SQLite backend; installations without `node:sqlite` retain the bounded JSON fallback. Existing JSON history is migrated once into the local SQLite file. No hosted database or user content is required.

The Professional Intelligence layer is additive. Existing snapshots, source reliability records and v1 tool inputs remain valid. New evidence fields may be absent and must be represented as `null`, `missing` or `insufficient_evidence` rather than zero.

## Client contract

The development RC exposes 21 tools: the stable 19 plus `professional_intelligence` and `workspace_manage`. Clients should discover the tool list from the MCP handshake and not hard-code 19.

The public stable endpoint is now the v1.5.0 21-tool contract. The immutable v1.4.4 release remains the rollback target.

## Upgrade procedure after approval

1. Run `npm run release:promote -- 1.5.0` on the approved release branch.
2. Run `npm run release:preflight`, `npm run release:gate` and the protected CI matrix.
3. Deploy only through the approved release workflow.
4. Verify `/health` version and tool count before Registry publication.

Promotion is metadata-only and does not itself merge, tag, deploy or publish.
