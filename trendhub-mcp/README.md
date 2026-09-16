# TrendHub · 全网热点趋势专家（MCP 插件）

> 一个**本地优先、任何支持 MCP 的 AI 都能调用**的热点趋势 Skill / MCP 插件，**以小红书热点与趋势为主打**。聚合国内外 **38 个平台**实时热榜（小红书置顶、默认查询首位）、小红书热门笔记流与话题词派生、Google Trends 关键词走势、高质量未来趋势信源与年度节点日历，内置跨平台共振、新晋/飙升/掉榜、话题深度情报，以及脚本/文案/方案的专家创作简报；另附一个本地可视化控制台。
>
> **Bring Your Own AI**：插件负责取数、确定性分析与创作脚手架；分析成文和文案成稿由**你正在使用的 AI**（ChatGPT / Claude / 豆包 / DeepSeek / Gemini / Cursor…）使用自身算力完成。TrendHub 不内置模型 API Key、不做第三方遥测，也不把使用数据回传到 TrendHub 中央服务。实时取数仍会向目标公开数据源发起必要网络请求。

---

## 1. 它能做什么

| 趋势类型 | 能力 | 对应工具 |
| --- | --- | --- |
| **小红书主打** | 首页热门推荐笔记流（真实封面/作者/点赞/链接，游客零配置可用）+ 标题话题词派生；登录后解锁官方热搜词榜与关键词爆款搜索 | `xhs_hot_topics`、`get_trending` |
| **当下热点** | 38 个平台实时热榜，按平台/分类查询（默认查询以小红书打头） | `get_trending`、`list_platforms`、`list_categories` |
| **热点趋势（共振/变化）** | 一个话题在几个平台同时爆、自动发现共振话题、新晋/飙升/掉榜 | `cross_platform_overlap`、`discover_trending_topics`、`trend_change_alerts` |
| **关键词趋势走势** | Google Trends 0–100 相对热度曲线（多词对比）、相关词 top/rising | `keyword_trend_curve`、`related_queries` |
| **未来趋势** | 高质量科技/AI/商业/营销信源最新文章，供趋势研判 | `future_signals` |
| **节点趋势** | 未来 N 天展会/财报季/大促/政策/节假日日历，含预热等级 | `upcoming_events` |
| **深度分析** | 一键话题情报包：小红书证据 + 共振 + 走势 + 动量 + 相关词 + 信号 + 节点 + 情感 | `analyze_topic` |
| **内容生产** | 10 套专家模板（含小红书笔记）+ 基于真实证据与同平台爆款样本的创作简报 | `list_templates`、`get_template`、`get_content_brief` |

### 16 个工具

`list_platforms` · `list_categories` · `get_trending` · **`xhs_hot_topics`** · `cross_platform_overlap` · `discover_trending_topics` · `trend_change_alerts` · `take_snapshot` · `keyword_trend_curve` · `related_queries` · `future_signals` · `upcoming_events` · `analyze_topic` · `list_templates` · `get_template` · `get_content_brief`

### 平台覆盖（38，小红书置顶）

- **主打 · 小红书**：`xiaohongshu`（热门推荐笔记，游客可用，默认/置顶）、`xiaohongshu-hotlist`（官方热搜词榜，需登录 Cookie）
- **国内社交/视频/新闻**：微博、知乎、百度、贴吧、虎扑、B站、抖音、快手、今日头条、澎湃、腾讯新闻、网易新闻、新浪新闻
- **科技/开发者**：36氪、IT之家、虎嗅、少数派、爱范儿、掘金、CSDN、51CTO、V2EX、HelloGitHub、酷安、微信读书、历史上的今天
- **国际**：Hacker News、GitHub Trending（日/周/月）、Product Hunt、Reddit（technology / programming / MachineLearning / worldnews / marketing）

### 小红书能力矩阵

