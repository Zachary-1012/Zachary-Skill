# TrendHub Creator Ops

Creator Ops 是 TrendHub v1.5.0 的本地优先运行与交付工作台：把运行状态、信源健康、版本来源、手工成本、Bug/反馈和下一步建议组织成非程序员也能读懂的界面与简报。

它不是云托管控制面，也不是“AI 自动运维”。默认不上传遥测、不读取 Cookie/API Key、不接触模型 Prompt、不自动重启、部署、回滚、删除或修改生产配置。

## 已实现且可验证的能力

- 本地受保护 API：`/api/ops/summary`、`/api/ops/events`、`/api/ops/report`、`POST /api/ops/costs`、`POST /api/ops/feedback`。
- Node 进程 uptime、RSS/heap、进程 CPU 采样、TrendHub 数据卷剩余空间、已有 API/MCP 错误计数。
- 读取 `npm run source:health` 生成的真实信源健康报告，并明确区分「尚未运行」「超过 48 小时」与「最近 missing」。
- 本地手工成本和本地反馈 inbox；写入前对 Bearer、Cookie、token、secret、key、URL 查询参数及长 opaque 值脱敏。
- 可复制的确定性交付简报：只基于实际接入数据，未接入的账单、用户增长、外部可用性和发布状态一律写作未确认。
- 公网 Remote 网关**不**代理 `/api/ops/*`；公网界面只读地显示 `/health`，不泄露运行明细或接受写入。

## 使用方式

1. 本地启动控制台：`npm run ui`，打开“运行与交付”。
2. 首次做真实信源检查：`npm run source:health`。这会访问第三方源并写入本机 `data/health/source-health-latest.json`；它不属于 CI 通过与否。
3. 可选设置本机月预算：`TRENTHUB_OPS_MONTHLY_BUDGET_USD=100`，然后按实际账单在界面登记金额。
4. 把 Bug、异常或用户反馈登记到本地 inbox；先不要粘贴密钥，系统会额外脱敏但不应把脱敏当作保管密钥的理由。
5. 复制“交付简报”，由负责人决定是否进行受控的修复、发布或回滚。

## 能力真相表

| 领域 | Creator Ops 的状态 | 说明 |
| --- | --- | --- |
| 应用运行与本地错误 | 已实现 | 仅本进程和已有本地观测，不把 host CPU 当作进程数据。 |
| 外部信源健康 | 已实现 | 来自实际 `source:health` 报告；缺失不会编造成在线。 |
| 版本来源 | 部分实现 | 只有 `TRENTHUB_BUILD_SHA`、`RAILWAY_GIT_COMMIT_SHA` 或 `GITHUB_SHA` 存在且形合法时才验证。 |
| 成本 | 已实现（手工） | 不接云厂商账单 API；未连接显示未确认而不是 `$0`。 |
| 用户增长/真实使用 | 外部约束 | TrendHub 默认无中央遥测，需用户明确同意后接入独立分析系统。 |
| 自动修复/自动发布 | 明确不做 | 所有生产动作必须由有权限的人审批执行。 |

## 开源扩展路径（可选，不是默认依赖）

Creator Ops 使用可映射到 OpenTelemetry 的本地指标语义，先保留数据主权；OpenTelemetry 的 metrics 规范提供指标、时间戳和属性的数据模型。需要集中日志、指标、追踪和告警时，可在独立受保护的运维环境部署 SigNoz，再通过 OTLP 连接；不要在公网 TrendHub 网关暴露它。独立可用性探针可使用 Uptime Kuma 对 `/health` 做 HTTP/JSON 检查，与应用自身的进程视角相互校验。

- OpenTelemetry: <https://opentelemetry.io/docs/concepts/signals/metrics/>
- SigNoz: <https://github.com/SigNoz/signoz>
- Uptime Kuma（MIT）: <https://github.com/louislam/uptime-kuma>

启用任何外部收集器前，必须单独评估其版本、许可证、数据保留、网络出口、访问控制、告警接收者和成本；不得把它们当作 TrendHub 已经配置的能力。

## 安全边界

- Cookie、token、密钥只在拥有者的本地环境变量/密钥管理系统中保存，绝不写入 Ops 表单或 Git。
- 诊断文本在落盘前脱敏；保留的反馈和成本位于 `TRENTHUB_DATA_DIR/ops/creator-ops.json`。
- 公网 Remote 仅公开明确 allowlist 的 GET 查询 API；Ops、工作区写入和底层进程观测一律不出网。
- 若需要团队共享 Ops，请先建立经认证的管理面和审计模型，不能通过放宽公网 allowlist 达成。
