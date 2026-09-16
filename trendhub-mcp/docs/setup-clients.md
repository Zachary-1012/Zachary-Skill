# 把 TrendHub 接入你的 AI 客户端

先完成安装与构建（见 [README](../README.md#3-快速开始5-分钟)）：`git clone` → `cd trendhub-mcp` → `npm install` → `npm run build`。

下文把 `/ABS/PATH/` 统一记为你本机 `trendhub-mcp` 目录的**绝对路径**，请替换：

- Windows：`C:/Users/你的用户名/Documents/Zachary-Skill/trendhub-mcp`（建议用正斜杠 `/`）
- macOS：`/Users/你/Zachary-Skill/trendhub-mcp`
- Linux：`/home/你/Zachary-Skill/trendhub-mcp`

启动入口（stdio）：`node /ABS/PATH/dist/src/index.js`
本地 HTTP（需要 URL 时）：先 `npm run start:http`，地址 `http://127.0.0.1:8333/mcp`

---

## 1. Claude Desktop

打开配置文件（没有就新建）：

- Windows：`%APPDATA%\Claude\claude_desktop_config.json`
- macOS：`~/Library/Application Support/Claude/claude_desktop_config.json`

写入：

```json
{
  "mcpServers": {
    "trendhub": {
      "command": "node",
      "args": ["/ABS/PATH/dist/src/index.js"]
    }
  }
}
```

保存后**完全退出并重启 Claude Desktop**。新对话里能看到 16 个 trendhub 工具即成功。若 node 不在 PATH，把 `command` 换成 node 的绝对路径（终端 `which node` / `where node` 查询）。

## 2. Cursor

`Settings` → `MCP` → `Add new global MCP server`，在打开的 `~/.cursor/mcp.json` 中写入：

```json
{
  "mcpServers": {
    "trendhub": {
      "command": "node",
      "args": ["/ABS/PATH/dist/src/index.js"]
    }
  }
}
```

保存后 MCP 列表中 `trendhub` 显示绿色 enabled、工具数 16 即可。

## 3. VS Code

### 方式 A：VS Code 原生 MCP（工作区 `.vscode/mcp.json`）

```json
{
  "servers": {
    "trendhub": {
      "type": "stdio",
      "command": "node",
      "args": ["/ABS/PATH/dist/src/index.js"]
    }
  }
}
```

### 方式 B：Cline / Roo Code 等扩展

在扩展的 MCP Servers 设置里选 `stdio`，command 填 `node`，args 填 `/ABS/PATH/dist/src/index.js`；或直接粘贴上面 Cursor 的 `mcpServers` JSON。

## 4. ChatGPT（桌面端）

ChatGPT 桌面端支持开发者 MCP：进入 `Settings` → 搜索 `MCP` / `Connectors` → `Add MCP server`（部分版本在「Manage connectors / Developer」里）。

- **推荐 stdio**：类型选 `Local / stdio`，命令 `node`，参数 `/ABS/PATH/dist/src/index.js`。
- **或用 URL**：先在终端运行 `npm run start:http`，再添加 `http://127.0.0.1:8333/mcp`。

> ChatGPT 各版本入口名称略有差异；若你的版本只接受 URL，用第二种 HTTP 方式。

## 5. 豆包

豆包工作模式同时支持 **Skill** 与 **MCP** 两种形态：

- **Skill 形态**：仓库根与本目录提供了 `SKILL.md` 描述，可按豆包「导入 Skill / 自定义技能」流程指向本目录。
- **MCP 形态**：在豆包桌面端设置中找到「MCP / 自定义工具 / 插件」入口，新增一个本地（stdio）服务，命令 `node`，参数 `/ABS/PATH/dist/src/index.js`；若该版本只接受 URL，则运行 `npm run start:http` 后填 `http://127.0.0.1:8333/mcp`。

具体 UI 以你所用豆包版本为准；两种形态背后是同一套 16 个工具。

## 6. DeepSeek（经支持 MCP 的客户端）

DeepSeek 官方 App/网页本身不直接挂 MCP；用一个支持 MCP 的开源客户端，把模型设为 DeepSeek（填你自己的 DeepSeek API Key），再挂上 TrendHub。**模型算力走你的 DeepSeek Key，插件仍在本机取数。**

### Cherry Studio
1. `设置` → `模型服务` → 添加/启用 DeepSeek，填入 API Key。
2. `设置` → `MCP 服务器` → `添加`：类型选 `stdio`，命令 `node`，参数 `/ABS/PATH/dist/src/index.js`（或类型选 `SSE/Streamable HTTP`，URL 填 `http://127.0.0.1:8333/mcp`）。
3. 回到对话，模型选 DeepSeek，确认 trendhub 工具已加载。

### ChatBox / LobeHub
- ChatBox：`设置` → `MCP` → 新建本地服务（stdio），命令与参数同上；模型提供方选 DeepSeek 并填 Key。
- LobeHub：`设置` → `MCP` → 新增，stdio 填 `node` + 入口路径，或填 HTTP URL；模型选 DeepSeek。

## 7. 其它任何支持 MCP 的 AI（通用）

- **stdio 客户端**：command=`node`，args=`["/ABS/PATH/dist/src/index.js"]`，环境变量无需配置。
- **HTTP/SSE 客户端**：运行 `npm run start:http`（可 `node dist/src/index.js --http --port=9000` 改端口），填 `http://127.0.0.1:8333/mcp`。HTTP 默认仅监听本机回环（127.0.0.1）；需要让手机/平板或其他电脑接入时，用环境变量 `TRENTHUB_HOST=0.0.0.0` 限定在受信任局域网或 Tailscale 私有组网（见第 10 节），**切勿**把端口直接映射到公网。

## 8. 本地可视化控制台（可选，给人用）

不想记工具名时，直接在终端运行：

```bash
npm run ui
```

会自动打开 `http://127.0.0.1:8333/`，一个 GPT 风格的本地控制台：小红书主打专区（热门笔记卡片 + 话题词 + 一键复制选题素材）、当下热榜、跨平台共振、关键词曲线、未来信号、节点日历、话题情报与创作简报。控制台是纯前端 + 本机只读 API，**不接任何大模型**；同一端口也提供 `/mcp` 给 AI 客户端接入。

## 9. 解锁小红书官方词榜 / 关键词搜索（可选）

游客模式零配置即可刷小红书热门笔记与派生词；需要官方热搜词榜与关键词爆款搜索时，在客户端的服务配置里加 `env.XHS_COOKIE`（需含 `a1` 与 `web_session`）：

```json
{
  "mcpServers": {
    "trendhub": {
      "command": "node",
      "args": ["/ABS/PATH/dist/src/index.js"],
      "env": { "XHS_COOKIE": "a1=xxxx; web_session=xxxx" }
    }
  }
}
```

也可在系统环境变量里设置 `XHS_COOKIE` 后重启。Cookie 只存本机、只发给小红书官方，**请勿提交到仓库**。

---

## 10. 手机 / 平板（iOS、安卓）与跨设备接入

先说清边界：TrendHub 是一个需要在本机运行的 Node 进程。**Windows / macOS / Linux 电脑**可直接本地安装、用 stdio 接入（见上文 1–9）；**手机/平板系统不允许普通 App 在本地常驻运行 Node + npm**，因此移动端不能像电脑那样零部署本地安装，标准做法是：**在一台常开的电脑或小主机上运行 TrendHub 的 HTTP 模式，手机经私有网络以 URL 接入**。

### 支持矩阵

| 设备 | 本地 stdio（子进程） | HTTP URL 接入 | 说明 |
| --- | --- | --- | --- |
| Windows 电脑 | 支持 | 支持 | 完全本地，推荐 |
| macOS 电脑 | 支持 | 支持 | 完全本地，推荐 |
| Linux 电脑 / 小主机 | 支持 | 支持 | 适合做常开主机供手机连 |
| 安卓手机 / 平板 | 进阶（Termux，见方案 B） | 支持（推荐方案 A） | 需支持 MCP URL 的客户端 |
| iPhone / iPad | 不支持本地常驻 | 支持（方案 A） | iOS 沙箱无法本地跑 Node |

### 方案 A（推荐）：常开主机 + 私有组网，手机用 URL 接入

1. 在一台常开的 Windows / macOS / Linux 机器上完成安装与构建（见 README 快速开始）。
2. 让 HTTP 服务监听所有网卡（默认只听 127.0.0.1，手机连不上）：
   - Windows PowerShell：`$env:TRENTHUB_HOST='0.0.0.0'; npm run start:http`
   - macOS / Linux：`TRENTHUB_HOST=0.0.0.0 npm run start:http`
   - 同一 WiFi 用局域网即可；外出跨网络请在主机和手机各装一个 **Tailscale**（免费、加密、需登录同一私有网络），主机仍按上面 `0.0.0.0` 启动。
3. 在主机上查接入地址：局域网用 `ipconfig`（Windows）或 `ip addr` / `ifconfig`（Mac/Linux）找形如 `192.168.x.x` 的 IPv4；Tailscale 用其 App 中显示的 `100.x.x.x` 地址。
4. 在手机上**支持「自定义 MCP 服务器 URL / Streamable HTTP」的 AI 客户端**里新增服务器，URL 填 `http://192.168.x.x:8333/mcp`（局域网）或 `http://100.x.x.x:8333/mcp`（Tailscale），再把模型设为你自己的 GPT / 豆包 / DeepSeek / Claude 等（填你自己的 Key、走你自己的额度）。ChatBox、LobeHub 等通用客户端的移动版通常支持 MCP URL；各官方 App 是否开放第三方 MCP URL 随版本变化，不支持时改用通用客户端。
5. 人也可以直接用手机浏览器打开控制台看榜、复制素材：`http://主机IP:8333/`（纯数据页面，不接模型）。

> 让主机长期后台运行（可选）：Linux/macOS 用 systemd / launchd / `nohup`，Windows 用「任务计划程序」设开机启动。这不是必须项。

### 安全红线（务必遵守）

- HTTP 端点**本身没有登录鉴权**，谁能访问该地址谁就能调用取数。**绝对不要**把 8333 端口直接做公网端口映射 / 转发到互联网。
- 跨网络只用 **Tailscale 这类私有、加密、需登录同一网络的组网**，或在受信任的局域网内使用，不需要、也不应该开放公网。
- 即便开放到私有网络，插件依然**零模型 Key、零遥测、零数据回传**；私有组网只是把「本机回环」扩展到「你自己的私有设备网络」，仍然不是面向公众的互联网信息服务。

### 方案 B（进阶）：安卓用 Termux 本地运行

安卓可安装 Termux，在其中执行 `pkg install nodejs git`，之后与电脑相同地 `git clone` → `npm install` → `npm run build` → `TRENTHUB_HOST=0.0.0.0 npm run start:http`，再让本机或局域网内支持 MCP URL 的客户端 / 浏览器连 `http://127.0.0.1:8333/mcp`。该方式门槛较高、需自行保持 Termux 后台存活，普通同事建议用方案 A。iOS / iPadOS 没有等价的本地常驻 Node 环境，请走方案 A。

---

## 11. 验证是否接好

接好后对 AI 说一句：**「列出 trendhub 的所有平台」** 或 **「用 trendhub 拉一下 Hacker News 现在的热榜」**。能返回平台清单 / 真实榜单即成功。命令行也可随时跑 `npm run selftest` 检查数据源健康度。

## 12. 常见问题

- **启动报错 `node` 找不到**：把 `command` 换成 node 绝对路径（`where node` / `which node`）。
- **工具列表为空**：确认已 `npm run build` 且 `dist/src/index.js` 存在；重启客户端。
- **个别平台 missing**：多为当前网络访问不到（如海外访问知乎/百度），属预期降级，换网络或 `git pull` 更新。
- **stdio 启动慢 / 日志噪音**：首次拉取依赖网络，属正常；`Redis ECONNREFUSED` 是聚合源自动回退内存缓存的提示，不影响结果。
- **手机连不上主机**：确认主机已用 `TRENTHUB_HOST=0.0.0.0` 启动、手机与主机在同一局域网（或都连着 Tailscale 并用 `100.x` 地址）、主机防火墙已放行 8333 入站；先用手机浏览器打开 `http://主机IP:8333/` 验证网络可达，再在 AI 客户端填 `…/mcp` 的 URL。
- **Linux 无图形界面 / 打不开浏览器**：`--ui` 自动开浏览器失败无妨，手动用浏览器访问 `http://127.0.0.1:8333/` 即可；纯 AI 接入用默认 stdio 或 `npm run start:http`，不需要桌面环境。
