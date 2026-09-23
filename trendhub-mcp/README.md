# TrendHub 2.0 · Evidence-backed AI Content Studio

> **本地优先、Evidence-first、BYO-AI 的内容创作 Skill / MCP 插件。** TrendHub 2.0 把 51 个运行时信源与 129 个专业分层信源转成持久创作项目、证据简报、可编辑制品、审核阶段、发布准备和评估，同时保留 **21 个稳定 MCP 工具**、Professional Intelligence v3、MCP Resources 与 Unified Evidence Contract v1。
>
> MCP Apps 页面可把完整创作任务交给使用者当前 AI；本地 Web 工作台可连接使用者控制的开放模型端点并将结果直接回填编辑器。优先可商用开放权重模型，令牌只保存在当前页面内存。**默认零第三方遥测、无 TrendHub 中央数据回传。**
>
> **v2.0.4 开源模型标题复核**：TrendHub 自托管 MIT 许可的中文优先模型，网页与 Skill/MCP 使用者无需注册或提供密钥，可按需比较公开标题与主题的语义相似度；英文和跨语言结果须人工复核。模型调用不按次收费，托管资源仍有成本。见 [开源模型接入说明](docs/open-model-review.md)。
>
> **v2.0.1 商业主体证据**：公开报道中的广告主、品牌、Campaign、代理商及媒体平台以待核实线索呈现，附原始来源并衔接内容创作；新闻与播客保留为支撑证据，不冒充社媒热榜。
>
> **v2.0.0 Content Studio**：默认首页升级为宣纸质感的内容工作台，采用克制暖中性色与枫叶红动作色；支持项目、简报、成稿、审核、排期、发布链接和复盘状态。`get_content_brief` 绑定 MCP Apps UI，宿主 AI 与本地 OpenAI-compatible 模型均经过真实交互验收。
>
> **v1.7.3 Review Quality & Performance**：研究先返回快速 Decision View，再补齐完整证据；慢源有明确超时边界，交互路径不再等待整套 RSS；缺失不显示为 0/+0% 预测；关键驱动去来源/英文碎词噪声；近期节点按主体/行业/地区相关性筛选。用户界面与 21-tool / Evidence 合同不变。\n>\n> **v1.7.2 Task-first Decision View**：网页重做为任务优先研究台，首页只保留“搜索 / 最近研究 / 正在关注 / 趋势发现”，研究页直接给“当前结论 / 趋势变化 / 关键驱动 / 平台表现 / 证据 / 机会与风险 / 建议 / 操作”；后端 Decision ViewModel 统一生成结论、前端只负责呈现，结果渐进返回、不长时间空转，桌面与手机共用同一阅读对齐轴；趋势数据缺失时显式标注、不显示为 0。21 个工具、51 个运行时信源（129 个分层信源）、Entity-first、Evidence Contract、Skill 2.0 与公网只读安全边界保持不变。\n>\n> **v1.7.1 Semantic Experience Correction**：主研究面改为 Subject Field → Change Axis → Interpretation Strata → Evidence Trace → Action Return；退役 KPI/卡片墙和固定后台侧栏，统一内容对齐轴并修复 Professional 深链初始化竞态。后端 Entity-first / Evidence / 21-tool 合同不变。\n>\n> **v1.7.0 Entity-first Intelligence Workspace**：品牌/公司/商业体/产品/Campaign 先主动检索主体证据，再进入 Professional Intelligence v3；Web 默认先给状态、变化、驱动、机会、风险、缺口与行动，原始新闻/Feed 只作为 Evidence。\n>\n> **v1.6.1 Runtime Adapter Hotfix**：dailyhot 聚合改为 route-only 动态加载，不再加载上游 Web 静态壳；抖音改由 TrendHub 自有公开适配器处理临时 Cookie，缺失/限流保持显式 Evidence State。\n>\n> **v1.6.0 Agent-native Foundation**：保持 21 个 Tool 名称和参数兼容，正式发布 `trendhub://namespace`、`trendhub://contracts/evidence`、`trendhub://capabilities`、`trendhub://sources`、`trendhub://skill/trendhub` 等 Resources，并提供平台历史、能力详情和信源访问合同 Resource Templates。`missing != 0`、`RELEASED != OPERATING`，采集适配器不拥有 canonical truth。\n>\n> **v1.5.2 Public Shell Hotfix + Creator Ops**：在本地“运行与交付”能力基础上，修复公网手机端导航占满页面的问题；手机默认显示紧凑顶部栏，导航仅在主动打开后以抽屉呈现。HTML/CSS/JS 使用版本化资源和 no-store 缓存策略；不上传遥测、不读取密钥、不自动重启或发布。公网 Remote 不暴露 `/api/ops/*`。安装使用仍**无需审批、注册、登录或中央服务器**。

