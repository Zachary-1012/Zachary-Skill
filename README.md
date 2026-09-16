# Zachary-Skill · 公司 AI 技能库

公司内部、全员可用的 **AI Skill / MCP 插件仓库**。这里的每个技能都设计成**与具体大模型解耦**：无论你用 ChatGPT、Claude、豆包、DeepSeek、Gemini 还是 Cursor，只要客户端支持标准 [MCP（Model Context Protocol）](https://modelcontextprotocol.io)，就能挂载使用；**算力走你自己的 AI 账号，技能本身不内置、也不索要任何模型 API Key。**

> 🔒 这是**私有仓库**，访问权即唯一门禁：被加入本仓库协作者的同事即可安装使用。开通方式见各技能文档或 [`trendhub-mcp/docs/access.md`](./trendhub-mcp/docs/access.md)。

## 技能清单

| 技能 | 说明 | 文档 |
| --- | --- | --- |
| **TrendHub · 全网热点趋势专家** | 36 个平台实时热榜、Google Trends 走势、未来趋势信号、节点日历、跨平台共振/新晋掉榜分析、话题深度情报、脚本/文案/方案创作简报（15 个 MCP 工具） | [trendhub-mcp/README.md](./trendhub-mcp/README.md) |

## 三步安装任意技能（以 TrendHub 为例）

前置：Node.js ≥ 18.14（推荐 20/22 LTS，https://nodejs.org 安装）。

```bash
git clone https://github.com/Zachary-1012/Zachary-Skill.git
cd Zachary-Skill/trendhub-mcp
npm install
npm run build
npm run selftest     # 自检数据源，多数 OK 即成功
```

然后按 [trendhub-mcp/docs/setup-clients.md](./trendhub-mcp/docs/setup-clients.md) 把它挂到你用的 AI 客户端（ChatGPT / Claude / Cursor / VS Code / 豆包 / DeepSeek 等）。

更新：

```bash
cd Zachary-Skill && git pull
cd trendhub-mcp && npm install && npm run build
```

## 设计原则

1. **本地插件，非中央服务**：跑在你自己电脑上，数据不经过第三方服务器；HTTP 模式也只绑定本机 `127.0.0.1`。
2. **自带算力（Bring Your Own AI）**：技能只给数据、确定性分析与脚手架；理解、解读、成文由你当前的 AI 完成。
3. **不造假**：取不到的数据显式标 `missing/degraded`，绝不静默填 0 或编造；每条数据带来源与采集时间。
4. **能开源就开源**：优先采用可商用的 MIT 开源组件，缺口才自研；所有第三方归因见各技能的 `NOTICE`。
5. **风格统一**：GPT 风格、结构化输出、机器可读 `manifest.json`、标准 MCP 接口。

## 权限与安全

- 给新同事开通：仓库 `Settings → Collaborators → Add people`（建议只读）。移除即立即失效。
- 仓库内**不含任何密钥/Token**；请勿外发或公开转存。
- 各技能的数据口径、已知限制与维护方式见其各自 README。
