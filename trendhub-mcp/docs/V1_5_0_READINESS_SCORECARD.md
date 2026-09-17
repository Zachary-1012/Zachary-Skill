# TrendHub v1.5.0 RC Readiness Scorecard

The scores below are evidence scores for the current branch, not market claims. A dimension is not scored 9+ without a concrete code path and deterministic test reference.

| Dimension | RC score | Evidence | Status |
| --- | ---: | --- | --- |
| Source architecture & compliant access routing | 9 | `src/sources/professional-catalog.ts`, `src/sources/access-plan.ts`, `scripts/test-professional.mjs`, `scripts/test-professional-e2e.mjs` | evidenced |
| Source reliability & graceful degradation | 9 | `src/store/reliability.ts`, `src/sources/index.ts`, `scripts/test-remote-web.mjs` | evidenced |
| Historical evidence & storage | 9 | `src/store/history.ts`, `scripts/test-professional.mjs` | evidenced |
| Trend analytics & explainability | 9 | `src/analysis/professional-signals.ts`, `src/analysis/statistics.ts`, `scripts/test-professional.mjs` | evidenced |
| Forecast/backtest/uncertainty discipline | 9 | `src/analysis/forecast.ts`, `scripts/test-professional.mjs` | evidenced; long-term accuracy external |
| Brand/entity intelligence | 9 | `src/entities/brand-catalog.ts`, `src/analysis/professional-signals.ts`, entity E2E assertions | evidenced |
| Media/podcast/web-domain intelligence | 8 | `src/analysis/media.ts`, source catalog and RSS boundary | podcast/web live depth remains adapter-dependent |
| Alerts/action workflow | 9 | `src/alerts/engine.ts`, professional deterministic tests | evidenced |
| Reporting/export/provenance | 9 | `src/reports/executive.ts`, professional deterministic tests | evidenced |
| Collaboration/RBAC/audit | 9 | `src/collaboration/workspace.ts`, RBAC/audit assertions | evidenced |
| Web UX/responsive/accessibility | 8 | `web/responsive-v2.css`, `scripts/test-professional-e2e.mjs`, `scripts/test-remote-web.mjs` | browser matrix still CI-dependent |
| MCP/agent developer experience | 9 | `manifest.json`, `scripts/smoke.mjs`, tool contract tests | evidenced |
| Security/privacy/secret isolation | 9 | `src/security/http.ts`, `src/security/url.ts`, `src/security/html.ts`, distribution/security tests | evidenced |
| Observability/diagnostics | 8 | `src/observability/local.ts`, remote Web contract | broader operational history remains external |
| Release engineering/rollback | 9 | `scripts/release-preflight.mjs`, `scripts/promote-professional-release.mjs`, release docs and RC tests | evidenced; publication intentionally blocked |

## External/time-dependent constraints

- licensed proprietary firehose scale;
- proprietary multi-year third-party archives;
- proprietary demographic panels;
- real-user adoption, retention and business outcomes;
- long-lived real-world forecast accuracy before enough forward observations accumulate;
- third-party live-source health outside deterministic CI.

## Current gate interpretation

The RC is ready only when local deterministic gates and the cross-platform GitHub Actions matrix are green. The scorecard does not authorize merge, tag, deployment, Registry publication or marketplace publication.
