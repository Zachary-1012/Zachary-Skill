# 访问与安装说明

TrendHub 通过 GitHub **公开仓库** `Zachary-Skill` 分发。门禁刻意保持最简单：**拿到仓库链接的人，就能 clone 安装使用**，无需审批、无需被加为协作者、无需中央服务器。

仓库地址：`https://github.com/Zachary-1012/Zachary-Skill`

## 同事安装（约 3 分钟）

```bash
# 1) 克隆（公开仓库，无需登录也可 clone；公司网络若要求登录，按 GitHub 弹窗授权一次即可）
git clone https://github.com/Zachary-1012/Zachary-Skill.git

# 2) 进入插件目录
cd Zachary-Skill/trendhub-mcp

# 3) 安装依赖并构建
npm install
npm run build

# 4) 自检
npm run selftest
```

之后按 [setup-clients.md](./setup-clients.md) 把插件挂到自己用的 AI 客户端，或直接 `npm run ui` 打开本地控制台。

> 分发方式：管理员把**仓库链接**发给需要的同事即可。链接在谁手里，谁就能装；不做额外 license / 签名 / 账号校验（按需求刻意保持简单）。

## 以后更新

插件升级后，同事只需：

```bash
cd Zachary-Skill/trendhub-mcp
git pull
npm install      # 依赖有变化时
npm run build
```

## 可选：配置小红书登录态（非必须）

游客模式零配置即可用小红书热门笔记流与派生词。需要官方热搜词榜 / 关键词搜索时，再按 README 第 6 节设置本机环境变量 `XHS_COOKIE`，该 Cookie 只存在本机、只发给小红书官方。

## 安全与合规边界（如实说明）

- 插件**不含任何密钥**：不需要、也不存储大模型 API Key；同事用哪个 AI，就由哪个 AI 出算力。
- **零遥测、零数据回传**：没有任何统计/埋点/上报，抓取与缓存只在本机发生。
- HTTP 与控制台**默认**只绑定 `127.0.0.1`（本机）。如需让手机/平板或其他电脑接入，可自行用环境变量 `TRENTHUB_HOST=0.0.0.0` 把监听限定在受信任的局域网或 Tailscale 私有组网内；该 HTTP 端点**没有登录鉴权**，严禁把 8333 端口直接映射/转发到公网互联网。
- 仓库公开后，任何拿到链接的人都能查看 / fork，且 MIT 许可允许商用、fork 不可收回——**请勿把 `XHS_COOKIE`、账号凭据、公司内部资料提交进仓库**。
- 纯本地插件 + 海外 GitHub 分发 + 调用第三方模型 API + 不对外提供互联网信息服务，不涉及国内 ICP 备案。
- 若日后需要收回访问：在 GitHub 将仓库改回私有即可（已 clone 到本机的副本不受影响，但将无法再 `git pull`）。
