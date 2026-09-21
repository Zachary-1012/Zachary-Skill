# Zachary-Skill · 公司 AI 技能库

全员可用的 **AI Skill / MCP 插件仓库**。当前主技能 **TrendHub 2.0** 是证据驱动的 AI 内容创作平台：从 51 个运行时信源与 129 个专业分层信源形成简报，进入持久创作项目，调用使用者当前 AI 或本地开放模型生成可编辑成稿，再完成审核、排期与复盘。它保留 Professional Intelligence v3、Unified Evidence Contract、明确 Truth State 与 **21 个稳定 MCP 工具**，并新增 MCP Apps 内容工作台；趋势研究现在是创作输入，而不是产品终点。

每个技能与具体大模型解耦：MCP Apps 中使用当前宿主 AI，本地工作台保留 DeepSeek、智谱和使用者控制的 OpenAI-compatible/Ollama 可选通道；**优先复用许可明确、可商用、任务适配的开放权重模型，模型凭据只驻留本地进程，不发送到 TrendHub 公网服务。**

> 本仓库**公开分发**：拿到仓库链接即可 clone 安装，无需审批、注册、登录或中央服务器。原仓库的写权限仅属于 `@Zachary-1012` 与其明确邀请的 Collaborators；公开用户不会因为仓库可见而获得 upstream 写权限。治理规则见 [`GOVERNANCE.md`](./GOVERNANCE.md)。

> **许可边界（v1.4.3+）**：个人和公司/组织可免费使用未修改的 TrendHub，包括内部商业运营；允许安装、备份和内部部署所需的合理副本。**禁止修改、派生、再发布、再分发、转售、转授权或向第三方托管提供 TrendHub 软件本身。** 使用 TrendHub 产生的报告/分析/内容不受该软件分发限制，但仍须遵守第三方数据或内容权利。完整条款见 [`LICENSE`](./LICENSE)。v1.4.2 及更早版本保留其发布时已经授予的 MIT 权利，不能追溯收回。

## 最快使用：直接连接公开 Remote MCP

不想安装本地运行环境时，支持 Streamable HTTP 的 MCP 客户端可直接连接：

```text
https://trendhub-remote-production.up.railway.app/mcp
```

通用 MCP 配置：

```json
{
  "mcpServers": {
    "trendhub": {
      "type": "streamable-http",
      "url": "https://trendhub-remote-production.up.railway.app/mcp"
    }
  }
}
```

公开 Remote MCP **无需注册或登录本服务**，也不要求模型 API Key；它与本地版共用同一套 21-tool 能力合同。生产协议监控会用官方 MCP SDK 验证 `initialize`、`tools/list=21` 与动态 Source Universe；v1.6 Registry 发布前还会真实验证 `resources/list`、Resource Templates，并读取 Namespace、Evidence Contract 与 Skill 2.0 资源。

Cursor 可直接使用 MCP 安装入口：

