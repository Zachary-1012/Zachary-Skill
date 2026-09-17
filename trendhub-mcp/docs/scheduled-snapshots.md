# 定时采集趋势快照（Scheduled Snapshots）

趋势生命周期、新晋/飙升/掉榜预警与 24h/72h lead benchmark 都依赖**持续积累的本地历史**。
`get_trending` 在被调用时会顺带积累快照，但要让 `trend_intelligence` / `benchmark_trend_lead`
在无人为查询时也持续获得历史，需要周期性运行快照采集。

本页说明三种采集方式：手动、本地计划任务（macOS/Linux/Windows）、托管 Remote MCP。
所有方式都复用同一个既有采集管线 `takeSnapshots()`，不改变 19 工具 / 38 信源契约。

## 1. 手动采集

```bash
cd trendhub-mcp
npm run snapshot            # 开发/未构建时（tsx）
# 或构建后直接运行：
node dist/scripts/snapshot.js
```

可选：传入平台名只采集指定平台，例如 `node dist/scripts/snapshot.js xiaohongshu weibo`。

快照与历史写入：

- `data/snapshots/*`（每平台 latest/previous 环形快照，用于变化预警）
- `data/history/*`（30 天、每平台最多 1500 点的有界历史，用于生命周期与 benchmark）

数据目录可用环境变量 `TRENTHUB_DATA_DIR` 覆盖。

## 2. macOS / Linux：cron

先构建一次：`npm ci --no-audit --no-fund && npm run build`。

编辑 crontab：`crontab -e`，加入下面这行（**把路径替换为你机器上 `trendhub-mcp` 的绝对路径**），每小时整点采集一次：

```cron
0 * * * * cd /ABSOLUTE/PATH/Zachary-Skill/trendhub-mcp && /usr/bin/env node dist/scripts/snapshot.js >> logs/snapshot-cron.log 2>&1
```

请先确认 `logs/` 目录存在（不存在则 `mkdir -p logs`）。

## 3. Windows：任务计划程序（PowerShell）

先构建一次：`npm ci --no-audit --no-fund && npm run build`。

在 PowerShell 中运行（**把 `$Root` 替换为你机器上 `trendhub-mcp` 的绝对路径**），创建每小时重复一次的计划任务：

```powershell
$Root = "C:\ABSOLUTE\PATH\Zachary-Skill\trendhub-mcp"
$Node = (Get-Command node).Source
$Script = Join-Path $Root "dist\scripts\snapshot.js"

$Action = New-ScheduledTaskAction `
  -Execute $Node `
  -Argument "`"$Script`"" `
  -WorkingDirectory $Root

$Trigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date).AddMinutes(2) `
  -RepetitionInterval (New-TimeSpan -Hours 1) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

Register-ScheduledTask `
  -TaskName "TrendHub Hourly Snapshot" `
  -Action $Action `
  -Trigger $Trigger `
  -Force
```

## 4. 托管 Remote MCP：服务端定时采集（可选，默认关闭）

公网 Remote MCP 网关内置了同一个调度器，但**默认关闭**，只有运维显式设置环境变量才启用：

| 环境变量 | 默认 | 说明 |
| --- | --- | --- |
| `TRENTHUB_REMOTE_SNAPSHOT_ENABLED` | `false` | 设为 `1` / `true` / `yes` / `on` 才启用服务端定时采集 |
| `TRENTHUB_SNAPSHOT_INTERVAL_MIN` | `60` | 采集间隔（分钟），下限 15 分钟 |
| `TRENTHUB_SNAPSHOT_INITIAL_DELAY_MS` | `30000` | 进程启动后首次采集的延迟（毫秒），下限 1 秒 |
| `TRENTHUB_DATA_DIR` | 包内 `data` | 数据目录；托管部署应指向**持久化卷**，否则重新部署后历史丢失 |

生产部署建议（挂载持久化卷后）：

```text
TRENTHUB_DATA_DIR=/data/trendhub
TRENTHUB_REMOTE_SNAPSHOT_ENABLED=1
TRENTHUB_SNAPSHOT_INTERVAL_MIN=60
TRENTHUB_SNAPSHOT_INITIAL_DELAY_MS=30000
```

调度器状态通过公网 `GET /health` 的 `snapshotScheduler` 字段暴露
（`enabled` / `running` / `intervalMs` / `lastRunAt` / `lastSuccessAt` / `lastOk` / `lastTotal` / `lastError` / `skippedBecauseRunning`）。

## 5. 安全与可靠性边界

- 采集失败只记录到 `snapshotScheduler.lastError` 与日志，**不会让 MCP 主进程退出**。
- 上一次采集尚未结束时，新一轮会被直接跳过并累加 `skippedBecauseRunning`，不会重叠执行。
- 公网网关**只暴露只读/查询接口**；变更类的 `/api/snapshot` 路由永远不对外公开（`GET` 返回 404、`POST` 返回 405）。
- 公网网关**不会注入任何访客的私有 `XHS_COOKIE`**。
- 定时采集只访问公开榜单数据源，不引入模型 Key、不增加遥测、不向中央服务回传使用数据。
