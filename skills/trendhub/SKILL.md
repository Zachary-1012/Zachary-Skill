---
name: trendhub
description: Evidence-first, agent-native trend intelligence. Load only the workflow needed for the current request.
---

# TrendHub Skill 2.0 · TrendHub v1.7.1

Use TrendHub when a request needs current or historical trend evidence, cross-source validation, brand/topic research, source reliability, or a structured content brief.

Core discipline: **Missing is not zero.** Keep the existing 21-tool compatibility contract, disclose source limitations, and never present planned or credentialed coverage as live zero-config evidence.

Progressive disclosure:

- Trend discovery: `workflows/trend-discovery.md`
- Brand radar: `workflows/brand-radar.md`
- Campaign research: `workflows/campaign-research.md`
- Content research: `workflows/content-research.md`
- Validation: `workflows/trend-validation.md`

Before making a conclusion, follow `policies/evidence.md`, `policies/confidence.md`, and `policies/reliability.md`. Load `policies/forecasting.md` only when a forecast is requested.

The MCP server is the capability layer; this Skill explains method and evidence discipline. Do not copy the 21-tool schema into this file. For v1.6 clients with MCP Resources, begin with `trendhub://namespace` and `trendhub://contracts/evidence`, then load only the needed `trendhub://capabilities`, `trendhub://methodology`, `trendhub://sources`, or `trendhub://skill/trendhub` context. Dynamic templates expose `trendhub://platform/{platform}/history`, `trendhub://capability/{capability}`, and `trendhub://source/{source}`.