[**Add TrendHub MCP to Cursor**](https://cursor.com/en/install-mcp?name=trendhub&config=eyJ1cmwiOiJodHRwczovL3RyZW5kaHViLXJlbW90ZS1wcm9kdWN0aW9uLnVwLnJhaWx3YXkuYXBwL21jcCJ9)

Cursor 原生 deeplink：

```text
cursor://anysphere.cursor-deeplink/mcp/install?name=trendhub&config=eyJ1cmwiOiJodHRwczovL3RyZW5kaHViLXJlbW90ZS1wcm9kdWN0aW9uLnVwLnJhaWx3YXkuYXBwL21jcCJ9
```

如果客户端不接受 deeplink，直接使用仓库根目录 `mcp.json` 或上面的通用 Streamable HTTP 配置即可。

### 浏览器里直接研究

不写配置、只想用浏览器研究时，打开托管的响应式网页即可。首页只有一个搜索框，以及最近研究、正在关注和趋势发现；输入品牌、公司、商业体、产品或话题后，直接得到当前结论、趋势变化、平台表现、可回溯证据、机会风险和可执行建议。结果会渐进呈现，先给已采集到的信号，慢源在后台补齐，不会长时间空白。

```text
https://trendhub-remote-production.up.railway.app/
```

实时健康状态见 `https://trendhub-remote-production.up.railway.app/health`；变更类接口（如 `/api/snapshot`）不对外暴露。

## 已上架 / 可搜索渠道

以下状态按 **2026-09-20 的实际核验结果**记录；“兼容 / 可提交 / 可直连”不会写成“已上架”。完整分发规则见 [`DISTRIBUTION.md`](./DISTRIBUTION.md)。

| 渠道 | 当前状态 | 入口 |
| --- | --- | --- |
| GitHub | **LIVE · 直接可用** | [`Zachary-1012/Zachary-Skill`](https://github.com/Zachary-1012/Zachary-Skill) |
| Official MCP Registry | **PUBLISHED · SEARCHABLE · Stable** | [`io.github.Zachary-1012/trendhub`](https://registry.modelcontextprotocol.io/?q=trendhub) |
| Glama MCP Directory | **PUBLISHED · SEARCHABLE** | [TrendHub on Glama](https://glama.ai/mcp/connectors/io.github.Zachary-1012/trendhub) |
| Agent Plugins | **READY · DIRECT INSTALL** | 根目录 `plugin.json` + `mcp.json` |
| Cursor | **NOT LISTED · DIRECT MCP READY** | 上方 MCP 安装入口可直接安装；公共 Cursor Marketplace 上架仍需仓库提交与人工审核 |
| Smithery | **NOT LISTED · URL PUBLISH READY** | 公开 Streamable HTTP `/mcp` 已满足 URL 发布前置；正式上架需 Smithery 发布者登录及 namespace |
| OpenAI Plugins Directory（ChatGPT / Codex） | **READY TO SUBMIT** | `/mcp`、`/privacy`、`/terms` 已就绪；域名验证路由 `/.well-known/openai-apps-challenge` 已预置，通过 `OPENAI_APPS_CHALLENGE_TOKEN` 注入门户给出的单次 Token；下一步通过 [官方 Submission Portal](https://platform.openai.com/apps) 创建 `With MCP` 提交 |

**对外口径：目前可以明确写“已上架并可搜索”的目录是 Official MCP Registry 与 Glama；OpenAI Plugins Directory 当前为 `READY TO SUBMIT`，尚未提交、审核或发布。** Cursor、Smithery 仍需各自提交与审核，只有真实发布并可搜索后才升级为 `PUBLISHED · SEARCHABLE`。

## 给 AI 的安装合同

把本仓库链接交给可以执行终端命令的 AI / Coding Agent，它应按固定流程安装，不需要用户自己准备 Node.js：

1. 检查 `git`。如机器未安装 Git，AI 先通过操作系统可信软件源或 Git 官方方式补齐。
2. clone 并进入 `trendhub-mcp`。
3. 执行对应平台的 **Node-free bootstrap**：已有 Node >=22 时复用；没有 Node 或版本过低时，从 `nodejs.org` 获取 Node 24 LTS 便携版，使用官方 `SHASUMS256.txt` 校验 SHA-256 后放入用户缓存目录，不要求管理员权限，也不替换系统 Node。
4. bootstrap 自动继续 `setup.mjs -> npm ci -> build -> smoke`。
5. 成功后输出 `AI_BOOTSTRAP_OK { ... }`。AI 必须读取其中的 `node` 与 `launcher` **绝对路径**写入 MCP 配置。

```bash
git clone https://github.com/Zachary-1012/Zachary-Skill.git
cd Zachary-Skill/trendhub-mcp

# macOS / Linux
bash scripts/bootstrap.sh

# 已有 Node >=22 也可直接运行
node scripts/setup.mjs
npm run smoke                  # 成功标志：SMOKE OK tools=21
```

Windows PowerShell：

```powershell
git clone https://github.com/Zachary-1012/Zachary-Skill.git
cd Zachary-Skill\trendhub-mcp
powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap.ps1
```

机器可读安装结果：

```text
AI_BOOTSTRAP_OK {"node":"/absolute/path/to/node","launcher":"/absolute/path/to/trendhub-mcp/scripts/launcher.mjs"}
```

只有在确认系统 Node 已全局可用时，才可以简写：

```text
command: node
args: <trendhub-mcp绝对路径>/scripts/launcher.mjs
```

机器可读的同一安装合同位于 [`trendhub-mcp/manifest.json`](./trendhub-mcp/manifest.json) 的 `aiInstall` 字段。

## TrendHub 2.0 能力

| 能力层 | 当前能力 |
| --- | --- |
| 实时发现 | 51 个运行时平台/趋势信源；小红书热门推荐流为深度主打，并新增公开 RSS、GDELT、Apple Podcasts 与 Bluesky 证据适配器 |
| 小红书增强 | 游客热门推荐；本地 `XHS_COOKIE` 可解锁官方热搜词榜与关键词爆款搜索 |
| 跨平台 | 共振、自动聚类、新晋/飙升/掉榜、历史快照 |
| **定时趋势历史（v1.4.2）** | 托管 Remote MCP 默认每小时自动快照并持久化有界历史；本地支持 cron / Windows 任务计划程序，见 [`docs/scheduled-snapshots.md`](./trendhub-mcp/docs/scheduled-snapshots.md) |
| **Source Reliability** | UP / DEGRADED / DOWN / AUTH_REQUIRED / RATE_LIMITED；24h/7d/30d ok/usable rate；P50/P95 延迟；连续失败；schema drift |
| **Trend Intelligence Engine** | `emerging → accelerating → mainstream → saturating → declining`；速度、持续性、扩散、可靠度、历史充分度、置信度 |
| 搜索趋势 | Google Trends 相对热度曲线、相关词 top/rising |
| 未来信号 | 科技/AI/商业/营销 RSS 信源 + 趋势节点日历 |
| **真实场景 Benchmark** | 用外部 ground-truth 时间计算是否提前 24h / 72h 发现趋势；支持批量 benchmark cases |
| 深度分析 | 共振 + 走势 + 相关词 + 信号 + 节点 + 规则情感 |
| **内容工作台 · v2.0** | 宣纸质感项目工作区 + 使用者当前 AI / 本地开放模型 + 可编辑成稿 + 审核阶段 + 发布计划 + 复盘；MCP Apps UI 绑定 `get_content_brief` |
| 质量诊断 | `npm run quality:diagnostic` 生成本地匿名化诊断；默认零遥测、零自动上传 |
| **Entity-first Intelligence · v1.7** | 品牌/公司/商业体/产品/Campaign → 主动 Query Evidence Acquisition → Professional Intelligence v3；热榜只作为次级“是否形成全网热点”信号 |
| **任务优先研究台 · v1.7.3** | 首页四区（搜索 / 最近研究 / 正在关注 / 趋势发现）+ 研究页八区（当前结论 / 趋势变化 / 关键驱动 / 平台表现 / 证据 / 机会与风险 / 建议 / 操作）；后端统一给结论、前端只负责呈现，结果渐进返回；不使用 KPI 墙 / 卡片墙骨架，原始 Feed/新闻只作为可回溯证据 |
| **Agent-native Foundation · v1.6+** | MCP Resources + `trendhub.* / trendhub://` namespace + Unified Evidence Contract v1 + Skill 2.0；Tool 保持 21 个兼容名称 |

完整的 21-tool 契约见 [`trendhub-mcp/manifest.json`](./trendhub-mcp/manifest.json)。指标公式和生命周期规则见 [`trendhub-mcp/docs/intelligence-methodology.md`](./trendhub-mcp/docs/intelligence-methodology.md)。

## 研究路由：品牌 ≠ 热榜关键词

TrendHub v1.7 的 canonical routing：

- 品牌 / 公司 / 商业体 / 产品 / Campaign / business subject → `professional_intelligence`
- 话题 / 热点 / 议题 / meme / event topic → `analyze_topic`
- “现在热什么 / 榜单排名” → `get_trending`
- 只看纵向生命周期 → `trend_intelligence`

**未进入热榜只能说明“本次热榜未命中”，不能说明品牌/商业主体没有讨论。** Professional Intelligence v3 会主动查询 Google News（中/全球）、GDELT、Bluesky、Apple Podcasts、小红书可用证据、curated RSS、Google Trends 等主体证据，再与热榜和历史信号交叉判断。

## Source Reliability 与真实世界状态

TrendHub 明确区分：

- **CI / Release Gate**：证明代码、安装、MCP 工具合同可复现；
- **Source Health**：证明第三方信源在某次真实联网观测中的当前可用状态。

因此：**CI PASS ≠ 51 个第三方平台此刻全部在线。** 平台登录要求、限流、风控、网络异常或页面结构变化会被如实标记，而不是伪造成成功。RSS、GDELT 和 Apple Podcasts 的结果保留各自的证据口径，不冒充社媒热度排名。

```bash
npm run source:health
```

GitHub Source Health **每 6 小时**运行一次，并恢复上一轮非敏感 `reliability/history/snapshots` 状态，使 24h/7d/30d 稳定性和 24h/72h 趋势历史能够连续积累。每轮会产生机器可读 JSON artifact，保留 30 天；它仍然与 Stable Release gate 分离。

## Trend Intelligence 与 Benchmark

`trend_intelligence` 基于本地真实历史证据计算：

- 生命周期；
- rank velocity；
- persistence；
- cross-platform diffusion；
- source reliability；
- history sufficiency；
- deterministic confidence。

这些是**可解释的规则指标，不是预测概率**。历史不足时返回 `insufficient_history`。

`benchmark_trend_lead` 必须由使用者提供一个外部可验证的 `reference_time`，例如官方公告时间、主流爆发时间或团队事先约定的基准时间。TrendHub 只计算自己的最早证据比该时间早/晚多少小时，不会自己编造 ground truth。

公司内部可批量运行真实案例：

```bash
npm run benchmark:lead -- --file /path/to/benchmark-cases.json
```

批量结果包含 evidence coverage、before-reference rate、24h-ahead rate、72h-ahead rate、平均 lead hours 与逐案例证据；报告仅保存在本地 `data/benchmarks/`，不自动上传。

## 零遥测质量评估

正常使用不发送 TrendHub telemetry。需要排障或内部评估时，可主动执行：

```bash
npm run quality:diagnostic
```

报告只保留版本、Node 主版本、OS family、Source Reliability 汇总、历史深度等操作性信息；不包含 hostname、username、绝对路径、Cookie、查询词、内容正文、IP 或账号标识；**不会自动上传，只有使用者主动选择时才分享。**

## 更新与发布

TrendHub 不跟随 `main` HEAD 自动更新。`scripts/launcher.mjs` 只检查 **GitHub Stable Release**：

1. 当前已验证版本先启动；
2. 后台发现更高正式 `vX.Y.Z` Release 才更新；
3. 本地 tracked 文件有修改时跳过；
4. 安装/构建失败时尽力回滚；
5. `TRENTHUB_AUTOUPDATE=0` 可关闭自动检查。

正式 Release 必须通过 Node 22/24 的 locked install + build + deterministic tests + MCP smoke；随后再跑 Public Install E2E。Release 同时产出 npm `.tgz` 与 `SHA256SUMS.txt`。

## 安全与治理

- HTTP 默认绑定 `127.0.0.1`；任何非 loopback 监听都必须配置 `TRENTHUB_HTTP_TOKEN`，并用 Bearer Token 访问 `/mcp` 与 `/api/*`。
- 仓库不应包含任何模型 Key、Cookie、Token 或内部资料；`XHS_COOKIE` 可放在使用者本机环境变量，也可从本地设置页临时注入进程内存，均不得进入公网服务、项目数据、日志或诊断。
- `main` 受保护：必须 PR、Node 22/24 required checks、up-to-date、禁止 force push、禁止删除、无 bypass。
- upstream 原仓库只允许 owner 与 owner 邀请的 Collaborators 修改；公开用户只有读取/clone/使用 upstream 的权限。
- 软件从 **TrendHub v1.4.3** 起按 **TrendHub Free Use License 1.0** 分发：个人与公司可免费使用未修改版本，但不得修改、制作派生版本、再发布或再分发软件本身；第三方依赖/代码仍按各自许可证执行。v1.4.2 及以前已经授予的 MIT 权利不追溯撤销。

详细规则：[`GOVERNANCE.md`](./GOVERNANCE.md) · [`CONTRIBUTING.md`](./CONTRIBUTING.md) · [`SECURITY.md`](./SECURITY.md) · [`CHANGELOG.md`](./CHANGELOG.md) · [`DISTRIBUTION.md`](./DISTRIBUTION.md)
