# 把 TrendHub 接入你的 AI 客户端

## 0. 先完成安装

推荐把仓库链接直接交给具备终端执行能力的 AI / Coding Agent，让它使用 Node-free bootstrap。用户不需要预先安装 Node.js。

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

已有 Node >=22 的机器也可以直接：

```bash
node scripts/setup.mjs
```

看到 `SMOKE OK tools=16` 即安装完成。bootstrap 成功后还会额外输出一行机器可读结果：

```text
AI_BOOTSTRAP_OK {"node":"/absolute/path/to/node","launcher":"/absolute/path/to/trendhub-mcp/scripts/launcher.mjs"}
```

**这是 Node-free 安装的最终 MCP 配置真值。** AI 应读取该 JSON：

- `command` = 返回的 `node` 绝对路径；
- `args[0]` = 返回的 `launcher` 绝对路径。

如果用户系统中本来就有全局 Node >=22，`command` 可以简写为 `node`；否则不要假设 `node` 已经在系统 PATH。

外部第三方信源体检使用 `npm run source:health`；旧命令 `npm run selftest` 仍兼容，但它不属于安装、CI 或 release gate。

下文把：

- `<NODE_COMMAND>` 记为 `AI_BOOTSTRAP_OK.node`，或确认全局可用时的 `node`；
- `/ABS/PATH/` 记为本机 `trendhub-mcp` 的绝对路径；
- `<LAUNCHER>` 记为 `AI_BOOTSTRAP_OK.launcher`，通常等于 `/ABS/PATH/scripts/launcher.mjs`。

路径示例：

- Windows：`C:/Users/你的用户名/Documents/Zachary-Skill/trendhub-mcp`
- macOS：`/Users/你/Zachary-Skill/trendhub-mcp`
- Linux：`/home/你/Zachary-Skill/trendhub-mcp`

推荐 stdio 启动入口：`<NODE_COMMAND> <LAUNCHER>`。launcher 会立即启动当前版本，并仅在后台检查 **GitHub Stable Release**；不会跟随 `main` HEAD。

本地 HTTP：如果全局 Node/npm 可用，可运行 `npm run start:http`；Node-free bootstrap 用户也可以用返回的 Node 绝对路径执行 `<NODE_COMMAND> <LAUNCHER> --http`。默认地址 `http://127.0.0.1:8333/mcp`。

---

## 1. Claude Desktop

配置 MCP：

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

把占位符替换为 `AI_BOOTSTRAP_OK` 返回的真实绝对路径；如果全局 Node 已确认可用，`<NODE_COMMAND>` 才可以写成 `node`。保存后完全退出并重启客户端。看到 16 个 trendhub 工具即成功。

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

工具数显示 16 即代表加载成功。

## 3. VS Code

### 原生 MCP

工作区 `.vscode/mcp.json`：

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

### Cline / Roo Code 等扩展

选择 stdio，command=`<NODE_COMMAND>`，args=`<LAUNCHER>`。

## 4. ChatGPT

如果当前客户端版本支持本地 MCP / stdio，优先使用：

```text
command = <NODE_COMMAND>
args    = <LAUNCHER>
```

如果只支持 MCP URL，则在本机启动 HTTP：

```text
<NODE_COMMAND> <LAUNCHER> --http
```

再配置：`http://127.0.0.1:8333/mcp`。

不同版本的入口名称可能变化，以客户端当前 MCP / Connector / Developer 设置为准。

## 5. 豆包

TrendHub 可作为 Skill 描述 + MCP 工具使用：

- Skill：读取本目录 `SKILL.md`；
- MCP：stdio command=`<NODE_COMMAND>`，args=`<LAUNCHER>`；
- 若客户端只支持 URL，本机运行 `<NODE_COMMAND> <LAUNCHER> --http` 后使用 `http://127.0.0.1:8333/mcp`。

无论入口形式，背后均是同一套 16 个工具。

## 6. DeepSeek 与其他模型

TrendHub 与模型供应商解耦。只要使用的 AI 客户端支持 MCP，就可以将模型设为 DeepSeek、GPT、Claude、Gemini 或其他模型，再挂载 TrendHub。