| 能力 | 游客模式（零配置） | 登录模式（配置 `XHS_COOKIE`） |
| --- | --- | --- |
| 首页热门推荐笔记流（封面/标题/作者/点赞/链接） | ✅ 真实数据 | ✅ |
| 标题话题词派生（跨篇热词 / #标签 / 作者话题） | ✅ | ✅ |
| 官方热搜词榜 | ❌ 显式 `missing` 并引导 | ✅ |
| 关键词爆款笔记搜索（按热度排序） | ❌ 无权限时显式缺失 | ✅ |
| 分品类推荐流 | ❌ 游客仅开放首页推荐 | ✅（随账号权限） |

> 游客拿不到的能力显式标记 `missing/degraded` 并说明解锁条件，**不得编造热搜词、笔记或互动数据**。

### 10 套专家内容模板

短视频分镜脚本、小红书笔记、微博、公众号长文、X(Twitter) 线程、直播脚本、营销方案、内容日历、新品发布、标题钩子库。

---

## 2. 它是什么 / 不是什么

- ✅ **本地 Skill / MCP**：运行在使用者自己的机器上，通过标准 MCP 被 AI 客户端发现和调用。
- ✅ **模型解耦**：使用哪个 AI，就由哪个 AI 负责理解、判断和成文；TrendHub 不保存模型 Key。
- ✅ **无第三方遥测、无 TrendHub 中央数据回传**：不做使用统计/埋点，也没有中央 TrendHub 服务接收用户数据。
- ✅ **公开仓库即分发**：拿到仓库链接即可 clone 安装，无需审批或中央账号。
- ✅ **附带本地可视化控制台**：`npm run ui` 一键启动，可直接看热榜、小红书专区、共振、曲线并复制素材给 AI。
- ✅ **Evidence-first**：缺失数据显式 `missing/degraded`，不静默填 0，不把算法猜测冒充事实。
- ❌ **不是中央公网 SaaS**：默认仅绑定 `127.0.0.1`；跨设备时需要显式 Token，并建议限定在局域网/Tailscale 等私有网络。
- ❌ **“无中央回传”不等于“无任何出站网络”**：取数访问目标平台，安装访问 npm registry/npmmirror，更新访问 GitHub Stable Release。

---

## 3. 快速开始

### 前置

- **Node.js >=22**，推荐 **Node 24 LTS**。
- Git（推荐长期安装方式；Download ZIP 可临时安装，但无法自动切换 release tag）。

### AI 自动安装合同

如果把仓库链接交给具备终端执行能力的 AI / Coding Agent，固定执行：

```bash
git clone https://github.com/Zachary-1012/Zachary-Skill.git
cd Zachary-Skill/trendhub-mcp
node --version                 # 必须 >=22
node scripts/setup.mjs
npm run smoke                  # 期待：SMOKE OK tools=16
```

成功后 MCP stdio 入口：

```text
command: node
args: <trendhub-mcp绝对路径>/scripts/launcher.mjs
```

机器可读版本见 `manifest.json -> aiInstall`。

### 安装实现

`setup.mjs` 使用已经提交的 `package-lock.json` 与 **`npm ci`**，不会在用户机器上重新求解依赖，然后执行 build 与不联网的 MCP smoke。

可选网络源：

```bash
node scripts/setup.mjs --cn       # npmmirror
node scripts/setup.mjs --global   # registry.npmjs.org
```

### 三种运行方式

| 方式 | 启动 | 适用 |
| --- | --- | --- |
| **stdio（默认，推荐）** | `npm start` | 支持本地 MCP 子进程的 AI 客户端 |
| **HTTP MCP** | `npm run start:http` | 需要 URL 的客户端；本机默认 `http://127.0.0.1:8333/mcp` |
| **可视化控制台** | `npm run ui` | 浏览器打开 `http://127.0.0.1:8333/`；同端口也有 `/mcp` 与 `/api/*` |

### test、smoke、source health 的边界

```bash
npm test                 # deterministic offline tests；CI/release gate 使用
npm run smoke            # MCP 握手；确认 16 tools
npm run source:health    # 真实访问第三方数据源；健康观察，不作为 release gate
npm run selftest         # 兼容旧命令，等价于 source:health
```

---

## 4. 发布、更新与供应链

