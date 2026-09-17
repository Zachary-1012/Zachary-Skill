# 把 TrendHub v1.4.4 接入你的 AI 客户端

TrendHub 是本地优先的 MCP Skill。**推荐把仓库链接直接交给具备终端执行能力的 AI / Coding Agent**，让它完成环境检查、Node-free bootstrap、安装、smoke 和 MCP 配置。

## 0. 先完成安装

macOS / Linux：

```bash
git clone https://github.com/Zachary-1012/Zachary-Skill.git
cd Zachary-Skill/trendhub-mcp
bash scripts/bootstrap.sh
```

Windows PowerShell：

```powershell
git clone https://github.com/Zachary-1012/Zachary-Skill.git
cd Zachary-Skill\trendhub-mcp
powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap.ps1
```

已有 Node >=22 也可以直接：

```bash
node scripts/setup.mjs
```

完整安装必须出现：

```text
SMOKE OK tools=19
AI_BOOTSTRAP_OK {"node":"/absolute/path/to/node","launcher":"/absolute/path/to/trendhub-mcp/scripts/launcher.mjs"}
```

`AI_BOOTSTRAP_OK` 是 Node-free 安装后的**最终 MCP 配置真值**：

- `<NODE_COMMAND>` = 返回的 `node` 绝对路径；
- `<LAUNCHER>` = 返回的 `launcher` 绝对路径。

如果系统本来就有全局 Node >=22，`<NODE_COMMAND>` 才可以简写为 `node`。不要在便携 Node 场景假设 `node` 已经进入 PATH。

推荐 stdio 启动：

```text
<NODE_COMMAND> <LAUNCHER>
```

launcher 只跟随 **GitHub Stable Release**，不追 `main` HEAD。

## 1. Claude Desktop

```json
{
  "mcpServers": {
    "trendhub": {
      "command": "<NODE_COMMAND>",
      "args": ["<LAUNCHER>"]
    }
  }
}
```

保存后完全退出并重启客户端。看到 **19 个 TrendHub 工具**即加载成功。

## 2. Cursor

在 MCP 设置中新增全局 server：

```json
{
  "mcpServers": {
    "trendhub": {
      "command": "<NODE_COMMAND>",
      "args": ["<LAUNCHER>"]
    }
  }
}
```

工具数应为 19。

## 3. VS Code / Cline / Roo Code

原生 MCP 的 `.vscode/mcp.json`：

```json
{
  "servers": {
    "trendhub": {
      "type": "stdio",
      "command": "<NODE_COMMAND>",
      "args": ["<LAUNCHER>"]
    }
  }
}
```

Cline / Roo Code 等支持 MCP 的扩展同样使用 stdio：command=`<NODE_COMMAND>`，args=`<LAUNCHER>`。

## 4. ChatGPT

如果当前 ChatGPT 客户端支持本地 MCP / stdio：

```text
command = <NODE_COMMAND>
args    = <LAUNCHER>
```

如果只支持 MCP URL，在主机启动 HTTP：

```text
<NODE_COMMAND> <LAUNCHER> --http
```

本机 URL：

```text
http://127.0.0.1:8333/mcp
```

具体入口名称可能随客户端版本变化，以客户端当前 MCP / Connector / Developer 设置为准。

## 5. 豆包 / DeepSeek / Gemini / 其他模型

TrendHub 与模型供应商解耦：

- Skill 指令：读取 `SKILL.md`；
- MCP stdio：`<NODE_COMMAND> <LAUNCHER>`；
- 只支持 URL 时：`<NODE_COMMAND> <LAUNCHER> --http`。

模型供应商自身需要的 API Key 属于客户端/模型，不应交给 TrendHub。

## 6. HTTP 与远程接入

### 零安装：官方托管 Remote MCP

不想本地安装时，支持 Streamable HTTP 的客户端直接连接公开托管端点（与本地版同为 19 工具 / 38 信源，无需注册或模型 Key）：

