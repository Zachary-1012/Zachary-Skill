# TrendHub v1.7.2 — Release Candidate

Status: **release-ready; pending required CI, merge, stable release, production deployment verification and Registry publication**.

Stable base / rollback: **v1.7.1**.

## Candidate scope

- Entity-first Query Evidence Acquisition
- Professional Intelligence v3
- Task-first decision view Web: home = search / recent research / watched / trend discovery; research = current conclusion / trend change / key drivers / platform performance / evidence / opportunities-risks / suggestions / actions
- Backend Decision ViewModel (`trendhub-decision-view-v1`) via read-only `GET /api/review`; browser is renderer-only
- Progressive research results (instant snapshot quick layer + section skeletons, full decision view on the slow layer; missing trend values are null, never zero)
- Deterministic Professional deep-link initialization (retained from v1.7.1)
- Shared desktop/tablet/phone reading alignment axis and on-demand mobile navigation drawer
- Executive Report v2
- canonical Skill 2.0 routing for entity vs topic vs raw trending
- stable 21-tool facade preserved
- v1.6 MCP Resources / Namespace / Evidence Contract preserved

## Non-goals

- No 22nd MCP tool.
- No private-cookie upload path on public Remote MCP.
- No claim that all 129 catalogued sources are live.
- No conversion of missing evidence into zero.
- No replacement of licensed/proprietary datasets with brittle private scraping.

## Acceptance

See `V1_7_0_INTELLIGENCE_WORKSPACE.md` for the full release gate.

The release is complete only after code → CI → GitHub Stable Release → Public Install E2E → Railway production → public Web/MCP verification → Official MCP Registry publication.

## Rollback

v1.7.0 remains immutable and must not be rewritten.
