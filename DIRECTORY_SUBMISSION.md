# TrendHub Directory Submission Playbook

Verified release candidate baseline: TrendHub v1.6.0, 21 stable MCP tools, protocol-native MCP Resources, Unified Evidence Contract v1, 51 runtime source adapters, 129 catalogued sources.

Canonical URLs:

- Repository: https://github.com/Zachary-1012/Zachary-Skill
- Web Console: https://trendhub-remote-production.up.railway.app/
- Remote MCP: https://trendhub-remote-production.up.railway.app/mcp
- Health: https://trendhub-remote-production.up.railway.app/health
- Privacy: https://trendhub-remote-production.up.railway.app/privacy
- Terms: https://trendhub-remote-production.up.railway.app/terms
- MCP discovery: https://trendhub-remote-production.up.railway.app/.well-known/mcp.json
- Support: https://github.com/Zachary-1012/Zachary-Skill/issues

## Canonical listing copy

**Name**

TrendHub

**English short description**

Agent-native, evidence-first trend intelligence with 21 stable MCP tools, protocol-native Resources, Unified Evidence Contract v1, Professional Intelligence v2, 51 runtime source adapters, and a responsive Web Console.

**Chinese short description**

Agent 原生、证据优先的专业趋势情报平台，提供 21 个稳定 MCP 工具、协议原生 Resources、Unified Evidence Contract v1、Professional Intelligence v2、51 个运行时信源适配器与响应式 Web 控制台。

**English long description**

TrendHub is an agent-native, evidence-first trend intelligence layer for researching emerging topics, brands, companies, media narratives and cross-platform signals. v1.6 keeps the stable 21-tool compatibility facade and adds protocol-native MCP Resources, a canonical namespace, Unified Evidence Contract v1 and Skill 2.0. Its layered Source Universe spans social, video, search, news, podcast, web, technology and commerce evidence.

Professional Intelligence v2 provides lifecycle, velocity, persistence, diffusion, source reliability, anomaly detection, explainable 6/24/48/72h directional forecasting, brand/entity resolution, public creator/audience proxies, media evidence, alerts and executive reporting. TrendHub keeps missing, stale, unavailable, auth-required and rate-limited evidence explicit instead of silently fabricating values.

The hosted Remote MCP requires no TrendHub account and no model API key. It uses public/authorized source access and does not use a visitor's private Xiaohongshu cookie. Local installation is also available for local-first workflows.

**Chinese long description**

TrendHub 是面向 AI Agent 的 Evidence-first 趋势情报层，用于研究新兴趋势、品牌与公司实体、媒体议题以及跨平台信号。v1.6 保持 21 个稳定 Tool 的兼容面，同时正式提供协议原生 MCP Resources、canonical namespace、Unified Evidence Contract v1 与 Skill 2.0，并以统一 Source Universe 组织社交、视频、搜索、新闻、播客、Web、科技与商业等多类证据。

Professional Intelligence v2 提供趋势生命周期、速度、持续性、扩散、Source Reliability、鲁棒异常检测、可解释的 6/24/48/72 小时方向性预测、品牌/实体解析、公开创作者与受众代理信号、媒体证据、告警和高管报告。对于缺失、过期、不可用、需要授权或被限流的数据，TrendHub 会显式标记状态，不用虚构值填补。

公网 Remote MCP 不要求 TrendHub 账号，也不要求模型 API Key；仅使用公开或经授权的数据访问方式，并且不会使用访问者的私有小红书 Cookie。同时支持本地优先安装。

## OpenAI Plugins Directory (ChatGPT / Codex)

Submission type: **With MCP**

MCP server URL:

```text
https://trendhub-remote-production.up.railway.app/mcp
```

Website:

```text
https://trendhub-remote-production.up.railway.app/
```

Privacy URL:

```text
https://trendhub-remote-production.up.railway.app/privacy
```

Terms URL:

```text
https://trendhub-remote-production.up.railway.app/terms
```

Support URL:

```text
https://github.com/Zachary-1012/Zachary-Skill/issues
```

Suggested starter prompts:

1. Track emerging trends around a brand or topic across social, search, news, podcast and web evidence.
2. Compare two brands and explain where their attention, media and search signals diverge.
3. Explain why a topic is accelerating, with source reliability, evidence coverage and uncertainty.
4. Build an evidence-backed executive brief for a brand, company or market theme.

Suggested review test cases:

1. List the available TrendHub tools and verify that 21 tools are exposed.
2. Run `professional_intelligence` on a public topic and verify evidence-linked lifecycle, reliability and caveats.
3. Query a topic with insufficient history and verify that TrendHub abstains from unsupported forecasting rather than inventing a result.
4. Confirm that hosted access does not expose local-only workspace mutation or private-cookie behavior.

### OpenAI domain verification

The gateway supports:

```text
https://trendhub-remote-production.up.railway.app/.well-known/openai-apps-challenge
```

When the submission portal provides the challenge token, set the Railway environment variable:

```text
OPENAI_APPS_CHALLENGE_TOKEN=<exact token from OpenAI>
```

The endpoint returns that exact token as plain text with no caching. Do not commit the challenge token to GitHub. After verification, the environment variable can be removed unless the portal instructs otherwise.

## Cursor Marketplace

Repository URL:

```text
https://github.com/Zachary-1012/Zachary-Skill
```

Plugin name:

```text
trendhub
```

Use the canonical English short description above. The repository already contains root `plugin.json`, `mcp.json`, README installation instructions and the public Remote MCP endpoint.

Direct MCP install remains available even before Marketplace approval.

## Smithery

Display name:

```text
TrendHub
```

Remote MCP URL:

```text
https://trendhub-remote-production.up.railway.app/mcp
```

Repository:

```text
https://github.com/Zachary-1012/Zachary-Skill
```

Homepage:

```text
https://trendhub-remote-production.up.railway.app/
```

Use the canonical English short description above. TrendHub is a public Streamable HTTP MCP server and does not require a TrendHub account or a model API key.

## Claims that must not be used

Do not describe TrendHub as having proprietary firehose access, guaranteed continuous access to every catalogued source, proprietary demographic panels, guaranteed forecast accuracy, or user-adoption evidence that has not yet been collected.

Do not describe compatibility or submission readiness as marketplace publication. A directory becomes `PUBLISHED · SEARCHABLE` only after the listing is actually published and can be found publicly.
