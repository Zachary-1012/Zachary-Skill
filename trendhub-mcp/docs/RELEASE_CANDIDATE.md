# TrendHub v1.6.0 — Agent-native Foundation Release Candidate

Status: **release-ready; pending required PR checks, merge, stable release, production deployment verification and Registry publication**.

v1.6.0 is the next stable minor release above v1.5.3. It promotes the Agent-native protocol foundation that was incubated in v1.5.x while preserving the stable 21-tool compatibility facade. Published v1.5.3 and earlier release artifacts remain immutable rollback references.

## Release contract

- **21 MCP tools remain compatible**. Existing tool names and arguments are not renamed for v1.6.
- MCP Resources become a first-class public contract.
- Canonical capability namespace: `trendhub.*`.
- Canonical resource namespace: `trendhub://*`.
- Unified Evidence Contract v1 requires `data / evidence / source / timestamp / reliability / confidence / limitations / trace` and retains explicit truth-state/lineage compatibility fields.
- TrendHub Skill 2.0 uses progressive disclosure and a machine-readable manifest.
- Static Resources include methodology, source universe, capability registry, source reliability, namespace, Evidence Contract and Skill 2.0.
- Resource Templates include platform history, capability detail and source access/provenance detail.
- Official MCP Registry publication must validate the deployed production Remote MCP with real Resource listing/template discovery and critical resource reads.
- `missing != 0`; `CI PASS != OPERATING`; acquisition adapters provide evidence but never own canonical truth.
- MCP Apps and durable async Tasks are not promoted to operating capabilities in v1.6.0.

## LUMENIS convergence boundary

TrendHub v1.6 adopts only cross-product truth/governance semantics from the current LUMENIS README: current production/runtime evidence outranks documentation, capability states are separated, missing data remains missing, and adapters do not become truth owners.

TrendHub does **not** import LUMENIS CTH/BMP business models, metrics, permissions, product UI architecture or Production Truth.

## Acceptance

A v1.6.0 release is acceptable only when:

1. Node 22 and Node 24 release gates pass.
2. deterministic tests pass, including v1.6 namespace/evidence/Skill/Resource coverage.
3. public install E2E succeeds from a fresh clone.
4. the production Remote MCP reports version 1.6.0 and 21 tools.
5. the production Remote MCP exposes the required v1.6 Resources and Resource Templates.
6. Official MCP Registry publication runs only after the production protocol contract is verified.

## Rollback

v1.5.3 is the immediate immutable rollback release. Do not rewrite published tags or assets.
