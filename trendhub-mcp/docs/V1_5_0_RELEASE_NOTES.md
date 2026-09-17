# TrendHub v1.5.0 Release Candidate — Release Notes

Status: **approved release candidate; publication is gated by main CI, production health and Registry verification**. v1.4.4 remains the immutable rollback release.

## Included

- Professional Intelligence v2 evidence aggregator with source-local normalization.
- Cross-signal confirmation, first-seen/first-confirmed timestamps, lead-lag ordering, observed-source spread graph, novelty, seasonality, volatility and meta-trend evidence.
- Canonical news URL/title clustering with duplicate suppression and publisher-domain attribution.
- Evidence-bound brand/entity context: share of voice by signal family, co-mentions, campaign tokens, creator spread, search/social divergence and editorial confirmation.
- Multi-year local history, robust MAD anomaly detection, damped-Holt 6/24/48/72-hour forecasts, holdout validation and abstention.
- Source Universe coverage and explicit zero-config/API/OAuth/local-session/licensed/planned boundaries across CN, APAC and global sources.
- Responsive professional Web console with safe-area, touch-target, fallback and security contracts.
- Local-first workspaces, RBAC, watchlists, saved queries, alert rules and audit log.
- Deterministic JSON/Markdown/CSV reports and evidence-bound alerts.
- SSRF-safe public URL validation and untrusted snippet sanitization.
- Metadata-only v1.5.0 promotion, RC-safe preflight and rollback documentation.

## Explicit non-claims

This RC does not claim licensed firehose scale, proprietary demographic panels, proprietary archives, real-user adoption/outcome evidence or long-lived real-world forecast accuracy. Planned sources remain planned until an authorized adapter and source-health evidence exist.

## Safety boundary

The release workflow may merge the approved PR, create only the new v1.5.0 tag/release, deploy the approved main revision through the configured Railway path, and publish Registry metadata only after matching production health. The existing v1.4.4 tag/release is not modified.
