# TrendHub · 全网热点趋势专家（MCP 插件）

> 一个**本地运行、任何 AI 都能调用**的热点趋势插件，**以小红书热点与趋势为主打**。聚合国内外 **38 个平台**实时热榜（小红书置顶、为默认查询首位）、小红书热门笔记流与话题词派生、Google Trends 关键词走势、高质量未来趋势信源与年度节点日历，内置跨平台共振、新晋/飙升/掉榜、话题深度情报，以及脚本/文案/方案的专家创作简报；另附一个 **GPT 风格的本地可视化控制台**。
>
> **算力零成本、零 Key、零遥测**：插件只负责取数、确定性分析与创作脚手架；所有分析成文、文案成稿都由**你正在用的那个 AI**（ChatGPT / Claude / 豆包 / DeepSeek / Gemini / Cursor…）用它自己的算力完成。插件本身不内置、也不要求任何大模型 API Key，不收集、不上传任何使用数据。

---

## 1. 它能做什么

| 趋势类型 | 能力 | 对应工具 |
| --- | --- | --- |
| **小红书主打** | 首页热门推荐笔记流（真实封面/作者/点赞/链接，游客零配置可用）+ 标题话题词派生；登录后解锁官方热搜词榜与关键词爆款搜索 | `xhs_hot_topics`、`get_trending` |
| **当下热点** | 38 个平台实时热榜，按平台/分类查询（默认查询以小红书打头） | `get_trending`、`list_platforms`、`list_categories` |
| **热点趋势（共振/变化）** | 一个话题在几个平台同时爆、自动发现共振话题、新晋/飙升/掉榜 | `cross_platform_overlap`、`discover_trending_topics`、`trend_change_alerts` |
| **关键词趋势走势** | Google Trends 0–100 相对热度曲线（多词对比）、相关词 top/rising | `keyword_trend_curve`、`related_queries` |
| **未来趋势** | 15 个高质量科技/AI/商业/营销信源最新文章，供趋势研判 | `future_signals` |
| **节点趋势** | 未来 N 天展会/财报季/大促/政策/节假日日历，含预热等级 | `upcoming_events` |
| **深度分析** | 一键话题情报包：小红书证据 + 共振 + 走势 + 动量 + 相关词 + 信号 + 节点 + 情感 | `analyze_topic` |
| **内容生产** | 10 套专家模板（含小红书笔记）+ 基于真实证据与同平台爆款样本的创作简报 | `list_templates`、`get_template`、`get_content_brief` |

### 16 个工具一览

`list_platforms` · `list_categories` · `get_trending` · **`xhs_hot_topics`** · `cross_platform_overlap` · `discover_trending_topics` · `trend_change_alerts` · `take_snapshot` · `keyword_trend_curve` · `related_queries` · `future_signals` · `upcoming_events` · `analyze_topic` · `list_templates` · `get_template` · `get_content_brief`

### 平台覆盖（38，小红书置顶）

- **主打 · 小红书**：`xiaohongshu`（小红书热门笔记，游客可用，默认/置顶）、`xiaohongshu-hotlist`（小红书热搜词榜，需登录 Cookie）
- **国内社交/视频/新闻**：微博、知乎、百度、贴吧、虎扑、B站、抖音、快手、今日头条、澎湃、腾讯新闻、网易新闻、新浪新闻
- **科技/开发者**：36氪、IT之家、虎嗅、少数派、爱范儿、掘金、CSDN、51CTO、V2EX、HelloGitHub、酷安、微信读书、历史上的今天
- **国际**：Hacker News、GitHub Trending（日/周/月）、Product Hunt、Reddit（technology / programming / MachineLearning / worldnews / marketing）

### 小红书能力矩阵（重点）

| 能力 | 游客模式（零配置） | 登录模式（配置 `XHS_COOKIE`） |
| --- | --- | --- |
| 首页热门推荐笔记流（封面/标题/作者/点赞/链接） | ✅ 真实数据 | ✅ |
| 标题话题词派生（跨篇热词 / #标签 / 作者话题） | ✅ | ✅ |
| 官方**热搜词榜** | ❌ 显式 `missing` 并引导 | ✅ |
| 关键词**爆款笔记搜索**（按热度排序） | ❌ 接口返回无权限，标记缺失 | ✅ |
| 分品类推荐流 | ❌ 游客仅开放首页推荐 | ✅（随账号权限） |

