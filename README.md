# Zachary-Skill · 公司 AI 技能库

全员可用的 **AI Skill / MCP 插件仓库**。这里的每个技能都设计成**与具体大模型解耦**：无论你用 ChatGPT、Claude、豆包、DeepSeek、Gemini 还是 Cursor，只要客户端支持标准 [MCP（Model Context Protocol）](https://modelcontextprotocol.io)，就能挂载使用；**算力走你自己的 AI 账号，技能本身不内置、也不索要任何模型 API Key。**

> 本仓库**公开分发**，门禁刻意保持最简单：**拿到仓库链接的人即可 clone 安装**，无需审批、无需中央服务器。安装说明见 [`trendhub-mcp/docs/access.md`](./trendhub-mcp/docs/access.md)。

## 技能清单

| 技能 | 说明 | 文档 |
| --- | --- | --- |
| **TrendHub · 全网热点趋势专家（小红书主打）** | 38 个平台实时热榜（小红书置顶、默认首位）、小红书热门笔记流与话题词派生、Google Trends 走势、未来趋势信号、节点日历、跨平台共振/新晋掉榜分析、话题深度情报、脚本/文案/方案创作简报（16 个 MCP 工具），附 GPT 风格本地可视化控制台 | [trendhub-mcp/README.md](./trendhub-mcp/README.md) |

## 三步安装任意技能（以 TrendHub 为例）

前置：Node.js ≥ 18.14（推荐 20/22 LTS，https://nodejs.org 安装）。

```bash
git clone https://github.com/Zachary-1012/Zachary-Skill.git
cd Zachary-Skill/trendhub-mcp
npm install
npm run build
npm run selftest     # 自检数据源，多数 OK 即成功
```

- 挂到 AI 客户端：按 [trendhub-mcp/docs/setup-clients.md](./trendhub-mcp/docs/setup-clients.md) 配置（ChatGPT / Claude / Cursor / VS Code / 豆包 / DeepSeek 等）。
- 只想用界面看榜：在 `trendhub-mcp` 目录运行 `npm run ui`，浏览器自动打开本地控制台（含小红书专区，仅本机、不接模型）。

更新：

```bash
cd Zachary-Skill && git pull
cd trendhub-mcp && npm install && npm run build
```

## 设计原则

1. **本地插件，非中央服务**：跑在你自己电脑上，数据不经过第三方服务器；HTTP / 控制台都只绑定本机 `127.0.0.1`。
2. **自带算力（Bring Your Own AI）**：技能只给数据、确定性分析与脚手架；理解、解读、成文由你当前的 AI 完成。
3. **零 Key、零遥测、零回传**：不内置任何模型 Key，不做统计埋点、不上传使用数据，抓取与缓存只在本机。
4. **不造假**：取不到的数据显式标 `missing/degraded`，绝不静默填 0 或编造；每条数据带来源与采集时间。
5. **能开源就开源**：优先采用可商用的 MIT 开源组件，缺口才自研；所有第三方归因见各技能的 `NOTICE`。
6. **风格统一**：GPT 风格、结构化输出、机器可读 `manifest.json`、标准 MCP 接口。

## 权限与安全

- 仓库公开，**把链接发给谁，谁就能安装**；若日后要收回，在 GitHub 将仓库改回私有即可（已 clone 的本机副本无法再 `git pull`）。
- 仓库内**不含任何密钥/Token**。小红书完整能力所需的 `XHS_COOKIE` 只配置在使用者本机环境变量里，**请勿提交到仓库**。
- 仓库以 MIT 许可公开，他人可商用 / fork；请勿把公司内部资料、账号凭据写入仓库。
- 各技能的数据口径、已知限制与维护方式见其各自 README。
