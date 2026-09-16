---
name: trendhub
description: 全网热点趋势专家，以小红书热点与趋势为主打。当需要获取小红书热门笔记与话题词、各平台实时热榜、分析热点或关键词的趋势走势、发现跨平台共振话题、追踪新晋/飙升/掉榜、研判未来趋势信号、查询营销与节点日历、做话题深度分析，或基于真实热点产出小红书笔记、短视频脚本、微博、公众号、X 线程、直播脚本、营销方案、内容日历等创作简报时使用。
---

# TrendHub · 全网热点趋势专家（小红书主打）

本 Skill 背后是一个本地 MCP 服务（`trendhub-mcp`），提供 16 个工具。模型只负责理解需求、调用工具、解读结果与成文；**数据与确定性分析由工具提供，成稿由当前对话模型用自身算力完成**。插件不内置模型 Key、不做第三方遥测，也不把使用数据回传到 TrendHub 中央服务；为完成取数会向目标公开数据源发起必要网络请求。

## 何时使用

- 「小红书现在最火的笔记/话题词是什么」「拉小红书热门，给我选题和爆款样本」→ **`xhs_hot_topics`**（首选）；单平台榜单也可用 `get_trending`（平台 `xiaohongshu`）
- 「现在各平台在热什么」「拉一下微博/B站/抖音热榜」→ `get_trending` / `list_platforms`（默认查询以小红书打头）
- 「某话题是不是全网在爆、在几个平台同时上榜、小红书怎么聊」→ `cross_platform_overlap` / `analyze_topic`
- 「自动帮我发现现在多平台共振的话题」→ `discover_trending_topics`
- 「哪些话题新冒出来/飙升/掉榜了」→ `trend_change_alerts`（必要时先 `take_snapshot`）
- 「某关键词过去 N 月的搜索走势、相关飙升词」→ `keyword_trend_curve` / `related_queries`
- 「最近有哪些未来趋势信号/新方向」→ `future_signals`
- 「未来 N 天有哪些展会/财报季/大促/节假日节点」→ `upcoming_events`
- 「给某个话题做一份完整情报分析」→ `analyze_topic`
- 「基于热点写一篇小红书笔记/抖音脚本/营销方案」→ `list_templates` → `get_content_brief`

## 小红书能力口径（务必遵守）

- **游客零配置**：`xhs_hot_topics` 默认可取首页「热门推荐流」真实笔记（封面/标题/作者/点赞/链接）与标题派生词。这是平台推荐流，**不是官方热搜词榜**。
- **登录才有的能力**：官方热搜词榜、关键词爆款搜索、分品类推荐需要环境变量 `XHS_COOKIE`（含 `a1` 与 `web_session`）；未配置时工具显式返回 `missing` 与解锁指引，**不得编造热搜词或搜索结果**。
- 派生词分三类并逐条标注来源：`cross`（≥2 篇出现的跨篇热词）、`hashtag`（作者 #标签）、`author`（作者用空格标注的话题，单篇候选）；`df` 为出现该词的笔记数。跨篇热词稀疏时允许为空，不得硬凑。
- 点赞数 `hotText` 是平台展示近似值（如 `4.1万`/`10万+`），解析数值仅供排序，引用时保留原文口径。

## 标准工作流

1. **发现**：不确定平台名时先 `list_platforms` / `list_categories`。
2. **取证**：小红书选题先用 `xhs_hot_topics`；全网用 `get_trending`、`cross_platform_overlap`、`keyword_trend_curve`、`future_signals`、`upcoming_events` 取真实数据。
3. **分析**：综合话题用 `analyze_topic` 一次拿情报包（含小红书证据）；趋势变化用 `trend_change_alerts`。
4. **生产**：内容需求先 `list_templates` 选模板，再 `get_content_brief` 拿到证据卡、同平台真实爆款样本、逐段填充指引与 `productionPrompt`，据此产出成稿。

## 数据红线（必须遵守）

- 工具返回 `dataQuality: missing/degraded` 即代表该数据不可用，**不得用想象补齐、不得编造热度/数字/热搜词**；缺口向用户说明并给出解锁方式（如配置 `XHS_COOKIE`）。
- Google Trends 数值是 **0–100 相对热度，不是绝对搜索量**，解读时必须这样表述。
- 每条数据以工具返回的 `capturedAt` / `sourceUrl` 为准；跨平台聚类、派生词与规则情感是辅助信号，定性结论由模型结合证据给出并提示不确定性。
- 成稿中所有具体数字/案例必须来自工具证据，缺失处保留 `[待补充]`。

## AI 安装合同

如果当前 AI 具备终端/代码执行能力，并且用户只给出仓库链接，按以下顺序安装：

1. clone `https://github.com/Zachary-1012/Zachary-Skill.git`；
2. 进入 `Zachary-Skill/trendhub-mcp`；
3. 检查 `node --version`，要求 **Node >=22**，推荐 Node 24 LTS；
4. 执行 `node scripts/setup.mjs`；
5. 验证 `npm run smoke`，成功标志为 **`SMOKE OK tools=16`**；
6. 把 MCP stdio 配置指向 `node <trendhub-mcp绝对路径>/scripts/launcher.mjs`。

安装不需要 TrendHub 账号、模型 API Key 或中央服务。依赖使用已提交 `package-lock.json` + `npm ci`，不要在安装时自行删除/重建 lockfile。

## 本地服务与更新

- stdio 客户端：命令 `node`，参数 `<trendhub-mcp绝对路径>/scripts/launcher.mjs`。
- 本地 HTTP：`npm run start:http`，默认端点 `http://127.0.0.1:8333/mcp`。
- 可视化控制台：`npm run ui`，浏览器打开 `http://127.0.0.1:8333/`。
- 默认 loopback 无需额外 Token；任何非 loopback 监听都必须配置 `TRENTHUB_HTTP_TOKEN`，客户端使用 `Authorization: Bearer <token>`。
- 快速验证：`npm run smoke`；deterministic tests：`npm test`；外部信源健康：`npm run source:health`。旧命令 `npm run selftest` 仍兼容，但只是 source health 别名。
- `launcher.mjs` **只跟随 GitHub Stable Release，不追 main HEAD**；手动升级 `node scripts/upgrade.mjs`；`TRENTHUB_AUTOUPDATE=0` 可关闭自动更新。
- 各客户端配置见 `README.md` 与 `docs/setup-clients.md`。
