---
name: trendhub
description: Evidence-backed AI content creation and agent-native trend intelligence. Use the user's AI to produce editable artifacts, not steps-only guidance.
---

# TrendHub Skill 2.0 · TrendHub v2.0.0

Use TrendHub when a request needs current or historical trend evidence, cross-source validation, brand/topic research, or a real content project that proceeds from evidence to an editable artifact, review, publishing preparation, and evaluation.

Core discipline: **Missing is not zero.** Keep the existing 21-tool compatibility contract, disclose source limitations, and never present planned or credentialed coverage as live zero-config evidence.

Progressive disclosure:

- Trend discovery: `workflows/trend-discovery.md`
- Brand radar: `workflows/brand-radar.md`
- Campaign research: `workflows/campaign-research.md`
- Content research: `workflows/content-research.md`
- Content creation: `workflows/content-creation.md`
- Validation: `workflows/trend-validation.md`

Before making a conclusion, follow `policies/evidence.md`, `policies/confidence.md`, and `policies/reliability.md`. For creation, also load `policies/model-routing.md`. Load `policies/forecasting.md` only when a forecast is requested.

Content creation must produce or update a usable artifact. In an MCP Apps host,
open the TrendHub Content Studio attached to `get_content_brief` and use the
person's current host AI. In a local installation, optional Settings channels
accept DeepSeek, Zhipu BigModel, or a user-controlled loopback OpenAI-compatible
endpoint. An unconfigured channel never blocks the product; once filled and
saved, it connects automatically and the content studio writes the editable
artifact in place. Do not
ask the person to copy a prompt into a separate model when any route is available.

Optional Xiaohongshu Cookie enhancement is also configured in local Settings.
The Cookie must contain `a1` and `web_session`, stays in process memory, and
must never be sent to or accepted by the public hosted service.

Use this production chain: Brief → Context → Research/Evidence → Strategy → Draft → Review → Approval → Export/Publish preparation → Measurement → Evaluation → versioned learning. Creative expression may vary; facts and claims may only come from verified evidence or explicit user input. Unknown facts stay marked `【待核验】`.

Prefer the strongest task-appropriate commercially usable open-weight model the user's runtime can actually serve. Verify the exact model-version license before production use. Model output is replaceable and never becomes Evidence by itself. Reuse permissive models before creating a missing adapter, retrieval layer, evaluator, prompt asset, fine-tune, or model capability.

The MCP server is the capability layer; this Skill explains method and evidence discipline. Do not copy the 21-tool schema into this file. For v1.6 clients with MCP Resources, begin with `trendhub://namespace` and `trendhub://contracts/evidence`, then load only the needed `trendhub://capabilities`, `trendhub://methodology`, `trendhub://sources`, or `trendhub://skill/trendhub` context. Dynamic templates expose `trendhub://platform/{platform}/history`, `trendhub://capability/{capability}`, and `trendhub://source/{source}`.