### Stable Release channel

`npm start` / `start:http` / `ui` 都通过 `scripts/launcher.mjs`：

1. 立即启动当前已安装版本；
2. 后台读取 GitHub 最新正式 Stable Release；
3. **只更新更高的 `vX.Y.Z` Release，不追 `main` HEAD**；
4. tracked 工作区有本地修改时跳过；
5. release 依赖锁变化时用 `npm ci`；
6. 安装或构建失败时尽力恢复更新前 ref 与构建；
7. `TRENTHUB_AUTOUPDATE=0` 可关闭自动更新。

手动升级：

```bash
node scripts/upgrade.mjs
```

### 真正 release gate

PR/main CI 在 **Node 22.x 与 24.x** 上执行：

```text
npm ci
npm run build
npm test
npm run smoke
```

只有 `main` 上 Node CI 全绿后，Stable Release workflow 才会：

- 再跑一次 release gate；
- 创建正式 `vX.Y.Z` tag；
- 生成 npm `.tgz`；
- 生成 `SHA256SUMS.txt`；
- 创建 GitHub Stable Release。

实时第三方平台可达性由独立 `Source Health` workflow 观察，避免平台临时故障把代码 CI 误判成失败。

---

## 5. 接入你的 AI

通用 stdio：

```json
{
  "mcpServers": {
    "trendhub": {
      "command": "node",
      "args": ["/绝对路径/Zachary-Skill/trendhub-mcp/scripts/launcher.mjs"]
    }
  }
}
```

不同客户端的配置、ChatGPT/Claude/Cursor/VS Code/豆包/通用 MCP、手机/平板与远程 HTTP 见 **[docs/setup-clients.md](./docs/setup-clients.md)**。

公开仓库访问与安装说明见 **[docs/access.md](./docs/access.md)**。

### HTTP 安全边界

默认 `127.0.0.1`：本机开箱即用，无需 Token。

任何非 loopback 监听必须同时设置 `TRENTHUB_HTTP_TOKEN`，否则服务拒绝启动：

```bash
TRENTHUB_HOST=0.0.0.0 \
TRENTHUB_HTTP_TOKEN='使用足够长的随机Token' \
npm run start:http
```

远程 MCP 客户端需带：

```http
Authorization: Bearer <TRENTHUB_HTTP_TOKEN>
```

浏览器远程控制台首次访问受保护 API 时会提示输入同一 Token；Token 只保存在当前 `sessionStorage`。

---

## 6. 装好后怎么用

- 「用 trendhub 拉一下**小红书现在最火的 30 条笔记和热门话题词**，按点赞给我排序」
- 「用 trendhub 拉一下现在微博、B站、抖音、小红书相关的全网热点，按热度给我前 20」
- 「分析一下『AI 眼镜』现在在几个平台同时上榜？小红书上大家怎么聊？」
- 「看看『英伟达』过去 12 个月在 Google Trends 的走势，并给我相关飙升词」
- 「未来 90 天有哪些科技展会和电商大促节点？帮我排内容日历」
- 「聚合最近的 AI 未来趋势信号，总结值得继续验证的方向」
- 「对比上一次，哪些话题新冒出来、哪些掉榜了？」
- 「基于现在小红书真实热门笔记和话题词，用小红书笔记模板做一份创作简报」

---

## 7. 解锁小红书增强能力（可选）

游客模式零配置即可拿到首页热门推荐笔记流与标题派生词。需要官方热搜词榜与关键词爆款搜索时，配置本人登录后的 `XHS_COOKIE`（需要 `a1` 与 `web_session`）。

Cookie 只应保存在使用者本机环境变量中。使用该能力时，Cookie 会随必要请求发送到小红书目标服务；TrendHub 不把 Cookie 回传到中央服务。请勿提交到仓库，并遵守平台条款与频率边界。

---

## 8. 数据口径与红线

