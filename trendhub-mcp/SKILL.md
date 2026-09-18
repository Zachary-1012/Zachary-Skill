---
name: trendhub
description: 专业级全网趋势情报 Skill，以小红书为深度主打。用于实时热榜、Source Reliability、跨平台共振、新晋/飙升/掉榜、趋势生命周期/速度/持续性/扩散/置信度、Google Trends、未来信号、节点日历、24h/72h 提前发现 Benchmark、话题深度分析，以及基于真实证据产出脚本/文案/方案创作简报。
---

# TrendHub · 全网热点趋势专家 v1.5.2

本 Skill 背后是一个本地 MCP 服务（`trendhub-mcp`），提供 **21 个工具**，覆盖实时趋势、话题雷达、品牌市场与专业信源宇宙。模型负责理解需求、调用工具、解释证据与成文；**数据、稳定性指标和确定性趋势分析由工具提供**。插件不内置模型 Key、不做第三方遥测、不把使用数据回传到 TrendHub 中央服务。

## Creator Ops（本地运行与交付）

本地控制台的“运行与交付”面向不以代码为主要工作方式的 Creator：它用本机已观测的进程/内存/数据卷、真实 Source Health、版本来源、手工成本和脱敏反馈生成简报。未接入云账单、真实用户增长或外部可用性时必须明确写作“未确认”，不能填 0 或自动下结论。

- 启动：`npm run ui` → “运行与交付”；真实第三方源检查：`npm run source:health`。
- 所有操作仅本地保存，默认无遥测；不会读取 Cookie/Key，也不会自动重启、部署、回滚或删除。
- 公网 Remote 只显示公共 `/health`，不开放 `/api/ops/*` 或任何 Ops 写入。
- 可选开源扩展见 `docs/creator-auto-ops.md`；外部收集器、账单或告警系统必须由用户显式配置和审计。

## 何时使用

- 小红书热门笔记/话题词/选题 → `xhs_hot_topics`
- 多平台当前热榜 → `get_trending` / `list_platforms`
- 某话题是否跨平台共振 → `cross_platform_overlap`
- 自动发现多平台共振话题、词组与平台标签 → `discover_trending_topics`（可传 `topic` 筛选）
- 新晋/飙升/掉榜 → `trend_change_alerts`（必要时先 `take_snapshot`）
- **数据源是否稳定、最近可用率/延迟/限流/schema drift** → `source_reliability`
- 搜索走势和相关飙升词 → `keyword_trend_curve` / `related_queries`
- 未来趋势信号 → `future_signals`
- 未来展会/财报/大促/节假日节点 → `upcoming_events`
- 综合话题情报 → `analyze_topic`
- **趋势处于 emerging / accelerating / mainstream / saturating / declining 哪一阶段** → `trend_intelligence`
- **验证 TrendHub 是否比一个外部事实节点提前 24h/72h 发现趋势** → `benchmark_trend_lead`
- 基于真实热点写小红书/短视频/营销方案 → `list_templates` → `get_content_brief`

## 话题优先工作流

话题是品牌市场、广告传播、内容营销和行业研究的统一入口，不只等于一个关键词。输入可以是品牌、Campaign、产品、受众议题、行业主题或平台原生标签（如 `#标签`）。

- 先用 `get_trending` / `xhs_hot_topics` 获取各平台当前证据与原生标签；平台没有公开标签字段时，只标记为标题/描述派生词，不冒充官方标签。
- 用 `discover_trending_topics` 自动发现跨平台主题簇；需要聚焦品牌、Campaign 或行业话题时传 `topic`。
- 用 `cross_platform_overlap` 验证话题传播面，再用 `keyword_trend_curve` 看搜索时间序列，用 `related_queries` 扩展语义簇。
- 用 `future_signals`、`upcoming_events` 和 `analyze_topic` 将当前话题连接到行业、商业、文化、政策和传播动作；每个主题都要保留来源、时间、命中平台、证据和不确定性。

## Source Reliability 口径

`source_reliability` 只记录本地操作性元数据：时间、`ok/degraded/missing`、延迟、条数与粗粒度失败类别。它不记录查询词、Cookie、内容正文、hostname、IP、账号信息或模型 prompt。

当前状态包括：`UP / DEGRADED / DOWN / AUTH_REQUIRED / RATE_LIMITED / UNKNOWN`。24h/7d/30d 分别提供 ok rate、usable rate、P50/P95 latency；7d reliability score 的透明权重为 `okRate 55% + usableRate 25% + averageQuality 20%`。

**CI PASS 不等于第三方平台此刻全部在线。** Live source health 与 release gate 必须分开解释。

## Trend Intelligence 口径

