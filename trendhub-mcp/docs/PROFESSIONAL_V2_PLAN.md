# TrendHub Professional Intelligence v2 — Engineering Convergence Plan

Status: **development-only**. This branch must not be merged to `main`, tagged, released, or deployed until separately approved.

The goal is to raise all engineering-controllable product dimensions toward professional trend / consumer intelligence standards while preserving TrendHub's public-data, BYO-AI, evidence-first model. External licensed firehose coverage, long-lived real-user behavior data and proprietary demographic panels are external constraints and are not fabricated as code claims.

## Professional reference patterns

Current professional reference products reviewed for this convergence: Brandwatch Consumer Research, Meltwater Consumer Intelligence / MCP, Lumen by Talkwalker, Exploding Topics, and Glimpse. Their recurring product patterns are:

- long-horizon historical evidence;
- reliable multi-source normalization and source-health measurement;
- anomaly / spike detection;
- lifecycle, velocity, persistence and diffusion analysis;
- forecasting with uncertainty and retrospective validation;
- audience, entity, creator and topic segmentation;
- visual / media evidence;
- configurable alerts and action routing;
- executive reporting and evidence appendices;
- saved workspaces, watchlists, roles and auditability;
- rich interactive visualizations;
- first-class API / agent access.

## Build-vs-open-source decisions

| Capability | Decision | Reason |
| --- | --- | --- |
| Durable analytical store | Built-in `node:sqlite` when available + JSON compatibility fallback | Indexed multi-year history without native npm build dependencies; preserves portable bootstrap. |
| Forecasting / statistics | Self-developed deterministic robust primitives | Small, explainable, dependency-free, auditable. Forecast outputs remain conditional and are never presented as probabilities. |
| Spike / anomaly detection | Self-developed robust median / MAD engine | Less sensitive to outliers than naive z-score and fully explainable. |
| Topic / entity graph | Extend deterministic token/entity graph | No opaque embedding service required; every cluster remains traceable to source evidence. |
| Visualization | Apache ECharts integration contract | Mature Apache-2.0 responsive charting with large-data and accessibility support. |
| RBAC / collaboration | Local workspace policy model with Casbin-compatible semantics | Supports owner/editor/analyst/viewer roles without forcing a central identity service. |
| Observability | OpenTelemetry-compatible local metrics schema | Professional traces/metrics shape while preserving zero-telemetry by default. |
| Visual understanding | BYO-AI media evidence contract + optional local Transformers.js/ONNX adapter | Multimodal callers can inspect media now; heavyweight local models stay optional. |
| Reports / exports | Evidence-bound executive report model + Markdown/JSON/CSV adapters | Keeps provenance, caveats and evidence appendix attached to every conclusion. |
| Alerts | Deterministic rule engine + transport-neutral action contract | Supports webhook/email/Slack/Teams style routing without vendor lock-in. |

## Target scorecard — controllable engineering dimensions

1. **History & storage** — configurable multi-year retention, indexed evidence store, migration-safe fallback.
2. **Trend intelligence** — lifecycle + velocity + persistence + diffusion + anomaly + forecast + backtest + uncertainty.
3. **Evidence graph** — derived claims retain source URL, capture time, platform and transformation provenance.
4. **Audience / entity** — evidence-based public creator/entity segmentation; no sensitive demographic inference.
5. **Media** — image/video evidence surfaced to multimodal callers; optional local inference adapter.
6. **Alerts** — threshold, spike, lifecycle, source-health, sentiment/risk and viral rules with cooldown/dedupe.
7. **Reporting** — executive brief, methodology, caveats, evidence appendix, machine-readable export.
8. **Collaboration** — workspaces, watchlists, saved queries, roles, audit log; local-first.
9. **Web** — drill-down dashboard for history, forecast, anomaly, alerts and reports.
10. **Agent** — MCP contract remains evidence-first and model-neutral.
11. **Security / privacy** — least privilege, zero telemetry by default, no sensitive inference, explicit egress boundaries.
12. **Reliability** — source health + application health + graceful degradation + local observability.

## Explicit non-claims

- Public web adapters are **not** described as licensed platform firehoses.
- This work does not claim Brandwatch/Meltwater/Talkwalker-scale archives or proprietary demographic panels.
- Forecast accuracy is not claimed until independent real-world backtests accumulate.
- Sensitive attributes are never inferred from names, images, language or behavior.
- This branch is not a release; production stays on the last approved Stable Release.

## Convergence gates

Before this branch can be considered release-candidate quality, it must pass:

- deterministic unit tests for storage, forecast, anomaly, alerts, reports, workspace/audit and media evidence;
- Node 22 and 24 build/test/smoke;
- zero-network test fixtures for every analytical result;
- explicit insufficient-evidence behavior;
- no regression of existing 19-tool Stable contract unless a later release deliberately changes the public contract;
- no automatic Railway deployment and no Stable Release tag from this branch.