```text
https://trendhub-remote-production.up.railway.app/mcp
```

浏览器 Web Console（人工查看与只读查询，模型推理仍由你自己的 AI 完成）：`https://trendhub-remote-production.up.railway.app/`；健康检查为 `/health`。

### 本机 loopback

默认：

```text
http://127.0.0.1:8333/mcp
```

本机 loopback 无需额外 Token。

### 局域网 / Tailscale / 跨设备

任何非 loopback 监听必须设置：

```text
TRENTHUB_HOST=<非loopback地址或0.0.0.0>
TRENTHUB_HTTP_TOKEN=<足够长的随机Token>
```

远程 MCP 请求必须带：

```http
Authorization: Bearer <TRENTHUB_HTTP_TOKEN>
```

如果客户端不能设置 Authorization header，**不要关闭鉴权绕过**；改用支持 header 的客户端、stdio 主机或受控的可信代理。

即使已有 Token，也不要把 8333 直接暴露到公开互联网；优先受信任局域网或 Tailscale 等私有组网。

## 7. 本地可视化控制台

全局 npm 可用：

```bash
npm run ui
```

Node-free 场景：

```text
<NODE_COMMAND> <LAUNCHER> --ui
```

浏览器打开：

```text
http://127.0.0.1:8333/
```

控制台用于本地数据查看与触发；模型推理仍由调用方 AI 完成。非 loopback 控制台使用同一个 `TRENTHUB_HTTP_TOKEN`，浏览器仅在当前 `sessionStorage` 保存 Token。

## 8. 小红书增强能力（可选）

游客模式零配置即可使用小红书热门推荐笔记与派生词。官方热搜词榜与关键词爆款搜索需要本机 `XHS_COOKIE`（至少包含 `a1` 与 `web_session`）：

```json
{
  "mcpServers": {
    "trendhub": {
      "command": "<NODE_COMMAND>",
      "args": ["<LAUNCHER>"],
      "env": {
        "XHS_COOKIE": "a1=xxxx; web_session=xxxx"
      }
    }
  }
}
```

Cookie 只配置在使用者本机，禁止提交仓库、诊断文件或聊天公开内容。无登录态时相关能力会显式 `missing/AUTH_REQUIRED`，不得伪造。

## 9. v1.4.2 的 19 个工具

### Discover / Trending

- `list_platforms`
- `list_categories`
- `get_trending`
- `xhs_hot_topics`
- `cross_platform_overlap`
- `discover_trending_topics`
- `trend_change_alerts`
- `take_snapshot`

### Reliability / Trend Intelligence

- **`source_reliability`**：24h/7d/30d availability、latency、连续失败、schema drift、当前状态。
- `keyword_trend_curve`
- `related_queries`
- `future_signals`
- `upcoming_events`
- `analyze_topic`
- **`trend_intelligence`**：生命周期、速度、持续性、扩散、source reliability、history sufficiency、confidence。
- **`benchmark_trend_lead`**：用外部 ground truth 验证是否提前 24h/72h 发现。

### Produce

- `list_templates`
- `get_template`
- `get_content_brief`

## 10. 推荐 AI 使用顺序

对于重要趋势判断，建议 AI 按下面顺序：

1. `source_reliability`：确认关键源是否健康；
2. `get_trending` / `xhs_hot_topics`：获取当前证据并积累历史；
3. `trend_change_alerts`：看新晋/飙升/掉榜；
4. `trend_intelligence`：判断生命周期、速度、持续性、扩散和置信度；
5. `keyword_trend_curve` / `related_queries`：用搜索走势交叉验证；
6. `future_signals` / `upcoming_events`：补未来信号和节点；
7. `analyze_topic`：汇总情报包；
8. 若已有外部事实时间，`benchmark_trend_lead` 做 24h/72h lead-time 验证；
9. 内容需求再进入 `get_content_brief`。

## 11. Source Reliability 与质量诊断

