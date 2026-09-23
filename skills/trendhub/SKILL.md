---
name: trendhub
description: Evidence-backed AI content creation and agent-native trend intelligence. Use the user's AI to produce editable artifacts, not steps-only guidance.
---

# TrendHub Skill 2.0 · TrendHub v2.0.2

Use TrendHub when a request needs current or historical trend evidence, cross-source validation, brand/topic research, or a real content project that proceeds from evidence to an editable artifact, review, publishing preparation, and evaluation.

Core discipline: **Missing is not zero.** Keep the existing 21-tool compatibility contract, disclose source limitations, and never present planned or credentialed coverage as live zero-config evidence.

When the person explicitly requests Jev review, call `get_content_brief` with `jev_review_public_titles: true`. TrendHub supplies Jev centrally; never ask Skill users for their own TypeSafe key. Jev judges only whether up to eight public source titles directly discuss the research topic. Its probability is not evidence of factual accuracy, popularity, or source reliability. If the platform reports Jev unavailable, state that clearly and continue the evidence-backed research without inventing a score. Do not send private draft text or a confidential topic to Jev.

Default product focus is brand marketing, business operations, advertising,
media, retail and adjacent commercial industries. Do not use a broad guest
homepage feed as the primary answer for these requests. Prefer subject-specific
query evidence and the `industry` future-signal category.

When a platform is restricted, keep the result useful through this evidence
order: live official/public result → user-authorized local session → latest
successful snapshot → subject-relevant public industry evidence. Keep substitute
evidence in a separately labelled fallback block; never rename it as the
restricted platform's hotlist or imply equivalent coverage.

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
Treat one natural-language request as sufficient input. Infer the target platform,
artifact format, objective, audience and tone; collect evidence and start creation
without requiring a form. Keep detailed fields available only as optional advanced
controls. Surface Xiaohongshu, Douyin, WeChat articles, Weibo, short video and
long-form article creation in the primary workspace rather than hiding them in settings.

Optional Xiaohongshu Cookie enhancement is also configured in local Settings.
The Cookie must contain `a1` and `web_session`, stays in process memory, and
must never be sent to or accepted by the public hosted service.
Without a Cookie, Xiaohongshu output must be narrowed by the requested brand,
Campaign or industry. If the guest feed is blocked or has no direct match,
return the separately labelled industry-public-evidence fallback instead of a
generic recommendation feed or an empty product surface.

Use this production chain: Brief → Context → Research/Evidence → Strategy → Draft → Review → Approval → Export/Publish preparation → Measurement → Evaluation → versioned learning. Creative expression may vary; facts and claims may only come from verified evidence or explicit user input. Unknown facts stay marked `【待核验】`.

Prefer the strongest task-appropriate commercially usable open-weight model the user's runtime can actually serve. Verify the exact model-version license before production use. Model output is replaceable and never becomes Evidence by itself. Reuse permissive models before creating a missing adapter, retrieval layer, evaluator, prompt asset, fine-tune, or model capability.

The MCP server is the capability layer; this Skill explains method and evidence discipline. Do not copy the 21-tool schema into this file. For v1.6 clients with MCP Resources, begin with `trendhub://namespace` and `trendhub://contracts/evidence`, then load only the needed `trendhub://capabilities`, `trendhub://methodology`, `trendhub://sources`, or `trendhub://skill/trendhub` context. Dynamic templates expose `trendhub://platform/{platform}/history`, `trendhub://capability/{capability}`, and `trendhub://source/{source}`.
