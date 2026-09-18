# TrendHub Professional Intelligence v2 — v1.5.2 Public Shell Hotfix

Status: **release-ready; pending verified deployment and Registry publication**.

v1.5.2 is a patch above the published v1.5.1 baseline. It corrects a public mobile navigation defect: navigation must open only from an explicit control and must not replace the page content. Published v1.5.1, v1.5.0, and v1.4.4 artifacts remain immutable rollback references.

## Release contract

- 21 MCP tools remain compatible.
- Agent-native MCP Resources, Skill 2.0, responsive Web Console, local-first Creator Ops, evidence boundaries, and release gates remain included.
- The public shell uses versioned HTML/CSS/JS assets and no-store response headers for mutable shell resources.
- The v1.5.1 and v1.5.0 tags/releases are not rewritten.
- v1.4.5 is explicitly forbidden.
- External constraints remain explicit: licensed firehose access, proprietary panels, and long-lived real-user outcomes require separate authorization or elapsed usage data.

## Rollback

If a later deployment fails health, MCP, or phone-layout verification, restore Railway to the last successful approved deployment. Do not rewrite published tags or releases.
