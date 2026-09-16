---
name: trendhub
description: Use TrendHub MCP for evidence-first trend research, source reliability checks, cross-platform resonance, trend lifecycle analysis, lead-time benchmarking, Google Trends, future signals and content briefs. Use when a user asks what is trending, whether a topic is rising, how reliable the evidence is, what may matter next, or wants an evidence-backed content direction.
---

# TrendHub Skill

Use the attached `trendhub` MCP server as the primary structured source for trend-intelligence tasks.

## Operating rules

1. **Evidence before interpretation.** Start from TrendHub source results and preserve their `generatedAt`, platform, URL/source, rank/metric, and `dataQuality` semantics when relevant.
2. **Check source reliability for strong claims.** When a conclusion depends materially on one or a few sources, call `source_reliability` and qualify the conclusion if a source is `DEGRADED`, `DOWN`, `AUTH_REQUIRED`, `RATE_LIMITED`, or has thin history.
3. **Missing is not zero.** Never convert `missing`, `degraded`, unavailable, stale, or absent evidence into a fabricated numeric value or a claim that the topic is not happening.
4. **Separate current evidence from history.** Use `get_trending`, `cross_platform_overlap`, `discover_trending_topics`, and `trend_change_alerts` for current movement; use `trend_intelligence` for lifecycle, velocity, persistence, diffusion, reliability, history sufficiency, and deterministic confidence.
5. **Confidence is not probability.** TrendHub confidence is a deterministic evidence-quality indicator, not a probability that an event will happen.
6. **Benchmark only against external ground truth.** `benchmark_trend_lead` requires a user-provided or externally verified reference timestamp. Do not invent the reference time or use later evidence to grade an earlier prediction.
7. **Use Google Trends correctly.** `keyword_trend_curve` returns normalized 0-100 relative interest, not absolute search volume.
8. **Content work remains evidence-first.** For scripts, copy, or planning, use `get_content_brief` and templates as scaffolding, then let the calling AI perform synthesis and writing without inventing source evidence.
9. **Distinguish platform depth.** TrendHub covers 38 public trend sources, but source depth differs. Xiaohongshu has deeper dedicated handling; do not imply every source has identical field depth or access mode.
10. **State uncertainty.** For third-party source failures, login requirements, rate limits, or schema changes, report the operational limitation rather than silently substituting a different fact.

## Suggested workflows

For “what is hot now?” use `get_trending` → `discover_trending_topics` → `source_reliability` for decisive sources.

For “is X really rising?” use `cross_platform_overlap` → `trend_change_alerts` → `trend_intelligence` → `keyword_trend_curve` where search confirmation is useful.

For “what should we watch next?” use `future_signals` + `upcoming_events` + current TrendHub evidence, clearly separating observed evidence from forward-looking interpretation.

For “did TrendHub spot this early?” obtain an external reference timestamp first, then use `benchmark_trend_lead` and report evidence coverage plus 24h/72h lead status.
