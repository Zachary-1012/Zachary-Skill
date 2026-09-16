# 访问与授权（门禁说明）

TrendHub 通过 GitHub **私有仓库** `Zachary-Skill` 分发。门禁刻意保持最简单：**能访问这个私有仓库的人，就能安装使用；不能访问的人，拿不到代码。**

## 给同事开通（管理员，一次性，每人约 30 秒）

1. 打开仓库：`https://github.com/Zachary-1012/Zachary-Skill`
2. `Settings` → `Collaborators`（协作者）→ `Add people`
3. 输入同事的 **GitHub 用户名或注册邮箱**，发送邀请
4. 同事在邮箱/GitHub 通知里接受邀请，即获得读取权限

> 建议给普通成员 **Read（只读）** 权限即可——他们只需 clone 与 pull 更新；维护者再给 Write。
> 移除某人：同一页面 `Remove`，其访问立即失效。

## 同事第一次 clone 的授权

私有仓库 clone 需要登录 GitHub，任选其一：

- **GitHub Desktop / Git Credential Manager**（最省心）：第一次 `git clone` 会弹浏览器登录，登录后自动记住。
- **GitHub CLI**：先 `gh auth login` 按提示授权。
- **Personal Access Token (PAT)**：在 GitHub `Settings → Developer settings → Personal access tokens` 生成一个勾选 `repo` 权限的 token，clone 时密码处粘贴 token。

```bash
git clone https://github.com/Zachary-1012/Zachary-Skill.git
```

## 以后更新

插件维护升级后，同事只需：

```bash
cd Zachary-Skill/trendhub-mcp
git pull
npm install      # 依赖有变化时
npm run build
```

## 安全边界（如实说明）

- 私有仓库控制的是**谁能拿到插件代码**，这是唯一门禁，不做额外 license/签名校验（按需求刻意保持简单）。
- 插件**不含任何密钥**：不需要、也不存储大模型 API Key；同事用哪个 AI，就由哪个 AI 出算力。
- HTTP 模式只绑定 `127.0.0.1`（本机），不会把服务暴露给局域网或公网。
- 请勿把私有仓库内容公开转存或外发；如离职/外包合作结束，在 Collaborators 中移除即可。
