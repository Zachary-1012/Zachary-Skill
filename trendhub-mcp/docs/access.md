# 访问与安装说明

TrendHub v1.5.0 通过 GitHub **公开仓库** `Zachary-Skill` 分发。**拿到仓库链接的人即可 clone 安装使用**，无需审批、注册、登录或中央服务器。

仓库地址：`https://github.com/Zachary-1012/Zachary-Skill`

**零安装（可选）**：支持 Streamable HTTP 的 MCP 客户端可直接连公开托管 Remote MCP，能力合同与本地版一致（21 工具 / 129 分层信源）：`https://trendhub-remote-production.up.railway.app/mcp`；浏览器 Web Console：`https://trendhub-remote-production.up.railway.app/`，健康检查 `https://trendhub-remote-production.up.railway.app/health`。下文为本地 clone 安装流程。

原 upstream 仓库的**写权限**与公开读取是两件事：当前只有 `@Zachary-1012` 和 owner 明确邀请的 Collaborators 能修改原仓库；公开用户可以读取、clone 和使用，但不会自动获得 upstream 写权限。`main` 还受 PR + Node 22/24 required checks + up-to-date + 禁止 force-push/deletion + no-bypass 的 ruleset 保护。

> 法律许可另看 LICENSE：TrendHub v1.4.3+ 的 TrendHub 自有代码采用 **TrendHub Free Use License 1.0**。个人和公司可免费使用未修改版本；禁止修改、派生、再发布、再分发、转售、转授权或向第三方托管提供软件本身。v1.4.2 及更早版本保留其发布时已经授予的 MIT 权利。

## 给 AI 的安装流程

把仓库链接交给具备终端执行能力的 AI / Coding Agent：

1. 检查 Git；没有则从可信系统软件源或 Git 官方方式补齐。
2. clone 公开仓库并进入 `trendhub-mcp`。
3. 执行对应平台 Node-free bootstrap。已有 Node >=22 时复用；没有/过旧时，从 `nodejs.org/dist/latest-v24.x` 下载 Node 24 LTS 便携运行时，并用官方 `SHASUMS256.txt` 做 SHA-256 校验。
4. bootstrap 自动继续 `setup.mjs -> npm ci -> build -> smoke`。
5. 必须看到 `SMOKE OK tools=21`。
6. bootstrap 最后一行输出 `AI_BOOTSTRAP_OK {...}`；AI 必须用 JSON 中 `node` 与 `launcher` 的绝对路径配置 MCP。

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

便携 Node 默认只放用户缓存目录，不要求管理员权限，也不卸载/覆盖系统 Node。已有 Node >=22 的机器可直接：

```bash
node scripts/setup.mjs
npm run smoke
```

成功标志：

```text
SMOKE OK tools=21
AI_BOOTSTRAP_OK {"node":"/absolute/path/to/node","launcher":"/absolute/path/to/trendhub-mcp/scripts/launcher.mjs"}
```

Node-free 安装时 MCP stdio 必须优先使用这两个绝对路径。只有确认系统 Node 全局可用时才可简写：

```text
command: node
args: <trendhub-mcp绝对路径>/scripts/launcher.mjs
```

机器可读安装合同见 `manifest.json -> aiInstall`。

## 人工安装

已有 Node >=22：

```bash
git clone https://github.com/Zachary-1012/Zachary-Skill.git
cd Zachary-Skill/trendhub-mcp
node scripts/setup.mjs
# 国内网络慢： node scripts/setup.mjs --cn
# 海外：       node scripts/setup.mjs --global
```

安装严格使用已提交 `package-lock.json` + `npm ci`，再 build + offline MCP smoke。

## 安装后验证与质量边界

```bash
npm run smoke              # MCP 合同：必须 SMOKE OK tools=21
npm test                   # deterministic offline release tests
npm run source:health      # 真实第三方数据源状态；不属于 release gate
npm run quality:diagnostic # 主动、本地、匿名化质量诊断；不自动上传
```

