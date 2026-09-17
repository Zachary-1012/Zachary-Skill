# CODEX ONE-SHOT EXECUTION — TrendHub v1.5.0 Professional Intelligence

## Mission

Take the existing `dev/professional-intelligence-v2` Release Candidate to a **production-ready TrendHub v1.5.0 Release Candidate** in one engineering pass.

This task is implementation, not planning-only work. Audit the current branch first, preserve everything already correct, implement only real gaps, run the full repository gates, fix failures, and leave the same PR in a release-ready but **NOT PUBLISHED** state.

### Version rule

- Current production/stable: **v1.4.4**.
- Do **not** create or reserve v1.4.5.
- Next intended stable release: **v1.5.0**.
- Use semantic version spelling `1.5.0`, never `1.50`.
- The development branch may record `targetStableVersion: 1.5.0`, but must not tag, publish, deploy, merge, or mutate current production.

## Hard safety boundary

You are working on PR #27 / branch `dev/professional-intelligence-v2`.

DO NOT:

- merge the PR or modify `main`;
- create `v1.5.0` tag or GitHub Release;
- deploy or reconfigure Railway production;
- publish/update the Official MCP Registry, Glama, Cursor, Smithery, ChatGPT/Codex directory, or any marketplace;
- modify/delete the existing v1.4.4 release or tag;
- upload cookies/tokens/sessions to hosted public infrastructure;
- add bypasses for access controls, CAPTCHAs, paywalls, private APIs, or platform anti-abuse controls;
- claim planned/catalogued sources are live;
- fabricate licensed firehose data, proprietary historical data, audience demographics, user adoption, retention, or forecast accuracy.

At completion, v1.4.4 must still be the public stable version and production must still be healthy.

## Canonical current baseline — preserve, do not rebuild

The branch already contains and has passed CI for the following. Treat these as implemented baseline and improve only where evidence shows a real gap:

1. 21-tool development MCP contract: stable 19 + `professional_intelligence` + `workspace_manage`.
2. Indexed multi-year history using built-in `node:sqlite` with JSON compatibility fallback.
3. Robust median/MAD anomaly detection.
4. Damped-Holt 6h/24h/48h/72h directional forecasting with holdout validation, uncertainty and abstention.
5. Evidence-first Professional Intelligence aggregation.
6. Explicit source reliability, freshness, degraded/auth/rate-limit states.
7. Evidence-only creator/audience proxies with no sensitive demographic inference.
8. Media evidence contract with optional local multimodal/Transformers adapter boundary.
9. Evidence-bound alerts and executive reports (JSON/Markdown/CSV).
10. Local-first workspaces, owner/editor/analyst/viewer RBAC, watchlists, saved queries, alert rules and audit log.
11. Local OpenTelemetry-compatible zero-export observability.
12. Professional Web UI and read/query APIs; mutation routes remain private.
13. Desktop/tablet/mobile responsive layer with safe-area, touch targets and reduced-motion support.
14. Professional source universe separated from currently live `PLATFORMS`.
15. Zero-config-first source routing; auth requested only when a selected capability requires it.
16. Brand/company alias and parent-child entity resolution.
17. Existing release-candidate preflight/promotion/rollback scaffolding.
18. Current full CI baseline passes Node 22/24, Ubuntu/macOS/Windows bootstrap E2E, local Remote MCP/Web security smoke, Professional v2 deterministic tests and Professional HTTP E2E.

Do not rewrite these components merely for style. Prefer compatible incremental convergence.

# Product objective

TrendHub v1.5.0 must be an **agent-native, evidence-first trend + brand + media intelligence layer**, not a hot-list aggregator and not a low-cost clone of Brandwatch/Meltwater/Talkwalker.

Professional reference patterns to meet where engineering-controllable:

