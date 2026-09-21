# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

TrendHub 2.0 serves Chinese-speaking creators, brand teams, marketers, and independent operators who need to turn current public trend evidence into content they can plan, draft, verify, schedule, and review without learning TrendHub's internal architecture.

## Product Purpose

TrendHub 2.0 is a local-first content creation platform. It connects trend discovery and subject research to an evidence-backed creation brief, a persistent content project, an editable draft, source inspection, publishing preparation, and performance review. Success means a user can move from a topic to a usable, source-aware content asset and return later to continue the work.

## Positioning

TrendHub begins with verifiable multi-source trend evidence rather than a blank editor or a generic prompt. The same backend Decision View and Evidence Contract support research, creation briefs, source inspection, and later review while the ordinary interface exposes only tasks, content, results, and actions.

## Operating Context

Users work in a persistent desktop or mobile web workspace. They discover an emerging topic or research a subject, create a project for a target channel, generate a brief from current evidence, write or paste the draft, save sources, choose a status and schedule, export the work, and optionally record real post-publication metrics. Public-hosted use stores private projects in the browser; local installations may use local runtime capabilities. TrendHub does not publish to third-party platforms on the user's behalf in this release.

## Capabilities and Constraints

- Preserve the stable 21-tool MCP compatibility facade, Unified Evidence Contract, explicit truth states, Entity-first research, and backend-owned Decision View.
- Reuse `/api/review`, `/api/clusters`, `/api/changes`, `/api/templates`, `/api/template`, and `/api/brief` as the evidence and creation foundation.
- Content projects, drafts, schedules, and manually entered performance data remain local to the browser in the public product. Missing platform metrics remain missing, never zero.
- No private platform cookie is accepted by the hosted service. Optional Xiaohongshu session enhancement remains local-only.
- No automatic third-party publishing, account analytics, fabricated reach, generated engagement, or invented trend conclusion.
- The product version for this major product change is 2.0.0; the Skill contract remains TrendHub Skill 2.0 and the MCP tool count remains 21.

## Brand Commitments

Keep the TrendHub name, Chinese-first product language, evidence-first honesty, and quiet professional tone. The visual world is rice-paper rather than generic SaaS white: warm restrained neutrals, subtle fibre-like texture, dark ink typography, and one maple-leaf red accent for primary actions and active state. The supplied creator-platform recording is binding for hierarchy and work continuity, not for brand colors, wording, logos, proprietary content, or copied information architecture.

## AI and Model Policy

- The Skill page must be an operating surface: users create a brief, invoke their current host AI, edit the returned artifact, review evidence, and keep project state. It must never stop at a list of workflow steps or a prompt to copy elsewhere.
- In a ChatGPT/MCP Apps host, use the host bridge and the user's current AI. In a local installation, support a user-controlled OpenAI-compatible endpoint such as Ollama without sending credentials to TrendHub.
- Prefer the strongest task-appropriate commercially usable open-weight model that the user's runtime can actually serve. License, language, context, hardware fit, structured-output reliability, and observed quality all participate in routing; model names are versioned policy data rather than permanent truth.
- Reuse permissively licensed models before developing a missing model capability. Self-developed assets should be scoped adapters, retrieval, evaluation, prompts, or fine-tunes with explicit provenance and promotion gates.
- Generation is replaceable and never becomes factual evidence. Every factual claim must resolve to supplied or retrieved evidence, otherwise remain marked as unknown or pending verification.

## Evidence on Hand

- Existing TrendHub v1.7.4 production product and 21-tool MCP implementation.
- Existing content templates and evidence-backed `/api/brief` response.
- Existing Research, Discover, Watch, Evidence Drawer, progressive quick/full research, and responsive Web runtime.
- Supplied 138-second creator-platform recording showing persistent global shell, grouped navigation, page-local tabs and filters, dense primary content, detail drawers, export, and next actions.
- No connected publishing accounts, real creator-account analytics, or third-party billing data are available; the interface must not fabricate them.

## Product Principles

1. Trends are an input to creation, not the final product surface.
2. Every project preserves its subject, objective, channel, evidence, draft, status, and next action.
3. Show useful content first, then supporting detail and provenance on demand.
4. Local-first privacy is a product capability, not an implementation footnote.
5. A visible metric or status must come from observed or user-entered data.

## Accessibility & Inclusion

Support keyboard navigation, visible focus, reduced motion, Chinese typography, desktop and mobile layouts, status text that does not depend on color alone, and recovery paths for empty, loading, degraded, and failed states.