模型 API Key（如果客户端本身需要）属于客户端/模型供应商，不应交给 TrendHub。

## 7. 通用 MCP 配置

### stdio（推荐）

```text
command=<NODE_COMMAND>
args=["<LAUNCHER>"]
```

### HTTP（本机）

```text
<NODE_COMMAND> <LAUNCHER> --http
```

URL：`http://127.0.0.1:8333/mcp`

默认 loopback 模式无需额外 Token。

### HTTP（局域网 / Tailscale / 其他设备）

任何非 loopback 监听都必须同时设置：

```text
TRENTHUB_HOST=<非loopback地址或0.0.0.0>
TRENTHUB_HTTP_TOKEN=<足够长的随机Token>
```

否则服务会拒绝启动。远程 MCP 请求必须带：

```http
Authorization: Bearer <TRENTHUB_HTTP_TOKEN>
```

因此远程客户端需要支持自定义 HTTP Authorization header。若客户端不支持自定义 header，不要通过关闭鉴权规避；改用支持 header 的 MCP 客户端、stdio 主机接入，或在受控环境使用可信反向代理。

## 8. 本地可视化控制台

如果全局 npm 可用：

```bash
npm run ui
```

Node-free bootstrap 用户也可直接：

```text
<NODE_COMMAND> <LAUNCHER> --ui
```

浏览器打开 `http://127.0.0.1:8333/`。控制台包含小红书专区、当下热榜、跨平台共振、关键词曲线、未来信号、节点日历、话题情报与创作简报。

控制台本身不接任何大模型；同端口提供 `/mcp`。

如果在受信任局域网/Tailscale 中以非 loopback 地址打开控制台，前端首次访问受保护 `/api/*` 时会提示输入 `TRENTHUB_HTTP_TOKEN`。Token 仅保存在当前浏览器 `sessionStorage`，关闭会话后失效，不写入服务器、URL 或仓库。

## 9. 解锁小红书官方词榜 / 关键词搜索（可选）

游客模式零配置即可使用小红书热门推荐笔记与派生词。需要官方热搜词榜与关键词爆款搜索时，在 MCP 服务环境变量中加入 `XHS_COOKIE`（包含 `a1` 与 `web_session`）：

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

Cookie 只配置在使用者本机，禁止提交到仓库。使用该能力时，Cookie 会随必要请求发送给小红书目标服务；TrendHub 不把它回传到中央服务。

---

## 10. 手机 / 平板与跨设备接入

TrendHub 是 Node 进程。Windows / macOS / Linux 可以直接本地运行；iPhone / iPad 通常通过一台常开主机的 HTTP 模式接入。安卓也可以用常开主机；Termux 属于进阶方案。

### 支持矩阵

| 设备 | 本地 stdio | HTTP URL | 说明 |
| --- | --- | --- | --- |
| Windows | 支持 | 支持 | stdio 推荐 |
| macOS | 支持 | 支持 | stdio 推荐 |
| Linux / 小主机 | 支持 | 支持 | 适合常开主机 |
| Android | Termux 进阶 | 支持 | HTTP 更易维护 |
| iPhone / iPad | 不支持普通本地常驻 Node | 支持 | 经常开主机 |

### 方案 A：常开主机 + 私有网络

先在主机安装 TrendHub，然后配置非 loopback HTTP。

Windows PowerShell（全局 npm 可用时）：

```powershell
$env:TRENTHUB_HOST='0.0.0.0'
$env:TRENTHUB_HTTP_TOKEN='使用足够长的随机Token'
npm run start:http
```

macOS / Linux（全局 npm 可用时）：

```bash
TRENTHUB_HOST=0.0.0.0 \
TRENTHUB_HTTP_TOKEN='使用足够长的随机Token' \
npm run start:http
```

Node-free bootstrap 用户应在同样环境变量下运行 `<NODE_COMMAND> <LAUNCHER> --http`。

同一 Wi‑Fi 可使用主机局域网地址；跨网络建议使用 Tailscale 等私有组网。MCP URL 示例：

```text
http://192.168.x.x:8333/mcp
http://100.x.x.x:8333/mcp
```