`Source Health` 与 CI 故意分离：第三方平台的登录要求、限流、风控、网络或 schema drift 会被标记为 `AUTH_REQUIRED / RATE_LIMITED / DOWN / DEGRADED`，但不会把外部平台暂时故障伪装成 TrendHub 代码失败。

## 专业能力（持续增强）

TrendHub 积累有界历史与 Source Reliability 观测：

- `source_reliability`：24h/7d/30d ok/usable rate、P50/P95、连续失败、schema drift、UP/DEGRADED/DOWN/AUTH_REQUIRED/RATE_LIMITED；
- `trend_intelligence`：生命周期、rank velocity、persistence、cross-platform diffusion、source reliability、history sufficiency、deterministic confidence；
- `benchmark_trend_lead`：使用外部 ground-truth `reference_time` 计算是否提前 24h/72h 发现趋势。

指标是确定性规则，不是预测概率。历史不足返回 `insufficient_history`。完整方法见 `docs/intelligence-methodology.md`。

后续版本增强：

- **v1.4.1**：公开托管 Remote MCP（零安装）、Official MCP Registry / Glama 分发、公开 `/privacy` `/terms` `/health` 发现端点；本地核心仍 loopback + 私有 Token。
- **v1.4.2**：定时趋势快照调度器，托管端按小时自动采集并持久化有界历史（默认关闭、显式启用；变更类 `/api/snapshot` 不公开），本地可用 cron / Windows 任务计划程序，见 `docs/scheduled-snapshots.md`。历史 v1.4.x 的 19 工具 / 38 信源契约保持不变。

## 更新：只跟随 Stable Release

推荐入口 `scripts/launcher.mjs`：

1. 当前已安装版本立即启动；
2. 后台读取 GitHub 最新正式 Stable Release；
3. 只有更高正式 `vX.Y.Z` 才更新；
4. 不跟随 `main` HEAD；
5. tracked 文件有本地修改时跳过；
6. 安装/构建失败时尽力回滚。

关闭自动更新：`TRENTHUB_AUTOUPDATE=0`。手动升级：

```bash
node scripts/upgrade.mjs
```

## Release 门禁

Stable Release 必须经过：

- PR 到受保护的 `main`；
- Node 22.x / 24.x `npm ci + build + deterministic tests + MCP smoke`；
- Windows/macOS/Linux Node-free bootstrap E2E；
- 合并后的 main CI；
- Stable Release 重新执行 release gate；
- Public Install E2E 从公开 URL fresh clone，验证 Stable tag、Node-free bootstrap 与 `SMOKE OK tools=21`。

## 小红书增强能力（可选）

游客模式零配置可用热门推荐笔记流与派生词。官方热搜词榜/关键词搜索需要本机环境变量 `XHS_COOKIE`（含 `a1` 与 `web_session`）。Cookie 只应存在使用者本机，**禁止提交仓库或质量诊断**。

## HTTP 网络边界

默认 `127.0.0.1:8333`，loopback 无需额外 Token。

任何非 loopback 监听必须同时设置 `TRENTHUB_HTTP_TOKEN`，否则 TrendHub 拒绝启动。远程 `/mcp` 与 `/api/*` 请求必须：

```text
Authorization: Bearer <TRENTHUB_HTTP_TOKEN>
```

即使启用 Token，也建议只用于受信任局域网/Tailscale 等私有组网，不直接暴露 8333 到公开互联网。

## 数据与隐私边界

- 无独立账号体系；无需注册/登录。
- TrendHub 本身无模型 API Key。
- 正常运行无第三方 telemetry、无 TrendHub 中央数据回传。
- `quality:diagnostic` 仅用户主动执行，本地生成 JSON，不自动上传；排除 hostname、username、绝对路径、Cookie、查询词、内容正文、IP、账号标识。
- 实时取数仍需要访问目标公开数据源；安装会访问 npm/Node 官方源；更新访问 GitHub Stable Release。
- 本地 reliability/history/health/diagnostic 目录均在 `.gitignore` 中，默认不会提交到公共仓库。
