---
name: trendhub
description: 全网热点趋势专家。当需要获取各平台实时热榜、分析热点或关键词的趋势走势、发现跨平台共振话题、追踪新晋/飙升/掉榜、研判未来趋势信号、查询营销与节点日历、做话题深度分析，或基于真实热点产出短视频脚本、小红书笔记、微博、公众号、X 线程、直播脚本、营销方案、内容日历等创作简报时使用。
---

# TrendHub · 全网热点趋势专家

本 Skill 背后是一个本地 MCP 服务（`trendhub-mcp`），提供 15 个工具。模型只负责理解需求、调用工具、解读结果与成文；**数据与确定性分析由工具提供，成稿由当前对话模型用自身算力完成**。

## 何时使用

- 「现在各平台在热什么」「拉一下微博/B站/抖音/HN 热榜」→ `get_trending` / `list_platforms`
- 「某话题是不是全网在爆、在几个平台同时上榜」→ `cross_platform_overlap`
- 「自动帮我发现现在多平台共振的话题」→ `discover_trending_topics`
- 「哪些话题新冒出来/飙升/掉榜了」→ `trend_change_alerts`（必要时先 `take_snapshot`）
- 「某关键词过去 N 月的搜索走势、相关飙升词」→ `keyword_trend_curve` / `related_queries`
- 「最近有哪些未来趋势信号/新方向」→ `future_signals`
- 「未来 N 天有哪些展会/财报季/大促/节假日节点」→ `upcoming_events`
- 「给某个话题做一份完整情报分析」→ `analyze_topic`
- 「基于热点出一条抖音脚本/小红书/营销方案」→ `list_templates` → `get_content_brief`

## 标准工作流

1. **发现**：不确定平台名时先 `list_platforms` / `list_categories`。
2. **取证**：用 `get_trending`、`cross_platform_overlap`、`keyword_trend_curve`、`future_signals`、`upcoming_events` 取真实数据。
3. **分析**：综合话题用 `analyze_topic` 一次拿情报包；趋势变化用 `trend_change_alerts`。
4. **生产**：内容需求先 `list_templates` 选模板，再 `get_content_brief` 拿到证据卡、同平台真实爆款样本、逐格填充指引与 `productionPrompt`，据此产出成稿。

## 数据红线（必须遵守）

- 工具返回 `dataQuality: missing/degraded` 即代表该数据不可用，**不得用想象补齐、不得编造热度/数字**；缺口向用户说明。
- Google Trends 数值是 **0–100 相对热度，不是绝对搜索量**，解读时必须这样表述。
- 每条数据以工具返回的 `capturedAt` / `sourceUrl` 为准；跨平台聚类与规则情感是辅助信号，定性结论由模型结合证据给出并提示不确定性。
- 成稿中所有具体数字/案例必须来自工具证据，缺失处保留 `[待补充]`。

## 本地服务如何启动

- stdio 客户端：命令 `node`，参数 `<trendhub-mcp 绝对路径>/dist/src/index.js`。
- 需要 URL 的客户端：先 `npm run start:http`，端点 `http://127.0.0.1:8333/mcp`。
- 安装与各客户端配置见 `README.md` 与 `docs/setup-clients.md`；健康检查运行 `npm run selftest`。