MCP 客户端同时配置：

```http
Authorization: Bearer <Token>
```

手机浏览器也可以打开 `http://主机IP:8333/` 查看控制台；首次 API 请求会要求输入同一个 Token。

### 安全红线

- **非 loopback 无 Token 时服务直接拒绝启动**，不要修改代码绕过。
- 即便已有 Bearer Token，也不要把 8333 直接映射到公开互联网；优先受信任局域网 / 私有组网。
- HTTP Token 与 `XHS_COOKIE` 是两类不同凭据：前者保护 TrendHub HTTP 服务，后者仅用于小红书增强取数。
- 无模型 Key、无第三方遥测、无 TrendHub 中央数据回传；但取数本身仍会访问目标数据源。

### 方案 B：Android + Termux（进阶）

可在 Termux 安装 Node.js 与 Git，然后与电脑相同地 clone → `cd trendhub-mcp` → `node scripts/setup.mjs`。Node 版本仍必须 >=22。

若只在 Android 本机浏览器/客户端使用，可保持 `127.0.0.1`；若监听非 loopback，同样必须配置 `TRENTHUB_HTTP_TOKEN`。

---

## 11. 验证是否接好

全局 npm 可用时：

```bash
npm run smoke
```

应看到：

```text
SMOKE OK tools=16
```

Node-free bootstrap 已经在安装过程中执行同一 smoke；同时必须看到最后的 `AI_BOOTSTRAP_OK {...}`，才表示“安装 + 可持久启动配置”完整闭环。

然后可以让 AI 执行例如：

- 「列出 trendhub 的所有平台」
- 「用 trendhub 拉一下 Hacker News 当前热榜」

代码级 deterministic test：

```bash
npm test
```

外部平台健康检查：

```bash
npm run source:health
```

## 12. 更新与常见问题

### 更新

`launcher.mjs` 只跟随 GitHub **Stable Release**，不追 `main`：

- 先启动当前版本；
- 后台发现更高 `vX.Y.Z` 才更新；
- tracked 工作区被修改时跳过；
- 安装/构建失败时尽力回滚；
- `TRENTHUB_AUTOUPDATE=0` 可关闭。

手动更新（全局 Node 可用时）：

```bash
node scripts/upgrade.mjs
```

Node-free bootstrap 用户可以用 `AI_BOOTSTRAP_OK.node` 的绝对路径执行同一个 `scripts/upgrade.mjs`。

### 常见问题

- **`node` 找不到 / 版本低**：无需用户手工装 Node，直接运行 `bootstrap.sh` / `bootstrap.ps1`；它会准备经官方 SHA-256 校验的 Node 24 LTS 便携运行时。
- **bootstrap 安装后客户端仍提示找不到 `node`**：不要把 command 写成 `node`；使用 `AI_BOOTSTRAP_OK` 返回的 `node` 绝对路径，并把 `launcher` 绝对路径作为第一个参数。
- **工具列表为空**：重跑 bootstrap 或 `node scripts/setup.mjs`，确认出现 `SMOKE OK tools=16`，再完全重启 AI 客户端。
- **个别平台 `missing/degraded`**：运行 `npm run source:health` 看具体信源；第三方平台临时不可达不会被伪装成 0，也不会影响 deterministic CI 的定义。
- **安装慢**：已有 Node 时国内可用 `node scripts/setup.mjs --cn`，海外可用 `--global`；bootstrap 同样会把附加参数传给 `setup.mjs`。
- **`npm ci` 报 lockfile 错误**：不要自行删 lockfile；确认仓库 clone 完整并使用官方发布版本。
- **非 loopback 启动被拒绝**：这是安全门，不是故障；同时配置 `TRENTHUB_HTTP_TOKEN`。
- **远程 MCP 返回 401**：客户端没有带 `Authorization: Bearer <token>`，或 Token 不匹配。
- **手机控制台提示 Token**：输入主机端的 `TRENTHUB_HTTP_TOKEN`；它只保存在当前浏览器会话。
- **Linux 无桌面环境**：不用 `--ui`，直接运行默认 stdio 或 `--http`；控制台可从其他受信任设备浏览器访问。
