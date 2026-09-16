# Zachary-Skill · 公司 AI 技能库

全员可用的 **AI Skill / MCP 插件仓库**。每个技能都与具体大模型解耦：无论使用 ChatGPT、Claude、豆包、DeepSeek、Gemini、Cursor 或其他支持标准 MCP（Model Context Protocol）的 AI，均可挂载使用；**算力走使用者自己的 AI，Skill 本身不内置、也不索要任何模型 API Key。**

> 本仓库**公开分发**：拿到仓库链接即可 clone 安装，无需审批、TrendHub 账号或中央服务器。安装说明见 [`trendhub-mcp/docs/access.md`](./trendhub-mcp/docs/access.md)。

## 给 AI 的安装合同

如果你把本仓库链接直接交给一个可以执行终端命令的 AI / Coding Agent，它应按以下固定流程安装，不需要猜目录或依赖：

```bash
git clone https://github.com/Zachary-1012/Zachary-Skill.git
cd Zachary-Skill/trendhub-mcp
node --version                 # 必须 >= 22；推荐 Node 24 LTS
node scripts/setup.mjs         # package-lock.json + npm ci -> build -> smoke
npm run smoke                  # 成功标志：SMOKE OK tools=16
```

安装成功后，MCP stdio 入口固定为：

```text
command: node
args: <trendhub-mcp绝对路径>/scripts/launcher.mjs
```

机器可读的同一安装合同位于 [`trendhub-mcp/manifest.json`](./trendhub-mcp/manifest.json) 的 `aiInstall` 字段。

## 技能清单

| 技能 | 说明 | 文档 |
| --- | --- | --- |
| **TrendHub · 全网热点趋势专家（小红书主打）** | 38 个平台实时热榜（小红书置顶、默认首位）、小红书热门笔记流与话题词派生、Google Trends 走势、未来趋势信号、节点日历、跨平台共振/新晋掉榜分析、话题深度情报、脚本/文案/方案创作简报（16 个 MCP 工具），附本地可视化控制台 | [trendhub-mcp/README.md](./trendhub-mcp/README.md) |

## 一键安装（以 TrendHub 为例）

前置：**Node.js ≥ 22**，推荐 **Node 24 LTS**。Windows / macOS / Linux 可本地安装；手机 / 平板通常通过一台常开主机以受保护 HTTP URL 接入，详见 [setup-clients](./trendhub-mcp/docs/setup-clients.md)。

```bash
git clone https://github.com/Zachary-1012/Zachary-Skill.git
cd Zachary-Skill/trendhub-mcp
node scripts/setup.mjs
# 国内网络慢： node scripts/setup.mjs --cn
# 海外：       node scripts/setup.mjs --global
```

`setup.mjs` 严格使用已提交的 `package-lock.json` 与 `npm ci`，不会在用户安装时重新求解依赖。看到 `SMOKE OK tools=16` 即安装就绪。

- 挂到 AI 客户端：按 [trendhub-mcp/docs/setup-clients.md](./trendhub-mcp/docs/setup-clients.md) 配置，入口为 `scripts/launcher.mjs`。
- 只想用本地界面看榜：在 `trendhub-mcp` 目录运行 `npm run ui`。
- 外部信源体检：`npm run source:health`。旧命令 `npm run selftest` 保留兼容，但它**不属于安装或 release gate**。

## 更新与发布

TrendHub 不再跟随 `main` HEAD 自动更新。`scripts/launcher.mjs` 只检查 **GitHub Stable Release**：

1. 当前已验证版本先立即启动；
2. 后台发现更高的正式 `vX.Y.Z` Release 才进行更新；
3. 本地 tracked 文件有修改时主动跳过；
4. 安装/构建失败时尽力回滚更新前版本；
5. `TRENTHUB_AUTOUPDATE=0` 可关闭自动检查。

手动升级：

```bash
cd Zachary-Skill/trendhub-mcp
node scripts/upgrade.mjs
```

正式 Release 只有在 Node 22/24 CI 的 **locked install + build + deterministic tests + MCP smoke** 全部通过后才会生成；Release 同时产出 npm `.tgz` 与 `SHA256SUMS.txt`。

## 设计原则

1. **本地 Skill / MCP，而非中央服务**：核心运行在使用者自己的机器上；HTTP 默认只绑定 `127.0.0.1`。
2. **Bring Your Own AI**：Skill 提供实时数据、确定性分析与生产脚手架；理解、判断和成文由调用方 AI 完成。
3. **无模型 Key、无第三方遥测、无中央数据回传**：TrendHub 不收集使用统计，不把用户数据发送到 TrendHub 中央服务；但为了完成取数，会向目标公开数据源发起必要网络请求，安装/更新会访问 npm/GitHub。
4. **Evidence-first，不造假**：取不到的数据显式标记 `missing/degraded`；每条证据保留来源与采集时间。
5. **可复现发布**：lockfile + `npm ci` + CI release gate + Stable Release channel。
6. **开放兼容**：标准 MCP、机器可读 `manifest.json`，尽量不绑定具体 AI 厂商。

## HTTP 与安全边界

- 默认 `127.0.0.1`：无需额外 Token，保持本地开箱即用。
- 一旦 `TRENTHUB_HOST` 配置为 `0.0.0.0`、局域网 IP、Tailscale IP 或其他非 loopback 地址，**必须同时配置 `TRENTHUB_HTTP_TOKEN`**，否则服务拒绝启动。
- 非 loopback 模式下 `/mcp` 与 `/api/*` 要求 `Authorization: Bearer <token>`。
- 即使启用 Token，也不建议把 8333 直接暴露到公开互联网；优先使用受信任局域网或私有组网。

## 权限与数据边界

- 仓库公开，**把链接发给谁，谁就能查看并安装**；MIT 许可允许 fork / 商用。
- 仓库不应包含任何密钥、Cookie 或内部资料。小红书增强能力所需 `XHS_COOKIE` 只配置在使用者本机环境变量中。
- “无中央数据回传”不等于“无任何出站网络”：平台取数会访问对应平台，依赖安装访问 npm registry/npmmirror，Stable Release 更新访问 GitHub。
- 各技能的具体数据口径、已知限制与第三方归因见对应 README 与 `NOTICE`。