- Brandwatch: long-horizon evidence, rules/categories, entity segmentation, visual evidence, dashboards, alerts, reports and exports.
- Meltwater: one intelligence view across social/editorial/podcast/media signals; source-traceable AI; agent/MCP access; brand/competitive workflows.
- Talkwalker: smart spike detection, conversation clustering, spread/virality analysis, longitudinal comparison and trend prediction with evidence.
- Exploding Topics: early-signal discovery, clustering/meta-trends, channel breakdown, seasonality, volatility, historical trajectory and forecast validation.
- Google Trends: fresh search-intent signals, active/ended status, recent baseline comparison and multi-horizon views.
- Apple Podcasts: market/category chart context and momentum rather than pretending chart rank is listener count.

Do not copy proprietary code/UI/algorithms. Reproduce useful product principles using TrendHub's own architecture and public/authorized data.

# 1. Source Universe convergence

Keep the existing signal-family model and strengthen it. A source must always have:

`source id -> region -> signal family -> vertical -> access mode -> setup mode -> live/planned status -> reliability -> freshness -> evidence provenance`.

Never aggregate incomparable raw ranks/views/likes/search indexes into a universal raw score.

## 1.1 China P0/P1 coverage

Ensure the professional catalog covers and clearly classifies at minimum:

### Social / video / community
- 小红书
- 抖音
- 快手
- 微博
- Bilibili
- 知乎
- 微信视频号
- 微信公众号
- 今日头条
- 百度贴吧
- 豆瓣
- 虎扑
- 酷安
- 大众点评 where compliant public/approved data exists

### Podcast / audio
- 小宇宙
- 喜马拉雅
- 网易云音乐播客
- QQ音乐播客
- 荔枝

### Search / intent
- 百度热搜
- 百度指数
- 微信指数
- 百度资讯/新闻
- 搜狗 where a compliant public interface exists

### Mainstream / business / tech media
- 澎湃
- 财新
- 第一财经
- 界面新闻
- 晚点 LatePost
- 36氪
- 虎嗅
- 钛媒体
- IT之家
- 腾讯新闻
- 网易新闻
- 新浪新闻

### Fashion / luxury / beauty / marketing media
- VOGUE China
- ELLE China
- Harper's BAZAAR China / 时尚芭莎
- GQ China
- Marie Claire China / 嘉人
- Hypebeast 中文
- Jing Daily where applicable
- Luxe.CO / 华丽志
- LADYMAX
- SocialBeta
- 数英 Digitaling
- Morketing
- 广告门

Do not bypass paywalls. For subscription media, use public metadata/RSS/search/news evidence or mark as licensed connector.

## 1.2 Global / APAC P0/P1 coverage

### Social / video / community
- YouTube / Shorts
- TikTok
- Instagram / Reels
- Facebook
- Threads
- X
- Reddit
- LinkedIn
- Pinterest
- Snapchat
- Twitch
- Discord
- Telegram public channels
- Bluesky
- NAVER / Kakao / LINE where official/public/authorized access permits

### Podcast / audio
- Apple Podcasts
- Spotify Podcasts
- YouTube Podcasts/video podcasts
- Podcast Index as an open podcast-index option

### Search / web / news
- Google Trends + Trending Now
- Google News
- Bing Search/News
- GDELT
- Common Crawl for long-horizon web/domain evidence (never call it real-time)
- public RSS/Atom
- user-supplied brand/company owned domains, newsroom and investor-relations URLs

### Fashion / luxury / beauty media
- Vogue
- Vogue Business
- The Business of Fashion
- WWD
- Jing Daily
- Hypebeast
- Highsnobiety
- FashionNetwork
- Glossy

### Business / finance / technology / marketing media
- Reuters
- Bloomberg
- Financial Times
- Wall Street Journal
- CNBC
- Forbes
- Fortune
- Business Insider
- TechCrunch
- The Verge
- WIRED
- Ad Age
- Adweek
- Campaign
- WARC
- Marketing-Interactive

Again: paid/licensed sources are metadata/public-feed/authorized connector only.

