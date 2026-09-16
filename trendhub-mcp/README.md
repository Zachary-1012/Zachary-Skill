# TrendHub · 全网热点趋势专家（MCP 插件）

> 一个**本地运行、任何 AI 都能调用**的热点趋势插件。聚合国内外 **36 个平台**实时热榜、Google Trends 关键词走势、高质量未来趋势信源与年度节点日历，内置跨平台共振、新晋/飙升/掉榜、话题深度情报，以及脚本/文案/方案的专家创作简报。
>
> **算力零成本、零 Key**：插件只负责取数、确定性分析与创作脚手架；所有分析成文、文案成稿都由**你正在用的那个 AI**（ChatGPT / Claude / 豆包 / DeepSeek / Gemini / Cursor…）用它自己的算力完成。插件本身不内置、也不要求任何大模型 API Key。

---

## 1. 它能做什么

| 趋势类型 | 能力 | 对应工具 |
| --- | --- | --- |
| **当下热点** | 36 个平台实时热榜，按平台/分类查询 | `get_trending`、`list_platforms` |
| **热点趋势（共振/变化）** | 一个话题在几个平台同时爆、自动发现共振话题、新晋/飙升/掉榜 | `cross_platform_overlap`、`discover_trending_topics`、`trend_change_alerts` |
| **关键词趋势走势** | Google Trends 0–100 相对热度曲线（多词对比）、相关词 top/rising | `keyword_trend_curve`、`related_queries` |
| **未来趋势** | 15 个高质量科技/AI/商业/营销信源最新文章，供趋势研判 | `future_signals` |
| **节点趋势** | 未来 N 天展会/财报季/大促/政策/节假日日历，含预热等级 | `upcoming_events` |
| **深度分析** | 一键话题情报包：共振+走势+动量+相关词+信号+节点+情感 | `analyze_topic` |
| **内容生产** | 10 套专家模板 + 基于真实证据与同平台爆款样本的创作简报 | `list_templates`、`get_template`、`get_content_brief` |

### 15 个工具一览

`list_platforms` · `list_categories` · `get_trending` · `cross_platform_overlap` · `discover_trending_topics` · `trend_change_alerts` · `take_snapshot` · `keyword_trend_curve` · `related_queries` · `future_signals` · `upcoming_events` · `analyze_topic` · `list_templates` · `get_template` · `get_content_brief`

### 平台覆盖（36）

- **国内社交/视频/新闻**：微博、知乎、百度、贴吧、虎扑、B站、抖音、快手、今日头条、澎湃、腾讯新闻、网易新闻、新浪新闻
- **科技/开发者**：36氪、IT之家、虎嗅、少数派、爱范儿、掘金、CSDN、51CTO、V2EX、HelloGitHub、酷安、微信读书、历史上的今天
- **国际**：Hacker News、GitHub Trending（日/周/月）、Product Hunt、Reddit（technology / programming / MachineLearning / worldnews / marketing）

### 10 套专家内容模板

短视频分镜脚本、小红书笔记、微博、公众号长文、X(Twitter) 线程、直播脚本、营销方案、内容日历、新品发布、标题钩子库。

---

## 2. 它是什么 / 不是什么

