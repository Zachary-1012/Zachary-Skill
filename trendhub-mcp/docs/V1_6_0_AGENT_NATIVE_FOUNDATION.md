# TrendHub v1.6.0 — Agent-native Foundation

TrendHub v1.6.0 promotes the protocol-native foundation that was incubated in v1.5.x without changing the stable 21-tool compatibility facade.

## Released foundation

- **MCP Resources** become a first-class public contract: methodology, sources, capabilities, reliability, namespace, evidence contract and Skill 2.0.
- Dynamic resource templates expose per-platform history, per-capability routing metadata and per-source access contracts.
- **Canonical namespace**: capability IDs use `trendhub.*`; MCP resources use `trendhub://*`; legacy tool names remain unchanged for compatibility.
- **Unified Evidence Contract v1** adds explicit `source` and `timestamp` fields while preserving truth state, lineage, reliability, confidence, limitations and trace.
- **Skill 2.0** is progressive-disclosure by design: load the minimum workflow/policy/resource context required for the request.
- Production Remote MCP publication validates the v1.6 resource foundation before Registry publication.

## LUMENIS principles intentionally adopted

TrendHub adopts only cross-product engineering semantics from the current LUMENIS README:

- Production/runtime truth outranks documentation claims.
- `missing != 0`.
- `IMPLEMENTED / TESTED / VERIFIED / RELEASED / OPERATING` are different states.
- Acquisition adapters never become the truth owner.
- Capability owner, contract, evidence lifecycle and honest error state must be explicit.

TrendHub does **not** import LUMENIS CTH/BMP domain models, metrics or business truth.

## Compatibility

- MCP tools remain **21**.
- Existing tool names and arguments remain the compatibility surface.
- v1.5.3 remains the rollback release.
- MCP Apps and durable async Tasks remain later-stage capabilities; v1.6 does not falsely mark them operating.