## 1.3 Best-access decision matrix

Implement or verify the following UX/access rules:

### `zero-config`
Use official/public unauthenticated endpoints or already-permitted aggregation dependencies when stable and compliant. Examples where feasible: existing dailyhot-backed China hotlists, GDELT, public RSS/Atom, Google Trending Now export/RSS if supported, Bluesky public AppView GET, public brand newsroom feeds.

### `optional-local-session`
Baseline remains usable without credentials; a user-authorized local session enhances data. Xiaohongshu is the canonical example. Never upload the session to the hosted public service.

### `user-api-key`
Use official API credentials only when the source requires them. Examples may include YouTube Data API and Podcast Index. Store locally/secret-store only; never include in logs, diagnostics or reports.

### `user-oauth`
Use official OAuth for sources such as Meta/Instagram/Threads/LinkedIn/other owned-account analytics where applicable. Request only scopes required for the selected capability.

### `required-local-session`
Use only when the user explicitly selects a feature whose lawful public interface requires their authorized browser session, e.g. a Baidu/WeChat index surface if no public API exists. Never make it a prerequisite for the whole product.

### `licensed-connector`
Use for commercial firehoses, premium publisher full text, WGSN-like proprietary data, or platforms where public/commercial access is contract-gated.

### `adapter-planned`
Use when none of the above has a safe implementation. Planned sources remain visible in the Source Universe but never count as live coverage or negative evidence.

## 1.4 Open-source policy

Prefer mature OSS only when license, maintenance and deployment fit TrendHub.

Important: current RSSHub is AGPL-3.0. **Do not copy/vendor RSSHub route source into TrendHub.** Acceptable options are:

- use RSSHub as an explicitly external user-configured connector/service with clear attribution and isolation; or
- clean-room implement a minimal adapter against the original public source; or
- use the source's official RSS/API.

For Xiaoyuzhou, RSSHub can be studied for public-page shape, but no source copying. Same rule for any copyleft or non-commercial repository.

Prefer no new runtime dependency when a small audited native implementation is clearer. If a dependency is added, pin it, document its license in NOTICE, and keep public bootstrap portable.

# 2. Brand / company intelligence

Raise brand intelligence from seed alias matching to a complete evidence workflow.

## 2.1 Entity model

Support:

- legal entity / group / brand / sub-brand / product / campaign / executive / creator;
- parent-child relationships;
- CN/EN aliases, abbreviations, common misspellings and hashtags;
- user-defined aliases and exclusions;
- disambiguation evidence and confidence;
- no silent double counting between parent and child entities.

Seed packs should cover major verticals, but seed lists are never whitelists. Include representative high-priority brands/entities across luxury/fashion, beauty, sportswear, retail, FMCG, consumer electronics, internet, automotive/EV, hospitality, finance and entertainment. Existing LV/LVMH, Dior, Gucci, YSL, Chanel, Hermès, Cartier, Prada, Nike, adidas, lululemon, Xiaomi/Xiaomi Auto, Huawei, Apple, Tesla, BYD, NIO etc. must keep working.

## 2.2 Brand metrics

Add evidence-bound calculations where data allows:

- Share of Voice by signal family/source/market/time window;
- mention velocity and acceleration;
- source diversity and authority diversity;
- earned vs owned classification when determinable;
- competitor co-mention and association graph;
- campaign/topic association;
- message/theme association;
- creator concentration/spread;
- search-vs-social divergence;
- editorial/news confirmation lift;
- podcast/long-form persistence;
- risk/opportunity signal state;
- sentiment/stance only with sample count and limitations;
- confidence/evidence coverage/abstention.

Never infer sales, reach, demographics, purchase intent or market share from unavailable evidence.

# 3. Professional trend-analysis engine

Preserve current lifecycle/velocity/persistence/diffusion/reliability/anomaly/forecast architecture and deepen it.