`trend_intelligence` 基于本地历史证据计算：

- lifecycle；
- rank velocity；
- persistence；
- cross-platform diffusion；
- source reliability；
- history sufficiency；
- deterministic confidence。

这些是**规则指标，不是预测概率**。历史不足必须返回 `insufficient_history`，不得硬判阶段。完整公式见 `docs/intelligence-methodology.md`。

## 24h / 72h Benchmark 红线

`benchmark_trend_lead` 的 `reference_time` 必须来自外部 ground truth，例如官方公告时间、主流爆发时间或团队提前约定的基准时间。

- `leadHours > 0`：TrendHub 本地历史更早发现；
- `>=24`：至少提前24小时；
- `>=72`：至少提前72小时；
- 无历史证据：`insufficient_evidence`。

**不得在看到 TrendHub 结果后反向挑选一个有利的 reference_time，也不得由模型虚构基准时间。**

## 小红书能力口径

- **游客零配置**：`xhs_hot_topics` 可取首页「热门推荐流」真实笔记（封面/标题/作者/点赞/链接）与标题派生词；这是推荐流，**不是官方热搜词榜**。
- **登录增强**：官方热搜词榜、关键词爆款搜索需要本地环境变量 `XHS_COOKIE`（含 `a1` 与 `web_session`）；未配置或失效时显式 `missing/AUTH_REQUIRED`，不得编造。
- 点赞 `hotText` 为平台展示近似值；解析数值仅供同平台排序。

## 标准工作流

1. **发现**：`list_platforms` / `list_categories`。
2. **取证**：小红书优先 `xhs_hot_topics`；全网使用 `get_trending`、Google Trends、future signals、events。
3. **质量确认**：重要结论先看 `source_reliability`；将 DOWN/AUTH_REQUIRED/RATE_LIMITED 与业务结论分开。
4. **趋势分析**：`trend_change_alerts` + `trend_intelligence`；必要时先积累多次快照。
5. **评测**：已有外部 ground truth 时使用 `benchmark_trend_lead`。
6. **生产**：`list_templates` → `get_content_brief` → 由当前模型基于证据完成成稿。

## 数据红线

- `missing/degraded` 代表不可完整使用，**不得想象补齐、不得编造热度/数字/热搜词**。
- Google Trends 是 0–100 相对热度，不是绝对搜索量。
- 跨平台 hot 值口径不同，不能作为绝对值横向相加比较。
- 生命周期、confidence、sentiment、topic cluster 都是确定性辅助信号，必须保留方法和不确定性。
- 成稿中的具体数字/案例必须来自工具证据，缺失处保留待补充或明确说明。

## AI 安装合同

如果 AI 具备终端执行能力，用户只给仓库链接时：

1. 如缺 Git，先从可信系统源/官方源安装 Git；
2. clone `https://github.com/Zachary-1012/Zachary-Skill.git`；
3. 进入 `Zachary-Skill/trendhub-mcp`；
4. macOS/Linux 执行 `bash scripts/bootstrap.sh`；Windows 执行 `powershell -ExecutionPolicy Bypass -File .\\scripts\\bootstrap.ps1`；
5. bootstrap 会复用 Node >=22，否则自动下载并 SHA-256 校验 Node 24 LTS 便携运行时；
6. 成功必须出现 **`SMOKE OK tools=21`** 和 `AI_BOOTSTRAP_OK {...}`；
7. MCP 配置优先使用 `AI_BOOTSTRAP_OK` 返回的绝对 `node` 与 `launcher` 路径。

无需注册/登录、无需模型 API Key、无需 TrendHub 中央服务。

## 本地服务、更新与质量诊断

- stdio：`<NODE_COMMAND> <LAUNCHER>`；Node-free 用户使用 bootstrap 返回绝对路径。
- HTTP：默认 `127.0.0.1:8333/mcp`；任何非 loopback 监听必须配置 `TRENTHUB_HTTP_TOKEN`。
- 本地控制台：`npm run ui`。
- **定时趋势历史（v1.4.2）**：托管 Remote MCP 已按小时自动快照并写入持久化卷（状态见 `/health` 的 `snapshotScheduler`）；本地可用 cron（macOS/Linux）或任务计划程序（Windows）周期运行 `node dist/scripts/snapshot.js`，见 `docs/scheduled-snapshots.md`。
- deterministic tests：`npm test`。
- MCP smoke：`npm run smoke`。
- live source health：`npm run source:health`。
- **主动匿名化质量诊断**：`npm run quality:diagnostic`；只写本地 JSON，零自动上传。
- 更新：`launcher.mjs` 只跟随 GitHub Stable Release，不追 `main`；手动升级 `node scripts/upgrade.mjs`。