---

## 1. 能力地图

| 能力层 | 能力 | 主要工具 |
| --- | --- | --- |
| 小红书主打 | 游客热门推荐笔记流 + 标题话题词；登录态解锁官方热搜词榜/关键词爆款搜索 | `xhs_hot_topics`、`get_trending` |
| 当下热点 | 51 个运行时平台/趋势信源，按平台/分类查询 | `get_trending`、`list_platforms`、`list_categories` |
| 共振与变化 | 跨平台共振、自动聚类、新晋/飙升/掉榜、历史快照 | `cross_platform_overlap`、`discover_trending_topics`、`trend_change_alerts`、`take_snapshot` |
| **Source Reliability** | UP/DEGRADED/DOWN/AUTH_REQUIRED/RATE_LIMITED；24h/7d/30d 可用率；P50/P95；连续失败；schema drift | `source_reliability` |
| 搜索走势 | Google Trends 0–100 相对热度、top/rising 相关词 | `keyword_trend_curve`、`related_queries` |
| 未来趋势 | 科技/AI/商业/营销信源 | `future_signals` |
| 节点趋势 | 展会/财报/大促/政策/节假日 | `upcoming_events` |
| 深度情报 | 小红书证据 + 共振 + 走势 + 相关词 + 信号 + 节点 + 规则情感 | `analyze_topic` |
| **Trend Intelligence Engine** | 生命周期、rank velocity、persistence、diffusion、source reliability、history sufficiency、confidence | `trend_intelligence` |
| **Lead-time Benchmark** | 与外部 ground truth 对比，验证是否提前 24h/72h 发现 | `benchmark_trend_lead` |
| 内容生产 | 10 套专家模板 + 基于真实证据/爆款样本的 Brief | `list_templates`、`get_template`、`get_content_brief` |
| **Creator Ops** | 本地运行状态、信源健康、版本来源、手工成本、脱敏反馈、交付简报 | 本地控制台“运行与交付” |\n| **Agent-native Resources · v1.6** | Namespace、Evidence Contract、Capability Registry、Skill 2.0、平台历史/信源/能力资源模板 | `trendhub://*` |

### 21 个 MCP 工具

`list_platforms` · `list_categories` · `get_trending` · **`xhs_hot_topics`** · `cross_platform_overlap` · `discover_trending_topics` · `trend_change_alerts` · `take_snapshot` · **`source_reliability`** · `keyword_trend_curve` · `related_queries` · `future_signals` · `upcoming_events` · `analyze_topic` · **`trend_intelligence`** · **`benchmark_trend_lead`** · `list_templates` · `get_template` · `get_content_brief` · **`professional_intelligence`** · **`workspace_manage`**

### 平台覆盖（51，小红书置顶）

- **主打 · 小红书**：`xiaohongshu`（热门推荐笔记，游客可用）、`xiaohongshu-hotlist`（官方热搜词榜，需登录 Cookie）
- **国内社交/视频/新闻**：微博、知乎、百度、贴吧、虎扑、B站、抖音、快手、今日头条、澎湃、腾讯新闻、网易新闻、新浪新闻
- **科技/开发者**：36氪、IT之家、虎嗅、少数派、爱范儿、掘金、CSDN、51CTO、V2EX、HelloGitHub、酷安、微信读书、历史上的今天
- **国际**：Hacker News、GitHub Trending（日/周/月）、Product Hunt、Reddit（technology / programming / MachineLearning / worldnews / marketing）

> “51 个运行时平台/趋势信源”代表当前代码确实可以调用的范围，不代表 51 个源都拥有同等抓取深度。小红书是当前深度主打；RSS/GDELT/Apple Podcasts 是编辑部、全球新闻或公共目录证据，不代表社媒热度排名；其他平台依各自公开数据能力返回，并通过 Source Reliability 量化真实稳定性。

---

## 2. 专业级趋势情报方法

### Source Reliability

每次最终平台请求只记录本地操作性元数据：

- timestamp；
- `ok / degraded / missing`；
- latency；
- item count；
- coarse failure class：`auth_required / rate_limited / schema_drift / network / upstream / other`。

**不记录**查询词、Cookie、内容正文、hostname、username、IP、账号标识或模型 prompt。

24h / 7d / 30d 窗口输出：