A professional trend output must distinguish:

1. **Attention** — what is moving now.
2. **Intent** — search/query behavior.
3. **Discussion depth** — communities and long-form.
4. **Authority confirmation** — editorial/news/corporate evidence.
5. **Creator diffusion** — concentration vs distributed adoption.
6. **Commerce discovery** — product discovery signals where evidence exists.
7. **Persistence** — recurrence and duration.
8. **Geographic/market diffusion** — only where source metadata supports it.
9. **Novelty** — new topic vs recurring/seasonal topic.
10. **Uncertainty** — coverage, reliability, sample size and missing families.

## Required analysis upgrades

- Per-source normalization; never sum raw platform metrics across incompatible scales.
- Cross-signal-family confirmation score based on normalized evidence + reliability, not raw popularity.
- Seasonal/recurrence baseline where history is sufficient.
- Syndication/duplicate-news clustering so copied articles do not inflate authority.
- First-seen / first-confirmed / first-cross-family timestamps.
- Lead-lag matrix: search -> social, social -> news, creator -> search, podcast -> social etc., only when timestamps support it.
- Virality/spread graph using observed source/entity/co-mention transitions; do not fabricate user-to-user cascades where unavailable.
- Trend cluster / meta-trend layer with traceable topic membership and entity links.
- Volatility and stability metrics.
- Forecast calibration table based on accumulated holdout/backtest outcomes; abstain when sample/history is insufficient.
- Explanation object for every major score: inputs, transformation, missing data, reliability, confidence and evidence refs.
- `insufficient_evidence` must remain a first-class result.

# 4. Media / podcast / web-domain intelligence

## Media

Implement canonical article/mention deduplication, publisher/domain attribution, publication time, first-seen time, topic/entity association, authority/source diversity and evidence links.

Full-text extraction must respect public availability and robots/terms. Paywalled text is not bypassed.

## Podcast

Use chart/rank/feed metadata as what it actually is. Do not convert chart position into listener counts.

Support episode/show/topic persistence, market/category context, publishing cadence, entity mentions where transcript/public text evidence exists, and cross-signal lead/lag.

## Web/domain marketing

Add domain-level evidence using public RSS/news/GDELT/Common Crawl/owned domains as appropriate:

- owned vs earned domain classification;
- domain mention growth;
- source/domain diversity;
- brand/entity co-mentions;
- long-horizon evidence discovery;
- canonical URL and duplicate handling;
- user-added domain packs.

Common Crawl is historical/long-horizon and must not be described as real-time.

# 5. Reports, alerts and decision workflow

Move from analysis output to action-ready workflow without embedding an LLM dependency.

## Alerts

Support deterministic rules for:

- anomaly/spike;
- lifecycle transition;
- cross-family confirmation;
- source-health degradation;
- brand risk/opportunity;
- competitor gap/change;
- editorial authority lift;
- search/social divergence;
- forecast threshold when forecast quality passes gate.

Include dedupe, cooldown, evidence bundle and severity rationale.

## Executive reports

Ensure the report model contains:

- executive summary data object (caller AI may narrate later);
- what changed;
- why it matters (structured evidence, not invented prose);
- trend/brand metrics;
- source-family coverage;
- competitor context;
- evidence appendix;
- uncertainty/caveats;
- methodology/version;
- export JSON/Markdown/CSV;
- stable deterministic IDs so the caller can diff reports over time.

# 6. Web UX — desktop + mobile are one product

Do a code-level responsive audit and fix all real issues.

Required breakpoints/tests: 360, 390/393, 430/440, 768, 1024, 1280, 1440, 1920 widths.

No horizontal page overflow at phone widths except intentional table/chart scrollers.

Professional information architecture should expose, without duplicating pages unnecessarily:

- Overview
- Trends
- Brands / Entities
- Sources / Coverage
- Media / Podcast / Web
- Alerts
- Reports
- Workspace / Watchlists
- Settings / Source connections