- 每条榜单记录带 `capturedAt` 与 `sourceUrl`。
- 取不到的数据显式标记 `dataQuality: "missing" | "degraded"` 并说明原因，**不用 0 或“未知”静默填充，不估算、不造假**。
- **小红书**：游客热门流是首页推荐流，**不是官方热搜词榜**；`hotText` 保留平台展示文本，数值解析只供排序；派生词明确区分 `cross` / `hashtag` / `author`。
- **Google Trends 为 0–100 相对热度，不是绝对搜索量**。
- 规则情感只做可解释辅助信号；反讽、语境与立场由调用方 AI 结合证据判断。
- 跨平台聚类基于标题/文本相似度，属于辅助结构，不把聚类猜测直接当事实。
- 仅处理公开可访问数据与使用者主动提供的本机会话配置；应遵守各目标平台条款、控制频率并遵循适用法律。

---

## 9. 已知限制

- **小红书游客能力有边界**：官方热搜词榜、关键词搜索与部分推荐能力需要有效登录态；不可用时返回 `missing/degraded`。
- **公开 Web 数据源会变化**：页面/API/反爬策略变化可能导致某个来源临时失效；一个来源失效不应拖累其他来源。
- **网络环境会影响取数**：目标平台可能对地区、IP、登录态或访问频率有差异化限制。
- **趋势变化需要历史快照**：`trend_change_alerts` 至少需要两次快照；`get_trending` 会自动积累，也可使用 `npm run snapshot`。
- **节点日历含种子/预计信息**：未官宣日期必须以 `sourceUrl` 对应官方信息复核。
- 当前实现不把 Google Trending Now 作为“实时全网热榜”来源；“此刻热点”主要由平台原生热榜覆盖。

---

## 10. 维护

- 未来信源：`data/future-sources.json`，或 `TRENTHUB_RSS_SOURCES` 指向自定义 JSON。
- 节点数据：`data/events.json`。
- HTTP：`TRENTHUB_TRANSPORT`、`TRENTHUB_PORT`、`TRENTHUB_HOST`、`TRENTHUB_HTTP_TOKEN`。
- 运行：`TRENTHUB_CACHE_TTL`、`TRENTHUB_TIMEOUT_MS`、`TRENTHUB_RETRIES`、`TRENTHUB_DATA_DIR`。
- 小红书增强：`XHS_COOKIE`。
- 诊断：先 `npm run smoke` / `npm test`，外部平台再用 `npm run source:health`。
- 更新：`node scripts/upgrade.mjs`，或由 launcher 跟随 Stable Release。

## 11. 目录结构

```text
trendhub-mcp/
├─ src/
│  ├─ sources/            # 国内外数据源与小红书能力
│  ├─ store/              # 本地快照
│  ├─ analysis/           # 共振/情感/话题/创作简报等确定性分析
│  ├─ security/           # HTTP 网络边界与 Bearer 鉴权
│  ├─ web/                # HTTP API + 静态资源托管
│  ├─ tools/              # 16 个 MCP tools
│  ├─ server.ts
│  └─ index.ts
├─ web/                   # 原生控制台前端 + session-scoped auth bridge
├─ data/                  # events / future-sources / templates
├─ scripts/
│  ├─ setup.mjs           # lockfile + npm ci 安装
│  ├─ smoke.mjs           # MCP 握手
│  ├─ test.mjs            # deterministic release tests
│  ├─ selftest.ts         # source health 实现（兼容旧名）
│  ├─ launcher.mjs        # Stable Release 检查
│  ├─ upgrade.mjs         # release channel 升级
│  └─ lib-trendhub.mjs
├─ package-lock.json      # npm dependency lock
├─ manifest.json          # 机器可读 Skill/安装/安全/工具清单
├─ NOTICE / LICENSE
└─ package.json
```

## 12. 开源与归因

MIT License。依赖、数据来源与第三方代码归因见 [NOTICE](./NOTICE)：`@modelcontextprotocol/sdk`、`dailyhot-api`、`rss-parser`、`cheerio`、`zod`；小红书 Web 签名相关 vendored MIT 代码的版权与来源保留在 NOTICE / 源码头中。仅作调研参考但未集成的其他项目不构成本仓库代码依赖。