- `okRate`；
- `usableRate`；
- average quality；
- P50 / P95 latency。

7d reliability score：

```text
100 × (0.55 × okRate + 0.25 × usableRate + 0.20 × averageQuality)
```

当前状态：`UP / DEGRADED / DOWN / AUTH_REQUIRED / RATE_LIMITED / UNKNOWN`。

### Trend Intelligence Engine v1

本地有界历史保留 **30 天 / 每平台最多 1500 次快照**。引擎基于真实历史计算：

- **Lifecycle**：`insufficient_history → emerging → accelerating → mainstream → saturating → declining`
- **Velocity**：rank improvement / hour + spread velocity
- **Persistence**：话题在历史快照中的持续出现比例
- **Diffusion**：当前跨平台覆盖比例
- **Source Reliability**：相关数据源历史稳定度
- **History Sufficiency**：历史证据充分度
- **Confidence**：基于证据覆盖、持续性、扩散、可靠度和历史深度的确定性评分

`confidence` **不是预测概率**；历史不足必须返回 `insufficient_history`。

### 24h / 72h Lead-time Benchmark

`benchmark_trend_lead` 需要用户提供外部、可验证的 `reference_time`，例如：

- 官方公告时间；
- 主流媒体/平台明确爆发时点；
- 团队在实验开始前约定的 benchmark 时间。

TrendHub 只比较自己的最早历史证据：

```text
leadHours = reference_time - earliest_TrendHub_detection
```

正值 = TrendHub 更早；`>=24` = 至少提前24小时；`>=72` = 至少提前72小时。**禁止看到结果后再倒推一个有利 reference_time。**

完整公式：[docs/intelligence-methodology.md](./docs/intelligence-methodology.md)

---

## 3. 小红书能力矩阵

| 能力 | 游客模式 | 登录模式（本地 `XHS_COOKIE`） |
| --- | --- | --- |
| 首页热门推荐笔记流（封面/标题/作者/点赞/链接） | ✅ | ✅ |
| 标题话题词派生 | ✅ | ✅ |
| 官方热搜词榜 | ❌ 显式 `missing/AUTH_REQUIRED` | ✅ |
| 关键词爆款笔记搜索 | ❌ | ✅ |
| 分品类推荐流 | 游客能力有限 | 随账号权限 |

游客热门流是平台首页推荐流，**不是官方热搜词榜**。`hotText` 保留平台展示近似值（如 `4.1万`），解析值只用于同平台内排序。

Cookie 可放在使用者本机环境变量，也可在本地设置页中临时填写；设置页只把它注入当前 Node.js 进程内存。禁止提交仓库、写入项目/诊断/日志、发送给公网托管端或粘贴到公开聊天。

---

## 4. 快速开始：AI 自动安装

用户不需要预装 Node.js。把仓库链接交给能执行终端命令的 AI / Coding Agent即可。

### macOS / Linux

```bash
git clone https://github.com/Zachary-1012/Zachary-Skill.git
cd Zachary-Skill/trendhub-mcp
bash scripts/bootstrap.sh
```

### Windows PowerShell

```powershell
git clone https://github.com/Zachary-1012/Zachary-Skill.git
cd Zachary-Skill\trendhub-mcp
powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap.ps1
```

bootstrap：

1. 复用现有 Node >=22；
2. 否则从 `nodejs.org` 下载 Node 24 LTS 便携版；
3. 用官方 `SHASUMS256.txt` 做 SHA-256 校验；
4. `npm ci -> build -> smoke`；
5. 输出持久化 MCP 路径。

完整成功标志：

```text
SMOKE OK tools=21
AI_BOOTSTRAP_OK {"node":"/absolute/path/to/node","launcher":"/absolute/path/to/trendhub-mcp/scripts/launcher.mjs"}
```

MCP 配置优先使用 `AI_BOOTSTRAP_OK` 返回的绝对路径。

已有 Node >=22 也可以：

```bash
node scripts/setup.mjs
npm run smoke
```

网络源：`--cn` 使用 npmmirror，`--global` 使用 npm 官方 registry。

详细安装：[docs/access.md](./docs/access.md) · 客户端接入：[docs/setup-clients.md](./docs/setup-clients.md)

---

## 5. 三种运行方式

