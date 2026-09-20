# TrendHub v1.7.0 — Entity-first Intelligence Workspace

## Product shift

v1.7.0 changes the default research model from **hotlist-first** to **Entity-first Intelligence** for brands, companies, commercial places, products and campaigns.

A business subject no longer has to appear in a generic trending list before TrendHub can research it. TrendHub actively acquires subject-specific public evidence first, then asks whether that evidence also shows broad trending behavior.

## Canonical routing

- Brand / company / commercial place / product / campaign / business subject → `professional_intelligence`
- Topic / hotspot / issue / meme / event topic → `analyze_topic`
- Raw current rankings → `get_trending`
- Longitudinal lifecycle-only analysis → `trend_intelligence`

**Hotlist absence is never evidence of subject absence.**

## Query Evidence Acquisition v1

Professional Intelligence v3 actively queries:

- Google News · 中文
- Google News · Global
- GDELT DOC
- Bluesky public search
- Apple Podcasts public search
- Xiaohongshu subject evidence
- TrendHub curated editorial RSS
- Google Trends + related queries
- existing cross-platform hotlists as a secondary visibility signal

Each channel keeps its own semantics. Publication/search relevance is not converted into social popularity. Missing/AUTH_REQUIRED channels remain explicit.

## Professional Intelligence v3

The existing 21-tool compatibility facade is unchanged.

`professional_intelligence` now returns:

1. subject / entity context
2. current state
3. what changed
4. per-channel conclusions
5. drivers
6. opportunities
7. risks
8. evidence gaps
9. recommended actions
10. trend lifecycle / forecasts / audience / media / alerts
11. raw evidence appendix

The deterministic executive contract is promoted to `trendhub-executive-report-v2`.

## Decision-first Web

The public/local Web Console becomes the **TrendHub Intelligence Workspace**.

Default page:
- starts with a research subject, not a news feed;
- answers current state / change / drivers / opportunity / risk / gaps / actions first;
- keeps source evidence visible and inspectable;
- moves raw feeds and technical detail below the decision layer;
- preserves mobile/tablet/desktop responsiveness.

Raw news/feed rows are evidence, not the product summary.

## Xiaohongshu security boundary

The public Remote MCP still does **not** accept or use visitor private cookies.

- Guest/public evidence remains usable.
- Keyword deep search requiring `XHS_COOKIE` is local-only.
- AUTH_REQUIRED never becomes zero/absence.

## Compatibility

Preserved:
- 21 stable MCP tools
- 51 runtime source adapters
- 129 layered source universe
- MCP Resources
- Namespace v1
- Unified Evidence Contract v1
- Skill 2.0
- Source Reliability
- Truth State semantics
- v1.6.1 immutable rollback

## Release acceptance

v1.7.0 may be promoted only after:

1. Node 22 release gate passes.
2. Node 24 release gate passes.
3. Windows/macOS/Linux portable bootstrap passes.
4. Professional deterministic tests pass.
5. v1.7 Entity-first / Decision-first contract test passes.
6. Web security/SPA tests pass.
7. Public Install E2E passes.
8. Railway production runs v1.7.0.
9. Public Web loads the Intelligence Workspace.
10. Remote MCP verifies 21 tools and v1.6 Resource contracts.
11. Official MCP Registry publishes v1.7.0 only after production verification.
