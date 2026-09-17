# TrendHub Remote MCP hosting

TrendHub's public hosted distribution uses `scripts/remote-gateway.mjs` as an isolation layer around the existing local-first MCP core.

## Security model

- The existing MCP core remains bound to `127.0.0.1`.
- A fresh 256-bit internal bearer token is generated for every gateway process and is never exposed to clients.
- `/mcp`, `/health`, `/privacy`, `/terms`, `/.well-known/mcp.json`, the responsive Web Console at `/`, and an explicit read/query `/api/*` allowlist are public.
- Mutating/local-only routes such as `/api/snapshot` remain blocked by the gateway; the public Web Console cannot trigger writes.
- Request bodies are bounded (2 MiB by default) and concurrent MCP requests are capped (24 by default).
- The public gateway does not inject `XHS_COOKIE` or any user credential.
- Hosted deployments set `TRENTHUB_AUTOUPDATE=0`; the deployed Git commit is the deployment authority and the process does not self-mutate.
- There is no TrendHub application telemetry or per-request application log. Hosting/network providers may still process ordinary infrastructure metadata under their own policies; this is disclosed in the public privacy notice.

## Start command

Build first, then start the gateway:

```bash
npm ci --no-audit --no-fund
npm run build
npm run start:remote
```

The hosting platform must provide `PORT` (or `TRENTHUB_REMOTE_PORT`). The gateway binds `0.0.0.0` by default; the private MCP core remains loopback-only on a separate internal port.

## Public endpoints

- `POST /mcp` — stateless Streamable HTTP MCP
- `GET /health` — version/readiness metadata, including a `snapshotScheduler` object when the optional server-side scheduler is enabled
- `GET /.well-known/mcp.json` — discoverable endpoint metadata
- `GET /privacy` — privacy notice
- `GET /terms` — hosted-service terms
- `GET /` — responsive read/query Web Console
- `GET /api/*` — explicit safe GET allowlist used by the Web Console

Local-only mutating routes such as `/api/snapshot` are not published: `GET` returns 404 and `POST` returns 405 on the public gateway.

## Environment knobs

- `PORT` — public port supplied by most cloud platforms
- `TRENTHUB_REMOTE_HOST` — public bind host, default `0.0.0.0`
- `TRENTHUB_INTERNAL_PORT` — private loopback core port, default `18333`
- `TRENTHUB_REMOTE_MAX_BODY_BYTES` — request-size cap, default 2 MiB
- `TRENTHUB_REMOTE_MAX_CONCURRENCY` — in-process concurrency cap, default 24
- `TRENTHUB_REMOTE_TIMEOUT_MS` — upstream MCP request timeout, default 90 seconds
- `TRENTHUB_REMOTE_SNAPSHOT_ENABLED` — set to `1`/`true`/`yes`/`on` to enable the server-side snapshot scheduler; default off
- `TRENTHUB_SNAPSHOT_INTERVAL_MIN` — collection cadence in minutes, 15-minute floor, default 60
- `TRENTHUB_SNAPSHOT_INITIAL_DELAY_MS` — first-run delay after boot, 1-second floor, default 30000
- `TRENTHUB_DATA_DIR` — data directory; point it at a persistent volume (e.g. `/data/trendhub`) so `snapshots/` and `history/` survive redeploys

### Scheduled snapshots & persistent volume

The scheduler wraps the same `takeSnapshots()` pipeline as the local edition and is **disabled by default**. When enabling it on the host, mount a persistent volume at `TRENTHUB_DATA_DIR` (e.g. `/data/trendhub`); without it, the bounded history is lost on every redeploy. Collection failures only set `snapshotScheduler.lastError` and never exit the MCP process, and overlapping runs are skipped (`skippedBecauseRunning`). State is exposed on `GET /health` as `snapshotScheduler` (`enabled`/`running`/`intervalMs`/`lastRunAt`/`lastSuccessAt`/`lastOk`/`lastTotal`/`lastError`/`skippedBecauseRunning`). See `scheduled-snapshots.md` for local cron / Windows Task Scheduler equivalents.

The remote gateway is a distribution adapter. v1.5.0 exposes the 21-tool contract and does not weaken the local edition's non-loopback bearer-token requirement.
