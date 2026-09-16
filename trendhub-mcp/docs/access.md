# 访问与安装说明

TrendHub 通过 GitHub **公开仓库** `Zachary-Skill` 分发。门禁刻意保持最简单：**拿到仓库链接的人，就能 clone 安装使用**，无需审批、无需被加为协作者、无需中央服务器。

仓库地址：`https://github.com/Zachary-1012/Zachary-Skill`

## 同事安装（一键，约 1–3 分钟，主要取决于网速）

```bash
# 1) 克隆（公开仓库，无需登录；国内若 clone 很慢，可在仓库网页 Code -> Download ZIP 解压）
git clone https://github.com/Zachary-1012/Zachary-Skill.git

# 2) 进入插件目录
cd Zachary-Skill/trendhub-mcp

# 3) 一键安装：自动选国内外最快 npm 源 -> 装依赖 -> 构建 -> 数秒握手验证
node scripts/setup.mjs
#    国内网络若官方源慢： node scripts/setup.mjs --cn
#    海外网络：           node scripts/setup.mjs --global
```

安装脚本结尾会自动跑一次 `smoke` 握手（数秒、不联网、不抓平台），看到 `SMOKE OK tools=16` 即代表服务就绪。**安装时不要跑 `npm run selftest`**——它会真实抓取全部平台、约 2 分钟，仅用于排障。之后按 [setup-clients.md](./setup-clients.md) 把插件挂到自己用的 AI 客户端，或直接 `npm run ui` 打开本地控制台。

> 分发方式：管理员把**仓库链接**发给需要的同事即可。链接在谁手里，谁就能装；不做额外 license / 签名 / 账号校验（按需求刻意保持简单）。

## 以后更新（重启客户端即更新）

客户端接入推荐使用启动包装器 `scripts/launcher.mjs`：每次 AI 客户端启动插件时，先秒开当前已装版本，再在后台非阻塞检查 GitHub 更新；发现新版才拉取并重建，**重启一次客户端即生效**。连不上 GitHub（国内网络常见）、超时、非 git 目录或本地有改动时一律静默跳过、继续用当前版本，绝不影响使用；设置环境变量 `TRENTHUB_AUTOUPDATE=0` 可完全关闭。更新日志在 `logs/autoupdate.log`。

也可手动一键升级：

```bash
cd Zachary-Skill/trendhub-mcp
node scripts/upgrade.mjs
```

老的手动三步仍然等价：`git pull` -> `npm install`（依赖变化时）-> `npm run build`，然后重启客户端。

## 可选：配置小红书登录态（非必须）

游客模式零配置即可用小红书热门笔记流与派生词。需要官方热搜词榜 / 关键词搜索时，再按 README 第 6 节设置本机环境变量 `XHS_COOKIE`，该 Cookie 只存在本机、只发给小红书官方。

## 安全与合规边界（如实说明）

- 插件**不含任何密钥**：不需要、也不存储大模型 API Key；同事用哪个 AI，就由哪个 AI 出算力。
- **零遥测、零数据回传**：没有任何统计/埋点/上报，抓取与缓存只在本机发生。
- **自动更新与安装源**：自动更新仅在启动后非阻塞访问 github.com（git，可关闭、失败安全），不访问任何其它服务器；安装依赖时会在官方 npm 源与国内 npmmirror 镜像间自动选择可达且最快者（镜像包内容一致、经 npm 完整性校验），也可用 `--cn` / `--global` 手动指定。这些都不改变零遥测、零数据回传。
- HTTP 与控制台**默认**只绑定 `127.0.0.1`（本机）。如需让手机/平板或其他电脑接入，可自行用环境变量 `TRENTHUB_HOST=0.0.0.0` 把监听限定在受信任的局域网或 Tailscale 私有组网内；该 HTTP 端点**没有登录鉴权**，严禁把 8333 端口直接映射/转发到公网互联网。
- 仓库公开后，任何拿到链接的人都能查看 / fork，且 MIT 许可允许商用、fork 不可收回——**请勿把 `XHS_COOKIE`、账号凭据、公司内部资料提交进仓库**。
- 纯本地插件 + 海外 GitHub 分发 + 调用第三方模型 API + 不对外提供互联网信息服务，不涉及国内 ICP 备案。
- 若日后需要收回访问：在 GitHub 将仓库改回私有即可（已 clone 到本机的副本不受影响，但将无法再 `git pull`）。