| 方式 | 启动 | 场景 |
| --- | --- | --- |
| stdio（默认） | `npm start` | 本地 MCP 客户端 |
| HTTP MCP | `npm run start:http` | 需要 MCP URL 的客户端 |
| 本地控制台 | `npm run ui` | `http://127.0.0.1:8333/` |
| 公开托管 Remote MCP（零安装） | 直接连 `https://trendhub-remote-production.up.railway.app/mcp` | 不想本地安装、客户端支持 Streamable HTTP |
| 托管 Web Console | 浏览器打开 `https://trendhub-remote-production.up.railway.app/` | 人工浏览查看与只读查询 |

通用 stdio：

```json
{
  "mcpServers": {
    "trendhub": {
      "command": "<AI_BOOTSTRAP_OK.node>",
      "args": ["<AI_BOOTSTRAP_OK.launcher>"]
    }
  }
}
```

HTTP 默认：`http://127.0.0.1:8333/mcp`。

### HTTP 安全边界

默认 loopback 无需 Token。任何非 loopback 监听必须配置：

```text
TRENTHUB_HOST=<非loopback地址或0.0.0.0>
TRENTHUB_HTTP_TOKEN=<足够长的随机Token>
```

远程 `/mcp` 与 `/api/*` 必须带：

```http
Authorization: Bearer <TRENTHUB_HTTP_TOKEN>
```

不要通过关闭鉴权绕过；即使启用 Token，也优先局域网/Tailscale 等私有网络，不直接暴露 8333 到公网。

### 定时趋势快照（v1.4.2）

趋势生命周期与 24h/72h lead benchmark 依赖持续积累的有界历史。公开托管 Remote MCP 已启用服务端调度器（默认每小时一次、写入持久化卷，状态见 `/health` 的 `snapshotScheduler` 字段）；本地可通过 cron（macOS/Linux）或任务计划程序（Windows）周期运行 `node dist/scripts/snapshot.js`。完整说明见 [`docs/scheduled-snapshots.md`](./docs/scheduled-snapshots.md)。

---

## 6. 验证、Source Health 与质量评估

```bash
npm test                   # deterministic offline tests；release gate
npm run smoke              # MCP 握手；必须 SMOKE OK tools=21
npm run source:health      # 真实第三方信源状态；不阻塞 release gate
npm run quality:diagnostic # 用户主动、本地匿名化诊断；零自动上传
```

### 为什么 Source Health 不阻塞 Release

代码正确与第三方平台可用性是两个不同事实：

- **Release Gate** 证明安装、编译、数据合同、MCP 工具和安全边界；
- **Source Health** 证明外部平台在某次真实联网观测时的状态。

因此 **CI PASS ≠ 51 个平台此刻全部在线**。登录要求、限流、风控、网络或 schema drift 会被 Source Reliability 如实记录，而不是伪造成成功。

GitHub 定时 Source Health 会保存 30 天机器可读 JSON artifact。

### Usage Quality Evaluation

`npm run quality:diagnostic` 只在用户主动执行时生成本地 JSON；不自动上传。明确排除：

`hostname / username / absolute paths / cookies / query text / content bodies / IP / account identifiers`

---

## 7. 发布、更新与供应链

`launcher.mjs` 只跟随 **GitHub Stable Release**：

1. 当前已验证版本立即启动；
2. 后台发现更高正式 `vX.Y.Z` 才更新；
3. 不追 `main` HEAD；
4. tracked 本地修改时跳过；
5. 安装/构建失败时尽力回滚；
6. `TRENTHUB_AUTOUPDATE=0` 可关闭。

正式 Release 必须通过：

- PR 到受保护的 `main`；
- Node 22.x / 24.x：locked install + build + deterministic tests + `SMOKE OK tools=21`；
- Windows / macOS / Linux Node-free bootstrap E2E；
- merge 后 main CI；
- Stable Release 重新跑 release gate；
- Public Install E2E 从公开 URL fresh clone → Stable tag → Node-free bootstrap → 19-tool smoke。

Release 产出 `.tgz` + `SHA256SUMS.txt`。

手动升级：

```bash
node scripts/upgrade.mjs
```

---

## 8. 数据口径与红线

- `missing/degraded` 必须原样传达，**禁止填 0、估算或编造**。
- Google Trends 是 **0–100 相对热度**，不是绝对搜索量。
- 各平台 `hot` 口径不同，只允许同平台内比较，不能直接跨平台相加。
- Source Reliability 是操作性质量，不是未来可用性保证。
- Lifecycle / confidence / sentiment / clustering 都是可解释的规则信号，不是事实本身，也不是预测概率。
- Benchmark reference time 必须来自外部 ground truth。
- 节点日历若为预计信息，需用 `sourceUrl` 对应官方信息复核。
- 仅处理公开可访问数据与用户主动配置的本地会话信息；遵守目标平台条款、频率边界和适用法律。

