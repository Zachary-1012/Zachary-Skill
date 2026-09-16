# 访问与安装说明

TrendHub 通过 GitHub **公开仓库** `Zachary-Skill` 分发。门禁保持简单：**拿到仓库链接的人，就能 clone 安装使用**，无需审批、注册、登录或中央服务器。

仓库地址：`https://github.com/Zachary-1012/Zachary-Skill`

## 给 AI 的安装流程

如果使用者把仓库链接交给一个具备终端执行能力的 AI / Coding Agent，推荐按下面流程完成安装：

1. 检查 `git`。如机器没有 Git，AI 应先通过操作系统可信的软件源或 Git 官方安装方式补齐 Git。
2. clone 公开仓库并进入 `trendhub-mcp`。
3. 执行平台对应的 Node-free bootstrap。已有 Node >=22 时 bootstrap 会直接复用；没有 Node 或版本过低时，会从 `nodejs.org/dist/latest-v24.x` 获取最新 Node 24 LTS 便携运行时，并使用官方 `SHASUMS256.txt` 校验 SHA-256 后再执行。
4. bootstrap 自动继续 `setup.mjs -> npm ci -> build -> smoke`。
5. 成功后 bootstrap 最后一行固定输出 `AI_BOOTSTRAP_OK { ... }`。AI 必须读取 JSON 中的 `node` 和 `launcher` 绝对路径，并按 `command=<node>`、`args=[<launcher>]` 配置 MCP；这样系统 PATH 里即使没有 Node，也能稳定启动。

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

bootstrap 的 Node 24 运行时只放在用户缓存目录：

- Windows：`%LOCALAPPDATA%\TrendHub\node24\...`
- macOS / Linux：`${XDG_CACHE_HOME:-~/.cache}/trendhub/node24/...`

它不要求管理员权限，不卸载或覆盖系统 Node；如果机器本来已有 Node >=22，就不会下载 Node。

已有 Node >=22 的机器仍可直接走原安装入口：

```bash
node scripts/setup.mjs
npm run smoke
```

成功标志固定为：

```text
SMOKE OK tools=16
```

bootstrap 完成时还会输出类似：

```text
AI_BOOTSTRAP_OK {"node":"/absolute/path/to/node","launcher":"/absolute/path/to/trendhub-mcp/scripts/launcher.mjs"}
```

Node-free 安装时，MCP stdio 必须使用这两个绝对路径。只有确认系统 Node 全局可用时，才可简写为：

```text
command: node
args: <trendhub-mcp绝对路径>/scripts/launcher.mjs
```

机器可读安装信息也写在 `manifest.json -> aiInstall`。

## 人工安装

如果已经有 Node >=22：

```bash
# 1) 克隆公开仓库
git clone https://github.com/Zachary-1012/Zachary-Skill.git

# 2) 进入插件目录
cd Zachary-Skill/trendhub-mcp

# 3) 一键安装
node scripts/setup.mjs
# 国内网络若官方源慢： node scripts/setup.mjs --cn
# 海外网络：           node scripts/setup.mjs --global
```

如果没有 Node 或 Node <22，不需要先手工安装 Node，直接运行本页上方对应平台的 bootstrap 即可。

安装脚本严格使用已提交的 `package-lock.json` 与 `npm ci`，随后构建并执行不联网的 MCP smoke。看到 `SMOKE OK tools=16` 即代表服务就绪。

外部平台健康检查与安装门禁分离：

```bash
npm run source:health
```

旧命令 `npm run selftest` 仍保留兼容，但等价于 source health；它会真实访问第三方平台，因此**不属于安装、PR CI 或 release gate**。

## 更新：只跟随 Stable Release

推荐客户端入口为 `scripts/launcher.mjs`。每次 AI 客户端启动时：

1. 当前已安装版本立即启动；
2. 后台读取 GitHub 最新正式 Stable Release；
3. 只有更高的正式 `vX.Y.Z` 才执行更新；
4. 不跟随 `main` HEAD；
5. 检测到已跟踪文件的本地修改时跳过；
6. 安装/构建失败时尽力回滚到更新前版本。

设置 `TRENTHUB_AUTOUPDATE=0` 可完全关闭自动更新。手动升级：

```bash
cd Zachary-Skill/trendhub-mcp
node scripts/upgrade.mjs
```

ZIP 安装无法自动切换 GitHub release tag，建议长期使用 `git clone` 安装。

## Release 门禁

正式 Stable Release 不直接从开发分支发布。`main` 必须先通过：

- Node 22.x / 24.x；
- `npm ci` 锁定安装；
- TypeScript build；
- deterministic `npm test`；
- MCP smoke handshake。

CI 全绿后，Release 工作流才生成正式 tag、npm `.tgz` 与 `SHA256SUMS.txt`。第三方平台的实时可达性由独立 `Source Health` 工作流观察，不阻断代码发布。

## 可选：配置小红书登录态

游客模式零配置即可使用小红书热门推荐笔记流与派生词。需要官方热搜词榜 / 关键词搜索时，再设置本机环境变量 `XHS_COOKIE`（需包含 `a1` 与 `web_session`）。Cookie 只应存在于使用者本机，**禁止提交到仓库**。

## HTTP 网络边界

### 本机模式（默认）

默认监听：

```text
127.0.0.1:8333
```

本机 loopback 模式无需额外 Token，保持安装即用。

### 局域网 / Tailscale / 其他非 loopback 模式

只要 `TRENTHUB_HOST` 不是 loopback，就**必须**同时设置 `TRENTHUB_HTTP_TOKEN`，否则 TrendHub 会拒绝启动。

Windows PowerShell 示例：

```powershell
$env:TRENTHUB_HOST='0.0.0.0'
$env:TRENTHUB_HTTP_TOKEN='请使用足够长的随机Token'
npm run start:http
```

macOS / Linux 示例：

```bash
TRENTHUB_HOST=0.0.0.0 \
TRENTHUB_HTTP_TOKEN='请使用足够长的随机Token' \
npm run start:http
```

远程 MCP 客户端需要发送：

```text
Authorization: Bearer <TRENTHUB_HTTP_TOKEN>
```

鉴权保护 `/mcp` 与 `/api/*`。即使启用 Token，也建议只放在受信任局域网或 Tailscale 等私有组网，不直接将 8333 端口暴露到公开互联网。

## 安全与数据边界（准确口径）

- **无需注册 / 登录**：TrendHub 没有独立账号体系，公开仓库本身就是分发入口。
- **无模型 Key**：TrendHub 本身不需要、也不存储任何大模型 API Key；调用方 AI 使用自己的模型能力。
- **无第三方遥测**：TrendHub 不做使用统计、埋点或行为上报。
- **无 TrendHub 中央数据回传**：没有中央 TrendHub 服务接收使用者数据。
- **不是“完全无出站网络”**：实时取数需要请求目标公开数据源；安装访问 npm registry/npmmirror；Node bootstrap 访问 `nodejs.org`；更新访问 GitHub Stable Release。
- 仓库公开后，任何人都可以查看 / fork；MIT 许可允许商用与修改。不要把 `XHS_COOKIE`、账号凭据、公司内部资料或其他敏感信息提交到仓库。