- ✅ **是一个本地 MCP 插件**：跑在你自己电脑上，通过标准 [Model Context Protocol](https://modelcontextprotocol.io) 被各类 AI 客户端发现和调用。
- ✅ **自带算力**：你用 GPT 就花 GPT 的额度、用豆包就花豆包的额度，插件不增加任何模型费用、不存任何模型 Key。
- ✅ **私有仓库分发即门禁**：只有被加入 `Zachary-Skill` 私有仓库的同事才能 clone 安装。
- ❌ **不是**一个需要部署到服务器、大家连一个公网地址的中央服务（HTTP 模式也只绑定本机 `127.0.0.1`）。
- ❌ **不编造数据**：拿不到就明确标记 `missing`/`degraded`，绝不静默填 0 或“未知”。

---

## 3. 快速开始（5 分钟）

### 前置
- **Node.js ≥ 18.14**（推荐 20 / 22 LTS）。终端运行 `node -v` 检查；没有就去 https://nodejs.org 装 LTS 版。依赖版本已在 `package.json` 锁定，无需 lock 文件也能复现安装。
- 能访问公司私有仓库 `Zachary-Skill`（找管理员把你的 GitHub 账号加为协作者）。

### 安装

```bash
# 1) 拉取私有仓库（会要求 GitHub 登录/授权）
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

### 两种运行方式

| 方式 | 启动 | 适用客户端 |
| --- | --- | --- |
| **stdio（默认，推荐）** | `npm start` | Claude Desktop、Cursor、VS Code、豆包桌面端、Cherry Studio、ChatBox、LobeHub 等以子进程方式启动 |
| **本地 HTTP** | `npm run start:http`（默认 `http://127.0.0.1:8333/mcp`，可 `--port=xxxx`） | 只接受 URL 形式接入的客户端 |

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

各客户端的具体入口见 **[docs/setup-clients.md](./docs/setup-clients.md)**：

- ChatGPT（桌面端 / 自定义连接器）
- Claude Desktop、Cursor、VS Code（Cline 等）
- 豆包桌面端
- DeepSeek（通过 Cherry Studio / ChatBox / LobeHub 等支持 MCP 的客户端挂自己的 DeepSeek Key）
- 通用 HTTP 接入

**如何给同事开通访问权**见 [docs/access.md](./docs/access.md)（私有仓库协作者即唯一门禁）。

---

## 5. 装好后怎么用（直接对你的 AI 说）

- 「用 trendhub 拉一下现在微博、B站、抖音、小红书相关的全网热点，按热度给我前 20」
- 「分析一下『AI 眼镜』现在在几个平台同时上榜？是不是真的全网在爆？」
- 「看看『英伟达』这个词过去 12 个月在 Google Trends 的走势，现在处于上升还是衰退期？给我相关飙升词」
- 「未来 90 天有哪些科技展会和电商大促节点？帮我排个内容日历」
- 「聚合一下最近的 AI 未来趋势信号，总结 5 个值得提前布局的方向」
- 「对比上一次，哪些话题是新冒出来的、哪些掉榜了？」
- 「基于现在的真实热点，用短视频分镜模板给我做一条抖音脚本的创作简报」→ AI 会拿到证据卡 + 同平台真实爆款样本 + 逐格填充指引，再用它自己的算力写成稿。

---

## 6. 数据口径与红线

- 每条榜单记录都带 `capturedAt`（采集时间）与 `sourceUrl`（来源地址）。
- 取不到的数据一律显式标记 `dataQuality: "missing" | "degraded"` 并写明原因，**不用 0 或“未知”静默填充，不估算、不造假**。
- **Google Trends 数值是 0–100 的相对热度，不是绝对搜索量**；接口结果会明确标注。
- 规则情感分析（`sentiment`）只做**可解释的辅助信号**，反讽/语境/立场由调用方大模型终判。
- 跨平台话题聚类基于标题相似度，结果会提示“需大模型复核归纳”，不把算法猜测当定论。
- 热榜是各平台公开网页接口的只读抓取，请遵守各平台条款，控制频率，仅用于内部研究与创作。

## 7. 已知限制（如实告知）

- **抓取类源随上游变动**：各平台非官方接口可能改版导致个别平台临时失效，自检会标出来，更新插件即可恢复；失效平台不拖累其他平台。
- **网络相关**：知乎、百度等平台的自研接口在部分海外网络可能不可达（会自动回退聚合源，仍失败则标记 missing）；在中国大陆网络下正常。
- **Google Trending Now 已下线**：Google 旧版每日/实时热搜 JSON 与 RSS 端点均已停用，官方新接口也不提供 Trending Now，故本插件不提供该功能；“此刻正在爆”由 36 个平台原生实时热榜覆盖。
- **趋势变化需要历史**：`trend_change_alerts` 需两次以上快照。`get_trending` 查询时会自动积累快照，也可用 `npm run snapshot` 挂系统计划任务定时采集。
- **节点日历为种子数据**：未官宣的展会日期以时间窗 + “预计”标注，确切日期以官方为准（见各条 `sourceUrl`），需持续维护。

## 8. 维护

- 新增/调整未来信源：编辑 `data/future-sources.json`（也可用环境变量 `TRENTHUB_RSS_SOURCES` 指向自定义 JSON）。
- 维护节点：编辑 `data/events.json`。
- 环境变量：`TRENTHUB_TRANSPORT`（stdio/http）、`TRENTHUB_PORT`（HTTP 端口，默认 8333）、`TRENTHUB_HOST`（默认 127.0.0.1）、`TRENTHUB_CACHE_TTL`（缓存秒）、`TRENTHUB_TIMEOUT_MS`、`TRENTHUB_RETRIES`、`TRENTHUB_DATA_DIR`、`TRENTHUB_RSS_SOURCES`。
- 平台失效排查：先 `npm run selftest`，再 `git pull` 更新。

## 9. 目录结构

```
trendhub-mcp/
├─ src/
│  ├─ sources/      # 采集层：国内(dailyhot+自研)、国际、Google Trends、RSS、节点
│  ├─ store/        # 本地 latest/previous 环形快照（新晋/飙升/掉榜）
│  ├─ analysis/     # 文本相似度、规则情感、跨平台共振、话题情报、创作简报
│  ├─ tools/        # 15 个 MCP 工具注册
│  ├─ server.ts     # MCP server 工厂
│  └─ index.ts      # stdio / 本地 HTTP 双传输入口
├─ data/            # 随包种子：events.json / future-sources.json / templates.json
├─ scripts/         # selftest.ts / snapshot.ts
├─ manifest.json    # 机器可读插件清单
├─ NOTICE / LICENSE
└─ package.json
```

## 10. 开源与归因

MIT License。依赖与数据归因见 [NOTICE](./NOTICE)：`@modelcontextprotocol/sdk`、`dailyhot-api`(MIT)、`rss-parser`、`cheerio`、`zod`。调研中参考过 NewsNow(MIT)；TrendRadar 为 GPL-3.0，**仅参考思路、未集成任何代码**。