---

## 9. 已知限制

- 小红书官方热搜/关键词搜索需要有效登录 Cookie；失效时显式 `AUTH_REQUIRED/missing`。
- Web/API/反爬策略可能变化；Source Reliability 会记录实际退化，但无法保证第三方永久稳定。
- 网络、地区、IP、登录态和访问频率会影响取数。
- `trend_change_alerts` 至少需要两次快照；`trend_intelligence` 需要更多历史才能摆脱 `insufficient_history`。
- 30 天有界历史意味着长期年度趋势应结合 Google Trends 等外部时间序列，而不是把本地快照当无限历史数据库。
- 当前 Google Trends 主要承担搜索趋势验证，不把 Google Trending Now 当作“实时全网热榜”主源。

---

## 10. 示例用法

- 「用 TrendHub 拉小红书当前热门推荐，并解释哪些词是派生词、哪些是官方热搜。」
- 「先查 Source Reliability，再看微博/B站/抖音/小红书现在的热点。」
- 「AI眼镜现在处于 emerging、accelerating 还是 mainstream？给我 evidence、velocity、persistence、diffusion、confidence。」
- 「用 Google Trends 和跨平台 evidence 验证这个趋势判断。」
- 「我把官方发布时点给你，用 benchmark_trend_lead 算 TrendHub 是否提前24/72小时发现。」
- 「未来90天有哪些科技展会/大促节点，结合 future signals 做选题。」
- 「基于真实小红书爆款样本和趋势证据，生成一份小红书创作 Brief。」

---

## 11. 维护配置

- 未来信源：`data/future-sources.json` 或 `TRENTHUB_RSS_SOURCES`
- 节点：`data/events.json`
- 数据目录：`TRENTHUB_DATA_DIR`
- HTTP：`TRENTHUB_TRANSPORT / TRENTHUB_PORT / TRENTHUB_HOST / TRENTHUB_HTTP_TOKEN`
- 运行：`TRENTHUB_CACHE_TTL / TRENTHUB_TIMEOUT_MS / TRENTHUB_RETRIES`
- 小红书增强：`XHS_COOKIE`
- 自动更新：`TRENTHUB_AUTOUPDATE=0`

运行期本地目录 `data/snapshots / history / reliability / health / diagnostics` 均被 `.gitignore` 排除。

## 12. 目录结构

```text
trendhub-mcp/
├─ src/
│  ├─ sources/            # 国内外数据源、小红书、Google Trends/RSS
│  ├─ store/              # snapshot + bounded history + source reliability
│  ├─ analysis/           # 共振、情感、话题、Trend Intelligence、内容 Brief
│  ├─ security/           # HTTP 网络边界与 Bearer auth
│  ├─ web/                # HTTP API / 静态托管
│  ├─ tools/              # 19 MCP tools
│  ├─ server.ts
│  └─ index.ts
├─ web/                   # 本地控制台前端
├─ data/                  # events / future-sources / templates（运行期目录忽略）
├─ docs/
│  ├─ access.md
│  ├─ setup-clients.md
│  └─ intelligence-methodology.md
├─ scripts/
│  ├─ bootstrap.sh / bootstrap.ps1
│  ├─ setup.mjs / launcher.mjs / upgrade.mjs
│  ├─ smoke.mjs / test.mjs / test-intelligence.mjs
│  ├─ selftest.ts
│  └─ quality-diagnostic.mjs
├─ package-lock.json
├─ manifest.json
├─ NOTICE / LICENSE
└─ package.json
```

## 13. 开源、治理与 upstream 权限

TrendHub 当前按 **MIT License** 分发。依赖与第三方代码归因见 [NOTICE](./NOTICE)。

原 upstream `Zachary-1012/Zachary-Skill` 的写权限由 GitHub 控制：仅 owner 与明确邀请的 Collaborators 可以改原仓库；`main` 必须 PR + Node22/24 required checks，禁止 force push/deletion，无 bypass。

MIT 同时允许别人对**自己的副本**进行使用、修改、fork 和再分发。若未来产品策略要求“法律上只允许使用、禁止修改/再分发”，需要单独变更许可证，不能只靠 GitHub 分支保护实现。

仓库级治理：[`../GOVERNANCE.md`](../GOVERNANCE.md) · [`../CONTRIBUTING.md`](../CONTRIBUTING.md) · [`../SECURITY.md`](../SECURITY.md) · [`../CHANGELOG.md`](../CHANGELOG.md)