> 游客拿不到的能力一律显式标记 `missing` 并说明如何解锁，**绝不编造热搜词或搜索结果**。

### 10 套专家内容模板

短视频分镜脚本、小红书笔记、微博、公众号长文、X(Twitter) 线程、直播脚本、营销方案、内容日历、新品发布、标题钩子库。

---

## 2. 它是什么 / 不是什么

- ✅ **是一个本地 MCP 插件**：跑在你自己电脑上，通过标准 [Model Context Protocol](https://modelcontextprotocol.io) 被各类 AI 客户端发现和调用。
- ✅ **自带算力**：你用 GPT 就花 GPT 的额度、用豆包就花豆包的额度，插件不增加任何模型费用、不存任何模型 Key。
- ✅ **零遥测、零数据回传、纯本地**：不内置任何统计/埋点/上报，所有抓取与缓存只在本机发生。
- ✅ **公开仓库即分发**：仓库公开，**拿到仓库链接的人即可 clone 安装**，无需审批、无需中央服务器。
- ✅ **附带本地可视化控制台**：`npm run ui` 一键拉起一个 GPT 风格网页（仅本机），可直接看热榜、小红书专区、共振、曲线并复制素材给 AI；控制台**不接任何模型**。
- ❌ **不是**一个需要部署到服务器、大家连一个公网地址的中央服务（HTTP/控制台都只绑定本机 `127.0.0.1`）。
- ❌ **不编造数据**：拿不到就明确标记 `missing`/`degraded`，绝不静默填 0 或“未知”。

---

## 3. 快速开始（5 分钟）

### 前置

- **Node.js ≥ 18.14**（推荐 20 / 22 LTS）。终端运行 `node -v` 检查；没有就去 https://nodejs.org 装 LTS 版。依赖版本已在 `package.json` 锁定。
- 能访问公开仓库 `Zachary-Skill`（拿到链接即可，无需被加为协作者）。

### 安装

```bash
# 1) 克隆公开仓库
git clone https://github.com/Zachary-1012/Zachary-Skill.git

# 2) 进入插件目录
cd Zachary-Skill/trendhub-mcp

# 3) 安装依赖
npm install

# 4) 构建
npm run build

# 5) 自检（真实拉取每个数据源，打印可用性报告）
npm run selftest
```

自检看到大部分平台 `OK` 即成功。少数平台 `MISS` 通常是**当前网络访问不到该平台**（例如海外网络访问知乎/百度），不影响其他工具；在对应地区网络下会恢复。

> Windows 用户：以上命令在 PowerShell / Git Bash 均可；macOS 在终端（Terminal）同样适用。

### 三种运行方式

| 方式 | 启动 | 适用 |
| --- | --- | --- |
| **stdio（默认，推荐给 AI 客户端）** | `npm start` | Claude Desktop、Cursor、VS Code、豆包桌面端、Cherry Studio、ChatBox、LobeHub 等以子进程方式启动 |
| **本地 HTTP（MCP 端点）** | `npm run start:http`（默认 `http://127.0.0.1:8333/mcp`，可 `--port=xxxx`） | 只接受 URL 形式接入的客户端 |
| **GPT 风格控制台（含 HTTP）** | `npm run ui`（自动打开 `http://127.0.0.1:8333/`） | 人直接看榜、刷小红书专区、复制选题素材；同一端口也提供 `/mcp` 与只读 `/api/*` |

> 控制台是纯前端 + 本机只读 API，**不内置也不调用任何大模型**；“复制选题素材给 AI”是把真实数据拷成文本，由你粘贴给任意 AI 成文。

---

## 4. 接入你的 AI（按客户端）

通用 stdio 配置（把 `/绝对路径/` 换成你实际 clone 的位置）：

```json
{
  "mcpServers": {
    "trendhub": {
      "command": "node",
      "args": ["/绝对路径/Zachary-Skill/trendhub-mcp/dist/src/index.js"]
    }
  }
}
```

> Windows 路径示例：`"C:/Users/你的用户名/Documents/Zachary-Skill/trendhub-mcp/dist/src/index.js"`（用正斜杠 `/` 或双反斜杠 `\\`）。
> macOS 示例：`"/Users/你/Zachary-Skill/trendhub-mcp/dist/src/index.js"`。

各客户端的具体入口见 **[docs/setup-clients.md](./docs/setup-clients.md)**：ChatGPT（桌面端/自定义连接器）、Claude Desktop、Cursor、VS Code（Cline 等）、豆包桌面端、DeepSeek（经 Cherry Studio / ChatBox / LobeHub 挂自己的 Key）、通用 HTTP 接入。

安装与访问说明见 [docs/access.md](./docs/access.md)（公开仓库，有链接即可安装）。

---

## 5. 装好后怎么用（直接对你的 AI 说）

- 「用 trendhub 拉一下**小红书现在最火的 30 条笔记和热门话题词**，按点赞给我排序」
- 「用 trendhub 拉一下现在微博、B站、抖音、小红书相关的全网热点，按热度给我前 20」
- 「分析一下『AI 眼镜』现在在几个平台同时上榜？小红书上大家都在怎么聊？是不是真的全网在爆？」
- 「看看『英伟达』这个词过去 12 个月在 Google Trends 的走势，现在处于上升还是衰退期？给我相关飙升词」
- 「未来 90 天有哪些科技展会和电商大促节点？帮我排个内容日历」
- 「聚合一下最近的 AI 未来趋势信号，总结 5 个值得提前布局的方向」
- 「对比上一次，哪些话题是新冒出来的、哪些掉榜了？」
- 「基于现在小红书的真实热门笔记和话题词，用小红书笔记模板给我做一篇种草文案的创作简报」→ AI 会拿到证据卡 + 同平台真实爆款样本 + 逐段填充指引，再用它自己的算力写成稿。

---

## 6. 解锁小红书完整能力（可选）

游客模式**零配置**即可拿到首页热门推荐笔记流与标题派生词。若需要**官方热搜词榜**与**关键词爆款搜索**，配置你本人登录后的 Cookie：

1. 浏览器登录 https://www.xiaohongshu.com ，从开发者工具 Network 的请求头里复制完整 `Cookie`。
2. 设置环境变量 **`XHS_COOKIE`**（需同时包含 `a1` 与 `web_session` 两个字段；缺任一字段会自动回落到游客模式）。
3. 重启插件 / 控制台。`xhs_hot_topics` 与控制台的“官方热搜词榜”即变为可用。

> Cookie 只保存在你本机的环境变量里、仅随请求发给小红书官方域名，**不会被上传到任何第三方**。请使用你自己的账号、控制频率、遵守平台条款；不要把含 Cookie 的配置提交到仓库。

---

## 7. 数据口径与红线

- 每条榜单记录都带 `capturedAt`（采集时间）与 `sourceUrl`（来源地址）。
- 取不到的数据一律显式标记 `dataQuality: "missing" | "degraded"` 并写明原因，**不用 0 或“未知”静默填充，不估算、不造假**。
- **小红书**：游客热门流为平台首页「热门推荐流」（平台推荐排序，**非官方热搜词榜**）；`liked_count` 为平台展示的近似文本（如 `4.1万` / `10万+`），插件保留原文 `hotText`，解析出的数值仅作排序参考；派生词由标题统计得到（`cross` 跨篇热词 / `hashtag` 作者#标签 / `author` 作者空格话题），**均非官方词榜**，已逐条标注来源供复核。
- **Google Trends 数值是 0–100 的相对热度，不是绝对搜索量**；接口结果会明确标注。
- 规则情感分析（`sentiment`）只做**可解释的辅助信号**，反讽/语境/立场由调用方大模型终判。
- 跨平台话题聚类基于标题相似度，结果会提示“需大模型复核归纳”，不把算法猜测当定论。
- 热榜是各平台公开网页接口的只读抓取，请遵守各平台条款，控制频率，仅用于内部研究与创作。

## 8. 已知限制（如实告知）

- **小红书游客能力有边界**：官方热搜词榜、关键词搜索、分品类推荐对游客返回“账号无权限”，需 `XHS_COOKIE`；热搜词榜成功响应结构随登录态与上游变化，插件做宽容解析，解析不到会标 `degraded` 并回传原始字段键名，不编造词条。
- **抓取类源随上游变动**：各平台非官方接口可能改版导致个别平台临时失效，自检会标出来，更新插件即可恢复；失效平台不拖累其他平台。
- **网络相关**：知乎、百度等平台的自研接口在部分海外网络可能不可达（会自动回退聚合源，仍失败则标记 missing）；小红书在部分机房/数据中心出口 IP 可能被风控，家庭/办公网络通常正常。
- **Google Trending Now 已下线**：Google 旧版每日/实时热搜 JSON 与 RSS 端点均已停用，故本插件不提供该功能；“此刻正在爆”由 38 个平台原生实时热榜（含小红书）覆盖。
- **趋势变化需要历史**：`trend_change_alerts` 需两次以上快照。`get_trending` 查询时会自动积累快照，也可用 `npm run snapshot` 挂系统计划任务定时采集。
- **节点日历为种子数据**：未官宣的展会日期以时间窗 + “预计”标注，确切日期以官方为准（见各条 `sourceUrl`），需持续维护。

## 9. 维护

- 新增/调整未来信源：编辑 `data/future-sources.json`（也可用环境变量 `TRENTHUB_RSS_SOURCES` 指向自定义 JSON）。
- 维护节点：编辑 `data/events.json`。
- 环境变量：`TRENTHUB_TRANSPORT`（stdio/http）、`TRENTHUB_PORT`（HTTP 端口，默认 8333）、`TRENTHUB_HOST`（默认 127.0.0.1）、`TRENTHUB_CACHE_TTL`、`TRENTHUB_TIMEOUT_MS`、`TRENTHUB_RETRIES`、`TRENTHUB_DATA_DIR`、`TRENTHUB_RSS_SOURCES`、**`XHS_COOKIE`（可选，解锁小红书词榜/搜索）**。
- 平台失效排查：先 `npm run selftest`，再 `git pull` 更新。

## 10. 目录结构

```
trendhub-mcp/
├─ src/
│  ├─ sources/
│  │  ├─ xhs/            # 小红书签名/游客会话（vendored MIT 签名 + 自研客户端，零额外依赖）
│  │  ├─ xiaohongshu.ts  # 小红书热门流 / 热搜词榜 / 关键词搜索
│  │  ├─ domestic…       # 国内(dailyhot 进程内集成 + 自研兜底)
│  │  └─ international…  # HN/GitHub/PH/Reddit、Google Trends、RSS、节点
│  ├─ store/             # 本地 latest/previous 环形快照（新晋/飙升/掉榜）
│  ├─ analysis/          # 相似度、情感、共振、话题情报、小红书话题词、创作简报
│  ├─ web/               # 本地控制台：HTTP 服务 + 只读 /api + 静态资源托管
│  ├─ tools/             # 16 个 MCP 工具注册
│  ├─ server.ts          # MCP server 工厂
│  └─ index.ts           # stdio / 本地 HTTP / --ui 控制台 入口
├─ web/                  # GPT 风格控制台前端（原生单页，零构建、零 CDN）
├─ data/                 # 随包种子：events.json / future-sources.json / templates.json
├─ scripts/              # selftest.ts / snapshot.ts
├─ manifest.json         # 机器可读插件清单（telemetry:none / dataEgress:none）
├─ NOTICE / LICENSE
└─ package.json
```

## 11. 开源与归因

MIT License。依赖、数据来源与第三方代码归因见 [NOTICE](./NOTICE)：`@modelcontextprotocol/sdk`、`dailyhot-api`(MIT)、`rss-parser`、`cheerio`、`zod`；小红书 Web 签名算法 vendored 自 `lucasygu/redbook`(MIT)，其签名实现源自 `Cloxl/xhshow`(MIT)，已保留版权头并在 NOTICE 署名。调研中参考过 NewsNow(MIT)；TrendRadar(GPL-3.0)、MediaCrawler(AGPL)、amagi(GPL-3.0) 等**仅作协议事实参考、未集成任何代码**。