Source connection UX must show each source as:

`Ready` / `Optional enhancement` / `API key required` / `OAuth required` / `Local session required` / `Licensed connector` / `Planned` / `Degraded`.

The default experience must immediately work with zero-config live sources. Do not show a wall of cookie/key requests on first launch.

For credential-requiring sources, explain the benefit before asking. Persist an approved local connection so users are not repeatedly prompted until expiry/disconnect.

Maintain:

- mobile safe-area and 100dvh;
- >=44px touch targets;
- keyboard/focus navigation;
- accessible labels;
- reduced-motion;
- loading/skeleton state;
- explicit empty/degraded/cached state;
- snapshot-first + live-refresh fallback;
- same evidence semantics on desktop and mobile.

If necessary, add Playwright **dev-only** responsive E2E tests if they do not alter runtime/bootstrap distribution. Test at least phone/tablet/desktop for overflow, navigation, professional page rendering, degraded/fallback states and critical source-connection UX. Keep browser-test installation isolated to CI/dev; do not burden end-user runtime if avoidable.

# 7. Security, privacy and compliance

Keep these non-negotiable:

- public hosted gateway exposes read/query only;
- mutating workspace/snapshot/observability routes remain private;
- cookies/sessions are local-only;
- secrets redacted from logs/errors/diagnostics;
- zero TrendHub telemetry by default;
- no sensitive demographic inference;
- no private-account collection;
- no CAPTCHA/access-control bypass;
- no paywall bypass;
- rate limiting/timeouts/body limits/concurrency guards preserved;
- SSRF-safe handling for user-supplied URLs/domain packs;
- prevent local-network/metadata endpoint access from remote URL fetch features;
- sanitize HTML/content before rendering;
- explicit source license/terms notes where applicable.

Add tests for any new URL connector, secret handling or HTML rendering path.

# 8. v1.5.0 release-candidate engineering

Prepare, but do not publish, the entire release chain.

## Metadata

Record v1.5.0 as the intended target in the RC manifest/runbook without mutating public stable metadata prematurely.

`release:promote -- 1.5.0` must be able to synchronize, in one deterministic operation when later authorized:

- package.json
- package-lock root version/license
- manifest.json
- root server.json
- root plugin.json
- any MCP/plugin metadata
- server/runtime version constants
- tool count / success markers
- README/DISTRIBUTION/release-facing docs that are machine-checked

The promotion command itself must remain metadata-only: no merge/tag/release/deploy/publish.

## Preflight

`npm run release:preflight` must fail on any mismatch among:

- target version;
- package/lock/manifest/server/plugin/runtime versions;
- public tool count;
- AI install success marker;
- MCP Registry metadata;
- remote health expectations;
- license reference;
- package LICENSE vs root LICENSE;
- release notes/migration/rollback presence.

Support a dry-run/simulation for `1.5.0` that proves the promotion result can satisfy preflight without publishing.

## Required release docs

Create/update:

- `docs/RELEASE_CANDIDATE.md`
- `docs/V1_5_0_RELEASE_NOTES.md`
- `docs/V1_5_0_MIGRATION.md`
- `docs/V1_5_0_ROLLBACK.md`
- `docs/V1_5_0_READINESS_SCORECARD.md`

Rollback must explicitly preserve immutable v1.4.4 tag/release and explain how production remains on/returns to v1.4.4 if a later v1.5.0 deployment fails before Registry promotion.

Registry publication must continue to wait for production `/health` to match both intended version and tool count before it can publish metadata.

# 9. Engineering scorecard — objective 9/10 target

The user wants all engineering-controllable dimensions at professional level. Do not fake a score. The readiness scorecard may mark a dimension >=9 only when linked evidence demonstrates the acceptance criteria.

Score these dimensions separately:

1. Source architecture & compliant access routing
2. Source reliability & graceful degradation
3. Historical evidence & storage
4. Trend analytics & explainability
5. Forecast/backtest/uncertainty discipline
6. Brand/entity intelligence
7. Media/podcast/web-domain intelligence
8. Alerts/action workflow
9. Reporting/export/provenance
10. Collaboration/RBAC/audit
11. Web UX/responsive/accessibility
12. MCP/agent developer experience
13. Security/privacy/secret isolation
14. Observability/diagnostics
15. Release engineering/rollback

Exclude these from the 9/10 engineering requirement and mark them explicitly external/time-dependent:

- licensed proprietary firehose scale;
- proprietary multi-year third-party archives not lawfully available;
- proprietary demographic panels;
- real-user adoption/retention/business-outcome evidence;
- real-world forecast accuracy before enough forward observations accumulate.

# 10. Test and validation requirements

Do not stop at compilation.

Before completion, run/fix until green:

1. `npm ci --no-audit --no-fund`
2. `npm run build`
3. `npm test`
4. `npm run smoke`
5. `npm run release:gate`
6. `npm run release:preflight` in RC-safe/dry-run mode as applicable
7. Professional deterministic tests
8. Professional HTTP E2E
9. snapshot scheduler tests
10. Web snapshot fallback tests
11. Remote Web/security tests
12. source-routing/access-mode tests
13. brand/entity disambiguation tests
14. report/alert/RBAC/audit tests
15. secret-redaction + SSRF/URL connector tests if applicable
16. responsive Web E2E at phone/tablet/desktop widths if browser E2E is introduced
17. Node 22 and Node 24 GitHub release-gate jobs
18. Ubuntu/macOS/Windows bootstrap E2E

Third-party source live-health is a separate diagnostic and must not make deterministic release CI flaky. Real network source tests must degrade honestly and produce artifacts/health states, not fabricated pass results.

# 11. Efficiency rules

- Audit before editing; do not repeat already-passing work.
- Prefer one coherent convergence commit series over dozens of cosmetic commits.
- Do not refactor unrelated code.
- No broad formatting churn.
- Reuse current abstractions.
- Keep runtime dependencies minimal and pinned.
- Make every live-source claim testable.
- If a requested source cannot be safely live, catalogue it with the correct access mode rather than hacking around platform controls.
- Missing/degraded is never zero.

# 12. Completion condition

The task is complete only when all of the following are true:

- v1.5.0 is documented as the next intended stable version; v1.4.5 is not used;
- current v1.4.4 production/main/release is untouched and healthy;
- source universe + source access UX covers the major CN/global/social/video/podcast/search/news/web/fashion/business/brand surfaces above without false live claims;
- Professional analysis includes normalized cross-family confirmation, novelty/seasonality, dedupe, lead-lag, meta-trends, volatility, explainability and abstention;
- brand/company intelligence has evidence-bound SOV/velocity/diversity/co-mention/campaign/competitor workflows where data supports them;
- media/podcast/web-domain analysis is production-grade and provenance-preserving;
- PC/tablet/mobile experience passes responsive E2E or equivalent high-confidence checks;
- security/secret/URL boundaries are tested;
- release promotion/preflight/rollback is deterministic for v1.5.0;
- all deterministic CI and cross-platform bootstrap jobs are green;
- PR #27 remains unmerged and no release/deployment/public registry action occurred;
- `docs/V1_5_0_READINESS_SCORECARD.md` maps every >=9 engineering score to concrete code/test evidence and lists all remaining external constraints honestly.

## Final Codex response

When done, report only evidence:

- final branch SHA;
- changed capability groups;
- live vs planned source counts by access mode and signal family;
- tool count;
- all test/CI run IDs and conclusions;
- release-preflight/dry-run result for v1.5.0;
- remaining blockers, if any;
- explicit confirmation: `main`, v1.4.4 Release, Railway production and MCP Registry were not changed.

If any gate is not green, do not claim READY. Fix it or report the exact blocker.