真实信源状态：

```bash
npm run source:health
```

这会真实联网并生成本地 `data/health/source-health-latest.json`；GitHub 定时 Source Health 也会把该 JSON 作为 30 天 artifact 保存。第三方 source health **不属于代码 release gate**。

用户主动、本地质量诊断：

```bash
npm run quality:diagnostic
```

它不会上传任何东西。报告排除 hostname、username、绝对路径、Cookie、query text、content bodies、IP、account identifiers；只有使用者明确选择时才分享。

## 12. Trend Intelligence / Benchmark 口径

`trend_intelligence` 输出：

```text
insufficient_history / emerging / accelerating / mainstream / saturating / declining
```

以及 velocity、persistence、diffusion、source reliability、history sufficiency、confidence。

这些是透明规则指标，**不是预测概率**。历史不足必须保留 `insufficient_history`。

`benchmark_trend_lead` 的 `reference_time` 必须来自外部可验证事实，例如官方公告、主流爆发时间或团队事先定义的 benchmark 时点。不要看完结果后倒推一个有利基准。

方法公式见 `docs/intelligence-methodology.md`。

## 13. 手机 / 平板

TrendHub 本体是 Node 进程：

| 设备 | 本地 stdio | HTTP | 推荐方式 |
| --- | --- | --- | --- |
| Windows | 支持 | 支持 | stdio |
| macOS | 支持 | 支持 | stdio |
| Linux / 小主机 | 支持 | 支持 | stdio / 常开主机 |
| Android | Termux 进阶 | 支持 | 常开主机 HTTP |
| iPhone / iPad | 普通环境不常驻 Node | 支持 | 常开主机 HTTP |

手机/平板远程使用时，主机必须按第 6 节开启受保护 HTTP，不要关闭 Token。

## 14. 验收与排障

### 安装/MCP 合同

```bash
npm run smoke
```

必须看到：

```text
SMOKE OK tools=19
```

### 代码 deterministic tests

```bash
npm test
```

### 第三方源状态

```bash
npm run source:health
```

### 常见问题

- `node` 不存在/版本低：直接跑 bootstrap；它会下载并校验 Node 24 LTS 便携运行时。
- 安装后客户端仍找不到 `node`：MCP `command` 使用 `AI_BOOTSTRAP_OK.node` 的绝对路径。
- 工具列表不是 19：重新执行 bootstrap/setup + `npm run smoke`，然后完全重启客户端。
- 某平台 `missing/degraded`：查 `source_reliability` 或 `npm run source:health`；外部平台故障不是代码 CI 失败。
- `AUTH_REQUIRED`：按该源的本地 credential 指引处理，例如小红书 `XHS_COOKIE`；不要把凭据上传仓库。
- `RATE_LIMITED`：降低频率并等待平台恢复，不要伪造或绕过平台安全机制。

## 15. 更新

`launcher.mjs` 只跟随 GitHub **Stable Release**：先启动当前版本，后台发现更高 `vX.Y.Z` 才更新；本地 tracked 修改时跳过；安装/构建失败时尽力回滚。

关闭自动更新：

```text
TRENTHUB_AUTOUPDATE=0
```

手动升级：

```bash
node scripts/upgrade.mjs
```

Node-free 用户可使用 `AI_BOOTSTRAP_OK.node` 的绝对路径执行同一个 `scripts/upgrade.mjs`。

## 16. 定时趋势快照（v1.4.2）

趋势生命周期与 24h/72h lead benchmark 依赖持续积累的有界历史。公开托管 Remote MCP 已启用服务端调度器（默认每小时一次、写入持久化卷，状态见 `/health` 的 `snapshotScheduler` 字段）。本地安装可通过 cron（macOS/Linux）或任务计划程序（Windows）周期运行：

```bash
node dist/scripts/snapshot.js
```

完整步骤、环境变量与持久化建议见 `docs/scheduled-snapshots.md`。
