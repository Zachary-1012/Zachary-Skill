# Zachary-Skill · 公司 AI 技能库

全员可用的 **AI Skill / MCP 插件仓库**。当前主技能 **TrendHub v1.4.0** 是 Evidence-first 的专业趋势情报 Skill：覆盖 38 个平台/趋势信源，以小红书为深度主打，提供 **19 个 MCP 工具**，并新增 Source Reliability、趋势生命周期/速度/持续性/跨平台扩散/置信度与 24h/72h Lead-time Benchmark。

每个技能与具体大模型解耦：ChatGPT、Claude、豆包、DeepSeek、Gemini、Cursor 或其他支持标准 MCP（Model Context Protocol）的 AI 均可挂载；**算力走使用者自己的 AI，Skill 本身不内置、也不索要任何模型 API Key。**

> 本仓库**公开分发**：拿到仓库链接即可 clone 安装，无需审批、注册、登录或中央服务器。原仓库的写权限仅属于 `@Zachary-1012` 与其明确邀请的 Collaborators；公开用户不会因为仓库可见而获得 upstream 写权限。治理规则见 [`GOVERNANCE.md`](./GOVERNANCE.md)。

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
npm run smoke                  # 成功标志：SMOKE OK tools=19
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

## TrendHub v1.4.0 能力

| 能力层 | 当前能力 |
| --- | --- |
| 实时发现 | 38 个平台/趋势信源；小红书热门推荐流为深度主打 |
| 小红书增强 | 游客热门推荐；本地 `XHS_COOKIE` 可解锁官方热搜词榜与关键词爆款搜索 |
| 跨平台 | 共振、自动聚类、新晋/飙升/掉榜、历史快照 |
| **Source Reliability** | UP / DEGRADED / DOWN / AUTH_REQUIRED / RATE_LIMITED；24h/7d/30d ok/usable rate；P50/P95 延迟；连续失败；schema drift |
| **Trend Intelligence Engine** | `emerging → accelerating → mainstream → saturating → declining`；速度、持续性、扩散、可靠度、历史充分度、置信度 |
| 搜索趋势 | Google Trends 相对热度曲线、相关词 top/rising |
| 未来信号 | 科技/AI/商业/营销 RSS 信源 + 趋势节点日历 |
| **真实场景 Benchmark** | 用外部 ground-truth 时间计算是否提前 24h / 72h 发现趋势；支持批量 benchmark cases |
| 深度分析 | 共振 + 走势 + 相关词 + 信号 + 节点 + 规则情感 |
| 内容生产 | 脚本/文案/方案模板 + Evidence-first 创作 Brief |
| 质量诊断 | `npm run quality:diagnostic` 生成本地匿名化诊断；默认零遥测、零自动上传 |

完整的 19-tool 契约见 [`trendhub-mcp/manifest.json`](./trendhub-mcp/manifest.json)。指标公式和生命周期规则见 [`trendhub-mcp/docs/intelligence-methodology.md`](./trendhub-mcp/docs/intelligence-methodology.md)。

## Source Reliability 与真实世界状态

TrendHub 明确区分：

- **CI / Release Gate**：证明代码、安装、MCP 工具合同可复现；
- **Source Health**：证明第三方信源在某次真实联网观测中的当前可用状态。

因此：**CI PASS ≠ 38 个第三方平台此刻全部在线。** 平台登录要求、限流、风控、网络异常或页面结构变化会被如实标记，而不是伪造成成功。

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
- 仓库不应包含任何模型 Key、Cookie、Token 或内部资料；`XHS_COOKIE` 只保存在使用者本机环境变量。
- `main` 受保护：必须 PR、Node 22/24 required checks、up-to-date、禁止 force push、禁止删除、无 bypass。
- upstream 原仓库只允许 owner 与 owner 邀请的 Collaborators 修改；公开用户只有读取/clone/使用 upstream 的权限。
- 软件当前仍按 **MIT License** 分发；MIT 在法律层面允许使用者对自己的副本进行 fork/修改/再分发，这与“不能修改原 upstream 仓库”是两个不同概念。若未来要改成“法律上仅允许使用、禁止修改/再分发”，需要单独做许可证变更。

详细规则：[`GOVERNANCE.md`](./GOVERNANCE.md) · [`CONTRIBUTING.md`](./CONTRIBUTING.md) · [`SECURITY.md`](./SECURITY.md) · [`CHANGELOG.md`](./CHANGELOG.md)
