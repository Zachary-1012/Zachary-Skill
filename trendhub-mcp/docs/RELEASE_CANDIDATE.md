# TrendHub v1.6.2 — Web Truth Alignment Hotfix

Status: **release-ready; pending required PR checks, merge, stable release, production deployment verification and Registry publication**.

v1.6.2 is a presentation-truth patch above immutable v1.6.1.

## Hotfix scope

- Dashboard now queries `/api/professional/sources?priority=P2`, the complete 129-source universe, instead of displaying a P1 subset as the full universe.
- Remove stale `DEV` badges from stable Professional Intelligence and Professional Source Universe views.
- Preserve v1.6.1 runtime adapter fixes: route-only dailyhot embedding and TrendHub-owned Douyin adapter.
- Preserve 21 tools, 51 runtime adapters, 129 layered sources, MCP Resources, Namespace v1, Unified Evidence Contract v1 and Skill 2.0.

## Acceptance

1. Node 22/24 release gates pass.
2. Windows/macOS/Linux bootstrap E2E pass.
3. Web Truth Contract verifies P2 full-universe routing and no stale DEV badges.
4. Public Install E2E succeeds.
5. Railway production reports v1.6.2 and the public dashboard displays 129 professional sources.
6. Douyin public query remains OK or explicit degraded/missing, never parser failure.
7. Official MCP Registry publishes v1.6.2 after production Remote MCP verification.

## Rollback

v1.6.1 remains the immediate immutable rollback release.
